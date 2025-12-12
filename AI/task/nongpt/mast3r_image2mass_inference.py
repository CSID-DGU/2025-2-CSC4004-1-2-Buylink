# mast3r_image2mass_inference.py
"""
MASt3R + Image2Mass 통합 파이프라인 (VGGT 대체용)
Tesla T4 16GB에서 더 안정적으로 동작

사용법:
  python mast3r_image2mass_inference.py view1.jpg view2.jpg view3.jpg
"""

import os
import sys

# MASt3R 경로 추가
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MAST3R_PATH = os.path.join(SCRIPT_DIR, "mast3r")
if MAST3R_PATH not in sys.path:
    sys.path.insert(0, MAST3R_PATH)

import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision import transforms
from typing import List, Tuple, Optional
import argparse


# ============================================
# 1. MASt3R 3D Reconstruction Module
# ============================================
class MASt3RReconstructor:
    """
    MASt3R를 사용하여 여러 이미지에서 3D 포인트 클라우드 복원
    VGGT보다 VRAM 사용량이 적음 (~8-12GB)
    """
    def __init__(self, device: str = "cuda"):
        self.device = device
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """MASt3R 모델 로드"""
        try:
            from mast3r.model import AsymmetricMASt3R
            from mast3r.fast_nn import fast_reciprocal_NNs
            
            # Hugging Face에서 pre-trained 모델 로드
            model_name = "naver/MASt3R_ViTLarge_BaseDecoder_512_catmlpdpt_metric"
            self.model = AsymmetricMASt3R.from_pretrained(model_name)
            self.model.to(self.device)
            self.model.eval()
            print("[MASt3R] Model loaded successfully")
            
        except ImportError:
            print("[MASt3R] MASt3R not installed. Please run:")
            print("  git clone --recursive https://github.com/naver/mast3r")
            print("  cd mast3r && pip install -e .")
            raise
    
    def reconstruct(self, image_paths: List[str]) -> Tuple[np.ndarray, dict]:
        """
        여러 이미지에서 3D 포인트 클라우드 복원

        Args:
            image_paths: 이미지 경로 리스트 (3~10장 권장)

        Returns:
            points: [N, 3] 3D 포인트 클라우드 (metric scale)
            info: 추가 정보
        """
        from dust3r.utils.image import load_images
        from dust3r.image_pairs import make_pairs
        from dust3r.cloud_opt import global_aligner, GlobalAlignerMode
        from dust3r.inference import inference
        
        # 이미지 로드
        images = load_images(image_paths, size=512)
        
        # 이미지 페어 생성 (complete graph)
        pairs = make_pairs(
            images, 
            scene_graph='complete', 
            prefilter=None, 
            symmetrize=True
        )
        
        # MASt3R 추론
        with torch.no_grad():
            output = inference(pairs, self.model, self.device, batch_size=1)
        
        # Global Alignment (metric scale)
        if len(image_paths) > 2:
            mode = GlobalAlignerMode.PointCloudOptimizer
        else:
            mode = GlobalAlignerMode.PairViewer
        
        scene = global_aligner(
            output, 
            device=self.device, 
            mode=mode
        )
        
        # 최적화 수행
        if len(image_paths) > 2:
            loss = scene.compute_global_alignment(
                init='mst', 
                niter=300, 
                schedule='cosine', 
                lr=0.01
            )
        
        # 포인트 클라우드 추출
        pts3d = scene.get_pts3d()
        
        # 모든 뷰의 포인트 합치기
        all_points = []
        for p in pts3d:
            if isinstance(p, torch.Tensor):
                p = p.detach().cpu().numpy()
            all_points.append(p.reshape(-1, 3))
        
        points = np.concatenate(all_points, axis=0)
        print(f"[MASt3R] Raw points before filtering: {len(points)}")

        # Confidence 기반 필터링
        confidence = scene.get_conf()
        if confidence is not None:
            all_conf = []
            for c in confidence:
                if isinstance(c, torch.Tensor):
                    c = c.detach().cpu().numpy()
                all_conf.append(c.reshape(-1))
            conf = np.concatenate(all_conf, axis=0)
            print(f"[MASt3R] Confidence range: {conf.min():.4f} ~ {conf.max():.4f}, mean: {conf.mean():.4f}")

            # 적응적 threshold 사용
            conf_threshold = max(0.1, np.percentile(conf, 50))  # median 이상
            valid_mask = conf > conf_threshold
            points = points[valid_mask]
            print(f"[MASt3R] After filtering (threshold={conf_threshold:.4f}): {len(points)} points")

        # NaN/Inf 제거
        valid_mask = np.isfinite(points).all(axis=1)
        points = points[valid_mask]

        info = {
            "num_views": len(image_paths),
            "num_points": len(points),
        }

        print(f"[MASt3R] Final reconstructed {len(points)} points from {len(image_paths)} views")
        return points, info
    
    def extract_dimensions(self, points: np.ndarray) -> Tuple[float, float, float]:
        """
        3D 포인트 클라우드에서 bounding box 치수 추출
        """
        if len(points) < 10:
            raise ValueError("Not enough points for dimension estimation")
        
        # Outlier 제거
        points = self._remove_outliers(points)
        
        # Bounding box 계산
        min_coords = points.min(axis=0)
        max_coords = points.max(axis=0)
        dimensions = max_coords - min_coords
        
        # 미터 → 센티미터 변환
        L, W, H = dimensions * 100
        
        # 크기 순서대로 정렬
        dims = sorted([L, W, H], reverse=True)
        L, W, H = dims[0], dims[1], dims[2]
        
        print(f"[MASt3R] Extracted dimensions: L={L:.2f}cm, W={W:.2f}cm, H={H:.2f}cm")
        return L, W, H
    
    def _remove_outliers(self, points: np.ndarray, k: float = 1.5) -> np.ndarray:
        """IQR 기반 outlier 제거"""
        filtered = points.copy()
        for i in range(3):
            q1, q3 = np.percentile(filtered[:, i], [25, 75])
            iqr = q3 - q1
            lower = q1 - k * iqr
            upper = q3 + k * iqr
            mask = (filtered[:, i] >= lower) & (filtered[:, i] <= upper)
            filtered = filtered[mask]
        return filtered


