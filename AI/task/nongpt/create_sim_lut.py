"""
물류 데이터셋에서 SIM (밀도) LUT 생성
JSON 라벨에서 weight, L, W, H를 읽어서 밀도 분포 계산
"""
import os
import json
import torch
import numpy as np
from glob import glob

def collect_densities(data_root, item_type="01_입고물품"):
    """데이터셋에서 밀도(weight / volume) 수집"""
    densities = []
    
    # Training + Validation 모두 수집
    for split in ["Training", "Validation"]:
        label_root = os.path.join(data_root, "3.개방데이터/1.데이터", split, "02.라벨링데이터", item_type)
        
        if not os.path.exists(label_root):
            print(f"Path not found: {label_root}")
            continue
        
        json_files = glob(os.path.join(label_root, "**/*.json"), recursive=True)
        print(f"[{split}] Found {len(json_files)} JSON files")
        
        for json_path in json_files:
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                for ann in data.get("annotations", []):
                    attrs = ann.get("attributes", {})
                    
                    # weight (kg), L, W, H (cm) 추출
                    weight = attrs.get("weight")  # kg
                    L = attrs.get("length")  # cm
                    W = attrs.get("width")   # cm
                    H = attrs.get("height")  # cm
                    
                    if all(v is not None and v > 0 for v in [weight, L, W, H]):
                        # 부피 (cm³) → L(리터) 변환: 1L = 1000cm³
                        volume_cm3 = L * W * H
                        volume_L = volume_cm3 / 1000.0
                        
                        # 밀도 = 무게(kg) / 부피(L) = kg/L
                        density = weight / volume_L if volume_L > 0 else 0
                        
                        if 0.001 < density < 100:  # 합리적인 범위
                            densities.append(density)
            except Exception as e:
                continue
    
    return densities

def create_sim_lut(densities, output_path, n_bins=1000):
    """밀도 분포를 정렬된 LUT로 저장"""
    densities = np.array(densities)
    print(f"\nTotal samples: {len(densities)}")
    print(f"Density range: {densities.min():.4f} ~ {densities.max():.4f} kg/L")
    print(f"Density mean: {densities.mean():.4f}, std: {densities.std():.4f}")
    
    # 정렬된 밀도값 (percentile -> density 매핑용)
    sorted_densities = np.sort(densities)
    
    # n_bins 개로 샘플링 (등간격)
    indices = np.linspace(0, len(sorted_densities)-1, n_bins).astype(int)
    sim_lut = sorted_densities[indices]
    
    # Tensor로 저장
    sim_lut_tensor = torch.tensor(sim_lut, dtype=torch.float32)
    torch.save(sim_lut_tensor, output_path)
    
    print(f"\nSIM LUT saved: {output_path}")
    print(f"LUT shape: {sim_lut_tensor.shape}")
    print(f"LUT range: {sim_lut_tensor.min():.4f} ~ {sim_lut_tensor.max():.4f}")
    
    return sim_lut_tensor

if __name__ == "__main__":
    data_root = "/home/2020112534/47.물류공간_예측_데이터"
    output_path = "/home/2020112534/task/nongpt/sim_lut.pt"
    
    print("Collecting densities from dataset...")
    densities = collect_densities(data_root, item_type="01_입고물품")
    
    if len(densities) > 0:
        create_sim_lut(densities, output_path)
    else:
        print("No valid densities found!")
