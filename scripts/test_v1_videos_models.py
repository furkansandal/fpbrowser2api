#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
/v1/videos endpoint'i icin tum yeni video modellerini test eden CLI script.

Ortak bir prompt + ortak gorsellerle TUM desteklenen (model, duration, mode)
kombinasyonlarini /v1/videos endpoint'ine POST eder ve sonuclari hizali bir
tablo halinde gosterir.

Sadece `requests` ve standart kutuphane kullanir.

Model aileleri / sureler / modlar tasarim dokumanindan birebir alinmistir:
  docs/superpowers/specs/2026-06-18-veo-3-1-omni-model-families-design.md

Modlar:
  - t2v       : sadece prompt
  - i2v       : prompt + "image" (tek baslangic gorseli)
  - start-end : prompt + "images": [img1, img2] (interpolation)
  - r2v       : prompt + "Ingredients_images": [ref...] (reference-to-video)

Kisitlar (script icinde net veri yapisi olarak tutulur):
  - Veo Quality (veo-3-1) r2v DESTEKLEMEZ.
  - Omni Flash (veo-omni-flash) start-end DESTEKLEMEZ.
  - Veo aileleri (fast/lite/lite-low) r2v sadece 8s.
  - Omni Flash 10s destekler; Veo aileleri 4/6/8s.

Ornek kullanim:
  # Once gercek istek atmadan hangi kombinasyonlar denenecek gor:
  python scripts/test_v1_videos_models.py \
      --dry-run \
      --endpoint https://host.example.com/v1/videos \
      --api-key sk-xxx

  # Gercek test (tum modeller, tum modlar):
  python scripts/test_v1_videos_models.py \
      --endpoint https://host.example.com/v1/videos \
      --api-key sk-xxx \
      --prompt "A cinematic shot of a fox running through snow" \
      --image https://.../start.jpg \
      --images https://.../start.jpg,https://.../end.jpg \
      --ref-images https://.../ref1.jpg,https://.../ref2.jpg

  # Sadece belirli aileler ve modlar:
  python scripts/test_v1_videos_models.py \
      --endpoint https://host/v1/videos --api-key sk-xxx \
      --models veo-3-1-fast,veo-omni-flash --modes t2v,i2v
"""

import argparse
import json
import sys
import time

# NOT: `requests` yalnizca gercek istek atarken gerekir; --dry-run icin gerekmez.
# Bu yuzden import lazy yapilir (asagida _require_requests()).
requests = None


def _require_requests():
    """Gercek istek atilmadan once `requests`'i yukler; yoksa anlamli hata verir."""
    global requests
    if requests is None:
        try:
            import requests as _requests
        except ImportError:  # pragma: no cover
            sys.stderr.write(
                "HATA: 'requests' kutuphanesi gerekli. Kur: pip install requests\n"
            )
            sys.exit(2)
        requests = _requests
    return requests


# ---------------------------------------------------------------------------
# SABITLER: ornek prompt + placeholder gorseller (CLI ile override edilebilir)
# ---------------------------------------------------------------------------

EXAMPLE_PROMPT = (
    "A cinematic wide shot of a red fox sprinting across a snowy field at "
    "golden hour, soft falling snow, shallow depth of field, 35mm film look."
)

# i2v start frame icin tek gorsel
EXAMPLE_IMAGE = "https://placehold.co/1280x720/png?text=start-frame"

# start-end (interpolation) icin iki gorsel
EXAMPLE_IMAGES = [
    "https://placehold.co/1280x720/png?text=start-frame",
    "https://placehold.co/1280x720/png?text=end-frame",
]

# r2v reference-to-video icin referans gorseller
EXAMPLE_REF_IMAGES = [
    "https://placehold.co/1024x1024/png?text=ref-1",
    "https://placehold.co/1024x1024/png?text=ref-2",
]

