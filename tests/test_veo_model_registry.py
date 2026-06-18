#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""veo_model_registry + /v1/videos API validasyonu birim testleri.

Kapsam:
  A. Registry tam kapsam — design doc bolum 5'teki TUM (family, mode, duration)
     satirlari icin resolve() dogru (flow_key, max_ref) donduruyor mu (51 entry).
  B. Desteklenmeyen kombinasyonlar None donduruyor; is_supported /
     supported_durations tutarli.
  C. _normalize_video_task_payload (src/api/routes.py) duration/aile validasyonu.

Sadece standart kutuphane (`unittest`) kullanir; harici bagimlilik EKLEMEZ.

Calistirma:
    python3 -m pytest tests/test_veo_model_registry.py -q
veya
    python3 tests/test_veo_model_registry.py

NOT (C kismi): src/api/routes.py modul-seviyesinde `fastapi` / `pydantic` ve
`..core` / `..services` paketlerini import eder. Bu ortamda fastapi/pydantic
KURULU DEGIL. Bu nedenle, test edilen saf fonksiyon `_normalize_video_task_payload`
icin gereken minimal sahte (stub) moduller `sys.modules`'a enjekte edilir; boylece
GERCEK fonksiyon hicbir harici bagimlilik kurulmadan calistirilir. Stub'lar yalnizca
import zamani gereksinimlerini (HTTPException, BaseModel, Field, APIRouter, Depends,
Body, JSONResponse ve birkac core/service sembolu) karsilar — fonksiyon mantigi
degistirilmez.
"""

from __future__ import annotations

import os
import sys
import types
import unittest

# --- repo kokunu import yoluna ekle (tests/ -> repo koku) ----------------------
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from src.services import veo_model_registry as reg  # noqa: E402


# ---------------------------------------------------------------------------
# Design doc bolum 5'in BIREBIR beklenen tablosu.
# Her satir: (family, mode, duration) -> (portrait_key, landscape_key, max_ref)
# ---------------------------------------------------------------------------
EXPECTED = {
    # 5.1 t2v ----------------------------------------------------------------
    ("omni_flash", "t2v", 4): ("abra_t2v_4s", "abra_t2v_4s", 0),
    ("omni_flash", "t2v", 6): ("abra_t2v_6s", "abra_t2v_6s", 0),
    ("omni_flash", "t2v", 8): ("abra_t2v_8s", "abra_t2v_8s", 0),
    ("omni_flash", "t2v", 10): ("abra_t2v_10s", "abra_t2v_10s", 0),
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
    ("veo_lite", "r2v", 8): ("veo_3_1_r2v_lite", "veo_3_1_r2v_lite", 3),
    ("veo_fast", "r2v", 8): ("veo_3_1_r2v_fast_portrait_ultra", "veo_3_1_r2v_fast_landscape_ultra", 3),
    ("veo_lite_low", "r2v", 8): ("veo_3_1_r2v_lite_low_priority", "veo_3_1_r2v_lite_low_priority", 3),
}


class TestRegistryFullCoverage(unittest.TestCase):
    """A. Design doc bolum 5'teki TUM satirlar resolve() ile dogrulanir."""

    def test_total_entry_count_is_51(self):
        total = sum(len(durs) for durs in reg._REGISTRY.values())
        self.assertEqual(total, 51, "registry toplam entry sayisi 51 olmali")
        self.assertEqual(len(EXPECTED), 51, "beklenen tablo da 51 satir icermeli")

    def test_every_expected_row_resolves_correctly(self):
        """Beklenen tablonun her satiri icin landscape + portrait dogru."""
        for (family, mode, dur), (p_key, l_key, max_ref) in EXPECTED.items():
            with self.subTest(family=family, mode=mode, dur=dur):
                land = reg.resolve(family, mode, dur, "landscape")
                self.assertIsNotNone(land, "landscape resolve None donmemeli")
                self.assertEqual(land, (l_key, max_ref))

                port = reg.resolve(family, mode, dur, "portrait")
                self.assertIsNotNone(port, "portrait resolve None donmemeli")
                self.assertEqual(port, (p_key, max_ref))

                # max_ref_images yardimcisi entry ile tutarli
                self.assertEqual(reg.max_ref_images(family, mode, dur), max_ref)

    def test_registry_matches_expected_exactly(self):
        """_REGISTRY'deki her gercek satir EXPECTED'te birebir var (ekstra yok)."""
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
        """Tum (family, mode, duration) kombinasyonlari icin resolve None DEGIL,
        ve key bos degil."""
        seen = 0
        for (family, mode), durs in reg._REGISTRY.items():
            for dur in durs:
                for orient in ("landscape", "portrait"):
                    res = reg.resolve(family, mode, dur, orient)
                    self.assertIsNotNone(res, f"{family}/{mode}/{dur}/{orient}")
                    key, _max_ref = res
                    self.assertTrue(key and key.strip(), "flow key bos olmamali")
                seen += 1
        self.assertEqual(seen, 51)

    def test_critical_rows_explicit(self):
        """Lead'in acikca istedigi kritik satirlar (ekstra net assert)."""
        # t2v omni
        self.assertEqual(reg.resolve("omni_flash", "t2v", 4, "landscape"), ("abra_t2v_4s", 0))
        self.assertEqual(reg.resolve("omni_flash", "t2v", 6, "landscape"), ("abra_t2v_6s", 0))
        self.assertEqual(reg.resolve("omni_flash", "t2v", 8, "landscape"), ("abra_t2v_8s", 0))
        self.assertEqual(reg.resolve("omni_flash", "t2v", 10, "landscape"), ("abra_t2v_10s", 0))
        # t2v fast 8 land/portrait
        self.assertEqual(reg.resolve("veo_fast", "t2v", 8, "landscape"), ("veo_3_1_t2v_fast_ultra", 0))
        self.assertEqual(reg.resolve("veo_fast", "t2v", 8, "portrait"), ("veo_3_1_t2v_fast_portrait_ultra", 0))
        # t2v quality 8 land/portrait
        self.assertEqual(reg.resolve("veo_quality", "t2v", 8, "landscape"), ("veo_3_1_t2v", 0))
        self.assertEqual(reg.resolve("veo_quality", "t2v", 8, "portrait"), ("veo_3_1_t2v_portrait", 0))
        # t2v lite 8 + lite_low 4
        self.assertEqual(reg.resolve("veo_lite", "t2v", 8, "landscape"), ("veo_3_1_t2v_lite", 0))
        self.assertEqual(reg.resolve("veo_lite_low", "t2v", 4, "landscape"), ("veo_3_1_t2v_lite_4s_low_priority", 0))
        # i2v quality 8 land/portrait + fast 8
        self.assertEqual(reg.resolve("veo_quality", "i2v", 8, "landscape"), ("veo_3_1_i2v_s", 0))
        self.assertEqual(reg.resolve("veo_quality", "i2v", 8, "portrait"), ("veo_3_1_i2v_s_portrait", 0))
        self.assertEqual(reg.resolve("veo_fast", "i2v", 8, "landscape"), ("veo_3_1_i2v_s_fast_ultra", 0))
        # start_end quality 8 land/portrait + lite 8
        self.assertEqual(reg.resolve("veo_quality", "start_end", 8, "landscape"), ("veo_3_1_i2v_s_fl", 0))
        self.assertEqual(reg.resolve("veo_quality", "start_end", 8, "portrait"), ("veo_3_1_i2v_s_portrait_fl", 0))
        self.assertEqual(reg.resolve("veo_lite", "start_end", 8, "landscape"), ("veo_3_1_interpolation_lite", 0))
        # r2v omni 8 (max_ref 7), fast 8 land/portrait (max_ref 3), lite 8 (max_ref 3)
        self.assertEqual(reg.resolve("omni_flash", "r2v", 8, "landscape"), ("abra_r2v_8s", 7))
        self.assertEqual(reg.resolve("veo_fast", "r2v", 8, "landscape"), ("veo_3_1_r2v_fast_landscape_ultra", 3))
        self.assertEqual(reg.resolve("veo_fast", "r2v", 8, "portrait"), ("veo_3_1_r2v_fast_portrait_ultra", 3))
        self.assertEqual(reg.resolve("veo_lite", "r2v", 8, "landscape"), ("veo_3_1_r2v_lite", 3))

    def test_api_model_to_family_mapping(self):
        self.assertEqual(reg.API_MODEL_TO_FAMILY["veo-3-1"], "veo_quality")
        self.assertEqual(reg.API_MODEL_TO_FAMILY["veo-3-1-fast"], "veo_fast")
        self.assertEqual(reg.API_MODEL_TO_FAMILY["veo-3-1-lite"], "veo_lite")
        self.assertEqual(reg.API_MODEL_TO_FAMILY["veo-3-1-lite-low"], "veo_lite_low")
        self.assertEqual(reg.API_MODEL_TO_FAMILY["veo-omni-flash"], "omni_flash")


