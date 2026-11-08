/*
runGeneratedTest(config) parameter contract:
The JSON in the Test Config box is passed as config. Keep this list even when some fields are unused.
- config.prompt: string - 视频生成的提示词
- config.videoMode: string - "i2v" | "start_end" | "r2v" | "edit" | "extend"
- config.modelKey: string - Flow videoModelKey (e.g. "macaron_cookie_r2v_10s")
- config.outputResolution: string - "VIDEO_RESOLUTION_720P" | "VIDEO_RESOLUTION_360P"
- config.wantUpsample: boolean - 是否执行 1080p / 4K 放大
- config.upsampleResolution: string - "VIDEO_RESOLUTION_1080P" | "VIDEO_RESOLUTION_4K"
- config.upsamplerKey: string - "veo_3_1_upsampler_1080p" | "veo_3_1_upsampler_4k"
- config.referenceImageUrls: array - 参考图片URL数组（0-9张）
- config.referenceAudioRefs: array - 参考音频/音色数组（0-5个，如 "voices/puck"）
- config.referenceVideoUrl: string - 参考视频URL（edit / extend 模式）
- config.aspectRatio: string - 视频横竖比例，可选值："9:16"（竖版）或 "16:9"（横版），默认 "16:9"
*/

async function runGeneratedTest(config) {
  const startTime = Date.now();
  
  const prompt = String(config.prompt || "").trim();
  const referenceImageUrls = (Array.isArray(config.referenceImageUrls) ? config.referenceImageUrls : [])
    .map(u => String(u || "").trim()).filter(Boolean);
  const referenceAudioRefs = (Array.isArray(config.referenceAudioRefs) ? config.referenceAudioRefs : [])
    .map(a => String(a || "").trim()).filter(Boolean);
  const referenceVideoUrl = String(config.referenceVideoUrl || "").trim();
  const aspectRatio = String(config.aspectRatio || "16:9").trim();

  let videoMode = String(config.videoMode || "").trim().toLowerCase();
  if (!videoMode) {
    if (referenceVideoUrl) videoMode = "edit";
    else videoMode = "r2v";
  }
  
  if (!prompt) {
    return { ok: false, error: "缺少必需参数: config.prompt" };
  }
  
  if ((videoMode === "edit" || videoMode === "extend") && !referenceVideoUrl) {
    return { ok: false, error: `${videoMode} 模式缺少必需参数: config.referenceVideoUrl` };
  }
  if (videoMode === "i2v" && referenceImageUrls.length < 1) {
    return { ok: false, error: "i2v 模式至少需要 1 张首帧图片" };
  }
  if (videoMode === "start_end" && referenceImageUrls.length < 2) {
    return { ok: false, error: "start_end 模式需要 2 张图片（首帧+尾帧）" };
  }
  if (videoMode === "r2v" && referenceImageUrls.length === 0 && referenceAudioRefs.length === 0) {
    return { ok: false, error: "缺少必需参数: referenceImageUrls 或 referenceAudioRefs" };
  }
  
  if (referenceImageUrls.length > 9) {
    return { ok: false, error: "参考图片数量超过限制（最多9张）" };
  }
  if (referenceAudioRefs.length > 5) {
    return { ok: false, error: "参考音频数量超过限制（最多5个）" };
  }
  
  // 验证并转换 aspectRatio
  let aspectRatioCode;
  if (aspectRatio === "9:16" || aspectRatio === "竖版" || aspectRatio === "vertical") {
    aspectRatioCode = 1; // 竖版
  } else if (aspectRatio === "16:9" || aspectRatio === "横版" || aspectRatio === "horizontal") {
    aspectRatioCode = 2; // 横版
  } else {
    return { 
      ok: false, 
      error: `无效的 aspectRatio 参数: "${aspectRatio}"，仅支持 "9:16" 或 "16:9"` 
    };
  }
  
  console.log(`🚀 开始 Flow 视频任务 (${videoMode})`);
  console.log("  - 提示词:", prompt);
  console.log("  - 参考图数量:", referenceImageUrls.length);
  console.log("  - 参考音频数量:", referenceAudioRefs.length);
  if (referenceVideoUrl) console.log("  - 参考视频:", referenceVideoUrl);
  console.log("  - 视频比例:", aspectRatio, `(代码: ${aspectRatioCode})`);
  referenceImageUrls.forEach((url, idx) => {
    console.log(`  - 参考图${idx + 1}:`, url);
  });
  
  // ============ 工具函数 ============
  
  function getStableParams() {
    const params = { fSid: null, atToken: null, bl: null };
    const wiz = window.WIZ_global_data || (typeof globalThis !== "undefined" && globalThis.WIZ_global_data) || {};

    if (typeof wiz.SNlM0e === "string" && wiz.SNlM0e) {
      params.atToken = wiz.SNlM0e;
    }
    if (typeof wiz.FdrFJe === "string" && wiz.FdrFJe) {
      params.fSid = wiz.FdrFJe;
    }
    if (typeof wiz.cfb2h === "string" && wiz.cfb2h) {
      params.bl = wiz.cfb2h;
    }

    for (const val of Object.values(wiz)) {
      if (!params.fSid && typeof val === "string" && /^-?\d{15,25}$/.test(val)) {
        params.fSid = val;
      }
      if (!params.atToken && typeof val === "string" && (/^AIQ-[A-Za-z0-9_-]+/.test(val) || /^AIt[A-Za-z0-9_-]+/.test(val) || /^AFo[A-Za-z0-9_-]+/.test(val))) {
        params.atToken = val;
      }
      if (!params.bl && typeof val === "string" && /^boq[_-]/.test(val)) {
        params.bl = val;
      }
    }

    if (!params.atToken || !params.fSid || !params.bl) {
      try {
        const scripts = document.querySelectorAll("script");
        for (let i = 0; i < scripts.length; i++) {
          const text = scripts[i].textContent || "";
          if (!text || (!text.includes("WIZ_global_data") && !text.includes("SNlM0e"))) continue;
          if (!params.atToken) {
            const mAt = text.match(/"SNlM0e"\s*:\s*"([^"]+)"/);
            if (mAt && mAt[1]) params.atToken = mAt[1];
          }
          if (!params.fSid) {
            const mSid = text.match(/"FdrFJe"\s*:\s*"([^"]+)"/);
            if (mSid && mSid[1]) params.fSid = mSid[1];
          }
          if (!params.bl) {
            const mBl = text.match(/"cfb2h"\s*:\s*"([^"]+)"/) || text.match(/(boq_labs-ai-sandbox-frontend_[A-Za-z0-9_.-]+)/);
            if (mBl && mBl[1]) params.bl = mBl[1];
          }
          if (params.atToken && params.fSid && params.bl) break;
        }
      } catch (_) {}
    }

    if (!params.fSid || !params.bl) {
      try {
        const requests = performance.getEntriesByType("resource")
          .filter(entry => String(entry.name).includes("batchexecute"));
        if (requests.length > 0) {
          const requestUrl = new URL(requests[requests.length - 1].name);
          if (!params.fSid) params.fSid = requestUrl.searchParams.get("f.sid");
          if (!params.bl) params.bl = requestUrl.searchParams.get("bl");
        }
      } catch (error) {
        console.warn("⚠️ 无法从请求历史中提取参数:", error);
      }
    }

    if (!params.bl) {
      params.bl = "boq_labs-ai-sandbox-frontend_20260922.00_p0";
    }

    return params;
  }

  function getCurrentProjectId() {
    const match = window.location.pathname.match(/^\/project\/([a-f0-9-]+)/i);
    return match ? match[1] : null;
  }

  function generateUUID() {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  const DEFAULT_SITE_KEY = "6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV";

  function resolveSitekey() {
    try {
      const cfg = window.___grecaptcha_cfg || {};
      const clients = cfg.clients || {};
      for (const k of Object.keys(clients)) {
        const c = clients[k];
        if (c && c.sitekey) return c.sitekey;
      }
    } catch (e) {}
    return DEFAULT_SITE_KEY;
  }

  function waitReady(timeout = 5000) {
    return new Promise((resolve) => {
      let done = false;
      const fin = () => { if (!done) { done = true; resolve(); } };
      try { window.grecaptcha?.enterprise?.ready?.(fin); } catch (e) {}
      setTimeout(fin, timeout);
    });
  }

  async function ensureWidget(sitekey) {
    if (window.__fp_recaptcha_widget_id !== undefined && window.__fp_recaptcha_widget_id !== null) {
      return window.__fp_recaptcha_widget_id;
    }
    await waitReady(5000);
    let host = document.getElementById('__fp_recaptcha_host');
    if (!host) {
      host = document.createElement('div');
      host.id = '__fp_recaptcha_host';
      host.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;';
      (document.body || document.documentElement).appendChild(host);
    } else {
      if (host.childNodes && host.childNodes.length > 0) {
        host.innerHTML = '';
      }
    }
    return await new Promise((resolve, reject) => {
      try {
        const widgetId = window.grecaptcha.enterprise.render(host, {
          sitekey,
          size: 'invisible',
          callback: () => {},
          'error-callback': (m) => reject(new Error('render_error: ' + m)),
        });
        window.__fp_recaptcha_widget_id = widgetId;
        resolve(widgetId);
      } catch (e) {
        try {
          const cfg = window.___grecaptcha_cfg || {};
          const clients = cfg.clients || {};
          const keys = Object.keys(clients);
          if (keys.length > 0) {
            window.__fp_recaptcha_widget_id = keys[0];
            return resolve(keys[0]);
          }
        } catch (_) {}
        reject(new Error('render_threw: ' + (e && e.message || e)));
      }
    });
  }

  const _realObjectAssign = Object.assign;

  async function executeWithAssignNeuter(target, action) {
    const targetAction = action;
    Object.assign = function (dest, ...sources) {
      const result = _realObjectAssign.call(this, dest, ...sources);
      if (result && typeof result === 'object' && result.action === 'extension_hijack_detected') {
        result.action = targetAction;
      }
      return result;
    };
    try {
      const token = await Promise.race([
        window.grecaptcha.enterprise.execute(target, { action }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('execute_hang')), 10000)),
      ]);
      return token ? String(token) : null;
    } finally {
      Object.assign = _realObjectAssign;
    }
  }

  let _recaptchaQueue = Promise.resolve();

  function getRecaptchaToken(action) {
    const run = async () => {
      if (!window.grecaptcha || !window.grecaptcha.enterprise) {
        throw new Error("grecaptcha.enterprise not found");
      }
      const sitekey = resolveSitekey();
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await waitReady(2500);
          const widgetId = await ensureWidget(sitekey);
          const token = await executeWithAssignNeuter(widgetId, action);
          if (token) return String(token);
        } catch (err) {
          console.warn(`[getRecaptchaToken] widget execute attempt ${attempt} failed:`, err);
        }
        await new Promise(r => setTimeout(r, 600));
      }
      return await executeWithAssignNeuter(sitekey, action);
    };
    const next = _recaptchaQueue.then(run, run);
    _recaptchaQueue = next.catch(() => {});
    return next;
  }

  function buildBatchExecuteUrl(rpcids, params, projectId) {
    const reqid = Math.floor(Math.random() * 9000 + 1000) * 100000 + Math.floor(Math.random() * 100000);
    const hl = (document.documentElement.lang || navigator.language || "en").split("-")[0];
    const sourcePath = encodeURIComponent(location.pathname || `/project/${projectId}`);

    return (
      "https://flow.google.com/_/AiSandboxAngularFrontend/data/batchexecute?" +
      `rpcids=${rpcids}&` +
      `source-path=${sourcePath}&` +
      `bl=${encodeURIComponent(params.bl)}&` +
      `f.sid=${encodeURIComponent(params.fSid)}&` +
      `hl=${encodeURIComponent(hl)}&` +
      `_reqid=${reqid}&` +
      "rt=c"
    );
  }

  async function sendBatchExecute(rpcids, payloadArray, params, projectId) {
    const url = buildBatchExecuteUrl(rpcids, params, projectId);
    
    const payloadStr = JSON.stringify(payloadArray);
    const requestData = [[[rpcids, payloadStr, null, "generic"]]];
    const body =
      `f.req=${encodeURIComponent(JSON.stringify(requestData))}` +
      `&at=${encodeURIComponent(params.atToken)}&`;

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            "X-Same-Domain": "1"
          },
          body,
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }

        return await response.text();
      } catch (err) {
        lastError = err;
        const msg = String(err && err.message || err);
        const isNetworkErr = /Failed to fetch|NetworkError|network error|Failed to execute 'fetch'/i.test(msg);
        if (attempt < 3 && (isNetworkErr || /请求失败: 5/i.test(msg))) {
          console.warn(`⚠️ [sendBatchExecute] attempt ${attempt} failed (${msg}), retrying in 2s...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          throw lastError;
        }
      }
    }
    throw lastError;
  }

  function parseBatchExecuteResponse(responseText) {
    const lines = responseText.split('\n');
    for (const line of lines) {
      if (line.startsWith('[[')) {
        try {
          const parsed = JSON.parse(line);
          return parsed;
        } catch (e) {
          console.warn("解析失败:", e);
        }
      }
    }
    return null;
  }

  function decodeBatchExecuteResponse(responseText) {
    let decoded = String(responseText || "");
    for (let i = 0; i < 3; i++) {
      const next = decoded
        .replace(/\\\\/g, "\\")
        .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\\//g, "/");
      if (next === decoded) break;
      decoded = next;
    }
    return decoded;
  }

  function extractVideoUrl(responseText) {
    const decoded = decodeBatchExecuteResponse(responseText);
    const match = decoded.match(/https:\/\/flow-content\.google\/video\/[0-9a-f-]+\?[^\s"'\\\]]+/i);
    if (!match) {
      return { videoUrl: null, decodedResponse: decoded };
    }
    return {
      videoUrl: match[0].replace(/[),]+$/, ""),
      decodedResponse: decoded
    };
  }

  function isNotFoundOrCode5(responseText, errorDetail) {
    const combined = `${String(responseText || "")} ${String(errorDetail || "")}`;
    return /NOT_FOUND|not found|code\s*[=:]\s*5|\[\s*"er"\s*,[^\]]*,\s*5\b|\[\s*5\s*\]/i.test(combined);
  }

  function extractMediaUUIDFromRpcResponse(parsedLines, targetRpcId, excludeUUIDs = []) {
    let mediaUUID = null;
    let foundRpcItem = false;
    let rpcErrorDetail = "";
    const excludeSet = new Set(
      (excludeUUIDs || []).filter(Boolean).map(x => String(x).toLowerCase())
    );

    if (Array.isArray(parsedLines)) {
      for (const item of parsedLines) {
        if (item && item[0] === "wrb.fr" && item[1] === targetRpcId) {
          foundRpcItem = true;
          if (item[2]) {
            const responseStr = String(item[2]);
            try {
              const parsedData = JSON.parse(responseStr);
              if (Array.isArray(parsedData)) {
                if (typeof parsedData[0] === "string" && parsedData[0].length >= 32 && !excludeSet.has(parsedData[0].toLowerCase())) {
                  mediaUUID = parsedData[0];
                } else if (Array.isArray(parsedData[0]) && typeof parsedData[0][0] === "string" && parsedData[0][0].length >= 32 && !excludeSet.has(parsedData[0][0].toLowerCase())) {
                  mediaUUID = parsedData[0][0];
                }
              }
            } catch (_) {}

            if (!mediaUUID) {
              const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
              const rawMatches = responseStr.match(uuidPattern) || [];
              const filteredUUIDs = rawMatches.filter(u => !excludeSet.has(u.toLowerCase()));
              if (rawMatches.length >= 2 && !excludeSet.has(rawMatches[1].toLowerCase())) {
                mediaUUID = rawMatches[1];
                console.log(`✅ 成功提取视频媒体UUID (${targetRpcId} allUUIDs[1]):`, mediaUUID);
              } else if (filteredUUIDs.length >= 1) {
                mediaUUID = filteredUUIDs[0];
                console.log(`✅ 成功提取视频媒体UUID (${targetRpcId} filtered[0]):`, mediaUUID);
              }
            }
            if (mediaUUID) {
              console.log(`✅ 成功提取视频媒体UUID (${targetRpcId}):`, mediaUUID);
            } else {
              rpcErrorDetail = responseStr.substring(0, 300);
            }
          } else {
            rpcErrorDetail = "item[2] is empty, item: " + JSON.stringify(item).substring(0, 300);
          }
          break;
        }
      }
    }
    return { mediaUUID, foundRpcItem, rpcErrorDetail };
  }

  async function downloadAndConvertToJpeg(imageUrl) {
    console.log("📥 正在下载图片:", imageUrl);
    
    let response = null;
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`图片下载失败: ${response.status}`);
        }
        break;
      } catch (err) {
        lastError = err;
        const msg = String(err && err.message || err);
        if (attempt < 3) {
          console.warn(`⚠️ [downloadAndConvertToJpeg] attempt ${attempt} failed (${msg}), retrying in 2s...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          throw lastError;
        }
      }
    }
    
    const blob = await response.blob();
    console.log("✅ 图片下载成功，类型:", blob.type, "大小:", Math.floor(blob.size / 1024), "KB");
    
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
    
    console.log("✅ 图片加载完成，尺寸:", img.width, "x", img.height);
    
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    
    URL.revokeObjectURL(img.src);
    
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const jpegBase64 = jpegDataUrl.split(',')[1];
    
    console.log("✅ 已转换为JPEG，大小:", Math.floor(jpegBase64.length / 1024), "KB");
    
    return jpegBase64;
  }

  async function uploadImage(imageUrl, params, projectId, index) {
    console.log(`📤 上传第 ${index + 1} 张图片...`);
    const imageBase64 = await downloadAndConvertToJpeg(imageUrl);
    const uploadRecaptchaToken = await getRecaptchaToken("IMAGE_GENERATION");
    
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    
    const uploadPayloadArray = [
      [null, 22, null, null, null, projectId, null, null, null, null, [uploadRecaptchaToken, 1]],
      imageBase64,
      "image/jpeg",
      1,
      null,
      null,
      null,
      null,
      `image-${index + 1}.jpg`,
      null,
      uuid1,
      uuid2
    ];

    const uploadResponse = await sendBatchExecute("maseQ", uploadPayloadArray, params, projectId);
    const uploadParsed = parseBatchExecuteResponse(uploadResponse);
    
    if (!uploadParsed || uploadParsed.length === 0) {
      throw new Error(`❌ 上传第 ${index + 1} 张图片失败：响应为空`);
    }
    
    let mediaUUID = null;
    
    for (const item of uploadParsed) {
      if (item && item[0] === "wrb.fr" && item[1] === "maseQ" && item[2]) {
        try {
          const data = JSON.parse(item[2]);
          
          if (data && data[0] && data[0][0]) {
            mediaUUID = data[0][0];
            console.log(`✅ 第 ${index + 1} 张图片上传成功，UUID:`, mediaUUID);
          }
        } catch (e) {
          console.error(`❌ 解析第 ${index + 1} 张图片UUID失败:`, e.message);
        }
        break;
      }
    }
    
    if (!mediaUUID) {
      throw new Error(`❌ 上传第 ${index + 1} 张图片失败：无法提取媒体UUID`);
    }
    
    return mediaUUID;
  }

  async function probeVideoDuration(blob) {
    try {
      const url = URL.createObjectURL(blob);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      const duration = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(0), 6000);
        v.onloadedmetadata = () => {
          clearTimeout(timer);
          resolve(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0);
        };
        v.onerror = () => {
          clearTimeout(timer);
          resolve(0);
        };
        v.src = url;
      });
      URL.revokeObjectURL(url);
      return duration;
    } catch (_) {
      return 0;
    }
  }

  async function uploadVideo(videoUrl, params, projectId) {
    console.log("📥 正在下载参考视频:", videoUrl);
    let response = null;
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(videoUrl);
        if (!response.ok) throw new Error(`视频下载失败: ${response.status}`);
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
        else throw lastErr;
      }
    }
    const blob = await response.blob();
    const mimeType = (blob.type && blob.type.startsWith("video/")) ? blob.type : "video/mp4";
    const measuredDuration = await probeVideoDuration(blob);
    const startUrl = `https://flow.google.com/upload/v1/flow/upload/video/${projectId}`;
    const startHeaders = {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(blob.size),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Slug": encodeURIComponent("reference-video.mp4"),
    };
    if (params.atToken) startHeaders["X-Framework-Xsrf-Token"] = params.atToken;
    const startResp = await fetch(startUrl, {
      method: "POST",
      headers: startHeaders,
      credentials: "include",
    });
    if (!startResp.ok) {
      throw new Error(`Scotty video upload start failed: ${startResp.status} ${startResp.statusText}`);
    }
    const uploadUrl = startResp.headers.get("x-goog-upload-url") || startResp.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      throw new Error("Scotty video upload start response missing x-goog-upload-url header");
    }
    const finalizeHeaders = {
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
    };
    if (params.atToken) finalizeHeaders["X-Framework-Xsrf-Token"] = params.atToken;
    const finResp = await fetch(uploadUrl, {
      method: "POST",
      headers: finalizeHeaders,
      body: blob,
      credentials: "include",
    });
    if (!finResp.ok) {
      throw new Error(`Scotty video upload finalize failed: ${finResp.status} ${finResp.statusText}`);
    }
    const finText = await finResp.text();
    let finJson = null;
    try { finJson = JSON.parse(finText); } catch (_) {}
    let rawMediaId = (
      finJson?.media_id ||
      finJson?.mediaId ||
      finJson?.media?.name ||
      finJson?.media?.media_id ||
      finJson?.media?.mediaId ||
      finJson?.name ||
      ""
    );
    if (!rawMediaId) {
      const mediaKeyMatch = finText.match(/"media(?:_id|Id)?"[\s\S]{0,120}?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (mediaKeyMatch) {
        rawMediaId = mediaKeyMatch[1];
      } else {
        const allMatches = finText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
        if (allMatches && allMatches.length > 0) {
          rawMediaId = allMatches[allMatches.length - 1];
        }
      }
    }
    const videoMediaId = String(rawMediaId || "").replace(/^media\//i, "").trim();
    if (!videoMediaId) {
      throw new Error(`Scotty video upload succeeded but mediaId could not be parsed: ${finText.substring(0, 300)}`);
    }
    console.log("✅ 参考视频上传成功, mediaId:", videoMediaId, "duration:", measuredDuration);
    let finalUpStatus = null;
    let upPollSample = "";
    for (let p = 0; p < 30; p++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const upPollResp = await sendBatchExecute("jwpduf", [null, null, [[videoMediaId]]], params, projectId);
        const upParsed = parseBatchExecuteResponse(upPollResp);
        let upStatus = null;
        if (upParsed && upParsed.length > 0) {
          for (const item of upParsed) {
            if (item && item[0] === "wrb.fr" && item[1] === "jwpduf" && item[2]) {
              upPollSample = String(item[2]).substring(0, 300);
              const d = JSON.parse(item[2]);
              const st = d?.[2]?.[0]?.[5]?.[8];
              upStatus = Array.isArray(st) ? st[0] : st;
              break;
            }
          }
        }
        finalUpStatus = upStatus;
        console.log(`  - 上传视频处理状态 (${p + 1}/30):`, upStatus);
        if (upStatus === 3) break;
        if (upStatus === 4 || upStatus === 5) {
          throw new Error(`Uploaded reference video processing failed (status=${upStatus})`);
        }
      } catch (e) {
        if (/processing failed/i.test(String(e?.message || ""))) throw e;
      }
    }
    return { videoMediaId, durationSeconds: measuredDuration, upStatus: finalUpStatus, upPollSample, finText: finText.substring(0, 250) };
  }

  function normalizeAudioRef(ref) {
    const s = String(ref || "").trim();
    if (!s) return "";
    if (s.startsWith("voices/") || s.startsWith("media/")) return s;
    return s;
  }

  // ============ 主流程 ============
  
  try {
    const params = getStableParams();
    const projectId = getCurrentProjectId();
    
    if (!params.fSid || !params.atToken) {
      return { ok: false, error: "无法获取必要的认证参数" };
    }
    
    if (!projectId) {
      return { ok: false, error: "无法获取项目 ID" };
    }
    
    console.log("✅ 参数准备完成");
    console.log("  - 项目ID:", projectId);
    
    // 步骤1 & 1b: 并发批量上传参考图片 (最大并发 3，保持原始索引顺序) 与参考视频 (Promise.all)
    const imageUUIDs = new Array(referenceImageUrls.length);
    const uploadImagesTask = (async () => {
      if (referenceImageUrls.length === 0) return;
      console.log(`📤 开始并发上传 ${referenceImageUrls.length} 张参考图片 (最大并发: 3)...`);
      const concurrency = Math.min(3, referenceImageUrls.length);
      let nextIdx = 0;
      const workers = Array.from({ length: concurrency }, async () => {
        while (true) {
          const i = nextIdx++;
          if (i >= referenceImageUrls.length) break;
          const imageUrl = String(referenceImageUrls[i]).trim();
          if (!imageUrl) {
            throw new Error(`第 ${i + 1} 张图片URL为空`);
          }
          const uuid = await uploadImage(imageUrl, params, projectId, i);
          imageUUIDs[i] = uuid;
        }
      });
      await Promise.all(workers);
      console.log("✅ 所有图片上传完成！", imageUUIDs);
    })();

    const uploadVideoTask = ((videoMode === "edit" || videoMode === "extend") && referenceVideoUrl)
      ? uploadVideo(referenceVideoUrl, params, projectId)
      : Promise.resolve(null);

    const [, uploadedVideo] = await Promise.all([uploadImagesTask, uploadVideoTask]);
    
    // 步骤2 & 3: 根据 videoMode 构建对应的 Flow batchexecute RPC，并支持 _relaxed 自动降级重试
    const textInput = [null, null, [[[prompt]]]];
    const imageReferences = imageUUIDs.map(uuid => [null, uuid]);
    const audioReferences = referenceAudioRefs
      .map(normalizeAudioRef)
      .filter(Boolean)
      .map(v => [v]);

    const defaultModelByMode = {
      i2v: "macaron_cookie_i2v_10s",
      start_end: "macaron_cookie_i2v_fl_8s",
      r2v: "macaron_cookie_r2v_10s",
      edit: "macaron_cookie_edit",
      extend: "macaron_cookie_extend_8s",
    };
    let activeModelKey = String(config.modelKey || defaultModelByMode[videoMode] || "macaron_cookie_r2v_10s").trim();
    const outputResolution = String(config.outputResolution || "VIDEO_RESOLUTION_720P").trim();
    const is360p = activeModelKey.endsWith("_360p") || /360P/i.test(outputResolution);
    const outputSpec = is360p ? [4] : null;

    const startFrameIndex = Math.max(0, Number(config.startFrameIndex || 0) || 0);
    const durSec = Math.round(Number(config.videoDurationSeconds || uploadedVideo?.durationSeconds || 4) || 4);
    // Flow uses Xc=30 for uploaded videos (_.fQ: source===UPLOADED ? 30 : 24)
    const computedEndFrame = config.endFrameIndex != null
      ? Number(config.endFrameIndex)
      : Math.min(300, startFrameIndex + Math.round(durSec * 30));
    const endFrameIndex = Math.max(startFrameIndex + 1, computedEndFrame);

    let rpcId = "MZZa6b";
    if (videoMode === "i2v") rpcId = "eb1hJf";
    else if (videoMode === "start_end") rpcId = "nprQif";
    else if (videoMode === "edit") rpcId = "jIps6";
    else if (videoMode === "extend") rpcId = "fZytfe";

    function buildReqItem(modelKeyToUse, destination) {
      if (videoMode === "i2v") {
        return [
          textInput,
          modelKeyToUse,
          aspectRatioCode,
          null,
          [null, imageUUIDs[0]],
          destination,
          null,
          null,
          null,
          outputSpec
        ];
      } else if (videoMode === "start_end") {
        return [
          textInput,
          modelKeyToUse,
          aspectRatioCode,
          null,
          [null, imageUUIDs[0]],
          [null, imageUUIDs[1]],
          destination,
          null,
          outputSpec
        ];
      } else if (videoMode === "edit") {
        return [
          [null, uploadedVideo.videoMediaId, startFrameIndex, endFrameIndex],
          textInput,
          modelKeyToUse,
          aspectRatioCode,
          destination,
          null,
          null,
          null,
          imageReferences,
          audioReferences,
          [],
          [],
          outputSpec
        ];
      } else if (videoMode === "extend") {
        return [
          [null, uploadedVideo.videoMediaId],
          textInput,
          modelKeyToUse,
          aspectRatioCode,
          null,
          destination,
          null,
          null,
          imageReferences,
          audioReferences,
          [],
          [],
          outputSpec
        ];
      } else {
        // r2v (References)
        return [
          textInput,
          imageReferences,
          modelKeyToUse,
          aspectRatioCode,
          null,
          destination,
          null,
          audioReferences.length > 0 ? audioReferences : null,
          null,
          [],
          [],
          outputSpec
        ];
      }
    }

    async function submitCreateTask(modelKeyToUse) {
      console.log("🔐 获取视频生成 reCAPTCHA token...");
      const videoRecaptchaToken = await getRecaptchaToken("VIDEO_GENERATION");
      console.log("✅ 视频生成 reCAPTCHA token 获取成功");

      const uuid1 = generateUUID().toUpperCase();
      const uuid2 = generateUUID().toUpperCase();
      const destination = [null, null, null, null, uuid1, uuid2];
      const reqItem = buildReqItem(modelKeyToUse, destination);

      const createPayloadArray = [
        [reqItem],
        [
          null,
          22,
          null,
          null,
          null,
          projectId,
          null,
          null,
          null,
          null,
          [videoRecaptchaToken, 1]
        ],
        [uuid2, 2]
      ];

      console.log(`  - RPC: ${rpcId}, modelKey: ${modelKeyToUse}, mode: ${videoMode}`);
      console.log("  - 完整payload预览:", JSON.stringify(createPayloadArray).substring(0, 240) + "...");

      const createResponse = await sendBatchExecute(rpcId, createPayloadArray, params, projectId);
      console.log("📋 原始响应:", createResponse.substring(0, 500));
      const createParsed = parseBatchExecuteResponse(createResponse);
      const extracted = extractMediaUUIDFromRpcResponse(
        createParsed,
        rpcId,
        [projectId, ...imageUUIDs, uploadedVideo?.videoMediaId]
      );
      return {
        createResponse,
        createParsed,
        ...extracted,
      };
    }

    let subResult = await submitCreateTask(activeModelKey);

    if (!subResult.mediaUUID && activeModelKey.includes("_relaxed") && isNotFoundOrCode5(subResult.createResponse, subResult.rpcErrorDetail)) {
      const fallbackModelKey = activeModelKey.replace("_relaxed", "");
      console.warn(`⚠️ 模型 ${activeModelKey} 返回 NOT_FOUND/code 5，自动降级重试: ${fallbackModelKey}`);
      activeModelKey = fallbackModelKey;
      subResult = await submitCreateTask(activeModelKey);
    }

    const { createResponse, createParsed, mediaUUID, foundRpcItem, rpcErrorDetail } = subResult;
    
    if (!createParsed || createParsed.length === 0) {
      return { 
        ok: false, 
        error: "创建视频任务失败：响应为空",
        rawResponse: String(createResponse || "").substring(0, 1000)
      };
    }
    
    if (!mediaUUID) {
      const detail = rpcErrorDetail || (!foundRpcItem ? `${rpcId} RPC not found in response` : "");
      return { 
        ok: false, 
        error: `创建视频任务失败：无法提取媒体UUID${detail ? ` (${detail})` : ""}`,
        createParsed: JSON.stringify(createParsed).substring(0, 1000),
        rawResponse: String(createResponse || "").substring(0, 1000)
      };
    }
    
    console.log(`✅ 视频任务 (${videoMode}) 创建成功！`);
    console.log("  - 媒体UUID:", mediaUUID);
    
    // 步骤4: 轮询任务状态 (rpcids: jwpduf & Zzl0ze fallback)
    console.log("⏳ 开始轮询任务状态...");
    
    const pollInterval = Math.max(1000, (Number(config.pollIntervalSeconds) || 5) * 1000);
    const maxWaitSeconds = Math.max(60, Number(config.maxWaitSeconds) || 600);
    const maxPolls = Math.max(12, Math.ceil((maxWaitSeconds * 1000) / pollInterval));
    let pollCount = 0;
    let taskStatus = null;
    let isComplete = false;
    let videoUrl = null;
    let resolvedMediaId = mediaUUID;
    const uuidExactRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    while (pollCount < maxPolls && !isComplete) {
      pollCount++;
      console.log(`🔄 轮询第 ${pollCount}/${maxPolls} 次...`);
      
      const pollPayloadArray = [null, null, [[mediaUUID]]];
      const pollResponse = await sendBatchExecute("jwpduf", pollPayloadArray, params, projectId);
      const pollParsed = parseBatchExecuteResponse(pollResponse);
      
      if (pollParsed && pollParsed.length > 0) {
        for (const item of pollParsed) {
          if (item && item[0] === "wrb.fr" && item[1] === "jwpduf" && item[2]) {
            const responseStr = String(item[2]);
            try {
              const data = JSON.parse(responseStr);
              if (data && data[2] && data[2][0]) {
                const record = data[2][0];
                if (typeof record[2] === "string" && uuidExactRegex.test(record[2])) {
                  resolvedMediaId = record[2];
                }
                if (record[3] === "CAE") {
                  isComplete = true;
                  console.log("✅ 任务完成 (record[3] === 'CAE')！");
                  break;
                }
                if (record[5] && record[5][8]) {
                  const statusInfo = record[5][8];
                  
                  // statusInfo 可能是数字或数组
                  // 成功: 3 或 6
                  // 失败: [4, [3, "ERROR_CODE"], ["DETAIL"]]
                  if (Array.isArray(statusInfo)) {
                    taskStatus = statusInfo[0];
                  } else {
                    taskStatus = statusInfo;
                  }
                  if (taskStatus === 4 || taskStatus === 5) {
                    const errArr = Array.isArray(statusInfo) && Array.isArray(statusInfo[1]) ? statusInfo[1] : null;
                    const errorCode = (errArr && errArr[1]) || `STATUS_${taskStatus}`;
                    const errorDetails = (Array.isArray(statusInfo) && Array.isArray(statusInfo[2])) ? statusInfo[2].join(", ") : JSON.stringify(statusInfo);
                    const errorMessage = errorDetails ? `${errorCode}: ${errorDetails}` : errorCode;
                    console.warn("⚠️ 状态返回告警:", errorMessage);
                    if (!String(errorDetails).includes("Media not found") && !String(errorCode).includes("NOT_FOUND")) {
                      return {
                        ok: false,
                        error: `视频生成失败: ${errorMessage}`,
                        errorCode,
                        errorDetails: (Array.isArray(statusInfo) && statusInfo[2]) || [],
                        mediaUUID,
                        rawResponse: JSON.stringify({
                          videoMediaId: uploadedVideo?.videoMediaId,
                          dur: uploadedVideo?.durationSeconds,
                          upStatus: uploadedVideo?.upStatus,
                          upPollSample: uploadedVideo?.upPollSample,
                          startFrameIndex,
                          endFrameIndex,
                          finText: uploadedVideo?.finText
                        })
                      };
                    }
                  }
                  
                  console.log("  - 当前状态:", taskStatus);
                  
                  // 状态 3 表示完成
                  if (taskStatus === 3) {
                    isComplete = true;
                    console.log("✅ 任务完成！");
                    break;
                  }
                  
                  // 状态 6 表示处理中
                  if (taskStatus === 6) {
                    console.log("  - 任务处理中...");
                  }
                }
              }
            } catch (e) {
              console.warn("⚠️ 解析轮询响应失败:", e.message);
            }
            if (!isComplete && responseStr.includes('"CAE"')) {
              isComplete = true;
              console.log("✅ 任务完成 (检测到 CAE 状态)！");
              break;
            }
          }
        }
      }
      
      // 每 3 次轮询主动检查一次项目媒体列表 (Zzl0ze) 和 as29s
      if (isComplete || pollCount % 3 === 0 || pollCount >= maxPolls - 2) {
        try {
          const urlResp = await sendBatchExecute("as29s", [resolvedMediaId], params, projectId);
          const parsed = extractVideoUrl(urlResp);
          if (parsed && parsed.videoUrl) {
            videoUrl = parsed.videoUrl;
            isComplete = true;
            console.log("✅ 直接通过 as29s 获取到视频地址:", videoUrl);
            break;
          }
        } catch (_) {}

        try {
          const listPayload = [`projects/${projectId}`, null, null, null, [1]];
          const listResp = await sendBatchExecute("Zzl0ze", listPayload, params, projectId);
          const start = listResp.indexOf(mediaUUID);
          if (start !== -1) {
            const snippet = listResp.slice(start, start + 800);
            const m = snippet.match(/null,null,\\?"([0-9a-fA-F-]{36})\\?"/);
            if (m && m[1]) {
              const realMediaId = m[1];
              resolvedMediaId = realMediaId;
              console.log("🔍 从项目列表解析出真实 mediaId:", realMediaId);
              const realUrlResp = await sendBatchExecute("as29s", [realMediaId], params, projectId);
              const realParsed = extractVideoUrl(realUrlResp);
              if (realParsed && realParsed.videoUrl) {
                videoUrl = realParsed.videoUrl;
                isComplete = true;
                console.log("✅ 视频地址获取成功 (via Zzl0ze realMediaId)！");
                break;
              }
            }
          }
        } catch (_) {}
      }

      if (!isComplete && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    if (!isComplete && !videoUrl) {
      return {
        ok: false,
        error: `任务超时：轮询 ${maxPolls} 次后仍未完成`,
        mediaUUID,
        lastStatus: taskStatus
      };
    }
    
    // 步骤5 & 6: 获取视频URL (如果轮询中未提前拿到)
    if (!videoUrl) {
      console.log("⏳ 等待视频地址准备...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log("🎬 获取视频URL...");
      
      const maxUrlAttempts = 4;
      for (let attempt = 1; attempt <= maxUrlAttempts; attempt++) {
        console.log(`🔍 正在读取视频地址，第 ${attempt}/${maxUrlAttempts} 次`);
        
        const urlPayloadArray = [resolvedMediaId];
        const urlResponse = await sendBatchExecute("as29s", urlPayloadArray, params, projectId);
        
        const parsed = extractVideoUrl(urlResponse);
        if (parsed.videoUrl) {
          videoUrl = parsed.videoUrl;
          console.log("✅ 视频地址获取成功！");
          console.log("🎬 视频地址:", videoUrl);
          break;
        }

        // Fallback: If mediaUUID was an operation ID, resolve real media ID from project media listing (Zzl0ze)
        try {
          const listPayload = [`projects/${projectId}`, null, null, null, [1]];
          const listResp = await sendBatchExecute("Zzl0ze", listPayload, params, projectId);
          const start = listResp.indexOf(mediaUUID);
          if (start !== -1) {
            const snippet = listResp.slice(start, start + 800);
            const m = snippet.match(/null,null,\\?"([0-9a-fA-F-]{36})\\?"/);
            if (m && m[1]) {
              const realMediaId = m[1];
              resolvedMediaId = realMediaId;
              console.log("🔍 从项目列表解析出真实 mediaId:", realMediaId);
              const realUrlResp = await sendBatchExecute("as29s", [realMediaId], params, projectId);
              const realParsed = extractVideoUrl(realUrlResp);
              if (realParsed.videoUrl) {
                videoUrl = realParsed.videoUrl;
                console.log("✅ 视频地址获取成功 (via realMediaId)！");
                break;
              }
            }
          }
        } catch (e) {
          console.warn("⚠️ Zzl0ze mediaId lookup failed:", e);
        }
        
        if (attempt < maxUrlAttempts) {
          console.log("⚠️ 未找到视频地址，4秒后重试...");
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }
    }
    
    if (!videoUrl) {
      return {
        ok: false,
        error: "无法获取视频URL",
        mediaUUID
      };
    }

    // 步骤7: Flow 原生视频超分放大 (p0UkFb) 支持 1080p / 4K
    const wantUpsample = Boolean(config.wantUpsample) || /1080|4K/i.test(String(config.upsampleResolution || ""));
    let originVideoUrl = null;
    let upsampleOk = undefined;
    let upsampleError = undefined;
    let upsampleMediaUUID = null;
    let upsampleResolutionLabel = String(config.upsampleResolution || "").trim();

    if (wantUpsample) {
      try {
        // 如果 resolvedMediaId 仍等于提交返回的 mediaUUID，尝试再从 Zzl0ze 解析一次真实 mediaId
        if (resolvedMediaId === mediaUUID) {
          try {
            const listPayload = [`projects/${projectId}`, null, null, null, [1]];
            const listResp = await sendBatchExecute("Zzl0ze", listPayload, params, projectId);
            const start = listResp.indexOf(mediaUUID);
            if (start !== -1) {
              const snippet = listResp.slice(start, start + 800);
              const m = snippet.match(/null,null,\\?"([0-9a-fA-F-]{36})\\?"/);
              if (m && m[1]) {
                resolvedMediaId = m[1];
              }
            }
          } catch (_) {}
        }

        const is4K = /4K/i.test(String(config.upsampleResolution || "")) || /4k/i.test(String(config.upsamplerKey || ""));
        const resolutionValue = is4K ? 4 : 3;
        const upsamplerModelKey = String(config.upsamplerKey || "").trim() || (resolutionValue === 4 ? "veo_3_1_upsampler_4k" : "veo_3_1_upsampler_1080p");
        if (!upsampleResolutionLabel) {
          upsampleResolutionLabel = resolutionValue === 4 ? "VIDEO_RESOLUTION_4K" : "VIDEO_RESOLUTION_1080P";
        }

        console.log(`🚀 开始视频放大 (p0UkFb): target=${upsampleResolutionLabel}, model=${upsamplerModelKey}, mediaId=${resolvedMediaId}`);
        const upsampleRecaptchaToken = await getRecaptchaToken("VIDEO_GENERATION");
        const upUuid1 = generateUUID().toUpperCase();
        const upUuid2 = generateUUID().toUpperCase();
        const seed = Math.floor(Math.random() * 2147483647) + 1;

        const upsampleReq = [
          [null, resolvedMediaId],
          null,
          aspectRatioCode,
          seed,
          [null, null, null, null, upUuid1, upUuid2],
          null,
          resolutionValue,
          null
        ];
        while (upsampleReq.length < 31) {
          upsampleReq.push(null);
        }
        upsampleReq.push(upsamplerModelKey);

        const upsamplePayloadArray = [
          [upsampleReq],
          [null, 22, null, null, null, projectId, null, null, null, null, [upsampleRecaptchaToken, 1]],
          [upUuid2, 2]
        ];

        const upsampleResponse = await sendBatchExecute("p0UkFb", upsamplePayloadArray, params, projectId);
        const directExtract = extractVideoUrl(upsampleResponse);
        let upsampledVideoUrl = directExtract.videoUrl || null;

        if (!upsampledVideoUrl) {
          const upsampleParsed = parseBatchExecuteResponse(upsampleResponse);
          const upExtracted = extractMediaUUIDFromRpcResponse(upsampleParsed, "p0UkFb", [projectId, resolvedMediaId, mediaUUID]);
          upsampleMediaUUID = upExtracted.mediaUUID;

          if (!upsampleMediaUUID) {
            throw new Error(`p0UkFb 未返回有效的放大任务UUID (${upExtracted.rpcErrorDetail || "no UUID"})`);
          }

          console.log("✅ 放大任务创建成功, upsampleMediaUUID:", upsampleMediaUUID);
          let upPollCount = 0;
          let upComplete = false;
          let resolvedUpsampleMediaId = upsampleMediaUUID;

          while (upPollCount < maxPolls && !upComplete) {
            upPollCount++;
            console.log(`🔄 放大轮询第 ${upPollCount}/${maxPolls} 次...`);
            const upPollResp = await sendBatchExecute("jwpduf", [null, null, [[upsampleMediaUUID]]], params, projectId);
            const upPollParsed = parseBatchExecuteResponse(upPollResp);

            if (upPollParsed && upPollParsed.length > 0) {
              for (const item of upPollParsed) {
                if (item && item[0] === "wrb.fr" && item[1] === "jwpduf" && item[2]) {
                  const responseStr = String(item[2]);
                  try {
                    const data = JSON.parse(responseStr);
                    if (data && data[2] && data[2][0]) {
                      const record = data[2][0];
                      if (typeof record[2] === "string" && uuidExactRegex.test(record[2])) {
                        resolvedUpsampleMediaId = record[2];
                      }
                      if (record[3] === "CAE") {
                        upComplete = true;
                        break;
                      }
                      if (record[5] && record[5][8]) {
                        const statusInfo = record[5][8];
                        const st = Array.isArray(statusInfo) ? statusInfo[0] : statusInfo;
                        if (st === 4 || st === 5) {
                          const errCode = (Array.isArray(statusInfo) && Array.isArray(statusInfo[1]) && statusInfo[1][1]) || `STATUS_${st}`;
                          const errDetails = (Array.isArray(statusInfo) && Array.isArray(statusInfo[2])) ? statusInfo[2].join(", ") : "";
                          if (!String(errDetails).includes("Media not found") && !String(errCode).includes("NOT_FOUND")) {
                            throw new Error(`视频放大失败: ${errCode} ${errDetails}`.trim());
                          }
                        }
                        if (st === 3) {
                          upComplete = true;
                          break;
                        }
                      }
                    }
                  } catch (innerErr) {
                    if (/视频放大失败/.test(String(innerErr && innerErr.message || ""))) {
                      throw innerErr;
                    }
                  }
                  if (!upComplete && responseStr.includes('"CAE"')) {
                    upComplete = true;
                    break;
                  }
                }
              }
            }

            if (upComplete || upPollCount % 3 === 0 || upPollCount >= maxPolls - 2) {
              try {
                const uResp = await sendBatchExecute("as29s", [resolvedUpsampleMediaId], params, projectId);
                const uParsed = extractVideoUrl(uResp);
                if (uParsed && uParsed.videoUrl) {
                  upsampledVideoUrl = uParsed.videoUrl;
                  upComplete = true;
                  break;
                }
              } catch (_) {}

              try {
                const listPayload = [`projects/${projectId}`, null, null, null, [1]];
                const listResp = await sendBatchExecute("Zzl0ze", listPayload, params, projectId);
                const start = listResp.indexOf(upsampleMediaUUID);
                if (start !== -1) {
                  const snippet = listResp.slice(start, start + 800);
                  const m = snippet.match(/null,null,\\?"([0-9a-fA-F-]{36})\\?"/);
                  if (m && m[1]) {
                    resolvedUpsampleMediaId = m[1];
                    const realUrlResp = await sendBatchExecute("as29s", [resolvedUpsampleMediaId], params, projectId);
                    const realParsed = extractVideoUrl(realUrlResp);
                    if (realParsed && realParsed.videoUrl) {
                      upsampledVideoUrl = realParsed.videoUrl;
                      upComplete = true;
                      break;
                    }
                  }
                }
              } catch (_) {}
            }

            if (!upComplete && upPollCount < maxPolls) {
              await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
          }

          if (!upsampledVideoUrl && upComplete) {
            await new Promise(resolve => setTimeout(resolve, 2500));
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                const uResp = await sendBatchExecute("as29s", [resolvedUpsampleMediaId], params, projectId);
                const uParsed = extractVideoUrl(uResp);
                if (uParsed && uParsed.videoUrl) {
                  upsampledVideoUrl = uParsed.videoUrl;
                  break;
                }
              } catch (_) {}
              if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }
        }

        if (upsampledVideoUrl) {
          console.log("✅ 视频超分放大成功:", upsampledVideoUrl);
          originVideoUrl = videoUrl;
          videoUrl = upsampledVideoUrl;
          upsampleOk = true;
        } else {
          throw new Error("放大任务未返回有效视频URL");
        }
      } catch (upErr) {
        upsampleOk = false;
        upsampleError = String(upErr && upErr.message || upErr);
        console.warn("⚠️ 视频放大失败，降级返回 720p 原视频:", upsampleError);
      }
    }
    
    const elapsedMs = Date.now() - startTime;
    
    return {
      ok: true,
      message: `视频任务 (${videoMode}) 完成`,
      elapsedMs,
      elapsedFormatted: `${Math.floor(elapsedMs / 1000)}秒`,
      video_url: videoUrl,
      origin_video_url: originVideoUrl || undefined,
      upsample_ok: upsampleOk,
      upsample_resolution: wantUpsample ? upsampleResolutionLabel : undefined,
      upsample_media_id: upsampleMediaUUID || undefined,
      upsample_error: upsampleError || undefined,
      input: { 
        prompt,
        videoMode,
        modelKey: activeModelKey,
        outputResolution,
        wantUpsample,
        upsampleResolution: upsampleResolutionLabel || undefined,
        referenceImageCount: referenceImageUrls.length,
        referenceImageUrls,
        referenceAudioRefs,
        referenceVideoUrl,
        aspectRatio,
        aspectRatioCode
      },
      result: {
        projectId,
        imageUUIDs,
        videoMediaId: uploadedVideo?.videoMediaId || null,
        mediaUUID,
        resolvedMediaId,
        modelKey: activeModelKey,
        videoUrl,
        originVideoUrl: originVideoUrl || undefined,
        upsampleOk,
        upsampleResolution: wantUpsample ? upsampleResolutionLabel : undefined,
        upsampleMediaUUID: upsampleMediaUUID || undefined,
        upsampleError: upsampleError || undefined,
        pollCount,
        finalStatus: taskStatus
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error("❌ 错误:", error);
    return {
      ok: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }
}
globalThis.runGeneratedTest = runGeneratedTest;
