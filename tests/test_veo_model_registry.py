#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""veo_model_registry + /v1/videos API validasyonu birim testleri."""

from __future__ import annotations

import os
import sys
import types
import unittest

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from src.services import veo_model_registry as reg  # noqa: E402


EXPECTED = {
    # 5.1 t2v ----------------------------------------------------------------
    ("omni_flash", "t2v", 4): ("abra_t2v_4s", "abra_t2v_4s", 0),
    ("omni_flash", "t2v", 6): ("abra_t2v_6s", "abra_t2v_6s", 0),
    ("omni_flash", "t2v", 8): ("abra_t2v_8s", "abra_t2v_8s", 0),
    ("omni_flash", "t2v", 10): ("abra_t2v_10s", "abra_t2v_10s", 0),
    **{
        ("omni_1_2_flash", "t2v", d): (f"macaron_cookie_t2v_{d}s", f"macaron_cookie_t2v_{d}s", 0)
        for d in range(3, 16)
    },
    ("veo_lite", "t2v", 4): ("veo_3_1_t2v_lite_4s", "veo_3_1_t2v_lite_4s", 0),
    ("veo_lite", "t2v", 6): ("veo_3_1_t2v_lite_6s", "veo_3_1_t2v_lite_6s", 0),
    ("veo_lite", "t2v", 8): ("veo_3_1_t2v_lite", "veo_3_1_t2v_lite", 0),
    ("veo_fast", "t2v", 4): ("veo_3_1_t2v_fast_4s", "veo_3_1_t2v_fast_4s", 0),
    ("veo_fast", "t2v", 6): ("veo_3_1_t2v_fast_6s", "veo_3_1_t2v_fast_6s", 0),
    ("veo_fast", "t2v", 8): ("veo_3_1_t2v_fast_portrait_ultra", "veo_3_1_t2v_fast_ultra", 0),
    ("veo_quality", "t2v", 4): ("veo_3_1_t2v_quality_4s", "veo_3_1_t2v_quality_4s", 0),
    ("veo_quality", "t2v", 6): ("veo_3_1_t2v_quality_6s", "veo_3_1_t2v_quality_6s", 0),
    ("veo_quality", "t2v", 8): ("veo_3_1_t2v_portrait", "veo_3_1_t2v", 0),
    ("veo_lite_low", "t2v", 4): ("veo_3_1_t2v_lite_4s_low_priority", "veo_3_1_t2v_lite_4s_low_priority", 0),
    ("veo_lite_low", "t2v", 6): ("veo_3_1_t2v_lite_6s_low_priority", "veo_3_1_t2v_lite_6s_low_priority", 0),
    ("veo_lite_low", "t2v", 8): ("veo_3_1_t2v_lite_low_priority", "veo_3_1_t2v_lite_low_priority", 0),
    # 5.2 i2v ----------------------------------------------------------------
    ("omni_flash", "i2v", 4): ("abra_i2v_4s", "abra_i2v_4s", 0),
    ("omni_flash", "i2v", 6): ("abra_i2v_6s", "abra_i2v_6s", 0),
    ("omni_flash", "i2v", 8): ("abra_i2v_8s", "abra_i2v_8s", 0),
    ("omni_flash", "i2v", 10): ("abra_i2v_10s", "abra_i2v_10s", 0),
    **{
        ("omni_1_2_flash", "i2v", d): (f"macaron_cookie_i2v_{d}s", f"macaron_cookie_i2v_{d}s", 0)
        for d in range(3, 16)
    },
    ("veo_lite", "i2v", 4): ("veo_3_1_i2v_s_lite_4s", "veo_3_1_i2v_s_lite_4s", 0),
    ("veo_lite", "i2v", 6): ("veo_3_1_i2v_s_lite_6s", "veo_3_1_i2v_s_lite_6s", 0),
    ("veo_lite", "i2v", 8): ("veo_3_1_i2v_lite", "veo_3_1_i2v_lite", 0),
    ("veo_fast", "i2v", 4): ("veo_3_1_i2v_s_fast_4s", "veo_3_1_i2v_s_fast_4s", 0),
    ("veo_fast", "i2v", 6): ("veo_3_1_i2v_s_fast_6s", "veo_3_1_i2v_s_fast_6s", 0),
    ("veo_fast", "i2v", 8): ("veo_3_1_i2v_s_fast_portrait_ultra", "veo_3_1_i2v_s_fast_ultra", 0),
    ("veo_quality", "i2v", 4): ("veo_3_1_i2v_s_quality_4s", "veo_3_1_i2v_s_quality_4s", 0),
    ("veo_quality", "i2v", 6): ("veo_3_1_i2v_s_quality_6s", "veo_3_1_i2v_s_quality_6s", 0),
    ("veo_quality", "i2v", 8): ("veo_3_1_i2v_s_portrait", "veo_3_1_i2v_s", 0),
    ("veo_lite_low", "i2v", 4): ("veo_3_1_i2v_s_lite_4s_low_priority", "veo_3_1_i2v_s_lite_4s_low_priority", 0),
    ("veo_lite_low", "i2v", 6): ("veo_3_1_i2v_s_lite_6s_low_priority", "veo_3_1_i2v_s_lite_6s_low_priority", 0),
    ("veo_lite_low", "i2v", 8): ("veo_3_1_i2v_lite_low_priority", "veo_3_1_i2v_lite_low_priority", 0),
    # 5.3 start_end ----------------------------------------------------------
    ("omni_flash", "start_end", 4): ("omni_flash_i2v_4s_first_last", "omni_flash_i2v_4s_first_last", 0),
    ("omni_flash", "start_end", 6): ("omni_flash_i2v_6s_first_last", "omni_flash_i2v_6s_first_last", 0),
    ("omni_flash", "start_end", 8): ("omni_flash_i2v_8s_first_last", "omni_flash_i2v_8s_first_last", 0),
    ("omni_flash", "start_end", 10): ("omni_flash_i2v_10s_first_last", "omni_flash_i2v_10s_first_last", 0),
    **{
        ("omni_1_2_flash", "start_end", d): (f"macaron_cookie_i2v_fl_{d}s", f"macaron_cookie_i2v_fl_{d}s", 0)
        for d in range(3, 11)
    },
    ("veo_lite", "start_end", 4): ("veo_3_1_i2v_s_lite_4s_fl", "veo_3_1_i2v_s_lite_4s_fl", 0),
    ("veo_lite", "start_end", 6): ("veo_3_1_i2v_s_lite_6s_fl", "veo_3_1_i2v_s_lite_6s_fl", 0),
    ("veo_lite", "start_end", 8): ("veo_3_1_interpolation_lite", "veo_3_1_interpolation_lite", 0),
    ("veo_fast", "start_end", 4): ("veo_3_1_i2v_s_fast_4s_fl", "veo_3_1_i2v_s_fast_4s_fl", 0),
    ("veo_fast", "start_end", 6): ("veo_3_1_i2v_s_fast_6s_fl", "veo_3_1_i2v_s_fast_6s_fl", 0),
    ("veo_fast", "start_end", 8): ("veo_3_1_i2v_s_fast_portrait_ultra_fl", "veo_3_1_i2v_s_fast_ultra_fl", 0),
    ("veo_quality", "start_end", 4): ("veo_3_1_i2v_s_quality_4s_fl", "veo_3_1_i2v_s_quality_4s_fl", 0),
    ("veo_quality", "start_end", 6): ("veo_3_1_i2v_s_quality_6s_fl", "veo_3_1_i2v_s_quality_6s_fl", 0),
    ("veo_quality", "start_end", 8): ("veo_3_1_i2v_s_portrait_fl", "veo_3_1_i2v_s_fl", 0),
    ("veo_lite_low", "start_end", 4): ("veo_3_1_i2v_s_lite_4s_fl_low_priority", "veo_3_1_i2v_s_lite_4s_fl_low_priority", 0),
    ("veo_lite_low", "start_end", 6): ("veo_3_1_i2v_s_lite_6s_fl_low_priority", "veo_3_1_i2v_s_lite_6s_fl_low_priority", 0),
    ("veo_lite_low", "start_end", 8): ("veo_3_1_interpolation_lite_low_priority", "veo_3_1_interpolation_lite_low_priority", 0),
    # 5.4 r2v ----------------------------------------------------------------
    ("omni_flash", "r2v", 4): ("abra_r2v_4s", "abra_r2v_4s", 7),
    ("omni_flash", "r2v", 6): ("abra_r2v_6s", "abra_r2v_6s", 7),
    ("omni_flash", "r2v", 8): ("abra_r2v_8s", "abra_r2v_8s", 7),
    ("omni_flash", "r2v", 10): ("abra_r2v_10s", "abra_r2v_10s", 7),
    **{
        ("omni_1_2_flash", "r2v", d): (f"macaron_cookie_r2v_{d}s", f"macaron_cookie_r2v_{d}s", 7)
        for d in range(3, 16)
    },
    ("veo_lite", "r2v", 8): ("veo_3_1_r2v_lite", "veo_3_1_r2v_lite", 3),
    ("veo_fast", "r2v", 8): ("veo_3_1_r2v_fast_portrait_ultra", "veo_3_1_r2v_fast_landscape_ultra", 3),
    ("veo_lite_low", "r2v", 8): ("veo_3_1_r2v_lite_low_priority", "veo_3_1_r2v_lite_low_priority", 3),
    # 5.5 edit (Omni 1.1 Flash & Omni 1.2 Flash) -----------------------------
    **{
        ("omni_flash", "edit", d): ("abra_edit", "abra_edit", 5)
        for d in (4, 6, 8, 10)
    },
    **{
        ("omni_1_2_flash", "edit", d): ("macaron_cookie_edit", "macaron_cookie_edit", 5)
        for d in range(3, 16)
    },
    # 5.6 extend (Omni 1.2 Flash only) ---------------------------------------
    **{
        ("omni_1_2_flash", "extend", d): (f"macaron_cookie_extend_{d}s", f"macaron_cookie_extend_{d}s", 3)
        for d in range(3, 11)
    },
}


