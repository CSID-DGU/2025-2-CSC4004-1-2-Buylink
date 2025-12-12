"""
SAM + MiDaS 전처리 파이프라인
객체 분할 + 깊이 추정 + 부피 계산
"""
import os
import cv2
import torch
import numpy as np
from PIL import Image
import torch.nn.functional as F
from scipy.spatial import ConvexHull


class SAMMiDaSPreprocessor:
    """SAM + MiDaS 기반 전처리기"""

    def __init__(self, use_sam=False, use_midas=False):
        """
        Args:
            use_sam: SAM 사용 여부 (체크포인트 필요)
            use_midas: MiDaS 사용 여부
        """
        self.use_sam = use_sam
        self.use_midas = use_midas
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # SAM 모델 로드
        if use_sam:
            try:
                from segment_anything import sam_model_registry, SamAutomaticMaskGenerator
                from config import SAM_CHECKPOINT, SAM_MODEL_TYPE

                if os.path.exists(SAM_CHECKPOINT):
                    sam = sam_model_registry[SAM_MODEL_TYPE](checkpoint=SAM_CHECKPOINT)
                    sam.to(device=self.device)
                    self.mask_generator = SamAutomaticMaskGenerator(sam)
                    print("✓ SAM 모델 로드 완료")
                else:
                    print("⚠ SAM 체크포인트 없음, 간단한 마스크 사용")
                    self.use_sam = False
            except ImportError:
                print("⚠ segment-anything 설치 필요, 간단한 마스크 사용")
                self.use_sam = False

        # MiDaS 모델 로드
        if use_midas:
            try:
                self.midas = torch.hub.load("intel-isl/MiDaS", "DPT_Large")
                self.midas.to(self.device)
                self.midas.eval()

                midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
                self.midas_transform = midas_transforms.dpt_transform
                print("✓ MiDaS 모델 로드 완료")
            except Exception as e:
                print(f"⚠ MiDaS 로드 실패: {e}, 간단한 깊이맵 사용")
                self.use_midas = False

    def generate_simple_mask(self, image):
        """간단한 중심 영역 마스크 생성 (SAM 없을 때)"""
        h, w = image.shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)

        # 중심 80% 영역을 마스크로
        margin_h, margin_w = int(h * 0.1), int(w * 0.1)
        mask[margin_h:h-margin_h, margin_w:w-margin_w] = 255

        return mask

    def segment_object(self, image):
        """
        객체 분할 (SAM 또는 간단한 방법)

        Args:
            image: RGB 이미지 (H, W, 3)

        Returns:
            mask: 이진 마스크 (H, W)
        """
        if self.use_sam:
            masks = self.mask_generator.generate(image)

            if len(masks) > 0:
                # 가장 큰 마스크 선택
                largest_mask = max(masks, key=lambda x: x['area'])
                return largest_mask['segmentation'].astype(np.uint8) * 255

        # SAM 없으면 간단한 마스크
        return self.generate_simple_mask(image)

    def estimate_depth(self, image):
        """
        깊이 추정 (MiDaS 또는 간단한 방법)

        Args:
            image: RGB 이미지 (H, W, 3)

        Returns:
            depth_map: 정규화된 깊이맵 (H, W), 값 범위 [0, 1]
        """
        if self.use_midas:
            with torch.no_grad():
                # 이미지 전처리
                input_batch = self.midas_transform(image).to(self.device)

                # 깊이 예측
                prediction = self.midas(input_batch)

                # 원본 크기로 리사이즈
                prediction = F.interpolate(
                    prediction.unsqueeze(1),
                    size=image.shape[:2],
                    mode="bicubic",
                    align_corners=False,
                ).squeeze()

                depth_map = prediction.cpu().numpy()

                # 정규화 [0, 1]
                depth_map = (depth_map - depth_map.min()) / (depth_map.max() - depth_map.min() + 1e-8)

                return depth_map

        # MiDaS 없으면 간단한 그라디언트 기반 깊이
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        depth_map = cv2.GaussianBlur(gray, (21, 21), 0)
        depth_map = depth_map.astype(np.float32) / 255.0

        return depth_map

    def compute_volume_from_depth(self, mask, depth_map, pixel_to_cm=0.1):
        """
        깊이맵과 마스크로부터 부피 계산

        Args:
            mask: 이진 마스크 (H, W)
            depth_map: 깊이맵 (H, W)
            pixel_to_cm: 픽셀을 cm로 변환하는 스케일

        Returns:
            volume_cm3: 부피 (cm³)
            dimensions: (width, height, depth) in cm
        """
        # 마스크 영역의 깊이값 추출
        masked_depth = depth_map * (mask / 255.0)

        # Point Cloud 생성
        points = []
        h, w = mask.shape

        for y in range(h):
            for x in range(w):
                if mask[y, x] > 0:
                    z = masked_depth[y, x]
                    points.append([x * pixel_to_cm, y * pixel_to_cm, z * 100])  # cm 단위

        if len(points) < 4:
            # 너무 적은 포인트면 기본값 반환
            return 1000.0, (10, 10, 10)

        points = np.array(points)

        try:
            # Convex Hull로 부피 계산
            hull = ConvexHull(points)
            volume_cm3 = hull.volume

            # Bounding Box 크기 계산
            min_coords = points.min(axis=0)
            max_coords = points.max(axis=0)
            dimensions = max_coords - min_coords  # (w, h, d)

            return volume_cm3, tuple(dimensions)

        except Exception as e:
            # Convex Hull 실패 시 Bounding Box 부피
            min_coords = points.min(axis=0)
            max_coords = points.max(axis=0)
            dimensions = max_coords - min_coords
            volume_cm3 = np.prod(dimensions)

            return volume_cm3, tuple(dimensions)

    def process(self, image_path):
        """
        전체 전처리 파이프라인

        Args:
            image_path: 이미지 경로

        Returns:
            dict: {
                'rgb': RGB 이미지,
                'mask': 마스크,
                'depth': 깊이맵,
                'volume_init': 초기 부피,
                'dimensions': (w, h, d)
            }
        """
        # 이미지 로드
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"이미지 로드 실패: {image_path}")

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # 1. 객체 분할
        mask = self.segment_object(image)

        # 2. 깊이 추정
        depth_map = self.estimate_depth(image)

        # 3. 부피 계산
        volume_init, dimensions = self.compute_volume_from_depth(mask, depth_map)

        return {
            'rgb': image,
            'mask': mask,
            'depth': depth_map,
            'volume_init': volume_init,
            'dimensions': dimensions
        }


