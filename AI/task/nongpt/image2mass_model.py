# image2mass_model.py
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
import math


# =========================
# 1) Loss: ALDE
# =========================
class ALDELoss(nn.Module):
    """
    Absolute Log Difference Error:
        L = | log(t) - log(p) |
    """
    def __init__(self, eps: float = 1e-8):
        super().__init__()
        self.eps = eps

    def forward(self, pred_mass, true_mass):
        pred_mass = pred_mass.clamp(min=self.eps)
        true_mass = true_mass.clamp(min=self.eps)
        return torch.mean(torch.abs(torch.log(true_mass) - torch.log(pred_mass)))


# =========================
# 2) Percentile -> Density
#    (piecewise-linear LUT)
# =========================
class PercentileToDensity(nn.Module):
    """
    percentile in (0,1)  -> density (SIM 기반)
    sim_lut: 정렬된 SIM 값들 (Tensor[N])
    """
    def __init__(self, sim_lut: torch.Tensor):
        super().__init__()
        # 학습하지 않는 buffer로 등록
        self.register_buffer("sim_lut", sim_lut.view(-1))
        self.n = sim_lut.numel()

    def forward(self, percentile: torch.Tensor) -> torch.Tensor:
        """
        percentile: Tensor[B, 1] in (0,1)
        return: density Tensor[B, 1]
        """
        # 0~1 살짝 clipping
        p = percentile.clamp(1e-6, 1.0 - 1e-6)
        idx_float = p * (self.n - 1)

        idx0 = torch.floor(idx_float).long()
        idx1 = torch.clamp(idx0 + 1, max=self.n - 1)
        w = (idx_float - idx0).unsqueeze(-1)  # [B,1,1] 형태로 broadcast해도 됨

        sim0 = self.sim_lut[idx0]  # [B, 1]
        sim1 = self.sim_lut[idx1]  # [B, 1]

        density = sim0 + (sim1 - sim0) * w.squeeze(-1)
        return density.unsqueeze(-1)  # [B,1]


