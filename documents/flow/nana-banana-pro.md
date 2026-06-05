# nana-banana-pro  ·  Flow / nana-banana (görsel)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `veo_workflow`

Nana Banana Pro görsel üretim modeli (daha yüksek kaliteli Pro varyant). Endpoint yolu `/v1/videos` olsa da çıktı **görseldir**; sonuç `image_url` / `url` alanından okunur. Prompt ile metinden görsel ve `images` ile çoklu referanslı görsel üretimi (en fazla 10 referans) destekler.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"nana-banana-pro"` |
| prompt | string | ✅ | — | Üretim promptu |
| aspect_ratio | string | ⬜ | `16:9` | `1:1` / `4:3` / `3:4` / `16:9` / `9:16` |
| resolution | string | ⬜ | `1k` | `1k` veya `2k`. `4k` gönderilirse otomatik `1k`'ya düşürülür (4k için `nana-banana-pro-4k` kullanın) |
| images | string[] | ⬜ | — | Çoklu referans görsel dizisi, en fazla 10 |
| image_url / first_image_url | string | ⬜ | — | Tek referans görsel URL'i (`images` verilmezse) |
| duration | int | ⬜ | — | Görsel üretiminde gerekmez/etkisizdir |

> Zorunlu = ✅, Optional = ⬜

## Minimal örnek
```json
{ "model": "nana-banana-pro", "prompt": "premium editorial product photo, luxury magazine style, soft studio light" }
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "nana-banana-pro",
  "prompt": "create a premium campaign image using all references",
  "aspect_ratio": "9:16",
  "resolution": "2k",
  "images": [
    "https://your-cdn.com/product.jpg",
    "https://your-cdn.com/background-style.jpg",
    "https://your-cdn.com/brand-color.jpg"
  ],
  "image_url": "https://your-cdn.com/reference.jpg"
}
```

## Notlar
- **Çıktı görseldir.** Polling tamamlandığında `image_url`/`url` dolar; `video_url` genelde `null`'dur.
- **resolution:** `1k` (varsayılan) / `2k`. `4k` değeri kabul edilir ama sunucu içeride `1k`'ya indirir — gerçek 4k için ayrı `nana-banana-pro-4k` modeli kullanılmalıdır.
- **Çoklu referans:** `images` en fazla **10** görsel kabul eder. Tek referans için `image_url` / `first_image_url`.
- `nana-banana-2`'den farkı: sunucu dahili `image_model_name="GEM_PIX_2"` atar (nana-banana-2'de `NARWHAL`). `n_frames=1`'dir.
- `negative_prompt` ve `seed` alanları şemada kabul edilir ama Flow/veo akışında **kullanılmaz**.
