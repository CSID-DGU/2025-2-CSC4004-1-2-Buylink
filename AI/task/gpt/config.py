# GPT API 설정
import os
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "your-api-key-here")

# 데이터셋 경로
DATASET_PATH = "/home/2020112534/47.물류공간_예측_데이터/3.개방데이터/1.데이터/Validation"
IMAGE_PATH = DATASET_PATH + "/01.원천데이터/02_출고물품"
LABEL_PATH = DATASET_PATH + "/02.라벨링데이터/02_출고물품"

# 카테고리 목록
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

# GPT 모델 설정
GPT_MODEL = "gpt-4o"
MAX_TOKENS = 1000
TEMPERATURE = 0.1
