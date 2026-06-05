# sora-pro  ·  Sora (video)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `sora-pro` ⚠️ (bu kurulumun DB'sinde tanımlı **değil** — bkz. aşağıdaki "DB durumu". Sözleşme içeriği aslında **Seedance 2 / Dreamina** ile birebir aynıdır.)

Sora Pro ile metinden video, ilk/son kare (`first_last_frames`) ve çoklu referans görsel (`omni_reference`) modlarında video üretir. Süre sözleşmede sabit `15` sn'dir.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"sora-pro"` |
| prompt | string | ✅ | — | Üretim metni. |
| duration | int | ✅ | — | Sözleşmede sabit `15`. |
| aspect_ratio | string | ⬜ | `16:9` | Sözleşme: `16:9` / `9:16` / `1:1` / `4:3` / `3:4` / `21:9`. |
| resolution | string | ⬜ | `720p` | `480p` / `720p` / `1080p`. |
| function_mode | string | ⬜ | — | İlk/son kare için `first_last_frames`; çoklu referans için `omni_reference`; metinden videoda boş bırakılır. |
| images | string[] | ⬜ | — | Görsel URL dizisi. `first_last_frames` ≤2 (sıra: `[ilk, son]`); `omni_reference` ≤9. |
| first_image_url | string | ⬜ | — | İlk kare URL (images yerine ayrı alan). |
| last_image_url | string | ⬜ | — | Son kare URL (images yerine ayrı alan). |

> Zorunlu = ✅, Optional = ⬜

## Minimal örnek
```json
{
  "model": "sora-pro",
  "prompt": "a cinematic drone shot over a misty mountain village at sunrise",
  "duration": 15
}
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "sora-pro",
  "prompt": "use the character, outfit and product references to make a fashion commercial video",
  "duration": 15,
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "function_mode": "omni_reference",
  "images": [
    "https://your-cdn.com/character.jpg",
    "https://your-cdn.com/outfit.jpg",
    "https://your-cdn.com/product.jpg"
  ],
  "first_image_url": "https://your-cdn.com/first.jpg",
  "last_image_url": "https://your-cdn.com/last.jpg"
}
```
> Not: `function_mode: "first_last_frames"` kullanımında `images: [ilk, son]` ya da `first_image_url` + `last_image_url` verilir; `omni_reference` kullanımında `images` (≤9) verilir. İkisi birlikte tipik değildir, yukarıdaki blok tüm alanların biçimini göstermek içindir.

## Notlar
- **⚠️ DB durumu + handler (DOĞRULANDI):** Bu kurulumun `data/fpbrowser.db` `task_types` tablosunda tanımlı kodlar yalnızca: `veo_workflow`, `sora_gen_video`, `dreamina_workflow`, `gpt_workflow` (+ kullanılmayan `gen_video`/`gen_image`). **`sora-pro` task tipi tanımlı DEĞİL.** Dolayısıyla `model:"sora-pro"` ile `/v1/videos`'a istek atmak `task_type_code="sora-pro"` üretir ve DB'de eşleşme bulunmadığından `400 task_type_code 不存在或未启用` (routes.py:567) döner.
- **Bu içerik aslında Seedance 2'dir:** Kaynak sözleşme `视频生成接口-sora-pro.md`'nin başlığı **"🎬 Seedance 2 · 视频异步 API"** ve alan kümesi (`duration=15`, `function_mode` `first_last_frames`/`omni_reference`, `images` ≤9, `aspect_ratio` 16:9/9:16/1:1/4:3/3:4/21:9, `resolution` 480p/720p/1080p) **`documents/dreamina/seedance-2.md` ile birebir aynıdır.** Yani "sora-pro" pratikte Seedance/Dreamina hattının bir rebrand adıdır. Bu gelişmiş alanların (omni_reference vb.) çalışması için arkada **`dreamina_workflow`** yürütücüsü gerekir — `sora_gen_video` (gerçek Sora) yürütücüsü bunları desteklemez (yalnızca `prompt` + tek `first_image_url` + 16:9/9:16 + sabit `sy_8`).
- **Çalıştırma yolu (önerilen):** "sora-pro" sözleşmesindeki Seedance davranışını istiyorsanız doğrudan **`seedance-2`** modelini kullanın (`documents/dreamina/seedance-2.md`), bu DB'de `dreamina_workflow`'a eşlenir. Alternatif olarak admin panelinden `sora-pro` adlı bir task type tanımlayıp handler'ını `dreamina_workflow` davranışına bağlayın.
- **Endpoint kanıtı (kod):** `src/api/routes.py:747` `@router.post("/v1/videos")` → `create_video()`.
- **İç task tipi kanıtı:** `_normalize_video_task_payload` içinde `sora-pro` için özel dal **yoktur**; `else: task_type_code = model` (routes.py:229-230). (`seedance-2`/`seedance-2-fast` → `dreamina_workflow` mapping'i ayrıdır; `sora-pro` ona dahil değildir.)
- **Passthrough:** `CreateVideoRequest` `extra="allow"` (routes.py:88) → `function_mode`, `first_image_url`, `last_image_url`, `images` gibi şemada açıkça tanımsız alanlar payload'a aktarılır. `exclude_none=True` (routes.py:752) ile `null` alanlar düşürülür.
- **Görsel (image) üretimi:** Sora bu kod tabanında **video-only**'dir.
