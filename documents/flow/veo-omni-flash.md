# veo-omni-flash & veo-omni-1-2-flash · Flow / Veo (video)

**Endpoint:** `POST /v1/videos`
**Durum sorgu:** `GET /v1/videos/{task_id}`
**İç task tipi:** `veo_workflow`

VEO Omni Flash video model ailesi iki ayrı nesil destekler:

1. **Veo Omni 1.1 Flash (`omni_flash` · Flow `abra_*`)** — `veo-omni-flash`, `veo-omni-1-1-flash`, `veo-omni-1.1-flash`, `omni-1.1-flash` (`4 / 6 / 8 / 10` sn, `t2v`, `i2v`, `start_end`, `r2v`, `edit`).
2. **Veo Omni 1.2 Flash (`omni_1_2_flash` · Flow `macaron_cookie_*`)** — `veo-omni-1-2-flash`, `veo-omni-1.2-flash`, `omni-1.2-flash` (`3..15` sn tam sayı süreler, **6 modun tamamı**: `t2v`, `i2v`, `start_end`, `r2v`, `edit`, `extend`).

> Video düzenleme (`edit`) ve video uzatma (`extend`) hem özel model adlarıyla ([veo-omni-flash-video-edit](veo-omni-flash-video-edit.md), `veo-omni-1-2-flash-video-edit`, `veo-omni-1-2-flash-video-extend`) hem de `video_url` / `extend_video_url` / `video_mode` alanlarıyla çağrılabilir.

---

## Model Adları ve Aile Eşleşmesi

| API `model` adı (veya `-1080p` varyantı) | İç aile (`veo_family`) | Flow model öneki | Varsayılan mod | Desteklenen süreler |
|---|---|---|---|---|
| `veo-omni-flash`, `veo-omni-1-1-flash`, `veo-omni-1.1-flash`, `omni-1.1-flash` | `omni_flash` | `abra_*` / `omni_flash_i2v_*_first_last` | Otomatik (`t2v`/`i2v`/`start_end`/`r2v`) | `4, 6, 8, 10` |
| `veo-omni-flash-video-edit`, `veo-omni-1.1-flash-video-edit`, `omni-1.1-flash-video-edit` | `omni_flash` | `abra_edit` | `edit` | `4, 6, 8, 10` (ref video ≤ 10s) |
| `veo-omni-1-2-flash`, `veo-omni-1.2-flash`, `omni-1.2-flash`, `veo-omni-flash-1-2` | `omni_1_2_flash` | `macaron_cookie_*` | Otomatik (`t2v`/`i2v`/`start_end`/`r2v`/`edit`/`extend`) | `3..15` (`start_end` ve `extend`: `3..10`) |
| `veo-omni-1-2-flash-video-edit`, `veo-omni-1.2-flash-video-edit`, `omni-1.2-flash-video-edit` | `omni_1_2_flash` | `macaron_cookie_edit` | `edit` | `3..15` (ref video ≤ 15s) |
| `veo-omni-1-2-flash-video-extend`, `veo-omni-1.2-flash-video-extend`, `omni-1.2-flash-video-extend`, `veo-omni-flash-video-extend` | `omni_1_2_flash` | `macaron_cookie_extend_{3..10}s` | `extend` | `3..10` (default `8`, ref video ≤ 30s) |

> Tüm yukarıdaki model adlarının sonuna `-1080p` eklenebilir (örn. `veo-omni-1.2-flash-1080p`, `omni-1.1-flash-1080p`). `-1080p` varyantı gönderildiğinde `resolution` belirtilmese bile otomatik olarak `1080p` upscale aktif olur.

---

