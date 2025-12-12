# vggt_image2mass_inference.py
"""
VGGT + Image2Mass 통합 파이프라인
1. VGGT로 여러 이미지에서 3D 포인트 클라우드 복원
2. 포인트 클라우드에서 bounding box 추출 → L, W, H (metric scale)
3. 이미지 + dims를 Image2Mass 모델에 입력 → 무게 예측
"""

import os
import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision import transforms
from typing import List, Tuple, Optional
import argparse


# ============================================
# 1. VGGT 3D Reconstruction Module
# ============================================
class VGGTReconstructor:
    """
    VGGT를 사용하여 여러 이미지에서 3D 포인트 클라우드 복원
    """
    def __init__(self, device: str = "cuda"):
        self.device = device
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """VGGT 모델 로드"""
        try:
            from vggt.models.vggt import VGGT
            from vggt.utils.load_fn import load_and_preprocess_images
            
            # Hugging Face에서 pre-trained 모델 로드
            self.model = VGGT.from_pretrained("facebook/VGGT-1B")
            self.model.to(self.device)
            self.model.eval()
            print("[VGGT] Model loaded successfully")
            
        except ImportError:
            print("[VGGT] VGGT not installed. Please run:")
            print("  git clone https://github.com/facebookresearch/vggt")
            print("  cd vggt && pip install -e .")
            raise
    
    def reconstruct(self, image_paths: List[str]) -> Tuple[np.ndarray, dict]:
        """
        여러 이미지에서 3D 포인트 클라우드 복원
        
        Args:
            image_paths: 이미지 경로 리스트 (3~10장 권장)
        
        Returns:
            points: [N, 3] 3D 포인트 클라우드 (metric scale, 단위: 미터)
            info: 추가 정보 (depth, cameras 등)
        """
        from vggt.utils.load_fn import load_and_preprocess_images
        
        # 이미지 로드 및 전처리
        images = load_and_preprocess_images(image_paths).to(self.device)
        
        with torch.no_grad():
            # VGGT 추론 - 단일 forward pass로 모든 3D 정보 추출
            predictions = self.model(images)
            
            # 포인트 클라우드 추출
            # VGGT는 각 픽셀에 대해 3D 좌표를 예측
            point_maps = predictions["world_points"]  # [B, H, W, 3]
            confidence = predictions.get("world_points_conf", None)
            
            # 모든 뷰의 포인트를 합침
            points = point_maps.reshape(-1, 3).cpu().numpy()
            
            # confidence 기반 필터링 (있는 경우)
            if confidence is not None:
                conf = confidence.reshape(-1).cpu().numpy()
                valid_mask = conf > 0.5  # confidence threshold
                points = points[valid_mask]
        
        info = {
            "depth_maps": predictions.get("depth", None),
            "cameras": predictions.get("cameras", None),
            "num_views": len(image_paths),
            "num_points": len(points)
        }
        
        print(f"[VGGT] Reconstructed {len(points)} points from {len(image_paths)} views")
        return points, info
    
    def extract_dimensions(self, points: np.ndarray) -> Tuple[float, float, float]:
        """
        3D 포인트 클라우드에서 bounding box 치수 추출
        
        Args:
            points: [N, 3] 포인트 클라우드
        
        Returns:
            (L, W, H): 길이, 너비, 높이 (단위: cm로 변환)
        """
        if len(points) < 10:
            raise ValueError("Not enough points for dimension estimation")
        
        # Outlier 제거 (IQR 기반)
        points = self._remove_outliers(points)
        
        # Bounding box 계산
        min_coords = points.min(axis=0)
        max_coords = points.max(axis=0)
        dimensions = max_coords - min_coords
        
        # 미터 → 센티미터 변환 (VGGT는 metric scale 출력)
        L, W, H = dimensions * 100  # m -> cm
        
        # 크기 순서대로 정렬 (L >= W >= H)
        dims = sorted([L, W, H], reverse=True)
        L, W, H = dims[0], dims[1], dims[2]
        
        print(f"[VGGT] Extracted dimensions: L={L:.2f}cm, W={W:.2f}cm, H={H:.2f}cm")
        return L, W, H
    
    def _remove_outliers(self, points: np.ndarray, k: float = 1.5) -> np.ndarray:
        """IQR 기반 outlier 제거"""
        filtered = points.copy()
        for i in range(3):
            q1, q3 = np.percentile(filtered[:, i], [25, 75])
            iqr = q3 - q1
            mask = (filtered[:, i] >= q1 - k * iqr) & (filtered[:, i] <= q3 + k * iqr)
            filtered = filtered[mask]
        return filtered


# ============================================
# 2. Image2Mass Model (기존 모델 로드)
# ============================================
# 기존 image2mass_model.py에서 import
from image2mass_model import Image2MassModel, ALDELoss

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


