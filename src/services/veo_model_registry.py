"""Veo 3.1 + Omni Flash 视频模型族注册表（声明式）。

本模块把 `docs/superpowers/specs/2026-06-18-veo-3-1-omni-model-families-design.md`
中第 5 节的 t2v / i2v / start_end / r2v / upsampler 表格转换为单一的、可被各层
（API / backend）查询的纯数据 + 纯函数注册表。

设计约束：
- 仅依赖标准库，不引入 httpx / db / 浏览器等外部依赖，便于单元测试。
- `resolve()` 是核心入口：(family, mode, duration, orientation) -> (flow_model_key, max_ref_img)。
- 不支持的组合返回 `None`，由调用层产生 `400`。

族（family）取值见 `API_MODEL_TO_FAMILY`；模式（mode）见 `MODE_*` 常量。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# 1. 模型族常量
# ---------------------------------------------------------------------------

FAMILY_OMNI = "omni_flash"
FAMILY_QUALITY = "veo_quality"
FAMILY_FAST = "veo_fast"
FAMILY_LITE = "veo_lite"
FAMILY_LITE_LOW = "veo_lite_low"

# ---------------------------------------------------------------------------
# 2. API 模型名 -> 族
# ---------------------------------------------------------------------------

API_MODEL_TO_FAMILY: Dict[str, str] = {
    "veo-3-1": FAMILY_QUALITY,
    "veo-3-1-fast": FAMILY_FAST,
    "veo-3-1-lite": FAMILY_LITE,
    "veo-3-1-lite-low": FAMILY_LITE_LOW,
    "veo-omni-flash": FAMILY_OMNI,
}

# ---------------------------------------------------------------------------
# 3. 生成模式常量
# ---------------------------------------------------------------------------

MODE_T2V = "t2v"
MODE_I2V = "i2v"
MODE_START_END = "start_end"
MODE_R2V = "r2v"

# ---------------------------------------------------------------------------
# 4. 注册表数据结构
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ModelEntry:
    """单个 (family, mode, duration) 组合对应的 flow 模型键。

    portrait_key / landscape_key 分别对应竖屏 / 横屏（默认）方向的 flow 模型键。
    max_ref_img 仅在 r2v 模式有意义；其余模式为 0。
    """

    portrait_key: str
    landscape_key: str
    max_ref_img: int = 0


# 注册表：以 (family, mode) 为外层键，duration -> ModelEntry 为内层映射。
# 下方所有键值均逐字摘自设计文档第 5 节表格，请勿改写/缩写/臆造。
_REGISTRY: Dict[Tuple[str, str], Dict[int, ModelEntry]] = {
    # -----------------------------------------------------------------
    # 5.1 t2v — Text to Video
    # -----------------------------------------------------------------
    (FAMILY_OMNI, MODE_T2V): {
        4: ModelEntry("abra_t2v_4s", "abra_t2v_4s"),
        6: ModelEntry("abra_t2v_6s", "abra_t2v_6s"),
        8: ModelEntry("abra_t2v_8s", "abra_t2v_8s"),
        10: ModelEntry("abra_t2v_10s", "abra_t2v_10s"),
    },
    (FAMILY_LITE, MODE_T2V): {
        4: ModelEntry("veo_3_1_t2v_lite_4s", "veo_3_1_t2v_lite_4s"),
        6: ModelEntry("veo_3_1_t2v_lite_6s", "veo_3_1_t2v_lite_6s"),
        8: ModelEntry("veo_3_1_t2v_lite", "veo_3_1_t2v_lite"),
    },
    (FAMILY_FAST, MODE_T2V): {
        4: ModelEntry("veo_3_1_t2v_fast_4s", "veo_3_1_t2v_fast_4s"),
        6: ModelEntry("veo_3_1_t2v_fast_6s", "veo_3_1_t2v_fast_6s"),
        8: ModelEntry("veo_3_1_t2v_fast_portrait_ultra", "veo_3_1_t2v_fast_ultra"),
    },
    (FAMILY_QUALITY, MODE_T2V): {
        4: ModelEntry("veo_3_1_t2v_quality_4s", "veo_3_1_t2v_quality_4s"),
        6: ModelEntry("veo_3_1_t2v_quality_6s", "veo_3_1_t2v_quality_6s"),
        8: ModelEntry("veo_3_1_t2v_portrait", "veo_3_1_t2v"),
    },
    (FAMILY_LITE_LOW, MODE_T2V): {
        4: ModelEntry("veo_3_1_t2v_lite_4s_low_priority", "veo_3_1_t2v_lite_4s_low_priority"),
        6: ModelEntry("veo_3_1_t2v_lite_6s_low_priority", "veo_3_1_t2v_lite_6s_low_priority"),
        8: ModelEntry("veo_3_1_t2v_lite_low_priority", "veo_3_1_t2v_lite_low_priority"),
    },
    # -----------------------------------------------------------------
    # 5.2 i2v — Start Frame to Video
    # -----------------------------------------------------------------
    (FAMILY_OMNI, MODE_I2V): {
        4: ModelEntry("abra_i2v_4s", "abra_i2v_4s"),
        6: ModelEntry("abra_i2v_6s", "abra_i2v_6s"),
        8: ModelEntry("abra_i2v_8s", "abra_i2v_8s"),
        10: ModelEntry("abra_i2v_10s", "abra_i2v_10s"),
    },
    (FAMILY_LITE, MODE_I2V): {
        4: ModelEntry("veo_3_1_i2v_s_lite_4s", "veo_3_1_i2v_s_lite_4s"),
        6: ModelEntry("veo_3_1_i2v_s_lite_6s", "veo_3_1_i2v_s_lite_6s"),
        8: ModelEntry("veo_3_1_i2v_lite", "veo_3_1_i2v_lite"),
    },
    (FAMILY_FAST, MODE_I2V): {
        4: ModelEntry("veo_3_1_i2v_s_fast_4s", "veo_3_1_i2v_s_fast_4s"),
        6: ModelEntry("veo_3_1_i2v_s_fast_6s", "veo_3_1_i2v_s_fast_6s"),
        8: ModelEntry("veo_3_1_i2v_s_fast_portrait_ultra", "veo_3_1_i2v_s_fast_ultra"),
    },
    (FAMILY_QUALITY, MODE_I2V): {
        4: ModelEntry("veo_3_1_i2v_s_quality_4s", "veo_3_1_i2v_s_quality_4s"),
        6: ModelEntry("veo_3_1_i2v_s_quality_6s", "veo_3_1_i2v_s_quality_6s"),
        8: ModelEntry("veo_3_1_i2v_s_portrait", "veo_3_1_i2v_s"),
    },
    (FAMILY_LITE_LOW, MODE_I2V): {
        4: ModelEntry("veo_3_1_i2v_s_lite_4s_low_priority", "veo_3_1_i2v_s_lite_4s_low_priority"),
        6: ModelEntry("veo_3_1_i2v_s_lite_6s_low_priority", "veo_3_1_i2v_s_lite_6s_low_priority"),
        8: ModelEntry("veo_3_1_i2v_lite_low_priority", "veo_3_1_i2v_lite_low_priority"),
    },
    # -----------------------------------------------------------------
    # 5.3 start_end — Start-End Frame (interpolation)
    # Omni Flash 不支持此模式。
    # -----------------------------------------------------------------
    (FAMILY_LITE, MODE_START_END): {
        4: ModelEntry("veo_3_1_i2v_s_lite_4s_fl", "veo_3_1_i2v_s_lite_4s_fl"),
        6: ModelEntry("veo_3_1_i2v_s_lite_6s_fl", "veo_3_1_i2v_s_lite_6s_fl"),
        8: ModelEntry("veo_3_1_interpolation_lite", "veo_3_1_interpolation_lite"),
    },
    (FAMILY_FAST, MODE_START_END): {
        4: ModelEntry("veo_3_1_i2v_s_fast_4s_fl", "veo_3_1_i2v_s_fast_4s_fl"),
        6: ModelEntry("veo_3_1_i2v_s_fast_6s_fl", "veo_3_1_i2v_s_fast_6s_fl"),
        8: ModelEntry("veo_3_1_i2v_s_fast_portrait_ultra_fl", "veo_3_1_i2v_s_fast_ultra_fl"),
    },
    (FAMILY_QUALITY, MODE_START_END): {
        4: ModelEntry("veo_3_1_i2v_s_quality_4s_fl", "veo_3_1_i2v_s_quality_4s_fl"),
        6: ModelEntry("veo_3_1_i2v_s_quality_6s_fl", "veo_3_1_i2v_s_quality_6s_fl"),
        8: ModelEntry("veo_3_1_i2v_s_portrait_fl", "veo_3_1_i2v_s_fl"),
    },
    (FAMILY_LITE_LOW, MODE_START_END): {
        4: ModelEntry("veo_3_1_i2v_s_lite_4s_fl_low_priority", "veo_3_1_i2v_s_lite_4s_fl_low_priority"),
        6: ModelEntry("veo_3_1_i2v_s_lite_6s_fl_low_priority", "veo_3_1_i2v_s_lite_6s_fl_low_priority"),
        8: ModelEntry("veo_3_1_interpolation_lite_low_priority", "veo_3_1_interpolation_lite_low_priority"),
    },
    # -----------------------------------------------------------------
    # 5.4 r2v — Reference to Video
    # Veo Quality 不支持此模式；Veo 族仅 8s。
    # -----------------------------------------------------------------
    (FAMILY_OMNI, MODE_R2V): {
        4: ModelEntry("abra_r2v_4s", "abra_r2v_4s", 7),
        6: ModelEntry("abra_r2v_6s", "abra_r2v_6s", 7),
        8: ModelEntry("abra_r2v_8s", "abra_r2v_8s", 7),
        10: ModelEntry("abra_r2v_10s", "abra_r2v_10s", 7),
    },
    (FAMILY_LITE, MODE_R2V): {
        8: ModelEntry("veo_3_1_r2v_lite", "veo_3_1_r2v_lite", 3),
    },
    (FAMILY_FAST, MODE_R2V): {
        8: ModelEntry("veo_3_1_r2v_fast_portrait_ultra", "veo_3_1_r2v_fast_landscape_ultra", 3),
    },
    (FAMILY_LITE_LOW, MODE_R2V): {
        8: ModelEntry("veo_3_1_r2v_lite_low_priority", "veo_3_1_r2v_lite_low_priority", 3),
    },
}

# ---------------------------------------------------------------------------
# 5.5 Upsampler（沿用现状，仅暴露常量）
# ---------------------------------------------------------------------------

UPSAMPLER_KEYS: Dict[str, str] = {
    "1080p": "veo_3_1_upsampler_1080p",
    "4k": "veo_3_1_upsampler_4k",
}

# 方向常量
ORIENTATION_PORTRAIT = "portrait"
ORIENTATION_LANDSCAPE = "landscape"


# ---------------------------------------------------------------------------
# 公共函数
# ---------------------------------------------------------------------------


def resolve(
    family: str,
    mode: str,
    duration: int,
    orientation: str,
) -> Optional[Tuple[str, int]]:
    """解析 (family, mode, duration, orientation) -> (flow_model_key, max_ref_img)。

    Args:
        family: 模型族，见 `FAMILY_*` 常量。
        mode: 生成模式，见 `MODE_*` 常量。
        duration: 时长（秒），如 4 / 6 / 8 / 10。
        orientation: 方向；`"portrait"` 返回竖屏键，其余值（含 `"landscape"`）
            返回横屏（默认）键。

    Returns:
        命中时返回 `(flow_model_key, max_ref_img)`；不支持的组合返回 `None`。
    """
    entry = _REGISTRY.get((family, mode), {}).get(duration)
    if entry is None:
        return None
    key = entry.portrait_key if orientation == ORIENTATION_PORTRAIT else entry.landscape_key
    return (key, entry.max_ref_img)


def supported_durations(family: str, mode: str) -> List[int]:
    """返回某 (family, mode) 支持的全部时长（升序）。

    无效组合返回空列表。
    """
    return sorted(_REGISTRY.get((family, mode), {}).keys())


def is_supported(family: str, mode: str, duration: int) -> bool:
    """判断 (family, mode, duration) 组合是否受支持。"""
    return duration in _REGISTRY.get((family, mode), {})


def max_ref_images(family: str, mode: str, duration: int) -> int:
    """返回该组合允许的最大参考图数量；r2v 之外恒为 0。

    无效组合同样返回 0。
    """
    entry = _REGISTRY.get((family, mode), {}).get(duration)
    return entry.max_ref_img if entry is not None else 0