class TestRegistryFullCoverage(unittest.TestCase):
    """A. TUM satirlar resolve() ile dogrulanir."""

    def test_total_entry_count(self):
        total = sum(len(durs) for durs in reg._REGISTRY.values())
        self.assertEqual(total, len(EXPECTED))

    def test_every_expected_row_resolves_correctly(self):
        for (family, mode, dur), (p_key, l_key, max_ref) in EXPECTED.items():
            with self.subTest(family=family, mode=mode, dur=dur):
                land = reg.resolve(family, mode, dur, "landscape")
                self.assertIsNotNone(land, "landscape resolve None donmemeli")
                self.assertEqual(land, (l_key, max_ref))

                port = reg.resolve(family, mode, dur, "portrait")
                self.assertIsNotNone(port, "portrait resolve None donmemeli")
                self.assertEqual(port, (p_key, max_ref))

                self.assertEqual(reg.max_ref_images(family, mode, dur), max_ref)

    def test_registry_matches_expected_exactly(self):
        actual = {}
        for (family, mode), durs in reg._REGISTRY.items():
            for dur, entry in durs.items():
                actual[(family, mode, dur)] = (
                    entry.portrait_key,
                    entry.landscape_key,
                    entry.max_ref_img,
                )
        self.assertEqual(actual, EXPECTED)

    def test_all_combinations_resolve_non_empty(self):
        seen = 0
        for (family, mode), durs in reg._REGISTRY.items():
            for dur in durs:
                for orient in ("landscape", "portrait"):
                    res = reg.resolve(family, mode, dur, orient)
                    self.assertIsNotNone(res, f"{family}/{mode}/{dur}/{orient}")
                    key, _max_ref = res
                    self.assertTrue(key and key.strip(), "flow key bos olmamali")
                seen += 1
        self.assertEqual(seen, len(EXPECTED))

    def test_critical_rows_explicit(self):
        # t2v omni 1.1 flash (`abra`)
        self.assertEqual(reg.resolve("omni_flash", "t2v", 4, "landscape"), ("abra_t2v_4s", 0))
        self.assertEqual(reg.resolve("omni_flash", "t2v", 6, "landscape"), ("abra_t2v_6s", 0))
        self.assertEqual(reg.resolve("omni_flash", "t2v", 8, "landscape"), ("abra_t2v_8s", 0))
        self.assertEqual(reg.resolve("omni_flash", "t2v", 10, "landscape"), ("abra_t2v_10s", 0))
        self.assertIsNone(reg.resolve("omni_flash", "t2v", 15, "landscape"))
        # t2v omni 1.2 flash (`macaron_cookie`)
        self.assertEqual(reg.resolve("omni_1_2_flash", "t2v", 4, "landscape"), ("macaron_cookie_t2v_4s", 0))
        self.assertEqual(reg.resolve("omni_1_2_flash", "t2v", 15, "landscape"), ("macaron_cookie_t2v_15s", 0))
        # t2v fast 8 land/portrait
        self.assertEqual(reg.resolve("veo_fast", "t2v", 8, "landscape"), ("veo_3_1_t2v_fast_ultra", 0))
        self.assertEqual(reg.resolve("veo_fast", "t2v", 8, "portrait"), ("veo_3_1_t2v_fast_portrait_ultra", 0))
        # t2v quality 8 land/portrait
        self.assertEqual(reg.resolve("veo_quality", "t2v", 8, "landscape"), ("veo_3_1_t2v", 0))
        self.assertEqual(reg.resolve("veo_quality", "t2v", 8, "portrait"), ("veo_3_1_t2v_portrait", 0))
        # r2v omni 1.1 vs 1.2 (max_ref 7, max_audio 5)
        self.assertEqual(reg.resolve("omni_flash", "r2v", 8, "landscape"), ("abra_r2v_8s", 7))
        self.assertEqual(reg.max_ref_audios("omni_flash", "r2v", 8), 5)
        self.assertEqual(reg.resolve("omni_1_2_flash", "r2v", 8, "landscape"), ("macaron_cookie_r2v_8s", 7))
        self.assertEqual(reg.max_ref_audios("omni_1_2_flash", "r2v", 8), 5)
        # edit & extend omni 1.1 vs 1.2
        self.assertEqual(reg.resolve("omni_flash", "edit", 10, "landscape"), ("abra_edit", 5))
        self.assertEqual(reg.max_video_duration("omni_flash", "edit", 10), 10)
        self.assertIsNone(reg.resolve("omni_flash", "extend", 8, "landscape"))
        self.assertEqual(reg.resolve("omni_1_2_flash", "edit", 10, "landscape"), ("macaron_cookie_edit", 5))
        self.assertEqual(reg.max_ref_audios("omni_1_2_flash", "edit", 10), 3)
        self.assertEqual(reg.max_video_duration("omni_1_2_flash", "edit", 10), 15)
        self.assertEqual(reg.resolve("omni_1_2_flash", "extend", 8, "landscape"), ("macaron_cookie_extend_8s", 3))
        self.assertEqual(reg.max_ref_audios("omni_1_2_flash", "extend", 8), 3)
        self.assertEqual(reg.max_video_duration("omni_1_2_flash", "extend", 8), 30)

    def test_api_model_to_family_mapping(self):
        self.assertEqual(reg.API_MODEL_TO_FAMILY["veo-3-1"], "veo_quality")
        self.assertEqual(reg.API_MODEL_TO_FAMILY["veo-3-1-fast"], "veo_fast")
        self.assertEqual(reg.API_MODEL_TO_FAMILY["veo-3-1-lite"], "veo_lite")
        self.assertEqual(reg.API_MODEL_TO_FAMILY["veo-3-1-lite-low"], "veo_lite_low")
        for alias in (
            "veo-omni-flash",
            "veo-omni-1-1-flash",
            "veo-omni-1.1-flash",
            "veo-omni-flash-1-1",
            "veo-omni-flash-1.1",
            "omni-1-1-flash",
            "omni-1.1-flash",
            "veo-omni-flash-video-edit",
            "veo-omni-1-1-flash-video-edit",
            "veo-omni-1.1-flash-video-edit",
            "omni-1.1-flash-video-edit",
        ):
            self.assertEqual(reg.API_MODEL_TO_FAMILY[alias], "omni_flash", alias)
        for alias in (
            "veo-omni-1-2-flash",
            "veo-omni-1.2-flash",
            "veo-omni-flash-1-2",
            "veo-omni-flash-1.2",
            "omni-1-2-flash",
            "omni-1.2-flash",
            "veo-omni-1-2-flash-video-edit",
            "veo-omni-1.2-flash-video-edit",
            "omni-1.2-flash-video-edit",
            "veo-omni-1-2-flash-video-extend",
            "veo-omni-1.2-flash-video-extend",
            "omni-1.2-flash-video-extend",
            "veo-omni-flash-video-extend",
        ):
            self.assertEqual(reg.API_MODEL_TO_FAMILY[alias], "omni_1_2_flash", alias)


