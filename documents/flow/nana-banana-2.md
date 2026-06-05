# nana-banana-2  ·  Flow / nana-banana (görsel)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `veo_workflow`

Nana Banana 2 standart görsel üretim modeli. Endpoint yolu `/v1/videos` olsa da çıktı **görseldir**; tamamlanınca sonuç `image_url` / `url` alanından okunur. Prompt ile metinden görsel ve `images` ile çoklu referanslı görsel üretimi (en fazla 10 referans) destekler.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"nana-banana-2"` |
| prompt | string | ✅ | — | Üretim promptu |
| aspect_ratio | string | ⬜ | `16:9` | `1:1` / `4:3` / `3:4` / `16:9` / `9:16` |
| resolution | string | ⬜ | `1k` | `1k` veya `2k`. `4k` gönderilirse otomatik `1k`'ya düşürülür (4k için `nana-banana-2-4k` kullanın) |
| images | string[] | ⬜ | — | Çoklu referans görsel dizisi, en fazla 10 |
| image_url / first_image_url | string | ⬜ | — | Tek referans görsel URL'i (`images` verilmezse) |
| duration | int | ⬜ | — | Görsel üretiminde gerekmez/etkisizdir |

> Zorunlu = ✅, Optional = ⬜

## Minimal örnek
```json
{ "model": "nana-banana-2", "prompt": "a playful banana mascot in a modern 3D icon style" }
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "nana-banana-2",
  "prompt": "make a poster using the character style and product reference",
  "aspect_ratio": "4:3",
  "resolution": "2k",
  "images": [
    "https://your-cdn.com/character.jpg",
    "https://your-cdn.com/product.jpg"
  ],
  "image_url": "https://your-cdn.com/reference.jpg"
}
```

## Notlar
- **Çıktı görseldir.** Polling (`GET /v1/videos/{task_id}`) tamamlandığında `image_url`/`url` dolar; `video_url` genelde `null`'dur.
- **resolution:** `1k` (varsayılan) / `2k`. `4k` değeri kabul edilir ama sunucu içeride `1k`'ya indirir — gerçek 4k için ayrı `nana-banana-2-4k` modeli kullanılmalıdır.
- **Çoklu referans:** `images` en fazla **10** görsel kabul eder (fazlası 400). Tek referans için `image_url` / `first_image_url` da kullanılabilir.
- Sunucu bu modelde dahili olarak `n_frames=1` ve `image_model_name="NARWHAL"` atar (görsel modu).
- `negative_prompt` ve `seed` alanları şemada kabul edilir ama Flow/veo akışında **kullanılmaz**.
