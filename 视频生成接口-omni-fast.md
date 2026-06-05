# 🎥 Omni Fast / Omni Fast V2V · 视频异步 API 接入文档（`/v1/videos`）

> **提交任务**：`POST /v1/videos`  
> **查询进度**：`GET /v1/videos/{task_id}`  
> **下载视频**：`GET /v1/videos/{task_id}/content`  
> 支持：文生视频、首帧图生视频、首尾帧视频、多参考图视频、参考视频编辑/转换（V2V）

## 1. 模型与能力

| 模型 | 建议时长 | 说明 |
|---|---:|---|
| `omni-fast` | `4` / `8` / | 文生视频 / 图生视频 / 多参考图视频（T2V / I2V / R2V） |
| `omni-fast-v2v` | `4` / `8` | 参考视频编辑/转换（V2V），也兼容 T2V / I2V |

> `seconds` / `duration` 建议传字符串，例如 `"4"` 或 `"8"`。  
> 如果需要上传参考视频（`video` / `video_url` / `input_video`），必须使用 `omni-fast-v2v`。  
> `omni-fast` 不支持参考视频输入。

## 2. 完整调用流程

### Step 1 · 提交任务

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "omni-fast",
    "prompt": "Ocean waves gently rolling onto a sandy beach at golden hour, cinematic, warm sunlight",
    "seconds": "8",
    "aspect_ratio": "16:9",
    "resolution": "720p"
  }'
```

立即返回：

```json
{
  "id": "vid-a1b2c3d4e5f6",
  "task_id": "vid-a1b2c3d4e5f6",
  "object": "video",
  "model": "omni-fast",
  "status": "queued",
  "progress": 0,
  "created_at": 1716800000,
  "duration": 8,
  "aspect_ratio": "16:9",
  "input_mode": "text-to-video"
}
```

### Step 2 · 轮询任务

```bash
curl https://xxx.xxx.xxx/v1/videos/vid-a1b2c3d4e5f6 \
  -H "Authorization: Bearer api-key"
```

完成响应：

```json
{
  "id": "vid-a1b2c3d4e5f6",
  "task_id": "vid-a1b2c3d4e5f6",
  "object": "video",
  "model": "omni-fast",
  "status": "completed",
  "progress": 100,
  "created_at": 1716800000,
  "completed_at": 1716800120,
  "duration": 8,
  "aspect_ratio": "16:9",
  "input_mode": "text-to-video",
  "video_url": "xxxxxxxxx",
  "data": [
    {
      "url": "/v1/videos/vid-a1b2c3d4e5f6/content",
      "revised_prompt": "..."
    }
  ]
}
```

| `status` | 含义 | 该做什么 |
|---|---|---|
| `queued` | 排队中 | 继续轮询 |
| `in_progress` / `processing` | 生成中 | 继续轮询 |
| `completed` / `succeeded` / `success` | 已完成 | 下载 MP4 |
| `failed` / `cancelled` / `error` | 失败 | 查看 `error.message` / `error.code` |

建议每 8–10 秒轮询一次。T2V / I2V 通常 1–3 分钟，V2V 可能需要 3–8 分钟。

### Step 3 · 下载视频

```bash
curl https://xxx.xxx.xxx/v1/videos/vid-a1b2c3d4e5f6/content \
  -H "Authorization: Bearer api-key" \
  --output output.mp4
```

成功时直接返回 MP4 二进制流，写入文件即可。也可以使用完成响应里的 `data[0].url` 作为下载地址。

## 3. 调用示例

### 3.1 `omni-fast` · 文生视频 T2V

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "omni-fast",
    "prompt": "A woman walking through a neon-lit Tokyo street at night, rain reflections, cinematic",
    "seconds": "8",
    "aspect_ratio": "9:16"
  }'
```

### 3.2 `omni-fast` · 短视频

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "omni-fast",
    "prompt": "A tiny paper boat floating on calm water, soft morning light",
    "seconds": "4"
  }'
```

### 3.3 `omni-fast` · 首帧图生视频 I2V 

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "omni-fast",
    "prompt": "The scene gently comes alive with subtle motion, soft wind, and drifting light",
    "first_image_url": "https://your-cdn.com/first.jpg",
    "seconds": "8"
  }'
```

`first_image_url` 也支持 `data:image/jpeg;base64,...` 形式。

