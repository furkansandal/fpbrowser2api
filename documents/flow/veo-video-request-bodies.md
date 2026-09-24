# Veo Video API Request Body Rehberi

## Endpoint

```http
POST http://127.0.0.1:8000/v1/videos
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

Bu doküman aşağıdaki API model adlarını kapsar:

- `veo-3-1` — Quality
- `veo-3-1-fast` — Fast
- `veo-3-1-lite` — Lite
- `veo-omni-flash` — Omni Flash

> `quality` alanı request şemasında kabul edilse de Veo workflow'unda kalite katmanını seçmez. Kalite/hız katmanı `model`, çıktı çözünürlüğü ise `resolution` alanıyla seçilir.

## Duration ve kalite tablosu

| API modeli | Kalite/hız katmanı | T2V | I2V (ilk kare) | Start-End | R2V (referans) | Duration verilmezse |
|---|---|---:|---:|---:|---:|---:|
| `veo-3-1` | En yüksek kalite / Quality | `4`, `6`, `8` | `4`, `6`, `8` | `4`, `6`, `8` | Desteklenmez | `8` |
| `veo-3-1-fast` | Hızlı / Fast | `4`, `6`, `8` | `4`, `6`, `8` | `4`, `6`, `8` | Yalnız `8` | `8` |
| `veo-3-1-lite` | Ekonomik / Lite | `4`, `6`, `8` | `4`, `6`, `8` | `4`, `6`, `8` | Yalnız `8` | `8` |
| `veo-omni-flash` | Omni Flash | `4`, `6`, `8`, `10` | `4`, `6`, `8`, `10` | Desteklenmez | `4`, `6`, `8`, `10` | `10` |

Mod seçimi request'teki görsellere göre otomatik yapılır:

- Görsel yoksa: **T2V**
- Tek başlangıç görseli varsa: **I2V**
- İlk ve son kare varsa: **Start-End**
- `Ingredients_images` varsa: **R2V**

## Resolution tablosu

| `resolution` | Davranış |
|---|---|
| `720p` | Varsayılan temel çıktı |
| `1080p` | Temel üretimden sonra extension ile upscale |
| `4k` | Temel üretimden sonra extension ile upscale |

Kabul edilen alias'lar:

- `720`, `1k` → `720p`
- `1080`, `fhd` → `1080p`
- `2160`, `uhd`, `3840`, `4096` → `4k`

## Ortak alanlar

| Alan | Tip | Zorunlu | Açıklama |
|---|---|:---:|---|
| `model` | string | Evet | Kullanılacak Veo modeli |
| `prompt` | string | Evet | Video üretim promptu |
| `duration` | integer | Hayır | Desteklenen sürelerden biri; model default'u uygulanır |
| `aspect_ratio` | string | Hayır | `16:9` veya `9:16`; default `16:9` |
| `resolution` | string | Hayır | `720p`, `1080p` veya `4k`; default `720p` |
| `images` | string[] | Hayır | İlk ve opsiyonel son kare: `[first, last]` |
| `first_image_url` | string | Hayır | I2V/Start-End başlangıç karesi |
| `last_image_url` | string | Hayır | Start-End bitiş karesi; ilk kare olmadan kullanılamaz |
| `Ingredients_images` | string[] | Hayır | R2V referans görselleri |
| `quality` | string | Hayır | Şema kabul eder fakat Veo kalite seçimini etkilemez |
| `negative_prompt` | string | Hayır | Şema kabul eder fakat mevcut Veo workflow'unda etkisizdir |
| `seed` | integer | Hayır | Şema kabul eder fakat mevcut Veo workflow'unda etkisizdir |

## 1. Veo 3.1 — Quality

Minimal T2V request:

```json
{
  "model": "veo-3-1",
  "prompt": "A cinematic aerial shot of Istanbul at sunrise",
  "duration": 8,
  "aspect_ratio": "16:9",
  "resolution": "720p"
}
```

Quality modeli R2V/`Ingredients_images` modunu desteklemez.

## 2. Veo 3.1 Fast

Minimal T2V request:

```json
{
  "model": "veo-3-1-fast",
  "prompt": "A sports car driving through a rainy neon city",
  "duration": 8,
  "aspect_ratio": "16:9",
  "resolution": "1080p"
}
```

Fast modelinde R2V kullanılırsa `duration` yalnızca `8` olabilir.

## 3. Veo 3.1 Lite

Minimal T2V request:

```json
{
  "model": "veo-3-1-lite",
  "prompt": "A cozy cabin in a snowy forest, gentle camera movement",
  "duration": 6,
  "aspect_ratio": "9:16",
  "resolution": "720p"
}
```

Lite modelinde R2V kullanılırsa `duration` yalnızca `8` olabilir.

## 4. Veo Omni Flash

Minimal T2V request:

```json
{
  "model": "veo-omni-flash",
  "prompt": "A futuristic city transforming from day to night",
  "duration": 10,
  "aspect_ratio": "16:9",
  "resolution": "4k"
}
```

Omni Flash `4`, `6`, `8` ve `10` saniyeyi destekler; Start-End modu desteklenmez.

## I2V — İlk kareden video

Aşağıdaki body'de yalnızca `model` değiştirilerek dört model de kullanılabilir:

```json
{
  "model": "veo-3-1-fast",
  "prompt": "Animate the character naturally with subtle camera motion",
  "duration": 8,
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "first_image_url": "https://cdn.example.com/first-frame.jpg"
}
```

Alternatif olarak tek elemanlı `images` dizisi kullanılabilir:

```json
{
  "model": "veo-3-1-lite",
  "prompt": "Bring this scene to life",
  "duration": 6,
  "images": [
    "https://cdn.example.com/first-frame.jpg"
  ]
}
```

## Start-End — İlk ve son kare

Bu mod `veo-3-1`, `veo-3-1-fast` ve `veo-3-1-lite` modellerinde desteklenir. `veo-omni-flash` ile kullanılamaz.

```json
{
  "model": "veo-3-1",
  "prompt": "Create a smooth cinematic transition between the two frames",
  "duration": 8,
  "aspect_ratio": "16:9",
  "resolution": "1080p",
  "images": [
    "https://cdn.example.com/first-frame.jpg",
    "https://cdn.example.com/last-frame.jpg"
  ]
}
```

## R2V — Referans görsellerden video

### Veo 3.1 Fast veya Lite

Fast ve Lite R2V modunda yalnızca `duration: 8` destekler ve en fazla 3 referans görsel kabul eder.

```json
{
  "model": "veo-3-1-fast",
  "prompt": "Create a cinematic scene preserving the referenced character and product",
  "duration": 8,
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "Ingredients_images": [
    "https://cdn.example.com/character.jpg",
    "https://cdn.example.com/product.jpg"
  ]
}
```

### Veo Omni Flash

Omni Flash R2V modunda `4`, `6`, `8`, `10` saniye ve en fazla 7 referans görsel destekler.

```json
{
  "model": "veo-omni-flash",
  "prompt": "Generate a dynamic commercial using all reference images",
  "duration": 10,
  "aspect_ratio": "9:16",
  "resolution": "1080p",
  "Ingredients_images": [
    "https://cdn.example.com/character.jpg",
    "https://cdn.example.com/product.jpg",
    "https://cdn.example.com/location.jpg"
  ]
}
```

## cURL örneği

```bash
curl --request POST 'http://127.0.0.1:8000/v1/videos' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "model": "veo-3-1-fast",
    "prompt": "A cinematic drone shot above a tropical island",
    "duration": 8,
    "aspect_ratio": "16:9",
    "resolution": "1080p"
  }'
