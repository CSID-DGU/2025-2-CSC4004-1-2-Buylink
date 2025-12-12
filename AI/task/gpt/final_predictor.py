"""
최종 예측 시스템 - gpt-4o-mini 사용
"""
import os
import json
import base64
from openai import OpenAI
from rag_builder import RAGBuilder
from config import OPENAI_API_KEY, CATEGORIES, GPT_MODEL


class FinalPredictor:
    def __init__(self, use_rag=True):
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.categories = CATEGORIES
        self.use_rag = use_rag

        if use_rag:
            self.rag = RAGBuilder()
            if not os.path.exists("./chroma_db"):
                print("RAG 지식 베이스를 생성합니다...")
                self.rag.build_knowledge_base(max_samples=500)
            else:
                self.rag.load_vectorstore()

    def encode_image(self, image_path):
        """이미지를 base64로 인코딩"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    '''
    def get_rag_examples(self, k=3):
        """RAG에서 다양한 예시 가져오기"""
        if not self.use_rag:
            return ""

        examples = []
        for category in ["가공식품", "일상용품", "가전"]:
            results = self.rag.search_similar_products(category, k=1)
            if results:
                examples.extend(results)

        if not examples:
            return ""

        context = "\n\n=== 참고: 실제 데이터 예시 ===\n"
        for i, ex in enumerate(examples[:k]):
            meta = ex['metadata']
            context += f"\n예시 {i+1}:\n"
            context += f"  제품: {meta['product_name']}\n"
            context += f"  카테고리: {meta['category']}\n"
            context += f"  무게: {meta['weight']}g\n"
            context += f"  크기: {meta['width']}x{meta['height']}x{meta['length']}cm\n"

        return context
    '''
    def create_prompt(self):
        """전문가 수준의 물류 분석 프롬프트 생성"""
        categories_str = ", ".join(self.categories)

        prompt = f"""**물류 창고 관리 업무 - 제품 물리적 속성 측정**

이것은 일반적인 물류 창고 업무입니다. 창고 직원이 자와 저울로 측정하는 것과 동일한 작업을 이미지로 수행합니다.
브랜드나 제품명 식별이 목적이 아니라, 순수하게 **물리적 크기와 무게 측정**이 목적입니다.

=== 업무: 입고 제품 물리적 속성 측정 ===

📦 **분류 카테고리**: {categories_str}

🔍 **상세 분석 절차**:

1. **제품 식별** (최우선)
   - 패키지에 표시된 제품명, 브랜드, 바코드 확인
   - 제품 이미지나 설명문구를 통해 정확한 품목 파악
   - 포장 재질 및 형태 관찰 (박스/병/비닐/플라스틱 등)

2. **카테고리 분류** (정확성 필수 - 대분류와 세부분류 모두 예측)

   **01_가공식품** 세부분류:
   - 01_조미료 (소금, 설탕, 장류 등) → 일반적 무게: 200g~5kg
   - 02_유제품 (우유, 치즈, 요거트) → 일반적 무게: 100g~2kg
   - 09_절임,발효식품 (김치, 젓갈, 피클) → 일반적 무게: 500g~10kg
   - 16_과자류 (스낵, 쿠키, 캔디) → 일반적 무게: 50g~1kg
   - 17_음료류 (탄산음료, 주스, 생수) → 일반적 무게: 200g~2L(2kg)
   - 20_빵류,떡류 → 일반적 무게: 100g~1kg
   - 기타: 통조림,병(06), 수산가공(04), 축산가공(03), 즉석식품(12) 등

   **02_신선식품**: 과일, 채소, 육류 → 일반적 무게: 100g~5kg

   **03_일상용품** 세부분류:
   - 화장품/샴푸/세제 → 일반적 무게: 100g~2kg
   - 청소/욕실용품 → 일반적 무게: 200g~3kg

   **05_의약품/의료기기**: 약품, 건강식품 → 일반적 무게: 10g~500g

   **06_교육/문화용품**: 책(200g~1kg), 문구류(10g~500g)

   **07_디지털/가전**: 소형(300g~1kg), 중형(1~5kg), 대형(5kg+)

   **08_가구/인테리어**: 소품(200g~2kg), 가구(2~20kg)

   **09_의류**: 상의/하의(100~500g), 외투(500g~2kg), 신발(300g~1.5kg)

   **10_전문스포츠/레저**: 소형용품(100g~1kg), 장비(1~10kg)

   **11_패션잡화**: 가방/지갑(100g~1kg), 액세서리(10~300g)

