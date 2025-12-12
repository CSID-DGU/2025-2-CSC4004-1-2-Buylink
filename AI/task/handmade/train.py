"""
학습 파이프라인
"""
import os

# GPU 설정 (가장 먼저!)
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

import torch
import torch.optim as optim
from torch.utils.data import DataLoader
from tqdm import tqdm
from model import MultiTaskModel
from loss import PhysicsConstrainedLoss
from dataset import get_dataloader
from config import *


class Trainer:
    """학습 관리 클래스"""

    def __init__(self, model, criterion, optimizer, device):
        self.model = model
        self.criterion = criterion
        self.optimizer = optimizer
        self.device = device

        self.train_losses = []
        self.val_losses = []

    def train_epoch(self, dataloader, epoch):
        """한 에폭 학습"""
        self.model.train()
        total_loss = 0
        loss_components = {
            'category': 0,
            'material': 0,
            'volume': 0,
            'density': 0,
            'weight': 0,
            'physics': 0
        }

        pbar = tqdm(dataloader, desc=f"Epoch {epoch}")

        for batch_idx, batch in enumerate(pbar):
            # 데이터 로드
            inputs = batch['input'].to(self.device)
            targets = {
                'category': batch['category'].to(self.device),
                'material': batch['material'].to(self.device),
                'volume': batch['volume'].to(self.device),
                'density': batch['density'].to(self.device),
                'weight': batch['weight'].to(self.device)
            }

            # Forward
            outputs = self.model(inputs)

            # 손실 계산
            loss, loss_dict = self.criterion(outputs, targets)

            # Backward
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            # 통계
            total_loss += loss.item()
            for key in loss_components:
                loss_components[key] += loss_dict[key]

            # 진행상황 업데이트
            pbar.set_postfix({
                'loss': loss.item(),
                'vol': loss_dict['volume'],
                'weight': loss_dict['weight']
            })

        # 평균 손실
        avg_loss = total_loss / len(dataloader)
        for key in loss_components:
            loss_components[key] /= len(dataloader)

        return avg_loss, loss_components

    def validate(self, dataloader):
        """검증"""
        self.model.eval()
        total_loss = 0
        loss_components = {
            'category': 0,
            'material': 0,
            'volume': 0,
            'density': 0,
            'weight': 0,
            'physics': 0
        }

        with torch.no_grad():
            for batch in dataloader:
                inputs = batch['input'].to(self.device)
                targets = {
                    'category': batch['category'].to(self.device),
                    'material': batch['material'].to(self.device),
                    'volume': batch['volume'].to(self.device),
                    'density': batch['density'].to(self.device),
                    'weight': batch['weight'].to(self.device)
                }

                outputs = self.model(inputs)
                loss, loss_dict = self.criterion(outputs, targets)

                total_loss += loss.item()
                for key in loss_components:
                    loss_components[key] += loss_dict[key]

        avg_loss = total_loss / len(dataloader)
        for key in loss_components:
            loss_components[key] /= len(dataloader)

        return avg_loss, loss_components


def main():
    """메인 학습 함수"""
    print("=" * 80)
    print(" " * 25 + "딥러닝 기반 물류 공간 예측 학습")
    print("=" * 80)

    # 디렉토리 생성
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    os.makedirs(RESULTS_DIR, exist_ok=True)

    # 데이터로더 (전체 데이터셋, 9:0.5:0.5 분할)
    print("\n전체 데이터셋 로딩...")

    # Training 데이터 경로 확인
    if os.path.exists(TRAIN_IMAGE_PATH):
        print("Training 데이터셋 사용")
        full_loader = get_dataloader(
            image_dir=TRAIN_IMAGE_PATH,
            label_dir=TRAIN_LABEL_PATH,
            batch_size=BATCH_SIZE,
            shuffle=False,
            max_samples=None  # 전체 데이터셋
        )
        total_samples = len(full_loader.dataset)
    else:
        print("Validation 데이터셋 사용 (Training 없음)")
        full_loader = get_dataloader(
            image_dir=IMAGE_PATH,
            label_dir=LABEL_PATH,
            batch_size=BATCH_SIZE,
            shuffle=False,
            max_samples=None  # 전체 데이터셋
        )
        total_samples = len(full_loader.dataset)

    print(f"총 샘플 수: {total_samples}")

    # 9:0.5:0.5 비율로 분할 (90%:5%:5%)
    train_size = int(total_samples * 0.9)
    val_size = int(total_samples * 0.05)
    test_size = total_samples - train_size - val_size

    print(f"데이터 분할: Train={train_size}, Val={val_size}, Test={test_size}")

    # 데이터셋 분할
    from torch.utils.data import random_split
    train_dataset, val_dataset, test_dataset = random_split(
        full_loader.dataset,
        [train_size, val_size, test_size],
        generator=torch.Generator().manual_seed(42)  # 재현성을 위한 시드
    )

    # 데이터로더 생성
    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,  # 랜덤 셔플 활성화
        num_workers=4,
        pin_memory=True
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=4,
        pin_memory=True
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=4,
        pin_memory=True
    )

    print(f"Train 배치: {len(train_loader)}, Val 배치: {len(val_loader)}, Test 배치: {len(test_loader)}")

    # 모델 생성
    print(f"\n모델 생성 (Device: {DEVICE})...")
    model = MultiTaskModel().to(DEVICE)

    # 손실함수
    criterion = PhysicsConstrainedLoss()

    # Optimizer
    optimizer = optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY
    )

    # 스케줄러
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode='min',
        factor=0.5,
        patience=5
    )

    # Trainer
    trainer = Trainer(model, criterion, optimizer, DEVICE)

    # 학습
    print(f"\n학습 시작 (Epochs: {NUM_EPOCHS})...")
    print("-" * 80)

    best_val_loss = float('inf')

    for epoch in range(1, NUM_EPOCHS + 1):
        # 학습
        train_loss, train_components = trainer.train_epoch(train_loader, epoch)

        # 검증
        val_loss, val_components = trainer.validate(val_loader)

        # 스케줄러 업데이트
        scheduler.step(val_loss)

        # 결과 출력
        print(f"\nEpoch {epoch}/{NUM_EPOCHS}")
        print(f"  Train Loss: {train_loss:.4f}")
        print(f"    - Volume: {train_components['volume']:.4f}")
        print(f"    - Weight: {train_components['weight']:.4f}")
        print(f"    - Physics: {train_components['physics']:.4f}")
        print(f"  Val Loss: {val_loss:.4f}")
        print(f"    - Volume: {val_components['volume']:.4f}")
        print(f"    - Weight: {val_components['weight']:.4f}")
        print(f"    - Physics: {val_components['physics']:.4f}")

        # 체크포인트 저장
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            checkpoint_path = os.path.join(CHECKPOINT_DIR, 'best_model.pth')
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
            }, checkpoint_path)
            print(f"  ✓ Best model saved! (Val Loss: {val_loss:.4f})")

        # 주기적 저장
        if epoch % SAVE_INTERVAL == 0:
            checkpoint_path = os.path.join(CHECKPOINT_DIR, f'model_epoch_{epoch}.pth')
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
            }, checkpoint_path)

        print("-" * 80)

    print("\n학습 완료!")
    print(f"Best Validation Loss: {best_val_loss:.4f}")


if __name__ == "__main__":
    main()