class TestRegistryUnsupported(unittest.TestCase):
    """B. Desteklenmeyen kombinasyonlar None doner; yardimcilar tutarli."""

    def test_quality_r2v_unsupported(self):
        self.assertIsNone(reg.resolve("veo_quality", "r2v", 8, "landscape"))
        self.assertFalse(reg.is_supported("veo_quality", "r2v", 8))
        self.assertEqual(reg.supported_durations("veo_quality", "r2v"), [])

    def test_omni_start_end_unsupported(self):
        self.assertIsNone(reg.resolve("omni_flash", "start_end", 8, "landscape"))
        self.assertFalse(reg.is_supported("omni_flash", "start_end", 8))
        self.assertEqual(reg.supported_durations("omni_flash", "start_end"), [])

    def test_veo_families_no_10s(self):
        # Veo aileleri (fast/lite/quality/lite_low) 10s desteklemez.
        for fam in ("veo_fast", "veo_lite", "veo_quality", "veo_lite_low"):
            self.assertIsNone(reg.resolve(fam, "t2v", 10, "landscape"), fam)
            self.assertFalse(reg.is_supported(fam, "t2v", 10), fam)

    def test_veo_r2v_only_8s(self):
        # Veo r2v aileleri sadece 8s; 4/6/10 desteklenmez.
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
        """is_supported(f,m,d) <=> d in supported_durations(f,m), tum durlar icin."""
        for (family, mode) in reg._REGISTRY:
            durs = reg.supported_durations(family, mode)
            for d in (4, 6, 8, 10):
                self.assertEqual(
                    reg.is_supported(family, mode, d),
                    d in durs,
                    f"{family}/{mode}/{d}",
                )

    def test_supported_durations_sorted(self):
        self.assertEqual(reg.supported_durations("omni_flash", "t2v"), [4, 6, 8, 10])
        self.assertEqual(reg.supported_durations("veo_quality", "t2v"), [4, 6, 8])


