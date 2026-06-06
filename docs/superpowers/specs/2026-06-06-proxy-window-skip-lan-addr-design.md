# Proxy bağlı pencerede lan_addr launcher/bridge türetmesini atlama — Tasarım

**Tarih:** 2026-06-06
**Durum:** Onaylandı (kullanıcı)

## Problem

`2026-05-27-lan-addr-launcher-host-design.md` ile launcher/bridge host'u browser'ın
`lan_addr`'inden türetilmeye başlandı (örn. `http://88.99.252.117:8000/`). Ancak pencereye
**proxy bağlıysa**, browser launcher sayfasını proxy üzerinden açmaya çalışıyor ve proxy o
host:port'a ulaşamıyor. `127.0.0.1` ise browser tarafından proxy bypass edildiği için çalışıyor.

## Karar (kullanıcı)

1. **Davranış:** Proxy bağlı pencerede yalnızca **lan_addr türetme adımı atlanır**. Öncelik
   zincirinin kalanı aynen işler: config'de loopback olmayan bir base_url varsa o kazanır,
   yoksa eskisi gibi `http://127.0.0.1:{server_port}/` / `ws://127.0.0.1:{server_port}/...`.
2. **Proxy tespiti:** DB'deki pencere kaydından: `windows.proxy_id` (Roxy `proxyInfo.moduleId`)
   dolu **VEYA** `raw_json`'daki `proxyHost`+`proxyPort` dolu → proxy bağlı sayılır.
   `proxyCategory == "noproxy"` ise proxy yok sayılır (öncelikli guard).

## Değişiklikler

### 1. `src/services/browser_extension_interaction.py`
- Modül seviyesinde `_db: Optional[Any] = None` + `set_extension_interaction_db(db)` setter
  (api modüllerindeki `set_dependencies` deseninin muadili).
- Yeni async helper `window_has_proxy(space_id, window_key) -> bool`:
  - Sorgu (read-only):
    ```sql
    SELECT w.proxy_id, w.raw_json
    FROM windows w JOIN spaces s ON w.space_pk = s.id
    WHERE s.space_id = ? AND w.window_key = ? AND w.deleted = 0
    ORDER BY w.updated_at DESC LIMIT 1
    ```
  - Kural: raw_json parse edilir; `proxyCategory` (case-insensitive) `"noproxy"` ise → `False`.
    Aksi halde `proxy_id` dolu (>0) VEYA (`proxyHost` ve `proxyPort` dolu) → `True`.
  - Satır yok / parse hatası / `_db` set edilmemiş / her türlü istisna → `False`
    (mevcut lan_addr davranışı korunur, akış asla kırılmaz).
- `trigger_veo_extension_ws_connection_via_window`: `browser_base_url` türetildikten sonra
  `await window_has_proxy(sid, wkey)` → `True` ise `browser_base_url = ""`; debug print'e
  `proxy_bound=<bool>` eklenir. Böylece hem launcher hem gömülü `fpb_bridge_url` tek noktadan
  eski davranışa döner.

### 2. `src/main.py`
- Startup'ta `set_dependencies` çağrılarının (satır ~120-122) yanına:
  `browser_extension_interaction.set_extension_interaction_db(db)`.

### 3. `src/api/admin.py` (~4606, convert-access-token / gpt_workflow annotate noktası)
- `annotate_url_with_extension_config(..., browser_base_url=...)` öncesi aynı helper ile
  kontrol; proxy bağlıysa `browser_base_url=""` geçilir.

## Hata yönetimi
- Proxy lookup'ı best-effort: tüm istisnalar `False`'a düşer; yalnızca debug log.

## Doğrulama
- `python3 -m py_compile` (3 dosya).
- `window_has_proxy` karar mantığı sahte satırlarla birim senaryoları:
  proxy_id'li / yalnız proxyHost+Port'lu / `noproxy` kategorili / boş satır / bozuk raw_json.
- Canlı: proxy'li pencerede launcher debug print'inde `proxy_bound=True` +
  `launcher='http://127.0.0.1:8000/...'` görülmesi; proxy'siz pencerede lan_addr host'unun
  korunması.

## Kapsam dışı
- Roxy API'den canlı proxyInfo sorgusu (kullanıcı DB tespitini seçti).
- Executor imzalarında `window_has_proxy` parametre threading'i (Yaklaşım 2, reddedildi).
