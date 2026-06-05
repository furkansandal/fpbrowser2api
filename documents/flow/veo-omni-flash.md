# veo-omni-flash  ·  Flow / Veo (video)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `veo_workflow`

VEO Omni Flash video modeli (10 saniyelik hızlı video). Sadece prompt ile **t2v**, ilk/son kare görseliyle **i2v** ve `Ingredients_images` ile **r2v** modlarını destekler. Ana kısıt: `duration` **mutlaka 10** olmalıdır; başka değer 400 döner.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"veo-omni-flash"` |
| prompt | string | ✅ | — | Üretim promptu |
| duration | int | ✅ | — | Sabit `10` zorunlu; farklı değer → `400 veo-omni-flash only supports duration=10` |
| aspect_ratio | string | ⬜ | `16:9` | `16:9` veya `9:16` |
| resolution | string | ⬜ | `720p` | `720p` / `1080p` / `4k`. `1080p` ve `4k`, üretim sonrası tarayıcı eklentisiyle video upscale edilir |
| images | string[] | ⬜ | — | i2v için kare dizisi; sıra `[ilk_kare, son_kare]`, en fazla 2. Tek görsel = ilk kare |
| first_image_url / image_url | string | ⬜ | — | İlk kare URL'i (`images` verilmezse) |
| last_image_url / end_image_url | string | ⬜ | — | Son kare URL'i. **Sadece son kare verilemez**, ilk kare de gerekir |
| Ingredients_images / ingredients_images | string[] | ⬜ | — | r2v çoklu referans görsel. Resmi doküman max 3 der; kod max 8'e izin verir (bkz. Notlar) |

> Zorunlu = ✅, Optional = ⬜

## Minimal örnek
```json
{ "model": "veo-omni-flash", "prompt": "animate the scene with dynamic camera movement and natural lighting", "duration": 10 }
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "veo-omni-flash",
  "prompt": "create a 10 second cinematic video using all references",
  "duration": 10,
  "aspect_ratio": "9:16",
  "resolution": "1080p",
  "images": [
    "https://your-cdn.com/first.jpg",
    "https://your-cdn.com/last.jpg"
  ],
  "first_image_url": "https://your-cdn.com/first.jpg",
  "last_image_url": "https://your-cdn.com/last.jpg",
  "Ingredients_images": [
    "https://your-cdn.com/character.jpg",
    "https://your-cdn.com/product.jpg"
  ]
}
```

## Notlar
- **duration zorunlu ve sabit 10'dur.** `10` dışında bir değer (veya eksik) `400` hatası verir.
- **resolution upscale:** `1080p` ve `4k`, üretilen videonun tarayıcı eklentisiyle sonradan büyütülmesiyle elde edilir. Varsayılan `720p`.
- **i2v sırası:** `images` verilirken `[0]=ilk kare`, `[1]=son kare`. Yalnızca son kare verip ilk kareyi atlamak hatadır.
- **r2v (çoklu referans):** `Ingredients_images` (veya `ingredients_images`) ile çalışır. Resmi API dokümanı en fazla **3** referans yazar; koddaki kontrol en fazla **8**'e izin verir. Kod esas alındı.
- Sunucu bu modelde dahili olarak `n_frames=300` ve `video_model="abra_t2v_10s"` atar; istekte gönderilen `video_url` bu modelde temizlenir.
- `negative_prompt` ve `seed` alanları şemada kabul edilir ama Flow/veo akışında **kullanılmaz**.
