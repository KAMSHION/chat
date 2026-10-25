let lastMsgId = 0;
let pollingTimer = null;
let messagesFetchInProgress = false;
let messagesFetchQueued = false;
let myUserId = 0;
let myRole = 'user';
let muteTarget = null;
let userAvatars = {}; // 存放所有用户的头像字典 {id: base64}

async function api(action, method = 'GET', body = null) {
  const options = { method, headers: {} };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`/api/chat?action=${action}`, options);
  return await res.json();
}

function showAuthMessage(message, isSuccess = false) {
  const msg = document.getElementById('auth-msg');
  msg.textContent = message;
  msg.classList.toggle('success', isSuccess);
}

function isValidAccount(account) {
  return /^[A-Za-z0-9_$]+$/.test(account);
}

async function register() {
  const account = document.getElementById('register-account').value.trim();
  const displayName = document.getElementById('display-name').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const message = document.getElementById('register-msg');
  message.classList.remove('success');

  if (!account || !displayName || !password || !confirmPassword) {
    message.textContent = '请完整填写所有信息';
    return;
  }
  if (!isValidAccount(account)) {
    message.textContent = '账户名只能包含大小写英文字母、数字、下划线和美元符号（$）';
    return;
  }
  if (password !== confirmPassword) {
    message.textContent = '两次输入的密码不一致';
    return;
  }

  try {
    const res = await api('register', 'POST', { account, display_name: displayName, password });
    if (res.error) {
      message.textContent = res.error;
      return;
    }
    document.getElementById('auth-form').reset();
    document.getElementById('register-form').reset();
    showLoginPage('注册成功，请使用账户名登录。', true);
    document.getElementById('account').value = account;
  } catch (error) {
    message.textContent = '暂时无法连接服务器，请稍后重试。';
    console.error(error);
  }
}

async function login() {
  const account = document.getElementById('account').value.trim();
  const p = document.getElementById('password').value;
  if (!account || !p) return showAuthMessage('请填写账户名和密码');
  if (!isValidAccount(account)) {
    showAuthMessage('账户名只能包含大小写英文字母、数字、下划线和美元符号（$）');
    return;
  }
  try {
    const res = await api('login', 'POST', { account, password: p });
    if (res.error) {
      showAuthMessage(res.error);
    } else {
      myUserId = res.userId;
      myRole = ['super_admin', 'admin'].includes(res.role) ? res.role : 'user';
      document.getElementById('current-user').textContent = res.displayName;
      document.getElementById('auth-panel').style.display = 'none';
      document.getElementById('register-panel').hidden = true;
      document.getElementById('chat-panel').style.display = 'flex';
      startChat();
    }
  } catch (error) {
    showAuthMessage('暂时无法连接服务器，请稍后重试。');
    console.error(error);
  }
}

function showRegisterPage() {
  document.getElementById('auth-panel').style.display = 'none';
  document.getElementById('register-panel').hidden = false;
  document.getElementById('register-msg').textContent = '';
  document.getElementById('register-account').focus();
}

function showLoginPage(message = '', isSuccess = false) {
  document.getElementById('register-panel').hidden = true;
  document.getElementById('auth-panel').style.display = '';
  showAuthMessage(message, isSuccess);
  document.getElementById('account').focus();
}

function roleLabel(role) {
  if (role === 'super_admin') return '超管';
  if (role === 'admin') return '管理';
  return 'Lv.1';
}

// 登录后启动
async function startChat() {
  await loadUsers(); // 先拉取所有人的头像
  fetchMessages();
  heartbeat();
  setInterval(heartbeat, 60000);
  pollingTimer = setInterval(() => {
    if (document.visibilityState === 'visible') fetchMessages();
  }, 3000);
}

// 心跳包
async function heartbeat() {
  const status = document.getElementById('connection-status');
  const dot = document.querySelector('.status-dot');
  try {
    const res = await api('heartbeat', 'POST');
    if (res.error) throw new Error(res.error);
    status.textContent = '在线';
    dot.classList.remove('offline');
  } catch (error) {
    status.textContent = '连接异常';
    dot.classList.add('offline');
    console.error(error);
  }
}

// 加载用户头像字典
async function loadUsers() {
  const res = await api('getUsers');
  if (res.users) {
    res.users.forEach(u => {
      if (u.avatar_base64) userAvatars[u.id] = u.avatar_base64;
    });
  }
  return res;
}

