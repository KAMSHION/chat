let lastMsgId = 0;
let pollingTimer = null;
let myUsername = '';
let myUserId = 0;
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

async function register() {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (!u || !p) return alert('请填写用户名和密码');
  const res = await api('register', 'POST', { username: u, password: p });
  if (res.error) document.getElementById('auth-msg').innerText = res.error;
  else alert('注册成功，请登录');
}

async function login() {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (!u || !p) return alert('请填写用户名和密码');
  const res = await api('login', 'POST', { username: u, password: p });
  if (res.error) {
    document.getElementById('auth-msg').innerText = res.error;
  } else {
    myUsername = res.username;
    myUserId = res.userId;
    document.getElementById('auth-panel').style.display = 'none';
    document.getElementById('chat-panel').style.display = 'flex';
    startChat();
  }
}

// 登录后启动
async function startChat() {
  await loadUsers(); // 先拉取所有人的头像
  fetchMessages();
  setInterval(heartbeat, 60000);
  pollingTimer = setInterval(() => {
    if (document.visibilityState === 'visible') fetchMessages();
  }, 3000);
}

// 心跳包
async function heartbeat() {
  await api('heartbeat', 'POST');
}

// 加载用户头像字典
async function loadUsers() {
  const res = await api('getUsers');
  if (res.users) {
    res.users.forEach(u => {
      if (u.avatar_base64) userAvatars[u.id] = u.avatar_base64;
    });
  }
}

// 拉取消息
async function fetchMessages() {
  const res = await api(`getMessages&after=${lastMsgId}`);
  if (res.error) return console.error(res.error);
  
  if (res.messages && res.messages.length > 0) {
    const msgContainer = document.getElementById('messages');
    
    res.messages.forEach(msg => {
      if (msg.id > lastMsgId) lastMsgId = msg.id;
      const isMine = msg.username === myUsername;
      
      const div = document.createElement('div');
      div.className = 'message' + (isMine ? ' mine' : '');
      
      // 头像部分
      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'avatar';
      if (userAvatars[msg.user_id]) {
        avatarDiv.innerHTML = `<img src="${userAvatars[msg.user_id]}">`;
      } else {
        avatarDiv.innerText = msg.username.charAt(0).toUpperCase();
      }

      // 气泡部分
      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'bubble';
      
      const senderDiv = document.createElement('div');
      senderDiv.className = 'sender';
      senderDiv.innerText = msg.username;
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'content';
      // 安全渲染：纯文本显示，防止 XSS
      contentDiv.textContent = msg.text; 
      
      bubbleDiv.appendChild(senderDiv);
      bubbleDiv.appendChild(contentDiv);
      div.appendChild(avatarDiv);
      div.appendChild(bubbleDiv);
      
      msgContainer.appendChild(div);
    });
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }
}

async function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const res = await api('sendMessage', 'POST', { text });
  if (res.error) alert(res.error);
  else fetchMessages();
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
      // 重新刷新消息以显示新头像
      document.getElementById('messages').innerHTML = '';
      lastMsgId = 0;
      fetchMessages();
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
  if (input) {
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
});