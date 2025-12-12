"""
3가지 방식 무게/부피 예측 평가 스크립트

1. NonGPT 방식: MASt3R 3D 복원 → 치수 추출 → Image2Mass 무게 예측
2. NonGPT + GT Volume: 정답 치수 사용 → Image2Mass 무게 예측
3. GPT 방식: gpt-4o-mini Vision으로 무게/부피 예측

출력: 각 방식별 성능 지표, 500g 이상 오차 케이스 수집
"""

import os
import sys
import json
import torch
import numpy as np
from glob import glob
from tqdm import tqdm
from datetime import datetime
import random

# 경로 설정
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MAST3R_PATH = os.path.join(SCRIPT_DIR, "mast3r")
GPT_DIR = "/home/2020112534/task/gpt"

if MAST3R_PATH not in sys.path:
    sys.path.insert(0, MAST3R_PATH)
if GPT_DIR not in sys.path:
    sys.path.insert(0, GPT_DIR)

os.chdir(SCRIPT_DIR)


# ========================================
# 데이터 로더
# ========================================
def load_sample_data(json_path):
    """JSON 라벨에서 정답 데이터 로드"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    ann = data['annotations'][0]
    attrs = ann['attributes']

    # 이미지 경로 생성 (라벨 -> 원천데이터)
    image_path = json_path.replace("02.라벨링데이터", "01.원천데이터")
    image_path = image_path.replace(".json", ".jpg")

    return {
        'json_path': json_path,
        'image_path': image_path,
        'product_name': attrs.get('product_name', 'Unknown'),
        'weight_gt': attrs.get('weight', 0) * 1000,  # kg -> g
        'length': attrs.get('length', 0),  # cm
        'width': attrs.get('width', 0),    # cm
        'height': attrs.get('height', 0),  # cm
        'volume_gt': attrs.get('length', 0) * attrs.get('width', 0) * attrs.get('height', 0)
    }


def get_product_images(json_path):
    """같은 품목의 모든 이미지 경로 반환 (MASt3R용)"""
    # 품목 폴더 찾기
    product_dir = os.path.dirname(json_path)
    product_dir = product_dir.replace("02.라벨링데이터", "01.원천데이터")

    images = sorted(glob(os.path.join(product_dir, "*.jpg")))
    return images


# ========================================
# 방법 1: NonGPT (MASt3R + Image2Mass)
# ========================================
class NonGPTPredictor:
    def __init__(self, device="cuda"):
        from mast3r_image2mass_inference import MASt3RImage2MassPipeline
        self.pipeline = MASt3RImage2MassPipeline(
            model_path="image2mass_best.pth",
            sim_lut_path="sim_lut.pt",
            device=device
        )

    def predict(self, image_paths):
        """여러 이미지에서 부피/무게 예측"""
        try:
            result = self.pipeline.predict(image_paths)
            return {
                'success': True,
                'weight_pred': result['mass'],  # g
                'volume_pred': result['bbox_volume'],  # cm³
                'dims': result['dims']
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}


# ========================================
# 방법 2: NonGPT + GT Volume
# ========================================
class NonGPTWithGTVolumePredictor:
    def __init__(self, device="cuda"):
        from image2mass_model import Image2MassModel
        from torchvision import transforms
        from PIL import Image

        self.device = device
        self.transforms = transforms.Compose([
            transforms.Resize((299, 299)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

        # 모델 로드
        sim_lut = torch.load("sim_lut.pt", map_location=device)
        self.model = Image2MassModel(sim_lut=sim_lut)
        state_dict = torch.load("image2mass_best.pth", map_location=device)
        self.model.load_state_dict(state_dict)
        self.model.to(device)
        self.model.eval()

        self.Image = Image

    def predict(self, image_path, gt_dims):
        """이미지 + 정답 치수로 무게 예측"""
        try:
            # 이미지 로드
            img = self.Image.open(image_path).convert('RGB')
            img_tensor = self.transforms(img).unsqueeze(0).to(self.device)

            # 치수 텐서
            dims_tensor = torch.tensor([[gt_dims['L'], gt_dims['W'], gt_dims['H']]],
                                       dtype=torch.float32).to(self.device)

            with torch.no_grad():
                mass_pred, aux = self.model(img_tensor, dims_tensor)

            return {
                'success': True,
                'weight_pred': mass_pred.item() * 1000,  # kg -> g
                'volume_pred': aux['volume'].item(),
                'density_pred': aux['density'].item()
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}


# ========================================
# 방법 3: GPT 방식
# ========================================
class GPTPredictor:
    def __init__(self):
        from final_predictor import FinalPredictor
        self.predictor = FinalPredictor(use_rag=False)

    def predict(self, image_path):
        """GPT로 무게/부피 예측"""
        try:
            result = self.predictor.predict(image_path)
            if result['success']:
                pred = result['result']
                # 부피 파싱 (WxHxD 형태)
                volume_str = pred.get('부피', '0x0x0')
                dims = [float(x) for x in volume_str.split('x')]
                volume = dims[0] * dims[1] * dims[2] if len(dims) == 3 else 0

                return {
                    'success': True,
                    'weight_pred': float(pred.get('무게', 0)),
                    'volume_pred': volume,
                    'category': pred.get('카테고리', ''),
                    'subcategory': pred.get('세부카테고리', '')
                }
            else:
                return {'success': False, 'error': result.get('error', 'Unknown')}
        except Exception as e:
            return {'success': False, 'error': str(e)}


# ========================================
# 평가 함수
# ========================================
def calculate_metrics(results):
    """결과 리스트에서 지표 계산"""
    weight_errors = []
    weight_errors_pct = []
    volume_errors = []
    volume_errors_pct = []
    over_500g_cases = []

    for r in results:
        if not r.get('success', False):
            continue

        # 무게 오차
        w_gt = r['weight_gt']
        w_pred = r['weight_pred']
        w_err = abs(w_gt - w_pred)
        w_err_pct = (w_err / w_gt * 100) if w_gt > 0 else 0

        weight_errors.append(w_err)
        weight_errors_pct.append(w_err_pct)

        # 500g 이상 오차
        if w_err >= 500:
            over_500g_cases.append({
                'product': r.get('product_name', 'Unknown'),
                'weight_gt': w_gt,
                'weight_pred': w_pred,
                'error_g': w_err,
                'error_pct': w_err_pct
            })

        # 부피 오차 (있는 경우)
        if 'volume_gt' in r and 'volume_pred' in r:
            v_gt = r['volume_gt']
            v_pred = r['volume_pred']
            v_err = abs(v_gt - v_pred)
            v_err_pct = (v_err / v_gt * 100) if v_gt > 0 else 0
            volume_errors.append(v_err)
            volume_errors_pct.append(v_err_pct)

    metrics = {
        'total_samples': len(results),
        'successful_samples': len(weight_errors),
        'weight_mae': np.mean(weight_errors) if weight_errors else 0,
        'weight_mape': np.mean(weight_errors_pct) if weight_errors_pct else 0,
        'weight_median_error': np.median(weight_errors) if weight_errors else 0,
        'over_500g_count': len(over_500g_cases),
        'over_500g_ratio': len(over_500g_cases) / len(weight_errors) * 100 if weight_errors else 0,
        'over_500g_cases': over_500g_cases
    }

    if volume_errors:
        metrics['volume_mae'] = np.mean(volume_errors)
        metrics['volume_mape'] = np.mean(volume_errors_pct)

    return metrics


# ========================================
# 메인 평가 루프
# ========================================
def run_evaluation(num_samples=50, methods=['nongpt_gt_volume', 'gpt'], device="cuda"):
    """
    평가 실행

    methods: 평가할 방법들
        - 'nongpt': MASt3R + Image2Mass (시간 오래 걸림)
        - 'nongpt_gt_volume': Image2Mass with GT dimensions
        - 'gpt': GPT-4o-mini Vision
    """
    print("=" * 60)
    print("물류 무게/부피 예측 평가")
    print(f"샘플 수: {num_samples}")
    print(f"평가 방법: {methods}")
    print("=" * 60)

    # 데이터 수집 (Validation 우선, 부족하면 Training)
    data_root = "/home/2020112534/47.물류공간_예측_데이터"
    json_files = []

    for split in ["Validation", "Training"]:
        label_root = os.path.join(data_root, f"3.개방데이터/1.데이터/{split}/02.라벨링데이터/01_입고물품")
        files = glob(os.path.join(label_root, "**/*.json"), recursive=True)
        json_files.extend(files)
        if len(json_files) >= num_samples * 2:
            break

    # 품목별로 1개씩만 (같은 품목 중복 방지)
    product_samples = {}
    for jf in json_files:
        product_id = os.path.basename(os.path.dirname(jf))
        if product_id not in product_samples:
            product_samples[product_id] = jf

    sample_jsons = list(product_samples.values())
    random.shuffle(sample_jsons)
    sample_jsons = sample_jsons[:num_samples]

    print(f"\n총 {len(sample_jsons)}개 품목 평가")

    # 예측기 초기화
    predictors = {}
    if 'nongpt' in methods:
        print("\n[NonGPT] MASt3R + Image2Mass 초기화...")
        predictors['nongpt'] = NonGPTPredictor(device=device)

    if 'nongpt_gt_volume' in methods:
        print("\n[NonGPT+GT] Image2Mass with GT Volume 초기화...")
        predictors['nongpt_gt_volume'] = NonGPTWithGTVolumePredictor(device=device)

    if 'gpt' in methods:
        print("\n[GPT] GPT-4o-mini 초기화...")
        predictors['gpt'] = GPTPredictor()

    # 결과 저장
    all_results = {method: [] for method in methods}

    # 평가 루프
    for json_path in tqdm(sample_jsons, desc="평가 중"):
        sample = load_sample_data(json_path)

        if not os.path.exists(sample['image_path']):
            continue

        # 방법 1: NonGPT (MASt3R + Image2Mass)
        if 'nongpt' in methods:
            images = get_product_images(json_path)
            if len(images) >= 3:
                pred = predictors['nongpt'].predict(images[:6])
                result = {**sample, **pred}
                all_results['nongpt'].append(result)

        # 방법 2: NonGPT + GT Volume
        if 'nongpt_gt_volume' in methods:
            gt_dims = {
                'L': sample['length'],
                'W': sample['width'],
                'H': sample['height']
            }
            pred = predictors['nongpt_gt_volume'].predict(sample['image_path'], gt_dims)
            result = {**sample, **pred}
            all_results['nongpt_gt_volume'].append(result)

        # 방법 3: GPT
        if 'gpt' in methods:
            pred = predictors['gpt'].predict(sample['image_path'])
            result = {**sample, **pred}
            all_results['gpt'].append(result)

    # 결과 분석
    print("\n" + "=" * 60)
    print("평가 결과")
    print("=" * 60)

    report = {
        'timestamp': datetime.now().isoformat(),
        'num_samples': num_samples,
        'methods': {}
    }

    for method in methods:
        results = all_results[method]
        metrics = calculate_metrics(results)
        report['methods'][method] = metrics

        print(f"\n[{method.upper()}]")
        print(f"  성공 샘플: {metrics['successful_samples']}/{metrics['total_samples']}")
        print(f"  무게 MAE: {metrics['weight_mae']:.1f}g")
        print(f"  무게 MAPE: {metrics['weight_mape']:.1f}%")
        print(f"  무게 중간값 오차: {metrics['weight_median_error']:.1f}g")
        print(f"  500g+ 오차: {metrics['over_500g_count']}개 ({metrics['over_500g_ratio']:.1f}%)")

        if 'volume_mae' in metrics:
            print(f"  부피 MAE: {metrics['volume_mae']:.1f}cm³")
            print(f"  부피 MAPE: {metrics['volume_mape']:.1f}%")

    # 결과 저장 (numpy/torch 타입 변환)
    def convert_to_serializable(obj):
        if isinstance(obj, (np.floating, np.integer)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: convert_to_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_to_serializable(v) for v in obj]
        return obj

    report_path = f"evaluation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(convert_to_serializable(report), f, ensure_ascii=False, indent=2)

    print(f"\n결과 저장: {report_path}")

    return report, all_results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=50, help="평가할 샘플 수")
    parser.add_argument("--methods", nargs="+",
                        default=['nongpt_gt_volume', 'gpt'],
                        choices=['nongpt', 'nongpt_gt_volume', 'gpt'],
                        help="평가할 방법들")
    parser.add_argument("--device", default="cuda")

    args = parser.parse_args()

    report, results = run_evaluation(
        num_samples=args.samples,
        methods=args.methods,
        device=args.device
    )
