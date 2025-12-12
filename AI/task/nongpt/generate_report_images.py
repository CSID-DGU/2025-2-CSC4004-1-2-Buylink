"""
보고서용 시각화 이미지 생성 스크립트

1. 원본 이미지 (여러 각도)
2. MASt3R 3D 포인트 클라우드
3. Depth Map
4. Image2Mass thickness mask (세그멘테이션)
"""

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

# 한글 폰트 설정
plt.rcParams['font.family'] = 'DejaVu Sans'


def find_sample_product():
    """샘플 제품 찾기"""
    data_root = "/home/2020112534/47.물류공간_예측_데이터"
    label_root = os.path.join(data_root, "3.개방데이터/1.데이터/Validation/02.라벨링데이터/01_입고물품")

    json_files = glob(os.path.join(label_root, "**/*.json"), recursive=True)

    for jf in json_files[:10]:
        product_dir = os.path.dirname(jf).replace("02.라벨링데이터", "01.원천데이터")
        images = sorted(glob(os.path.join(product_dir, "*.jpg")))
        if len(images) >= 6:
            with open(jf, 'r', encoding='utf-8') as f:
                data = json.load(f)
            product_name = data['annotations'][0]['attributes'].get('product_name', 'Unknown')
            return images, jf, product_name

    return None, None, None


def save_original_images(images, product_name):
    """원본 이미지들 저장"""
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    fig.suptitle(f'Original Images (6 Views)\n{product_name}', fontsize=14)

    for idx, (ax, img_path) in enumerate(zip(axes.flat, images[:6])):
        img = Image.open(img_path)
        ax.imshow(img)
        ax.set_title(f'View {idx+1}')
        ax.axis('off')

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '1_original_images.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Saved: 1_original_images.png")


def generate_mast3r_visualization(images):
    """MASt3R 3D 복원 및 시각화 - 기존 파이프라인 활용"""
    from mast3r_image2mass_inference import MASt3RImage2MassPipeline

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # 파이프라인 초기화
    pipeline = MASt3RImage2MassPipeline(
        model_path="image2mass_best.pth",
        sim_lut_path="sim_lut.pt",
        device=device
    )

    # 3D 복원
    print("Running MASt3R 3D reconstruction...")
    imgs = pipeline.load_images(images[:6], size=512)

    # Pair inference
    pairs = pipeline.get_pairs(len(imgs))
    output = pipeline.inference(pairs, imgs)

    # Global alignment
    scene = pipeline.global_align(output)

    # 포인트 클라우드 추출
    pts3d = scene.get_pts3d()
    depths = scene.get_depthmaps()
    confs = scene.get_conf()

    # 포인트 클라우드 합치기
    all_pts = []
    all_colors = []

    for i, (pts, conf, img) in enumerate(zip(pts3d, confs, imgs)):
        pts_np = pts.detach().cpu().numpy()
        conf_np = conf.detach().cpu().numpy()

        # confidence threshold
        threshold = max(0.1, np.percentile(conf_np, 50))
        mask = conf_np > threshold
        valid_pts = pts_np[mask]

        # 색상
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
    fig = plt.figure(figsize=(15, 5))

    subsample = np.random.choice(len(all_pts), min(10000, len(all_pts)), replace=False)

    # 뷰 1: 정면
    ax1 = fig.add_subplot(131, projection='3d')
    ax1.scatter(all_pts[subsample, 0], all_pts[subsample, 1], all_pts[subsample, 2],
                c=all_colors[subsample], s=1)
    ax1.set_title('3D Point Cloud (Front View)')
    ax1.view_init(elev=20, azim=45)

    # 뷰 2: 위
    ax2 = fig.add_subplot(132, projection='3d')
    ax2.scatter(all_pts[subsample, 0], all_pts[subsample, 1], all_pts[subsample, 2],
                c=all_colors[subsample], s=1)
    ax2.set_title('3D Point Cloud (Top View)')
    ax2.view_init(elev=90, azim=0)

    # 뷰 3: 측면
    ax3 = fig.add_subplot(133, projection='3d')
    ax3.scatter(all_pts[subsample, 0], all_pts[subsample, 1], all_pts[subsample, 2],
                c=all_colors[subsample], s=1)
    ax3.set_title('3D Point Cloud (Side View)')
    ax3.view_init(elev=0, azim=90)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '2_3d_pointcloud.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Saved: 2_3d_pointcloud.png")

    # Depth Map 시각화
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
    print(f"Saved: 3_depth_maps.png")

    return all_pts, depths