class TestRegistryUnsupported(unittest.TestCase):
    """B. Desteklenmeyen kombinasyonlar None doner; yardimcilar tutarli."""

    def test_quality_r2v_unsupported(self):
        self.assertIsNone(reg.resolve("veo_quality", "r2v", 8, "landscape"))
        self.assertFalse(reg.is_supported("veo_quality", "r2v", 8))
        self.assertEqual(reg.supported_durations("veo_quality", "r2v"), [])

    def test_omni_start_end_supported(self):
        self.assertEqual(
            reg.resolve("omni_flash", "start_end", 8, "landscape"),
            ("omni_flash_i2v_8s_first_last", 0),
        )
        self.assertEqual(reg.supported_durations("omni_flash", "start_end"), [4, 6, 8, 10])
        self.assertEqual(
            reg.resolve("omni_1_2_flash", "start_end", 8, "landscape"),
            ("macaron_cookie_i2v_fl_8s", 0),
        )
        self.assertTrue(reg.is_supported("omni_1_2_flash", "start_end", 8))
        self.assertEqual(reg.supported_durations("omni_1_2_flash", "start_end"), list(range(3, 11)))
        self.assertFalse(reg.is_supported("omni_1_2_flash", "start_end", 12))

    def test_veo_families_no_10s(self):
        for fam in ("veo_fast", "veo_lite", "veo_quality", "veo_lite_low"):
            self.assertIsNone(reg.resolve(fam, "t2v", 10, "landscape"), fam)
            self.assertFalse(reg.is_supported(fam, "t2v", 10), fam)

    def test_veo_r2v_only_8s(self):
        self.assertIsNone(reg.resolve("veo_lite", "r2v", 4, "landscape"))
        self.assertIsNone(reg.resolve("veo_fast", "r2v", 6, "landscape"))
        self.assertIsNone(reg.resolve("veo_lite_low", "r2v", 10, "landscape"))
        self.assertEqual(reg.supported_durations("veo_lite", "r2v"), [8])
        self.assertEqual(reg.supported_durations("veo_fast", "r2v"), [8])
        self.assertEqual(reg.supported_durations("veo_lite_low", "r2v"), [8])

    def test_unknown_family_or_mode(self):
        self.assertIsNone(reg.resolve("nope", "t2v", 8, "landscape"))
        self.assertIsNone(reg.resolve("veo_fast", "nope", 8, "landscape"))
        self.assertEqual(reg.max_ref_images("nope", "t2v", 8), 0)
        self.assertFalse(reg.is_supported("nope", "t2v", 8))

    def test_is_supported_consistent_with_supported_durations(self):
        for (family, mode) in reg._REGISTRY:
            durs = reg.supported_durations(family, mode)
            for d in range(2, 17):
                self.assertEqual(
                    reg.is_supported(family, mode, d),
                    d in durs,
                    f"{family}/{mode}/{d}",
                )

    def test_supported_durations_sorted(self):
        self.assertEqual(reg.supported_durations("omni_flash", "t2v"), [4, 6, 8, 10])
        self.assertEqual(reg.supported_durations("omni_1_2_flash", "t2v"), list(range(3, 16)))
        self.assertEqual(reg.supported_durations("veo_quality", "t2v"), [4, 6, 8])