DEFAULT_ASPECT_LANDSCAPE = "16:9"
DEFAULT_ASPECT_PORTRAIT = "9:16"

# Modlar (payload alan adlari)
MODE_T2V = "t2v"
MODE_I2V = "i2v"
MODE_START_END = "start-end"
MODE_R2V = "r2v"

ALL_MODES = [MODE_T2V, MODE_I2V, MODE_START_END, MODE_R2V]


# ---------------------------------------------------------------------------
# KISIT TABLOSU: hangi model + hangi mod + hangi sureler destekleniyor
# (tasarim dokumani Bolum 5 "Tam Registry" + Bolum 6 "API Sozlesmesi")
# Her mod icin desteklenen sureler listesi tutulur; bos/yok ise mod desteklenmez.
# ---------------------------------------------------------------------------

MODEL_MATRIX = {
    # Veo 3.1 Fast -> r2v sadece 8s
    "veo-3-1-fast": {
        "label": "Veo 3.1 Fast",
        "modes": {
            MODE_I2V: [8],
            MODE_START_END: [4, 8],
            MODE_R2V: [8],
        },
    },
    # Veo 3.1 Lite -> r2v sadece 8s
    "veo-3-1-lite": {
        "label": "Veo 3.1 Lite",
        "modes": {
            MODE_T2V: [4, 8],
            MODE_I2V: [4, 8],
            MODE_START_END: [4, 8],
            MODE_R2V: [8],
        },
    },
    # Veo 3.1 Lite [Low priority] -> r2v sadece 8s
    "veo-3-1-lite-low": {
        "label": "Veo 3.1 Lite [Low]",
        "modes": {
            MODE_T2V: [4, 8],
            MODE_I2V: [4, 8],
            MODE_START_END: [4, 8],
            MODE_R2V: [8],
        },
    },
    # Omni Flash -> start-end YOK, 10s destekli
    "veo-omni-flash": {
        "label": "Omni Flash",
        "modes": {
            MODE_T2V: [4, 8, 10],
            MODE_I2V: [4, 8, 10],
            # start-end desteklenmez
            MODE_R2V: [4, 8, 10],
        },
    },
}

ALL_MODELS = list(MODEL_MATRIX.keys())


# ---------------------------------------------------------------------------
# Yardimcilar
# ---------------------------------------------------------------------------

def normalize_endpoint(endpoint):
    """Base URL verilirse sonuna /v1/videos ekler."""
    endpoint = endpoint.rstrip("/")
    if endpoint.endswith("/v1/videos"):
        return endpoint
    if endpoint.endswith("/v1"):
        return endpoint + "/videos"
    return endpoint + "/v1/videos"


def parse_csv(value):
    """Virgulle ayrilmis string -> temizlenmis liste."""
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def build_combinations(models, modes):
    """Secili modeller/modlar icin desteklenen (model, duration, mode) listesi."""
    combos = []
    for model in models:
        spec = MODEL_MATRIX.get(model)
        if not spec:
            continue
        for mode in ALL_MODES:
            if mode not in modes:
                continue
            durations = spec["modes"].get(mode)
            if not durations:
                continue  # bu aile bu modu desteklemiyor
            for duration in durations:
                combos.append((model, duration, mode))
    return combos


def build_payload(model, duration, mode, aspect_ratio, args):
    """Verilen kombinasyon icin /v1/videos POST body'sini kurar."""
    payload = {
        "model": model,
        "prompt": args.prompt,
        "duration": duration,
        "aspect_ratio": aspect_ratio,
    }
    if args.resolution:
        payload["resolution"] = args.resolution

    if mode == MODE_T2V:
        pass  # sadece prompt
    elif mode == MODE_I2V:
        payload["image"] = args.image
    elif mode == MODE_START_END:
        payload["images"] = list(args.images)
    elif mode == MODE_R2V:
        payload["Ingredients_images"] = list(args.ref_images)

    return payload