```

## Task durumunu sorgulama

`POST /v1/videos` cevabındaki `task_id`, iki farklı endpoint ile sorgulanabilir:

| Endpoint | Kullanım | Response özelliği |
|---|---|---|
| `GET /v1/videos/{task_id}` | Önerilen public video status endpoint'i | Normalize edilmiş, video odaklı response |
| `GET /v1/tasks/{task_id}` | Debug/detay endpoint'i | Worker'ın ham `result` objesini döndürür |

Her iki endpoint de API key ister:

```http
Authorization: Bearer YOUR_API_KEY
```

### Status değerleri

| `/v1/videos/{task_id}` | `/v1/tasks/{task_id}` | Açıklama |
|---|---|---|
| `queued` | `queued` | Task kuyruğa alındı |
| `processing` | `running` | Task çalışıyor |
| `completed` | `completed` | Task başarıyla tamamlandı |
| `failed` | `failed` | Task başarısız oldu |

### Önerilen endpoint: `GET /v1/videos/{task_id}`

```http
GET http://127.0.0.1:8000/v1/videos/{task_id}
Authorization: Bearer YOUR_API_KEY
```

#### Queued response

```json
{
  "id": "TASK_ID",
  "task_id": "TASK_ID",
  "object": "video",
  "created_at": 1786650764091,
  "status": "queued",
  "state": "queued",
  "task_status": "queued",
  "progress": 0,
  "model": "veo-3-1-fast",
  "video_url": null,
  "original_watermarked_video_url": null,
  "metadata": {
    "result_urls": [],
    "original_watermarked_video_url": null
  },
  "success": false,
  "final": false,
  "seconds": "8",
  "duration": 8,
  "aspect_ratio": "16:9"
}
```

#### Processing response

```json
{
  "id": "TASK_ID",
  "task_id": "TASK_ID",
  "object": "video",
  "created_at": 1786650764091,
  "status": "processing",
  "state": "processing",
  "task_status": "processing",
  "progress": 45,
  "model": "veo-3-1-fast",
  "video_url": null,
  "original_watermarked_video_url": null,
  "metadata": {
    "result_urls": [],
    "original_watermarked_video_url": null
  },
  "success": false,
  "final": false,
  "seconds": "8",
  "duration": 8,
  "aspect_ratio": "16:9"
}
```

#### Completed response

```json
{
  "id": "TASK_ID",
  "task_id": "TASK_ID",
  "object": "video",
  "created_at": 1786650764091,
  "completed_at": 1786650847617,
  "status": "completed",
  "state": "completed",
  "task_status": "completed",
  "progress": 100,
  "model": "veo-3-1-fast",
  "video_url": "https://flow-content.google/video/VIDEO_ID?...",
  "url": "https://flow-content.google/video/VIDEO_ID?...",
  "original_watermarked_video_url": null,
  "metadata": {
    "result_urls": [
      "https://flow-content.google/video/VIDEO_ID?..."
    ],
    "original_watermarked_video_url": null
  },
  "success": true,
  "final": true,
  "seconds": "8",
  "duration": 8,
  "aspect_ratio": "16:9"
}
```

#### Failed response

```json
{
  "id": "TASK_ID",
  "task_id": "TASK_ID",
  "object": "video",
  "created_at": 1786650764091,
  "completed_at": 1786650775000,
  "status": "failed",
  "state": "failed",
  "task_status": "failed",
  "progress": 25,
  "model": "veo-3-1-fast",
  "video_url": null,
  "original_watermarked_video_url": null,
  "metadata": {
    "result_urls": [],
    "original_watermarked_video_url": null
  },
  "success": false,
  "final": true,
  "seconds": "8",
  "duration": 8,
  "aspect_ratio": "16:9",
  "error": {
    "message": "task failed",
    "code": "task_failed"
  }
}
```

> Polling sırasında `final: true` görüldüğünde sorgulama durdurulabilir. Başarı kontrolü için `status === "completed"` veya `success === true` kullanılabilir.

### Detay endpoint'i: `GET /v1/tasks/{task_id}`

```http
GET http://127.0.0.1:8000/v1/tasks/{task_id}
Authorization: Bearer YOUR_API_KEY
```

Bu endpoint özellikle upscale sonucunu ve worker'ın ham alanlarını görmek için kullanışlıdır.

#### Queued/running response

```json
{
  "task_id": "TASK_ID",
  "status": "running",
  "progress": 45,
  "result": null,
  "error_message": null,
  "content_violation": 0
}
```

#### Completed response — upscale başarılı

```json
{
  "task_id": "TASK_ID",
  "status": "completed",
  "progress": 100,
  "result": {
    "type": "veo_workflow_video",
    "message": "VEO video completed",
    "share_url": "https://flow-content.google/video/UPSCALED_VIDEO_ID?...",
    "thumb_url": "",
    "video_type": "t2v",
    "model_key": "veo_3_1_t2v_fast_ultra",
    "aspect_ratio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
    "resolution": "1080p",
    "upsample_ok": true,
    "project_id": "PROJECT_ID",
    "generated_media_id": "UPSCALED_MEDIA_ID",
    "generated_workflow_id": "WORKFLOW_ID",
    "workflow_archived": true,
    "nf_check": null
  },
  "error_message": null,
  "content_violation": 0
}
```

#### Completed response — upscale başarısız, 720p fallback

Upscale best-effort çalışır. Upscale başarısız olduğunda task yine `completed` olabilir ve base 720p video dönebilir:

```json
{
  "task_id": "TASK_ID",
  "status": "completed",
  "progress": 100,
  "result": {
    "type": "veo_workflow_video",
    "share_url": "https://flow-content.google/video/BASE_VIDEO_ID?...",
    "video_type": "t2v",
    "model_key": "veo_3_1_t2v_fast_ultra",
    "aspect_ratio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
    "resolution": "720p",
    "upsample_ok": false,
    "upsample_error": "VEO video upscale submit failed: ...",
    "project_id": "PROJECT_ID",
    "generated_media_id": "BASE_MEDIA_ID",
    "generated_workflow_id": "WORKFLOW_ID",
    "workflow_archived": true,
    "nf_check": null
  },
  "error_message": null,
  "content_violation": 0
}
```

#### Failed response

```json
{
  "task_id": "TASK_ID",
  "status": "failed",
  "progress": 25,
  "result": {
    "error_type": "NonPenalizedTaskError",
    "no_penalty": true,
    "status_code": 400
  },
  "error_message": "VEO video generation failed: ...",
  "content_violation": 0
}
```

### TypeScript tipleri

```ts
type PublicVideoStatus = "queued" | "processing" | "completed" | "failed";
type RawTaskStatus = "queued" | "running" | "completed" | "failed";

