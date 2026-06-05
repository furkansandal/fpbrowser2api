# İstek Gövdesi Dokümantasyonu (video & görsel)

Bu dizin, public API üzerinden gönderilecek **istek gövdelerini (request body)** provider ve model bazında parçalanmış MD dosyaları halinde belgeler. Her dosya: kısa açıklama + alan tablosu (zorunlu/optional, default) + minimal ve tam örnek JSON içerir.

> Açıklamalar Türkçe; alan adları ve JSON değerleri orijinal bırakılmıştır. İçerikler hem kök dizindeki resmi sözleşme dokümanlarından hem de gerçek koddan (`src/api/routes.py` + ilgili executor'lar) uzlaştırılmıştır; **çelişki olduğunda kod esas alınmış** ve ilgili dosyanın "Notlar" bölümünde belirtilmiştir.

## Ortak bilgiler

- **Gönderim:** `POST /v1/videos` (OpenAI-uyumlu) — gövde `CreateVideoRequest` (`routes.py:73-88`). Alternatif: generic `POST /v1/tasks` → `{ "task_type_code": "...", "json": { ... } }` (`routes.py:673`).
- **Sorgulama:** `GET /v1/videos/{task_id}` ile polling (callback yok). Durumlar: `queued` / `processing` / `completed` / `failed`. Tamamlandığında video → `video_url`, görsel → `image_url`; her ikisi de `metadata.result_urls` içinde.
- **Anlık dönüş:** Gönderim sonrası hemen `task_id` + `status:"queued"` döner; üretim arka planda yürür.
- **`extra="allow"`:** Şema bilinmeyen alanları kabul edip payload'a aktarır (`routes.py:88`); ancak her executor bunları kullanmayabilir. `negative_prompt` / `seed` çoğu hatta **etkisizdir**.
- **Model → iç task tipi eşlemesi:** `_normalize_video_task_payload` (`routes.py:140-231`).
- **⚠️ DB'de tanımlı task type'lar (bu kurulum):** `veo_workflow`, `sora_gen_video`, `dreamina_workflow`, `gpt_workflow`. **`sora2` / `sora-pro` tanımlı değildir** (bkz. ilgili dosyalardaki "DB durumu" notu).

## Provider / model dizini

### Flow — Google Veo & nana-banana (`veo_workflow`)
| Model | Tür | Zorunlu alanlar | Dosya |
|-------|-----|-----------------|-------|
| `veo-3-1` | video (t2v/i2v/r2v) | model, prompt, **duration=8** | [flow/veo-3-1.md](flow/veo-3-1.md) |
| `veo-omni-flash` | video | model, prompt, **duration=10** | [flow/veo-omni-flash.md](flow/veo-omni-flash.md) |
| `veo-omni-flash-video-edit` | video edit / r2v | model, prompt, **duration=8** | [flow/veo-omni-flash-video-edit.md](flow/veo-omni-flash-video-edit.md) |
| `nana-banana-2` | görsel (1k/2k) | model, prompt | [flow/nana-banana-2.md](flow/nana-banana-2.md) |
| `nana-banana-pro` | görsel (1k/2k) | model, prompt | [flow/nana-banana-pro.md](flow/nana-banana-pro.md) |
| `nana-banana-2-4k` | görsel (4k) | model, prompt | [flow/nana-banana-2-4k.md](flow/nana-banana-2-4k.md) |
| `nana-banana-pro-4k` | görsel (4k) | model, prompt | [flow/nana-banana-pro-4k.md](flow/nana-banana-pro-4k.md) |

### Dreamina — Seedance 2.0 (`dreamina_workflow`)
| Model | Tür | Zorunlu alanlar | Dosya |
|-------|-----|-----------------|-------|
| `seedance-2` | video (Pro; t2v/i2v/omni) | model, prompt, **duration=15** | [dreamina/seedance-2.md](dreamina/seedance-2.md) |
| `seedance-2-fast` | video (Fast) | model, prompt, **duration=15** | [dreamina/seedance-2-fast.md](dreamina/seedance-2-fast.md) |

> Dreamina **görsel üretmez** — yalnızca video. (Kanıt: `dreamina_workflow` her zaman `workflow_kind:"video"`.)

### Sora (`sora_gen_video`)
| Model | Tür | Zorunlu alanlar | Dosya |
|-------|-----|-----------------|-------|
| `sora2` | video (t2v / tek görsel i2v) | model, prompt | [sora/sora2.md](sora/sora2.md) |
| `sora-pro` | video (≈ Seedance 2) | model, prompt, duration=15 | [sora/sora-pro.md](sora/sora-pro.md) |

> ⚠️ `sora2` ve `sora-pro` bu kurulumun DB'sinde task type olarak tanımlı **değildir**; gerçek Sora task tipi `sora_gen_video`'dur. `sora-pro` sözleşmesi içerik olarak **Seedance 2 (Dreamina) ile aynıdır**. Detay için dosyalardaki "DB durumu" notlarına bakın. Sora **video-only**'dir.

### GPT-Image2 (`gpt_workflow`)
| Model | Tür | Zorunlu alanlar | Dosya |
|-------|-----|-----------------|-------|
| `gpt-image2-1k` | görsel (1k) | model, prompt | [gpt/gpt-image2-1k.md](gpt/gpt-image2-1k.md) |
| `gpt-image2-2k` | görsel (2k) | model, prompt | [gpt/gpt-image2-2k.md](gpt/gpt-image2-2k.md) |
| `gpt-image2-4k` | görsel (4k) | model, prompt | [gpt/gpt-image2-4k.md](gpt/gpt-image2-4k.md) |

> `prompt` tek başına → text-to-image; referans görsel (`images`/`image`/`image_url` …) verilince otomatik **edit** modu. `duration` verilirse yalnızca `1`.

## Kaynak dokümanlar (kök dizin)
`视频生成接口-veo-omni-flash.md`, `视频生成接口-sora2.md`, `视频生成接口-sora-pro.md` (başlığı "Seedance 2"), `图片生成接口-nana-banana.md`, `图片生成接口-gpt-image2.md`, `api-des.md`.