def short_error(text, limit=60):
    """Hata mesajini tek satira / kisa hale getirir."""
    if text is None:
        return ""
    text = " ".join(str(text).split())
    if len(text) > limit:
        return text[: limit - 1] + "…"
    return text


def extract_task_id(data):
    """Yanit JSON'undan task_id benzeri bir alan cikarmaya calisir."""
    if not isinstance(data, dict):
        return None
    for key in ("task_id", "id", "taskId", "request_id", "requestId"):
        if data.get(key):
            return str(data[key])
    # bazi API'lar data.id seklinde sarmalar
    inner = data.get("data")
    if isinstance(inner, dict):
        for key in ("task_id", "id", "taskId"):
            if inner.get(key):
                return str(inner[key])
    return None


# ---------------------------------------------------------------------------
# Istek + tablo
# ---------------------------------------------------------------------------

ROW_FMT = "{model:<18} {dur:>4}  {mode:<10} {status:<8} {detail}"
HEADER = ROW_FMT.format(
    model="MODEL", dur="DUR", mode="MODE", status="STATUS", detail="TASK_ID / HATA"
)


def send_request(session, url, headers, payload, timeout):
    """Tek bir kombinasyonu gonderir. (status, detail, ok) doner."""
    try:
        resp = session.post(url, headers=headers, json=payload, timeout=timeout)
    except requests.exceptions.Timeout:
        return ("TIMEOUT", "istek zaman asimina ugradi", False)
    except requests.exceptions.ConnectionError as exc:
        return ("CONN_ERR", short_error(exc), False)
    except requests.exceptions.RequestException as exc:
        return ("REQ_ERR", short_error(exc), False)

    status = str(resp.status_code)
    ok = 200 <= resp.status_code < 300

    try:
        data = resp.json()
    except ValueError:
        data = None

    if ok:
        task_id = extract_task_id(data)
        detail = task_id if task_id else "ok (task_id yok)"
        return (status, detail, True)

    # hata: API mesajini cikarmaya calis
    detail = None
    if isinstance(data, dict):
        err = data.get("error")
        if isinstance(err, dict):
            detail = err.get("message") or err.get("type")
        elif isinstance(err, str):
            detail = err
        if not detail:
            detail = data.get("message") or data.get("detail")
    if not detail:
        detail = resp.text or "bilinmeyen hata"
    return (status, short_error(detail), False)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="/v1/videos tum video modellerini (model x duration x mode) test eder.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--endpoint",
        required=True,
        help="Tam endpoint (https://host/v1/videos) veya base URL (otomatik /v1/videos eklenir).",
    )
    parser.add_argument(
        "--api-key",
        required=True,
        help="Authorization: Bearer <key> icin API anahtari.",
    )
    parser.add_argument(
        "--prompt",
        default=EXAMPLE_PROMPT,
        help="Tum kombinasyonlarda kullanilacak ortak prompt.",
    )
    parser.add_argument(
        "--image",
        default=EXAMPLE_IMAGE,
        help="i2v start frame icin tek gorsel URL.",
    )
    parser.add_argument(
        "--images",
        default=",".join(EXAMPLE_IMAGES),
        help="start-end icin 2 gorsel (virgulle ayrilmis: start,end).",
    )
    parser.add_argument(
        "--ref-images",
        default=",".join(EXAMPLE_REF_IMAGES),
        help="r2v referans gorseller (virgulle ayrilmis).",
    )
    parser.add_argument(
        "--models",
        default="",
        help="Sadece belirli aileler (virgulle ayrilmis). Default: hepsi. "
        "Secenekler: " + ", ".join(ALL_MODELS),
    )
    parser.add_argument(
        "--modes",
        default="",
        help="Sadece belirli modlar (virgulle ayrilmis). Default: hepsi. "
        "Secenekler: " + ", ".join(ALL_MODES),
    )
    parser.add_argument(
        "--resolution",
        default="",
        help="Opsiyonel upscale cozunurlugu (orn. 720p/1080p/4k).",
    )
    parser.add_argument(
        "--portrait",
        action="store_true",
        help="Ek olarak portrait (9:16) varyantlarini da test et.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Istek atmadan hangi kombinasyonlarin deneneceğini yazar.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=120,
        help="Istek basina timeout (saniye). Default 120.",
    )
    args = parser.parse_args(argv)

    # CSV alanlarini listeye cevir
    args.images = parse_csv(args.images)
    args.ref_images = parse_csv(args.ref_images)

    if len(args.images) < 2:
        parser.error("--images en az 2 gorsel icermeli (start,end).")
    if len(args.ref_images) < 1:
        parser.error("--ref-images en az 1 gorsel icermeli.")

    # Model / mod secimi
    selected_models = parse_csv(args.models) or list(ALL_MODELS)
    selected_modes = parse_csv(args.modes) or list(ALL_MODES)

    unknown_models = [m for m in selected_models if m not in MODEL_MATRIX]
    if unknown_models:
        parser.error(
            "Bilinmeyen model(ler): %s. Gecerli: %s"
            % (", ".join(unknown_models), ", ".join(ALL_MODELS))
        )
    unknown_modes = [m for m in selected_modes if m not in ALL_MODES]
    if unknown_modes:
        parser.error(
            "Bilinmeyen mod(lar): %s. Gecerli: %s"
            % (", ".join(unknown_modes), ", ".join(ALL_MODES))
        )

    # aspect oranlari
    aspects = [DEFAULT_ASPECT_LANDSCAPE]
    if args.portrait:
        aspects.append(DEFAULT_ASPECT_PORTRAIT)

    combos = build_combinations(selected_models, selected_modes)

    url = normalize_endpoint(args.endpoint)

    print("Endpoint     : %s" % url)
    print("Prompt       : %s" % short_error(args.prompt, 70))
    print("Modeller     : %s" % ", ".join(selected_models))
    print("Modlar       : %s" % ", ".join(selected_modes))
    print("Aspect       : %s" % ", ".join(aspects))
    if args.resolution:
        print("Resolution   : %s" % args.resolution)
    total_requests = len(combos) * len(aspects)
    print("Kombinasyon  : %d (mod x model x sure x aspect)" % total_requests)
    print("-" * 72)

    # DRY RUN
    if args.dry_run:
        print(HEADER)
        print("-" * 72)
        for aspect in aspects:
            for model, duration, mode in combos:
                payload = build_payload(model, duration, mode, aspect, args)
                print(
                    ROW_FMT.format(
                        model=model,
                        dur=str(duration) + "s",
                        mode=mode,
                        status=aspect,
                        detail="payload: " + json.dumps(payload, ensure_ascii=False),
                    )
                )
        print("-" * 72)
        print("DRY-RUN: %d kombinasyon listelendi, istek atilmadi." % total_requests)
        return 0

    # GERCEK ISTEKLER (requests burada gerekli)
    _require_requests()
    headers = {
        "Authorization": "Bearer %s" % args.api_key,
        "Content-Type": "application/json",
    }
    session = requests.Session()

    print(HEADER)
    print("-" * 72)

    success = 0
    failed = 0
    for aspect in aspects:
        for model, duration, mode in combos:
            payload = build_payload(model, duration, mode, aspect, args)
            status, detail, ok = send_request(
                session, url, headers, payload, args.timeout
            )
            if ok:
                success += 1
            else:
                failed += 1
            print(
                ROW_FMT.format(
                    model=model,
                    dur=str(duration) + "s",
                    mode=mode,
                    status=status,
                    detail=detail,
                )
            )
            if success > 0 and success % 4 == 0:
                time.sleep(60)

    print("-" * 72)
    print(
        "OZET: %d toplam | %d basarili | %d basarisiz"
        % (success + failed, success, failed)
    )
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