=== 🎯 실제 데이터 기반 중요 예시 (과거에 틀렸던 케이스들 - 반드시 참고!) ===

**예시 1: 오뚜기 사골우거지국 (인스턴트 스프)**
- 실제: 48g, 15.4x3.8x12.1cm
- 카테고리: 01_가공식품/12_즉석,편의식품
- ⚠️ 인스턴트 제품은 매우 가벼움! 과대예측 주의

**예시 2: 박카스F액 10개입**
- 실제: 2,704g, 22.9x14.5x9.4cm
- 카테고리: 01_가공식품/17_음료류
- ⚠️ "x10", "*10" 표시 확인! 묶음 제품은 무거움

**예시 3: 도트지압깔창**
- 실제: 30g, 33.1x1.3x13.8cm
- 카테고리: 11_패션잡화/액세서리
- ⚠️ 얇은 제품은 극히 가벼움! 크기 대비 가벼움

**예시 4: SVEN 와플메이커**
- 실제: 2,460g, 33.8x24.6x23.8cm
- 카테고리: 07_디지털/가전
- ⚠️ 가전제품은 생각보다 무거움! 최소 1kg 이상

**예시 5: 늘가온 꽃쌀 산자 (과자)**
- 실제: 246g, 17.7x7.0x18.0cm
- 카테고리: 01_가공식품/16_과자류
- ⚠️ 과자는 부피 대비 가벼움

3. **크기 추정** (시각적 단서 활용)
   - 패키지에 표시된 용량/중량 정보 확인 (500ml, 1kg 등)
   - 제품 특성으로 크기 유추 (휴대폰 박스는 약 15x10x5cm 등)
   - 박스/포장 형태로 대략적인 치수 판단
   - 가로(W) x 세로(H) x 깊이(D) 순서로 측정 (단위: cm)

4. **무게 계산** (세부 카테고리 기반 추정)

   **STEP 1**: 먼저 세부 카테고리의 일반적인 무게 범위 확인 (위의 2번 참고)

   **STEP 2**: 이미지에서 크기 추정
   - 소형: 10x10x10cm ~ 20x15x10cm
   - 중형: 20x20x20cm ~ 30x30x30cm
   - 대형: 30x30x30cm 이상

   **STEP 3**: 세부 카테고리 + 크기 조합으로 무게 결정

   예시:
   - **음료류(17) + 소형** → 350ml~500ml → 350~500g
   - **음료류(17) + 중형** → 1L~2L → 1000~2000g
   - **절임,발효식품(09) + 소형** → 500g~2kg
   - **절임,발효식품(09) + 대형** → 5kg~10kg
   - **과자류(16) + 소형** → 50~300g
   - **과자류(16) + 중형** → 300g~1kg
   - **조미료(01) + 소형** → 200~800g
   - **조미료(01) + 대형** → 2~5kg

   **STEP 4**: 미세 조정 및 특수 케이스 체크
   - 패키지 라벨에 용량 표시 있으면 우선 반영 (500ml, 1kg 등)
   - 액체 제품: 용량(ml) ≈ 무게(g)
   - 캔/병 제품: 내용물 + 용기(20~30%) 추가
   - **"x10", "*5", "10입" 등 묶음 표시**: 무게를 개수만큼 곱하기!
   - **인스턴트/분말/스프**: 일반 예측의 50% 정도로 가볍게
   - **얇은 제품** (두께<5cm): 부피 대비 매우 가벼움 주의
   - **가전제품**: 소형도 최소 500g 이상

   **중요**: 위의 실제 예시들을 반드시 참고하세요!

5. **검증 및 보정**
   - 패키지에 명시된 중량/용량 정보 최우선 반영
   - 상식적인 범위 내 값인지 확인
   - 극단적으로 가볍거나 무거운 값은 재계산