## Ortak Alanlar

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| `model` | string | ✅ | — | Yukarıdaki tablodaki model adlarından biri |
| `prompt` | string | ✅ | — | Üretim promptu |
| `duration` | int | ⬜ | `10` (`extend` için `8`) | Omni 1.1: `4, 6, 8, 10` · Omni 1.2: `3..15` (`start_end` ve `extend` için `3..10`). Başka değer → `400` |
| `aspect_ratio` | string | ⬜ | `16:9` | `16:9` (landscape) veya `9:16` (portrait). `ratio` / `size_ratio` / `width`+`height` de kabul edilir |
| `resolution` | string | ⬜ | `720p` (`-1080p` modelde `1080p`) | `360p` / `720p` / `1080p` / `4k` |
| `negative_prompt` | string | ⬜ | — | Şemada kabul edilir, **Flow akışında kullanılmaz** |
| `seed` | int | ⬜ | — | Şemada kabul edilir, **Flow akışında kullanılmaz** (Flow tarafında rastgele seed üretilir) |

### `resolution` ve Native Upsampling (`p0UkFb`) Davranışı

| Değer | Nasıl üretilir | Not |
|---|---|---|
| `360p` | Flow'un native `*_360p` model key'i (`outputSpec: [4]` / `VIDEO_RESOLUTION_360P`) | Doğrudan üretim, upscale yok. **Yalnızca `omni_flash` ve `omni_1_2_flash` ailelerinde geçerli** — `veo-3-1*` modellerinde `400` |
| `720p` | Varsayılan model key (`outputSpec: [1]` / `VIDEO_RESOLUTION_720P`) | Upscale yok |
| `1080p` | 720p üretilir → eklenti Flow batchExecute `p0UkFb` (`veo_3_1_upsampler_1080p`, `VIDEO_RESOLUTION_1080P` = `2`) ile büyütür | Üretim sonrası native Flow upscale + polling; orijinal 720p URL `origin_video_url` alanında korunur |
| `4k` | 720p üretilir → eklenti Flow batchExecute `p0UkFb` (`veo_3_1_upsampler_4k`, `VIDEO_RESOLUTION_4K` = `3`) ile büyütür | Üretim sonrası native Flow upscale + polling; orijinal 720p URL `origin_video_url` alanında korunur |

`360p` ile `1080p`/`4k` birlikte kullanılamaz (`resolution` tek değer alır); upsampler'lar 720p girdi bekler.

### Mod Seçim Kuralı

| Gönderilen | Seçilen mod |
|---|---|
| `video_mode="extend"`, `extend=true`, `extend_video_url` veya `*-video-extend` modeli | `extend` (Omni 1.2 Flash) |
| `video_mode="edit"`, `video_url` (extend değilken) veya `*-video-edit` modeli | `edit` |
| `Ingredients_images`, `ingredients_images` veya `audio_urls` / `voices` dolu | `r2v` |
| 2 görsel (`images: [ilk, son]` veya `first_image_url` + `last_image_url`) | `start_end` |
| 1 görsel (`first_image_url` veya `images[0]`) | `i2v` |
| Görsel / video / ses referansı yok | `t2v` |

---

## 1) Text to Video (`t2v`)

Görsel gönderme, prompt yeter.

```json
{
  "model": "veo-omni-1.2-flash",
  "prompt": "a paper airplane gliding over a neon city at night, slow camera pan",
  "duration": 12,
  "aspect_ratio": "16:9",
  "resolution": "720p"
}
```

- **Omni 1.1 (`omni_flash`)**: `abra_t2v_{4,6,8,10}s` · 360p: `abra_t2v_{4,6,8,10}s_360p`
- **Omni 1.2 (`omni_1_2_flash`)**: `macaron_cookie_t2v_{3..15}s` · 360p: `macaron_cookie_t2v_{3..15}s_360p`

---

## 2) Image to Video (`i2v`)

Tek başlangıç karesi (`first_image_url` veya tek elemanlı `images`).

```json
{
  "model": "veo-omni-1.2-flash",
  "prompt": "the character slowly turns toward the camera, cinematic lighting",
  "duration": 7,
  "aspect_ratio": "9:16",
  "first_image_url": "https://your-cdn.com/first.jpg"
}
```

