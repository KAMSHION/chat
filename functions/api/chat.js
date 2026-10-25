export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const db = env.DB;

  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

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
      if (normalizedAccount.length > 30 || displayName.length > 20) return json({ error: '账户名最多30个字符，用户名最多20个字符' }, 400);
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
      if (!normalizedAccount || typeof password !== 'string' || !password) return json({ error: '账户名或密码错误' }, 401);
      const user = await db.prepare("SELECT * FROM users WHERE account = ?").bind(normalizedAccount).first();
      if (!user) return json({ error: '账户名或密码错误' }, 401);
      const hash = await hashPassword(password, user.salt);
      if (hash !== user.password_hash) return json({ error: '账户名或密码错误' }, 401);
      const sessionId = crypto.randomUUID();
      await db.prepare("INSERT INTO sessions (session_id, user_id, role, last_seen) VALUES (?, ?, ?, ?)").bind(sessionId, user.id, user.role, Date.now()).run();
      return new Response(JSON.stringify({ success: true, displayName: user.display_name, userId: user.id, sessionId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax` }
      });
    }

    const cookie = request.headers.get('Cookie') || '';
    const sessionId = cookie.match(/session=([^;]+)/)?.[1];
    if (!sessionId) return json({ error: '未登录' }, 401);
    const session = await db.prepare("SELECT * FROM sessions WHERE session_id = ?").bind(sessionId).first();
    if (!session) return json({ error: '会话已过期，请重新登录' }, 401);

    if (action === 'heartbeat') {
      await db.prepare("UPDATE sessions SET last_seen = ? WHERE session_id = ?").bind(Date.now(), sessionId).run();
      await db.prepare("DELETE FROM sessions WHERE last_seen < ?").bind(Date.now() - 90000).run();
      return json({ success: true });
    }

    // 获取所有用户（用于渲染头像）
    if (action === 'getUsers') {
      const { results } = await db.prepare("SELECT id, display_name, avatar_base64 FROM users").all();
      return json({ users: results });
    }

    if (action === 'changeDisplayName') {
      const { display_name } = await request.json();
      const displayName = typeof display_name === 'string' ? display_name.trim() : '';
      if (!displayName) return json({ error: '用户名不能为空' }, 400);
      if (displayName.length > 20) return json({ error: '用户名不能超过20个字符' }, 400);
      await db.batch([
        db.prepare("UPDATE users SET display_name = ? WHERE id = ?").bind(displayName, session.user_id),
        db.prepare("UPDATE messages SET display_name = ? WHERE user_id = ?").bind(displayName, session.user_id)
      ]);
      return json({ success: true, displayName });
    }

    // 更新头像
    if (action === 'updateAvatar') {
      const { avatar_base64 } = await request.json();
      if (!avatar_base64 || avatar_base64.length > 50000) return json({ error: '头像过大' }, 400); // 限制最大约 37KB
      await db.prepare("UPDATE users SET avatar_base64 = ? WHERE id = ?").bind(avatar_base64, session.user_id).run();
      return json({ success: true });
    }

    if (action === 'getMessages') {
      const afterId = parseInt(url.searchParams.get('after') || '0');
      const { results } = await db.prepare("SELECT id, user_id, display_name, text, created_at FROM messages WHERE id > ? ORDER BY id ASC LIMIT 50").bind(afterId).all();
      return json({ messages: results });
    }

    if (action === 'sendMessage') {
      const { text } = await request.json();
      if (!text || text.length > 300) return json({ error: '消息不能为空且不能超过300字' }, 400);
      const user = await db.prepare("SELECT display_name FROM users WHERE id = ?").bind(session.user_id).first();
      if (!user) return json({ error: '用户不存在' }, 404);
      await db.prepare("INSERT INTO messages (user_id, display_name, text, created_at) VALUES (?, ?, ?, ?)").bind(session.user_id, user.display_name, text, Date.now()).run();
      await db.prepare("DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 50)").run();
      return json({ success: true });
    }

    return json({ error: '未知请求' }, 404);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}