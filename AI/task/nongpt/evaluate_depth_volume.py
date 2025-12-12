"""
MASt3R Depth Map 기반 부피 예측 평가

MASt3R 3D 복원 → 포인트 클라우드 → 치수(L,W,H) 추출 → 부피 계산
Ground Truth 부피와 비교
"""

import os
import sys
import torch
import numpy as np
from glob import glob
from tqdm import tqdm
import json
from datetime import datetime

# 경로 설정
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MAST3R_PATH = os.path.join(SCRIPT_DIR, "mast3r")
if MAST3R_PATH not in sys.path:
    sys.path.insert(0, MAST3R_PATH)

os.chdir(SCRIPT_DIR)


class MASt3RVolumePredictor:
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

    def predict_volume(self, image_paths):
        """이미지들로부터 부피 예측"""
        try:
            # 이미지 로드
            imgs = self.load_images(image_paths, size=512, verbose=False)

            # Pair inference
            pairs = [(imgs[i], imgs[j]) for i in range(len(imgs)) for j in range(len(imgs)) if i != j]
            output = self.inference(pairs, self.model, self.device, batch_size=1, verbose=False)

            # Global alignment
            scene = self.global_aligner(
                output,
                device=self.device,
                mode=self.GlobalAlignerMode.ModularPointCloudOptimizer,
                verbose=False
            )
            scene.compute_global_alignment(init="mst", niter=300, schedule="cosine", lr=0.01)

            # 포인트 클라우드 추출
            pts3d = scene.get_pts3d()
            confs = scene.get_conf()

            # 포인트 합치기
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

            # L, W, H 정렬 (큰 순서)
            dims_sorted = sorted(dims, reverse=True)
            L, W, H = dims_sorted

            # 부피 계산 (MASt3R 단위는 임의 스케일이므로 cm로 가정)
            volume = L * W * H

            return {
                'success': True,
                'dims': {'L': L, 'W': W, 'H': H},
                'volume_pred': volume,
                'num_points': len(all_pts)
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}


def load_sample_data(json_path):
    """JSON 라벨에서 정답 데이터 로드"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    ann = data['annotations'][0]
    attrs = ann['attributes']

    return {
        'json_path': json_path,
        'product_name': attrs.get('product_name', 'Unknown'),
        'length_gt': attrs.get('length', 0),  # cm
        'width_gt': attrs.get('width', 0),    # cm
        'height_gt': attrs.get('height', 0),  # cm
        'volume_gt': attrs.get('length', 0) * attrs.get('width', 0) * attrs.get('height', 0)
    }


def get_product_images(json_path):
    """같은 품목의 모든 이미지 경로 반환"""
    product_dir = os.path.dirname(json_path)
    product_dir = product_dir.replace("02.라벨링데이터", "01.원천데이터")
    images = sorted(glob(os.path.join(product_dir, "*.jpg")))
    return images


def run_evaluation(num_samples=100, device="cuda"):
    print("=" * 60)
    print("MASt3R Depth Map 기반 부피 예측 평가")
    print(f"샘플 수: {num_samples}")
    print("=" * 60)

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
    random.seed(42)  # 동일한 샘플 사용
    random.shuffle(sample_jsons)
    sample_jsons = sample_jsons[:num_samples]

    print(f"\n총 {len(sample_jsons)}개 품목 평가")

    # 예측기 초기화
    predictor = MASt3RVolumePredictor(device=device)

    # 결과 저장
    results = []
    volume_errors = []
    volume_errors_pct = []
    dim_errors = {'L': [], 'W': [], 'H': []}

    # 평가 루프
    for json_path in tqdm(sample_jsons, desc="평가 중"):
        sample = load_sample_data(json_path)
        images = get_product_images(json_path)

        if len(images) < 3:
            continue

        pred = predictor.predict_volume(images[:6])

        if not pred['success']:
            results.append({**sample, 'success': False, 'error': pred.get('error', 'Unknown')})
            continue

        # 결과 저장
        result = {
            **sample,
            'success': True,
            'volume_pred': pred['volume_pred'],
            'dims_pred': pred['dims'],
            'num_points': pred['num_points']
        }
        results.append(result)

        # 오차 계산
        v_gt = sample['volume_gt']
        v_pred = pred['volume_pred']

        if v_gt > 0:
            v_err = abs(v_gt - v_pred)
            v_err_pct = (v_err / v_gt) * 100
            volume_errors.append(v_err)
            volume_errors_pct.append(v_err_pct)

        # 치수별 오차 (정렬된 순서로 비교)
        gt_dims = sorted([sample['length_gt'], sample['width_gt'], sample['height_gt']], reverse=True)
        pred_dims = [pred['dims']['L'], pred['dims']['W'], pred['dims']['H']]

        for i, (gt, pr, key) in enumerate(zip(gt_dims, pred_dims, ['L', 'W', 'H'])):
            if gt > 0:
                dim_errors[key].append(abs(gt - pr) / gt * 100)

    # 결과 출력
    print("\n" + "=" * 60)
    print("평가 결과")
    print("=" * 60)

    successful = len(volume_errors)
    print(f"\n성공 샘플: {successful}/{len(results)}")

    if volume_errors:
        print(f"\n[부피 예측 성능]")
        print(f"  MAE: {np.mean(volume_errors):.1f} cm³")
        print(f"  MAPE: {np.mean(volume_errors_pct):.1f}%")
        print(f"  Median Error: {np.median(volume_errors):.1f} cm³")
        print(f"  Median Error %: {np.median(volume_errors_pct):.1f}%")

        print(f"\n[치수별 MAPE]")
        for key in ['L', 'W', 'H']:
            if dim_errors[key]:
                print(f"  {key}: {np.mean(dim_errors[key]):.1f}%")

        # 오차 분포
        print(f"\n[오차 분포]")
        thresholds = [50, 100, 200, 500]
        for th in thresholds:
            count = sum(1 for e in volume_errors_pct if e <= th)
            print(f"  {th}% 이내: {count}개 ({count/len(volume_errors_pct)*100:.1f}%)")

    # 결과 저장
    report = {
        'timestamp': datetime.now().isoformat(),
        'num_samples': num_samples,
        'successful_samples': successful,
        'volume_mae': float(np.mean(volume_errors)) if volume_errors else 0,
        'volume_mape': float(np.mean(volume_errors_pct)) if volume_errors_pct else 0,
        'volume_median_error': float(np.median(volume_errors)) if volume_errors else 0,
        'volume_median_error_pct': float(np.median(volume_errors_pct)) if volume_errors_pct else 0,
        'dim_mape': {k: float(np.mean(v)) if v else 0 for k, v in dim_errors.items()},
        'detailed_results': results[:20]  # 처음 20개만 저장
    }

    report_path = f"depth_volume_evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

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

    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(convert_to_serializable(report), f, ensure_ascii=False, indent=2)

    print(f"\n결과 저장: {report_path}")

    return report, results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=100)
    parser.add_argument("--device", default="cuda")
    args = parser.parse_args()

    run_evaluation(num_samples=args.samples, device=args.device)
