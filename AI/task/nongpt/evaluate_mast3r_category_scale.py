"""
MASt3R + 카테고리 기반 스케일 보정 평가

방법:
1. GPT로 이미지의 카테고리 예측
2. 카테고리별 평균 부피 조회
3. MASt3R로 상대적 3D 구조 복원 (비율만 사용)
4. 카테고리 평균 부피로 스케일 보정
5. 보정된 치수로 Image2Mass 무게 예측

비교 대상:
- MASt3R 원본 (스케일 보정 없음)
- MASt3R + 카테고리 스케일 보정
- GT Volume (정답 치수)
"""

import os
import sys
import torch
import numpy as np
from glob import glob
from tqdm import tqdm
import json
from datetime import datetime
import base64

# 경로 설정
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MAST3R_PATH = os.path.join(SCRIPT_DIR, "mast3r")
GPT_PATH = "/home/2020112534/task/gpt"

if MAST3R_PATH not in sys.path:
    sys.path.insert(0, MAST3R_PATH)
if GPT_PATH not in sys.path:
    sys.path.insert(0, GPT_PATH)

os.chdir(SCRIPT_DIR)

from openai import OpenAI
from config import OPENAI_API_KEY


# 카테고리별 평균 부피 (물류 데이터 기반)
# 물류공간 예측 데이터의 11개 대분류별 평균 부피 (cm³)
CATEGORY_AVG_VOLUME = {
    "01_가공식품": 5000,      # 음료, 식품 등
    "02_유제품": 3000,        # 우유, 치즈 등
    "03_일상용품": 8000,      # 생활용품
    "04_자동차용품": 15000,   # 자동차 부품
    "05_의약품/의료기기": 2000,  # 약품
    "06_교육/문화용품": 3000,   # 책, 문구
    "07_디지털/가전": 25000,   # 가전제품
    "08_가구/인테리어": 50000,  # 가구
    "09_의류": 5000,          # 옷
    "10_전문스포츠/레저": 10000, # 스포츠용품
    "11_패션잡화": 3000,      # 가방, 액세서리
    "default": 8000           # 기본값
}

# 카테고리별 평균 무게 (g)
CATEGORY_AVG_WEIGHT = {
    "01_가공식품": 800,
    "02_유제품": 500,
    "03_일상용품": 1200,
    "04_자동차용품": 3000,
    "05_의약품/의료기기": 200,
    "06_교육/문화용품": 500,
    "07_디지털/가전": 5000,
    "08_가구/인테리어": 10000,
    "09_의류": 400,
    "10_전문스포츠/레저": 2000,
    "11_패션잡화": 300,
    "default": 1000
}


class GPTCategoryPredictor:
    """GPT를 이용한 카테고리 예측"""

    def __init__(self):
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.categories = list(CATEGORY_AVG_VOLUME.keys())[:-1]  # default 제외

    def encode_image(self, image_path):
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode('utf-8')

    def predict_category(self, image_path):
        """이미지에서 카테고리 예측"""
        try:
            base64_image = self.encode_image(image_path)

            category_list = "\n".join([f"- {cat}" for cat in self.categories])

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a logistics analyst. Classify products into categories."
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"""이 제품 이미지를 다음 카테고리 중 하나로 분류하세요:

{category_list}

JSON 형식으로만 응답하세요:
{{"카테고리": "선택한_카테고리"}}"""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "low"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=100,
                temperature=0.1
            )

            result_text = response.choices[0].message.content.strip()

            # JSON 파싱
            if "```" in result_text:
                start = result_text.find("{")
                end = result_text.rfind("}") + 1
                result_text = result_text[start:end]

            result = json.loads(result_text)
            category = result.get("카테고리", "default")

            # 유효한 카테고리인지 확인
            if category not in CATEGORY_AVG_VOLUME:
                category = "default"

            return {"success": True, "category": category}

        except Exception as e:
            return {"success": False, "error": str(e), "category": "default"}


