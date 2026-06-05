# seedance-2-fast  ·  Dreamina / Seedance (video)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `dreamina_workflow`

Dreamina (即梦/CapCut) üzerinden Seedance 2.0 **Fast** modeliyle video üretir — `seedance-2` (Pro) ile aynı istek sözleşmesi, daha hızlı/ekonomik üretim hattı. Text-to-video, ilk/son kare (i2v) ve çoklu referans görsel (omni) modlarını destekler. Üretim login'li parmak izi penceresindeki tarayıcı uzantısı ile yapılır; ana kısıt **`duration` yalnızca 15 saniye** kabul eder.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"seedance-2-fast"` → iç model `dreamina_seedance_40` (Fast). |
| prompt | string | ✅ | — | Üretim açıklaması. `@1` gibi **sayısal** token = DB'ye önceden kaydedilmiş subject referansı; `@xxx` (sayısal olmayan) token = `images`'taki harici https referans görsel sırasını işaretler. |
| duration | int | ✅ | — | Video süresi (sn). **Yalnızca `15`** destekleniyor; boş/farklı değer 422 verir. |
| aspect_ratio | string | ⬜ | `"16:9"` | İzin verilenler: `16:9` / `9:16` / `1:1` / `4:3` / `3:4` / `21:9`. `size_ratio` / `ratio` / `size` ve orientation alanları da okunur. Geçersizse `16:9`'a düşer. |
| resolution | string | ⬜ | `"720p"` | `480p` / `720p` / `1080p`. `quality_resolution` da okunur. Listede yoksa `720p`. |
| function_mode | string | ⬜ | (otomatik) | `first_last_frames` (1–2 görsel, ilk/son kare) veya `omni_reference` (≤9 görsel). Görsel yoksa otomatik **text-to-video**. |
| images | array | ⬜ | — | Referans görsel **https** URL dizisi. `first_last_frames` → max 2; `omni_reference` → max 9. (`image_urls`, `reference_images` vb. de kabul edilir.) |
| first_image_url | string | ⬜ | — | İlk kare (i2v / first_last_frames). `first_frame_image`, `image_file_1` eşanlamlı. |
| last_image_url | string | ⬜ | — | Son kare (first_last_frames). `end_frame_image`, `image_file_2` eşanlamlı. |
| image_file_1 … image_file_9 | string | ⬜ | — | Omni modda tekil slot ataması; prompt'taki `@N` token'larıyla eşleşir. |
| model_name | string | ⬜ | — | Açık model adı override (alias tablosundan çözümlenir). |

> Zorunlu = ✅, Optional = ⬜
> Tüm referans görseller **https** olmalıdır (http/file reddedilir).

## Minimal örnek
```json
{ "model": "seedance-2-fast", "prompt": "a neon hummingbird hovering over a glass flower, macro shot", "duration": 15 }
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "seedance-2-fast",
  "prompt": "combine the character and the outfit references into a short runway clip",
  "duration": 15,
  "aspect_ratio": "9:16",
  "resolution": "720p",
  "function_mode": "omni_reference",
  "images": [
    "https://your-cdn.com/character.jpg",
    "https://your-cdn.com/outfit.jpg"
  ]
}
```

İlk/son kare (i2v) örneği:
```json
{
  "model": "seedance-2-fast",
  "prompt": "animate smoothly from the first frame to the last frame",
  "duration": 15,
  "aspect_ratio": "16:9",
  "function_mode": "first_last_frames",
  "images": [
    "https://your-cdn.com/first.jpg",
    "https://your-cdn.com/last.jpg"
  ]
}
```

## Notlar
- **i2v / görsel girdi desteklenir:** `first_last_frames` (1–2 görsel) ve `omni_reference` (≤9 görsel). Kanıt: `jimeng_task_executor.py:3923-3936`.
- **Sadece video:** Bu model görsel ÜRETMEZ; çıktı her zaman `workflow_kind: "video"` (`jimeng_task_executor.py:4034`).
- **duration:** `_dreamina_resolve_duration` yalnızca `15`'i kabul eder; eksik/farklı değer `422` (`jimeng_task_executor.py:372-382`).
- **Referans görseller https zorunlu** (`_dreamina_require_https_image_ref`, `jimeng_task_executor.py:688-691`).
- **Yok sayılan alanlar:** Public şema `negative_prompt`, `seed`, `n`, `size`, `quality` alanlarını kabul eder (`routes.py:80-86`) ama Dreamina executor bunları kullanmaz — `seed` üretim sırasında dahili olarak rastgele atanır (`jimeng_task_executor.py:1730`).
- **Kaynak ile kod farkı:** `api-des.md` seedance için `duration` 10/15 der; **kod yalnızca 15 kabul eder** → kod esas alındı.
- **Pro/Fast farkı:** `seedance-2-fast` Fast (`dreamina_seedance_40`), `seedance-2` Pro (`dreamina_seedance_40_pro`) iç model anahtarına eşlenir (`jimeng_task_executor.py:94-113`). Alan sözleşmesi ikisinde aynıdır.
