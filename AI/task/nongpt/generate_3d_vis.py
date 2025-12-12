"""MASt3R 3D 포인트 클라우드 및 Depth Map 시각화"""

import os
import sys
import torch
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import json
from glob import glob

# 경로 설정
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MAST3R_PATH = os.path.join(SCRIPT_DIR, "mast3r")
if MAST3R_PATH not in sys.path:
    sys.path.insert(0, MAST3R_PATH)

os.chdir(SCRIPT_DIR)

OUTPUT_DIR = os.path.join(SCRIPT_DIR, "report_images")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def main():
    from mast3r.model import AsymmetricMASt3R
    from dust3r.inference import inference
    from dust3r.utils.image import load_images
    from dust3r.cloud_opt import global_aligner, GlobalAlignerMode

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # 샘플 이미지 찾기
    data_root = "/home/2020112534/47.물류공간_예측_데이터"
    label_root = os.path.join(data_root, "3.개방데이터/1.데이터/Validation/02.라벨링데이터/01_입고물품")
    json_files = glob(os.path.join(label_root, "**/*.json"), recursive=True)

    images = None
    product_name = None
    for jf in json_files[:10]:
        product_dir = os.path.dirname(jf).replace("02.라벨링데이터", "01.원천데이터")
        imgs = sorted(glob(os.path.join(product_dir, "*.jpg")))
        if len(imgs) >= 6:
            images = imgs[:6]
            with open(jf, 'r', encoding='utf-8') as f:
                data = json.load(f)
            product_name = data['annotations'][0]['attributes'].get('product_name', 'Unknown')
            break

    if images is None:
        print("No sample found")
        return

    print(f"Sample: {product_name}")
    print(f"Images: {len(images)}")

    # MASt3R 모델 로드
    print("\nLoading MASt3R model...")
    model_name = "naver/MASt3R_ViTLarge_BaseDecoder_512_catmlpdpt_metric"
    model = AsymmetricMASt3R.from_pretrained(model_name).to(device)

    # 이미지 로드
    print("Loading images...")
    imgs = load_images(images, size=512, verbose=False)

    # Pair inference
    print("Running pair inference...")
    pairs = [(imgs[i], imgs[j]) for i in range(len(imgs)) for j in range(len(imgs)) if i != j]
    output = inference(pairs, model, device, batch_size=1, verbose=False)

    # Global alignment
    print("Global alignment...")
    scene = global_aligner(output, device=device, mode=GlobalAlignerMode.ModularPointCloudOptimizer, verbose=False)
    scene.compute_global_alignment(init="mst", niter=300, schedule="cosine", lr=0.01)

    # 데이터 추출
    pts3d = scene.get_pts3d()
    depths = scene.get_depthmaps()
    confs = scene.get_conf()

    # 포인트 클라우드 합치기
    print("Extracting point cloud...")
    all_pts = []
    all_colors = []

    for i, (pts, conf, img) in enumerate(zip(pts3d, confs, imgs)):
        pts_np = pts.detach().cpu().numpy()
        conf_np = conf.detach().cpu().numpy()

        threshold = max(0.1, np.percentile(conf_np, 50))
        mask = conf_np > threshold
        valid_pts = pts_np[mask]

        img_np = img['img'].squeeze().permute(1, 2, 0).cpu().numpy()
        img_np = (img_np * 0.5 + 0.5).clip(0, 1)
        h, w = conf_np.shape
        img_resized = np.array(Image.fromarray((img_np * 255).astype(np.uint8)).resize((w, h))) / 255.0
        colors = img_resized.reshape(-1, 3)[mask.flatten()]

        all_pts.append(valid_pts.reshape(-1, 3))
        all_colors.append(colors)

    all_pts = np.concatenate(all_pts, axis=0)
    all_colors = np.concatenate(all_colors, axis=0)

    print(f"Total points: {len(all_pts)}")

    # 3D 포인트 클라우드 시각화
    print("Generating 3D point cloud visualization...")
    fig = plt.figure(figsize=(15, 5))
    subsample = np.random.choice(len(all_pts), min(10000, len(all_pts)), replace=False)

    ax1 = fig.add_subplot(131, projection='3d')
    ax1.scatter(all_pts[subsample, 0], all_pts[subsample, 1], all_pts[subsample, 2],
                c=all_colors[subsample], s=1)
    ax1.set_title('3D Point Cloud (Front View)')
    ax1.view_init(elev=20, azim=45)

    ax2 = fig.add_subplot(132, projection='3d')
    ax2.scatter(all_pts[subsample, 0], all_pts[subsample, 1], all_pts[subsample, 2],
                c=all_colors[subsample], s=1)
    ax2.set_title('3D Point Cloud (Top View)')
    ax2.view_init(elev=90, azim=0)

    ax3 = fig.add_subplot(133, projection='3d')
    ax3.scatter(all_pts[subsample, 0], all_pts[subsample, 1], all_pts[subsample, 2],
                c=all_colors[subsample], s=1)
    ax3.set_title('3D Point Cloud (Side View)')
    ax3.view_init(elev=0, azim=90)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '2_3d_pointcloud.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("Saved: 2_3d_pointcloud.png")

    # Depth Map 시각화
    print("Generating depth map visualization...")
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    fig.suptitle('Depth Maps (MASt3R)', fontsize=14)

    for idx, (ax, depth) in enumerate(zip(axes.flat, depths[:6])):
        depth_np = depth.detach().cpu().numpy()
        im = ax.imshow(depth_np, cmap='viridis')
        ax.set_title(f'View {idx+1}')
        ax.axis('off')
        plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '3_depth_maps.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("Saved: 3_depth_maps.png")

    print("\nDone!")


if __name__ == "__main__":
    main()
