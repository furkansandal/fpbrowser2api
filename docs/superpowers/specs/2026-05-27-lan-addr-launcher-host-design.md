# Launcher/Bridge host'unu lan_addr'den türetme — Tasarım

**Tarih:** 2026-05-27
**Durum:** Onaylandı (kullanıcı)

## Problem

`src/services/browser_extension_interaction.py` içindeki extension launcher URL'i, fingerprint
tarayıcısı uzak bir makinedeyken (örn. `lan_addr = http://88.99.252.117:50000`) statik
`http://127.0.0.1:{server_port}/` fallback'ine düşüyor. `127.0.0.1` yalnızca tarayıcı ile Python
backend aynı makinedeyse çalışır; uzak makinede tarayıcı kendi localhost'una gider ve backend'e
ulaşamaz.

Ayrıca mevcut kodda `config.extension_launcher_url` / `config.extension_bridge_url`, ayar boş
olduğunda `"http:///"` / `"ws:///"` (truthy ama geçersiz) döndürdüğü için `127.0.0.1` fallback'leri
pratikte **ölü kod**. Yani launcher tamamen global `[extension_executor].base_url` ayarına bağlı.

## Hedef

Launcher URL'inin (ve gömülü `fpb_bridge_url` WebSocket adresinin) host kısmını, o browser'ın
`lan_addr` değerinden otomatik türetmek; port olarak Python backend portunu (`config.server_port`)
korumak.

Örnek: `lan_addr = http://88.99.252.117:50000` → launcher `http://88.99.252.117:8000/`,
bridge `ws://88.99.252.117:8000/api/extension/ws` (server_port=8000 varsayımıyla).

**Not:** lan_addr'in portu (50000 = Roxy API portu) KULLANILMAZ; yalnızca host alınır.

## Öncelik zinciri (hem launcher hem bridge için)

1. Açık `launcher_url=` argümanı (yalnız launcher; dış çağıran verirse) — en yüksek.
2. Env (`FPB_EXTENSION_LAUNCHER_URL` / `FPB_EXTENSION_BRIDGE_URL`) veya dolu
   `[extension_executor].base_url` — **ancak host'u loopback DEĞİLSE** (bkz. loopback kuralı).
3. **lan_addr host + `config.server_port`** (yeni, browser-bazlı varsayılan).
4. (yalnız launcher) bridge_url'den türetilen http(s) host (mevcut davranış).
5. `127.0.0.1:server_port` — son çare (aynı makine senaryosu).

Karar: Elle yapılandırma (2) lan_addr türetmesini (3) override eder.

### Loopback kuralı (kullanıcı kararı)
Yapılandırılmış launcher/bridge URL'inin host'u **loopback** (`127.x` / `localhost` / `::1`)
ise, bu uzak tarayıcıdan erişilemeyeceği için **override sayılmaz**; öncelik (3)'e (lan_addr)
düşülür. `192.168.x` gibi gerçek bir LAN/host yazılıysa (2) yine kazanır. Bu, kullanıcının
gerçek config'indeki `[extension_executor].base_url = "127.0.0.1:8000"` değerinin lan_addr
türetmesini engellememesini sağlar. Uygulama: `_is_loopback_url(url)` helper'ı
(`browser_extension_bridge.py`), `get_default_extension_bridge_url` ve
`get_default_extension_launcher_url` içinde `if raw and not _is_loopback_url(raw): return raw`.

## Veri akışı

`lan_addr`, çalışma zamanında `sess.pw_ctx.base_url` (`PlaywrightBrowserContext.base_url`,
`playwright_broswer_context.py:591`) üzerinden erişilebilir. Helper fonksiyonlara opsiyonel
`browser_base_url` parametresi olarak iletilir.

## Değişiklikler