# ---------------------------------------------------------------------------
# C. API validasyon testi: _normalize_video_task_payload
#
# routes.py import zamani fastapi/pydantic/core/service modullerine ihtiyac
# duyar; bu ortamda kurulu degiller. Test edilen saf fonksiyonu gercek haliyle
# calistirabilmek icin minimal stub moduller sys.modules'a enjekte edilir.
# ---------------------------------------------------------------------------


class _StubHTTPException(Exception):
    """routes.py'nin kullandigi fastapi.HTTPException yerine minimal stub."""

    def __init__(self, status_code: int = 400, detail=None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _install_routes_stubs():
    """fastapi/pydantic/core/service icin minimal stub modulleri yukler.

    Yalnizca routes.py'nin MODUL-SEVIYESI import gereksinimlerini karsilar.
    Test edilen fonksiyonun mantigi degismez.
    """

    # --- fastapi ---
    fastapi = types.ModuleType("fastapi")

    class _Router:
        def _decorator(self, *_a, **_k):
            def wrap(fn):
                return fn
            return wrap

        # @router.get/post/... tum metodlar ayni decorator'a duser
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

    class _JSONResponse:  # noqa: D401 - basit stub
        def __init__(self, *a, **k):
            self.args = a
            self.kwargs = k

    fastapi_responses.JSONResponse = _JSONResponse
    sys.modules["fastapi.responses"] = fastapi_responses

    # --- pydantic ---
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

    # --- src.core.* ve src.services.* (registry HARIC gercek) ---
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
    """(_normalize_video_task_payload, HTTPExceptionClass, skip_reason) doner."""
    # Once dogrudan dene (belki gercek bagimliliklar kuruludur).
    try:
        from src.api.routes import _normalize_video_task_payload  # type: ignore
        try:
            from fastapi import HTTPException as _HE  # type: ignore
        except Exception:
            _HE = _StubHTTPException
        return _normalize_video_task_payload, _HE, None
    except Exception:
        pass

    # Stub'lari yukle ve tekrar dene.
    try:
        _install_routes_stubs()
        from src.api.routes import _normalize_video_task_payload  # type: ignore
        return _normalize_video_task_payload, _StubHTTPException, None
    except Exception as exc:  # pragma: no cover - defensif
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
        _t, payload = _NORMALIZE({"model": "veo-omni-flash", "prompt": "x"})
        self.assertEqual(payload["duration"], 10)


if __name__ == "__main__":
    unittest.main(verbosity=2)
