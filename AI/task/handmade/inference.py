"""
추론 및 JSON 출력
"""
import os
import json
import torch
import cv2
import numpy as np
from model import MultiTaskModel
from preprocessing import SAMMiDaSPreprocessor
from config import *


class Predictor:
    """추론 클래스"""

    def __init__(self, checkpoint_path=None):
        """
        Args:
            checkpoint_path: 학습된 모델 체크포인트 경로
        """
        self.device = DEVICE
        self.model = MultiTaskModel().to(self.device)
        self.preprocessor = SAMMiDaSPreprocessor(use_sam=False, use_midas=False)

        # 체크포인트 로드
        if checkpoint_path and os.path.exists(checkpoint_path):
            checkpoint = torch.load(checkpoint_path, map_location=self.device)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            print(f"✓ 체크포인트 로드: {checkpoint_path}")
            print(f"  Epoch: {checkpoint.get('epoch', 'N/A')}")
            print(f"  Val Loss: {checkpoint.get('val_loss', 'N/A'):.4f}")
        else:
            print("⚠ 체크포인트 없음. 랜덤 초기화 모델 사용")

        self.model.eval()

    def preprocess_image(self, image_path):
        """이미지 전처리"""
        # 전처리 파이프라인
        preprocessed = self.preprocessor.process(image_path)

        rgb = preprocessed['rgb']
        mask = preprocessed['mask']
        depth = preprocessed['depth']

        # 리사이즈
        rgb = cv2.resize(rgb, INPUT_SIZE)
        mask = cv2.resize(mask, INPUT_SIZE)
        depth = cv2.resize(depth, INPUT_SIZE)

        # 정규화
        rgb = rgb.astype(np.float32) / 255.0
        mask = mask.astype(np.float32) / 255.0
        depth = depth.astype(np.float32)

        # 5채널 텐서 생성
        rgb_tensor = torch.from_numpy(rgb).permute(2, 0, 1)  # (3, H, W)
        mask_tensor = torch.from_numpy(mask).unsqueeze(0)    # (1, H, W)
        depth_tensor = torch.from_numpy(depth).unsqueeze(0)  # (1, H, W)

        input_tensor = torch.cat([rgb_tensor, mask_tensor, depth_tensor], dim=0)  # (5, H, W)
        input_tensor = input_tensor.unsqueeze(0)  # (1, 5, H, W)

        return input_tensor

    def predict(self, image_path):
        """
        이미지로부터 예측

        Args:
            image_path: 이미지 경로

        Returns:
            dict: JSON 형식 결과
        """
        try:
            # 전처리
            input_tensor = self.preprocess_image(image_path).to(self.device)

            # 추론
            with torch.no_grad():
                outputs = self.model(input_tensor)

            # 카테고리
            category_idx = torch.argmax(outputs['category_logits'], dim=1).item()
            category = CATEGORIES[category_idx]

            # 재질
            material_idx = torch.argmax(outputs['material_logits'], dim=1).item()
            material = MATERIALS[material_idx]

            # 부피, 밀도, 무게
            volume = outputs['volume'].item()
            density = outputs['density'].item()
            weight = outputs['weight'].item()

            # 부피를 크기로 변환 (정육면체 가정)
            side_length = volume ** (1/3)
            width = side_length
            height = side_length
            depth_dim = side_length

            # JSON 출력 형식
            result = {
                "카테고리": category,
                "무게": round(weight, 2),
                "부피": f"{int(width)}x{int(height)}x{int(depth_dim)}"
            }

            return {
                "success": True,
                "result": result,
                "details": {
                    "재질": material,
                    "밀도": round(density, 3),
                    "부피_cm3": round(volume, 2)
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "result": None
            }


def main():
    """메인 추론 함수"""
    print("=" * 80)
    print(" " * 25 + "딥러닝 기반 물류 공간 예측 추론")
    print("=" * 80)

    # 체크포인트 경로
    checkpoint_path = os.path.join(CHECKPOINT_DIR, 'best_model.pth')

    # Predictor 생성
    predictor = Predictor(checkpoint_path=checkpoint_path if os.path.exists(checkpoint_path) else None)

    # 테스트 이미지
    import sys
    sys.path.append('/home/2020112534/task/gpt')
    from data_loader import DataLoader

    loader = DataLoader()
    samples = loader.get_random_samples(5)

    print(f"\n{len(samples)}개 샘플 테스트\n")
    print("=" * 80)

    results = []

    for i, sample in enumerate(samples):
        image_path = sample['image_path']
        gt = sample['ground_truth']

        print(f"\n[{i+1}/{len(samples)}] {gt['product_name']}")
        print("-" * 80)

        # 예측
        result = predictor.predict(image_path)

        if result["success"]:
            pred = result["result"]
            details = result["details"]

            print(f"✓ 예측 성공")
            print(f"\nJSON 출력:")
            print(json.dumps(pred, indent=2, ensure_ascii=False))

            print(f"\n상세 정보:")
            print(f"  재질: {details['재질']}")
            print(f"  밀도: {details['밀도']} g/cm³")
            print(f"  부피: {details['부피_cm3']} cm³")

            print(f"\n실제 값:")
            print(f"  카테고리: {gt['category']}")
            print(f"  무게: {gt['weight']}g")
            print(f"  크기: {gt['width']}x{gt['height']}x{gt['length']}cm")

            # 오차 계산
            weight_error = abs(pred['무게'] - gt['weight']) / gt['weight'] * 100
            print(f"\n무게 오차: {weight_error:.2f}%")

            results.append({
                "image": os.path.basename(image_path),
                "prediction": pred,
                "ground_truth": {
                    "category": gt['category'],
                    "weight": gt['weight'],
                    "dimensions": f"{gt['width']}x{gt['height']}x{gt['length']}"
                },
                "weight_error_percent": weight_error
            })

        else:
            print(f"✗ 예측 실패: {result['error']}")

        print("=" * 80)

    # 결과 저장
    output_file = os.path.join(RESULTS_DIR, 'predictions.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n결과 저장: {output_file}")

    # 통계
    if results:
        avg_error = sum(r['weight_error_percent'] for r in results) / len(results)
        print(f"\n평균 무게 오차: {avg_error:.2f}%")


if __name__ == "__main__":
    main()