### 3.4 `omni-fast` · 首尾帧视频

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "omni-fast",
    "prompt": "Create a smooth transition: begin exactly with the first frame and end exactly on the last frame.",
    "first_image_url": "https://your-cdn.com/first.jpg",
    "last_image_url": "https://your-cdn.com/last.jpg",
    "seconds": "8",
    "aspect_ratio": "16:9",
    "resolution": "720p"
  }'
```

### 3.5 `omni-fast` · 多参考图视频 R2V

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "omni-fast",
    "prompt": "Use the first image as the character reference and the second image as the visual style reference. Create a cozy cafe conversation scene.",
    "images": [
      "https://your-cdn.com/character.jpg",
      "https://your-cdn.com/style.jpg"
    ],
    "seconds": "8"
  }'
```

### 3.6 `omni-fast-v2v` · 参考视频编辑 V2V（JSON / Base64）

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "omni-fast-v2v",
    "prompt": "Edit the attached video into a visibly new version while preserving the original camera path, timing, subject motion, and shot continuity. Add a rainy cinematic night look with neon reflections.",
    "video": "data:video/mp4;base64,AAAA...",
    "seconds": "8",
    "aspect_ratio": "16:9",
    "resolution": "720p"
  }'
```

### 3.7 `omni-fast-v2v` · V2V + 角色参考图

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "omni-fast-v2v",
    "prompt": "Edit the video: replace the main subject with the character from the reference image. The character must appear performing the same actions and movements as the original subject. Keep the original camera work, background, and timing.",
    "video": "data:video/mp4;base64,AAAA...",
    "images": [
      "https://your-cdn.com/character.jpg"
    ],
    "seconds": "4",
    "aspect_ratio": "16:9",
    "resolution": "720p"
  }'
```

### 3.8 `omni-fast-v2v` · multipart/form-data 上传视频文件

适合上传本地 MP4，无需手动转 Base64。

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -F "model=omni-fast-v2v" \
  -F "prompt=Transform this video into an anime style with vibrant colors and dramatic lighting" \
  -F "duration=8" \
  -F "aspect_ratio=16:9" \
  -F "input_video=@source.mp4;type=video/mp4"
```

如果需要同时上传参考图：

```bash
curl -X POST https://xxx.xxx.xxx/v1/videos \
  -H "Authorization: Bearer api-key" \
  -F "model=omni-fast-v2v" \
  -F "prompt=Replace the subject with the reference character and keep the same motion" \
  -F "duration=4" \
  -F "input_video=@source.mp4;type=video/mp4" \
  -F "images[0]=@character.jpg;type=image/jpeg"
```

## 4. 请求字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `model` | string | ✅ | `omni-fast` 或 `omni-fast-v2v` |
| `prompt` | string | ✅ | 生成/编辑提示词 |
| `seconds` | string/int | ❌ | 视频时长；建议字符串；范围约 4–30 秒，默认 8 秒 |
| `duration` | string/int | ❌ | `seconds` 的别名；二者同时传时建议保持一致 |
| `aspect_ratio` | string | ❌ | 画面比例；推荐 `16:9` / `9:16` |
| `size` | string | ❌ | `aspect_ratio` 的别名；支持 `landscape` / `portrait` / `square` / `1920x1080` / `1080x1920` |
| `orientation` | string | ❌ | `aspect_ratio` 的别名；支持 `landscape` / `portrait` |
| `resolution` | string | ❌ | 分辨率偏好；支持 `720p` |
| `fps` / `n_frames` / `n` | int | ❌ | 帧率或帧数偏好；实测通常返回 24fps |
| `first_image_url` | string | ❌ | 首帧图；传入后自动切换为图生视频 |
| `last_image_url` | string | ❌ | 尾帧图；配合 `first_image_url` 做首尾帧视频 |
| `image_url` | string | ❌ | 首帧图别名 |
| `images` | string[] | ❌ | 多参考图；最多 5 张；V2V 时可作为角色/风格参考图 |
| `video` | string | ❌ | 参考视频；仅 `omni-fast-v2v` 支持；可用 `data:video/mp4;base64,...` |
| `video_url` | string | ❌ | 参考视频 URL；仅 `omni-fast-v2v` 支持 |
| `input_video` | file/string | ❌ | `video` 的别名；multipart 上传时作为文件字段 |

## 5. 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` / `task_id` | string | 任务 ID，轮询和下载都使用它 |
| `object` | string | 固定为 `video` |
| `model` | string | 请求模型 |
| `status` | string | `queued` / `in_progress` / `processing` / `completed` / `failed` 等 |
| `progress` | int | 0–100 |
| `created_at` | int | 创建时间戳 |
| `completed_at` | int | 完成时间戳 |
| `duration` / `seconds` | int/string | 视频时长 |
| `aspect_ratio` | string | 画面比例 |
| `input_mode` | string | 输入模式，如 `text-to-video` / `first-frame` / `first-last-frame` / `reference-images` / `video-extension` |
| `video_url` | string\|null | 完成后的视频地址 |
| `data[0].url` | string | 推荐下载地址，通常为 `/v1/videos/{task_id}/content` |
| `data[0].revised_prompt` | string | 实际使用的提示词，可能为空 |
| `error.message` | string | 失败原因 |
| `error.code` | string | 机器可读错误码 |
| `error.type` | string | 错误类型，如 `retryable` 表示可重试 |

