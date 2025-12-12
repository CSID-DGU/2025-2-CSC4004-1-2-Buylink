# VGGT/MASt3R + Image2Mass 통합 파이프라인

## 📋 개요

이미지 여러 장에서 3D 복원 → 치수(L, W, H) 자동 추출 → 무게 예측

```
[이미지 5장] → [VGGT/MASt3R] → [3D 포인트클라우드] → [L,W,H] → [Image2Mass] → [무게]
```

---

## 🚀 설치

### Option 1: MASt3R (권장, T4 16GB에서 안정적)

```bash
chmod +x install_mast3r.sh
./install_mast3r.sh
```

### Option 2: VGGT (성능 최고, VRAM 16GB+ 필요)

```bash
chmod +x install_vggt.sh
./install_vggt.sh
```

---

## 📦 사용법

### 기본 사용

```bash
# MASt3R 버전 (권장)
python mast3r_image2mass_inference.py \
    view1.jpg view2.jpg view3.jpg view4.jpg view5.jpg

# VGGT 버전
python vggt_image2mass_inference.py \
    view1.jpg view2.jpg view3.jpg view4.jpg view5.jpg
```

### 옵션

```bash
python mast3r_image2mass_inference.py \
    --model image2mass_best.pth \     # 학습된 모델 경로
    --sim-lut sim_lut.pt \            # SIM LUT 경로
    --device cuda \                    # GPU 사용
    --ref-idx 0 \                      # 대표 이미지 인덱스
    view1.jpg view2.jpg view3.jpg
```

### Python에서 직접 사용

```python
from mast3r_image2mass_inference import MASt3RImage2MassPipeline

# 파이프라인 초기화
pipeline = MASt3RImage2MassPipeline(
    model_path="image2mass_best.pth",
    sim_lut_path="sim_lut.pt",
    device="cuda"
)

# 예측
result = pipeline.predict([
    "view1.jpg",
    "view2.jpg", 
    "view3.jpg",
    "view4.jpg",
    "view5.jpg"
])

print(f"무게: {result['mass']:.2f}g")
print(f"치수: L={result['dims']['L']:.1f}cm, W={result['dims']['W']:.1f}cm, H={result['dims']['H']:.1f}cm")
print(f"부피: {result['bbox_volume']:.1f}cm³")
```

---

## 📸 이미지 촬영 가이드

### 권장 이미지 수
- 최소: 3장
- 권장: **5~6장**
- 최적: 8~10장

### 촬영 팁

```
✅ 좋은 예:
- 정면, 좌측, 우측, 상단, 대각선 등 다양한 각도
- 각 이미지 간 30~60% 겹침
- 밝고 균일한 조명

❌ 나쁜 예:
- 비슷한 각도에서 여러 장
- 너무 어둡거나 그림자가 심한 이미지
- 모션 블러가 있는 이미지
```

### 예시 촬영 순서 (5장)

```
1. 정면 (0°)
2. 좌측 45°
3. 우측 45°  
4. 상단 45°
5. 대각선 (좌상단에서)
```

---

## 📁 필요 파일

```
./
├── image2mass_best.pth    # 학습된 Image2Mass 모델
├── sim_lut.pt             # SIM Lookup Table
├── image2mass_model.py    # 모델 정의
├── mast3r_image2mass_inference.py  # MASt3R 파이프라인
└── vggt_image2mass_inference.py    # VGGT 파이프라인
```

---

## ⚙️ 모델 비교

| | MASt3R | VGGT |
|---|---|---|
| VRAM 사용량 | ~10GB | ~16GB+ |
| 속도 | 중간 (Global Alignment 필요) | 빠름 (Single Pass) |
| 정확도 | 높음 | 더 높음 |
| T4 16GB 호환 | ✅ | ⚠️ 빠듯함 |

**T4 16GB에서는 MASt3R 권장**

---

## 🔧 문제 해결

### CUDA Out of Memory

```bash
# ollama 등 다른 프로세스 종료
pkill ollama

# 이미지 수 줄이기 (3장으로)
python mast3r_image2mass_inference.py view1.jpg view2.jpg view3.jpg

# CPU 모드 (느리지만 작동)
python mast3r_image2mass_inference.py --device cpu view1.jpg view2.jpg view3.jpg
```

### Import Error

```bash
# MASt3R/VGGT가 설치 안 된 경우
./install_mast3r.sh  # 또는 ./install_vggt.sh
```

---

## 📊 출력 예시

```
==================================================
📦 PREDICTION RESULT
==================================================
  Dimensions:
    L = 45.23 cm
    W = 32.15 cm
    H = 18.67 cm
  Bounding Box Volume: 27156.42 cm³
  Predicted Volume: 0.8234
  Predicted Density: 0.4521
  ✅ Predicted Mass: 1523.45 g
==================================================
```

---

## 📄 라이선스

- Image2Mass: 기존 학습 코드 기반
- MASt3R/DUSt3R: Naver Labs (BSD 2-Clause)
- VGGT: Meta AI
