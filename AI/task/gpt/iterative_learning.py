"""
반복 테스트로 틀린 케이스 수집 및 Few-Shot 학습 시스템
"""
import json
import os
from final_predictor import FinalPredictor
from accuracy_test import get_label_data

class IterativeLearningSystem:
    def __init__(self):
        self.error_cases = []
        self.error_file = "error_cases.json"
        self.load_error_cases()

    def load_error_cases(self):
        """저장된 오류 케이스 로드"""
        if os.path.exists(self.error_file):
            with open(self.error_file, 'r', encoding='utf-8') as f:
                self.error_cases = json.load(f)
            print(f"✅ 기존 오류 케이스 {len(self.error_cases)}개 로드됨")

    def save_error_case(self, image_path, actual, predicted, error_rate):
        """오류 케이스 저장 (오차 50% 이상만)"""
        if error_rate < 50:
            return

        case = {
            "image": os.path.basename(image_path),
            "product": actual['product_name'],
            "category": actual['category'],
            "actual_weight": actual['weight'],
            "predicted_weight": predicted['무게'],
            "actual_size": f"{actual['width']}x{actual['height']}x{actual['length']}",
            "error_rate": error_rate,
            "subcategory": predicted.get('세부카테고리', 'N/A')
        }

        # 중복 체크
        if not any(c['image'] == case['image'] for c in self.error_cases):
            self.error_cases.append(case)
            print(f"  📝 오류 케이스 저장: {case['product']} (오차 {error_rate:.1f}%)")

        # 파일에 저장
        with open(self.error_file, 'w', encoding='utf-8') as f:
            json.dump(self.error_cases, f, ensure_ascii=False, indent=2)

    def generate_fewshot_examples(self, top_n=10):
        """Few-Shot 예시 생성 (오차 큰 순서)"""
        sorted_cases = sorted(self.error_cases, key=lambda x: x['error_rate'], reverse=True)

        examples = "\n=== 실제 데이터 기반 중요 예시 (틀리기 쉬운 케이스) ===\n\n"

        for i, case in enumerate(sorted_cases[:top_n]):
            examples += f"예시 {i+1}: {case['product']}\n"
            examples += f"  - 카테고리: {case['category']}\n"
            examples += f"  - 실제 무게: {case['actual_weight']:.0f}g\n"
            examples += f"  - 실제 크기: {case['actual_size']}cm\n"

            # 주의사항 추가
            if case['actual_weight'] < 100:
                examples += f"  ⚠️ 주의: 매우 가벼운 제품입니다!\n"
            elif case['actual_weight'] > 2000:
                examples += f"  ⚠️ 주의: 무거운 제품입니다!\n"

            if '인스턴트' in case['product'] or '스프' in case['product']:
                examples += f"  ⚠️ 주의: 인스턴트 제품은 부피 대비 가볍습니다!\n"

            examples += "\n"

        return examples

    def get_correction_rules(self):
        """오류 패턴 분석해서 보정 규칙 생성"""
        rules = "\n⚠️ **오류 패턴 기반 보정 규칙**:\n"

        # 인스턴트 제품 분석
        instant_cases = [c for c in self.error_cases if '인스턴트' in c['product'] or '스프' in c['product']]
        if instant_cases:
            avg_actual = sum(c['actual_weight'] for c in instant_cases) / len(instant_cases)
            rules += f"1. 인스턴트/스프 제품: 평균 {avg_actual:.0f}g, 매우 가벼움 주의\n"

        # 가벼운 제품 (<100g)
        light_cases = [c for c in self.error_cases if c['actual_weight'] < 100]
        if light_cases:
            rules += f"2. 극소형 제품 (<100g): {len(light_cases)}개 케이스, 과대예측 주의\n"

        # 무거운 제품 (>2kg)
        heavy_cases = [c for c in self.error_cases if c['actual_weight'] > 2000]
        if heavy_cases:
            rules += f"3. 대형 제품 (>2kg): {len(heavy_cases)}개 케이스, 과소예측 주의\n"

        return rules


if __name__ == "__main__":
    system = IterativeLearningSystem()

    print("=" * 80)
    print("Few-Shot 예시 생성")
    print("=" * 80)
    print(system.generate_fewshot_examples(10))

    print("\n" + "=" * 80)
    print("보정 규칙")
    print("=" * 80)
    print(system.get_correction_rules())