## 6. 输入模式说明

| `input_mode` | 触发方式 | 说明 |
|---|---|---|
| `text-to-video` | 只传 `prompt` | 文生视频 |
| `first-frame` | 传 `first_image_url` | 首帧图生视频 |
| `first-last-frame` | 传 `first_image_url` + `last_image_url` | 首尾帧插值视频 |
| `reference-images` | 传 `images[]` | 多参考图视频 |
| `video-extension` | 传 `video` / `video_url` / `input_video` | 参考视频编辑/延长，需 `omni-fast-v2v` |

## 7. 上传限制

| 类型 | 限制 |
|---|---|
| 参考图片 | 单张最大 2MB，分辨率不超过 1080p |
| 参考图数量 | 最多 5 张 |
| 参考视频 | 最大 5MB，时长不超过 30 秒 |
| 视频时长 | 4–30 秒，超出可能自动截断 |
| 推荐视频格式 | H.264 编码 MP4 |

> V2V 上传视频时，服务端会自动做预处理（如 ffmpeg remux、去除多余元数据/轨道），客户端一般无需额外处理。

## 8. 常见错误

### 提交阶段错误

| 错误信息 | 含义与处理 |
|---|---|
| `prompt is required` | 缺少 `prompt` 字段 |
| `Reference video upload requires model "omni-fast-v2v"` | 上传了参考视频但使用了 `omni-fast`，请改用 `omni-fast-v2v` |
| `Inline video data exceeds 5MB limit` | Base64 内联视频超过 5MB，请压缩或改用更小视频 |
| `worker video queue is full; please retry later` | 服务端队列满，稍后重试 |
| `image reference N blocked...` | 该图片之前被内容策略拒绝并拉黑，请更换图片 |
| `the uploaded image may not be supported for video generation` | 图片不适合视频生成或在黑名单中，请更换图片 |

### 异步任务错误码

| `error.code` | 可重试 | 含义与处理 |
|---|---|---|
| `concurrency_limit` | 是 | 上游并发满，等待几分钟后重试 |
| `rate_limit` | 是 | 上游额度/频率限制，等待后重试 |
| `upstream_quota_exhausted` | 是 | 上游账号额度耗尽，按 `quota.retry_after_seconds` 等待 |
| `worker_restarted` | 是 | 服务端更新或重启导致任务中断，重新提交 |
| `worker_queue_full` | 是 | 服务端任务队列满，稍后重试 |
| `missing_conversation_id` | 是 | 上游未返回会话标识，重新提交 |
| `generation_error` | 是 | 生成失败，可更换提示词或素材后重试 |
| `timeout` | 否 | 生成超时，可尝试重新提交 |
| `v2v_timeout` | 否 | V2V 超时，可尝试重新提交 |
| `no_video_url` | 否 | 无法解析下载地址，可尝试重新提交 |
| `image_rejected` | 否 | 参考图/视频被内容策略拒绝，换素材 |
| `content_policy` | 否 | 提示词或素材违反内容策略，换提示词/素材 |

## 9. 下载接口错误

| 场景 | 响应 |
|---|---|
| 任务未完成 | HTTP 400：`{"error":{"message":"Task not completed yet, status: in_progress"}}` |
| 任务不存在 | HTTP 404：`{"error":{"message":"Task vid-xxx not found"}}` |

## 10. 接入建议

- 客户端提交任务后只保存并轮询同一个 `task_id`，不要频繁重复提交同一任务。
- 推荐轮询间隔 8–10 秒，总超时 10 分钟。
- 下载时优先使用 `GET /v1/videos/{task_id}/content`，兼容性最好。
- V2V 场景建议使用 `multipart/form-data` 直接上传 MP4，避免 Base64 体积膨胀。
- `prompt` 中应明确说明每个参考素材的作用，例如首帧、尾帧、角色参考、风格参考、需要保留的镜头运动等。
