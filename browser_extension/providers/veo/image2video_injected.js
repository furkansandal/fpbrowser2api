/*
runGeneratedTest(config) parameter contract:
The JSON in the Test Config box is passed as config. Keep this list even when some fields are unused.
- config.prompt: string - 视频生成的提示词
- config.referenceImageUrls: array - 参考图片URL数组（1-4张）
- config.aspectRatio: string - 视频横竖比例，可选值："9:16"（竖版）或 "16:9"（横版），默认 "16:9"
*/

async function runGeneratedTest(config) {
  const startTime = Date.now();
  
  const prompt = String(config.prompt || "").trim();
  const referenceImageUrls = Array.isArray(config.referenceImageUrls) ? config.referenceImageUrls : [];
  const aspectRatio = String(config.aspectRatio || "16:9").trim();
  
  if (!prompt) {
    return { ok: false, error: "缺少必需参数: config.prompt" };
  }
  
  if (referenceImageUrls.length === 0) {
    return { ok: false, error: "缺少必需参数: config.referenceImageUrls（至少需要1张参考图）" };
  }
  
  if (referenceImageUrls.length > 9) {
    return { ok: false, error: "参考图片数量超过限制（最多4张）" };
  }
  
  // 验证并转换 aspectRatio
  let aspectRatioCode;
  if (aspectRatio === "9:16") {
    aspectRatioCode = 1; // 竖版
  } else if (aspectRatio === "16:9") {
    aspectRatioCode = 2; // 横版
  } else {
    return { 
      ok: false, 
      error: `无效的 aspectRatio 参数: "${aspectRatio}"，仅支持 "9:16" 或 "16:9"` 
    };
  }
  
  console.log("🚀 开始多图生视频测试");
  console.log("  - 提示词:", prompt);
  console.log("  - 参考图数量:", referenceImageUrls.length);
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

  async function getRecaptchaToken(action) {
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
    
    // 步骤1: 批量上传参考图片
    console.log(`📤 开始批量上传 ${referenceImageUrls.length} 张参考图片...`);
    const imageUUIDs = [];
    
    for (let i = 0; i < referenceImageUrls.length; i++) {
      const imageUrl = String(referenceImageUrls[i]).trim();
      if (!imageUrl) {
        throw new Error(`第 ${i + 1} 张图片URL为空`);
      }
      const uuid = await uploadImage(imageUrl, params, projectId, i);
      imageUUIDs.push(uuid);
      if (i < referenceImageUrls.length - 1) {
        await new Promise(r => setTimeout(r, 400));
      }
    }
    
    console.log("✅ 所有图片上传完成！");
    console.log("  - 图片UUIDs:", imageUUIDs);
    
    // 步骤2: 获取视频生成专属 reCAPTCHA token
    console.log("🔐 获取视频生成 reCAPTCHA token...");
    const videoRecaptchaToken = await getRecaptchaToken("VIDEO_GENERATION");
    console.log("✅ 视频生成 reCAPTCHA token 获取成功");
    
    // 步骤3: 创建视频生成任务
    const duration = Number(config.duration || 8);
    const durationS = [4, 6, 8, 10].includes(duration) ? duration : 8;
    const isFirstLast = config.isFirstLast === true || config.videoMode === "start_end" || (imageUUIDs.length === 2 && config.videoMode === "i2v");
    
    console.log(`📤 创建视频生成任务... (模式: ${isFirstLast ? "首尾帧插值 nprQif" : "多图参考 MZZa6b"}, 时长: ${durationS}s)`);
    
    const uuid1 = generateUUID().toUpperCase();
    const uuid2 = generateUUID().toUpperCase();
    
    let rpcid = "MZZa6b";
    let modelName = `abra_r2v_${durationS}s`;
    let createPayloadArray;
    
    if (isFirstLast && imageUUIDs.length >= 2) {
      rpcid = "nprQif";
      modelName = `omni_flash_i2v_${durationS}s_first_last`;
      createPayloadArray = [
        [
          [
            [null, null, [[[prompt]]]],
            modelName,
            aspectRatioCode,
            null,
            [null, imageUUIDs[0], null, null, null, [null, null, 1, 1]],
            [null, imageUUIDs[1], null, null, null, [null, null, 1, 1]],
            [null, null, null, null, uuid1, uuid2]
          ]
        ],
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
    } else {
      rpcid = "MZZa6b";
      modelName = `abra_r2v_${durationS}s`;
      const imageReferences = imageUUIDs.map(uuid => [null, uuid]);
      createPayloadArray = [
        [
          [
            [
              null,
              null,
              [[[prompt]]]
            ],
            imageReferences,
            modelName,
            aspectRatioCode,
            null,
            [null, null, null, null, uuid1, uuid2]
          ]
        ],
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
    }
    
    console.log(`  - RPC: ${rpcid}, 模型: ${modelName}`);
    console.log("  - 横竖比例代码:", aspectRatioCode);
    console.log("  - UUID1:", uuid1);
    console.log("  - UUID2:", uuid2);
    console.log("  - 完整payload预览:", JSON.stringify(createPayloadArray).substring(0, 200) + "...");

    const createResponse = await sendBatchExecute(rpcid, createPayloadArray, params, projectId);
    
    console.log("📋 原始响应:", createResponse.substring(0, 500));
    
    const createParsed = parseBatchExecuteResponse(createResponse);
    
    if (!createParsed || createParsed.length === 0) {
      return { 
        ok: false, 
        error: "创建视频任务失败：响应为空",
        rawResponse: createResponse.substring(0, 1000)
      };
    }
    
    let mediaUUID = null;
    let foundRpcItem = false;
    let rpcErrorDetail = "";
    
    // 从响应中提取 mediaUUID
    for (const item of createParsed) {
      if (item && item[0] === "wrb.fr" && (item[1] === rpcid || item[1] === "MZZa6b" || item[1] === "nprQif")) {
        foundRpcItem = true;
        if (item[2]) {
          const responseStr = String(item[2]);
          try {
            const parsedData = JSON.parse(responseStr);
            if (Array.isArray(parsedData)) {
              if (typeof parsedData[0] === "string" && parsedData[0].length >= 32) {
                mediaUUID = parsedData[0];
              } else if (Array.isArray(parsedData[0]) && typeof parsedData[0][0] === "string" && parsedData[0][0].length >= 32) {
                mediaUUID = parsedData[0][0];
              }
            }
          } catch (_) {}

          if (!mediaUUID) {
            const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
            const allUUIDs = responseStr.match(uuidPattern);
            if (allUUIDs && allUUIDs.length >= 2) {
              mediaUUID = allUUIDs[1];
              console.log("✅ 成功提取视频媒体UUID (allUUIDs[1]):", mediaUUID);
              console.log("  - 找到的所有UUID:", allUUIDs.slice(0, 6));
            } else if (allUUIDs && allUUIDs.length === 1) {
              mediaUUID = allUUIDs[0];
              console.log("✅ 成功提取视频媒体UUID (allUUIDs[0]):", mediaUUID);
            }
          }
          if (mediaUUID) {
            console.log("✅ 成功提取视频媒体UUID:", mediaUUID);
          } else {
            rpcErrorDetail = responseStr.substring(0, 300);
          }
        } else {
          rpcErrorDetail = "item[2] is empty, item: " + JSON.stringify(item).substring(0, 300);
        }
        break;
      }
    }
    
    if (!mediaUUID) {
      const detail = rpcErrorDetail || (!foundRpcItem ? "MZZa6b RPC not found in response" : "");
      return { 
        ok: false, 
        error: `创建视频任务失败：无法提取媒体UUID${detail ? ` (${detail})` : ""}`,
        createParsed: JSON.stringify(createParsed).substring(0, 1000),
        rawResponse: String(createResponse || "").substring(0, 1000)
      };
    }
    
    console.log("✅ 多图生视频任务创建成功！");
    console.log("  - 媒体UUID:", mediaUUID);
    
    // 步骤4: 轮询任务状态 (rpcids: jwpduf & Zzl0ze fallback)
    console.log("⏳ 开始轮询任务状态...");
    
    const maxPolls = 80;
    const pollInterval = 5000;
    let pollCount = 0;
    let taskStatus = null;
    let isComplete = false;
    let videoUrl = null;
    
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
            if (responseStr.includes('"CAE"')) {
              isComplete = true;
              console.log("✅ 任务完成 (检测到 CAE 状态)！");
              break;
            }
            try {
              const data = JSON.parse(responseStr);
              if (data && data[2] && data[2][0]) {
                const record = data[2][0];
                if (record[3] === "CAE") {
                  isComplete = true;
                  console.log("✅ 任务完成 (record[3] === 'CAE')！");
                  break;
                }
                if (record[5] && record[5][8]) {
                  const statusInfo = record[5][8];
                  if (Array.isArray(statusInfo)) {
                    taskStatus = statusInfo[0];
                    if (taskStatus === 4 && statusInfo[1] && Array.isArray(statusInfo[1])) {
                      const errorCode = statusInfo[1][1] || "UNKNOWN_ERROR";
                      const errorDetails = statusInfo[2] ? statusInfo[2].join(", ") : "";
                      console.warn("⚠️ 状态返回告警:", errorCode, errorDetails);
                      if (!String(errorDetails).includes("Media not found") && !String(errorCode).includes("NOT_FOUND")) {
                        return {
                          ok: false,
                          error: `视频生成失败: ${errorCode} ${errorDetails}`,
                          errorCode,
                          errorDetails: statusInfo[2] || [],
                          mediaUUID,
                          pollCount
                        };
                      }
                    }
                  } else {
                    taskStatus = statusInfo;
                  }
                  
                  console.log("  - 当前状态:", taskStatus);
                  if (taskStatus === 3) {
                    isComplete = true;
                    console.log("✅ 任务完成 (状态码 3)！");
                    break;
                  }
                  if (taskStatus === 6) {
                    console.log("  - 任务处理中...");
                  }
                }
              }
            } catch (e) {
              console.warn("⚠️ 解析轮询响应失败:", e.message);
            }
          }
        }
      }
      
      // 每 3 次轮询主动检查一次项目媒体列表 (Zzl0ze) 和 as29s
      if (isComplete || pollCount % 3 === 0 || pollCount >= maxPolls - 2) {
        try {
          const urlResp = await sendBatchExecute("as29s", [mediaUUID], params, projectId);
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
        
        const urlPayloadArray = [mediaUUID];
        const urlResponse = await sendBatchExecute("as29s", urlPayloadArray, params, projectId);
        
        const parsed = extractVideoUrl(urlResponse);
        if (parsed.videoUrl) {
          videoUrl = parsed.videoUrl;
          console.log("✅ 视频地址获取成功！");
          console.log("🎬 视频地址:", videoUrl);
          break;
        }

        try {
          const listPayload = [`projects/${projectId}`, null, null, null, [1]];
          const listResp = await sendBatchExecute("Zzl0ze", listPayload, params, projectId);
          const start = listResp.indexOf(mediaUUID);
          if (start !== -1) {
            const snippet = listResp.slice(start, start + 800);
            const m = snippet.match(/null,null,\\?"([0-9a-fA-F-]{36})\\?"/);
            if (m && m[1]) {
              const realMediaId = m[1];
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
    
    const elapsedMs = Date.now() - startTime;
    
    return {
      ok: true,
      message: "多图生视频任务完成",
      elapsedMs,
      elapsedFormatted: `${Math.floor(elapsedMs / 1000)}秒`,
      input: { 
        prompt,
        referenceImageCount: referenceImageUrls.length,
        referenceImageUrls,
        aspectRatio,
        aspectRatioCode
      },
      result: {
        projectId,
        imageUUIDs,
        mediaUUID,
        videoUrl,
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