# =========================
# 3) Geometry Module
#    - thickness mask 예측
#    - 14 geometric features 계산
# =========================
class GeometryModule(nn.Module):
    """
    이미지 -> thickness mask(19x19) + 14D geometric feature
    논문: Figure 3의 Geometry module + (c) 부분. :contentReference[oaicite:6]{index=6}
    """
    def __init__(self, backbone_name: str = "xception", pretrained: bool = True):
        super().__init__()
        # timm Xception backbone (feature extractor)
        self.backbone = timm.create_model(
            backbone_name,
            pretrained=pretrained,
            num_classes=0,        # fc 제거
            global_pool=''        # feature map 그대로
        )
        # backbone output 채널 수
        if hasattr(self.backbone, "num_features"):
            in_channels = self.backbone.num_features
        else:
            # timm xception 기준 2048
            in_channels = 2048

        # thickness head: conv -> upsample -> conv -> 1채널
        self.thick_head = nn.Sequential(
            nn.Conv2d(in_channels, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 1, kernel_size=1),
            nn.ReLU(inplace=True)  # thickness는 음수가 아니므로
        )

        self.target_size = (19, 19)

    def forward_backbone(self, x):
        # timm의 feature map 얻기 (forward_features가 있는 모델 기준)
        if hasattr(self.backbone, "forward_features"):
            f = self.backbone.forward_features(x)
        else:
            f = self.backbone(x)
        return f

    def predict_thickness(self, x):
        """
        x: [B,3,H,W]
        return: thickness_mask [B,1,19,19]
        """
        f = self.forward_backbone(x)
        t = self.thick_head(f)             # [B,1,h,w]
        t = F.interpolate(
            t, size=self.target_size,
            mode="bilinear", align_corners=False
        )
        return t

    def compute_geometry_features(self, thickness, dims):
        """
        thickness: [B,1,19,19] (>=0)
        dims: [B,3]  (L, W, H) 실제 물리 길이 (논문에서 bounding box dimensions)
        반환: geo_feats [B,14]
        논문 정의를 따라가되, min-area rect는 간단한 근사로 구현. :contentReference[oaicite:7]{index=7}
        """
        B, _, H, W = thickness.shape
        device = thickness.device

        # flatten
        t = thickness.view(B, H, W)
        eps = 1e-6

        geo_feats = []

        for b in range(B):
            tb = t[b]  # [H,W]
            mask = tb > (tb.max() * 0.05)  # 약한 threshold로 object 영역 추정

            if mask.sum() == 0:
                # 아무것도 없으면 전부 0
                geo_feats.append(torch.zeros(14, device=device))
                continue

            ys, xs = mask.nonzero(as_tuple=True)   # 좌표
            y_min, y_max = ys.min().item(), ys.max().item()
            x_min, x_max = xs.min().item(), xs.max().item()

            # 1,2: bounding box length/width (pixel 기준, 정규화)
            length = (x_max - x_min + 1) / W
            width  = (y_max - y_min + 1) / H

            # 3: thickness max
            max_thick = tb.max().item()

            # 4,5: center (normalized)
            cx = (x_min + x_max + 1) / (2.0 * W)
            cy = (y_min + y_max + 1) / (2.0 * H)

            # 6: angle (간단하게 PCA 기반 근사)
            coords = torch.stack([xs.float(), ys.float()], dim=1)  # [N,2]
            coords = coords - coords.mean(dim=0, keepdim=True)
            cov = coords.t().mm(coords) / (coords.shape[0] + eps)
            eigvals, eigvecs = torch.linalg.eigh(cov)
            # 가장 큰 eigenvector 방향
            principal = eigvecs[:, -1]
            angle = math.atan2(principal[1].item(), principal[0].item()) / math.pi  # [-1,1] 범위 근처

            # 7: thickness sum
            sum_thick = tb.sum().item()

            # 8: non-zero count 비율
            non_zero = mask.sum().item()
            non_zero_ratio = non_zero / (H * W)

            # 9: rect area (normalized)
            rect_area = length * width

            # dims[b]: L, W, H (물리적)
            L, Wd, Hd = dims[b]  # 물리 길이들
            L = L.item()
            Wd = Wd.item()
            Hd = Hd.item()

            # 10: bounding box volume (L*W*H)
            bbox_vol = L * Wd * Hd

            # 11: voxel occupancy 비율 (o1) – thickness와 rect를 이용한 근사
            voxels_all = max_thick * (non_zero + eps)
            o1 = (sum_thick / (voxels_all + eps))

            # 12: pixel occupancy 비율 (o2)
            o2 = non_zero_ratio

            # 13: 3D volume estimate = o1 * L*W*H
            vol_3d = o1 * bbox_vol

            # 14: 2D volume estimate = o2 * L*W
            vol_2d = o2 * (L * Wd)

            feats = torch.tensor([
                length, width, max_thick,
                cx, cy, angle,
                sum_thick,
                non_zero_ratio,
                rect_area,
                bbox_vol,
                o1,
                o2,
                vol_3d,
                vol_2d
            ], device=device, dtype=torch.float32)

            geo_feats.append(feats)

        geo_feats = torch.stack(geo_feats, dim=0)  # [B,14]
        return geo_feats

    def forward(self, x, dims):
        """
        x: [B,3,H,W], dims: [B,3]
        return:
          thickness: [B,1,19,19]
          geo_feats: [B,14]
        """
        thickness = self.predict_thickness(x)
        geo_feats = self.compute_geometry_features(thickness, dims)
        return thickness, geo_feats


