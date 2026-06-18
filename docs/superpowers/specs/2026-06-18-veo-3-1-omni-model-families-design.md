# Veo 3.1 & Omni Flash — Model Ailesi + Süre Desteği Genişletmesi

**Tarih:** 2026-06-18
**Durum:** Onaylandı (tasarım)

## 1. Amaç

`/v1/videos` API'sinde Google video üretimi için model aile ve süre desteğini genişletmek:

- **Veo 3.1 Quality** (4s/6s/8s)
- **Veo 3.1 Fast** (4s/6s/8s)
- **Veo 3.1 Lite** (4s/6s/8s)
- **Veo 3.1 Lite [Low priority]** (4s/6s/8s)
- **Omni Flash** (4s/6s/8s/10s)

Tüm üretim modlarıyla: **t2v** (text-to-video), **i2v** (start frame), **start-end** (interpolation), **r2v** (reference-to-video). Upscale (1080p/4k) mevcut yapıda korunur, yalnızca doğrulanır.

## 2. Mevcut Durum (keşif özeti)

- **API** (`src/api/routes.py`): `OPENAI_COMPAT_VIDEO_MODELS` tuple'ında yalnızca `veo-3-1` (duration=8 zorunlu, Fast aileye gidiyor), `veo-omni-flash` (duration=10 zorunlu), `veo-omni-flash-video-edit`. Mapping `_normalize_video_task_payload()` (satır 140-235).
- **Backend** (`src/services/veo_workflow_executor.py`): Sadece **Fast** aile sabitleri (`veo_3_1_t2v_fast`/`_portrait`, `veo_3_1_i2v_s_fast_fl`/`_portrait_fl`, `veo_3_1_r2v_fast_landscape`/`_portrait`). `balance > 2000` olunca dinamik `_ultra` suffix ekleniyor (satır 4328-4329). Süre yalnızca 300/450 frame (`_pick_n_frames`). Omni sadece `abra_*_10s`.
- **Extension** (`browser_extension/providers/veo_provider.js`): `extension_model_key`'i **şeffaf** geçiriyor → `videoModelKey`. Yeni key'ler için **değişiklik gerekmez**.
- **Upsampler**: `_veo_resolve_video_output_resolution()` (satır 5309-5325) `veo_3_1_upsampler_1080p` / `veo_3_1_upsampler_4k` döndürüyor — çalışır durumda.

## 3. Kararlar

