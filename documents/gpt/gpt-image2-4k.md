# gpt-image2-4k  ·  GPT-Image2 (görsel)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `gpt_workflow`

ChatGPT (gpt-image-2) üzerinden **4K** çözünürlükte görsel üretir. Yalnızca `prompt` verilirse metin→görsel (text-to-image), bir veya birden fazla referans görsel verilirse görsel düzenleme (image edit) modunda çalışır. `duration` görsel modunda yalnızca `1` olabilir.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"gpt-image2-4k"` (model adı 4K çözünürlüğü seçer) |
| prompt | string | ✅ | — | Üretim/düzenleme talimatı. Boş olamaz. |
| duration | int | ⬜ | 1 | Yalnızca `1` (görsel modu). Başka değer → HTTP 400. |
| aspect_ratio | string | ⬜ | "1:1" | En-boy oranı. `ratio` ile eşdeğer. Desteklenen oranlar için Notlar. |
| ratio | string | ⬜ | "1:1" | `aspect_ratio` takma adı. İkisi de varsa `ratio` önceliklidir. |
| n | int | ⬜ | 1 | Üretilecek görsel sayısı. 1–4 ile sınırlanır (`count`, `batch_size` de kabul edilir). |
| image | string | ⬜ | — | Tek referans görsel URL'i → **edit** modunu tetikler. |
| images | array | ⬜ | — | Çok referanslı görsel listesi → **edit** modunu tetikler. |
| image_url / image_urls | string / array | ⬜ | — | Referans görsel(ler); `images` ile aynı işlevde, **edit** tetikler. |
| size | string | ⬜ | (orandan türetilir) | Açık piksel boyutu (örn. `"3312x1872"`). Bu modelde tier ile çelişen değer yok sayılıp orandan yeniden hesaplanır. |
| negative_prompt | string | ⬜ | — | İstenmeyen öğeler (透传 — sağlayıcı yok sayabilir). |
| seed | int | ⬜ | — | Tohum (透传 — sağlayıcı yok sayabilir). |
| quality | string | ⬜ | — | Kalite ipucu (透传). |
| operation | string | ⬜ | (otomatik) | Referans görsel varsa otomatik `"edit"` atanır; elle vermeye gerek yok. |
| resolution | string | ⬜ | "4k" | Model adından gelir; gövdede verilse bile model adı (`gpt-image2-4k`) ile ezilir. |

> Zorunlu = ✅, Optional = ⬜

## Minimal örnek
```json
{ "model": "gpt-image2-4k", "prompt": "retro neon poster, cyberpunk girl" }
```

## Tam örnek (tüm optional alanlar dahil — edit modu dahil)
```json
{
  "model": "gpt-image2-4k",
  "prompt": "the character from the reference photo, standing in a futuristic neon city",
  "duration": 1,
  "aspect_ratio": "16:9",
  "n": 1,
  "images": [
    "https://your-cdn.com/character.jpg",
    "https://your-cdn.com/scene.jpg"
  ],
  "size": "3312x1872",
  "negative_prompt": "blurry, low quality, watermark",
  "seed": 12345,
  "quality": "high"
}
```

## Notlar
- **text-to-image vs edit:** Sadece `prompt` (+ opsiyonel `aspect_ratio`) verilirse metinden görsel üretilir. `image`, `images`, `image_url`, `image_urls`, `reference_images`, `mask` gibi herhangi bir referans alanı doluysa **edit** moduna geçilir.
- **Edit nasıl tetiklenir:** Route katmanı (`/v1/videos`) `images` / `image` / `image_url` görürse `operation="edit"` atar. Executor katmanı ise daha geniş bir referans alan kümesinden (yukarıdakiler + `imageUrls`, `ref_assets`, `reference_image_urls`, `input_images`, `ingredients_images` vb.) URL toplar ve `operation` boşsa yine `edit` yapar. Yani `image_urls` ile de edit tetiklenir.
- **ratio / aspect_ratio:** İkisi eşdeğer; verilmezse `1:1`. Bu tier'da desteklenen oran→piksel tablosu:
  `1:1`=2480x2480, `3:2`=3056x2032, `2:3`=2032x3056, `4:3`=2880x2160, `3:4`=2160x2880, `5:4`=2784x2224, `4:5`=2224x2784, `16:9`=3312x1872, `9:16`=1872x3312, `21:9`=3808x1632.
- **resolution / size_tier farkı:** Bu üç model çözünürlük dışında aynıdır. `gpt-image2-4k` → `resolution=4k`, `size_tier=4K` (en yüksek piksel boyutları). Çözünürlük **model adıyla** seçilir; gövdedeki `resolution`/`size` alanları tier ile çelişiyorsa ezilir. 1K için `gpt-image2-1k`, 2K için `gpt-image2-2k` kullanın.
- **size:** Açıkça geçerli bir tier boyutu verilmediyse `aspect_ratio`'dan otomatik hesaplanır.
- **Çıktı:** Sonuç bir görseldir (`.png`). `GET /v1/videos/{id}` ile sorgulandığında `video_url=null`, `image_url` dolu döner.
- **Model adı uyumsuzluğu:** Resmi sözleşme dosyası `gpt-image-2-2K` gibi adlar kullanır; çalışan kod ise `gpt-image2-1k/2k/4k` adlarını kabul eder (kod esas alınmıştır).
