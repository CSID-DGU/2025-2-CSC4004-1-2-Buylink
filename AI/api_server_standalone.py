"""
GPT v4 (사전지식 우선) 무게/부피 예측 API 서버 - Standalone 버전
포트: 7001
엔드포인트: POST /predict

설치:
    pip install flask openai requests

실행:
    python api_server_standalone.py

테스트:
    curl http://localhost:7001/
    curl -X POST http://localhost:7001/predict -H "Content-Type: application/json" -d '{"success": true, "data": {"productName": "테스트 상품", "category": "", "imageUrls": [], "priceKRW": 1000}}'
"""

import os
import json
import base64
import requests
from flask import Flask, request, jsonify
from openai import OpenAI

# ============================================================
# 설정
# ============================================================
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GPT_MODEL = "gpt-4o"
PORT = int(os.environ.get("AI_SERVER_PORT", 7001))

# ============================================================
# Flask 앱 초기화
# ============================================================
app = Flask(__name__)
client = OpenAI(api_key=OPENAI_API_KEY)

# ============================================================
# 카테고리 통계 (외부 파일 또는 내장 데이터)
# ============================================================
CATEGORY_STATS_FILE = os.path.join(os.path.dirname(__file__), "category_stats.json")

if os.path.exists(CATEGORY_STATS_FILE):
    with open(CATEGORY_STATS_FILE, encoding='utf-8') as f:
        CATEGORY_STATS = json.load(f)
    print(f"카테고리 통계 로드됨: {len(CATEGORY_STATS)}개")
else:
    CATEGORY_STATS = {}
    print("카테고리 통계 파일 없음 - 기본값 사용")


def get_category_avg(category_path):
    """카테고리 경로에서 평균 무게/부피 추출"""
    if not category_path or not CATEGORY_STATS:
        return 500, 3000  # 기본값

    # "ホーム > 本・雑誌・漫画 > 漫画 > 少年漫画" 형식 파싱
    cleaned = category_path.replace("ホーム > ", "").strip()
    parts = [p.strip() for p in cleaned.split(" > ")]

    # 3단계 카테고리 키 생성 (root|parent|name 형식)
    if len(parts) >= 3:
        key = f"{parts[0]}|{parts[1]}|{parts[2]}"
        if key in CATEGORY_STATS:
            stat = CATEGORY_STATS[key]
            weight_mean = stat.get('weight', {}).get('mean', 500)
            volume_mean = stat.get('volume', {}).get('mean', 3000)
            if volume_mean == 0 or not volume_mean:
                dims = stat.get('dimensions', {})
                if dims:
                    l = dims.get('length', {}).get('mean', 10)
                    w = dims.get('width', {}).get('mean', 10)
                    h = dims.get('height', {}).get('mean', 10)
                    volume_mean = l * w * h / 1000
            return weight_mean, volume_mean if volume_mean else 3000

    # 2단계 검색
    if len(parts) >= 2:
        prefix = f"{parts[0]}|{parts[1]}|"
        matching = [v for k, v in CATEGORY_STATS.items() if k.startswith(prefix)]
        if matching:
            weights = [m.get('weight', {}).get('mean', 500) for m in matching if m.get('weight', {}).get('mean')]
            volumes = [m.get('volume', {}).get('mean', 3000) for m in matching if m.get('volume', {}).get('mean')]
            return (sum(weights) / len(weights) if weights else 500,
                    sum(volumes) / len(volumes) if volumes else 3000)

    # 1단계 검색
    if len(parts) >= 1:
        prefix = f"{parts[0]}|"
        matching = [v for k, v in CATEGORY_STATS.items() if k.startswith(prefix)]
        if matching:
            weights = [m.get('weight', {}).get('mean', 500) for m in matching if m.get('weight', {}).get('mean')]
            volumes = [m.get('volume', {}).get('mean', 3000) for m in matching if m.get('volume', {}).get('mean')]
            return (sum(weights) / len(weights) if weights else 500,
                    sum(volumes) / len(volumes) if volumes else 3000)

    return 500, 3000


def download_image_as_base64(url):
    """이미지 URL을 base64로 변환"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, timeout=10, headers=headers)
        if response.status_code == 200:
            return base64.b64encode(response.content).decode('utf-8')
    except Exception as e:
        print(f"이미지 다운로드 실패: {e}")
    return None


def predict_weight_volume(product_name, description, category, image_urls, price_krw):
    """GPT v4 사전지식 우선 방식으로 무게/부피 예측"""

    cat_avg_weight, cat_avg_volume = get_category_avg(category)

    # 이미지 준비
    image_content = []
    if image_urls:
        base64_img = download_image_as_base64(image_urls[0])
        if base64_img:
            image_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_img}",
                    "detail": "high"
                }
            })

    prompt = f"""이 Mercari 제품의 무게(g)와 부피(cm³)를 예측해주세요.

## 제품 정보
- 상품명: {product_name}
- 설명: {description[:500] if description else '없음'}
- 카테고리: {category}
- 가격: {price_krw}원

