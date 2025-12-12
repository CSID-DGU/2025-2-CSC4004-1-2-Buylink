#!/bin/bash
# install_vggt.sh
# VGGT 및 의존성 설치 스크립트

echo "=========================================="
echo "Installing VGGT + Image2Mass Dependencies"
echo "=========================================="

# 1. VGGT 클론 및 설치
echo "[1/4] Cloning VGGT repository..."
if [ ! -d "vggt" ]; then
    git clone https://github.com/facebookresearch/vggt.git
    cd vggt
    pip install -e .
    cd ..
else
    echo "VGGT already cloned, skipping..."
fi

# 2. 추가 의존성 설치
echo "[2/4] Installing additional dependencies..."
pip install timm einops huggingface_hub

# 3. 기존 image2mass 의존성
echo "[3/4] Installing Image2Mass dependencies..."
pip install torch torchvision pillow numpy

# 4. VGGT 모델 다운로드 (사전에 캐싱)
echo "[4/4] Pre-downloading VGGT model weights..."
python3 -c "
from huggingface_hub import hf_hub_download
print('Downloading VGGT-1B model...')
try:
    hf_hub_download(repo_id='facebook/VGGT-1B', filename='model.pt')
    print('Model downloaded successfully!')
except Exception as e:
    print(f'Note: Will download on first use. ({e})')
"

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Usage:"
echo "  python vggt_image2mass_inference.py image1.jpg image2.jpg image3.jpg"
echo ""