### 1. `src/core/config.py`
- `extension_launcher_url`: `base_url` boşsa `"http:///"` yerine `""` döndür.
- `extension_bridge_url`: `base_url` boşsa `"ws:///"` yerine `""` döndür.
- Gerekçe: öncelik zincirinin (3)/(4)/(5) adımlarına akabilmesi için. Tek dış tüketici
  `veo_workflow_executor.py:145` için davranış değişmez (zaten geçersiz netloc'u eliyordu).

### 2. `src/services/browser_extension_bridge.py`
- Yeni helper `_bridge_url_from_browser_base(browser_base_url) -> str`:
  `urlsplit` ile host çıkar (scheme yoksa `http://` öne ekle); host varsa
  `ws://{host}:{config.server_port}/api/extension/ws`, yoksa `""`.
- `get_default_extension_bridge_url(browser_base_url: Optional[str] = None)`:
  config (env/base_url) → lan_addr-derived → `ws://127.0.0.1:{server_port}/api/extension/ws`.
- `annotate_url_with_extension_config(url, *, space_id, window_key, browser_base_url=None)`:
  iki `get_default_extension_bridge_url(...)` çağrısına `browser_base_url` ilet.

### 3. `src/services/browser_extension_interaction.py`
- Yeni helper `_launcher_url_from_browser_base(browser_base_url) -> str`:
  host varsa `http://{host}:{config.server_port}/`, yoksa `""`.
- `get_default_extension_launcher_url(browser_base_url: Optional[str] = None)`:
  config → lan_addr-derived → bridge-derived → `http://127.0.0.1:{server_port}/`.
  bridge-derived dalında `get_default_extension_bridge_url(browser_base_url)` çağrılır.
- `build_extension_launcher_url(..., browser_base_url: Optional[str] = None)`:
  varsayılan base hesabında `get_default_extension_launcher_url(browser_base_url)` kullan;
  son fallback `_launcher_url_from_browser_base(browser_base_url) or http://127.0.0.1:...`;
  gömülü `fpb_bridge_url` için `get_default_extension_bridge_url(browser_base_url)`.
- `trigger_veo_extension_ws_connection_via_window`:
  `browser_base_url = str(getattr(getattr(sess, "pw_ctx", None), "base_url", "") or "")` türet,
  `build_extension_launcher_url(..., browser_base_url=browser_base_url)`'a geçir.
  (`ensure_...` zaten `sess`'i `trigger_...`'a iletiyor; ek imza değişikliği gerekmez.)

### 4. `src/api/admin.py:4483`
- `annotate_url_with_extension_config(target_url, space_id=..., window_key=..., browser_base_url=base_url)`
  (gpt_workflow akışında `base_url` = lan_addr zaten mevcut).

## Host çıkarımı kuralları
- `urlsplit` kullan; `"://"` yoksa başına `http://` ekle (lan_addr şemasız `88.99.252.117:50000`
  gelirse de çalışsın).
- `.hostname` boş/`None` ise `""` dön → bir alt önceliğe düş.

## Kapsam dışı
- `veo_workflow_executor.py` `_veo_extension_http_base_url()` (VEO girdi-görseli yerelleştirme)
  hâlâ `[extension_executor].base_url`'e bağlı kalır — ayrı bir özellik. Talep halinde sonradan
  aynı paterne çekilebilir.

## Doğrulama (tamamlandı)
- `python3 -m py_compile` → 4 dosya OK.
- `core.config` import + property davranışı doğrulandı.
- Saf helper öncelik mantığı gerçek config (`base_url=127.0.0.1:8000`, `server_port=8000`) ile
  8 senaryoda test edildi, **8/8 geçti**:
  1. config loopback + lan_addr `88.99.252.117:50000` → launcher `http://88.99.252.117:8000/`,
     bridge `ws://88.99.252.117:8000/api/extension/ws` ✓
  2. şemasız lan_addr `88.99.252.117:50000` → `http://88.99.252.117:8000/` ✓
  3. lan_addr yok + config loopback → son çare `http://127.0.0.1:8000/` ✓
  4. config gerçek LAN IP `192.168.1.4:8000` → config kazanır, lan_addr yok sayılır ✓
  5. env non-loopback override → kazanır ✓
- NOT: Tam modül import'u bu ortamda fastapi/venv olmadığı için çalıştırılamadı; helper'lar saf
  (`urlsplit` + `config.server_port`) olduğundan mantık birebir kaynak kopyasıyla doğrulandı.
  Deploy ortamında modül import testi çalıştırılabilir.
