"""
정확도 테스트 스크립트 - 랜덤 샘플 20개로 테스트 + 오류 케이스 자동 저장
"""
import os
import json
import random
from final_predictor import FinalPredictor

# 오류 케이스 저장용
ERROR_CASES_FILE = "error_cases.json"
error_cases = []

def get_label_data(label_path):
    """라벨 파일에서 실제 데이터 추출"""
    with open(label_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if 'annotations' not in data or len(data['annotations']) == 0:
        return None

    ann = data['annotations'][0]
    attrs = ann.get('attributes', {})

    category = ""
    if 'categories' in data and len(data['categories']) > 0:
        category = data['categories'][0].get('name', '')

    return {
        "category": category,
        "weight": attrs.get('weight', 0) * 1000,  # kg -> g 변환
        "width": attrs.get('width', 0),
        "height": attrs.get('height', 0),
        "length": attrs.get('length', 0),
        "product_name": attrs.get('product_name', ''),
    }


def calculate_accuracy(pred, actual):
    """정확도 계산"""
    # 카테고리 정확도
    category_correct = pred['카테고리'] == actual['category']

    # 무게 오차율
    if actual['weight'] > 0:
        weight_error = abs(pred['무게'] - actual['weight']) / actual['weight'] * 100
    else:
        weight_error = 100

    # 부피 오차 (대략적으로)
    pred_dims = [float(x) for x in pred['부피'].split('x')]
    actual_volume = actual['width'] * actual['height'] * actual['length']
    pred_volume = pred_dims[0] * pred_dims[1] * pred_dims[2]

    if actual_volume > 0:
        volume_error = abs(pred_volume - actual_volume) / actual_volume * 100
    else:
        volume_error = 100

    return {
        "category_correct": category_correct,
        "weight_error": weight_error,
        "volume_error": volume_error
    }


def main():
    print("=" * 80)
    print("정확도 테스트 시작 (랜덤 샘플 20개)")
    print("=" * 80)

    # 이미지 파일 수집
    validation_path = "/home/2020112534/47.물류공간_예측_데이터/3.개방데이터/1.데이터/Validation/01.원천데이터/01_입고물품"
    label_path = "/home/2020112534/47.물류공간_예측_데이터/3.개방데이터/1.데이터/Validation/02.라벨링데이터/01_입고물품"

    image_files = []
    for root, dirs, files in os.walk(validation_path):
        for file in files:
            if file.endswith('.jpg'):
                image_files.append(os.path.join(root, file))

    # 랜덤 샘플 20개 선택
    random.seed(42)
    sample_images = random.sample(image_files, min(20, len(image_files)))

    # 예측기 초기화
    predictor = FinalPredictor(use_rag=False)

    results = []
    category_correct_count = 0
    weight_errors = []
    volume_errors = []

    for i, image_path in enumerate(sample_images):
        print(f"\n[{i+1}/20] 테스트 중...")
        print(f"이미지: {os.path.basename(image_path)}")

        # 라벨 파일 경로 찾기
        relative_path = os.path.relpath(image_path, validation_path)
        label_file = os.path.join(label_path, relative_path.replace('.jpg', '.json'))

        if not os.path.exists(label_file):
            print("  ⚠️  라벨 파일 없음, 스킵")
            continue

        # 실제 데이터 로드
        actual = get_label_data(label_file)
        if actual is None:
            print("  ⚠️  라벨 데이터 없음, 스킵")
            continue

        # 예측 수행
        pred_result = predictor.predict(image_path)

        if not pred_result['success']:
            print(f"  ❌ 예측 실패: {pred_result['error']}")
            continue

        pred = pred_result['result']

        # 정확도 계산
        acc = calculate_accuracy(pred, actual)

        print(f"  제품: {actual['product_name']}")
        print(f"  카테고리: {actual['category']} → {pred['카테고리']} {'✅' if acc['category_correct'] else '❌'}")
        print(f"  무게: {actual['weight']:.0f}g → {pred['무게']}g (오차: {acc['weight_error']:.1f}%)")
        print(f"  부피 오차: {acc['volume_error']:.1f}%")

        if acc['category_correct']:
            category_correct_count += 1
        weight_errors.append(acc['weight_error'])
        volume_errors.append(acc['volume_error'])

        results.append({
            "image": os.path.basename(image_path),
            "actual": actual,
            "predicted": pred,
            "accuracy": acc
        })

        # 오차 50% 이상인 경우 저장
        if acc['weight_error'] >= 50:
            error_case = {
                "image": os.path.basename(image_path),
                "product": actual['product_name'],
                "category": actual['category'],
                "actual_weight": actual['weight'],
                "predicted_weight": pred['무게'],
                "actual_size": f"{actual['width']}x{actual['height']}x{actual['length']}",
                "predicted_size": pred['부피'],
                "error_rate": acc['weight_error'],
                "subcategory": pred.get('세부카테고리', 'N/A')
            }
            error_cases.append(error_case)

    # 결과 요약
    print("\n" + "=" * 80)
    print("정확도 테스트 결과 요약")
    print("=" * 80)

    total_samples = len(results)
    if total_samples > 0:
        category_accuracy = category_correct_count / total_samples * 100
        avg_weight_error = sum(weight_errors) / len(weight_errors)
        avg_volume_error = sum(volume_errors) / len(volume_errors)

        print(f"\n총 테스트 샘플: {total_samples}개")
        print(f"\n📦 카테고리 정확도: {category_accuracy:.1f}% ({category_correct_count}/{total_samples})")
        print(f"⚖️  평균 무게 오차: {avg_weight_error:.1f}%")
        print(f"📏 평균 부피 오차: {avg_volume_error:.1f}%")

        # 무게 오차 분포
        weight_excellent = sum(1 for e in weight_errors if e < 20)
        weight_good = sum(1 for e in weight_errors if 20 <= e < 50)
        weight_poor = sum(1 for e in weight_errors if e >= 50)

        print(f"\n무게 예측 정확도 분포:")
        print(f"  우수 (오차 <20%): {weight_excellent}개 ({weight_excellent/total_samples*100:.1f}%)")
        print(f"  양호 (오차 20-50%): {weight_good}개 ({weight_good/total_samples*100:.1f}%)")
        print(f"  미흡 (오차 >50%): {weight_poor}개 ({weight_poor/total_samples*100:.1f}%)")
    else:
        print("테스트 샘플이 없습니다.")

    # 오류 케이스 저장
    if error_cases:
        with open(ERROR_CASES_FILE, 'w', encoding='utf-8') as f:
            json.dump(error_cases, f, ensure_ascii=False, indent=2)
        print(f"\n💾 오류 케이스 {len(error_cases)}개가 {ERROR_CASES_FILE}에 저장되었습니다.")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
