# 물류 공간 예측 AI 모델 비교 실험

물류 상품 이미지에서 부피와 무게를 예측하는 다양한 AI 접근 방식을 실험한 프로젝트입니다.

## 프로젝트 구조

```
task/
├── gpt/          # GPT-4o 기반 RAG 예측 시스템
├── handmade/     # 딥러닝 기반 직접 학습 모델
└── nongpt/       # MASt3R 3D 복원 기반 부피 추정
```

## 각 접근 방식 요약

### 1. GPT 기반 (gpt/)
- GPT-4o Vision API를 활용한 이미지 분석
- RAG(Retrieval-Augmented Generation) 방식으로 유사 상품 참조
- 반복 학습을 통한 예측 정확도 개선

### 2. 딥러닝 직접 학습 (handmade/)
- ResNet50 백본 + 커스텀 헤드
- SAM(Segment Anything Model) 마스킹
- MiDaS 깊이 추정 활용
- 물리 제약 손실함수 적용

### 3. 3D 복원 기반 (nongpt/)
- MASt3R 모델로 3D 포인트 클라우드 생성
- 카테고리별 스케일 보정
- 깊이 기반 부피 추정

## 실험 결과

자세한 실험 결과는 각 폴더의 리포트 및 상위 디렉토리의 종합 리포트를 참조하세요.
- FINAL_COMPREHENSIVE_REPORT.md: 전체 종합 분석
- COMPLETE_EVALUATION_REPORT.md: 평가 결과 상세

## 환경 설정

### GPT 모듈 사용 시
```bash
export OPENAI_API_KEY="your-api-key"
```

### 의존성 설치
```bash
pip install torch torchvision opencv-python pillow openai
```

## 개발자

- choconaena
