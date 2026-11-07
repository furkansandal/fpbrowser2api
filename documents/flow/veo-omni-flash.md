# veo-omni-flash · Flow / Veo (video)

**Endpoint:** `POST /v1/videos`
**Durum sorgu:** `GET /v1/videos/{task_id}`
**İç task tipi:** `veo_workflow`

VEO Omni Flash video modeli. Tek model adıyla dört mod destekler: **text-to-video (t2v)**, **image-to-video (i2v)**, **start-end frame** ve **reference-to-video (r2v)**. Mod istekte gönderdiğin görsellere göre sunucu tarafında otomatik seçilir — ayrı bir `mode` alanı yoktur.

> Video düzenleme (mevcut bir videoyu prompt ile yeniden işleme) ayrı model adıdır: [veo-omni-flash-video-edit](veo-omni-flash-video-edit.md).

---

## Ortak alanlar

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| `model` | string | ✅ | — | `"veo-omni-flash"` |
| `prompt` | string | ✅ | — | Üretim promptu |
| `duration` | int | ⬜ | `10` | `4` / `6` / `8` / `10`. Başka değer → `400` |
| `aspect_ratio` | string | ⬜ | `16:9` | `16:9` (landscape) veya `9:16` (portrait). `ratio` / `size_ratio` / `width`+`height` de kabul edilir |
| `resolution` | string | ⬜ | `720p` | `360p` / `720p` / `1080p` / `4k` |
| `negative_prompt` | string | ⬜ | — | Şemada kabul edilir, **Flow akışında kullanılmaz** |
| `seed` | int | ⬜ | — | Şemada kabul edilir, **Flow akışında kullanılmaz** (Flow tarafında rastgele seed üretilir) |

### `resolution` davranışı

| Değer | Nasıl üretilir | Not |
|---|---|---|
| `360p` | Flow'un native `*_360p` model key'i | Doğrudan üretim, upscale yok. Flow tarafında belirgin şekilde az kredi harcar. **Yalnızca `veo-omni-flash`'te geçerli** — `veo-3-1*` modellerinde `400` |
| `720p` | Varsayılan model key | Upscale yok |
| `1080p` | 720p üretilir → eklenti `veo_3_1_upsampler_1080p` ile büyütür | Üretim sonrası ek adım |
| `4k` | 720p üretilir → eklenti `veo_3_1_upsampler_4k` ile büyütür | Üretim sonrası ek adım |

`360p` ile `1080p`/`4k` birlikte kullanılamaz (`resolution` tek değer alır); upsampler'lar 720p girdi bekler.

### Mod seçim kuralı

| Gönderilen | Seçilen mod |
|---|---|
| Görsel yok | t2v |
| 1 görsel (`first_image_url` veya `images[0]`) | i2v |
| 2 görsel (`images: [ilk, son]` veya `first_image_url` + `last_image_url`) | start-end |
| `Ingredients_images` dolu | r2v (görsel alanlarına bakılmaksızın önceliklidir) |

---

## 1) Text to Video (t2v)

Görsel gönderme, prompt yeter.

```json
{
  "model": "veo-omni-flash",
  "prompt": "a paper airplane gliding over a neon city at night, slow camera pan",
  "duration": 8,
  "aspect_ratio": "16:9",
  "resolution": "720p"
}
```

```bash
curl -s http://127.0.0.1:8000/v1/videos \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"veo-omni-flash","prompt":"a paper airplane gliding over a neon city at night, slow camera pan","duration":8,"aspect_ratio":"16:9"}'
```

Flow model key: `abra_t2v_{4,6,8,10}s` · 360p'de `abra_t2v_{N}s_360p`

---

## 2) Image to Video (i2v)

Tek başlangıç karesi. Görsel **https** URL olmalı.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `first_image_url` | string | Başlangıç karesi. `image_url` / `firstImageUrl` / `imageUrl` de kabul edilir |
| `images` | string[] | Alternatif; tek elemanlı dizi = başlangıç karesi |

```json
{
  "model": "veo-omni-flash",
  "prompt": "the character slowly turns toward the camera, cinematic lighting",
  "duration": 8,
  "aspect_ratio": "9:16",
  "first_image_url": "https://your-cdn.com/first.jpg"
}
```

`images` ile aynı istek:

```json
{
  "model": "veo-omni-flash",
  "prompt": "the character slowly turns toward the camera, cinematic lighting",
  "duration": 8,
  "images": ["https://your-cdn.com/first.jpg"]
}
```

Flow model key: `abra_i2v_{4,6,8,10}s` · 360p'de `abra_i2v_{N}s_360p`

---

## 3) Start-End Frame to Video