## 카테고리 평균 (참고용)
- 평균 무게: {cat_avg_weight:.1f}g
- 평균 부피: {cat_avg_volume:.1f}cm³

## 예측 방법 (우선순위)
1. **사전 지식 최우선**: 이 제품이나 유사 제품을 알고 있다면, 실제 스펙을 바탕으로 예측하세요.
2. **유사 제품 추정**: 정확히 모르지만 유사한 제품을 알면, 그것을 기반으로 추정하세요.
3. **카테고리 평균 참고**: 전혀 모르겠으면 위의 카테고리 평균을 참고하세요.

## 응답 형식 (JSON만)
{{
    "제품_인식": "인식한 제품명 또는 불명",
    "확신도": "high/medium/low",
    "지식_출처": "사전지식/유사제품추정/카테고리평균",
    "예측_무게": 무게(g),
    "예측_부피": 부피(cm³),
    "판단_근거": "간단한 이유"
}}"""

    messages = [
        {
            "role": "system",
            "content": """You are a product weight/volume estimation expert.
Your priority:
1. Use your prior knowledge about products if you recognize them
2. Estimate based on similar products you know
3. Fall back to category averages only when uncertain
Respond in JSON only."""
        },
        {
            "role": "user",
            "content": [{"type": "text", "text": prompt}] + image_content
        }
    ]

    try:
        response = client.chat.completions.create(
            model=GPT_MODEL,
            messages=messages,
            max_tokens=500,
            temperature=0.3
        )

        result_text = response.choices[0].message.content.strip()

        # JSON 추출
        if "```" in result_text:
            start = result_text.find("{")
            end = result_text.rfind("}") + 1
            if start != -1 and end > start:
                result_text = result_text[start:end]

        result = json.loads(result_text)

        return {
            "weight_g": result.get('예측_무게', cat_avg_weight),
            "volume_cm3": result.get('예측_부피', cat_avg_volume),
            "confidence": result.get('확신도', 'medium'),
            "source": result.get('지식_출처', 'unknown'),
            "product_recognized": result.get('제품_인식', 'unknown'),
            "reasoning": result.get('판단_근거', '')
        }

    except json.JSONDecodeError as e:
        print(f"JSON 파싱 오류: {e}")
        return {
            "weight_g": cat_avg_weight,
            "volume_cm3": cat_avg_volume,
            "confidence": "low",
            "source": "카테고리평균",
            "product_recognized": "파싱실패",
            "reasoning": "GPT 응답 파싱 실패"
        }
    except Exception as e:
        print(f"예측 오류: {e}")
        return {
            "weight_g": cat_avg_weight,
            "volume_cm3": cat_avg_volume,
            "confidence": "low",
            "source": "카테고리평균",
            "product_recognized": "오류",
            "reasoning": str(e)
        }


@app.route('/predict', methods=['POST'])
def predict():
    """무게/부피 예측 API"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # 입력 데이터 추출
        if data.get('success') and data.get('data'):
            product_data = data['data']
            product_name = product_data.get('productName', '')
            description = product_data.get('productDescription', '')
            category = product_data.get('category', '')
            image_urls = product_data.get('imageUrls', [])
            price_krw = product_data.get('priceKRW', 0)
        else:
            product_name = data.get('productName', data.get('product_name', ''))
            description = data.get('productDescription', data.get('description', ''))
            category = data.get('category', '')
            image_urls = data.get('imageUrls', data.get('image_urls', []))
            price_krw = data.get('priceKRW', data.get('price', 0))

        if not product_name:
            return jsonify({"error": "productName is required"}), 400

        result = predict_weight_volume(
            product_name=product_name,
            description=description,
            category=category,
            image_urls=image_urls,
            price_krw=price_krw
        )

        # kg, m³ 단위로 변환
        weight_kg = result['weight_g'] / 1000.0
        volume_m3 = result['volume_cm3'] / 1000000.0

        return jsonify({
            "weight": round(weight_kg, 4),
            "volume": round(volume_m3, 6),
            "_debug": {
                "weight_g": result['weight_g'],
                "volume_cm3": result['volume_cm3'],
                "confidence": result['confidence'],
                "source": result['source'],
                "product_recognized": result['product_recognized'],
                "reasoning": result['reasoning']
            }
        })

    except Exception as e:
        print(f"API 오류: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model": GPT_MODEL})


@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "service": "Weight/Volume Prediction API",
        "version": "v4 (Prior Knowledge First) - Standalone",
        "port": PORT,
        "endpoints": {
            "POST /predict": "Predict weight and volume",
            "GET /health": "Health check"
        }
    })


if __name__ == '__main__':
    print("=" * 60)
    print("GPT v4 무게/부피 예측 API 서버 (Standalone)")
    print("=" * 60)
    print(f"모델: {GPT_MODEL}")
    print(f"포트: {PORT}")
    print(f"엔드포인트: POST /predict")
    print(f"카테고리 통계: {len(CATEGORY_STATS)}개")
    print("=" * 60)

    app.run(host='0.0.0.0', port=PORT, debug=False)