async function showMembers() {
  const dialog = document.getElementById('members-dialog');
  const list = document.getElementById('members-list');
  const count = document.getElementById('members-count');
  list.replaceChildren();
  count.textContent = '正在加载...';
  dialog.showModal();

  try {
    const res = await loadUsers();
    if (res.error) throw new Error(res.error);

    const roleOrder = { super_admin: 0, admin: 1 };
    const users = (res.users || []).sort((first, second) =>
      (roleOrder[first.role] ?? 2) - (roleOrder[second.role] ?? 2) ||
      first.display_name.localeCompare(second.display_name, 'zh-CN')
    );
    count.textContent = `共 ${users.length} 位成员`;
    if (users.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'members-message';
      empty.textContent = '暂无成员';
      list.appendChild(empty);
      return;
    }

    users.forEach(user => {
      const item = document.createElement('div');
      item.className = 'member-item';
      item.dataset.userId = user.id;

      const avatar = document.createElement('div');
      avatar.className = 'member-avatar';
      if (user.avatar_base64) {
        const image = document.createElement('img');
        image.src = user.avatar_base64;
        image.alt = '';
        avatar.appendChild(image);
      } else {
        avatar.textContent = user.display_name.charAt(0).toUpperCase();
      }

      const displayName = document.createElement('span');
      displayName.className = 'member-name';
      displayName.textContent = user.display_name;

      const identity = document.createElement('div');
      identity.className = 'member-identity';
      const badge = document.createElement('span');
      badge.className = `user-badge${user.role === 'super_admin' ? ' super-admin' : user.role === 'admin' ? ' administrator' : ''}`;
      badge.textContent = roleLabel(user.role);
      identity.append(displayName, badge);
      item.append(avatar, identity);

      if (user.muted_until > Date.now()) {
        const muteState = document.createElement('span');
        muteState.className = 'member-mute-state';
        muteState.textContent = `禁言至 ${new Date(user.muted_until).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
        item.appendChild(muteState);
      }

      if (['super_admin', 'admin'].includes(myRole) && !['super_admin', 'admin'].includes(user.role)) {
        const muteButton = document.createElement('button');
        muteButton.className = 'member-mute-btn';
        muteButton.type = 'button';
        muteButton.textContent = '禁言';
        muteButton.addEventListener('click', () => openMuteDialog(user));
        item.appendChild(muteButton);
      }

      list.appendChild(item);
    });
  } catch (error) {
    count.textContent = '成员加载失败';
    const message = document.createElement('p');
    message.className = 'members-message error';
    message.textContent = error.message || '请检查网络后重试。';
    list.appendChild(message);
    console.error('加载成员失败：', error);
  }
}

// 拉取消息
async function fetchMessages() {
  if (messagesFetchInProgress) {
    messagesFetchQueued = true;
    return;
  }

  messagesFetchInProgress = true;
  try {
    do {
      messagesFetchQueued = false;
      const res = await api(`getMessages&after=${lastMsgId}`);
      if (res.error) {
        console.error(res.error);
        break;
      }

      if (res.messages && res.messages.length > 0) {
        const msgContainer = document.getElementById('messages');

        res.messages.forEach(msg => {
          if (msg.id <= lastMsgId) return;
          lastMsgId = msg.id;
          const isMine = Number(msg.user_id) === Number(myUserId);

          const div = document.createElement('div');
          div.className = 'message' + (isMine ? ' mine' : '');
          div.dataset.messageId = msg.id;
          div.dataset.userId = msg.user_id;

          const avatarDiv = document.createElement('div');
          avatarDiv.className = 'avatar';
          if (userAvatars[msg.user_id]) {
            const avatarImage = document.createElement('img');
            avatarImage.src = userAvatars[msg.user_id];
            avatarImage.alt = '';
            avatarDiv.appendChild(avatarImage);
          } else {
            avatarDiv.innerText = msg.display_name.charAt(0).toUpperCase();
          }

          const bodyDiv = document.createElement('div');
          bodyDiv.className = 'message-body';

          const bubbleDiv = document.createElement('div');
          bubbleDiv.className = 'bubble';

          const senderDiv = document.createElement('div');
          senderDiv.className = 'sender';

          const badgeDiv = document.createElement('span');
          const isSuperAdmin = msg.role === 'super_admin';
          badgeDiv.className = `user-badge${isSuperAdmin ? ' super-admin' : msg.role === 'admin' ? ' administrator' : ''}`;
          badgeDiv.textContent = roleLabel(msg.role);

          const usernameSpan = document.createElement('span');
          usernameSpan.className = 'sender-name';
          usernameSpan.textContent = msg.display_name;
          senderDiv.append(badgeDiv, usernameSpan);

          const contentDiv = document.createElement('div');
          contentDiv.className = 'content';
          contentDiv.textContent = msg.text;

          const timeDiv = document.createElement('div');
          timeDiv.className = 'message-time';
          timeDiv.textContent = new Date(Number(msg.created_at)).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          });

          bubbleDiv.appendChild(contentDiv);
          bodyDiv.appendChild(senderDiv);
          bodyDiv.appendChild(bubbleDiv);
          bodyDiv.appendChild(timeDiv);
          div.appendChild(avatarDiv);
          div.appendChild(bodyDiv);

          msgContainer.appendChild(div);
        });
        document.getElementById('empty-state').hidden = true;
        msgContainer.scrollTop = msgContainer.scrollHeight;
      }
    } while (messagesFetchQueued);
  } catch (error) {
    console.error('获取消息失败：', error);
  } finally {
    messagesFetchInProgress = false;
  }
}

async function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  const sendButton = document.getElementById('send-btn');
  sendButton.disabled = true;
  try {
    const res = await api('sendMessage', 'POST', { text });
    if (res.error) {
      alert(res.error);
      return;
    }
    input.value = '';
    updateComposer();
    await fetchMessages();
  } catch (error) {
    alert('发送失败，请检查网络后重试。');
    console.error(error);
  } finally {
    updateComposer();
  }
}

async function changeDisplayName(event) {
  event.preventDefault();
  const input = document.getElementById('new-display-name');
  const message = document.getElementById('username-msg');
  const saveButton = document.getElementById('username-save-btn');
  const displayName = input.value.trim();
  message.textContent = '';
  message.classList.remove('success');

  if (!displayName) {
    message.textContent = '用户名不能为空';
    return;
  }

  saveButton.disabled = true;
  try {
    const res = await api('changeDisplayName', 'POST', { display_name: displayName });
    if (res.error) {
      message.textContent = res.error;
      return;
    }

    document.getElementById('current-user').textContent = res.displayName;
    document.querySelectorAll('.message').forEach(row => {
      if (Number(row.dataset.userId) !== Number(myUserId)) return;
      const name = row.querySelector('.sender-name');
      const badge = row.querySelector('.user-badge');
      const avatar = row.querySelector('.avatar');
      if (name) name.textContent = res.displayName;
      if (badge) {
        badge.textContent = roleLabel(myRole);
        badge.classList.toggle('super-admin', myRole === 'super_admin');
        badge.classList.toggle('administrator', myRole === 'admin');
      }
      if (avatar && !avatar.querySelector('img')) {
        avatar.textContent = res.displayName.charAt(0).toUpperCase();
      }
    });

    const member = document.querySelector(`.member-item[data-user-id="${myUserId}"] .member-name`);
    if (member) member.textContent = res.displayName;
    message.textContent = '用户名已更新';
    message.classList.add('success');
    window.setTimeout(() => document.getElementById('username-dialog').close(), 500);
  } catch (error) {
    message.textContent = '更新失败，请检查网络后重试。';
    console.error('更改用户名失败：', error);
  } finally {
    saveButton.disabled = false;
  }
}

function openMuteDialog(user) {
  muteTarget = user;
  document.getElementById('mute-title').textContent = `将用户${user.display_name}禁言`;
  document.getElementById('mute-duration-label').textContent = `禁言用户${user.display_name}（min）`;
  document.getElementById('mute-duration').value = '';
  document.getElementById('mute-msg').textContent = '';
  document.getElementById('mute-dialog').showModal();
  document.getElementById('mute-duration').focus();
}

async function muteMember(event) {
  event.preventDefault();
  if (!muteTarget) return;
  const durationInput = document.getElementById('mute-duration');
  const message = document.getElementById('mute-msg');
  const confirmButton = document.getElementById('mute-confirm-btn');
  const durationMinutes = Number(durationInput.value);
  message.textContent = '';
  message.classList.remove('success');

  if (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) {
    message.textContent = '请输入大于0的整数分钟';
    return;
  }

  confirmButton.disabled = true;
  try {
    const res = await api('muteUser', 'POST', {
      user_id: muteTarget.id,
      duration_minutes: durationMinutes
    });
    if (res.error) {
      message.textContent = res.error;
      return;
    }

    message.textContent = `已将${res.displayName}禁言 ${durationMinutes} 分钟`;
    message.classList.add('success');
    const member = document.querySelector(`.member-item[data-user-id="${res.userId}"]`);
    if (member) {
      let state = member.querySelector('.member-mute-state');
      if (!state) {
        state = document.createElement('span');
        state.className = 'member-mute-state';
        member.insertBefore(state, member.querySelector('.member-mute-btn'));
      }
      state.textContent = `禁言至 ${new Date(res.mutedUntil).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    window.setTimeout(() => document.getElementById('mute-dialog').close(), 700);
  } catch (error) {
    message.textContent = '禁言失败，请检查网络后重试。';
    console.error('禁言成员失败：', error);
  } finally {
    confirmButton.disabled = false;
  }
}

function setTheme(theme) {
  const isNight = theme === 'night';
  document.documentElement.dataset.theme = isNight ? 'night' : 'day';
  const toggle = document.getElementById('theme-toggle');
  toggle.textContent = isNight ? '切换到白昼' : '切换到极夜';
  toggle.setAttribute('aria-pressed', String(isNight));
  document.querySelector('meta[name="theme-color"]').content = isNight ? '#111827' : '#f4f7fb';
  try {
    localStorage.setItem('chat-theme', isNight ? 'night' : 'day');
  } catch (error) {
    console.error('无法保存主题偏好：', error);
  }
}

// === 头像压缩与上传逻辑 ===
async function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  
  try {
    const base64 = await compressImage(file, 100, 100);
    const res = await api('updateAvatar', 'POST', { avatar_base64: base64 });
    if (res.error) {
      alert('上传失败：' + res.error);
    } else {
      alert('头像更新成功！');
      userAvatars[myUserId] = base64;
      document.querySelectorAll('.message.mine .avatar').forEach(avatar => {
        const image = document.createElement('img');
        image.src = base64;
        image.alt = '';
        avatar.replaceChildren(image);
      });
    }
  } catch (e) {
    alert('图片处理失败');
  }
  input.value = ''; // 清空选中
}

function compressImage(file, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = e => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // 用 JPEG 格式压缩到 80% 质量，体积通常在 2~5KB 左右
        resolve(canvas.toDataURL('image/jpeg', 0.8)); 
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

function logout() {
  document.cookie = 'session=; Max-Age=0; path=/';
  location.reload();
}

// === 新增：监听键盘 Enter 发送逻辑 ===
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('msg-input');
  const authForm = document.getElementById('auth-form');
  const registerForm = document.getElementById('register-form');
  const messageForm = document.getElementById('message-form');
  const membersDialog = document.getElementById('members-dialog');
  const usernameDialog = document.getElementById('username-dialog');
  const muteDialog = document.getElementById('mute-dialog');

  let savedTheme = 'day';
  try {
    savedTheme = localStorage.getItem('chat-theme') === 'night' ? 'night' : 'day';
  } catch (error) {
    console.error('无法读取主题偏好：', error);
  }
  setTheme(savedTheme);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'night' ? 'day' : 'night');
  });

  authForm.addEventListener('submit', event => {
    event.preventDefault();
    showAuthMessage('');
    login();
  });

  document.getElementById('show-register-btn').addEventListener('click', showRegisterPage);
  document.getElementById('back-to-login-btn').addEventListener('click', () => showLoginPage());

  registerForm.addEventListener('submit', event => {
    event.preventDefault();
    register();
  });

  messageForm.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage();
  });

  document.getElementById('members-btn').addEventListener('click', showMembers);
  document.getElementById('members-close').addEventListener('click', () => membersDialog.close());
  document.getElementById('change-name-btn').addEventListener('click', () => {
    document.getElementById('new-display-name').value = document.getElementById('current-user').textContent;
    document.getElementById('username-msg').textContent = '';
    document.getElementById('username-msg').classList.remove('success');
    usernameDialog.showModal();
    document.getElementById('new-display-name').focus();
  });
  document.getElementById('username-dialog-close').addEventListener('click', () => usernameDialog.close());
  document.getElementById('username-cancel-btn').addEventListener('click', () => usernameDialog.close());
  document.getElementById('username-form').addEventListener('submit', changeDisplayName);
  document.getElementById('mute-dialog-close').addEventListener('click', () => muteDialog.close());
  document.getElementById('mute-cancel-btn').addEventListener('click', () => muteDialog.close());
  document.getElementById('mute-form').addEventListener('submit', muteMember);

  if (input) {
    input.addEventListener('input', updateComposer);
    input.addEventListener('keydown', (e) => {
      // 如果按下的是 Enter 键
      if (e.key === 'Enter') {
        // 如果没有按 Shift，则发送消息并阻止默认换行
        if (!e.shiftKey) {
          e.preventDefault(); // 阻止默认的回车换行行为
          sendMessage();
        }
        // 如果按了 Shift + Enter，就什么都不做，让它默认换行
      }
    });
  }

  updateComposer();
});

function updateComposer() {
  const input = document.getElementById('msg-input');
  const counter = document.getElementById('char-count');
  const sendButton = document.getElementById('send-btn');
  if (!input || !counter || !sendButton) return;
  counter.textContent = `${input.value.length} / 300`;
  sendButton.disabled = !input.value.trim();
}