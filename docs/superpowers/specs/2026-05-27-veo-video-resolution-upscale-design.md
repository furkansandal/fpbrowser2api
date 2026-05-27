# /v1/videos veo resolution (720p/1080p/4k) + browser upscale — Tasarım

**Tarih:** 2026-05-27
**Durum:** Onaylandı (kullanıcı)
**Branch:** feat/veo-video-resolution-upscale

## Problem / Hedef

`/v1/videos`'ta `veo-3-1` ve `veo-omni-flash` modelleri için `resolution` parametresini
desteklemek: `720p` / `1080p` / `4k`. Parametre gelmezse `720p` kabul edilir (mevcut davranış).
`1080p` veya `4k` istenirse, base üretimden sonra browser/eklenti üzerinden bir **video upscale**
adımı çalıştırılır.

Mevcut durum (araştırma):
- `/v1/videos` → `CreateVideoRequest` (routes.py:73-86, `extra:allow`). `resolution` pass-through
  ama video için validate/kullanılmıyor.
- veo-3-1/omni-flash → `veo_workflow`. veo_workflow_executor.py:4801 video dalında
  `(_ext_resolution_label, _ext_want_upsample, _ext_upsample_target_resolution) = ("1K", False, None)`
  **hardcode** → video hep ~720p, upscale yok.
- Image upscale tam şablon olarak var: `_veo_resolve_image_output_resolution` (4527) +
  `extension_image_want_upsample`/`extension_image_upsample_target_resolution` ext_payload alanları;
  eklenti `upsampleImage` (veo_provider.js:1090) + `URLS.upsampleImage` (`flow/upsampleImage`) +
  `runImageWorkflow` içinde gen+upsample.
- **Video upscale kodu hiç yok** (Python + eklenti). `batchAsyncGenerateVideoUpsampleVideo`,
  `veo_3_1_upsampler_*`, `VIDEO_RESOLUTION_*` repoda yok.
- Eklenti zaten authenticated Flow API çağrısı yapıyor (`aisandbox-pa.googleapis.com/v1/`,
  Bearer + recaptcha `VIDEO_GENERATION`, `pageFetchJson` MAIN world). Üretim sonucu
  `generated_media_id` (media name) dönüyor → upscale girdisi hazır.

## Karar (kullanıcı)
- Upscale her iki model için de geçerli (veo-3-1 + veo-omni-flash), `veo_3_1` upsampler ile.
- Upscale başarısız olursa (recaptcha/kota/timeout) → **base 720p videoyu döndür** (best-effort) +
  uyarı logla. İstek yine de bir video döndürür.

## Yaklaşım: Eklenti tarafı, tek task (Image upscale deseniyle aynı)
`runVideoWorkflow` base videoyu üretir, `extension_video_want_upsample` set'liyse upscale
endpoint'ini çağırır + `pollVideo` ile bekler, başarılıysa upscaled URL/media_id'yi döndürür;
başarısızsa base sonucu korur. Tek `submit_extension_task(provider="veo")`. Auth/recaptcha zaten
browser context'inde mevcut.