def generate_image2mass_visualization(image_path):
    """Image2Mass thickness mask (세그멘테이션) 시각화"""
    from image2mass_model import Image2MassModel
    from torchvision import transforms

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # 모델 로드
    sim_lut = torch.load("sim_lut.pt", map_location=device)
    model = Image2MassModel(sim_lut=sim_lut)
    state_dict = torch.load("image2mass_best.pth", map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    # 이미지 전처리
    transform = transforms.Compose([
        transforms.Resize((299, 299)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    img = Image.open(image_path).convert('RGB')
    img_tensor = transform(img).unsqueeze(0).to(device)

    # 더미 치수
    dims = torch.tensor([[30.0, 20.0, 15.0]]).to(device)

    with torch.no_grad():
        mass_pred, aux = model(img_tensor, dims)

    # thickness mask 추출
    thickness_mask = aux.get('thickness_mask')
    if thickness_mask is not None:
        thickness_np = thickness_mask.squeeze().cpu().numpy()
    else:
        thickness_np = None

    # 시각화
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    # 원본 이미지
    axes[0].imshow(img)
    axes[0].set_title('Original Image')
    axes[0].axis('off')

    # Thickness Mask
    if thickness_np is not None:
        im = axes[1].imshow(thickness_np, cmap='hot')
        axes[1].set_title('Thickness Mask (Geometry Module)')
        axes[1].axis('off')
        plt.colorbar(im, ax=axes[1], fraction=0.046, pad=0.04)
    else:
        axes[1].text(0.5, 0.5, 'Not Available', ha='center', va='center')
        axes[1].set_title('Thickness Mask')
        axes[1].axis('off')

    # Overlay
    if thickness_np is not None:
        img_resized = img.resize((thickness_np.shape[1], thickness_np.shape[0]))
        axes[2].imshow(img_resized)
        axes[2].imshow(thickness_np, cmap='hot', alpha=0.5)
    else:
        axes[2].imshow(img)
    axes[2].set_title('Overlay')
    axes[2].axis('off')

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '4_thickness_mask.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Saved: 4_thickness_mask.png")


def generate_comparison_figure():
    """방법 비교 시각화"""
    methods = ['NonGPT\n(MASt3R)', 'NonGPT\n+ GT Volume', 'GPT-4o']

    # 100개 샘플 결과
    mae = [1090.9, 470.8, 558.5]
    mape = [136.7, 56.0, 53.5]
    over_500g = [36.0, 12.0, 16.0]

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    colors = ['#ff6b6b', '#4ecdc4', '#45b7d1']

    # MAE
    bars1 = axes[0].bar(methods, mae, color=colors)
    axes[0].set_ylabel('Weight MAE (g)')
    axes[0].set_title('Weight MAE Comparison')
    for bar, val in zip(bars1, mae):
        axes[0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 20,
                     f'{val:.1f}g', ha='center', va='bottom', fontsize=10)

    # MAPE
    bars2 = axes[1].bar(methods, mape, color=colors)
    axes[1].set_ylabel('Weight MAPE (%)')
    axes[1].set_title('Weight MAPE Comparison')
    for bar, val in zip(bars2, mape):
        axes[1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 2,
                     f'{val:.1f}%', ha='center', va='bottom', fontsize=10)

    # 500g+ 오차 비율
    bars3 = axes[2].bar(methods, over_500g, color=colors)
    axes[2].set_ylabel('500g+ Error Ratio (%)')
    axes[2].set_title('500g+ Error Ratio Comparison')
    axes[2].axhline(y=20, color='red', linestyle='--', alpha=0.5, label='20% threshold')
    for bar, val in zip(bars3, over_500g):
        axes[2].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                     f'{val:.1f}%', ha='center', va='bottom', fontsize=10)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '5_method_comparison.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Saved: 5_method_comparison.png")


def generate_pipeline_diagram():
    """파이프라인 다이어그램"""
    fig, ax = plt.subplots(figsize=(16, 8))
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 8)
    ax.axis('off')

    # 색상
    colors = {
        'input': '#e3f2fd',
        'process': '#fff3e0',
        'model': '#f3e5f5',
        'output': '#e8f5e9'
    }

    def draw_box(x, y, w, h, text, color, fontsize=10):
        rect = plt.Rectangle((x, y), w, h, facecolor=color, edgecolor='black', linewidth=1.5)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=fontsize, wrap=True)

    def draw_arrow(x1, y1, x2, y2):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                   arrowprops=dict(arrowstyle='->', color='black', lw=1.5))

    # NonGPT Pipeline (Top)
    ax.text(8, 7.5, 'Method 1: NonGPT (MASt3R + Image2Mass)', ha='center', fontsize=12, fontweight='bold')

    draw_box(0.5, 5.5, 2, 1.2, 'Multi-view\nImages\n(6 views)', colors['input'])
    draw_arrow(2.5, 6.1, 3.5, 6.1)

    draw_box(3.5, 5.5, 2.5, 1.2, 'MASt3R\n3D Reconstruction', colors['model'])
    draw_arrow(6, 6.1, 7, 6.1)

    draw_box(7, 5.5, 2, 1.2, '3D Point\nCloud', colors['process'])
    draw_arrow(9, 6.1, 10, 6.1)

    draw_box(10, 5.5, 2, 1.2, 'Dimension\nExtraction\n(L,W,H)', colors['process'])
    draw_arrow(12, 6.1, 13, 6.1)

    draw_box(13, 5.5, 2.5, 1.2, 'Image2Mass\nModel', colors['model'])

    # NonGPT + GT Volume Pipeline (Middle)
    ax.text(8, 4.3, 'Method 2: NonGPT + GT Volume', ha='center', fontsize=12, fontweight='bold')

    draw_box(0.5, 2.8, 2, 1.2, 'Single\nImage', colors['input'])
    draw_box(3.5, 2.8, 2.5, 1.2, 'Ground Truth\nDimensions\n(L,W,H)', colors['input'])
    draw_arrow(2.5, 3.4, 6.5, 3.4)
    draw_arrow(6, 3.4, 6.5, 3.4)

    draw_box(6.5, 2.8, 2.5, 1.2, 'Image2Mass\nModel', colors['model'])
    draw_arrow(9, 3.4, 10, 3.4)

    draw_box(10, 2.8, 2, 1.2, 'Weight\nPrediction', colors['output'])

    # GPT Pipeline (Bottom)
    ax.text(8, 1.6, 'Method 3: GPT-4o Vision', ha='center', fontsize=12, fontweight='bold')

    draw_box(0.5, 0.2, 2, 1.2, 'Single\nImage', colors['input'])
    draw_arrow(2.5, 0.8, 3.5, 0.8)

    draw_box(3.5, 0.2, 2.5, 1.2, 'GPT-4o\nVision API', colors['model'])
    draw_arrow(6, 0.8, 7, 0.8)

    draw_box(7, 0.2, 2, 1.2, 'Category\nRecognition', colors['process'])
    draw_arrow(9, 0.8, 10, 0.8)

    draw_box(10, 0.2, 2, 1.2, 'Weight/Volume\nEstimation', colors['output'])

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '6_pipeline_diagram.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Saved: 6_pipeline_diagram.png")