- **Omni 1.1 (`omni_flash`)**: `abra_i2v_{4,6,8,10}s` · 360p: `abra_i2v_{4,6,8,10}s_360p`
- **Omni 1.2 (`omni_1_2_flash`)**: `macaron_cookie_i2v_{3..15}s` · 360p: `macaron_cookie_i2v_{3..15}s_360p`

---

## 3) Start-End Frame to Video (`start_end`)

İlk ve son kare verilir, ara hareket üretilir (`images: [ilk, son]` veya `first_image_url` + `last_image_url`).

```json
{
  "model": "veo-omni-1.2-flash",
  "prompt": "smooth morph from the first frame to the last frame, steady camera",
  "duration": 6,
  "aspect_ratio": "16:9",
  "images": [
    "https://your-cdn.com/first.jpg",
    "https://your-cdn.com/last.jpg"
  ]
}
```

⚠️ **Yalnızca son kare gönderilemez** — `last_image_url` varsa `first_image_url` de zorunludur, aksi halde `400`.

- **Omni 1.1 (`omni_flash`, `4/6/8/10s`)**: `omni_flash_i2v_{4,6,8,10}s_first_last` · 360p: `omni_flash_i2v_{4,6,8,10}s_first_last_360p`
- **Omni 1.2 (`omni_1_2_flash`, `3..10s`)**: `macaron_cookie_i2v_fl_{3..10}s` · 360p: `macaron_cookie_i2v_fl_{3..10}s_360p`

---

## 4) Reference to Video (`r2v`) + Audio / Voice Referansları

Çoklu referans görselden ve isteğe bağlı ses/음성 (preset voice) referanslarından video üretir.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `Ingredients_images` | string[] | Referans görsel URL dizisi, **en fazla 7** (`ingredients_images` / `reference_images` de kabul edilir) |
| `audio_urls` / `voices` / `ingredients_audios` | string[] | Ses/voice referans dizisi, **en fazla 5** (`puck`, `kore`, `fenrir`, `zephyr`, `aoede`, `charon`, ... gibi 30 Flow preset sesi veya `voices/<ad>` / UUID) |

```json
{
  "model": "veo-omni-1.2-flash",
  "prompt": "the character holds the product and speaks warmly in a sunlit studio",
  "duration": 10,
  "aspect_ratio": "16:9",
  "resolution": "1080p",
  "Ingredients_images": [
    "https://your-cdn.com/character.jpg",
    "https://your-cdn.com/product.jpg"
  ],
  "voices": ["puck", "kore"]
}
```

- **Omni 1.1 (`omni_flash`, `4/6/8/10s`)**: `abra_r2v_{4,6,8,10}s` · 360p: `abra_r2v_{4,6,8,10}s_360p` (max 7 görsel, max 5 ses)
- **Omni 1.2 (`omni_1_2_flash`, `3..15s`)**: `macaron_cookie_r2v_{3..15}s` · 360p: `macaron_cookie_r2v_{3..15}s_360p` (max 7 görsel, max 5 ses)

---

## 5) Video Edit (`edit`)

Mevcut bir referans videoyu (`video_url`) prompt + opsiyonel görsel/ses referanslarıyla yeniden düzenler.

- **Omni 1.1 (`omni_flash`)**: `abra_edit` / `abra_edit_360p` (max 5 görsel, max 3 ses, referans video ≤ 10s)
- **Omni 1.2 (`omni_1_2_flash`)**: `macaron_cookie_edit` / `macaron_cookie_edit_360p` (max 5 görsel, max 3 ses, referans video ≤ 15s)

```json
{
  "model": "veo-omni-1.2-flash-video-edit",
  "prompt": "replace the background with a cyberpunk street at night",
  "video_url": "https://your-cdn.com/input.mp4",
  "Ingredients_images": ["https://your-cdn.com/style.jpg"],
  "voices": ["fenrir"]
}
```

