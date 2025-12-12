"""
간단한 데모 스크립트 - 이미지 경로를 입력받아 예측 수행
"""
import sys
import json
from final_predictor import FinalPredictor


def main():
    print("=" * 80)
    print(" " * 20 + "물류 공간 예측 시스템 - 데모")
    print("=" * 80)

    # 예측기 초기화
    print("\n🔧 예측 시스템 초기화 중...")
    predictor = FinalPredictor(use_rag=True)
    print("✅ 초기화 완료!\n")

    # 이미지 경로 입력
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        print("💡 사용법: python3 demo.py <이미지_경로>")
        print("\n테스트용 기본 이미지를 사용합니다...")
        image_path = "/home/2020112534/47.물류공간_예측_데이터/3.개방데이터/1.데이터/Validation/01.원천데이터/02_출고물품/01_가공식품/09_절임,발효식품/01090101_8801024947355/01090101_8801024947355_2_2.jpg"

    print(f"\n📷 이미지: {image_path}\n")
    print("🔄 AI 분석 중...")

    # 예측 수행
    result = predictor.predict(image_path)

    # 결과 출력
    print("\n" + "=" * 80)
    if result["success"]:
        pred = result["result"]
        print("✅ 예측 성공!\n")
        print(f"📦 카테고리: {pred['카테고리']}")
        print(f"   세부카테고리: {pred.get('세부카테고리', 'N/A')}")
        print(f"⚖️  무게: {pred['무게']}g")
        print(f"📏 부피: {pred['부피']}cm\n")

        # JSON 출력
        print("JSON 출력:")
        print(json.dumps(pred, indent=2, ensure_ascii=False))

        # JSON 파싱 검증
        try:
            json.dumps(pred)
            print("\n✅ JSON 파싱 검증 완료")
        except:
            print("\n❌ JSON 파싱 실패")

    else:
        print(f"❌ 예측 실패\n")
        print(f"오류: {result['error']}")
        if result.get('raw_response'):
            print(f"\n응답 내용:\n{result['raw_response']}")

    print("=" * 80)


if __name__ == "__main__":
    main()
