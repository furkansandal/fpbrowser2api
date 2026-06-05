# veo-omni-flash-video-edit  ·  Flow / Veo (video edit / r2v)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `veo_workflow`

VEO Omni Flash'in **video düzenleme / referanstan video (r2v)** varyantı. Mevcut bir referans videoyu (`video_url`) ve/veya referans görselleri (`Ingredients_images`) prompt ile yeniden işler. Sunucu içeride modeli `veo-omni-flash`'e eşler. Ana kısıt: `duration` **mutlaka 8** olmalıdır.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"veo-omni-flash-video-edit"` |
| prompt | string | ✅ | — | Düzenleme/üretim promptu |
| duration | int | ✅ | — | Sabit `8` zorunlu; farklı değer → `400` (hata mesajı `veo-omni-flash only supports duration=8`) |
| video_url | string | ⬜ | — | Düzenlenecek/referans alınacak kaynak video URL'i (en fazla 1) |
| Ingredients_images / ingredients_images | string[] | ⬜ | — | r2v referans görselleri. Resmi doküman max 3 der; kod max 8'e izin verir (bkz. Notlar) |
| aspect_ratio | string | ⬜ | `16:9` | `16:9` veya `9:16` |
| resolution | string | ⬜ | `720p` | `720p` / `1080p` / `4k`. `1080p` ve `4k` üretim sonrası eklenti ile upscale edilir |
| images | string[] | ⬜ | — | i2v ilk/son kare dizisi `[ilk, son]`, en fazla 2 (i2v moduna düşerse) |
| first_image_url / image_url | string | ⬜ | — | İlk kare URL'i |
| last_image_url / end_image_url | string | ⬜ | — | Son kare URL'i; sadece son kare verilemez |

> Zorunlu = ✅, Optional = ⬜

## Minimal örnek
```json
{ "model": "veo-omni-flash-video-edit", "prompt": "restyle this clip into a neon cyberpunk look", "duration": 8, "video_url": "https://your-cdn.com/source.mp4" }
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "veo-omni-flash-video-edit",
  "prompt": "restyle and re-light the source video using the reference images, cinematic grade",
  "duration": 8,
  "aspect_ratio": "16:9",
  "resolution": "1080p",
  "video_url": "https://your-cdn.com/source.mp4",
  "Ingredients_images": [
    "https://your-cdn.com/ref-1.jpg",
    "https://your-cdn.com/ref-2.jpg",
    "https://your-cdn.com/ref-3.jpg"
  ]
}
```

## Notlar
- **duration zorunlu ve sabit 8'dir** (video-edit varyantı için). `8` dışında değer 400 döndürür. Hata metni kaynak kodda `veo-omni-flash only supports duration=8` olarak geçer (kopyala-yapıştır kalıntısı; geçerli kısıt 8'dir).
- Sunucu modeli içeride `model="veo-omni-flash"`, `video_model="abra_t2v_10s"`, `n_frames=300` olarak ayarlar. Bu model `veo-omni-flash`'ten farklı olarak `video_url`'i **temizlemez** — kaynak videoyu düzenleme/referans için kullanır.
- **Referans video:** Yalnızca `payload.video_url` alanından okunur, en fazla 1 video. Başka referans/sonuç alanlarından video çözümlenmez.
- **r2v referans görselleri:** `Ingredients_images` (veya `ingredients_images`); resmi doküman max 3, kod max 8'e izin verir (8'den fazlasında 400). Kod esas alındı.
- **resolution upscale:** `1080p`/`4k` üretim sonrası tarayıcı eklentisiyle yapılır. Varsayılan `720p`.
- `negative_prompt` ve `seed` alanları şemada kabul edilir ama Flow/veo akışında **kullanılmaz**.