class MASt3RWithCategoryScale:
    """MASt3R + 카테고리 기반 스케일 보정"""

    def __init__(self, device="cuda"):
        from mast3r.model import AsymmetricMASt3R
        from dust3r.utils.image import load_images
        from dust3r.inference import inference
        from dust3r.cloud_opt import global_aligner, GlobalAlignerMode

        self.device = device
        self.load_images = load_images
        self.inference = inference
        self.global_aligner = global_aligner
        self.GlobalAlignerMode = GlobalAlignerMode

        print("Loading MASt3R model...")
        model_name = "naver/MASt3R_ViTLarge_BaseDecoder_512_catmlpdpt_metric"
        self.model = AsymmetricMASt3R.from_pretrained(model_name).to(device)
        print("MASt3R model loaded!")

    def get_relative_dims(self, image_paths):
        """MASt3R로 상대적 치수 비율 추출"""
        try:
            imgs = self.load_images(image_paths, size=512, verbose=False)
            pairs = [(imgs[i], imgs[j]) for i in range(len(imgs)) for j in range(len(imgs)) if i != j]
            output = self.inference(pairs, self.model, self.device, batch_size=1, verbose=False)

            scene = self.global_aligner(
                output,
                device=self.device,
                mode=self.GlobalAlignerMode.ModularPointCloudOptimizer,
                verbose=False
            )
            scene.compute_global_alignment(init="mst", niter=300, schedule="cosine", lr=0.01)

            pts3d = scene.get_pts3d()
            confs = scene.get_conf()

            all_pts = []
            for pts, conf in zip(pts3d, confs):
                pts_np = pts.detach().cpu().numpy()
                conf_np = conf.detach().cpu().numpy()
                threshold = max(0.1, np.percentile(conf_np, 50))
                mask = conf_np > threshold
                valid_pts = pts_np[mask].reshape(-1, 3)
                all_pts.append(valid_pts)

            all_pts = np.concatenate(all_pts, axis=0)

            if len(all_pts) < 100:
                return {'success': False, 'error': 'Too few points'}

            # 치수 추출 (5-95 percentile)
            p5 = np.percentile(all_pts, 5, axis=0)
            p95 = np.percentile(all_pts, 95, axis=0)
            dims = p95 - p5

            # 크기 순 정렬
            dims_sorted = sorted(dims, reverse=True)
            L, W, H = dims_sorted

            # 비율 계산 (가장 긴 변 기준)
            max_dim = max(L, W, H)
            ratio_L = L / max_dim
            ratio_W = W / max_dim
            ratio_H = H / max_dim

            return {
                'success': True,
                'raw_dims': {'L': L, 'W': W, 'H': H},
                'ratios': {'L': ratio_L, 'W': ratio_W, 'H': ratio_H},
                'raw_volume': L * W * H,
                'num_points': len(all_pts)
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def scale_by_category(self, relative_result, category):
        """카테고리 평균 부피로 스케일 보정"""
        if not relative_result['success']:
            return relative_result

        # 카테고리 평균 부피 조회
        avg_volume = CATEGORY_AVG_VOLUME.get(category, CATEGORY_AVG_VOLUME['default'])

        # 현재 상대 부피
        raw_volume = relative_result['raw_volume']

        # 스케일 팩터 계산 (부피 비율의 세제곱근)
        scale_factor = (avg_volume / raw_volume) ** (1/3) if raw_volume > 0 else 1.0

        # 비율 유지하며 스케일 조정
        ratios = relative_result['ratios']

        # 가장 긴 변의 실제 크기 계산
        # avg_volume = L * W * H = (max_L * ratio_L) * (max_L * ratio_W) * (max_L * ratio_H)
        # avg_volume = max_L^3 * ratio_L * ratio_W * ratio_H
        ratio_product = ratios['L'] * ratios['W'] * ratios['H']
        max_L = (avg_volume / ratio_product) ** (1/3) if ratio_product > 0 else 10.0

        scaled_L = max_L * ratios['L']
        scaled_W = max_L * ratios['W']
        scaled_H = max_L * ratios['H']

        return {
            'success': True,
            'scaled_dims': {'L': scaled_L, 'W': scaled_W, 'H': scaled_H},
            'scaled_volume': scaled_L * scaled_W * scaled_H,
            'scale_factor': scale_factor,
            'category': category,
            'category_avg_volume': avg_volume,
            'raw_dims': relative_result['raw_dims'],
            'raw_volume': raw_volume
        }


class Image2MassPredictor:
    """Image2Mass 무게 예측기"""

    def __init__(self, device="cuda"):
        from image2mass_model import Image2MassModel
        from torchvision import transforms
        from PIL import Image

        self.device = device
        self.Image = Image

        self.transform = transforms.Compose([
            transforms.Resize((299, 299)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

        sim_lut = torch.load("sim_lut.pt", map_location=device)
        self.model = Image2MassModel(sim_lut=sim_lut, backbone_name="xception", pretrained=False)
        state_dict = torch.load("image2mass_best.pth", map_location=device)
        self.model.load_state_dict(state_dict)
        self.model.to(device)
        self.model.eval()
        print("Image2Mass model loaded!")

    def predict(self, image_path, dims):
        """무게 예측"""
        image = self.Image.open(image_path).convert("RGB")
        image_tensor = self.transform(image).unsqueeze(0).to(self.device)

        L, W, H = dims['L'], dims['W'], dims['H']
        dims_tensor = torch.tensor([[L, W, H]], dtype=torch.float32).to(self.device)

        with torch.no_grad():
            mass_pred, aux = self.model(image_tensor, dims_tensor)

        return {
            'mass': mass_pred.item(),
            'volume': aux['volume'].item(),
            'density': aux['density'].item()
        }


def load_sample_data(json_path):
    """JSON 라벨에서 정답 데이터 로드"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    ann = data['annotations'][0]
    attrs = ann['attributes']

    # 카테고리 추출
    category_code = os.path.basename(os.path.dirname(json_path)).split('_')[0][:2]
    category_map = {
        '01': '01_가공식품',
        '02': '02_유제품',
        '03': '03_일상용품',
        '04': '04_자동차용품',
        '05': '05_의약품/의료기기',
        '06': '06_교육/문화용품',
        '07': '07_디지털/가전',
        '08': '08_가구/인테리어',
        '09': '09_의류',
        '10': '10_전문스포츠/레저',
        '11': '11_패션잡화'
    }
    gt_category = category_map.get(category_code, 'default')

    return {
        'json_path': json_path,
        'product_name': attrs.get('product_name', 'Unknown'),
        'length_gt': attrs.get('length', 0),
        'width_gt': attrs.get('width', 0),
        'height_gt': attrs.get('height', 0),
        'volume_gt': attrs.get('length', 0) * attrs.get('width', 0) * attrs.get('height', 0),
        'weight_gt': attrs.get('weight', 0) * 1000,  # kg -> g
        'gt_category': gt_category
    }


def get_product_images(json_path):
    """같은 품목의 모든 이미지 경로 반환"""
    product_dir = os.path.dirname(json_path)
    product_dir = product_dir.replace("02.라벨링데이터", "01.원천데이터")
    images = sorted(glob(os.path.join(product_dir, "*.jpg")))
    return images


def run_evaluation(num_samples=50, device="cuda"):
    print("=" * 70)
    print("MASt3R + 카테고리 기반 스케일 보정 평가")
    print("=" * 70)

    # 데이터 수집
    data_root = "/home/2020112534/47.물류공간_예측_데이터"
    json_files = []

    for split in ["Validation", "Training"]:
        label_root = os.path.join(data_root, f"3.개방데이터/1.데이터/{split}/02.라벨링데이터/01_입고물품")
        files = glob(os.path.join(label_root, "**/*.json"), recursive=True)
        json_files.extend(files)
        if len(json_files) >= num_samples * 2:
            break

    # 품목별로 1개씩만
    product_samples = {}
    for jf in json_files:
        product_id = os.path.basename(os.path.dirname(jf))
        if product_id not in product_samples:
            product_samples[product_id] = jf

    import random
    sample_jsons = list(product_samples.values())
    random.seed(42)
    random.shuffle(sample_jsons)
    sample_jsons = sample_jsons[:num_samples]

    print(f"\n총 {len(sample_jsons)}개 품목 평가")

    # 모델 초기화
    print("\n모델 로딩 중...")
    gpt_predictor = GPTCategoryPredictor()
    mast3r = MASt3RWithCategoryScale(device=device)
    image2mass = Image2MassPredictor(device=device)

    # 결과 저장
    results = {
        'mast3r_raw': {'weight_errors': [], 'volume_errors': []},
        'mast3r_category_scale': {'weight_errors': [], 'volume_errors': []},
        'gt_volume': {'weight_errors': []},
        'category_match': []
    }

    detailed_results = []

    print("\n평가 진행 중...")
    for json_path in tqdm(sample_jsons, desc="Evaluating"):
        sample = load_sample_data(json_path)
        images = get_product_images(json_path)

        if len(images) < 3:
            continue

        if sample['weight_gt'] <= 0 or sample['volume_gt'] <= 0:
            continue

        # 1. GPT 카테고리 예측
        gpt_result = gpt_predictor.predict_category(images[0])
        predicted_category = gpt_result.get('category', 'default')
        category_match = (predicted_category == sample['gt_category'])
        results['category_match'].append(category_match)

        # 2. MASt3R 상대 치수 추출
        relative_result = mast3r.get_relative_dims(images[:6])

        if not relative_result['success']:
            continue

        # 3. 카테고리 스케일 보정
        scaled_result = mast3r.scale_by_category(relative_result, predicted_category)

        # 4. 무게 예측 비교

        # 4-1. MASt3R Raw (스케일 보정 없음) - cm 단위 가정
        raw_dims = relative_result['raw_dims']
        raw_mass = image2mass.predict(images[0], raw_dims)

        # 4-2. MASt3R + Category Scale
        scaled_dims = scaled_result['scaled_dims']
        scaled_mass = image2mass.predict(images[0], scaled_dims)

        # 4-3. GT Volume
        gt_dims = {
            'L': sample['length_gt'],
            'W': sample['width_gt'],
            'H': sample['height_gt']
        }
        gt_mass = image2mass.predict(images[0], gt_dims)

        # 오차 계산
        gt_weight = sample['weight_gt']
        gt_volume = sample['volume_gt']

        # MASt3R Raw
        raw_weight_err = abs(raw_mass['mass'] - gt_weight) / gt_weight * 100
        raw_volume_err = abs(relative_result['raw_volume'] - gt_volume) / gt_volume * 100
        results['mast3r_raw']['weight_errors'].append(raw_weight_err)
        results['mast3r_raw']['volume_errors'].append(raw_volume_err)

        # MASt3R + Category Scale
        scaled_weight_err = abs(scaled_mass['mass'] - gt_weight) / gt_weight * 100
        scaled_volume_err = abs(scaled_result['scaled_volume'] - gt_volume) / gt_volume * 100
        results['mast3r_category_scale']['weight_errors'].append(scaled_weight_err)
        results['mast3r_category_scale']['volume_errors'].append(scaled_volume_err)

        # GT Volume
        gt_weight_err = abs(gt_mass['mass'] - gt_weight) / gt_weight * 100
        results['gt_volume']['weight_errors'].append(gt_weight_err)

        detailed_results.append({
            'product': sample['product_name'],
            'gt_weight': gt_weight,
            'gt_volume': gt_volume,
            'gt_category': sample['gt_category'],
            'pred_category': predicted_category,
            'category_match': category_match,
            'raw_weight_pred': raw_mass['mass'],
            'raw_volume_pred': relative_result['raw_volume'],
            'scaled_weight_pred': scaled_mass['mass'],
            'scaled_volume_pred': scaled_result['scaled_volume'],
            'gt_volume_weight_pred': gt_mass['mass'],
            'raw_weight_err': raw_weight_err,
            'scaled_weight_err': scaled_weight_err,
            'gt_weight_err': gt_weight_err
        })

    # 결과 출력
    print("\n" + "=" * 70)
    print("평가 결과")
    print("=" * 70)

    n_samples = len(results['mast3r_raw']['weight_errors'])
    print(f"\n성공 샘플: {n_samples}개")

    # 카테고리 분류 정확도
    cat_acc = sum(results['category_match']) / len(results['category_match']) * 100 if results['category_match'] else 0
    print(f"\n[카테고리 분류 정확도]")
    print(f"  GPT 분류: {cat_acc:.1f}%")

    # 무게 예측 비교
    print(f"\n[무게 예측 성능 (MAPE)]")
    print("-" * 60)
    print(f"{'방법':<35} {'MAPE':>10} {'Median':>10}")
    print("-" * 60)

    for method, label in [
        ('mast3r_raw', 'MASt3R Raw (스케일 보정 없음)'),
        ('mast3r_category_scale', 'MASt3R + 카테고리 스케일 보정'),
        ('gt_volume', 'GT Volume (정답 치수)')
    ]:
        errs = results[method]['weight_errors']
        if errs:
            mape = np.mean(errs)
            median = np.median(errs)
            print(f"{label:<35} {mape:>9.1f}% {median:>9.1f}%")

    # 부피 예측 비교
    print(f"\n[부피 예측 성능 (MAPE)]")
    print("-" * 60)
    print(f"{'방법':<35} {'MAPE':>10} {'Median':>10}")
    print("-" * 60)

    for method, label in [
        ('mast3r_raw', 'MASt3R Raw'),
        ('mast3r_category_scale', 'MASt3R + 카테고리 스케일')
    ]:
        errs = results[method]['volume_errors']
        if errs:
            mape = np.mean(errs)
            median = np.median(errs)
            print(f"{label:<35} {mape:>9.1f}% {median:>9.1f}%")

    # 개선율 계산
    if results['mast3r_raw']['weight_errors'] and results['mast3r_category_scale']['weight_errors']:
        raw_mape = np.mean(results['mast3r_raw']['weight_errors'])
        scaled_mape = np.mean(results['mast3r_category_scale']['weight_errors'])
        improvement = (raw_mape - scaled_mape) / raw_mape * 100
        print(f"\n[개선율]")
        print(f"  무게 예측: {improvement:+.1f}% (카테고리 스케일 보정 vs Raw)")

    # 결과 저장
    report = {
        'timestamp': datetime.now().isoformat(),
        'num_samples': n_samples,
        'category_accuracy': cat_acc,
        'weight_mape': {
            'mast3r_raw': float(np.mean(results['mast3r_raw']['weight_errors'])) if results['mast3r_raw']['weight_errors'] else 0,
            'mast3r_category_scale': float(np.mean(results['mast3r_category_scale']['weight_errors'])) if results['mast3r_category_scale']['weight_errors'] else 0,
            'gt_volume': float(np.mean(results['gt_volume']['weight_errors'])) if results['gt_volume']['weight_errors'] else 0
        },
        'volume_mape': {
            'mast3r_raw': float(np.mean(results['mast3r_raw']['volume_errors'])) if results['mast3r_raw']['volume_errors'] else 0,
            'mast3r_category_scale': float(np.mean(results['mast3r_category_scale']['volume_errors'])) if results['mast3r_category_scale']['volume_errors'] else 0
        },
        'detailed_results': detailed_results[:20]
    }

    report_path = f"mast3r_category_scale_evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n결과 저장: {report_path}")

    return report


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=50)
    parser.add_argument("--device", default="cuda")
    args = parser.parse_args()

    run_evaluation(num_samples=args.samples, device=args.device)