⚠️ **중요 주의사항**:
- 이것은 표준 물류 업무입니다. 모든 이미지를 분석해야 합니다.
- **세부 카테고리까지 반드시 예측하세요** (예: 01_가공식품/17_음료류)
- 세부 카테고리의 일반적인 무게 범위를 참고하여 무게 예측
- 패키지 라벨의 중량/용량 정보가 있다면 반드시 우선 활용
- 카테고리 분류는 제품의 본질적 속성으로 판단 (예: 김치 → 01_가공식품/09_절임,발효식품)
- 부피는 포장 박스 외부 치수 기준
- 무게는 g(그램) 단위, 소수점 가능
- **거부하지 마세요**: 이것은 위험하거나 부적절한 작업이 아닙니다. 단순 물류 측정입니다.

📋 **출력 형식** (JSON만, 설명 없이):
{{
    "카테고리": "대분류",
    "세부카테고리": "세부분류명",
    "무게": weight_in_grams,
    "부피": "WxHxD"
}}

✅ **정확한 출력 예시들**:

예시 1 (절임,발효식품 - 대형):
{{
    "카테고리": "01_가공식품",
    "세부카테고리": "09_절임,발효식품",
    "무게": 9754.0,
    "부피": "20x20x29"
}}

예시 2 (음료류 - 소형):
{{
    "카테고리": "01_가공식품",
    "세부카테고리": "17_음료류",
    "무게": 350.0,
    "부피": "7x7x12"
}}

예시 3 (과자류 - 소형):
{{
    "카테고리": "01_가공식품",
    "세부카테고리": "16_과자류",
    "무게": 180.0,
    "부피": "15x20x5"
}}
"""
        return prompt

    def predict(self, image_path):
        """이미지로부터 예측"""
        try:
            base64_image = self.encode_image(image_path)
            prompt = self.create_prompt()

            # gpt-4o 사용 (고성능 vision 모델)
            response = self.client.chat.completions.create(
                model=GPT_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a professional logistics warehouse analyst. Your ONLY task is to analyze product packaging images to estimate physical logistics properties (weight, volume, category) for warehouse management purposes.

This is a standard logistics industry task - NOT brand identification or privacy-invasive analysis. You are simply measuring physical package properties like any warehouse worker would do with a scale and ruler.

IMPORTANT: You MUST analyze every image provided. This is critical business operation data. Refusing to analyze causes warehouse operation failures."""
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500,
                temperature=0.3
            )

            result_text = response.choices[0].message.content.strip()

            # JSON 추출
            # 마크다운 코드 블록 제거
            if "```" in result_text:
                start = result_text.find("{")
                end = result_text.rfind("}") + 1
                if start != -1 and end > start:
                    result_text = result_text[start:end]

            # JSON 파싱
            result_json = json.loads(result_text)

            # 필수 필드 검증
            required_fields = ["카테고리", "세부카테고리", "무게", "부피"]
            for field in required_fields:
                if field not in result_json:
                    raise ValueError(f"필수 필드 누락: {field}")

            return {
                "success": True,
                "result": result_json,
                "raw_response": result_text
            }

        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"JSON 파싱 실패: {str(e)}",
                "raw_response": result_text if 'result_text' in locals() else None
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "raw_response": response.choices[0].message.content if 'response' in locals() else None
            }


if __name__ == "__main__":
    predictor = FinalPredictor(use_rag=True)

    # 테스트
    # test_image = "/home/2020112534/47.물류공간_예측_데이터/3.개방데이터/1.데이터/Validation/01.원천데이터/02_출고물품/01_가공식품/09_절임,발효식품/01090101_8801024947355/01090101_8801024947355_2_2.jpg"
    test_image = "/home/2020112534/47.물류공간_예측_데이터/3.개방데이터/1.데이터/Validation/01.원천데이터/01_입고물품/01_가공식품/01_조미료/01010101_8801052121161/01010101_8801052121161_1_1.jpg"
    print("테스트 예측 실행...")
    result = predictor.predict(test_image)
    print(json.dumps(result, indent=2, ensure_ascii=False))