class Image2MassPredictor:
    """
    학습된 Image2Mass 모델을 사용하여 무게 예측
    """
    def __init__(
        self, 
        model_path: str = "image2mass_best.pth",
        sim_lut_path: str = "sim_lut.pt",
        device: str = "cuda"
    ):
        self.device = device
        self.model = None
        self.transform = transforms.Compose([
            transforms.Resize((299, 299)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])
        self._load_model(model_path, sim_lut_path)
    
    def _load_model(self, model_path: str, sim_lut_path: str):
        """학습된 모델 로드"""
        # SIM LUT 로드
        if not os.path.exists(sim_lut_path):
            raise FileNotFoundError(f"SIM LUT not found: {sim_lut_path}")
        
        sim_lut = torch.load(sim_lut_path, map_location=self.device)
        
        # 모델 생성 및 가중치 로드
        self.model = Image2MassModel(
            sim_lut=sim_lut,
            backbone_name="xception",
            pretrained=False  # 가중치를 직접 로드할 것이므로
        )
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model weights not found: {model_path}")
        
        state_dict = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()
        
        print(f"[Image2Mass] Model loaded from {model_path}")
    
    def predict(
        self, 
        image_path: str, 
        dims: Tuple[float, float, float]
    ) -> dict:
        """
        이미지와 치수를 받아 무게 예측
        
        Args:
            image_path: 이미지 경로 (대표 이미지 1장)
            dims: (L, W, H) 치수 (단위: cm)
        
        Returns:
            dict: {
                'mass': 예측 무게 (g 또는 kg),
                'volume': 예측 부피,
                'density': 예측 밀도,
                'dims': 입력 치수
            }
        """
        # 이미지 로드 및 전처리
        image = Image.open(image_path).convert("RGB")
        image_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        # 치수 텐서 변환
        L, W, H = dims
        dims_tensor = torch.tensor([[L, W, H]], dtype=torch.float32).to(self.device)
        
        # 추론
        with torch.no_grad():
            mass_pred, aux = self.model(image_tensor, dims_tensor)
        
        # 결과 추출
        mass = mass_pred.item()
        volume = aux["volume"].item()
        density = aux["density"].item()
        
        result = {
            "mass": mass,
            "volume": volume,
            "density": density,
            "dims": {"L": L, "W": W, "H": H},
            "bbox_volume": L * W * H  # cm³
        }
        
        print(f"[Image2Mass] Predicted mass: {mass:.2f}g, volume: {volume:.4f}, density: {density:.4f}")
        return result


# ============================================
# 3. 통합 파이프라인
# ============================================
class VGGTImage2MassPipeline:
    """
    VGGT + Image2Mass 통합 파이프라인
    
    여러 이미지 입력 → 3D 복원 → 치수 추출 → 무게 예측
    """
    def __init__(
        self,
        model_path: str = "image2mass_best.pth",
        sim_lut_path: str = "sim_lut.pt",
        device: str = "cuda"
    ):
        self.device = device
        
        print("=" * 50)
        print("Initializing VGGT + Image2Mass Pipeline")
        print("=" * 50)
        
        # VGGT 로드
        self.vggt = VGGTReconstructor(device=device)
        
        # Image2Mass 로드
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
        
        Args:
            image_paths: 같은 물체의 여러 각도 이미지 (3~10장 권장)
            reference_image_idx: Image2Mass에 사용할 대표 이미지 인덱스
        
        Returns:
            dict: {
                'mass': 예측 무게,
                'volume': 예측 부피,
                'density': 예측 밀도,
                'dims': {'L': ..., 'W': ..., 'H': ...},
                'num_views': 사용된 이미지 수,
                'num_points': 복원된 포인트 수
            }
        """
        print(f"\n[Pipeline] Processing {len(image_paths)} images...")
        
        # Step 1: VGGT로 3D 복원
        points, vggt_info = self.vggt.reconstruct(image_paths)
        
        # Step 2: 치수 추출
        L, W, H = self.vggt.extract_dimensions(points)
        
        # Step 3: Image2Mass로 무게 예측
        reference_image = image_paths[reference_image_idx]
        mass_result = self.image2mass.predict(reference_image, (L, W, H))
        
        # 결과 통합
        result = {
            **mass_result,
            "num_views": vggt_info["num_views"],
            "num_points": vggt_info["num_points"],
            "reference_image": reference_image
        }
        
        return result
    
    def predict_batch(
        self, 
        batch_image_paths: List[List[str]]
    ) -> List[dict]:
        """
        여러 물체에 대해 배치 예측
        
        Args:
            batch_image_paths: [[물체1 이미지들], [물체2 이미지들], ...]
        
        Returns:
            List[dict]: 각 물체의 예측 결과
        """
        results = []
        for i, image_paths in enumerate(batch_image_paths):
            print(f"\n{'='*50}")
            print(f"Processing object {i+1}/{len(batch_image_paths)}")
            print(f"{'='*50}")
            
            try:
                result = self.predict(image_paths)
                result["object_id"] = i
                results.append(result)
            except Exception as e:
                print(f"[Error] Failed to process object {i}: {e}")
                results.append({"object_id": i, "error": str(e)})
        
        return results


# ============================================
# 4. CLI Interface
# ============================================
def main():
    parser = argparse.ArgumentParser(
        description="VGGT + Image2Mass: 이미지에서 무게/부피 예측"
    )
    parser.add_argument(
        "images", 
        nargs="+", 
        help="입력 이미지 경로들 (같은 물체의 여러 각도, 3~10장 권장)"
    )
    parser.add_argument(
        "--model", 
        default="image2mass_best.pth",
        help="Image2Mass 모델 가중치 경로"
    )
    parser.add_argument(
        "--sim-lut", 
        default="sim_lut.pt",
        help="SIM LUT 파일 경로"
    )
    parser.add_argument(
        "--device", 
        default="cuda",
        help="사용할 디바이스 (cuda/cpu)"
    )
    parser.add_argument(
        "--ref-idx",
        type=int,
        default=0,
        help="대표 이미지 인덱스 (기본: 0)"
    )
    
    args = parser.parse_args()
    
    # 파이프라인 초기화
    pipeline = VGGTImage2MassPipeline(
        model_path=args.model,
        sim_lut_path=args.sim_lut,
        device=args.device
    )
    
    # 예측 수행
    result = pipeline.predict(
        image_paths=args.images,
        reference_image_idx=args.ref_idx
    )
    
    # 결과 출력
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
