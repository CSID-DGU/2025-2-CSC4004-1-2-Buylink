"""
물리 제약 손실함수
무게 = 부피 × 밀도 관계를 명시적으로 반영
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from config import LOSS_WEIGHTS


class PhysicsConstrainedLoss(nn.Module):
    """물리 제약이 포함된 Multi-task 손실함수"""

    def __init__(self, weights=None):
        """
        Args:
            weights: 손실 가중치 딕셔너리
        """
        super(PhysicsConstrainedLoss, self).__init__()

        self.weights = weights if weights is not None else LOSS_WEIGHTS

        # 분류 손실
        self.ce_loss = nn.CrossEntropyLoss()

        # 회귀 손실
        self.mse_loss = nn.MSELoss()
        self.l1_loss = nn.L1Loss()

    def forward(self, outputs, targets):
        """
        Args:
            outputs: 모델 출력 dict
            targets: 타겟 dict

        Returns:
            total_loss, loss_dict
        """
        # ─────────────────────────────────────────────────────────
        # 1. 카테고리 분류 손실
        # ─────────────────────────────────────────────────────────
        category_loss = self.ce_loss(
            outputs['category_logits'],
            targets['category']
        )

        # ─────────────────────────────────────────────────────────
        # 2. 재질 분류 손실
        # ─────────────────────────────────────────────────────────
        material_loss = self.ce_loss(
            outputs['material_logits'],
            targets['material']
        )

        # ─────────────────────────────────────────────────────────
        # 3. 부피 회귀 손실 (log space에서 계산 - 스케일 불변)
        # ─────────────────────────────────────────────────────────
        pred_volume = outputs['volume'].squeeze()
        target_volume = targets['volume']

        # Log space MSE (relative error)
        volume_loss = self.mse_loss(
            torch.log(pred_volume + 1e-6),
            torch.log(target_volume + 1e-6)
        )

        # ─────────────────────────────────────────────────────────
        # 4. 밀도 회귀 손실
        # ─────────────────────────────────────────────────────────
        pred_density = outputs['density'].squeeze()
        target_density = targets['density']

        density_loss = self.mse_loss(
            torch.log(pred_density + 1e-6),
            torch.log(target_density + 1e-6)
        )

        # ─────────────────────────────────────────────────────────
        # 5. 무게 회귀 손실
        # ─────────────────────────────────────────────────────────
        pred_weight = outputs['weight'].squeeze()
        target_weight = targets['weight']

        weight_loss = self.mse_loss(
            torch.log(pred_weight + 1e-6),
            torch.log(target_weight + 1e-6)
        )

        # ─────────────────────────────────────────────────────────
        # 6. 물리 제약 손실 (핵심!)
        # 무게 = 부피 × 밀도 관계 강제
        # ─────────────────────────────────────────────────────────
        pred_weight_from_physics = pred_volume * pred_density
        physics_loss = self.mse_loss(
            torch.log(pred_weight + 1e-6),
            torch.log(pred_weight_from_physics + 1e-6)
        )

        # 추가: 타겟과의 물리 제약
        target_weight_from_physics = target_volume * target_density
        physics_target_loss = self.mse_loss(
            torch.log(target_weight + 1e-6),
            torch.log(target_weight_from_physics + 1e-6)
        )

        physics_loss = physics_loss + 0.5 * physics_target_loss

        # ─────────────────────────────────────────────────────────
        # 총 손실 (가중 합)
        # ─────────────────────────────────────────────────────────
        total_loss = (
            self.weights['category'] * category_loss +
            self.weights['material'] * material_loss +
            self.weights['volume'] * volume_loss +
            self.weights['density'] * density_loss +
            self.weights['weight'] * weight_loss +
            self.weights['physics'] * physics_loss
        )

        loss_dict = {
            'total': total_loss.item(),
            'category': category_loss.item(),
            'material': material_loss.item(),
            'volume': volume_loss.item(),
            'density': density_loss.item(),
            'weight': weight_loss.item(),
            'physics': physics_loss.item()
        }

        return total_loss, loss_dict


def test_loss():
    """손실함수 테스트"""
    batch_size = 4

    # 더미 출력
    outputs = {
        'category_logits': torch.randn(batch_size, 10),
        'material_logits': torch.randn(batch_size, 6),
        'volume': torch.rand(batch_size, 1) * 10000 + 1000,
        'density': torch.rand(batch_size, 1) * 2 + 0.5,
        'weight': torch.rand(batch_size, 1) * 5000 + 500
    }

    # 더미 타겟
    targets = {
        'category': torch.randint(0, 10, (batch_size,)),
        'material': torch.randint(0, 6, (batch_size,)),
        'volume': torch.rand(batch_size) * 10000 + 1000,
        'density': torch.rand(batch_size) * 2 + 0.5,
        'weight': torch.rand(batch_size) * 5000 + 500
    }

    # 손실 계산
    criterion = PhysicsConstrainedLoss()
    total_loss, loss_dict = criterion(outputs, targets)

    print("손실함수 테스트:")
    for key, value in loss_dict.items():
        print(f"  {key}: {value:.4f}")


if __name__ == "__main__":
    test_loss()