# ============================================
# 2. Image2Mass Predictor (동일)
# ============================================
from image2mass_model import Image2MassModel

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


class Image2MassPredictor:
    """학습된 Image2Mass 모델을 사용하여 무게 예측"""
    
    def __init__(
        self, 
        model_path: str = "image2mass_best.pth",
        sim_lut_path: str = "sim_lut.pt",
        device: str = "cuda"
    ):
        self.device = device
        self.transform = transforms.Compose([
            transforms.Resize((299, 299)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])
        self._load_model(model_path, sim_lut_path)
    
    def _load_model(self, model_path: str, sim_lut_path: str):
        sim_lut = torch.load(sim_lut_path, map_location=self.device)
        
        self.model = Image2MassModel(
            sim_lut=sim_lut,
            backbone_name="xception",
            pretrained=False
        )
        
        state_dict = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()
        
        print(f"[Image2Mass] Model loaded from {model_path}")
    
    def predict(self, image_path: str, dims: Tuple[float, float, float]) -> dict:
        image = Image.open(image_path).convert("RGB")
        image_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        L, W, H = dims
        dims_tensor = torch.tensor([[L, W, H]], dtype=torch.float32).to(self.device)
        
        with torch.no_grad():
            mass_pred, aux = self.model(image_tensor, dims_tensor)
        
        result = {
            "mass": mass_pred.item(),
            "volume": aux["volume"].item(),
            "density": aux["density"].item(),
            "dims": {"L": L, "W": W, "H": H},
            "bbox_volume": L * W * H
        }
        
        return result


# ============================================
# 3. 통합 파이프라인
# ============================================
class MASt3RImage2MassPipeline:
    """MASt3R + Image2Mass 통합 파이프라인"""
    
    def __init__(
        self,
        model_path: str = "image2mass_best.pth",
        sim_lut_path: str = "sim_lut.pt",
        device: str = "cuda"
    ):
        self.device = device
        
        print("=" * 50)
        print("Initializing MASt3R + Image2Mass Pipeline")
        print("=" * 50)
        
        self.mast3r = MASt3RReconstructor(device=device)
        self.image2mass = Image2MassPredictor(
            model_path=model_path,
            sim_lut_path=sim_lut_path,
            device=device
        )
        
        print("=" * 50)
        print("Pipeline initialized successfully!")
        print("=" * 50)
    
    def predict(
        self, 
        image_paths: List[str],
        reference_image_idx: int = 0
    ) -> dict:
        """
        여러 이미지에서 무게/부피 예측
        """
        print(f"\n[Pipeline] Processing {len(image_paths)} images...")
        
        # Step 1: MASt3R로 3D 복원
        points, info = self.mast3r.reconstruct(image_paths)
        
        # Step 2: 치수 추출
        L, W, H = self.mast3r.extract_dimensions(points)
        
        # Step 3: Image2Mass로 무게 예측
        reference_image = image_paths[reference_image_idx]
        mass_result = self.image2mass.predict(reference_image, (L, W, H))
        
        result = {
            **mass_result,
            "num_views": info["num_views"],
            "num_points": info["num_points"],
            "reference_image": reference_image
        }
        
        return result


# ============================================
# 4. CLI
# ============================================
def main():
    parser = argparse.ArgumentParser(
        description="MASt3R + Image2Mass: 이미지에서 무게/부피 예측"
    )
    parser.add_argument("images", nargs="+", help="입력 이미지들")
    parser.add_argument("--model", default="image2mass_best.pth")
    parser.add_argument("--sim-lut", default="sim_lut.pt")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--ref-idx", type=int, default=0)
    
    args = parser.parse_args()
    
    pipeline = MASt3RImage2MassPipeline(
        model_path=args.model,
        sim_lut_path=args.sim_lut,
        device=args.device
    )
    
    result = pipeline.predict(
        image_paths=args.images,
        reference_image_idx=args.ref_idx
    )
    
    print("\n" + "=" * 50)
    print("📦 PREDICTION RESULT")
    print("=" * 50)
    print(f"  Dimensions:")
    print(f"    L = {result['dims']['L']:.2f} cm")
    print(f"    W = {result['dims']['W']:.2f} cm")
    print(f"    H = {result['dims']['H']:.2f} cm")
    print(f"  Bounding Box Volume: {result['bbox_volume']:.2f} cm³")
    print(f"  Predicted Volume: {result['volume']:.4f}")
    print(f"  Predicted Density: {result['density']:.4f}")
    print(f"  ✅ Predicted Mass: {result['mass']:.2f} g")
    print("=" * 50)


if __name__ == "__main__":
    main()
