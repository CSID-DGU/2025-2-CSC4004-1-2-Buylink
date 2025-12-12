"""
전체 Test Set 평가
"""
import os
import json
import torch
import numpy as np
from tqdm import tqdm
from model import MultiTaskModel
from dataset import get_dataloader
from config import *


def evaluate_model(checkpoint_path):
    """모델 평가"""
    print("=" * 80)
    print(" " * 25 + "Test Set 전체 평가")
    print("=" * 80)

    # 모델 로드
    device = DEVICE
    model = MultiTaskModel().to(device)

    if os.path.exists(checkpoint_path):
        checkpoint = torch.load(checkpoint_path, map_location=device)
        model.load_state_dict(checkpoint['model_state_dict'])
        print(f"\n✓ 체크포인트 로드: {checkpoint_path}")
        print(f"  Epoch: {checkpoint.get('epoch', 'N/A')}")
        print(f"  Val Loss: {checkpoint.get('val_loss', 'N/A'):.4f}")
    else:
        print(f"\n✗ 체크포인트 없음: {checkpoint_path}")
        return

    model.eval()

    # 전체 데이터셋 로드
    print("\n전체 데이터셋 로딩...")
    if os.path.exists(TRAIN_IMAGE_PATH):
        full_loader = get_dataloader(
            image_dir=TRAIN_IMAGE_PATH,
            label_dir=TRAIN_LABEL_PATH,
            batch_size=BATCH_SIZE,
            shuffle=False,
            max_samples=None
        )
    else:
        full_loader = get_dataloader(
            image_dir=IMAGE_PATH,
            label_dir=LABEL_PATH,
            batch_size=BATCH_SIZE,
            shuffle=False,
            max_samples=None
        )

    total_samples = len(full_loader.dataset)
    print(f"총 샘플 수: {total_samples}")

    # 데이터 분할 (동일한 시드)
    from torch.utils.data import random_split, DataLoader
    train_size = int(total_samples * 0.9)
    val_size = int(total_samples * 0.05)
    test_size = total_samples - train_size - val_size

    _, _, test_dataset = random_split(
        full_loader.dataset,
        [train_size, val_size, test_size],
        generator=torch.Generator().manual_seed(42)
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=4,
        pin_memory=True
    )

    print(f"Test 샘플: {test_size}개 ({len(test_loader)} 배치)")

    # 평가
    print("\n평가 시작...")
    print("-" * 80)

    category_correct = 0
    material_correct = 0

    volume_errors = []
    density_errors = []
    weight_errors = []

    pred_volumes = []
    pred_densities = []
    pred_weights = []

    gt_volumes = []
    gt_densities = []
    gt_weights = []

    with torch.no_grad():
        for batch in tqdm(test_loader, desc="평가 중"):
            inputs = batch['input'].to(device)

            # Ground truth
            gt_category = batch['category']
            gt_material = batch['material']
            gt_volume = batch['volume']
            gt_density = batch['density']
            gt_weight = batch['weight']

            # 예측
            outputs = model(inputs)

            pred_category = torch.argmax(outputs['category_logits'], dim=1).cpu()
            pred_material = torch.argmax(outputs['material_logits'], dim=1).cpu()
            pred_volume = outputs['volume'].cpu()
            pred_density = outputs['density'].cpu()
            pred_weight = outputs['weight'].cpu()

            # 정확도
            category_correct += (pred_category == gt_category).sum().item()
            material_correct += (pred_material == gt_material).sum().item()

            # 오차 계산 (0 아닌 값만)
            for i in range(len(gt_volume)):
                gt_v = gt_volume[i].item()
                gt_d = gt_density[i].item()
                gt_w = gt_weight[i].item()

                pred_v = pred_volume[i].item()
                pred_d = pred_density[i].item()
                pred_w = pred_weight[i].item()

                # 통계 수집
                pred_volumes.append(pred_v)
                pred_densities.append(pred_d)
                pred_weights.append(pred_w)

                gt_volumes.append(gt_v)
                gt_densities.append(gt_d)
                gt_weights.append(gt_w)

                if gt_v > 0:
                    volume_errors.append(abs(pred_v - gt_v) / gt_v * 100)

                if gt_d > 0:
                    density_errors.append(abs(pred_d - gt_d) / gt_d * 100)

                if gt_w > 0:
                    weight_errors.append(abs(pred_w - gt_w) / gt_w * 100)

    # 결과 출력
    print("\n" + "=" * 80)
    print("평가 결과")
    print("=" * 80)

    print(f"\n분류 정확도:")
    print(f"  카테고리: {category_correct / test_size * 100:.2f}% ({category_correct}/{test_size})")
    print(f"  재질: {material_correct / test_size * 100:.2f}% ({material_correct}/{test_size})")

    print(f"\n회귀 오차 (평균):")
    if volume_errors:
        print(f"  부피: {np.mean(volume_errors):.2f}%")
    if density_errors:
        print(f"  밀도: {np.mean(density_errors):.2f}%")
    if weight_errors:
        print(f"  무게: {np.mean(weight_errors):.2f}%")

    print(f"\n예측값 통계:")
    print(f"  부피:")
    print(f"    평균: {np.mean(pred_volumes):.2f} cm³")
    print(f"    최소: {np.min(pred_volumes):.2f} cm³")
    print(f"    최대: {np.max(pred_volumes):.2f} cm³")
    print(f"    0인 비율: {(np.array(pred_volumes) == 0).sum() / len(pred_volumes) * 100:.2f}%")

    print(f"  밀도:")
    print(f"    평균: {np.mean(pred_densities):.4f} g/cm³")
    print(f"    최소: {np.min(pred_densities):.4f} g/cm³")
    print(f"    최대: {np.max(pred_densities):.4f} g/cm³")
    print(f"    0인 비율: {(np.array(pred_densities) == 0).sum() / len(pred_densities) * 100:.2f}%")

    print(f"  무게:")
    print(f"    평균: {np.mean(pred_weights):.2f} g")
    print(f"    최소: {np.min(pred_weights):.2f} g")
    print(f"    최대: {np.max(pred_weights):.2f} g")
    print(f"    0인 비율: {(np.array(pred_weights) == 0).sum() / len(pred_weights) * 100:.2f}%")

    print(f"\n실제값 통계:")
    print(f"  부피:")
    print(f"    평균: {np.mean(gt_volumes):.2f} cm³")
    print(f"    최소: {np.min(gt_volumes):.2f} cm³")
    print(f"    최대: {np.max(gt_volumes):.2f} cm³")

    print(f"  밀도:")
    print(f"    평균: {np.mean(gt_densities):.4f} g/cm³")
    print(f"    최소: {np.min(gt_densities):.4f} g/cm³")
    print(f"    최대: {np.max(gt_densities):.4f} g/cm³")

    print(f"  무게:")
    print(f"    평균: {np.mean(gt_weights):.2f} g")
    print(f"    최소: {np.min(gt_weights):.2f} g")
    print(f"    최대: {np.max(gt_weights):.2f} g")

    # 샘플 비교 (처음 10개)
    print("\n" + "=" * 80)
    print("샘플 비교 (처음 10개)")
    print("=" * 80)

    for i in range(min(10, len(pred_weights))):
        print(f"\n샘플 {i+1}:")
        print(f"  예측: 부피={pred_volumes[i]:.2f} cm³, 밀도={pred_densities[i]:.4f} g/cm³, 무게={pred_weights[i]:.2f} g")
        print(f"  실제: 부피={gt_volumes[i]:.2f} cm³, 밀도={gt_densities[i]:.4f} g/cm³, 무게={gt_weights[i]:.2f} g")
        if gt_weights[i] > 0:
            print(f"  무게 오차: {abs(pred_weights[i] - gt_weights[i]) / gt_weights[i] * 100:.2f}%")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    checkpoint_path = os.path.join(CHECKPOINT_DIR, 'best_model.pth')
    evaluate_model(checkpoint_path)