İlk ve son kare verilir, ara hareket üretilir.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `images` | string[] | **Sıra önemli:** `[ilk_kare, son_kare]`. En fazla 2 eleman; fazlası `400` |
| `first_image_url` | string | `images` verilmezse ilk kare |
| `last_image_url` | string | Son kare. `end_image_url` / `lastImageUrl` / `endImageUrl` de kabul edilir |

```json
{
  "model": "veo-omni-flash",
  "prompt": "smooth morph from the first frame to the last frame, steady camera",
  "duration": 4,
  "aspect_ratio": "16:9",
  "images": [
    "https://your-cdn.com/first.jpg",
    "https://your-cdn.com/last.jpg"
  ]
}
```

Ayrı alanlarla aynı istek:

```json
{
  "model": "veo-omni-flash",
  "prompt": "smooth morph from the first frame to the last frame, steady camera",
  "duration": 4,
  "first_image_url": "https://your-cdn.com/first.jpg",
  "last_image_url": "https://your-cdn.com/last.jpg"
}
```

⚠️ **Yalnızca son kare gönderilemez** — `last_image_url` varsa `first_image_url` de zorunludur, aksi halde `400`.

Flow model key: `omni_flash_i2v_{4,6,8,10}s_first_last` · 360p'de `omni_flash_i2v_{N}s_first_last_360p`

> Not: Omni'nin start-end key'leri Veo 3.1 ailesindeki `_fl` son eki konvansiyonunu **kullanmaz**, `_first_last` son ekiyle ayrı bir isimlendirme kullanır.

---

## 4) Reference to Video (r2v)

Çoklu referans görselden video. Karakter/ürün tutarlılığı için kullanılır.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `Ingredients_images` | string[] | Referans görsel URL dizisi, **en fazla 7**. `ingredients_images` de kabul edilir. Fazlası `400` |

```json
{
  "model": "veo-omni-flash",
  "prompt": "the character holds the product and walks through a sunlit studio",
  "duration": 10,
  "aspect_ratio": "16:9",
  "resolution": "360p",
  "Ingredients_images": [
    "https://your-cdn.com/character.jpg",
    "https://your-cdn.com/product.jpg",
    "https://your-cdn.com/background.jpg"
  ]
}
```

Flow model key: `abra_r2v_{4,6,8,10}s` (max 7 referans) · 360p'de `abra_r2v_{N}s_360p`

---

## Mod × süre × çözünürlük matrisi

Dört mod da 4/6/8/10 saniyenin tamamını destekler.

| Mod | Tetikleyen | 720p key | 360p key | max ref |
|-----|-----------|----------|----------|:-------:|
| t2v | (görsel yok) | `abra_t2v_{N}s` | `abra_t2v_{N}s_360p` | — |
| i2v | 1 görsel | `abra_i2v_{N}s` | `abra_i2v_{N}s_360p` | — |
| start-end | 2 görsel | `omni_flash_i2v_{N}s_first_last` | `omni_flash_i2v_{N}s_first_last_360p` | — |
| r2v | `Ingredients_images` | `abra_r2v_{N}s` | `abra_r2v_{N}s_360p` | 7 |

`{N}` ∈ `{4, 6, 8, 10}`

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
  "model": "veo-omni-flash",
  "duration": 8,
  "seconds": "8",
  "aspect_ratio": "16:9",
  "prompt": "...",
  "video_url": null,
  "metadata": { "result_urls": [] }
}
```

Sonucu almak için:

```bash
curl -s http://127.0.0.1:8000/v1/videos/<task_id> -H "Authorization: Bearer $API_KEY"
```

Durum akışı: `queued` → `processing` → `completed` / `failed`. Terminal durumda `success` ve `final` bayrakları da döner; `completed` olunca `video_url`, `url` ve `metadata.result_urls` dolar. `failed` durumunda `error.message` / `error.code` gelir.

---

## Sık karşılaşılan hatalar

| Hata | Sebep |
|------|-------|
| `veo-omni-flash supports durations: [4, 6, 8, 10]` | `duration` bu kümede değil |
| `resolution 360p is only supported by veo-omni-flash` | `360p` bir `veo-3-1*` modeliyle gönderilmiş |
| `unsupported resolution 'X'; supported: 360p / 720p / 1080p / 4k` | Tanınmayan `resolution` değeri |
| `图生视频不能只提供尾图` | `last_image_url` var, `first_image_url` yok |
| `图生视频最多支持 2 张图片（首帧与尾帧）` | `images` 2'den fazla eleman içeriyor |
| `Ingredients 模式最多支持 7 张参考图` | `Ingredients_images` 7'den fazla |
| `该模型族不支持此组合：family=… mode=… duration=…` | Backend'in seçtiği (mod, süre, çözünürlük) kombinasyonu registry'de yok |
