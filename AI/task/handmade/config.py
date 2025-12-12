"""
딥러닝 기반 물류 공간 예측 시스템 설정
"""
import torch

# 데이터셋 경로
DATASET_PATH = "/home/2020112534/47.물류공간_예측_데이터/3.개방데이터/1.데이터"
IMAGE_PATH = DATASET_PATH + "/Validation/01.원천데이터/02_출고물품"
LABEL_PATH = DATASET_PATH + "/Validation/02.라벨링데이터/02_출고물품"
TRAIN_IMAGE_PATH = DATASET_PATH + "/Training/01.원천데이터/02_출고물품"
TRAIN_LABEL_PATH = DATASET_PATH + "/Training/02.라벨링데이터/02_출고물품"

# 카테고리 (10개)
CATEGORIES = [
    "01_가공식품",
    "02_신선식품",
    "03_일상용품",
    "05_의약품/의료기기",
    "06_교육/문화용품",
    "07_디지털/가전",
    "08_가구/인테리어",
    "09_의류",
    "10_전문스포츠/레저",
    "11_패션잡화"
]

# 재질 (6개)
MATERIALS = [
    "plastic",      # 플라스틱
    "glass",        # 유리
    "paper",        # 종이/골판지
    "metal",        # 금속
    "textile",      # 섬유
    "food"          # 식품
]

# 재질별 밀도 (g/cm³)
MATERIAL_DENSITY = {
    "plastic": 1.2,
    "glass": 2.5,
    "paper": 0.6,
    "metal": 4.0,
    "textile": 0.8,
    "food": 1.0
}

# 모델 설정
BACKBONE = "resnet50"
INPUT_SIZE = (224, 224)
INPUT_CHANNELS = 5  # RGB(3) + Mask(1) + Depth(1)
NUM_CATEGORIES = len(CATEGORIES)
NUM_MATERIALS = len(MATERIALS)

# 학습 설정
BATCH_SIZE = 16  # GPU 최적화
NUM_EPOCHS = 50  # GPU 학습
LEARNING_RATE = 1e-4
WEIGHT_DECAY = 1e-5
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 손실함수 가중치
LOSS_WEIGHTS = {
    "category": 1.0,
    "material": 0.8,
    "volume": 1.5,
    "density": 1.0,
    "weight": 2.0,
    "physics": 3.0  # 물리 제약 손실 가중치
}

# SAM 모델 설정
SAM_CHECKPOINT = "sam_vit_h_4b8939.pth"  # SAM ViT-H 체크포인트
SAM_MODEL_TYPE = "vit_h"

# MiDaS 모델 설정
MIDAS_MODEL_TYPE = "DPT_Large"  # MiDaS v3.1

# 저장 경로
CHECKPOINT_DIR = "./checkpoints"
PREPROCESSED_DIR = "./preprocessed"
RESULTS_DIR = "./results"

# 데이터 증강
USE_AUGMENTATION = True
AUGMENTATION_PROB = 0.5

# 로깅
LOG_INTERVAL = 10
SAVE_INTERVAL = 5