def test_preprocessing():
    """전처리 테스트"""
    import sys
    sys.path.append('/home/2020112534/task/gpt')
    from data_loader import DataLoader

    loader = DataLoader()
    samples = loader.get_random_samples(1)

    if len(samples) == 0:
        print("샘플 없음")
        return

    image_path = samples[0]['image_path']
    print(f"테스트 이미지: {image_path}")

    # 전처리기 생성 (SAM, MiDaS 없이)
    preprocessor = SAMMiDaSPreprocessor(use_sam=False, use_midas=False)

    # 전처리 실행
    result = preprocessor.process(image_path)

    print(f"\n전처리 결과:")
    print(f"  RGB shape: {result['rgb'].shape}")
    print(f"  Mask shape: {result['mask'].shape}")
    print(f"  Depth shape: {result['depth'].shape}")
    print(f"  초기 부피: {result['volume_init']:.2f} cm³")
    print(f"  크기 (WxHxD): {result['dimensions'][0]:.1f}x{result['dimensions'][1]:.1f}x{result['dimensions'][2]:.1f} cm")

    # 실제 값과 비교
    gt = samples[0]['ground_truth']
    print(f"\n실제 값:")
    print(f"  무게: {gt['weight']}g")
    print(f"  크기: {gt['width']}x{gt['height']}x{gt['length']} cm")
    print(f"  부피: {gt['width'] * gt['height'] * gt['length']} cm³")


if __name__ == "__main__":
    test_preprocessing()
