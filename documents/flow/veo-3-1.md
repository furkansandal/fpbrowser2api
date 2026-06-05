# veo-3-1  ·  Flow / Veo (video)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `veo_workflow`

VEO 3.1 video modeli. Sadece prompt ile **t2v** (metinden video), ilk/son kare görseli ile **i2v** (görselden video) ve `Ingredients_images` çoklu referans ile **r2v** (referanstan video) modlarını destekler. Ana kısıt: `duration` **mutlaka 8** olmalıdır; başka değer 400 döner.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"veo-3-1"` |
| prompt | string | ✅ | — | Üretim promptu |
| duration | int | ✅ | — | Sabit `8` zorunlu; farklı değer → `400 veo-3-1 only supports duration=8` |
| aspect_ratio | string | ⬜ | `16:9` | `16:9` veya `9:16` |
| resolution | string | ⬜ | `720p` | `720p` / `1080p` / `4k`. `1080p` ve `4k`, üretim sonrası tarayıcı eklentisiyle video upscale edilir |
| images | string[] | ⬜ | — | i2v için kare dizisi; sıra `[ilk_kare, son_kare]`, en fazla 2. Tek görsel = ilk kare |
| first_image_url / image_url | string | ⬜ | — | İlk kare URL'i (`images` verilmezse) |
| last_image_url / end_image_url | string | ⬜ | — | Son kare URL'i. **Sadece son kare verilemez**, ilk kare de gerekir |
| Ingredients_images / ingredients_images | string[] | ⬜ | — | r2v çoklu referans görsel. Resmi doküman max 3 der; kod max 8'e izin verir (bkz. Notlar) |

> Zorunlu = ✅, Optional = ⬜

## Minimal örnek
```json
{ "model": "veo-3-1", "prompt": "a cinematic shot of a city at dawn, slow camera push-in", "duration": 8 }
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "veo-3-1",
  "prompt": "animate smoothly from the first frame to the last frame, cinematic motion",
  "duration": 8,
  "aspect_ratio": "16:9",
  "resolution": "1080p",
  "images": [
    "https://your-cdn.com/first.jpg",
    "https://your-cdn.com/last.jpg"
  ],
  "first_image_url": "https://your-cdn.com/first.jpg",
  "last_image_url": "https://your-cdn.com/last.jpg",
  "Ingredients_images": [
    "https://your-cdn.com/ref-1.jpg",
    "https://your-cdn.com/ref-2.jpg",
    "https://your-cdn.com/ref-3.jpg"
  ]
}
```

## Notlar
- **duration zorunlu ve sabit 8'dir.** `8` dışında bir değer (veya eksik) `400` hatası verir.
- **resolution upscale:** `1080p` ve `4k`, modelden değil; üretilen videonun tarayıcı eklentisiyle sonradan büyütülmesiyle elde edilir. Varsayılan `720p`.
- **i2v sırası:** `images` verilirken `[0]=ilk kare`, `[1]=son kare`. Yalnızca son kare verip ilk kareyi atlamak hatadır (`first_image_url`/`images[0]` zorunlu).
- **r2v (çoklu referans):** `Ingredients_images` (veya `ingredients_images`) ile çalışır. Resmi API dokümanı en fazla **3** referans yazar; ancak koddaki kontrol en fazla **8** referansa izin verir (8'den fazlasında `Ingredients 模式最多支持 8 张参考图` / 400). Kod esas alındı.
- Sunucu bu modelde dahili olarak `n_frames=240` atar; isteğe konursa üzerine yazılır.
- `negative_prompt` ve `seed` alanları `/v1/videos` şemasında kabul edilir ama Flow/veo akışında **kullanılmaz** (etkisizdir).
