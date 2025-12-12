"""
PyTorch 데이터셋 및 데이터로더
"""
import os
import json
import cv2
import torch
import numpy as np
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from preprocessing import SAMMiDaSPreprocessor
from config import *


class LogisticsDataset(Dataset):
    """물류 공간 예측 데이터셋"""

    def __init__(self, image_dir, label_dir, transform=None, use_preprocessing=False, max_samples=None):
        """
        Args:
            image_dir: 이미지 디렉토리 경로
            label_dir: 라벨 디렉토리 경로
            transform: 이미지 변환
            use_preprocessing: SAM+MiDaS 전처리 사용 여부
            max_samples: 최대 샘플 수 (None이면 전체)
        """
        self.image_dir = image_dir
        self.label_dir = label_dir
        self.transform = transform
        self.use_preprocessing = use_preprocessing

        if use_preprocessing:
            self.preprocessor = SAMMiDaSPreprocessor(use_sam=False, use_midas=False)

        # 데이터 수집
        self.samples = self._collect_samples(max_samples)

        print(f"데이터셋 로드 완료: {len(self.samples)}개 샘플")

    def _collect_samples(self, max_samples):
        """데이터 샘플 수집"""
        samples = []

        for root, dirs, files in os.walk(self.label_dir):
            for file in files:
                if file.endswith('.json'):
                    label_file = os.path.join(root, file)

                    # 대응하는 이미지 파일
                    rel_path = os.path.relpath(label_file, self.label_dir)
                    image_file = os.path.join(self.image_dir, rel_path.replace('.json', '.jpg'))

                    if os.path.exists(image_file):
                        try:
                            with open(label_file, 'r', encoding='utf-8') as f:
                                label_data = json.load(f)

                            if 'annotations' in label_data and len(label_data['annotations']) > 0:
                                ann = label_data['annotations'][0]
                                attrs = ann.get('attributes', {})

                                # 카테고리
                                category = ""
                                if 'categories' in label_data and len(label_data['categories']) > 0:
                                    category = label_data['categories'][0].get('name', '')

                                # 카테고리 인덱스
                                try:
                                    category_idx = CATEGORIES.index(category)
                                except ValueError:
                                    continue

                                # 무게 kg -> g 변환
                                weight = attrs.get('weight', 0)
                                if weight < 50:
                                    weight = weight * 1000

                                samples.append({
                                    'image_path': image_file,
                                    'category_idx': category_idx,
                                    'category': category,
                                    'weight': weight,
                                    'width': attrs.get('width', 0),
                                    'height': attrs.get('height', 0),
                                    'length': attrs.get('length', 0),
                                    'product_name': attrs.get('product_name', ''),
                                })

                                if max_samples and len(samples) >= max_samples:
                                    return samples

                        except Exception as e:
                            continue

        # 랜덤 셔플
        import random
        random.shuffle(samples)

        return samples

    def _estimate_material(self, category):
        """카테고리로부터 재질 추정 (간단한 휴리스틱)"""
        category_lower = category.lower()

        if '가공식품' in category or '신선식품' in category:
            return MATERIALS.index('food')
        elif '일상용품' in category or '화장품' in category:
            return MATERIALS.index('plastic')
        elif '가전' in category or '디지털' in category:
            return MATERIALS.index('metal')
        elif '의류' in category or '섬유' in category:
            return MATERIALS.index('textile')
        elif '교육' in category or '문화' in category:
            return MATERIALS.index('paper')
        else:
            return MATERIALS.index('plastic')  # 기본값

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]

        # 이미지 로드
        image = cv2.imread(sample['image_path'])
        if image is None:
            # 로드 실패 시 검은 이미지 반환
            image = np.zeros((224, 224, 3), dtype=np.uint8)

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # 전처리
        if self.use_preprocessing:
            preprocessed = self.preprocessor.process(sample['image_path'])
            rgb = preprocessed['rgb']
            mask = preprocessed['mask']
            depth = preprocessed['depth']
            volume_init = preprocessed['volume_init']
        else:
            # 간단한 전처리
            rgb = image
            h, w = image.shape[:2]

            # 간단한 마스크 (중심 영역)
            mask = np.zeros((h, w), dtype=np.uint8)
            margin_h, margin_w = int(h * 0.1), int(w * 0.1)
            mask[margin_h:h-margin_h, margin_w:w-margin_w] = 255

            # 간단한 깊이 (그레이스케일)
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            depth = gray.astype(np.float32) / 255.0

            # 기본 부피
            volume_init = sample['width'] * sample['height'] * sample['length']

        # 리사이즈
        rgb = cv2.resize(rgb, INPUT_SIZE)
        mask = cv2.resize(mask, INPUT_SIZE)
        depth = cv2.resize(depth, INPUT_SIZE)

        # 정규화
        rgb = rgb.astype(np.float32) / 255.0
        mask = mask.astype(np.float32) / 255.0
        depth = depth.astype(np.float32)

        # 5채널 입력: RGB(3) + Mask(1) + Depth(1)
        rgb_tensor = torch.from_numpy(rgb).permute(2, 0, 1)  # (3, H, W)
        mask_tensor = torch.from_numpy(mask).unsqueeze(0)    # (1, H, W)
        depth_tensor = torch.from_numpy(depth).unsqueeze(0)  # (1, H, W)

        input_tensor = torch.cat([rgb_tensor, mask_tensor, depth_tensor], dim=0)  # (5, H, W)

        # 레이블
        category_idx = torch.tensor(sample['category_idx'], dtype=torch.long)
        material_idx = torch.tensor(self._estimate_material(sample['category']), dtype=torch.long)

        # 회귀 타겟
        volume = sample['width'] * sample['height'] * sample['length']
        density = sample['weight'] / volume if volume > 0 else 1.0
        weight = sample['weight']

        volume_tensor = torch.tensor(volume, dtype=torch.float32)
        density_tensor = torch.tensor(density, dtype=torch.float32)
        weight_tensor = torch.tensor(weight, dtype=torch.float32)
        volume_init_tensor = torch.tensor(volume_init, dtype=torch.float32)

        return {
            'input': input_tensor,
            'category': category_idx,
            'material': material_idx,
            'volume': volume_tensor,
            'density': density_tensor,
            'weight': weight_tensor,
            'volume_init': volume_init_tensor,
            'dimensions': torch.tensor([sample['width'], sample['height'], sample['length']], dtype=torch.float32)
        }


def get_dataloader(image_dir, label_dir, batch_size=BATCH_SIZE, shuffle=True, max_samples=None):
    """데이터로더 생성"""
    dataset = LogisticsDataset(
        image_dir=image_dir,
        label_dir=label_dir,
        use_preprocessing=False,  # 빠른 학습을 위해 간단한 전처리 사용
        max_samples=max_samples
    )

    dataloader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=4,
        pin_memory=True
    )

    return dataloader


if __name__ == "__main__":
    # 테스트
    print("데이터로더 테스트")

    # Validation 데이터로 테스트
    dataloader = get_dataloader(
        image_dir=IMAGE_PATH,
        label_dir=LABEL_PATH,
        batch_size=4,
        max_samples=20
    )

    for batch in dataloader:
        print(f"\n배치 정보:")
        print(f"  입력 shape: {batch['input'].shape}")  # (B, 5, 224, 224)
        print(f"  카테고리: {batch['category']}")
        print(f"  재질: {batch['material']}")
        print(f"  부피: {batch['volume']}")
        print(f"  밀도: {batch['density']}")
        print(f"  무게: {batch['weight']}")
        print(f"  초기 부피: {batch['volume_init']}")
        break
