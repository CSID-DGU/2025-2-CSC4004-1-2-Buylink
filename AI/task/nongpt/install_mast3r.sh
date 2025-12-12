#!/bin/bash
# install_mast3r.sh
# MASt3R 및 의존성 설치 스크립트 (T4 16GB 권장)

echo "=========================================="
echo "Installing MASt3R + Image2Mass Dependencies"
echo "=========================================="

# 1. MASt3R 클론 및 설치
echo "[1/4] Cloning MASt3R repository..."
if [ ! -d "mast3r" ]; then
    git clone --recursive https://github.com/naver/mast3r.git
    cd mast3r
    pip install -e .
    cd ..
else
    echo "MASt3R already cloned, updating..."
    cd mast3r && git pull && cd ..
fi

# 2. DUSt3R 의존성 (MASt3R에 포함)
echo "[2/4] Installing DUSt3R dependencies..."
cd mast3r
pip install -r requirements.txt
cd ..

# 3. 추가 의존성
echo "[3/4] Installing additional dependencies..."
pip install timm einops roma huggingface_hub

# 4. RoPE CUDA 커널 컴파일 (선택사항, 속도 향상)
echo "[4/4] Compiling CUDA kernels (optional)..."
cd mast3r/dust3r/croco/models/curope/
python setup.py build_ext --inplace 2>/dev/null || echo "CUDA kernel compilation skipped (will use PyTorch fallback)"
cd ../../../../../

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Usage:"
echo "  python mast3r_image2mass_inference.py view1.jpg view2.jpg view3.jpg"
echo ""
echo "Recommended: 5-8 images for best results"
echo ""