---

## 6) Video Extend (`extend` · Yalnızca Omni 1.2 Flash)

Mevcut bir referans videoyu (`video_url` veya `extend_video_url`) `3..10` saniye uzatır.

- **Omni 1.2 (`omni_1_2_flash`, `3..10s`, default `8s`)**: `macaron_cookie_extend_{3..10}s` / `macaron_cookie_extend_{3..10}s_360p` (max 3 görsel, max 3 ses, referans video ≤ 30s)

```json
{
  "model": "veo-omni-1.2-flash-video-extend",
  "prompt": "the camera continues flying through the canyon into a glowing sunset",
  "duration": 8,
  "video_url": "https://your-cdn.com/scene1.mp4",
  "Ingredients_images": ["https://your-cdn.com/sunset_ref.jpg"]
}
```

---

## Mod × Süre × Çözünürlük Matrisi

| Aile | Mod | Süreler (`N`) | 720p key | 360p key | Max Görsel | Max Ses | Max Ref Video |
|---|---|---|---|---|:---:|:---:|:---:|
| `omni_flash` (1.1) | `t2v` | `4, 6, 8, 10` | `abra_t2v_{N}s` | `abra_t2v_{N}s_360p` | 0 | 0 | — |
| `omni_flash` (1.1) | `i2v` | `4, 6, 8, 10` | `abra_i2v_{N}s` | `abra_i2v_{N}s_360p` | 0 (1 frame) | 0 | — |
| `omni_flash` (1.1) | `start_end` | `4, 6, 8, 10` | `omni_flash_i2v_{N}s_first_last` | `omni_flash_i2v_{N}s_first_last_360p` | 0 (2 frame) | 0 | — |
| `omni_flash` (1.1) | `r2v` | `4, 6, 8, 10` | `abra_r2v_{N}s` | `abra_r2v_{N}s_360p` | 7 | 5 | — |
| `omni_flash` (1.1) | `edit` | `4, 6, 8, 10` | `abra_edit` | `abra_edit_360p` | 5 | 3 | 10s |
| `omni_1_2_flash` (1.2) | `t2v` | `3..15` | `macaron_cookie_t2v_{N}s` | `macaron_cookie_t2v_{N}s_360p` | 0 | 0 | — |
| `omni_1_2_flash` (1.2) | `i2v` | `3..15` | `macaron_cookie_i2v_{N}s` | `macaron_cookie_i2v_{N}s_360p` | 0 (1 frame) | 0 | — |
| `omni_1_2_flash` (1.2) | `start_end` | `3..10` | `macaron_cookie_i2v_fl_{N}s` | `macaron_cookie_i2v_fl_{N}s_360p` | 0 (2 frame) | 0 | — |
| `omni_1_2_flash` (1.2) | `r2v` | `3..15` | `macaron_cookie_r2v_{N}s` | `macaron_cookie_r2v_{N}s_360p` | 7 | 5 | — |
| `omni_1_2_flash` (1.2) | `edit` | `3..15` | `macaron_cookie_edit` | `macaron_cookie_edit_360p` | 5 | 3 | 15s |
| `omni_1_2_flash` (1.2) | `extend` | `3..10` | `macaron_cookie_extend_{N}s` | `macaron_cookie_extend_{N}s_360p` | 3 | 3 | 30s |

---

## Yanıt

`POST /v1/videos` asenkron çalışır; hemen bir task döner:

```json
{
  "id": "<task_id>",
  "task_id": "<task_id>",
  "object": "video",
  "created_at": 1756389600000,
  "status": "queued",
  "progress": 0,
  "model": "veo-omni-1.2-flash",
  "duration": 8,
  "seconds": "8",
  "aspect_ratio": "16:9",
  "prompt": "...",
  "video_url": null,
  "metadata": { "result_urls": [] }
}
```
