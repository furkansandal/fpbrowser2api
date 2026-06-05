# sora2  ·  Sora (video)

**Endpoint:** `POST /v1/videos`
**İç task tipi:** `sora2` ⚠️ (bu kurulumun DB'sinde tanımlı **değil** — bkz. aşağıdaki "DB durumu"; gerçek Sora task tipi `sora_gen_video`'dur)

Sora 2 ile metinden (t2v) veya tek referans/ilk-kare görselinden (i2v) kısa video üretir. Ana kısıt: **yalnızca 1 referans görsel** desteklenir ve oran olarak pratikte sadece `16:9` / `9:16` anlamlıdır.

## İstek Gövdesi

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|:------:|---------|----------|
| model | string | ✅ | — | `"sora2"` |
| prompt | string | ✅ | — | Üretim metni. (Kodda `CreateVideoRequest.prompt` default'suz alan → şema düzeyinde zorunlu. Sözleşme "prompt veya image en az biri" dese de `/v1/videos` şeması prompt'u her zaman ister.) |
| aspect_ratio | string | ⬜ | `16:9` | Görüntü oranı. Kod alias'ları: `aspect_ratio` / `ratio` / `size_ratio`. Yürütücüde yalnızca `16:9` (landscape) ve `9:16` (portrait) tanınır (`_pick_orientation_from_ratio`). |
| duration | int | ⬜ | — | Süre. Kod alias'ları: `duration` / `n_frames` / `duration_frames`. İç frame eşlemesi (`_pick_n_frames`): `300`/`450` doğrudan, `10→300`, `15→450`, diğer `→450`. Sözleşme örneği `12` (→ 450). |
| first_image_url | string | ⬜ | — | İlk-kare (i2v) görseli, public `https://` URL. **Yürütücünün gerçekte okuduğu alan budur** (`firstImageUrl` de kabul edilir). **sora2 yalnızca 1 görsel destekler.** |
| image | string \| array | ⬜ | — | Public sözleşmedeki referans-görsel alanı. ⚠️ Yürütücü `image`/`images` alanını okumuyor — i2v için `first_image_url` kullanın (bkz. Notlar). |
| messages | array | ⬜ | — | OpenAI Chat tarzı mesaj dizisi (opsiyonel, sözleşmede listeli). |

> Zorunlu = ✅, Optional = ⬜

## Minimal örnek
```json
{
  "model": "sora2",
  "prompt": "a golden retriever puppy running through a field of sunflowers, slow motion, sunny afternoon"
}
```

## Tam örnek (tüm optional alanlar dahil)
```json
{
  "model": "sora2",
  "prompt": "the character in the photo turns slowly toward the camera and smiles, soft cinematic lighting",
  "aspect_ratio": "9:16",
  "duration": 12,
  "image": "https://your-cdn.com/portrait.jpg"
}
```

## Notlar
- **⚠️ DB durumu (önemli):** Bu kurulumun `data/fpbrowser.db` `task_types` tablosunda tanımlı kodlar yalnızca: `veo_workflow`, `sora_gen_video`, `dreamina_workflow`, `gpt_workflow` (+ kullanılmayan `gen_video`/`gen_image`). **`sora2` task tipi tanımlı DEĞİL.** Bu yüzden `model:"sora2"` ile `/v1/videos`'a istek atmak `_normalize_video_task_payload` else dalında `task_type_code="sora2"` üretir; DB'de eşleşme bulunmadığı için `400 task_type_code 不存在或未启用` (routes.py:567) döner. Çalıştırmak için iki yol: (1) admin panelinden `sora2` adlı bir task type tanımlayıp handler'ını `sora_gen_video`'ya bağlayın; (2) ya da doğrudan **`sora_gen_video`** task tipini kullanın. Resmi sözleşme `model:"sora2"` der ama bu kurulumda kullanmadan önce task type'ı tanımlamanız gerekir.
- **Endpoint kanıtı (kod):** `src/api/routes.py:747` `@router.post("/v1/videos")` → `create_video()` (747-762). Gövde `CreateVideoRequest` (73-88) ile parse edilip `_normalize_video_task_payload` (140-231) → `_create_task_from_request` (532-603) zincirine gider.
- **İç task tipi kanıtı:** `_normalize_video_task_payload` içinde `sora2` için özel bir dal **yoktur**; `else: task_type_code = model` (routes.py:229-230) çalışır → `task_type_code = "sora2"` (bu da DB'de yoksa yukarıdaki hatayı verir).
- **Generic alternatif (önerilen — DB'de mevcut task tipiyle):** `POST /v1/tasks` (routes.py:673-678) ile doğrudan mevcut `sora_gen_video` task tipini kullanın:
  ```json
  { "task_type_code": "sora_gen_video", "json": { "prompt": "...", "first_image_url": "https://...", "aspect_ratio": "16:9", "duration": 12 } }
  ```
- **⚠️ i2v alan adı (kod ≠ sözleşme):** Yürütücü `sora_gen_video` (sora_task_executor.py:3895) payload'dan **`first_image_url`** (veya `firstImageUrl`) okur (satır 3918); `image`/`images` alanlarını OKUMAZ. `_normalize_video_task_payload` sora2'de hiçbir dönüştürme yapmaz (else dalı), yani gönderdiğiniz `image` payload'da `image` olarak kalır ve i2v tetiklenmez. Sözleşme `image` der ama **koda göre doğru alan `first_image_url`'dir** — lead kuralı gereği kod esas alındı.
- **Tek görsel kısıtı:** Sözleşmede açıkça "sora2只支持一张参考图" (yalnızca 1 referans görsel). Yürütücü ilk-kare görselini indirip `/backend/uploads`'a yükler, `media_id` alır ve `inpaint_items=[{"kind":"upload","upload_id":media_id}]` olarak kullanır (`_sora_create_task_pw`, satır 1553-1598).
- **İç create çağrısı (kod):** Asıl üretim Sora'nın `/backend/nf/create` ucuna şu gövdeyle gider: `{"kind":"video","prompt":...,"orientation":"landscape|portrait","size":"small","n_frames":300|450,"model":"sy_8","inpaint_items":[...],"style_id":null}` (satır 1600-1609). Yani Sora model varyantı dahili olarak **sabit `sy_8`**'dir; ayrı bir `sy_*` seçimi public gövdede yoktur.
- **aspect_ratio kısıtı (kod):** `_pick_orientation_from_ratio` (sora_task_executor.py:56-65) sadece `16:9→landscape` ve `9:16→portrait` döndürür; başka oranlar yok sayılır.
- **duration→frame (kod):** `_pick_n_frames` (sora_task_executor.py:68-81) → `300`/`450` doğrudan, `10→300`, `15→450`, aksi halde `450`.
- **Passthrough alanlar:** `CreateVideoRequest` `extra="allow"` (routes.py:88) olduğundan `n`, `size`, `quality`, `resolution`, `negative_prompt`, `seed` gibi alanlar şema tarafından kabul edilip payload'a aktarılır; ancak sora2 sözleşmesi bunları kullanmaz — güvenmeden önce davranışı doğrulayın.
- **`exclude_none`:** Gönderim `body.model_dump(exclude_none=True)` ile yapılır (routes.py:752); `null` alanlar düşürülür.
- **Görsel (image) üretimi:** Sora bu kod tabanında **video-only**'dir; ayrı bir Sora görsel modeli/dosyası yoktur (bkz. ana rapor).