# =========================
# 4) Density Tower
# =========================
class DensityTower(nn.Module):
    """
    논문 Figure 3의 Density Tower 부분. :contentReference[oaicite:8]{index=8}
    - Xception backbone (다시 사용)
    - thickness + geometric features도 같이 사용
    - 출력: density percentile in (0,1) + 16D hidden (volume tower로 전달)
    """
    def __init__(self, backbone_name="xception", pretrained=True, geo_feat_dim=14):
        super().__init__()
        self.backbone = timm.create_model(
            backbone_name,
            pretrained=pretrained,
            num_classes=0,  # feature vector
            global_pool='avg'
        )
        if hasattr(self.backbone, "num_features"):
            img_feat_dim = self.backbone.num_features
        else:
            img_feat_dim = 2048

        self.thick_encoder = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d(1)
        )

        # FC layers
        self.fc1 = nn.Linear(img_feat_dim + 16 + geo_feat_dim, 128)
        self.bn1 = nn.BatchNorm1d(128)

        # 이 16차원이 volume tower로 넘어가는 (g) feature
        self.fc_hidden = nn.Linear(128, 16)
        self.bn_hidden = nn.BatchNorm1d(16)

        self.fc_percentile = nn.Linear(16, 1)

    def forward(self, x, thickness, geo_feats):
        """
        x: [B,3,H,W]
        thickness: [B,1,19,19]
        geo_feats: [B,14]
        return:
          percentile: [B,1]
          hidden: [B,16]
        """
        img_feat = self.backbone(x)                 # [B, img_feat_dim]
        thick_feat = self.thick_encoder(thickness)  # [B,16,1,1]
        thick_feat = thick_feat.view(thick_feat.size(0), -1)  # [B,16]

        h = torch.cat([img_feat, thick_feat, geo_feats], dim=1)
        h = F.relu(self.bn1(self.fc1(h)))
        hidden = F.relu(self.bn_hidden(self.fc_hidden(h)))   # [B,16]

        percentile = torch.sigmoid(self.fc_percentile(hidden))  # in (0,1)
        return percentile, hidden


# =========================
# 5) Volume Tower
# =========================
class VolumeTower(nn.Module):
    """
    논문 Figure 3의 Volume Tower 부분. :contentReference[oaicite:9]{index=9}
    """
    def __init__(self, geo_feat_dim=14, hidden_dim=16):
        super().__init__()
        self.fc1 = nn.Linear(geo_feat_dim + hidden_dim, 64)
        self.bn1 = nn.BatchNorm1d(64)
        self.fc_out = nn.Linear(64, 1)

    def forward(self, geo_feats, hidden):
        """
        geo_feats: [B,14]
        hidden: [B,16]
        return: volume [B,1] (양수)
        """
        x = torch.cat([geo_feats, hidden], dim=1)
        x = F.relu(self.bn1(self.fc1(x)))
        volume_raw = self.fc_out(x)
        volume = F.softplus(volume_raw)  # 양수 보장
        return volume


# =========================
# 6) 전체 Image2Mass Model
# =========================
class Image2MassModel(nn.Module):
    """
    전체 shape-aware image2mass 모델. 

    forward:
        image: [B,3,H,W]
        dims:  [B,3] (L,W,H)
    출력:
        mass_pred: [B]
        aux: dict (thickness 등 중간 결과)
    """
    def __init__(self, sim_lut: torch.Tensor,
                 backbone_name="xception",
                 pretrained=True,
                 c_scale: float = 10.0):
        super().__init__()
        self.geometry = GeometryModule(backbone_name, pretrained)
        # density tower는 backbone을 또 쓰지만, 실제 구현에서는 weight sharing/분리 선택 가능
        self.density_tower = DensityTower(backbone_name, pretrained)
        self.volume_tower = VolumeTower()
        self.percentile_to_density = PercentileToDensity(sim_lut)
        self.c_scale = c_scale

    def forward(self, image, dims):
        """
        image: [B,3,H,W]
        dims:  [B,3]
        """
        # 1) geometry module
        thickness, geo_feats = self.geometry(image, dims)

        # 2) density tower → percentile & hidden
        percentile, hidden = self.density_tower(image, thickness, geo_feats)

        # 3) percentile → density
        density = self.percentile_to_density(percentile)  # [B,1]

        # 4) volume tower
        volume = self.volume_tower(geo_feats, hidden)     # [B,1]

        # 5) mass = (c*density) * (volume/c)
        #    (곱셈 안정성 위해 c_scale 사용 – 논문에서 c=10 사용) :contentReference[oaicite:11]{index=11}
        mass = (self.c_scale * density) * (volume / self.c_scale)  # [B,1]

        mass = mass.squeeze(-1)  # [B]

        aux = {
            "thickness": thickness,
            "geo_feats": geo_feats,
            "percentile": percentile,
            "density": density,
            "volume": volume
        }
        return mass, aux
