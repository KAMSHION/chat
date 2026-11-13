import { countDisplayWidth } from '../../display-width.mjs';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const db = env.DB;

  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const isModeratorRole = role => ['super_admin', 'admin', 'ai_admin'].includes(role);
  const reportableMessage = async (messageId, reporterId) => {
    const message = await db.prepare(`
      SELECT id, user_id, display_name, text
      FROM messages
      WHERE id = ? AND user_id != 0
    `).bind(messageId).first();
    if (!message) return { error: json({ error: '举报的消息不存在或已过期' }, 404) };
    if (Number(message.user_id) === Number(reporterId)) return { error: json({ error: '不能举报自己的消息' }, 400) };
    let messageText = message.text;
    try {
      const payload = JSON.parse(message.text);
      if (payload?.type === 'chat_quote_v1' && typeof payload.text === 'string') {
        messageText = payload.text;
      }
    } catch {
      // Older messages are stored as plain text.
    }
    return { message, messageText };
  };
  async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  try {
    if (action === 'register') {
      const { account, display_name, password } = await request.json();
      const normalizedAccount = typeof account === 'string' ? account.trim() : '';
      const displayName = typeof display_name === 'string' ? display_name.trim() : '';
      if (!normalizedAccount || !displayName || typeof password !== 'string' || !password) return json({ error: '账户名、用户名和密码不能为空' }, 400);
      if (normalizedAccount.length > 30 || countDisplayWidth(displayName) > 24) return json({ error: '账户名最多30个字符，昵称长度不能超过24（半角1，全角2）' }, 400);
      if (!/^[A-Za-z0-9_$]+$/.test(normalizedAccount)) return json({ error: '账户名只能包含大小写英文字母、数字、下划线和美元符号（$）' }, 400);
      const count = await db.prepare("SELECT COUNT(*) as c FROM users").first();
      if (count.c >= 100) return json({ error: '注册名额已满(100人)' }, 403);
      const salt = crypto.randomUUID();
      const hash = await hashPassword(password, salt);
      try {
        await db.prepare("INSERT INTO users (account, display_name, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, 'user', ?)").bind(normalizedAccount, displayName, hash, salt, Date.now()).run();
        return json({ success: true });
      } catch (error) {
        if (error.message?.includes('UNIQUE constraint failed: users.account')) {
          return json({ error: '账户名已存在' }, 400);
        }
        throw error;
      }
    }

    if (action === 'login') {
      const { account, password } = await request.json();
      const normalizedAccount = typeof account === 'string' ? account.trim() : '';
      if (!normalizedAccount || !/^[A-Za-z0-9_$]+$/.test(normalizedAccount) || typeof password !== 'string' || !password) return json({ error: '账户名或密码错误' }, 401);
      const user = await db.prepare("SELECT * FROM users WHERE account = ?").bind(normalizedAccount).first();
      if (!user) return json({ error: '账户名或密码错误' }, 401);
      const hash = await hashPassword(password, user.salt);
      if (hash !== user.password_hash) return json({ error: '账户名或密码错误' }, 401);
      const sessionId = crypto.randomUUID();
      await db.prepare("INSERT INTO sessions (session_id, user_id, role, last_seen) VALUES (?, ?, ?, ?)").bind(sessionId, user.id, user.role, Date.now()).run();
      return new Response(JSON.stringify({ success: true, account: user.account, displayName: user.display_name, userId: user.id, role: user.role }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax` }
      });
    }

    const cookie = request.headers.get('Cookie') || '';
    const sessionId = cookie.match(/session=([^;]+)/)?.[1];
    if (!sessionId) return json({ error: '未登录' }, 401);
    const session = await db.prepare("SELECT * FROM sessions WHERE session_id = ?").bind(sessionId).first();
    if (!session) return json({ error: '会话已过期，请重新登录' }, 401);

    if (action === 'logout') {
      await db.prepare("DELETE FROM sessions WHERE session_id = ?").bind(sessionId).run();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
        }
      });
    }

    if (action === 'changePassword') {
      const { current_password, new_password } = await request.json();
      if (typeof current_password !== 'string' || !current_password || typeof new_password !== 'string' || !new_password) {
        return json({ error: '请完整填写当前密码和新密码' }, 400);
      }
      if (new_password.length > 128) return json({ error: '新密码不能超过128个字符' }, 400);
      const user = await db.prepare("SELECT id, password_hash, salt FROM users WHERE id = ?").bind(session.user_id).first();
      if (!user) return json({ error: '用户不存在' }, 404);
      const currentHash = await hashPassword(current_password, user.salt);
      if (currentHash !== user.password_hash) return json({ error: '当前密码不正确' }, 403);
      const newSalt = crypto.randomUUID();
      const newHash = await hashPassword(new_password, newSalt);
      await db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").bind(newHash, newSalt, user.id).run();
      return json({ success: true });
    }

    if (action === 'heartbeat') {
      await db.prepare("UPDATE sessions SET last_seen = ? WHERE session_id = ?").bind(Date.now(), sessionId).run();
      await db.prepare("DELETE FROM sessions WHERE last_seen < ?").bind(Date.now() - 90000).run();
      return json({ success: true });
    }

    // 获取所有用户（用于渲染头像）
    if (action === 'getUsers') {
      const onlineSince = Date.now() - 90000;
      const { results } = await db.prepare(`
        SELECT users.id, users.account, users.display_name, users.avatar_base64, users.role,
          (SELECT muted_until FROM user_mutes WHERE user_id = users.id) AS muted_until,
          EXISTS(
            SELECT 1 FROM sessions
            WHERE sessions.user_id = users.id AND sessions.last_seen > ?
          ) AS is_online
        FROM users
        ORDER BY CASE users.role
          WHEN 'super_admin' THEN 0
          WHEN 'admin' THEN 1
          WHEN 'ai_admin' THEN 1
          WHEN 'ai' THEN 2
          ELSE 3
        END, users.display_name COLLATE NOCASE
      `).bind(onlineSince).all();
      const online = await db.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM sessions WHERE last_seen > ?").bind(onlineSince).first();
      return json({ users: results, onlineCount: online.count });
    }

    if (action === 'getPresence') {
      const onlineSince = Date.now() - 90000;
      const { results } = await db.prepare(`
        SELECT users.id,
          users.role,
          EXISTS(
            SELECT 1 FROM sessions
            WHERE sessions.user_id = users.id AND sessions.last_seen > ?
          ) AS is_online
        FROM users
      `).bind(onlineSince).all();
      const online = await db.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM sessions WHERE last_seen > ?").bind(onlineSince).first();
      return json({ users: results, onlineCount: online.count });
    }

    if (action === 'getPendingReports') {
      const currentUser = await db.prepare("SELECT role FROM users WHERE id = ?").bind(session.user_id).first();
      if (!currentUser || !isModeratorRole(currentUser.role)) return json({ error: '没有举报审核权限' }, 403);
      const { results } = await db.prepare(`
        SELECT reports.id, reports.reporter_id, reports.reported_user_id,
          reports.message_id, reports.reason, reports.message_text, reports.created_at,
          reporter.display_name AS reporter_name, reported.display_name AS reported_name
        FROM reports
        LEFT JOIN users AS reporter ON reporter.id = reports.reporter_id
        LEFT JOIN users AS reported ON reported.id = reports.reported_user_id
        WHERE reports.status = 'pending'
          AND reports.review_type = 'manual'
          AND reports.reviewer_id = ?
        ORDER BY reports.created_at ASC
        LIMIT 100
      `).bind(session.user_id).all();
      return json({ reports: results });
    }

    if (action === 'submitReport') {
      const { message_id, reviewer_id, reason } = await request.json();
      const messageId = Number(message_id);
      const reviewerId = Number(reviewer_id);
      const reportReason = typeof reason === 'string' ? reason.trim() : '';
      if (!Number.isSafeInteger(messageId) || messageId <= 0) return json({ error: '举报的消息无效' }, 400);
      if (!Number.isSafeInteger(reviewerId) || reviewerId <= 0) return json({ error: '请选择审核员' }, 400);
      if (!reportReason || reportReason.length > 500) return json({ error: '举报理由不能为空且不能超过500个字符' }, 400);
      const reviewer = await db.prepare("SELECT id, role FROM users WHERE id = ?").bind(reviewerId).first();
      if (!reviewer || !isModeratorRole(reviewer.role)) return json({ error: '所选审核员无效' }, 400);
      const reported = await reportableMessage(messageId, session.user_id);
      if (reported.error) return reported.error;
      const createdAt = Date.now();
      const inserted = await db.prepare(`
        INSERT INTO reports (
          reporter_id, reported_user_id, message_id, reviewer_id, review_type,
          status, reason, message_text, created_at
        ) VALUES (?, ?, ?, ?, 'manual', 'pending', ?, ?, ?)
        RETURNING id
      `).bind(
        session.user_id,
        reported.message.user_id,
        reported.message.id,
        reviewerId,
        reportReason,
        reported.messageText,
        createdAt
      ).first();
      return json({ success: true, reportId: inserted.id });
    }

    if (action === 'chatWithAi') {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ error: '星火AI请求无效，请检查输入内容。' }, 400);
      }

      if (!Array.isArray(payload?.messages) || payload.messages.length === 0) {
        return json({ error: '星火AI请求无效，请检查输入内容。' }, 400);
      }
      const messages = [];
      for (const message of payload.messages) {
        if (
          !message ||
          !['user', 'assistant'].includes(message.role) ||
          typeof message.content !== 'string' ||
          !message.content.trim()
        ) {
          return json({ error: '星火AI请求无效，请检查输入内容。' }, 400);
        }
        messages.push({ role: message.role, content: message.content });
      }
      if (messages[messages.length - 1].role !== 'user') {
        return json({ error: '星火AI请求无效，请检查输入内容。' }, 400);
      }

      let thinkingMode = payload.thinking;
      if (thinkingMode === undefined || thinkingMode === false) {
        thinkingMode = 'disabled';
      } else if (thinkingMode === true) {
        thinkingMode = 'enabled';
      }
      if (
        typeof thinkingMode !== 'string' ||
        !['disabled', 'auto', 'enabled'].includes(thinkingMode)
      ) {
        return json({ error: '星火AI请求无效，请检查输入内容。' }, 400);
      }

      const apiKey = typeof env.XFYUN_API_KEY === 'string' ? env.XFYUN_API_KEY.trim() : '';
      if (!apiKey) return json({ error: '讯飞星火服务尚未配置，请联系网站管理员。' }, 503);
      const model = 'spark-x2.5-1.7b';

      const requestBody = {
        model,
        messages,
        stream: false,
        thinking: { type: thinkingMode }
      };
      if (payload.webSearch === true) {
        requestBody.tools = [{ type: 'web_search', web_search: { enable: true } }];
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);
      let providerResponse;
      try {
        providerResponse = await fetch('https://maas-api.cn-huabei-1.xf-yun.com/v2/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
      } catch (error) {
        clearTimeout(timeoutId);
        if (error?.name === 'AbortError') {
          return json({ error: '星火AI服务响应超时，请稍后重试。' }, 504);
        }
        console.error('讯飞星火 API 连接失败：', error?.name || 'NetworkError');
        return json({ error: '星火AI请求失败，请联系管理员检查服务配置。' }, 502);
      }

      if (!providerResponse.ok) {
        clearTimeout(timeoutId);
        console.error('讯飞星火 API 返回错误状态：', providerResponse.status);
        return json({ error: '星火AI请求失败，请联系管理员检查服务配置。' }, 502);
      }
      let providerPayload;
      try {
        providerPayload = await providerResponse.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error?.name === 'AbortError') {
          return json({ error: '星火AI服务响应超时，请稍后重试。' }, 504);
        }
        return json({ error: '讯飞星火服务返回了无效响应，请稍后重试。' }, 502);
      }
      clearTimeout(timeoutId);
      const reply = providerPayload?.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) {
        console.error('讯飞星火 API 返回了无法识别的响应。');
        return json({ error: '讯飞星火服务返回了无效响应，请稍后重试。' }, 502);
      }
      const reasoning = providerPayload?.choices?.[0]?.message?.reasoning_content;
      return json({
        reply,
        ...(thinkingMode !== 'disabled' && typeof reasoning === 'string' && reasoning.trim() ? { reasoning } : {})
      });
    }

    if (action === 'chatWithWorkersAi') {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ error: 'Workers AI 请求无效，请检查输入内容。' }, 400);
      }

      if (!Array.isArray(payload?.messages) || payload.messages.length === 0) {
        return json({ error: 'Workers AI 请求无效，请检查输入内容。' }, 400);
      }
      const messages = [];
      for (const message of payload.messages) {
        if (
          !message ||
          !['user', 'assistant'].includes(message.role) ||
          typeof message.content !== 'string' ||
          !message.content.trim()
        ) {
          return json({ error: 'Workers AI 请求无效，请检查输入内容。' }, 400);
        }
        messages.push({ role: message.role, content: message.content });
      }
      if (messages[messages.length - 1].role !== 'user') {
        return json({ error: 'Workers AI 请求无效，请检查输入内容。' }, 400);
      }
      const accountId = typeof env.CLOUDFLARE_ACCOUNT_ID === 'string' ? env.CLOUDFLARE_ACCOUNT_ID.trim() : '';
      const apiToken = typeof env.CLOUDFLARE_API_TOKEN === 'string' ? env.CLOUDFLARE_API_TOKEN.trim() : '';
      if (!/^[a-f0-9]{32}$/i.test(accountId) || !apiToken) {
        return json({ error: 'Workers AI 服务尚未配置，请联系网站管理员。' }, 503);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);
      let providerResponse;
      try {
        providerResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/meta/llama-3.2-1b-instruct`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages }),
            signal: controller.signal
          }
        );
      } catch (error) {
        clearTimeout(timeoutId);
        if (error?.name === 'AbortError') {
          return json({ error: 'Workers AI 服务响应超时，请稍后重试。' }, 504);
        }
        console.error('Cloudflare Workers AI API 连接失败：', error?.name || 'NetworkError');
        return json({ error: 'Workers AI 请求失败，请稍后重试。' }, 502);
      }
      let providerPayload;
      try {
        providerPayload = await providerResponse.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error?.name === 'AbortError') {
          return json({ error: 'Workers AI 服务响应超时，请稍后重试。' }, 504);
        }
        console.error('Cloudflare Workers AI API 返回了无法解析的响应：', providerResponse.status);
        return json({ error: 'Workers AI 返回了无效响应，请稍后重试。' }, 502);
      }
      clearTimeout(timeoutId);
      if (!providerResponse.ok || providerPayload?.success !== true) {
        console.error('Cloudflare Workers AI API 返回错误状态：', providerResponse.status);
        return json({ error: 'Workers AI 请求失败，请稍后重试。' }, 502);
      }
      const reply = providerPayload?.result?.response;
      if (typeof reply !== 'string' || !reply.trim()) {
        console.error('Cloudflare Workers AI API 返回了无法识别的响应。');
        return json({ error: 'Workers AI 返回了无效响应，请稍后重试。' }, 502);
      }
      return json({ reply });
    }

    if (action === 'submitAiReport') {
      const { message_id, provider } = await request.json();
      const messageId = Number(message_id);
      if (!Number.isSafeInteger(messageId) || messageId <= 0) return json({ error: '举报的消息无效' }, 400);
      if (!['content-moderation', 'text-censor', 'uapis-profanity'].includes(provider)) return json({ error: 'AI审核接口无效' }, 400);
      const reported = await reportableMessage(messageId, session.user_id);
      if (reported.error) return reported.error;
      if (reported.messageText.length === 0 || reported.messageText.length > 5000) return json({ error: '消息长度不符合AI审核接口要求' }, 400);
      if (provider !== 'uapis-profanity' && !env.APIZERO_API_KEY) return json({ error: 'AI审核服务尚未配置，请联系网站管理员' }, 503);

      const endpoint = provider === 'uapis-profanity'
        ? 'https://uapis.cn/api/v1/text/profanitycheck'
        : provider === 'content-moderation'
          ? 'https://v1.apizero.cn/api/content-moderation'
          : 'https://v1.apizero.cn/api/text-censor';
      const requestBody = provider === 'content-moderation'
        ? { action: 'moderate', text: reported.messageText, mask: false }
        : { text: reported.messageText };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20_000);
      let providerResponse;
      try {
        providerResponse = await fetch(endpoint, {
          method: 'POST',
          headers: provider === 'uapis-profanity'
            ? { 'Content-Type': 'application/json' }
            : {
            'Authorization': `Bearer ${env.APIZERO_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
      } catch (error) {
        if (error?.name === 'AbortError') {
          return json({ error: 'AI审核服务响应超时，请稍后重试' }, 504);
        }
        return json({ error: '无法连接AI审核服务，请稍后重试' }, 502);
      } finally {
        clearTimeout(timeoutId);
      }
      if (!providerResponse.ok) return json({ error: 'AI审核服务暂时不可用，请稍后重试' }, 502);
      let providerPayload;
      try {
        providerPayload = await providerResponse.json();
      } catch {
        return json({ error: 'AI审核服务返回了无效响应，请稍后重试' }, 502);
      }
      if (!providerPayload || typeof providerPayload !== 'object') {
        return json({ error: 'AI审核服务返回了无效响应' }, 502);
      }
      if (provider === 'uapis-profanity') {
        if (
          typeof providerPayload.status !== 'string' ||
          !providerPayload.status.trim() ||
          !Array.isArray(providerPayload.forbidden_words) ||
          providerPayload.forbidden_words.length > 100 ||
          !providerPayload.forbidden_words.every(word => typeof word === 'string' && word.trim() && word.length <= 160)
        ) {
          return json({ error: providerPayload.message || 'AI审核服务返回了无法识别的结果' }, 502);
        }
      } else if (providerPayload.code !== 0 || !providerPayload.data) {
        return json({ error: providerPayload.msg || 'AI审核未能完成，请稍后重试' }, 502);
      }

      let result;
      if (provider === 'uapis-profanity') {
        result = {
          status: providerPayload.status,
          is_forbidden: providerPayload.status === 'forbidden' || providerPayload.forbidden_words.length > 0,
          forbidden_words: providerPayload.forbidden_words
        };
      } else if (provider === 'content-moderation') {
        if (
          typeof providerPayload.data.is_pass !== 'boolean' ||
          typeof providerPayload.data.risk_level !== 'string' ||
          !Array.isArray(providerPayload.data.categories) ||
          !Array.isArray(providerPayload.data.details)
        ) {
          return json({ error: 'AI审核服务返回了无法识别的结果' }, 502);
        }
        result = {
          is_pass: providerPayload.data.is_pass,
          risk_level: providerPayload.data.risk_level,
          categories: providerPayload.data.categories,
          details: providerPayload.data.details
        };
      } else {
        if (
          typeof providerPayload.data.conclusion !== 'string' ||
          !Number.isSafeInteger(providerPayload.data.conclusion_type) ||
          typeof providerPayload.data.is_compliant !== 'boolean' ||
          typeof providerPayload.data.is_suspected !== 'boolean' ||
          !Number.isSafeInteger(providerPayload.data.violation_count) ||
          !Array.isArray(providerPayload.data.violation_categories) ||
          !Array.isArray(providerPayload.data.violations) ||
          !Array.isArray(providerPayload.data.details)
        ) {
          return json({ error: 'AI审核服务返回了无法识别的结果' }, 502);
        }
        result = {
          conclusion: providerPayload.data.conclusion,
          conclusion_type: providerPayload.data.conclusion_type,
          is_compliant: providerPayload.data.is_compliant,
          is_suspected: providerPayload.data.is_suspected,
          violation_count: providerPayload.data.violation_count,
          violation_categories: providerPayload.data.violation_categories,
          violations: providerPayload.data.violations,
          details: providerPayload.data.details
        };
      }

      const isConfirmedViolation = provider === 'content-moderation'
        ? result.is_pass === false
        : provider === 'text-censor'
          ? result.is_compliant === false && result.is_suspected === false
          : result.is_forbidden;
      const violationCategories = [];
      const addViolationCategory = value => {
        if (typeof value !== 'string') return;
        const part = value.trim().slice(0, 160);
        if (part && !violationCategories.includes(part)) violationCategories.push(part);
      };
      if (provider === 'content-moderation') {
        result.categories.forEach(addViolationCategory);
      } else if (provider === 'text-censor') {
        result.violation_categories.forEach(addViolationCategory);
      } else if (isConfirmedViolation) {
        addViolationCategory('敏感词');
      }
      const reportStatements = [db.prepare(`
        INSERT INTO reports (
          reporter_id, reported_user_id, message_id, review_type,
          status, message_text, ai_result, created_at
        ) VALUES (?, ?, ?, ?, 'ai_reviewed', ?, ?, ?)
      `).bind(
        session.user_id,
        reported.message.user_id,
        reported.message.id,
        provider,
        reported.messageText,
        JSON.stringify(result),
        Date.now()
      )];
      if (isConfirmedViolation && violationCategories.length > 0) {
        const notificationTime = Date.now();
        reportStatements.push(db.prepare(`
          INSERT INTO messages (user_id, display_name, text, created_at)
          SELECT 0, '[通知]', json_object(
            'type', 'moderation',
            'action', 'report_violation',
            'targetName', COALESCE((SELECT display_name FROM users WHERE id = ?), '未知用户'),
            'reporterName', COALESCE((SELECT display_name FROM users WHERE id = ?), '未知用户'),
            'actorName', ?,
            'reason', ?
          ), ?
        `).bind(
          reported.message.user_id,
          session.user_id,
          provider === 'content-moderation'
            ? 'AI审核（接口1）'
            : provider === 'text-censor' ? 'AI审核（接口2）' : 'UAPIS敏感词检测',
          violationCategories.join('、').slice(0, 500),
          notificationTime
        ));
        reportStatements.push(db.prepare(`
          DELETE FROM messages
          WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 50)
        `));
      }
      await db.batch(reportStatements);
      return json({ success: true, provider, result });
    }

    if (action === 'reviewReport') {
      const currentUser = await db.prepare("SELECT role FROM users WHERE id = ?").bind(session.user_id).first();
      if (!currentUser || !isModeratorRole(currentUser.role)) return json({ error: '没有举报审核权限' }, 403);
      const { report_id, decision, violation_content } = await request.json();
      const reportId = Number(report_id);
      const violationContent = typeof violation_content === 'string' ? violation_content.trim() : '';
      if (!Number.isSafeInteger(reportId) || reportId <= 0) return json({ error: '举报记录无效' }, 400);
      if (!['violation', 'normal'].includes(decision)) return json({ error: '审核结果无效' }, 400);
      if (decision === 'violation' && (!violationContent || violationContent.length > 500)) {
        return json({ error: '违规内容不能为空且不能超过500个字符' }, 400);
      }
      const reviewedAt = Date.now();
      const results = await db.batch([
        db.prepare(`
        UPDATE reports
        SET status = 'reviewed', decision = ?, reviewed_by = ?, reviewed_at = ?
        WHERE id = ? AND reviewer_id = ? AND review_type = 'manual' AND status = 'pending'
      `).bind(decision, session.user_id, reviewedAt, reportId, session.user_id),
        db.prepare(`
        INSERT INTO messages (user_id, display_name, text, created_at)
        SELECT 0, '[通知]', json_object(
          'type', 'moderation',
          'action', 'report_violation',
          'targetName', COALESCE(reported.display_name, '未知用户'),
          'reporterName', COALESCE(reporter.display_name, '未知用户'),
          'actorName', COALESCE(reviewer.display_name, '未知用户'),
          'reason', ?
        ), ?
        FROM reports
        LEFT JOIN users AS reported ON reported.id = reports.reported_user_id
        LEFT JOIN users AS reporter ON reporter.id = reports.reporter_id
        LEFT JOIN users AS reviewer ON reviewer.id = reports.reviewed_by
        WHERE reports.id = ?
          AND reports.status = 'reviewed'
          AND reports.decision = 'violation'
          AND reports.reviewed_by = ?
          AND reports.reviewed_at = ?
          AND changes() > 0
      `).bind(violationContent, reviewedAt, reportId, session.user_id, reviewedAt),
        db.prepare(`
        DELETE FROM messages
        WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 50)
          AND changes() > 0
      `)
      ]);
      if (!results[0].meta?.changes) return json({ error: '举报已处理或不属于当前审核员' }, 409);
      return json({ success: true });
    }

    if (action === 'muteUser') {
      const moderator = await db.prepare("SELECT display_name, role FROM users WHERE id = ?").bind(session.user_id).first();
      if (!moderator || !['super_admin', 'admin', 'ai_admin'].includes(moderator.role)) return json({ error: '没有禁言权限' }, 403);
      const { user_id, duration_minutes, reason } = await request.json();
      const userId = Number(user_id);
      const durationMinutes = Number(duration_minutes);
      const muteReason = typeof reason === 'string' ? reason.trim() : '';
      if (!Number.isSafeInteger(userId) || userId <= 0) return json({ error: '成员无效' }, 400);
      if (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) return json({ error: '禁言时长必须是大于0的整数分钟' }, 400);
      if (!muteReason) return json({ error: '禁言理由不能为空' }, 400);
      if (muteReason.length > 200) return json({ error: '禁言理由不能超过200个字符' }, 400);
      const mutedUntil = Date.now() + durationMinutes * 60_000;
      if (!Number.isSafeInteger(mutedUntil)) return json({ error: '禁言时长过长' }, 400);
      const target = await db.prepare("SELECT id, display_name, role FROM users WHERE id = ?").bind(userId).first();
      if (!target) return json({ error: '成员不存在' }, 404);
      if (target.role === 'super_admin' || (['admin', 'ai_admin'].includes(moderator.role) && !['user', 'ai'].includes(target.role))) {
        return json({ error: ['admin', 'ai_admin'].includes(moderator.role) ? '管理只能禁言普通用户或AI用户' : '不能禁言超管' }, 403);
      }
      const notificationText = JSON.stringify({
        type: 'moderation',
        action: 'mute',
        targetName: target.display_name,
        actorName: moderator.display_name,
        actorRole: moderator.role,
        durationMinutes,
        reason: muteReason
      });
      await db.batch([
        db.prepare(`
          INSERT INTO user_mutes (user_id, muted_until, muted_by) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET muted_until = excluded.muted_until, muted_by = excluded.muted_by
        `).bind(userId, mutedUntil, session.user_id),
        db.prepare("INSERT INTO messages (user_id, display_name, text, created_at) VALUES (0, '[通知]', ?, ?)").bind(notificationText, Date.now()),
        db.prepare("DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 50)")
      ]);
      return json({ success: true, userId, displayName: target.display_name, mutedUntil });
    }

    if (action === 'unmuteUser') {
      const moderator = await db.prepare("SELECT display_name, role FROM users WHERE id = ?").bind(session.user_id).first();
      if (!moderator || !['super_admin', 'admin', 'ai_admin'].includes(moderator.role)) return json({ error: '没有解除禁言权限' }, 403);
      const { user_id } = await request.json();
      const userId = Number(user_id);
      if (!Number.isSafeInteger(userId) || userId <= 0) return json({ error: '成员无效' }, 400);
      const target = await db.prepare("SELECT id, display_name, role FROM users WHERE id = ?").bind(userId).first();
      if (!target) return json({ error: '成员不存在' }, 404);
      if (target.role === 'super_admin' || (['admin', 'ai_admin'].includes(moderator.role) && !['user', 'ai'].includes(target.role))) {
        return json({ error: ['admin', 'ai_admin'].includes(moderator.role) ? '管理只能解除普通用户或AI用户的禁言' : '不能解除超管的禁言' }, 403);
      }
      const mute = await db.prepare("SELECT muted_until FROM user_mutes WHERE user_id = ?").bind(userId).first();
      if (!mute || mute.muted_until <= Date.now()) return json({ error: '该成员当前未被禁言' }, 400);
      const notificationText = JSON.stringify({
        type: 'moderation',
        action: 'unmute',
        targetName: target.display_name,
        actorName: moderator.display_name,
        actorRole: moderator.role
      });
      await db.batch([
        db.prepare("DELETE FROM user_mutes WHERE user_id = ?").bind(userId),
        db.prepare("INSERT INTO messages (user_id, display_name, text, created_at) VALUES (0, '[通知]', ?, ?)").bind(notificationText, Date.now()),
        db.prepare("DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 50)")
      ]);
      return json({ success: true, userId, displayName: target.display_name });
    }

    if (action === 'changeDisplayName') {
      const { display_name } = await request.json();
      const displayName = typeof display_name === 'string' ? display_name.trim() : '';
      if (!displayName) return json({ error: '用户名不能为空' }, 400);
      if (countDisplayWidth(displayName) > 24) return json({ error: '昵称长度不能超过24（半角1，全角2）' }, 400);
      await db.batch([
        db.prepare("UPDATE users SET display_name = ? WHERE id = ?").bind(displayName, session.user_id),
        db.prepare("UPDATE messages SET display_name = ? WHERE user_id = ?").bind(displayName, session.user_id)
      ]);
      return json({ success: true, displayName });
    }

    // 更新头像
    if (action === 'updateAvatar') {
      const { avatar_base64 } = await request.json();
      if (!avatar_base64 || avatar_base64.length > 140000) return json({ error: '头像必须压缩到100KB以内' }, 400);
      await db.prepare("UPDATE users SET avatar_base64 = ? WHERE id = ?").bind(avatar_base64, session.user_id).run();
      return json({ success: true });
    }

    if (action === 'getMessages') {
      const afterId = parseInt(url.searchParams.get('after') || '0');
      const { results } = await db.prepare(`
        SELECT messages.id, messages.user_id, messages.display_name, messages.text, messages.created_at, users.role
        FROM messages
        LEFT JOIN users ON users.id = messages.user_id
        WHERE messages.id > ?
        ORDER BY messages.id ASC
        LIMIT 50
      `).bind(afterId).all();
      return json({ messages: results });
    }

    if (action === 'sendMessage') {
      const { text, quote } = await request.json();
      const messageText = typeof text === 'string' ? text.trim() : '';
      if (!messageText || messageText.length > 300) return json({ error: '消息不能为空且不能超过300字' }, 400);
      let storedText = messageText;
      if (quote !== undefined && quote !== null) {
        const quoteName = typeof quote.display_name === 'string' ? quote.display_name.trim() : '';
        const quoteText = typeof quote.text === 'string' ? quote.text : '';
        if (!quoteName || quoteName.length > 24 || !quoteText || quoteText.length > 300) {
          return json({ error: '引用消息无效' }, 400);
        }
        storedText = JSON.stringify({
          type: 'chat_quote_v1',
          quote: { display_name: quoteName, text: quoteText },
          text: messageText
        });
      }
      const mute = await db.prepare("SELECT muted_until FROM user_mutes WHERE user_id = ?").bind(session.user_id).first();
      if (mute && mute.muted_until > Date.now()) {
        return json({ error: `你已被禁言，${new Date(mute.muted_until).toLocaleString('zh-CN')} 后可以发言` }, 403);
      }
      if (mute) await db.prepare("DELETE FROM user_mutes WHERE user_id = ?").bind(session.user_id).run();
      const user = await db.prepare("SELECT display_name FROM users WHERE id = ?").bind(session.user_id).first();
      if (!user) return json({ error: '用户不存在' }, 404);
      await db.prepare("INSERT INTO messages (user_id, display_name, text, created_at) VALUES (?, ?, ?, ?)").bind(session.user_id, user.display_name, storedText, Date.now()).run();
      await db.prepare("DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 50)").run();
      return json({ success: true });
    }

    return json({ error: '未知请求' }, 404);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}