def main():
    print("=" * 60)
    print("Report Image Generation")
    print("=" * 60)

    # 샘플 제품 찾기
    images, json_path, product_name = find_sample_product()
    if images is None:
        print("Cannot find sample product.")
        return

    print(f"\nSample Product: {product_name}")
    print(f"Number of Images: {len(images)}")

    # 1. 원본 이미지 저장
    print("\n[1/6] Saving original images...")
    save_original_images(images, product_name)

    # 2-3. MASt3R 3D 복원 및 Depth Map
    print("\n[2-3/6] MASt3R 3D reconstruction...")
    try:
        generate_mast3r_visualization(images)
    except Exception as e:
        print(f"MASt3R visualization failed: {e}")
        import traceback
        traceback.print_exc()

    # 4. Image2Mass thickness mask
    print("\n[4/6] Image2Mass Thickness Mask...")
    try:
        generate_image2mass_visualization(images[0])
    except Exception as e:
        print(f"Image2Mass visualization failed: {e}")

    # 5. 방법 비교 차트
    print("\n[5/6] Method comparison chart...")
    generate_comparison_figure()

    # 6. 파이프라인 다이어그램
    print("\n[6/6] Pipeline diagram...")
    generate_pipeline_diagram()

    print("\n" + "=" * 60)
    print(f"Done! Images saved to: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
