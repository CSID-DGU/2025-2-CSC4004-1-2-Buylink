"""
전체 시스템 데모
"""
import os
import sys


def main():
    print("╔══════════════════════════════════════════════════════════════════════════════╗")
    print("║              딥러닝 기반 물류 공간 예측 시스템 - 데모                        ║")
    print("╚══════════════════════════════════════════════════════════════════════════════╝")

    while True:
        print("\n메뉴를 선택하세요:")
        print("  1. 모델 테스트")
        print("  2. 데이터셋 테스트")
        print("  3. 손실함수 테스트")
        print("  4. 학습 시작 (간단 버전)")
        print("  5. 추론 테스트")
        print("  0. 종료")

        choice = input("\n선택: ").strip()

        if choice == "1":
            print("\n" + "="*80)
            print("모델 테스트")
            print("="*80)
            os.system("python3 model.py")

        elif choice == "2":
            print("\n" + "="*80)
            print("데이터셋 테스트")
            print("="*80)
            os.system("timeout 30 python3 dataset.py | head -50")

        elif choice == "3":
            print("\n" + "="*80)
            print("손실함수 테스트")
            print("="*80)
            os.system("python3 loss.py")

        elif choice == "4":
            print("\n" + "="*80)
            print("학습 시작 (200 샘플, 5 epochs)")
            print("="*80)
            print("\n⚠ 학습에는 시간이 걸립니다 (GPU: ~5분, CPU: ~30분)")
            confirm = input("계속하시겠습니까? (y/N): ").strip().lower()
            if confirm == 'y':
                os.system("python3 train.py")

        elif choice == "5":
            print("\n" + "="*80)
            print("추론 테스트")
            print("="*80)
            os.system("python3 inference.py")

        elif choice == "0":
            print("\n종료합니다.")
            break

        else:
            print("\n⚠ 잘못된 선택입니다.")


if __name__ == "__main__":
    main()