interface VideoStatusResponse {
  id: string;
  task_id: string;
  object: "video";
  created_at: number;
  completed_at?: number;
  status: PublicVideoStatus;
  state: PublicVideoStatus;
  task_status: PublicVideoStatus;
  progress: number;
  model: string;
  video_url: string | null;
  url?: string;
  original_watermarked_video_url: string | null;
  metadata: {
    result_urls: string[];
    original_watermarked_video_url: string | null;
  };
  success: boolean;
  final: boolean;
  seconds?: string;
  duration?: number;
  aspect_ratio?: string;
  error?: {
    message: string;
    code: string;
  };
}

interface VeoTaskResult {
  type?: "veo_workflow_video";
  message?: string;
  share_url?: string;
  thumb_url?: string;
  video_type?: "t2v" | "i2v" | "r2v";
  model_key?: string;
  aspect_ratio?: string;
  resolution?: "720p" | "1080p" | "4K";
  upsample_ok?: boolean;
  upsample_error?: string;
  project_id?: string;
  generated_media_id?: string;
  generated_workflow_id?: string;
  workflow_archived?: boolean;
  error_type?: string;
  no_penalty?: boolean;
  status_code?: number | string;
  nf_check?: null;
}

interface TaskStatusResponse {
  task_id: string;
  status: RawTaskStatus;
  progress: number;
  result: VeoTaskResult | null;
  error_message: string | null;
  content_violation: number;
}
```
