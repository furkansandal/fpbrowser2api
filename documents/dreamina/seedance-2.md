# seedance-2  ·  Dreamina / Seedance (video)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `dreamina_workflow`

Dreamina (即梦/CapCut) üzerinden Seedance 2.0 **Pro** modeliyle video üretir. Tek istekle text-to-video, ilk/son kare (i2v) ve çoklu referans görsel (omni) modlarını destekler. Üretim, login'li parmak izi penceresindeki tarayıcı uzantısı ile yapılır; ana kısıt **`duration` yalnızca 15 saniye** kabul eder.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"seedance-2"` → iç model `dreamina_seedance_40_pro` (Pro). |
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
{ "model": "seedance-2", "prompt": "a golden retriever puppy running through sunflowers, cinematic", "duration": 15 }
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "seedance-2",
  "prompt": "use the character and product references to make a fashion commercial",
  "duration": 15,
  "aspect_ratio": "16:9",
  "resolution": "1080p",
  "function_mode": "omni_reference",
  "images": [
    "https://your-cdn.com/character.jpg",
    "https://your-cdn.com/outfit.jpg",
    "https://your-cdn.com/product.jpg"
  ]
}
```

İlk/son kare (i2v) örneği:
```json
{
  "model": "seedance-2",
  "prompt": "animate naturally from the first frame to the final frame",
  "duration": 15,
  "aspect_ratio": "9:16",
  "function_mode": "first_last_frames",
  "first_image_url": "https://your-cdn.com/first.jpg",
  "last_image_url": "https://your-cdn.com/last.jpg"
}
```

## Notlar
- **i2v / görsel girdi desteklenir:** `first_last_frames` (1–2 görsel) ve `omni_reference` (≤9 görsel). Kanıt: `jimeng_task_executor.py:3923-3936`, `_dreamina_collect_first_last_image_refs`, `_dreamina_collect_external_omni_image_refs`.
- **Sadece video:** Bu model görsel ÜRETMEZ; çıktı her zaman `workflow_kind: "video"` (`jimeng_task_executor.py:4034`).
- **duration:** `_dreamina_resolve_duration` yalnızca `15`'i kabul eder; eksik/farklı değer `422` (`jimeng_task_executor.py:372-382`).
- **Referans görseller https zorunlu** (`_dreamina_require_https_image_ref`, `jimeng_task_executor.py:688-691`).
- **Yok sayılan alanlar:** Public şema `negative_prompt`, `seed`, `n`, `size`, `quality` alanlarını kabul eder (`routes.py:80-86`) ama Dreamina executor bunları kullanmaz — `seed` üretim sırasında dahili olarak rastgele atanır (`jimeng_task_executor.py:1730`).
- **Kaynak ile kod farkı:** `api-des.md` seedance için `duration` 10/15 der; **kod yalnızca 15 kabul eder** → kod esas alındı.
- **Pro/Fast farkı:** `seedance-2` Pro (`dreamina_seedance_40_pro`), `seedance-2-fast` Fast (`dreamina_seedance_40`) iç model anahtarına eşlenir (`jimeng_task_executor.py:94-113`). Alan sözleşmesi ikisinde aynıdır.