class _StubHTTPException(Exception):
    def __init__(self, status_code: int = 400, detail=None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _install_routes_stubs():
    fastapi = types.ModuleType("fastapi")

    class _Router:
        def _decorator(self, *_a, **_k):
            def wrap(fn):
                return fn
            return wrap

        def __getattr__(self, _name):
            return self._decorator

    def _passthrough(*_a, **_k):
        return None

    fastapi.APIRouter = _Router
    fastapi.Depends = _passthrough
    fastapi.Body = _passthrough
    fastapi.HTTPException = _StubHTTPException
    sys.modules["fastapi"] = fastapi

    fastapi_responses = types.ModuleType("fastapi.responses")

    class _JSONResponse:
        def __init__(self, *a, **k):
            self.args = a
            self.kwargs = k

    fastapi_responses.JSONResponse = _JSONResponse
    sys.modules["fastapi.responses"] = fastapi_responses

    pydantic = types.ModuleType("pydantic")

    class _BaseModel:
        model_config: dict = {}

        def __init_subclass__(cls, **kwargs):
            super().__init_subclass__(**kwargs)

    def _Field(*_a, **_k):
        return None

    pydantic.BaseModel = _BaseModel
    pydantic.Field = _Field
    sys.modules["pydantic"] = pydantic

    def _make_module(name, attrs):
        mod = types.ModuleType(name)
        for k, v in attrs.items():
            setattr(mod, k, v)
        sys.modules[name] = mod
        return mod

    _make_module("src.core.auth", {"verify_api_key_header": _passthrough})
    _make_module("src.core.database", {"Database": type("Database", (), {})})
    _make_module("src.core.models", {"TaskStatusResponse": type("TaskStatusResponse", (), {})})
    _make_module(
        "src.core.public_api_limits",
        {
            "DEFAULT_PUBLIC_CREATE_TASK_MAX_INFLIGHT": 100,
            "DEFAULT_SERVER_COUNT": 1,
            "calc_public_browser_pool_limit": _passthrough,
            "normalize_public_create_task_max_inflight": _passthrough,
            "normalize_server_count": _passthrough,
        },
    )
    _make_module("src.services.task_service", {"TaskService": type("TaskService", (), {})})
    _make_module(
        "src.services.task_handler_registry",
        {
            "CreateTaskContext": type("CreateTaskContext", (), {}),
            "get_create_task_handler": _passthrough,
        },
    )


def _try_import_normalizer():
    try:
        from src.api.routes import _normalize_video_task_payload  # type: ignore
        try:
            from fastapi import HTTPException as _HE  # type: ignore
        except Exception:
            _HE = _StubHTTPException
        return _normalize_video_task_payload, _HE, None
    except Exception:
        pass

    try:
        _install_routes_stubs()
        from src.api.routes import _normalize_video_task_payload  # type: ignore
        return _normalize_video_task_payload, _StubHTTPException, None
    except Exception as exc:  # pragma: no cover
        return None, None, f"import basarisiz: {exc!r}"


_NORMALIZE, _HTTP_EXC, _SKIP_REASON = _try_import_normalizer()


@unittest.skipIf(_NORMALIZE is None, f"_normalize_video_task_payload import edilemedi: {_SKIP_REASON}")
class TestApiNormalizeVideoPayload(unittest.TestCase):
    """C. _normalize_video_task_payload duration/aile validasyonu."""

    def test_veo_3_1_duration_8_ok(self):
        task_type, payload = _NORMALIZE({"model": "veo-3-1", "prompt": "x", "duration": 8})
        self.assertEqual(task_type, "veo_workflow")
        self.assertEqual(payload["veo_family"], "veo_quality")
        self.assertNotIn("video_model", payload)
        self.assertGreater(int(payload["n_frames"]), 1)
        self.assertEqual(payload["duration"], 8)

    def test_veo_3_1_duration_10_rejected(self):
        with self.assertRaises(_HTTP_EXC) as ctx:
            _NORMALIZE({"model": "veo-3-1", "prompt": "x", "duration": 10})
        self.assertEqual(getattr(ctx.exception, "status_code", None), 400)

    def test_veo_omni_flash_duration_10_ok(self):
        task_type, payload = _NORMALIZE({"model": "veo-omni-flash", "prompt": "x", "duration": 10})
        self.assertEqual(task_type, "veo_workflow")
        self.assertEqual(payload["veo_family"], "omni_flash")
        self.assertEqual(payload["duration"], 10)
        self.assertNotIn("video_model", payload)

    def test_veo_omni_flash_duration_15_rejected_for_1_1_but_ok_for_1_2(self):
        with self.assertRaises(_HTTP_EXC) as ctx:
            _NORMALIZE({"model": "veo-omni-flash", "prompt": "x", "duration": 15})
        self.assertEqual(getattr(ctx.exception, "status_code", None), 400)

        task_type, payload = _NORMALIZE({"model": "veo-omni-1-2-flash", "prompt": "x", "duration": 15})
        self.assertEqual(task_type, "veo_workflow")
        self.assertEqual(payload["veo_family"], "omni_1_2_flash")
        self.assertEqual(payload["duration"], 15)

    def test_veo_omni_flash_video_extend_ok(self):
        task_type, payload = _NORMALIZE(
            {"model": "veo-omni-1-2-flash-video-extend", "prompt": "extend scene", "video_url": "https://example.com/in.mp4"}
        )
        self.assertEqual(task_type, "veo_workflow")
        self.assertEqual(payload["veo_family"], "omni_1_2_flash")
        self.assertEqual(payload["video_mode"], "extend")
        self.assertEqual(payload["duration"], 8)
        self.assertEqual(payload["video_url"], "https://example.com/in.mp4")

    def test_veo_3_1_fast_duration_4_ok(self):
        task_type, payload = _NORMALIZE({"model": "veo-3-1-fast", "prompt": "x", "duration": 4})
        self.assertEqual(task_type, "veo_workflow")
        self.assertEqual(payload["veo_family"], "veo_fast")
        self.assertEqual(payload["duration"], 4)

    def test_unknown_model_rejected(self):
        with self.assertRaises(_HTTP_EXC) as ctx:
            _NORMALIZE({"model": "totally-unknown", "prompt": "x"})
        self.assertEqual(getattr(ctx.exception, "status_code", None), 400)

    def test_veo_3_1_default_duration_is_8(self):
        _t, payload = _NORMALIZE({"model": "veo-3-1", "prompt": "x"})
        self.assertEqual(payload["duration"], 8)

    def test_omni_default_duration_is_10(self):
        _t1, payload1 = _NORMALIZE({"model": "veo-omni-flash", "prompt": "x"})
        self.assertEqual(payload1["duration"], 10)
        _t2, payload2 = _NORMALIZE({"model": "veo-omni-1-2-flash", "prompt": "x"})
        self.assertEqual(payload2["duration"], 10)

    def test_omni_dot_aliases_and_1080p_variants(self):
        # Omni 1.1 dot alias
        _t, p11 = _NORMALIZE({"model": "omni-1.1-flash", "prompt": "x", "duration": 6})
        self.assertEqual(p11["veo_family"], "omni_flash")
        self.assertEqual(p11["duration"], 6)
        self.assertEqual(p11["resolution"], "720p")

        # Omni 1.2 dot alias + 13s duration
        _t, p12 = _NORMALIZE({"model": "omni-1.2-flash", "prompt": "x", "duration": 13})
        self.assertEqual(p12["veo_family"], "omni_1_2_flash")
        self.assertEqual(p12["duration"], 13)
        self.assertEqual(p12["resolution"], "720p")

        # -1080p suffix sets upscale_1080p=True and defaults resolution="1080p"
        _t, p1080 = _NORMALIZE({"model": "veo-omni-1.2-flash-1080p", "prompt": "x", "duration": 9})
        self.assertEqual(p1080["veo_family"], "omni_1_2_flash")
        self.assertTrue(p1080.get("upscale_1080p"))
        self.assertEqual(p1080["resolution"], "1080p")

        _t, p11_1080 = _NORMALIZE({"model": "omni-1.1-flash-1080p", "prompt": "x", "duration": 8})
        self.assertEqual(p11_1080["veo_family"], "omni_flash")
        self.assertTrue(p11_1080.get("upscale_1080p"))
        self.assertEqual(p11_1080["resolution"], "1080p")

        _t, pedit_1080 = _NORMALIZE(
            {"model": "veo-omni-1.2-flash-video-edit-1080p", "prompt": "edit", "video_url": "https://example.com/in.mp4"}
        )
        self.assertEqual(pedit_1080["veo_family"], "omni_1_2_flash")
        self.assertEqual(pedit_1080["video_mode"], "edit")
        self.assertEqual(pedit_1080["resolution"], "1080p")

        _t, pext_1080 = _NORMALIZE(
            {"model": "veo-omni-1.2-flash-video-extend-1080p", "prompt": "extend", "video_url": "https://example.com/in.mp4"}
        )
        self.assertEqual(pext_1080["veo_family"], "omni_1_2_flash")
        self.assertEqual(pext_1080["video_mode"], "extend")
        self.assertEqual(pext_1080["resolution"], "1080p")


class TestNative360p(unittest.TestCase):
    """D. omni_flash & omni_1_2_flash 360p native model key tablosu (Veo 3.1 ailelerinde 360p YOK)."""

    EXPECTED_360P = {
        ("omni_flash", "t2v", 4): ("abra_t2v_4s_360p", 0),
        ("omni_flash", "t2v", 6): ("abra_t2v_6s_360p", 0),
        ("omni_flash", "t2v", 8): ("abra_t2v_8s_360p", 0),
        ("omni_flash", "t2v", 10): ("abra_t2v_10s_360p", 0),
        ("omni_flash", "i2v", 4): ("abra_i2v_4s_360p", 0),
        ("omni_flash", "i2v", 6): ("abra_i2v_6s_360p", 0),
        ("omni_flash", "i2v", 8): ("abra_i2v_8s_360p", 0),
        ("omni_flash", "i2v", 10): ("abra_i2v_10s_360p", 0),
        ("omni_flash", "start_end", 4): ("omni_flash_i2v_4s_first_last_360p", 0),
        ("omni_flash", "start_end", 6): ("omni_flash_i2v_6s_first_last_360p", 0),
        ("omni_flash", "start_end", 8): ("omni_flash_i2v_8s_first_last_360p", 0),
        ("omni_flash", "start_end", 10): ("omni_flash_i2v_10s_first_last_360p", 0),
        ("omni_flash", "r2v", 4): ("abra_r2v_4s_360p", 7),
        ("omni_flash", "r2v", 6): ("abra_r2v_6s_360p", 7),
        ("omni_flash", "r2v", 8): ("abra_r2v_8s_360p", 7),
        ("omni_flash", "r2v", 10): ("abra_r2v_10s_360p", 7),
        **{
            ("omni_flash", "edit", d): ("abra_edit_360p", 5)
            for d in (4, 6, 8, 10)
        },
        **{
            ("omni_1_2_flash", "t2v", d): (f"macaron_cookie_t2v_{d}s_360p", 0)
            for d in range(3, 16)
        },
        **{
            ("omni_1_2_flash", "i2v", d): (f"macaron_cookie_i2v_{d}s_360p", 0)
            for d in range(3, 16)
        },
        **{
            ("omni_1_2_flash", "start_end", d): (f"macaron_cookie_i2v_fl_{d}s_360p", 0)
            for d in range(3, 11)
        },
        **{
            ("omni_1_2_flash", "r2v", d): (f"macaron_cookie_r2v_{d}s_360p", 7)
            for d in range(3, 16)
        },
        **{
            ("omni_1_2_flash", "edit", d): ("macaron_cookie_edit_360p", 5)
            for d in range(3, 16)
        },
        **{
            ("omni_1_2_flash", "extend", d): (f"macaron_cookie_extend_{d}s_360p", 3)
            for d in range(3, 11)
        },
    }

    def test_360p_table_matches_expected_exactly(self):
        actual = {}
        for (family, mode), rows in reg._REGISTRY_360P.items():
            for duration, entry in rows.items():
                self.assertEqual(
                    entry.portrait_key,
                    entry.landscape_key,
                    "omni 360p keylerinde yon ayrimi yok",
                )
                actual[(family, mode, duration)] = (entry.landscape_key, entry.max_ref_img)
        self.assertEqual(actual, self.EXPECTED_360P)

    def test_resolve_picks_360p_table(self):
        for (family, mode, duration), expected in self.EXPECTED_360P.items():
            for orientation in ("landscape", "portrait"):
                self.assertEqual(
                    reg.resolve(family, mode, duration, orientation, "360p"),
                    expected,
                    f"{family}/{mode}/{duration}s/{orientation}/360p",
                )

    def test_default_resolution_is_720p_table(self):
        self.assertEqual(
            reg.resolve("omni_flash", "t2v", 10, "landscape"),
            reg.resolve("omni_flash", "t2v", 10, "landscape", "720p"),
        )
        self.assertEqual(reg.resolve("omni_flash", "t2v", 10, "landscape"), ("abra_t2v_10s", 0))
        self.assertEqual(reg.resolve("omni_1_2_flash", "t2v", 10, "landscape"), ("macaron_cookie_t2v_10s", 0))

    def test_veo_families_have_no_360p(self):
        for family in ("veo_quality", "veo_fast", "veo_lite", "veo_lite_low"):
            self.assertFalse(reg.supports_360p(family), family)
            for mode in ("t2v", "i2v", "start_end", "r2v"):
                self.assertEqual(reg.supported_durations(family, mode, "360p"), [], f"{family}/{mode}")
                self.assertIsNone(reg.resolve(family, mode, 8, "landscape", "360p"))
        self.assertTrue(reg.supports_360p("omni_flash"))
        self.assertTrue(reg.supports_360p("omni_1_2_flash"))

    def test_1080p_and_4k_use_720p_table(self):
        base = reg.resolve("omni_flash", "i2v", 8, "landscape")
        for resolution in ("1080p", "4k", "", "anything-else"):
            self.assertEqual(reg.resolve("omni_flash", "i2v", 8, "landscape", resolution), base)


@unittest.skipIf(_NORMALIZE is None, f"_normalize_video_task_payload import edilemedi: {_SKIP_REASON}")
class TestApi360pValidation(unittest.TestCase):
    """E. /v1/videos resolution=360p sadece omni_flash ve omni_1_2_flash icin kabul edilir."""

    def test_omni_accepts_360p(self):
        _t, payload = _NORMALIZE(
            {"model": "veo-omni-flash", "prompt": "x", "duration": 8, "resolution": "360p"}
        )
        self.assertEqual(payload["resolution"], "360p")
        _t2, payload2 = _NORMALIZE(
            {"model": "veo-omni-1-2-flash", "prompt": "x", "duration": 8, "resolution": "360p"}
        )
        self.assertEqual(payload2["resolution"], "360p")

    def test_veo_3_1_rejects_360p(self):
        for model in ("veo-3-1", "veo-3-1-fast", "veo-3-1-lite", "veo-3-1-lite-low"):
            with self.assertRaises(_HTTP_EXC, msg=model) as ctx:
                _NORMALIZE({"model": model, "prompt": "x", "duration": 8, "resolution": "360p"})
            self.assertEqual(getattr(ctx.exception, "status_code", None), 400)

    def test_default_and_other_resolutions_unchanged(self):
        _t, payload = _NORMALIZE({"model": "veo-omni-flash", "prompt": "x", "duration": 10})
        self.assertEqual(payload["resolution"], "720p")
        for raw, want in (("1080p", "1080p"), ("4k", "4k"), ("720", "720p")):
            _t, payload = _NORMALIZE(
                {"model": "veo-omni-flash", "prompt": "x", "duration": 10, "resolution": raw}
            )
            self.assertEqual(payload["resolution"], want)

    def test_invalid_resolution_rejected(self):
        with self.assertRaises(_HTTP_EXC) as ctx:
            _NORMALIZE(
                {"model": "veo-omni-flash", "prompt": "x", "duration": 10, "resolution": "8k"}
            )
        self.assertEqual(getattr(ctx.exception, "status_code", None), 400)


class TestVeoWorkflowExecutorModes(unittest.TestCase):
    """F. veo_workflow_executor mod / ses / video / referans cozumleme testleri."""

    def test_resolve_extension_video_model_all_modes(self):
        from src.services.veo_workflow_executor import (
            _veo_resolve_extension_video_model_and_aspect,
            _veo_collect_ingredients_audio_refs,
            _veo_collect_ingredients_video_urls,
        )

        # 0. Omni 1.1 Flash (`omni_flash` -> `abra_*`)
        mk11, ar11, mr11 = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_flash", "duration": 8, "orientation": "landscape", "resolution": "720p"},
        )
        self.assertEqual(mk11, "abra_t2v_8s")
        self.assertEqual(ar11, "VIDEO_ASPECT_RATIO_LANDSCAPE")
        self.assertEqual(mr11, 0)

        # 1. Omni 1.2 Flash (`omni_1_2_flash` -> `macaron_cookie_*`) t2v 12s 720p
        mk, ar, mr = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_1_2_flash", "duration": 12, "orientation": "landscape", "resolution": "720p"},
        )
        self.assertEqual(mk, "macaron_cookie_t2v_12s")
        self.assertEqual(ar, "VIDEO_ASPECT_RATIO_LANDSCAPE")
        self.assertEqual(mr, 0)

        # 2. i2v 5s 360p portrait
        mk, ar, mr = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_1_2_flash", "duration": 5, "orientation": "portrait", "resolution": "360p"},
            want_i2v=True,
        )
        self.assertEqual(mk, "macaron_cookie_i2v_5s_360p")
        self.assertEqual(ar, "VIDEO_ASPECT_RATIO_PORTRAIT")
        self.assertEqual(mr, 0)

        # 3. start_end (2 images) 7s
        mk, ar, mr = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_1_2_flash", "duration": 7, "orientation": "landscape"},
            want_i2v=True,
            want_start_end=True,
        )
        self.assertEqual(mk, "macaron_cookie_i2v_fl_7s")
        self.assertEqual(mr, 0)

        # 4. r2v 14s
        mk, ar, mr = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_1_2_flash", "duration": 14, "orientation": "landscape"},
            want_ingredients=True,
        )
        self.assertEqual(mk, "macaron_cookie_r2v_14s")
        self.assertEqual(mr, 7)

        # 5. edit 720p & 360p (Omni 1.1 & Omni 1.2)
        mk_edit11, _, mr_edit11 = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_flash", "duration": 10, "resolution": "720p"},
            want_edit=True,
        )
        self.assertEqual(mk_edit11, "abra_edit")
        self.assertEqual(mr_edit11, 5)

        mk, _, mr = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_1_2_flash", "duration": 10, "resolution": "720p"},
            want_edit=True,
        )
        self.assertEqual(mk, "macaron_cookie_edit")
        self.assertEqual(mr, 5)
        mk360, _, mr360 = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_1_2_flash", "duration": 10, "resolution": "360p"},
            want_edit=True,
        )
        self.assertEqual(mk360, "macaron_cookie_edit_360p")
        self.assertEqual(mr360, 5)

        # 6. extend 9s 720p & 360p
        mk_ext, _, mr_ext = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_1_2_flash", "duration": 9, "resolution": "720p"},
            want_extend=True,
        )
        self.assertEqual(mk_ext, "macaron_cookie_extend_9s")
        self.assertEqual(mr_ext, 3)
        mk_ext360, _, mr_ext360 = _veo_resolve_extension_video_model_and_aspect(
            {"veo_family": "omni_1_2_flash", "duration": 9, "resolution": "360p"},
            want_extend=True,
        )
        self.assertEqual(mk_ext360, "macaron_cookie_extend_9s_360p")
        self.assertEqual(mr_ext360, 3)

        # 7. Audio refs normalization (up to 5 for r2v)
        audios = _veo_collect_ingredients_audio_refs(
            {"audio_urls": ["puck", "voices/kore", {"voice": "fenrir"}, "aoede", "charon"]},
            max_ref_audios=5,
        )
        self.assertEqual(
            audios,
            ["voices/puck", "voices/kore", "voices/fenrir", "voices/aoede", "voices/charon"],
        )

        # 8. Video URL collection (video_url & extend_video_url)
        vids = _veo_collect_ingredients_video_urls({"extend_video_url": "https://example.com/ext.mp4"})
        self.assertEqual(vids, ["https://example.com/ext.mp4"])

    def test_resolve_video_output_resolution_and_upsampler_keys(self):
        from src.services.veo_workflow_executor import _veo_resolve_video_output_resolution

        self.assertEqual(
            _veo_resolve_video_output_resolution({"resolution": "360p"}),
            ("360p", False, None, None),
        )
        self.assertEqual(
            _veo_resolve_video_output_resolution({"resolution": "720p"}),
            ("720p", False, None, None),
        )
        self.assertEqual(
            _veo_resolve_video_output_resolution({"resolution": "1080p"}),
            ("1080p", True, "VIDEO_RESOLUTION_1080P", "veo_3_1_upsampler_1080p"),
        )
        self.assertEqual(
            _veo_resolve_video_output_resolution({"resolution": "4k"}),
            ("4K", True, "VIDEO_RESOLUTION_4K", "veo_3_1_upsampler_4k"),
        )
        self.assertEqual(
            _veo_resolve_video_output_resolution({"upscale_1080p": True}),
            ("1080p", True, "VIDEO_RESOLUTION_1080P", "veo_3_1_upsampler_1080p"),
        )
        self.assertEqual(
            _veo_resolve_video_output_resolution({"resolution": "720p", "upscale_1080p": True}),
            ("1080p", True, "VIDEO_RESOLUTION_1080P", "veo_3_1_upsampler_1080p"),
        )

    def test_parallel_image_materialization_with_semaphore(self):
        import asyncio
        from unittest.mock import patch
        from src.services import veo_workflow_executor as vwe

        active = 0
        max_active = 0

        async def _fake_materialize_one(u, *, kind, index, total, progress_cb, log_file):
            nonlocal active, max_active
            active += 1
            if active > max_active:
                max_active = active
            await asyncio.sleep(0.01)
            active -= 1
            return f"http://127.0.0.1:8000/assets/veo_image_cache/{index}.jpg"

        async def _run():
            sem = asyncio.Semaphore(2)
            with patch.object(vwe, "_veo_extension_local_image_cache_enabled", return_value=True), patch.object(
                vwe, "_veo_materialize_image_for_extension", side_effect=_fake_materialize_one
            ):
                urls = [f"https://example.com/{i}.jpg" for i in range(6)]
                out = await vwe._veo_materialize_image_urls_for_extension(
                    urls,
                    kind="ingredients",
                    payload={},
                    progress_cb=vwe._noop_progress_cb,
                    log_file=None,
                    semaphore=sem,
                )
                return out

        res = asyncio.run(_run())
        self.assertEqual(len(res), 6)
        self.assertLessEqual(max_active, 2)
        self.assertGreaterEqual(max_active, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
