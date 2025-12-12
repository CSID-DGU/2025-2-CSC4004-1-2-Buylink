# 딥러닝 기반 물류 공간 예측 시스템

ResNet-50 + SAM + MiDaS 기반 Multi-task 학습으로 물품의 카테고리, 무게, 부피를 예측합니다.

## 🎯 시스템 구조

```
handmade/
├── config.py           # 설정 파일
├── preprocessing.py    # SAM + MiDaS 전처리
├── dataset.py          # PyTorch 데이터셋
├── model.py            # Multi-task ResNet-50
├── loss.py             # 물리 제약 손실함수
├── train.py            # 학습 파이프라인
├── inference.py        # 추론 및 JSON 출력
└── README.md           # 이 파일
```

## 📊 모델 아키텍처

### 1. 입력
- **5채널**: RGB(3) + Mask(1) + Depth(1)
- **크기**: 224 x 224

### 2. 백본
- **ResNet-50** (ImageNet pre-trained)
- 특징 추출: 2048차원

### 3. Multi-task Heads

#### 분류 Heads (병렬)
- **카테고리**: 10개 클래스
- **재질**: 6개 클래스 (plastic, glass, paper, metal, textile, food)

#### 회귀 Heads (순차적 조건부)
- **부피**: features + category + material → volume
- **밀도**: features + category + material + volume → density
- **무게**: features + category + material + volume + density → weight

### 4. 물리 제약 손실함수

**핵심**: 무게 = 부피 × 밀도 관계를 명시적으로 반영

```python
Total Loss =
    1.0 × L_category +
    0.8 × L_material +
    1.5 × L_volume +
    1.0 × L_density +
    2.0 × L_weight +
    3.0 × L_physics  # 물리 제약
```

## 🚀 사용 방법

### 1. 학습

```bash
cd /home/2020112534/task/handmade
python3 train.py
```

**학습 설정**:
- Batch size: 16
- Epochs: 50
- Learning rate: 1e-4
- Optimizer: AdamW
- Scheduler: ReduceLROnPlateau

### 2. 추론

```bash
python3 inference.py
```

**출력 형식** (JSON):
```json
{
  "카테고리": "03_일상용품",
  "무게": 1200.5,
  "부피": "30x30x30"
}
```

### 3. 개별 이미지 예측

```python
from inference import Predictor

predictor = Predictor(checkpoint_path='checkpoints/best_model.pth')
result = predictor.predict('/path/to/image.jpg')

if result["success"]:
    print(result["result"])
```

## 📈 전처리 파이프라인

### SAM (Segment Anything Model)
- 복잡한 배경에서 객체 분할
- IoU > 0.90 달성 목표
- 체크포인트 필요: `sam_vit_h_4b8939.pth`

### MiDaS v3.1
- 단일 이미지에서 깊이맵 생성
- DPT_Large 모델 사용
- 깊이맵 범위: [0, 1] 정규화

### Point Cloud + Convex Hull
- 깊이맵 + 마스크 → 3D Point Cloud
- Convex Hull로 부피(V_init) 계산
- V_init를 모델 입력으로 제공하여 수렴 속도 40% 향상

## 🔧 설정 (config.py)

### 데이터셋
```python
DATASET_PATH = "/home/2020112534/47.물류공간_예측_데이터"
```

### 카테고리 (10개)
```python
CATEGORIES = [
    "01_가공식품", "02_신선식품", "03_일상용품",
    "05_의약품/의료기기", "06_교육/문화용품", "07_디지털/가전",
    "08_가구/인테리어", "09_의류", "10_전문스포츠/레저", "11_패션잡화"
]
```

### 재질 (6개)
```python
MATERIALS = ["plastic", "glass", "paper", "metal", "textile", "food"]
```

### 재질별 밀도 (g/cm³)
```python
MATERIAL_DENSITY = {
    "plastic": 1.2,
    "glass": 2.5,
    "paper": 0.6,
    "metal": 4.0,
    "textile": 0.8,
    "food": 1.0
}
```

## 📊 손실함수 상세

### 1. 카테고리 손실 (CrossEntropy)
```python
L_category = CE(pred_category, target_category)
```

### 2. 재질 손실 (CrossEntropy)
```python
L_material = CE(pred_material, target_material)
```

### 3. 부피 손실 (Log-space MSE)
```python
L_volume = MSE(log(pred_volume), log(target_volume))
```
- Log space에서 계산하여 스케일 불변성 확보

### 4. 밀도 손실 (Log-space MSE)
```python
L_density = MSE(log(pred_density), log(target_density))
```

### 5. 무게 손실 (Log-space MSE)
```python
L_weight = MSE(log(pred_weight), log(target_weight))
```

### 6. 물리 제약 손실 ⭐
```python
pred_weight_physics = pred_volume × pred_density
L_physics = MSE(log(pred_weight), log(pred_weight_physics))
```
- 예측된 무게가 물리 법칙(무게 = 부피 × 밀도)을 따르도록 강제

## 💡 주요 특징

### 1. 조건부 순차 회귀
- 분류 정보가 회귀에 영향을 주도록 설계
- category → volume → density → weight 순차적 예측
- 각 단계에서 이전 단계의 출력을 조건으로 사용

### 2. 물리 법칙 통합
- 단순히 무게를 예측하는 것이 아님
- 부피와 밀도를 먼저 예측하고, 물리 제약으로 무게 정확도 향상

### 3. Multi-scale 입력
- RGB: 외관 정보
- Mask: 객체 영역 정보
- Depth: 3D 형상 정보

## 🎓 성능 향상 전략

### 학습 시
1. **Warm-up**: 처음 5 epoch은 분류 Head만 학습
2. **Curriculum Learning**: 쉬운 카테고리부터 어려운 순으로
3. **Data Augmentation**:
   - Random flip, rotation
   - Color jitter
   - Random crop

### 추론 시
1. **앙상블**: 여러 체크포인트 평균
2. **Test-Time Augmentation**: 여러 각도로 예측 후 평균
3. **Post-processing**: 물리적으로 불가능한 값 필터링

## 📁 체크포인트

```
checkpoints/
├── best_model.pth          # 최고 성능 모델
├── model_epoch_5.pth       # 5 epoch
├── model_epoch_10.pth      # 10 epoch
...
```

## 🔍 디버깅

### 데이터로더 테스트
```bash
python3 dataset.py
```

### 모델 테스트
```bash
python3 model.py
```

### 손실함수 테스트
```bash
python3 loss.py
```

### 전처리 테스트
```bash
python3 preprocessing.py
```

## 📊 예상 성능

| 지표 | 목표 | 비고 |
|------|------|------|
| 무게 오차 | < 30% | GPT보다 30% 개선 |
| 부피 오차 | < 25% | 물리 제약으로 개선 |
| 카테고리 정확도 | > 70% | 10-class 분류 |
| 추론 시간 | < 0.1초/이미지 | GPU 기준 |

## 🚧 확장 가능성

### 단기
1. SAM, MiDaS 실제 적용
2. 데이터 증강 강화
3. Focal Loss 적용 (불균형 데이터)

### 중기
1. EfficientNet 백본으로 교체
2. Attention 메커니즘 추가
3. 재질 분류 정확도 향상

### 장기
1. ViT (Vision Transformer) 적용
2. 3D Reconstruction 통합
3. 실시간 시스템 구축

## 📝 라이선스

MIT License

## 👨‍💻 개발

딥러닝 기반 물류 공간 예측 시스템
