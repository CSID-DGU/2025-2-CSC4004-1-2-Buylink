"""
Multi-task ResNet-50 기반 모델
카테고리, 재질 분류 + 부피, 밀도, 무게 회귀
"""
import torch
import torch.nn as nn
import torchvision.models as models
from config import *


class MultiTaskModel(nn.Module):
    """Multi-task 네트워크"""

    def __init__(self):
        super(MultiTaskModel, self).__init__()

        # ResNet-50 백본 (5채널 입력으로 수정)
        resnet = models.resnet50(pretrained=True)

        # 첫 번째 conv 레이어를 5채널로 수정
        self.conv1 = nn.Conv2d(INPUT_CHANNELS, 64, kernel_size=7, stride=2, padding=3, bias=False)

        # 기존 ResNet weights 복사 (RGB 3채널)
        with torch.no_grad():
            self.conv1.weight[:, :3, :, :] = resnet.conv1.weight
            # 추가 2채널은 랜덤 초기화 유지

        self.bn1 = resnet.bn1
        self.relu = resnet.relu
        self.maxpool = resnet.maxpool

        self.layer1 = resnet.layer1
        self.layer2 = resnet.layer2
        self.layer3 = resnet.layer3
        self.layer4 = resnet.layer4

        self.avgpool = resnet.avgpool

        # Feature dimension: 2048
        feature_dim = 2048

        # ─────────────────────────────────────────────────────────
        # 분류 Heads (병렬)
        # ─────────────────────────────────────────────────────────
        self.category_head = nn.Sequential(
            nn.Linear(feature_dim, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, NUM_CATEGORIES)
        )

        self.material_head = nn.Sequential(
            nn.Linear(feature_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, NUM_MATERIALS)
        )

        # ─────────────────────────────────────────────────────────
        # 회귀 Heads (순차적 조건부 연결)
        # ─────────────────────────────────────────────────────────

        # 부피 예측 (특징 + 카테고리 + 재질 조건)
        self.volume_head = nn.Sequential(
            nn.Linear(feature_dim + NUM_CATEGORIES + NUM_MATERIALS, 512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, 1),
            nn.Softplus()  # 부피는 양수 (Softplus로 변경하여 gradient flow 개선)
        )

        # 밀도 예측 (특징 + 카테고리 + 재질 + 부피 조건)
        self.density_head = nn.Sequential(
            nn.Linear(feature_dim + NUM_CATEGORIES + NUM_MATERIALS + 1, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
            nn.Softplus()  # 밀도는 양수 (Softplus로 변경하여 gradient flow 개선)
        )

        # 무게 예측 (특징 + 카테고리 + 재질 + 부피 + 밀도 조건)
        self.weight_head = nn.Sequential(
            nn.Linear(feature_dim + NUM_CATEGORIES + NUM_MATERIALS + 2, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
            nn.Softplus()  # 무게는 양수 (Softplus로 변경하여 gradient flow 개선)
        )

    def forward(self, x):
        """
        Args:
            x: (B, 5, 224, 224) - RGB(3) + Mask(1) + Depth(1)

        Returns:
            dict: {
                'category_logits': (B, NUM_CATEGORIES),
                'material_logits': (B, NUM_MATERIALS),
                'volume': (B, 1),
                'density': (B, 1),
                'weight': (B, 1)
            }
        """
        # ResNet Backbone
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)

        x = self.avgpool(x)
        features = torch.flatten(x, 1)  # (B, 2048)

        # ─────────────────────────────────────────────────────────
        # 분류 (병렬)
        # ─────────────────────────────────────────────────────────
        category_logits = self.category_head(features)  # (B, NUM_CATEGORIES)
        material_logits = self.material_head(features)  # (B, NUM_MATERIALS)

        # Soft labels (학습 시 그라디언트 흐름 위해)
        category_probs = torch.softmax(category_logits, dim=1)
        material_probs = torch.softmax(material_logits, dim=1)

        # ─────────────────────────────────────────────────────────
        # 회귀 (순차적 조건부)
        # ─────────────────────────────────────────────────────────

        # 부피 예측 (features + category + material)
        volume_input = torch.cat([features, category_probs, material_probs], dim=1)
        volume = self.volume_head(volume_input)  # (B, 1)

        # 밀도 예측 (features + category + material + volume)
        density_input = torch.cat([features, category_probs, material_probs, volume], dim=1)
        density = self.density_head(density_input)  # (B, 1)

        # 무게 예측 (features + category + material + volume + density)
        weight_input = torch.cat([features, category_probs, material_probs, volume, density], dim=1)
        weight = self.weight_head(weight_input)  # (B, 1)

        return {
            'category_logits': category_logits,
            'material_logits': material_logits,
            'volume': volume,
            'density': density,
            'weight': weight
        }


def test_model():
    """모델 테스트"""
    model = MultiTaskModel()
    model.to(DEVICE)

    # 더미 입력
    dummy_input = torch.randn(4, 5, 224, 224).to(DEVICE)

    # Forward
    with torch.no_grad():
        outputs = model(dummy_input)

    print("모델 출력:")
    for key, value in outputs.items():
        print(f"  {key}: {value.shape}")

    # 파라미터 수
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    print(f"\n총 파라미터: {total_params:,}")
    print(f"학습 가능 파라미터: {trainable_params:,}")


if __name__ == "__main__":
    test_model()