(Alternatif — Python'ın iki ayrı task orkestre etmesi — daha çok round-trip ve state; reddedildi.)

## Resolution eşleme
| İstek | Base gen | Upscale |
|------|---------|---------|
| yok / `720p` | mevcut (1K/~720p) | yok |
| `1080p` | base | model `veo_3_1_upsampler_1080p`, resolution `VIDEO_RESOLUTION_1080P` |
| `4k` | base | model `veo_3_1_upsampler_4k`, resolution `VIDEO_RESOLUTION_4K` (base'den direkt) |

Kabul edilen değerler (case-insensitive, normalize): `720p`/`720`, `1080p`/`1080`/`fhd`,
`4k`/`2160`/`uhd`. Geçersiz değer → 400. Yokluk → `720p`.

## Değişiklikler

### 1. src/api/routes.py
- `CreateVideoRequest`'e `resolution: Optional[str] = None` ekle.
- `_normalize_video_task_payload` (veo-3-1: ~135-140, omni-flash: ~141-147) dallarında:
  `resolution`'ı normalize/validate et; geçersizse `HTTPException(400)`; sonucu task payload'ına
  `payload["resolution"] = <normalized>` olarak yaz (veo_workflow bunu okuyacak).
- Diğer video modelleri etkilenmez (yalnız bu iki model).

### 2. src/services/veo_workflow_executor.py
- Yeni `_veo_resolve_video_output_resolution(payload) -> tuple[str, bool, Optional[str], Optional[str]]`
  (image resolver'ın muadili, 4527 deseni): `(label, want_upsample, target_resolution_enum,
  upsampler_model_key)`. `payload.get("resolution")` okur.
  - `720p`/yok → `("720p", False, None, None)`
  - `1080p` → `("1080p", True, "VIDEO_RESOLUTION_1080P", "veo_3_1_upsampler_1080p")`
  - `4k` → `("4K", True, "VIDEO_RESOLUTION_4K", "veo_3_1_upsampler_4k")`
- Video dalında (4791-4802) satır 4801'i bu resolver'la dinamikleştir; video-özel değişkenlere
  ata. **`extension_image_*` alanları video için `("1K", False, None)` kalır** (image upscale
  yanlışlıkla tetiklenmesin).
- ext_payload'a (4836-4868) yeni alanlar ekle:
  - `extension_video_want_upsample: bool`
  - `extension_video_upsample_target_resolution: "VIDEO_RESOLUTION_1080P"|"VIDEO_RESOLUTION_4K"|None`
  - `extension_video_upsample_model_key: "veo_3_1_upsampler_1080p"|"veo_3_1_upsampler_4k"|None`
- Upscale istenince `submit_extension_task` timeout'unu artır (4895): base poll + upscale poll için
  ekstra süre (ör. want_upsample ise `+ max_wait_seconds` veya sabit ek ~+300s).

### 3. browser_extension/providers/veo_provider.js
- `URLS`'e `upsampleVideo: base + "video:batchAsyncGenerateVideoUpsampleVideo"` ekle.
- Yeni fonksiyon `upsampleVideo(tabId, { mediaId, targetResolution, videoModelKey, aspectRatio,
  seed, projectId, workflowId, sessionId }, at)`:
  - recaptcha = `getRecaptchaToken(tabId, "VIDEO_GENERATION")`.
  - payload (referans şekli): `{ mediaGenerationContext:{batchId}, clientContext:{projectId,
    tool:"PINHOLE", userPaygateTier, sessionId, recaptchaContext:{token,
    applicationType:"RECAPTCHA_APPLICATION_TYPE_WEB"}}, requests:[{resolution:targetResolution,
    aspectRatio, seed, videoModelKey, metadata:{workflowId}, videoInput:{mediaId}}],
    useV2ModelConfig:true }`.
  - POST `pageFetchJson(tabId, URLS.upsampleVideo, {POST, authHeaders(at), body})` → submit parse →
    `pollVideo` ile bekle → `{videoUrl, mediaName}`.
- `runVideoWorkflow` (1314) base gen sonrası (`generated_media_id`, `aspectRatio`, `workflowId`,
  `projectId` elde edilince), `p.extension_video_want_upsample` ise:
  - `try`: `upsampleVideo(...)` çağır; başarılıysa `share_url`/`generated_media_id`'yi upscaled
    değerlerle değiştir.
  - `catch`: uyarı logla, base sonucu koru (best-effort). 

## Veri akışı
`/v1/videos {model:veo-3-1, resolution:1080p}` → CreateVideoRequest → `_normalize_video_task_payload`
(resolution→payload) → task → `veo_workflow` → `_veo_resolve_video_output_resolution` → ext_payload
(want_upsample+target+model_key) → `submit_extension_task(provider="veo")` → `runVideoWorkflow`:
base üret → (want_upsample) upscale → poll → upscaled URL. Python `_ext_result`'ta upscaled
`share_url`/`generated_media_id` alır.

## Hata yönetimi
- Geçersiz `resolution` → istek anında 400.
- Upscale başarısız → best-effort: base 720p döner; eklenti `console.warn` + Python `append_log`.
- Flow upscale endpoint'i / omni-flash uyumsuzluğu → aynı best-effort fallback.

## Riskler / varsayımlar
- Upscale payload şekli referans (farklı) projeden; bu Flow API sürümünde farklılık olabilir →
  runtime doğrulaması gerek; best-effort fallback riski azaltır.
- omni-flash (abra_t2v_10s) çıktısı `veo_3_1` upsampler'a verilince Flow kabul etmeyebilir → base
  720p'ye düşer.
- 720p/varsayılan = mevcut davranış birebir korunur (geriye dönük uyumlu).

## Test / doğrulama
- Python birim: `_veo_resolve_video_output_resolution` eşleme (yok/720p/1080p/4k/geçersiz);
  `_normalize_video_task_payload` resolution validasyonu (default/valid/invalid→400).
- `python3 -m py_compile` routes.py + veo_workflow_executor.py; mümkünse import.
- Eklenti: node ile syntax check (`node --check veo_provider.js`); fonksiyonel doğrulama 1080p ile
  `/v1/videos` çağrılıp upscale çağrısı + sonuç gözlemlenerek (deploy ortamında).

## Kapsam dışı
- veo-3-1/omni-flash dışındaki video modelleri.
- Image upscale akışı (zaten mevcut; dokunulmuyor).
