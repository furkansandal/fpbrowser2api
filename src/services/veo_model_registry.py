"""Veo 3.1 + Omni 1.2 Flash 视频模型族注册表（声明式）。

本模块把 Google Flow `HTrJv` 最新返回的模型族（含 Omni 1.2 Flash `macaron_cookie`
以及 Veo 3.1 Quality / Fast / Lite / Lite Low）的 t2v / i2v / start_end / r2v /
edit / extend / upsampler 表格转换为统一的、可被各层（API / backend）查询的纯数据
+ 纯函数注册表。

设计约束：
- 仅依赖标准库，不引入 httpx / db / 浏览器等外部依赖，便于单元测试。
- `resolve()` 是核心入口：(family, mode, duration, orientation, resolution) -> (flow_model_key, max_ref_img)。
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
FAMILY_OMNI_1_1 = "omni_flash"
FAMILY_OMNI_1_2 = "omni_1_2_flash"
FAMILY_QUALITY = "veo_quality"
FAMILY_FAST = "veo_fast"
FAMILY_LITE = "veo_lite"
FAMILY_LITE_LOW = "veo_lite_low"

OMNI_FAMILIES: Tuple[str, ...] = (
    FAMILY_OMNI,
    FAMILY_OMNI_1_2,
)

# ---------------------------------------------------------------------------
# 2. API 模型名 -> 族
# ---------------------------------------------------------------------------

API_MODEL_TO_FAMILY: Dict[str, str] = {
    "veo-3-1": FAMILY_QUALITY,
    "veo-3-1-fast": FAMILY_FAST,
    "veo-3-1-lite": FAMILY_LITE,
    "veo-3-1-lite-low": FAMILY_LITE_LOW,
    # Omni 1.1 Flash (`abra`)
    "veo-omni-flash": FAMILY_OMNI_1_1,
    "omni-1.1-flash": FAMILY_OMNI_1_1,
    "omni-1-1-flash": FAMILY_OMNI_1_1,
    "veo-omni-1.1-flash": FAMILY_OMNI_1_1,
    "veo-omni-1-1-flash": FAMILY_OMNI_1_1,
    "veo-omni-flash-1.1": FAMILY_OMNI_1_1,
    "veo-omni-flash-1-1": FAMILY_OMNI_1_1,
    "veo-omni-flash-video-edit": FAMILY_OMNI_1_1,
    "omni-1.1-flash-video-edit": FAMILY_OMNI_1_1,
    "veo-omni-1.1-flash-video-edit": FAMILY_OMNI_1_1,
    "veo-omni-1-1-flash-video-edit": FAMILY_OMNI_1_1,
    "veo-omni-flash-1.1-video-edit": FAMILY_OMNI_1_1,
    "veo-omni-flash-1-1-video-edit": FAMILY_OMNI_1_1,
    # Omni 1.2 Flash (`macaron_cookie`)
    "omni-1.2-flash": FAMILY_OMNI_1_2,
    "omni-1-2-flash": FAMILY_OMNI_1_2,
    "veo-omni-1.2-flash": FAMILY_OMNI_1_2,
    "veo-omni-1-2-flash": FAMILY_OMNI_1_2,
    "veo-omni-flash-1.2": FAMILY_OMNI_1_2,
    "veo-omni-flash-1-2": FAMILY_OMNI_1_2,
    "omni-1.2-flash-video-edit": FAMILY_OMNI_1_2,
    "veo-omni-1.2-flash-video-edit": FAMILY_OMNI_1_2,
    "veo-omni-1-2-flash-video-edit": FAMILY_OMNI_1_2,
    "veo-omni-flash-1.2-video-edit": FAMILY_OMNI_1_2,
    "veo-omni-flash-1-2-video-edit": FAMILY_OMNI_1_2,
    "omni-1.2-flash-video-extend": FAMILY_OMNI_1_2,
    "veo-omni-1.2-flash-video-extend": FAMILY_OMNI_1_2,
    "veo-omni-1-2-flash-video-extend": FAMILY_OMNI_1_2,
    "veo-omni-flash-1.2-video-extend": FAMILY_OMNI_1_2,
    "veo-omni-flash-1-2-video-extend": FAMILY_OMNI_1_2,
    "veo-omni-flash-video-extend": FAMILY_OMNI_1_2,
}

OMNI_API_MODELS: Tuple[str, ...] = tuple(
    model_name
    for model_name, fam in API_MODEL_TO_FAMILY.items()
    if fam in OMNI_FAMILIES
)

# ---------------------------------------------------------------------------
# 3. 生成模式常量
# ---------------------------------------------------------------------------

MODE_T2V = "t2v"
MODE_I2V = "i2v"
MODE_START_END = "start_end"
MODE_R2V = "r2v"
MODE_EDIT = "edit"
MODE_EXTEND = "extend"

ALL_MODES: Tuple[str, ...] = (
    MODE_T2V,
    MODE_I2V,
    MODE_START_END,
    MODE_R2V,
    MODE_EDIT,
    MODE_EXTEND,
)

# ---------------------------------------------------------------------------
# 4. 注册表数据结构
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ModelEntry:
    """单个 (family, mode, duration) 组合对应的 flow 模型键。

    portrait_key / landscape_key 分别对应竖屏 / 横屏（默认）方向的 flow 模型键。
    max_ref_img: 允许的最大参考图片数量（r2v=7/3, edit=5, extend=3，其余为 0）。
    max_ref_audio: 允许的最大参考音频/音色数量（omni r2v=5, edit=3, extend=3，其余为 0）。
    max_ref_video: 允许的最大参考视频数量（edit=1, extend=1，其余为 0）。
    max_video_duration_sec: 输入参考视频允许的最大秒数（omni 1.1 edit=10s, omni 1.2 edit=15s, extend=30s）。
    """

    portrait_key: str
    landscape_key: str
    max_ref_img: int = 0
    max_ref_audio: int = 0
    max_ref_video: int = 0
    max_video_duration_sec: int = 0


# 注册表：以 (family, mode) 为外层键，duration -> ModelEntry 为内层映射。
# - Omni 1.1 Flash (`FAMILY_OMNI` / `abra`): t2v / i2v / start_end / r2v / edit: 4, 6, 8, 10s (无 extend)
# - Omni 1.2 Flash (`FAMILY_OMNI_1_2` / `macaron_cookie`):
#   - t2v / i2v / r2v / edit: 3..15s
#   - start_end / extend: 3..10s
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
    (FAMILY_OMNI_1_2, MODE_T2V): {
        d: ModelEntry(f"macaron_cookie_t2v_{d}s", f"macaron_cookie_t2v_{d}s")
        for d in range(3, 16)
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
    (FAMILY_OMNI_1_2, MODE_I2V): {
        d: ModelEntry(f"macaron_cookie_i2v_{d}s", f"macaron_cookie_i2v_{d}s")
        for d in range(3, 16)
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
    # - Omni 1.1 Flash: `omni_flash_i2v_{4,6,8,10}s_first_last`
    # - Omni 1.2 Flash: `macaron_cookie_i2v_fl_{3..10}s`
    # -----------------------------------------------------------------
    (FAMILY_OMNI, MODE_START_END): {
        4: ModelEntry("omni_flash_i2v_4s_first_last", "omni_flash_i2v_4s_first_last"),
        6: ModelEntry("omni_flash_i2v_6s_first_last", "omni_flash_i2v_6s_first_last"),
        8: ModelEntry("omni_flash_i2v_8s_first_last", "omni_flash_i2v_8s_first_last"),
        10: ModelEntry("omni_flash_i2v_10s_first_last", "omni_flash_i2v_10s_first_last"),
    },
    (FAMILY_OMNI_1_2, MODE_START_END): {
        d: ModelEntry(f"macaron_cookie_i2v_fl_{d}s", f"macaron_cookie_i2v_fl_{d}s")
        for d in range(3, 11)
    },
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
    # 5.4 r2v — Reference to Video (Ingredients)
    # - Omni 1.1 Flash: 4, 6, 8, 10s, max 7 images + 5 audio refs (`abra_r2v_{d}s`)
    # - Omni 1.2 Flash: 3..15s, max 7 images + 5 audio refs (`macaron_cookie_r2v_{d}s`)
    # - Veo Quality: not supported; Veo 3.1 Fast/Lite: 8s only, max 3 images.
    # -----------------------------------------------------------------
    (FAMILY_OMNI, MODE_R2V): {
        4: ModelEntry("abra_r2v_4s", "abra_r2v_4s", max_ref_img=7, max_ref_audio=5),
        6: ModelEntry("abra_r2v_6s", "abra_r2v_6s", max_ref_img=7, max_ref_audio=5),
        8: ModelEntry("abra_r2v_8s", "abra_r2v_8s", max_ref_img=7, max_ref_audio=5),
        10: ModelEntry("abra_r2v_10s", "abra_r2v_10s", max_ref_img=7, max_ref_audio=5),
    },
    (FAMILY_OMNI_1_2, MODE_R2V): {
        d: ModelEntry(
            f"macaron_cookie_r2v_{d}s",
            f"macaron_cookie_r2v_{d}s",
            max_ref_img=7,
            max_ref_audio=5,
        )
        for d in range(3, 16)
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
    # -----------------------------------------------------------------
    # 5.5 edit — Video Edit
    # - Omni 1.1 Flash (`abra_edit`): 4, 6, 8, 10s, max 10s input video, 5 images, 3 audio refs
    # - Omni 1.2 Flash (`macaron_cookie_edit`): 3..15s, max 15s input video, 5 images, 3 audio refs
    # -----------------------------------------------------------------
    (FAMILY_OMNI, MODE_EDIT): {
        d: ModelEntry(
            "abra_edit",
            "abra_edit",
            max_ref_img=5,
            max_ref_audio=3,
            max_ref_video=1,
            max_video_duration_sec=10,
        )
        for d in (4, 6, 8, 10)
    },
    (FAMILY_OMNI_1_2, MODE_EDIT): {
        d: ModelEntry(
            "macaron_cookie_edit",
            "macaron_cookie_edit",
            max_ref_img=5,
            max_ref_audio=3,
            max_ref_video=1,
            max_video_duration_sec=15,
        )
        for d in range(3, 16)
    },
    # -----------------------------------------------------------------
    # 5.6 extend — Video Extend (Omni 1.2 Flash `macaron_cookie_extend_{3..10}s` only)
    # -----------------------------------------------------------------
    (FAMILY_OMNI_1_2, MODE_EXTEND): {
        d: ModelEntry(
            f"macaron_cookie_extend_{d}s",
            f"macaron_cookie_extend_{d}s",
            max_ref_img=3,
            max_ref_audio=3,
            max_ref_video=1,
            max_video_duration_sec=30,
        )
        for d in range(3, 11)
    },
}

# ---------------------------------------------------------------------------
# 5.4b 360p 原生模型键（仅 omni_flash / omni_1_2_flash 族提供）
#
# Flow 的 360p 不是“生成后降采样”，而是一套独立的模型键；Veo 3.1 各族没有 360p。
# 键值同样逐字摘自 Flow modelConfig (HTrJv)。
# ---------------------------------------------------------------------------

_REGISTRY_360P: Dict[Tuple[str, str], Dict[int, ModelEntry]] = {
    # Omni 1.1 Flash (`abra`) 360p
    (FAMILY_OMNI, MODE_T2V): {
        4: ModelEntry("abra_t2v_4s_360p", "abra_t2v_4s_360p"),
        6: ModelEntry("abra_t2v_6s_360p", "abra_t2v_6s_360p"),
        8: ModelEntry("abra_t2v_8s_360p", "abra_t2v_8s_360p"),
        10: ModelEntry("abra_t2v_10s_360p", "abra_t2v_10s_360p"),
    },
    (FAMILY_OMNI, MODE_I2V): {
        4: ModelEntry("abra_i2v_4s_360p", "abra_i2v_4s_360p"),
        6: ModelEntry("abra_i2v_6s_360p", "abra_i2v_6s_360p"),
        8: ModelEntry("abra_i2v_8s_360p", "abra_i2v_8s_360p"),
        10: ModelEntry("abra_i2v_10s_360p", "abra_i2v_10s_360p"),
    },
    (FAMILY_OMNI, MODE_START_END): {
        4: ModelEntry("omni_flash_i2v_4s_first_last_360p", "omni_flash_i2v_4s_first_last_360p"),
        6: ModelEntry("omni_flash_i2v_6s_first_last_360p", "omni_flash_i2v_6s_first_last_360p"),
        8: ModelEntry("omni_flash_i2v_8s_first_last_360p", "omni_flash_i2v_8s_first_last_360p"),
        10: ModelEntry("omni_flash_i2v_10s_first_last_360p", "omni_flash_i2v_10s_first_last_360p"),
    },
    (FAMILY_OMNI, MODE_R2V): {
        4: ModelEntry("abra_r2v_4s_360p", "abra_r2v_4s_360p", max_ref_img=7, max_ref_audio=5),
        6: ModelEntry("abra_r2v_6s_360p", "abra_r2v_6s_360p", max_ref_img=7, max_ref_audio=5),
        8: ModelEntry("abra_r2v_8s_360p", "abra_r2v_8s_360p", max_ref_img=7, max_ref_audio=5),
        10: ModelEntry("abra_r2v_10s_360p", "abra_r2v_10s_360p", max_ref_img=7, max_ref_audio=5),
    },
    (FAMILY_OMNI, MODE_EDIT): {
        d: ModelEntry(
            "abra_edit_360p",
            "abra_edit_360p",
            max_ref_img=5,
            max_ref_audio=3,
            max_ref_video=1,
            max_video_duration_sec=10,
        )
        for d in (4, 6, 8, 10)
    },
    # Omni 1.2 Flash (`macaron_cookie`) 360p
    (FAMILY_OMNI_1_2, MODE_T2V): {
        d: ModelEntry(f"macaron_cookie_t2v_{d}s_360p", f"macaron_cookie_t2v_{d}s_360p")
        for d in range(3, 16)
    },
    (FAMILY_OMNI_1_2, MODE_I2V): {
        d: ModelEntry(f"macaron_cookie_i2v_{d}s_360p", f"macaron_cookie_i2v_{d}s_360p")
        for d in range(3, 16)
    },
    (FAMILY_OMNI_1_2, MODE_START_END): {
        d: ModelEntry(f"macaron_cookie_i2v_fl_{d}s_360p", f"macaron_cookie_i2v_fl_{d}s_360p")
        for d in range(3, 11)
    },
    (FAMILY_OMNI_1_2, MODE_R2V): {
        d: ModelEntry(
            f"macaron_cookie_r2v_{d}s_360p",
            f"macaron_cookie_r2v_{d}s_360p",
            max_ref_img=7,
            max_ref_audio=5,
        )
        for d in range(3, 16)
    },
    (FAMILY_OMNI_1_2, MODE_EDIT): {
        d: ModelEntry(
            "macaron_cookie_edit_360p",
            "macaron_cookie_edit_360p",
            max_ref_img=5,
            max_ref_audio=3,
            max_ref_video=1,
            max_video_duration_sec=15,
        )
        for d in range(3, 16)
    },
    (FAMILY_OMNI_1_2, MODE_EXTEND): {
        d: ModelEntry(
            f"macaron_cookie_extend_{d}s_360p",
            f"macaron_cookie_extend_{d}s_360p",
            max_ref_img=3,
            max_ref_audio=3,
            max_ref_video=1,
            max_video_duration_sec=30,
        )
        for d in range(3, 11)
    },
}

# 分辨率常量：360p 走 `_REGISTRY_360P`，其余（720p 及需放大的 1080p/4k）走 `_REGISTRY`。
RESOLUTION_360P = "360p"
RESOLUTION_720P = "720p"
RESOLUTION_1080P = "1080p"
RESOLUTION_4K = "4k"


def supports_360p(family: str) -> bool:
    """该族是否提供原生 360p 模型键。"""
    return any(f == family for (f, _mode) in _REGISTRY_360P)


def _table_for(resolution: str) -> Dict[Tuple[str, str], Dict[int, ModelEntry]]:
    return _REGISTRY_360P if resolution == RESOLUTION_360P else _REGISTRY


# ---------------------------------------------------------------------------
# 5.7 Upsampler（沿用现状，仅暴露常量）
# ---------------------------------------------------------------------------

UPSAMPLER_KEYS: Dict[str, str] = {
    RESOLUTION_1080P: "veo_3_1_upsampler_1080p",
    RESOLUTION_4K: "veo_3_1_upsampler_4k",
}

# 方向常量
ORIENTATION_PORTRAIT = "portrait"
ORIENTATION_LANDSCAPE = "landscape"


# ---------------------------------------------------------------------------
# 公共函数
# ---------------------------------------------------------------------------


def resolve_entry(
    family: str,
    mode: str,
    duration: int,
    orientation: str,
    resolution: str = RESOLUTION_720P,
) -> Optional[Tuple[str, ModelEntry]]:
    """解析 (family, mode, duration, orientation, resolution) -> (flow_model_key, ModelEntry)。"""
    entry = _table_for(resolution).get((family, mode), {}).get(duration)
    if entry is None:
        return None
    key = entry.portrait_key if orientation == ORIENTATION_PORTRAIT else entry.landscape_key
    return (key, entry)


def resolve(
    family: str,
    mode: str,
    duration: int,
    orientation: str,
    resolution: str = RESOLUTION_720P,
) -> Optional[Tuple[str, int]]:
    """解析 (family, mode, duration, orientation, resolution) -> (flow_model_key, max_ref_img)。"""
    res = resolve_entry(family, mode, duration, orientation, resolution)
    if res is None:
        return None
    key, entry = res
    return (key, entry.max_ref_img)


def supported_durations(family: str, mode: str, resolution: str = RESOLUTION_720P) -> List[int]:
    """返回某 (family, mode) 支持的全部时长（升序）。

    无效组合返回空列表。
    """
    return sorted(_table_for(resolution).get((family, mode), {}).keys())


def is_supported(family: str, mode: str, duration: int, resolution: str = RESOLUTION_720P) -> bool:
    """判断 (family, mode, duration) 组合是否受支持。"""
    return duration in _table_for(resolution).get((family, mode), {})


def max_ref_images(family: str, mode: str, duration: int, resolution: str = RESOLUTION_720P) -> int:
    """返回该组合允许的最大参考图数量（r2v/edit/extend 之外恒为 0）。"""
    entry = _table_for(resolution).get((family, mode), {}).get(duration)
    return entry.max_ref_img if entry is not None else 0


def max_ref_audios(family: str, mode: str, duration: int, resolution: str = RESOLUTION_720P) -> int:
    """返回该组合允许的最大参考音频/音色数量（omni r2v=5, edit=3, extend=3，其余为 0）。"""
    entry = _table_for(resolution).get((family, mode), {}).get(duration)
    return entry.max_ref_audio if entry is not None else 0


def max_video_duration(family: str, mode: str, duration: int, resolution: str = RESOLUTION_720P) -> int:
    """返回该组合允许的输入参考视频最大时长（秒；edit=15, extend=30，其余为 0）。"""
    entry = _table_for(resolution).get((family, mode), {}).get(duration)
    return entry.max_video_duration_sec if entry is not None else 0
