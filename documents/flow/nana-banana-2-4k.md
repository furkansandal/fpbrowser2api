# nana-banana-2-4k  ·  Flow / nana-banana (görsel, 4k)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `veo_workflow`

Nana Banana 2'nin **4K** varyantı. `nana-banana-2` ile aynı görsel üretim modeli olup tek farkı çıktının sabit **4K** çözünürlükte olmasıdır: sunucu `resolution`'ı her zaman `4k`'ya zorlar ve isteğe gönderilen değer dikkate alınmaz. Çıktı görseldir; sonuç `image_url` / `url`'den okunur.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"nana-banana-2-4k"` |
| prompt | string | ✅ | — | Üretim promptu |
| aspect_ratio | string | ⬜ | `16:9` | `1:1` / `4:3` / `3:4` / `16:9` / `9:16` |
| resolution | string | ⬜ | `4k` (sabit) | Sunucu tarafından her zaman `4k`'ya ayarlanır; gönderilen değer yok sayılır |
| images | string[] | ⬜ | — | Çoklu referans görsel dizisi, en fazla 10 |
| image_url / first_image_url | string | ⬜ | — | Tek referans görsel URL'i (`images` verilmezse) |
| duration | int | ⬜ | — | Görsel üretiminde gerekmez/etkisizdir |

> Zorunlu = ✅, Optional = ⬜

## Minimal örnek
```json
{ "model": "nana-banana-2-4k", "prompt": "a cute banana mascot wearing sunglasses, studio lighting, high detail" }
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "nana-banana-2-4k",
  "prompt": "make a 4k poster using the character style and product reference",
  "aspect_ratio": "4:3",
  "images": [
    "https://your-cdn.com/character.jpg",
    "https://your-cdn.com/product.jpg"
  ],
  "image_url": "https://your-cdn.com/reference.jpg"
}
```

## Notlar
- **resolution sabit `4k`'dır.** Sunucu `payload["resolution"] = "4k"` olarak override eder; istekte ne gönderirseniz gönderin sonuç 4K olur.
- 4K çıktı, üretilen görselin Flow upsample adımıyla (`UPSAMPLE_IMAGE_RESOLUTION_4K`) büyütülmesiyle elde edilir (`resolution=4k` + `n_frames=1`).
- `nana-banana-2` ile aynı: dahili `image_model_name="NARWHAL"`, `n_frames=1`. Tek fark çözünürlüğün 4K'ya sabitlenmesidir.
- **Çoklu referans:** `images` en fazla 10; tek referans için `image_url` / `first_image_url`.
- `negative_prompt` ve `seed` alanları şemada kabul edilir ama Flow/veo akışında **kullanılmaz**.
