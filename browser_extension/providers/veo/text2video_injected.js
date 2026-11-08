/*
runGeneratedTest(config) parameter contract:
The JSON in the Test Config box is passed as config. Keep this list even when some fields are unused.
- config.prompt: string - 文生视频的提示词
- config.aspectRatio: string - 视频比例，"16:9" 横版 或 "9:16" 竖版，默认 "16:9"
- config.modelKey: string - Flow videoModelKey (默认 "macaron_cookie_t2v_10s")
- config.outputResolution: string - "VIDEO_RESOLUTION_720P" | "VIDEO_RESOLUTION_360P"
- config.wantUpsample: boolean - 是否执行 1080p / 4K 放大
- config.upsampleResolution: string - "VIDEO_RESOLUTION_1080P" | "VIDEO_RESOLUTION_4K"
- config.upsamplerKey: string - "veo_3_1_upsampler_1080p" | "veo_3_1_upsampler_4k"
*/

async function runGeneratedTest(config) {
  const startTime = Date.now();
  
  const prompt = String(config.prompt || "").trim();
  const aspectRatio = String(config.aspectRatio || "16:9").trim();
  
  if (!prompt) {
    return { ok: false, error: "缺少必需参数: config.prompt" };
  }
  
  // 将比例转换为 API 参数值
  // 2 = 横版 (16:9)
  // 1 = 竖版 (9:16)
  let aspectRatioValue;
  if (aspectRatio === "9:16" || aspectRatio === "竖版" || aspectRatio === "vertical") {
    aspectRatioValue = 1;
  } else if (aspectRatio === "16:9" || aspectRatio === "横版" || aspectRatio === "horizontal") {
    aspectRatioValue = 2;
  } else {
    return { 
      ok: false, 
      error: `不支持的视频比例: ${aspectRatio}，请使用 "16:9" 或 "9:16"` 
    };
  }
  
  let activeModelKey = String(config.modelKey || "macaron_cookie_t2v_10s").trim() || "macaron_cookie_t2v_10s";
  const outputResolution = String(config.outputResolution || "VIDEO_RESOLUTION_720P").trim();
  const is360p = activeModelKey.endsWith("_360p") || /360P/i.test(outputResolution);
  const outputSpec = is360p ? [4] : null;

  console.log("🚀 开始文生视频测试");
  console.log("  - 提示词:", prompt);
  console.log("  - 模型Key:", activeModelKey);
  console.log("  - 视频比例:", aspectRatio, `(参数值: ${aspectRatioValue})`);
  
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
    const match = decoded.match(/https:\/\/flow-content\.google\/video\/[0-9a-zA-Z_-]+\?[^\s"'\\\]]+/i);
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
    let workflowUUID = null;
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
                const wfCandidate = parsedData?.[2]?.[0]?.[0];
                if (typeof wfCandidate === "string" && wfCandidate.length >= 32 && !excludeSet.has(wfCandidate.toLowerCase())) {
                  workflowUUID = wfCandidate;
                }
                const mediaCandidate = parsedData?.[3]?.[0]?.[0] || parsedData?.[2]?.[0]?.[3]?.[4];
                if (typeof mediaCandidate === "string" && mediaCandidate.length >= 32 && !excludeSet.has(mediaCandidate.toLowerCase())) {
                  mediaUUID = mediaCandidate;
                } else if (typeof parsedData[0] === "string" && parsedData[0].length >= 32 && !excludeSet.has(parsedData[0].toLowerCase())) {
                  mediaUUID = parsedData[0];
                } else if (Array.isArray(parsedData[0]) && typeof parsedData[0][0] === "string" && parsedData[0][0].length >= 32 && !excludeSet.has(parsedData[0][0].toLowerCase())) {
                  mediaUUID = parsedData[0][0];
                }
              }
            } catch (_) {}

            if (!mediaUUID) {
              const upsampledMatch = responseStr.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_upsampled/i);
              if (upsampledMatch && !excludeSet.has(upsampledMatch[0].toLowerCase())) {
                mediaUUID = upsampledMatch[0];
              }
            }

            if (!mediaUUID) {
              const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
              const rawMatches = responseStr.match(uuidPattern) || [];
              const filteredUUIDs = rawMatches.filter(u => !excludeSet.has(u.toLowerCase()));
              if (!workflowUUID && rawMatches.length >= 1 && !excludeSet.has(rawMatches[0].toLowerCase())) {
                workflowUUID = rawMatches[0];
              }
              if (rawMatches.length >= 2 && !excludeSet.has(rawMatches[1].toLowerCase())) {
                mediaUUID = rawMatches[1];
                console.log(`✅ 成功提取媒体UUID (${targetRpcId} allUUIDs[1]):`, mediaUUID);
              } else if (filteredUUIDs.length >= 1) {
                mediaUUID = filteredUUIDs[0];
                console.log(`✅ 成功提取媒体UUID (${targetRpcId} filtered[0]):`, mediaUUID);
              }
            }
            if (mediaUUID) {
              console.log(`✅ 成功提取媒体UUID (${targetRpcId}):`, mediaUUID);
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
    return { mediaUUID, workflowUUID, foundRpcItem, rpcErrorDetail };
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
    
    // 步骤1 & 2: 获取 recaptcha token 并创建文生视频任务 (rpcids: YhhmEf)，支持 _relaxed 降级重试
    async function submitCreateTask(modelKeyToUse) {
      console.log("🔐 获取 reCAPTCHA token...");
      const recaptchaToken = await getRecaptchaToken("VIDEO_GENERATION");
      console.log("✅ reCAPTCHA token 获取成功");
      console.log(`📤 创建文生视频任务 (modelKey: ${modelKeyToUse})...`);
      const uuid1 = generateUUID().toUpperCase();
      const uuid2 = generateUUID().toUpperCase();
      const createPayloadArray = [
        [
          [
            [
              null,
              null,
              [[[prompt]]]
            ],
            modelKeyToUse,
            aspectRatioValue,
            null,
            [null, null, null, null, uuid1, uuid2],
            null,
            null,
            outputSpec
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
          [recaptchaToken, 1]
        ],
        [uuid2, 2]
      ];
      const createResponse = await sendBatchExecute("YhhmEf", createPayloadArray, params, projectId);
      const createParsed = parseBatchExecuteResponse(createResponse);
      const extracted = extractMediaUUIDFromRpcResponse(createParsed, "YhhmEf", [projectId]);
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

    const { createResponse, createParsed, mediaUUID, workflowUUID, foundRpcItem, rpcErrorDetail } = subResult;

    if (!createParsed || createParsed.length === 0) {
      return { 
        ok: false, 
        error: "创建视频任务失败：响应为空",
        rawResponse: String(createResponse || "").substring(0, 1000)
      };
    }
    
    if (!mediaUUID) {
      const detail = rpcErrorDetail || (!foundRpcItem ? "YhhmEf RPC not found in response" : "");
      return { 
        ok: false, 
        error: `创建视频任务失败：无法提取媒体UUID${detail ? ` (${detail})` : ""}`,
        createParsed: JSON.stringify(createParsed).substring(0, 1000),
        rawResponse: String(createResponse || "").substring(0, 1000)
      };
    }
    
    console.log("✅ 视频任务创建成功！");
    console.log("  - 媒体UUID:", mediaUUID);
    if (workflowUUID) console.log("  - 工作流UUID:", workflowUUID);
    
    // 步骤3: 轮询任务状态 (rpcids: jwpduf & Zzl0ze fallback)
    console.log("⏳ 开始轮询任务状态...");
    
    const pollInterval = Math.max(1000, (Number(config.pollIntervalSeconds) || 5) * 1000);
    const maxWaitSeconds = Math.max(60, Number(config.maxWaitSeconds) || 600);
    const maxPolls = Math.max(12, Math.ceil((maxWaitSeconds * 1000) / pollInterval));
    let pollCount = 0;
    let taskStatus = null;
    let isComplete = false;
    let videoUrl = null;
    let resolvedMediaId = mediaUUID;
    let resolvedWorkflowId = workflowUUID || null;
    const uuidExactRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    while (pollCount < maxPolls && !isComplete) {
      pollCount++;
      console.log(`🔄 轮询第 ${pollCount}/${maxPolls} 次...`);
      
      // jwpduf 请求格式: [null, null, [[resolvedMediaId]]]
      const pollPayloadArray = [null, null, [[resolvedMediaId]]];
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
                if (typeof record[0] === "string" && record[0].length >= 32) {
                  resolvedMediaId = record[0];
                }
                if (typeof record[2] === "string" && uuidExactRegex.test(record[2])) {
                  resolvedWorkflowId = record[2];
                }
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
            if (!isComplete && responseStr.includes('"CAE"')) {
              isComplete = true;
              console.log("✅ 任务完成 (检测到 CAE 状态)！");
              break;
            }
          }
        }
      }
      
      // 每 3 次轮询主动检查一次 as29s 和项目媒体列表 (Zzl0ze)
      if (isComplete || pollCount % 3 === 0 || pollCount >= maxPolls - 2) {
        try {
          const urlResp = await sendBatchExecute("as29s", [resolvedMediaId], params, projectId);
          try {
            const asLines = parseBatchExecuteResponse(urlResp);
            const asRpc = Array.isArray(asLines) && asLines.find(it => Array.isArray(it) && it[0] === "wrb.fr" && it[1] === "as29s" && it[2]);
            if (asRpc) {
              const asData = JSON.parse(asRpc[2]);
              if (typeof asData?.[0] === "string" && asData[0].length >= 32) resolvedMediaId = asData[0];
              if (typeof asData?.[2] === "string" && uuidExactRegex.test(asData[2])) resolvedWorkflowId = asData[2];
            }
          } catch (_) {}
          const parsed = extractVideoUrl(urlResp);
          if (parsed && parsed.videoUrl) {
            videoUrl = parsed.videoUrl;
            isComplete = true;
            console.log("✅ 直接通过 as29s 获取到视频地址:", videoUrl);
            break;
          }
        } catch (_) {}

        try {
          const listPayload = [`projects/${projectId}`, null, null, null, [0]];
          const listResp = await sendBatchExecute("Zzl0ze", listPayload, params, projectId);
          const listParsed = parseBatchExecuteResponse(listResp);
          const zRpc = Array.isArray(listParsed) && listParsed.find(it => Array.isArray(it) && it[0] === "wrb.fr" && it[1] === "Zzl0ze" && it[2]);
          if (zRpc) {
            const zData = JSON.parse(zRpc[2]);
            const zItems = Array.isArray(zData?.[1]) ? zData[1] : [];
            for (const zItem of zItems) {
              const wfId = zItem?.[0];
              const mId = zItem?.[3]?.[4];
              if (wfId === mediaUUID || mId === mediaUUID || (resolvedWorkflowId && wfId === resolvedWorkflowId)) {
                if (typeof wfId === "string" && uuidExactRegex.test(wfId)) resolvedWorkflowId = wfId;
                if (typeof mId === "string" && mId.length >= 32) {
                  resolvedMediaId = mId;
                  const realUrlResp = await sendBatchExecute("as29s", [resolvedMediaId], params, projectId);
                  const realParsed = extractVideoUrl(realUrlResp);
                  if (realParsed && realParsed.videoUrl) {
                    videoUrl = realParsed.videoUrl;
                    isComplete = true;
                    console.log("✅ 视频地址获取成功 (via Zzl0ze realMediaId)！");
                  }
                }
                break;
              }
            }
          }
          if (isComplete && videoUrl) break;
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
    
    // 步骤4 & 5: 获取视频URL (如果轮询中未提前拿到)
    if (!videoUrl) {
      console.log("⏳ 等待视频地址准备...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log("🎬 获取视频URL...");
      
      const maxUrlAttempts = 4;
      for (let attempt = 1; attempt <= maxUrlAttempts; attempt++) {
        console.log(`🔍 正在读取视频地址，第 ${attempt}/${maxUrlAttempts} 次`);
        
        const urlPayloadArray = [resolvedMediaId];
        const urlResponse = await sendBatchExecute("as29s", urlPayloadArray, params, projectId);
        try {
          const asLines = parseBatchExecuteResponse(urlResponse);
          const asRpc = Array.isArray(asLines) && asLines.find(it => Array.isArray(it) && it[0] === "wrb.fr" && it[1] === "as29s" && it[2]);
          if (asRpc) {
            const asData = JSON.parse(asRpc[2]);
            if (typeof asData?.[0] === "string" && asData[0].length >= 32) resolvedMediaId = asData[0];
            if (typeof asData?.[2] === "string" && uuidExactRegex.test(asData[2])) resolvedWorkflowId = asData[2];
          }
        } catch (_) {}
        
        const parsed = extractVideoUrl(urlResponse);
        if (parsed.videoUrl) {
          videoUrl = parsed.videoUrl;
          console.log("✅ 视频地址获取成功！");
          console.log("🎬 视频地址:", videoUrl);
          break;
        }

        try {
          const listPayload = [`projects/${projectId}`, null, null, null, [0]];
          const listResp = await sendBatchExecute("Zzl0ze", listPayload, params, projectId);
          const listParsed = parseBatchExecuteResponse(listResp);
          const zRpc = Array.isArray(listParsed) && listParsed.find(it => Array.isArray(it) && it[0] === "wrb.fr" && it[1] === "Zzl0ze" && it[2]);
          if (zRpc) {
            const zData = JSON.parse(zRpc[2]);
            const zItems = Array.isArray(zData?.[1]) ? zData[1] : [];
            for (const zItem of zItems) {
              const wfId = zItem?.[0];
              const mId = zItem?.[3]?.[4];
              if (wfId === mediaUUID || mId === mediaUUID || (resolvedWorkflowId && wfId === resolvedWorkflowId)) {
                if (typeof wfId === "string" && uuidExactRegex.test(wfId)) resolvedWorkflowId = wfId;
                if (typeof mId === "string" && mId.length >= 32) {
                  resolvedMediaId = mId;
                  const realUrlResp = await sendBatchExecute("as29s", [resolvedMediaId], params, projectId);
                  const realParsed = extractVideoUrl(realUrlResp);
                  if (realParsed && realParsed.videoUrl) {
                    videoUrl = realParsed.videoUrl;
                    console.log("✅ 视频地址获取成功 (via realMediaId)！");
                  }
                }
                break;
              }
            }
          }
          if (videoUrl) break;
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

    // 步骤6: Flow 原生视频超分放大 (p0UkFb) 支持 1080p / 4K
    const wantUpsample = Boolean(config.wantUpsample) || /1080|4K/i.test(String(config.upsampleResolution || ""));
    let originVideoUrl = null;
    let upsampleOk = undefined;
    let upsampleError = undefined;
    let upsampleMediaUUID = null;
    let upsampleResolutionLabel = String(config.upsampleResolution || "").trim();

    if (wantUpsample) {
      try {
        if (!resolvedWorkflowId) {
          try {
            const urlResp = await sendBatchExecute("as29s", [resolvedMediaId], params, projectId);
            const asLines = parseBatchExecuteResponse(urlResp);
            const asRpc = Array.isArray(asLines) && asLines.find(it => Array.isArray(it) && it[0] === "wrb.fr" && it[1] === "as29s" && it[2]);
            if (asRpc) {
              const asData = JSON.parse(asRpc[2]);
              if (typeof asData?.[0] === "string" && asData[0].length >= 32) resolvedMediaId = asData[0];
              if (typeof asData?.[2] === "string" && uuidExactRegex.test(asData[2])) resolvedWorkflowId = asData[2];
            }
          } catch (_) {}
        }

        const is4K = /4K/i.test(String(config.upsampleResolution || "")) || /4k/i.test(String(config.upsamplerKey || ""));
        // In boq_labs-ai-sandbox-frontend_20261105.10_p0: 1=720p, 2=1080p, 3=4K, 4=360p
        const resolutionValue = is4K ? 3 : 2;
        const upsamplerModelKey = String(config.upsamplerKey || "").trim() || (is4K ? "veo_3_1_upsampler_4k" : "veo_3_1_upsampler_1080p");
        if (!upsampleResolutionLabel) {
          upsampleResolutionLabel = is4K ? "VIDEO_RESOLUTION_4K" : "VIDEO_RESOLUTION_1080P";
        }

        console.log(`🚀 开始视频放大 (p0UkFb): target=${upsampleResolutionLabel}, model=${upsamplerModelKey}, mediaId=${resolvedMediaId}, workflowId=${resolvedWorkflowId}`);
        const upsampleRecaptchaToken = await getRecaptchaToken("VIDEO_GENERATION");
        const upUuid1 = generateUUID().toUpperCase();
        const upUuid2 = generateUUID().toUpperCase();

        const upsampleDestination = resolvedWorkflowId
          ? [null, resolvedWorkflowId, null, null, upUuid1]
          : [null, null, null, null, upUuid1, upUuid2];

        const upsampleReq = [
          [null, resolvedMediaId],
          null,
          aspectRatioValue,
          null,
          upsampleDestination,
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
          resolvedWorkflowId ? [upUuid2] : [upUuid2, 2]
        ];

        const upsampleResponse = await sendBatchExecute("p0UkFb", upsamplePayloadArray, params, projectId);
        const directExtract = extractVideoUrl(upsampleResponse);
        let upsampledVideoUrl = directExtract.videoUrl || null;

        if (!upsampledVideoUrl) {
          const upsampleParsed = parseBatchExecuteResponse(upsampleResponse);
          const upExtracted = extractMediaUUIDFromRpcResponse(
            upsampleParsed,
            "p0UkFb",
            [projectId, resolvedMediaId, mediaUUID, resolvedWorkflowId, upUuid1, upUuid2]
          );
          upsampleMediaUUID = upExtracted.mediaUUID || `${resolvedMediaId}_upsampled`;

          console.log("✅ 放大任务创建成功, upsampleMediaUUID:", upsampleMediaUUID);
          let upPollCount = 0;
          let upComplete = false;
          let resolvedUpsampleMediaId = upsampleMediaUUID;

          while (upPollCount < maxPolls && !upComplete) {
            upPollCount++;
            console.log(`🔄 放大轮询第 ${upPollCount}/${maxPolls} 次...`);
            const upPollResp = await sendBatchExecute("jwpduf", [null, null, [[resolvedUpsampleMediaId]]], params, projectId);
            const upPollParsed = parseBatchExecuteResponse(upPollResp);

            if (upPollParsed && upPollParsed.length > 0) {
              for (const item of upPollParsed) {
                if (item && item[0] === "wrb.fr" && item[1] === "jwpduf" && item[2]) {
                  const responseStr = String(item[2]);
                  try {
                    const data = JSON.parse(responseStr);
                    if (data && data[2] && data[2][0]) {
                      const record = data[2][0];
                      if (typeof record[0] === "string" && record[0].length >= 32) {
                        resolvedUpsampleMediaId = record[0];
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
      message: "文生视频任务完成",
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
        modelKey: activeModelKey,
        outputResolution,
        aspectRatio,
        aspectRatioValue,
        wantUpsample,
        upsampleResolution: upsampleResolutionLabel || undefined
      },
      result: {
        projectId,
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