1. **API isimlendirme:** Aile bazlı ayrı model isimleri, süre `duration` parametresiyle.
   - `veo-3-1` → **Quality** (⚠️ davranış değişikliği: eskiden Fast'e gidiyordu)
   - `veo-3-1-fast` → Fast
   - `veo-3-1-lite` → Lite
   - `veo-3-1-lite-low` → Lite [Low priority]
   - `veo-omni-flash` → Omni Flash
   - `veo-omni-flash-video-edit` → korunur (mevcut davranış)
2. **Auto-ultra kaldırılıyor:** `balance > 2000 → _ultra` mantığı silinir. Key'ler doğrudan registry'den gelir (8s zaten `_ultra` key'lerini içeriyor).
3. **Mod tespiti** mevcut mantıkla otomatik: görsel yok→t2v, first/last frame→i2v veya start-end, ingredients→r2v.
4. **Süre seçimi** `duration` parametresiyle; aile/mod için geçersizse `400`.

## 4. Mimari

Spec'in 5 tablosu tek bir deklaratif **registry**'ye dönüştürülür: yeni modül `src/services/veo_model_registry.py`.

```
resolve(family, mode, duration, orientation) -> (flow_model_key, max_ref_img)
```

- `family ∈ {omni_flash, veo_quality, veo_fast, veo_lite, veo_lite_low}`
- `mode ∈ {t2v, i2v, start_end, r2v}`
- `duration ∈ {4, 6, 8, 10}` (10 yalnız omni; r2v Veo sadece 8)
- `orientation ∈ {portrait, landscape}`

Geçersiz kombinasyon → `KeyError` benzeri sentinel; çağıran katman `400` üretir.

### Katman değişiklikleri

| Katman | Dosya | Değişiklik |
|---|---|---|
| Registry | yeni `src/services/veo_model_registry.py` | Aşağıdaki tam tablo + `resolve()` + yardımcılar |
| API | `src/api/routes.py` | Yeni model isimleri, `_normalize_video_task_payload` registry'ye delege; duration/aile ön-validasyonu |
| Backend | `src/services/veo_workflow_executor.py` | `_veo_resolve_t2v_model` / `_veo_resolve_r2v_model` / `_veo_resolve_i2v_aspect_ratio` / `_veo_resolve_extension_video_model_and_aspect` registry kullanır; auto-ultra silinir; `_VEO_OMNI_*` registry'ye taşınır |
| Extension | — | Değişiklik yok |
| Test | yeni `scripts/test_v1_videos_models.py` | requests tabanlı, tüm modelleri/modları test eden script |

## 5. Tam Registry (spec'ten birebir)

### 5.1 t2v — Text to Video

| family | dur | portrait key | landscape key |
|---|---|---|---|
| omni_flash | 4 | abra_t2v_4s | abra_t2v_4s |
| omni_flash | 6 | abra_t2v_6s | abra_t2v_6s |
| omni_flash | 8 | abra_t2v_8s | abra_t2v_8s |
| omni_flash | 10 | abra_t2v_10s | abra_t2v_10s |
| veo_lite | 4 | veo_3_1_t2v_lite_4s | veo_3_1_t2v_lite_4s |
| veo_lite | 6 | veo_3_1_t2v_lite_6s | veo_3_1_t2v_lite_6s |
| veo_lite | 8 | veo_3_1_t2v_lite | veo_3_1_t2v_lite |
| veo_fast | 4 | veo_3_1_t2v_fast_4s | veo_3_1_t2v_fast_4s |
| veo_fast | 6 | veo_3_1_t2v_fast_6s | veo_3_1_t2v_fast_6s |
| veo_fast | 8 | veo_3_1_t2v_fast_portrait_ultra | veo_3_1_t2v_fast_ultra |
| veo_quality | 4 | veo_3_1_t2v_quality_4s | veo_3_1_t2v_quality_4s |
| veo_quality | 6 | veo_3_1_t2v_quality_6s | veo_3_1_t2v_quality_6s |
| veo_quality | 8 | veo_3_1_t2v_portrait | veo_3_1_t2v |
| veo_lite_low | 4 | veo_3_1_t2v_lite_4s_low_priority | veo_3_1_t2v_lite_4s_low_priority |
| veo_lite_low | 6 | veo_3_1_t2v_lite_6s_low_priority | veo_3_1_t2v_lite_6s_low_priority |
| veo_lite_low | 8 | veo_3_1_t2v_lite_low_priority | veo_3_1_t2v_lite_low_priority |

### 5.2 i2v — Start Frame to Video

| family | dur | portrait key | landscape key |
|---|---|---|---|
| omni_flash | 4 | abra_i2v_4s | abra_i2v_4s |
| omni_flash | 6 | abra_i2v_6s | abra_i2v_6s |
| omni_flash | 8 | abra_i2v_8s | abra_i2v_8s |
| omni_flash | 10 | abra_i2v_10s | abra_i2v_10s |
| veo_lite | 4 | veo_3_1_i2v_s_lite_4s | veo_3_1_i2v_s_lite_4s |
| veo_lite | 6 | veo_3_1_i2v_s_lite_6s | veo_3_1_i2v_s_lite_6s |
| veo_lite | 8 | veo_3_1_i2v_lite | veo_3_1_i2v_lite |
| veo_fast | 4 | veo_3_1_i2v_s_fast_4s | veo_3_1_i2v_s_fast_4s |
| veo_fast | 6 | veo_3_1_i2v_s_fast_6s | veo_3_1_i2v_s_fast_6s |
| veo_fast | 8 | veo_3_1_i2v_s_fast_portrait_ultra | veo_3_1_i2v_s_fast_ultra |
| veo_quality | 4 | veo_3_1_i2v_s_quality_4s | veo_3_1_i2v_s_quality_4s |
| veo_quality | 6 | veo_3_1_i2v_s_quality_6s | veo_3_1_i2v_s_quality_6s |
| veo_quality | 8 | veo_3_1_i2v_s_portrait | veo_3_1_i2v_s |
| veo_lite_low | 4 | veo_3_1_i2v_s_lite_4s_low_priority | veo_3_1_i2v_s_lite_4s_low_priority |
| veo_lite_low | 6 | veo_3_1_i2v_s_lite_6s_low_priority | veo_3_1_i2v_s_lite_6s_low_priority |
| veo_lite_low | 8 | veo_3_1_i2v_lite_low_priority | veo_3_1_i2v_lite_low_priority |

### 5.3 start_end — Start-End Frame (interpolation)

> Omni Flash bu modu desteklemez.

| family | dur | portrait key | landscape key |
|---|---|---|---|
| veo_lite | 4 | veo_3_1_i2v_s_lite_4s_fl | veo_3_1_i2v_s_lite_4s_fl |
| veo_lite | 6 | veo_3_1_i2v_s_lite_6s_fl | veo_3_1_i2v_s_lite_6s_fl |
| veo_lite | 8 | veo_3_1_interpolation_lite | veo_3_1_interpolation_lite |
| veo_fast | 4 | veo_3_1_i2v_s_fast_4s_fl | veo_3_1_i2v_s_fast_4s_fl |
| veo_fast | 6 | veo_3_1_i2v_s_fast_6s_fl | veo_3_1_i2v_s_fast_6s_fl |
| veo_fast | 8 | veo_3_1_i2v_s_fast_portrait_ultra_fl | veo_3_1_i2v_s_fast_ultra_fl |
| veo_quality | 4 | veo_3_1_i2v_s_quality_4s_fl | veo_3_1_i2v_s_quality_4s_fl |
| veo_quality | 6 | veo_3_1_i2v_s_quality_6s_fl | veo_3_1_i2v_s_quality_6s_fl |
| veo_quality | 8 | veo_3_1_i2v_s_portrait_fl | veo_3_1_i2v_s_fl |
| veo_lite_low | 4 | veo_3_1_i2v_s_lite_4s_fl_low_priority | veo_3_1_i2v_s_lite_4s_fl_low_priority |
| veo_lite_low | 6 | veo_3_1_i2v_s_lite_6s_fl_low_priority | veo_3_1_i2v_s_lite_6s_fl_low_priority |
| veo_lite_low | 8 | veo_3_1_interpolation_lite_low_priority | veo_3_1_interpolation_lite_low_priority |

### 5.4 r2v — Reference to Video

> Veo Quality bu modu desteklemez. Veo aileleri yalnızca 8s.

| family | dur | portrait key | landscape key | max ref img |
|---|---|---|---|---|
| omni_flash | 4 | abra_r2v_4s | abra_r2v_4s | 7 |
| omni_flash | 6 | abra_r2v_6s | abra_r2v_6s | 7 |
| omni_flash | 8 | abra_r2v_8s | abra_r2v_8s | 7 |
| omni_flash | 10 | abra_r2v_10s | abra_r2v_10s | 7 |
| veo_lite | 8 | veo_3_1_r2v_lite | veo_3_1_r2v_lite | 3 |
| veo_fast | 8 | veo_3_1_r2v_fast_portrait_ultra | veo_3_1_r2v_fast_landscape_ultra | 3 |
| veo_lite_low | 8 | veo_3_1_r2v_lite_low_priority | veo_3_1_r2v_lite_low_priority | 3 |

### 5.5 Upsampler (mevcut, korunur)

| label | key | süre |
|---|---|---|
| 1080p | veo_3_1_upsampler_1080p | 60s |
| 4k | veo_3_1_upsampler_4k | 60s |

## 6. API Sözleşmesi

```
POST /v1/videos
{
  "model": "veo-3-1-fast",        // aile
  "prompt": "...",
  "duration": 6,                   // aileye göre 4/6/8 (omni 4/6/8/10)
  "aspect_ratio": "9:16",          // portrait/landscape; default landscape
  "resolution": "1080p",           // 720p/1080p/4k (opsiyonel, upscale)
  "image": "...",                  // i2v/start-end için
  "images": ["...", "..."],        // i2v first/last (max 2)
  "Ingredients_images": ["..."]    // r2v referans (max_ref_img'a göre)
}
```

Validasyon:
- Geçersiz `(family, duration)` → `400` (örn. `veo-3-1` + duration=10).
- Mod backend'de tespit edilir; `(family, mode)` desteklenmiyorsa (Quality+r2v, Omni+start-end) → `400`.
- r2v referans görsel sayısı > `max_ref_img` → `400`.

`/v1/models` ve `/v1/models/{id}` otomatik olarak `OPENAI_COMPAT_VIDEO_MODELS` tuple'ından beslenir; yeni isimler eklenince güncellenir.

## 7. Test Scripti

`scripts/test_v1_videos_models.py` (requests tabanlı, CLI argümanlı):

- Kullanıcı verir: `--endpoint`, `--api-key`, `--prompt`, `--image`, `--images`, `--ref-images`.
- Tüm `(model, duration, mode)` kombinasyonlarını ortak prompt + ortak görsellerle dener.
- Her istek için status code + task id / hata özetini tablo halinde yazar.
- Örnek (example) prompt ve placeholder görsel URL'leri kod içinde sabit bırakılır; kullanıcı CLI ile override eder.
- Modlar: t2v (görselsiz), i2v (tek görsel), start-end (iki görsel), r2v (ref görseller). Sadece registry'de desteklenen kombinasyonlar denenir.

## 8. Test & Doğrulama

- `veo_model_registry` için birim test: spec'teki ~50 satırın tümü doğru key/max_img veriyor.
- API validasyon testleri: geçersiz duration/mod/aile → 400.
- `python -m py_compile` ile syntax; import zinciri kırılmıyor.
- Upscale: 1080p/4k her aile için doğru upsampler key üretiyor.

## 9. Kapsam Dışı

- Extension tarafı değişikliği (gerekmiyor).
- Yeni upscale modelleri (mevcut 1080p/4k korunur).
- seedance / nana-banana / gpt-image2 modelleri (dokunulmaz).
