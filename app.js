let lastMsgId = 0;
let pollingTimer = null;
let messagesFetchInProgress = false;
let messagesFetchQueued = false;
let isSendingMessage = false;
let myUserId = 0;
let myRole = 'user';
let myAccount = '';
let myDisplayName = '';
let userRoles = new Map();
let userProfiles = new Map();
let muteTarget = null;
let userAvatars = {}; // 存放所有用户的头像字典 {id: base64}
let currentLanguage = 'zh-CN';
let replyTarget = null;
let contextMenuMessage = null;
let mentionStartIndex = -1;
let mentionActiveIndex = 0;
let mentionFilteredUsers = [];
let reportTarget = null;
let reportReviewerId = null;
let reportReviewerName = '';
let pendingReportReview = null;
let aiConversation = [];
let isAiRequestInProgress = false;
let workersAiConversation = [];
let isWorkersAiRequestInProgress = false;
const originalTextNodes = new WeakMap();
const originalAttributes = new WeakMap();
const workspaceAnimationTimers = new WeakMap();
const supportedAccentColors = new Set(['aurora', 'deepsea', 'sunset', 'miku']);

const translations = {
  '极简聊窗': 'Minimal Chat',
  '极光聊窗': 'Aurora Chat',
  '极光 · 聊窗': 'Aurora · Chat',
  '讯飞 · 星火AI': 'iFLYTEK · Spark AI',
  '讯飞星火 AI 选项': 'iFLYTEK Spark AI options',
  'Cloudflare · WorkersAI': 'Cloudflare · Workers AI',
  'Workers AI': 'Workers AI',
  'CLOUDFLARE WORKERS AI': 'CLOUDFLARE WORKERS AI',
  '有什么可以帮你？': 'What can I help with?',
  '问我任何问题，或告诉我你正在做什么。': 'Ask me anything, or tell me what you are working on.',
  '给 Workers AI 发送消息...': 'Message Workers AI...',
  'Enter 发送 · Shift + Enter 换行': 'Enter to send · Shift + Enter for a new line',
  '发送消息': 'Send message',
  'Workers AI 的回答可能不准确，请自行核实重要信息。': 'Workers AI can make mistakes. Please verify important information.',
  'Cloudflare Workers AI': 'Cloudflare Workers AI',
  'Workers AI 服务尚未配置，请联系网站管理员。': 'Workers AI is not configured. Contact the site administrator.',
  'Workers AI 请求失败，请稍后重试。': 'The Workers AI request failed. Please try again later.',
  'Workers AI 服务响应超时，请稍后重试。': 'The Workers AI request timed out. Please try again later.',
  'Workers AI 返回了无效响应，请稍后重试。': 'Workers AI returned an invalid response. Please try again later.',
  'Workers AI 请求无效，请检查输入内容。': 'The Workers AI request is invalid. Check your message.',
  '星火 AI 选项': 'Spark AI options',
  '思考模式': 'Thinking mode',
  '思考模式说明': 'Thinking mode help',
  '联网模式': 'Web search mode',
  '联网模式说明': 'Web search mode help',
  'Disabled：关闭思考；Auto：由模型自动决定是否思考；Enabled：始终启用思考。若模型返回无效内容，请关闭思考模式以减少Token使用。': 'Disabled: Turn off thinking; Auto: Let the model decide whether to think; Enabled: Always enable thinking. If the model returns invalid content, turn off thinking mode to reduce token usage.',
  '开启后，星火会搜索互联网中的相关信息，并参考搜索结果回答；关闭后仅使用模型已有知识。': 'When enabled, Spark searches the web for relevant information and uses the results to answer. When disabled, it relies only on the model’s existing knowledge.',
  'AI助手': 'AI assistant',
  'AI对话': 'AI conversation',
  '与讯飞星火模型对话。你发送的内容会传给讯飞星火处理。': 'Chat with iFLYTEK Spark. Messages you send are sent to iFLYTEK for processing.',
  '新建对话': 'New chat',
  '你好！我是讯飞星火AI，有什么可以帮你？': 'Hello! I am iFLYTEK Spark AI. How can I help?',
  '思考': 'Thinking',
  '讯飞星火AI': 'iFLYTEK Spark AI',
  '输入问题，Enter 发送，Shift + Enter 换行': 'Enter a question. Press Enter to send, or Shift + Enter for a new line.',
  '对话仅保存在当前页面；刷新或登出后会清空。': 'This conversation stays in this page only and is cleared when you refresh or log out.',
  '输入问题': 'Enter a question',
  '请输入问题': 'Enter a question',
  '你': 'You',
  '思考中...': 'Thinking...',
  'AI暂时无法回复，请稍后重试。': 'AI could not respond. Please try again later.',
  '讯飞星火服务尚未配置，请联系网站管理员。': 'iFLYTEK Spark is not configured. Contact the site administrator.',
  '星火AI请求失败，请联系管理员检查服务配置。': 'The Spark AI request failed. Ask the administrator to check the service configuration.',
  '星火AI服务响应超时，请稍后重试。': 'The Spark AI service timed out. Please try again later.',
  '讯飞星火服务返回了无效响应，请稍后重试。': 'The iFLYTEK Spark service returned an invalid response. Please try again later.',
  '星火AI请求无效，请检查输入内容。': 'The Spark AI request is invalid. Check your message.',
  '账户 · 安全': 'Account · Security',
  '外观 · 设置': 'Appearance · Settings',
  '管理员': 'Administration',
  '禁言用户': 'Manage muted users',
  '待处理举报': 'Pending reports',
  '登出': 'Log out',
  '主题切换': 'Theme',
  '在明亮与黑暗界面间切换。': 'Switch between light and dark interfaces.',
  '明亮界面': 'Light interface',
  '黑暗界面': 'Dark interface',
  '主题配色': 'Theme palette',
  '四种主题均支持明亮与黑暗界面。': 'All four themes are available in light and dark modes.',
  '绚彩极光 · 青蓝星海': 'Prismatic Aurora · Azure Starsea',
  '深蓝幽紫 · 幻海之境': 'Deep Blue & Violet · Mirage Sea',
  '橙霞入暮 · 藏蓝沉星': 'Sunset Glow · Midnight Stars',
  '初音青绿 · 蔚蓝天依': 'Miku Teal · Tianyi Azure',
  '语言': 'Language',
  '更改界面显示语言。': 'Change the interface language.',
  '管理你的头像、昵称与登录安全。': 'Manage your avatar, display name, and sign-in security.',
  'PROFILE & SECURITY': 'PROFILE & SECURITY',
  'APPEARANCE': 'APPEARANCE',
  '登录后加入对话，和大家分享此刻。': 'Log in to join the conversation and share the moment.',
  '账户名': 'Account name',
  '请输入账户名': 'Enter your account name',
  '账户名只能包含大小写英文字母、数字、下划线和美元符号（$）': 'Account names may contain only letters, numbers, underscores, and dollar signs ($)',
  '密码': 'Password',
  '请输入密码': 'Enter your password',
  '登录': 'Log in',
  '注册新账号': 'Create account',
  '请使用账户名登录': 'Please log in with your account name',
  '支持或改编这个项目？': 'Support or adapt this project?',
  '给 GitHub 仓库点个 Star': 'Star the GitHub repository',
  'B站反馈 · 学习交流': 'Bilibili · Feedback & learning',
  '更新日志': 'Changelog',
  '创建账号': 'Create account',
  '设置登录账户名和聊天室显示名称。': 'Set your login account name and chat display name.',
  '账户名（唯一）': 'Account name (unique)',
  '用于登录，不能与他人重复': 'Used to log in; must be unique',
  '用户名（对外展示）': 'Display name',
  '其他成员看到的名称': 'Name shown to other members',
  '确认密码': 'Confirm password',
  '请再次输入密码': 'Enter your password again',
  '返回登录': 'Back to login',
  '确认注册': 'Create account',
  '正在连接...': 'Connecting...',
  '人在线': 'online',
  '成员': 'Members',
  '切换到极夜': 'Switch to Night',
  '切换到白昼': 'Switch to Day',
  '打开我的资料': 'Open my profile',
  '聊天消息': 'Chat messages',
  '这里暂时还没有消息': 'No messages yet',
  '发送第一条消息，开启对话吧。': 'Send the first message to start a conversation.',
  '说点什么吧...': 'Say something...',
  '输入消息': 'Enter a message',
  'Enter 发送 · Shift + Enter 换行': 'Enter to send · Shift + Enter for a new line',
  '发送': 'Send',
  '发送消息': 'Send message',
  '引用': 'Quote',
  '引用:': 'Replying to:',
  '取消引用': 'Cancel quote',
  '举报': 'Report',
  '举报用户': 'Report user',
  '举报用户{name}': 'Report {name}',
  '人工审核': 'Human review',
  '选择一位管理或超管进行审核': 'Choose an admin or super admin to review the report',
  '使用第三方 AI 内容审核接口': 'Use a third-party AI moderation API',
  '选择审核员': 'Select a reviewer',
  '提交举报': 'Submit report',
  '举报理由': 'Reason for report',
  'AI智能处理': 'AI moderation',
  'AI审核（接口1）': 'AI审核（接口1）',
  'AI审核（接口2）': 'AI审核（接口2）',
  'AI审核（接口3）': 'AI审核（接口3）',
  '敏感词检测': 'Sensitive word check',
  'UAPIS敏感词检测': 'UAPIS sensitive word check',
  '快速检测 · 接口3': 'Quick check · API 3',
  '命中敏感词：': 'Matched sensitive words:',
  'UAPIS': 'UAPIS',
  '极数本源': 'Jishu Benyuan',
  '提交审核': 'Submit for review',
  '举报审核邮件': 'Report inbox',
  '待审核': 'Pending review',
  '消息内容': 'Message',
  '举报人': 'Reporter',
  '提交': 'Submit',
  '违规': 'Violation',
  '正常': 'Normal',
  '未知': 'Unknown',
  '无': 'None',
  '完成': 'Done',
  '暂无待审核举报': 'No reports pending review',
  '举报已提交': 'Report submitted',
  'AI审核结果': 'AI review result',
  '确认违规审核': 'Confirm violation review',
  '违规内容': 'Violation content',
  '请填写确认的违规内容': 'Enter the confirmed violation content',
  '违规内容不能为空且不能超过500个字符': 'Violation content is required and must be 500 characters or fewer',
  'AI审核接口': 'AI review API',
  '审核结论': 'Review conclusion',
  '风险等级': 'Risk level',
  '命中类别': 'Matched categories',
  '命中内容': 'Matched content',
  '内容审核': 'Content moderation',
  '文本审核': 'Text moderation',
  '提交后，所选消息内容会发送至对应的第三方审核接口。': 'The selected message will be sent to the chosen third-party moderation API.',
  '本次消息内容会发送至所选第三方审核接口。': 'This message will be sent to the selected third-party moderation API.',
  '暂无可选审核员': 'No reviewers are available',
  '请选择审核员': 'Select a reviewer',
  '请选择AI审核接口': 'Select an AI review API',
  '不能举报自己的消息': 'You cannot report your own message',
  '举报的消息不存在或已过期': 'The reported message no longer exists',
  '没有举报审核权限': 'You do not have permission to review reports',
  '举报审核加载失败': 'Failed to load report inbox',
  '举报的消息无效': 'Invalid message to report',
  '举报理由不能为空且不能超过500个字符': 'A report reason is required and must be 500 characters or fewer',
  '所选审核员无效': 'The selected reviewer is invalid',
  'AI审核接口无效': 'Invalid AI review API',
  'AI审核服务返回了无法识别的结果': 'The AI review service returned an unrecognized result.',
  '消息长度不符合AI审核接口要求': 'Message length is outside the AI review API limits',
  'AI审核服务尚未配置，请联系网站管理员': 'AI review is not configured. Contact the site administrator.',
  'AI审核服务暂时不可用，请稍后重试': 'AI review is temporarily unavailable. Try again later.',
  'AI审核未能完成，请稍后重试': 'AI review could not be completed. Try again later.',
  '审核结果无效': 'Invalid review decision',
  '举报记录无效': 'Invalid report',
  '举报已处理或不属于当前审核员': 'This report was already handled or is assigned to another reviewer',
  '举报提交失败，请检查网络后重试。': 'Report submission failed. Check your connection and try again.',
  '审核失败，请稍后重试。': 'Review failed. Try again later.',
  '举报提交者：': 'Reported by: ',
  '举报理由：': 'Reason: ',
  '审核结论：': 'Conclusion: ',
  '风险等级：': 'Risk level: ',
  '命中类别：': 'Categories: ',
  '命中内容：': 'Matches: ',
  '极简聊窗成员': 'Chat members',
  '极光聊窗成员': 'Aurora Chat members',
  '正在加载...': 'Loading...',
  '关闭成员列表': 'Close members list',
  '我的': 'My Profile',
  '管理你的个人资料': 'Manage your profile',
  '显示偏好': 'Display preferences',
  '选择语言': 'Select language',
  '提及用户': 'Mention a user',
  '没有匹配的用户': 'No matching users',
  '消息长度不足，无法添加提及': 'Not enough room to add a mention',
  '关闭': 'Close',
  '点击更改头像': 'Click to change your avatar',
  '选择头像': 'Choose an avatar',
  '更改用户名': 'Change display name',
  '账户名：': 'Account name: ',
  '新用户名': 'New display name',
  '取消': 'Cancel',
  '保存': 'Save',
  '修改密码': 'Change password',
  '退出登录': 'Log out',
  '请先验证当前密码': 'Verify your current password first',
  '当前密码': 'Current password',
  '新密码': 'New password',
  '确认新密码': 'Confirm new password',
  '确认修改': 'Confirm change',
  '用户信息': 'User information',
  '将用户禁言': 'Mute user',
  '设置禁言时长，单位为分钟': 'Set the mute duration in minutes',
  '禁言用户，时长（min）': 'Mute duration (min)',
  '输入分钟数（min）': 'Duration in minutes',
  '理由': 'Reason',
  '请填写禁言理由': 'Enter a reason for the mute',
  '确认': 'Confirm',
  '解除禁言': 'Unmute',
  '确认解除该成员的禁言吗？': 'Are you sure you want to unmute this member?',
  '[通知]': '[Notice]',
  '用户{reported}，因存在违规行为，被用户{reporter}举报，经{reviewer}核实，已确认该用户存在{reason}的行为': 'User {reported} was reported by {reporter} for misconduct. After review by {reviewer}, the user was confirmed to have engaged in {reason}.',
  ' 用户': ' User ',
  '已被 ': 'was muted by ',
  '的禁言已被 ': 'was unmuted by ',
  '，理由：': ', reason: ',
  '超管': 'Owner',
  '管理': 'Admin',
  'AI': 'AI',
  'Lv.1': 'User',
  '在线': 'Online',
  '离线': 'Offline',
  '暂无成员': 'No members',
  '成员加载失败': 'Failed to load members',
  '未知用户': 'Unknown user',
  '禁言': 'Mute',
  '解除': 'Unmute',
  '图片处理失败': 'Image processing failed',
  '发送失败，请检查网络后重试。': 'Failed to send. Check your connection and try again.',
  '用户名不能为空': 'Display name cannot be empty',
  '用户名已更新': 'Display name updated',
  '更新失败，请检查网络后重试。': 'Update failed. Check your connection and try again.',
  '请输入大于0的整数分钟': 'Enter a whole number of minutes greater than 0',
  '已将': 'Muted ',
  ' 分钟': ' min',
  '禁言失败，请检查网络后重试。': 'Mute failed. Check your connection and try again.',
  '禁言至 ': 'Muted until ',
  '解除禁言失败，请检查网络后重试。': 'Unmute failed. Check your connection and try again.',
  '已解除禁言': ' was unmuted',
  '上传失败：': 'Upload failed: ',
  '头像更新成功！': 'Avatar updated!',
  '无法处理这张图片': 'Unable to process this image',
  '图片压缩失败': 'Image compression failed',
  '压缩后的图片读取失败': 'Unable to read the compressed image',
  '图片无法压缩到100KB以内，请选择较小的图片': 'Could not compress the image below 100 KB. Choose a smaller image.',
  '退出登录失败，请重试。': 'Log out failed. Please try again.',
  '请完整填写所有密码': 'Complete all password fields',
  '两次输入的新密码不一致': 'The new passwords do not match',
  '密码修改成功': 'Password changed successfully',
  '修改失败，请检查网络后重试。': 'Change failed. Check your connection and try again.',
  '请填写账户名和密码': 'Enter your account name and password',
  '请完整填写所有信息': 'Complete all fields',
  '两次输入的密码不一致': 'The passwords do not match',
  '注册成功，请使用账户名登录。': 'Account created. Please log in.',
  '暂时无法连接服务器，请稍后重试。': 'Unable to connect. Please try again later.',
  '连接异常': 'Connection error',
  '加载成员失败': 'Failed to load members',
  '请检查网络后重试。': 'Check your connection and try again.',
  '用户不存在': 'User not found',
  '未登录': 'Not logged in',
  '会话已过期，请重新登录': 'Session expired. Please log in again.',
  '账户名或密码错误': 'Incorrect account name or password',
  '账户名已存在': 'Account name already exists',
  '账户名、用户名和密码不能为空': 'Account name, display name, and password are required',
  '账户名最多30个字符，昵称长度不能超过24（半角1，全角2）': 'Account names are limited to 30 characters; display name width is limited to 24 (half-width 1, full-width 2)',
  '注册名额已满(100人)': 'Registration is full (100 users)',
  '请完整填写当前密码和新密码': 'Enter your current and new passwords',
  '新密码不能超过128个字符': 'New password cannot exceed 128 characters',
  '当前密码不正确': 'Current password is incorrect',
  '没有禁言权限': 'You do not have permission to mute members',
  '没有解除禁言权限': 'You do not have permission to unmute members',
  '成员无效': 'Invalid member',
  '禁言时长必须是大于0的整数分钟': 'Mute duration must be a positive whole number of minutes',
  '禁言理由不能为空': 'A mute reason is required',
  '禁言理由不能超过200个字符': 'Mute reason cannot exceed 200 characters',
  '禁言时长过长': 'Mute duration is too long',
  '成员不存在': 'Member not found',
  '管理只能禁言普通用户或AI用户': 'Admins can only mute regular or AI users',
  '不能禁言超管': 'The owner cannot be muted',
  '管理只能解除普通用户或AI用户的禁言': 'Admins can only unmute regular or AI users',
  '不能解除超管的禁言': 'The owner cannot be unmuted',
  '该成员当前未被禁言': 'This member is not currently muted',
  '昵称长度不能超过24（半角1，全角2）': 'Display name width cannot exceed 24 (half-width 1, full-width 2)',
  '头像必须压缩到100KB以内': 'Avatar must be compressed to under 100 KB',
  '消息不能为空且不能超过300字': 'Message cannot be empty or exceed 300 characters',
  '引用消息无效': 'Invalid quoted message',
  '请输入禁言理由': 'Enter a reason for the mute',
  '用户': 'User',
  '已被': 'was muted by',
  '的禁言已被': 'was unmuted by',
  '禁言失败': 'Mute failed'
};
const localeTranslations = {
  'zh-CN': {},
  en: translations,
  ja: {
    '[通知]': '[通知]',
    '用户{reported}，因存在违规行为，被用户{reporter}举报，经{reviewer}核实，已确认该用户存在{reason}的行为': '{reported}さんは迷惑行為のため{reporter}さんから報告され、{reviewer}さんの確認により{reason}の行為が認められました。',
    ' 用户': ' ユーザー',
    '已被 ': 'によってミュートされました: ',
    '的禁言已被 ': 'のミュートが解除されました: ',
    '，理由：': '、理由：',
    '解除禁言': 'ミュート解除',
    '禁言至 ': 'ミュート期限：',
    '将用户禁言': 'ユーザーをミュート',
    '禁言用户，时长（min）': 'ミュート時間（分）',
    '确认解除该成员的禁言吗？': 'このメンバーのミュートを解除しますか？',
    '极简聊窗': 'シンプルチャット',
    '极光聊窗': 'オーロラチャット',
    '极光 · 聊窗': 'オーロラ · チャット',
    '讯飞 · 星火AI': 'iFLYTEK · Spark AI',
    '讯飞星火 AI 选项': 'iFLYTEK Spark AI options',
    'Cloudflare · WorkersAI': 'Cloudflare · Workers AI',
    'Workers AI': 'Workers AI',
    'CLOUDFLARE WORKERS AI': 'CLOUDFLARE WORKERS AI',
    '有什么可以帮你？': '何をお手伝いしましょうか？',
    '问我任何问题，或告诉我你正在做什么。': '何でも質問したり、取り組んでいることを教えてください。',
    '给 Workers AI 发送消息...': 'Workers AI にメッセージを送信...',
    'Enter 发送 · Shift + Enter 换行': 'Enter で送信 · Shift + Enter で改行',
    '发送消息': 'メッセージを送信',
    'Workers AI 的回答可能不准确，请自行核实重要信息。': 'Workers AI の回答は誤っている場合があります。重要な情報はご確認ください。',
    'Cloudflare Workers AI': 'Cloudflare Workers AI',
    'Workers AI 服务尚未配置，请联系网站管理员。': 'Workers AI が設定されていません。管理者にお問い合わせください。',
    'Workers AI 请求失败，请稍后重试。': 'Workers AI リクエストに失敗しました。後でもう一度お試しください。',
    'Workers AI 服务响应超时，请稍后重试。': 'Workers AI がタイムアウトしました。後でもう一度お試しください。',
    'Workers AI 返回了无效响应，请稍后重试。': 'Workers AI から無効な応答がありました。後でもう一度お試しください。',
    'Workers AI 请求无效，请检查输入内容。': 'Workers AI リクエストが無効です。入力内容を確認してください。',
    'AI助手': 'AI アシスタント',
    'AI对话': 'AI 会話',
    '与讯飞星火模型对话。你发送的内容会传给讯飞星火处理。': 'iFLYTEK Spark モデルと会話できます。送信した内容は iFLYTEK Spark に送信されます。',
    '新建对话': '新しい会話',
    '你好！我是讯飞星火AI，有什么可以帮你？': 'こんにちは！iFLYTEK Spark AI です。何かお手伝いできますか？',
    '星火 AI 选项': 'Spark AI オプション',
    '思考模式': '思考モード',
    '思考模式说明': '思考モードの説明',
    '联网模式': 'ウェブ検索モード',
    '联网模式说明': 'ウェブ検索モードの説明',
    'Disabled：关闭思考；Auto：由模型自动决定是否思考；Enabled：始终启用思考。若模型返回无效内容，请关闭思考模式以减少Token使用。': 'Disabled：思考を無効化、Auto：モデルが思考するか自動判断、Enabled：常に思考を有効化します。モデルが無効な内容を返した場合は、思考モードをオフにしてトークン使用量を減らしてください。',
    '开启后，星火会搜索互联网中的相关信息，并参考搜索结果回答；关闭后仅使用模型已有知识。': '有効にすると、Spark がウェブ上の関連情報を検索し、その結果を参考に回答します。無効の場合はモデルの既存知識のみを使用します。',
    '思考': '思考',
    '讯飞星火AI': 'iFLYTEK Spark AI',
    '输入问题，Enter 发送，Shift + Enter 换行': '質問を入力してください。Enter で送信、Shift + Enter で改行します。',
    '对话仅保存在当前页面；刷新或登出后会清空。': '会話はこのページ内のみ保存され、再読み込みまたはログアウトで消去されます。',
    '输入问题': '質問を入力',
    '请输入问题': '質問を入力してください',
    '你': 'あなた',
    '思考中...': '考え中...',
    'AI暂时无法回复，请稍后重试。': 'AI は現在応答できません。後でもう一度お試しください。',
    '讯飞星火服务尚未配置，请联系网站管理员。': 'iFLYTEK Spark が設定されていません。管理者にお問い合わせください。',
    '星火AI请求失败，请联系管理员检查服务配置。': 'Spark AI リクエストに失敗しました。管理者に設定を確認してください。',
    '星火AI服务响应超时，请稍后重试。': 'Spark AI がタイムアウトしました。後でもう一度お試しください。',
    '讯飞星火服务返回了无效响应，请稍后重试。': 'iFLYTEK Spark から無効な応答がありました。後でもう一度お試しください。',
    '星火AI请求无效，请检查输入内容。': 'Spark AI リクエストが無効です。入力内容を確認してください。',
    '账户 · 安全': 'アカウント · セキュリティ',
    '外观 · 设置': '外観 · 設定',
    '管理员': '管理者',
    '禁言用户': 'ミュート管理',
    '待处理举报': '未処理の報告',
    '登出': 'ログアウト',
    '主题切换': 'テーマ',
    '在明亮与黑暗界面间切换。': 'ライトモードとダークモードを切り替えます。',
    '明亮界面': 'ライトモード',
    '黑暗界面': 'ダークモード',
    '主题配色': 'テーマカラー',
    '四种主题均支持明亮与黑暗界面。': '4種類のテーマはすべてライト・ダークに対応しています。',
    '绚彩极光 · 青蓝星海': '絢彩オーロラ · 青藍の星海',
    '深蓝幽紫 · 幻海之境': '深藍幽紫 · 幻海の境',
    '橙霞入暮 · 藏蓝沉星': '橙霞の夕暮れ · 藍に沈む星',
    '初音青绿 · 蔚蓝天依': '初音グリーン · 蔚藍の天依',
    '语言': '言語',
    '更改界面显示语言。': '画面の表示言語を変更します。',
    '管理你的头像、昵称与登录安全。': 'アバター、表示名、ログインの安全性を管理します。',
    '登录后加入对话，和大家分享此刻。': 'ログインして会話に参加し、今この瞬間を共有しましょう。',
    '账户名': 'アカウント名',
    '消息长度不足，无法添加提及': 'メッセージの文字数上限によりメンションを追加できません',
    '请输入账户名': 'アカウント名を入力',
    '密码': 'パスワード',
    '请输入密码': 'パスワードを入力',
    '登录': 'ログイン',
    '注册新账号': '新規登録',
    '请使用账户名登录': 'アカウント名でログインしてください',
    '支持或改编这个项目？': 'このプロジェクトを応援・改変しますか？',
    '给 GitHub 仓库点个 Star': 'GitHubでStarを付ける',
    'B站反馈 · 学习交流': 'Bilibili · バグ報告・学習交流',
    '更新日志': '更新履歴',
    '创建账号': 'アカウント作成',
    '设置登录账户名和聊天室显示名称。': 'ログイン名とチャットで表示する名前を設定します。',
    '账户名（唯一）': 'アカウント名（重複不可）',
    '用于登录，不能与他人重复': 'ログインに使用します。他のユーザーと重複できません',
    '用户名（对外展示）': '表示名',
    '其他成员看到的名称': '他のメンバーに表示される名前',
    '确认密码': 'パスワード確認',
    '请再次输入密码': 'パスワードを再入力',
    '返回登录': 'ログインに戻る',
    '确认注册': '登録する',
    '正在连接...': '接続中...',
    '人在线': '人がオンライン',
    '成员': 'メンバー',
    '切换到极夜': 'ダークモードに切替',
    '切换到白昼': 'ライトモードに切替',
    '打开我的资料': 'プロフィールを開く',
    '聊天消息': 'チャットメッセージ',
    '这里暂时还没有消息': 'メッセージはまだありません',
    '发送第一条消息，开启对话吧。': '最初のメッセージを送って会話を始めましょう。',
    '说点什么吧...': 'メッセージを入力...',
    '输入消息': 'メッセージを入力',
    'Enter 发送 · Shift + Enter 换行': 'Enterで送信 · Shift + Enterで改行',
    '发送': '送信',
    '发送消息': 'メッセージを送信',
    '引用': '引用',
    '引用:': '返信先:',
    '取消引用': '引用を取り消す',
    '举报': '報告',
    '举报用户': 'ユーザーを報告',
    '举报用户{name}': '{name}さんを報告',
    '人工审核': '人による審査',
    '选择一位管理或超管进行审核': '管理者またはスーパー管理者を選択',
    '使用第三方 AI 内容审核接口': '第三者の AI 審査 API を使用',
    '选择审核员': '審査担当者を選択',
    '提交举报': '報告を送信',
    '举报理由': '報告理由',
    'AI智能处理': 'AI審査',
    'AI审核（接口1）': 'AI审核（接口1）',
    'AI审核（接口2）': 'AI审核（接口2）',
    'AI审核（接口3）': 'AI审核（接口3）',
    '敏感词检测': '敏感語チェック',
    'UAPIS敏感词检测': 'UAPIS 敏感語チェック',
    '快速检测 · 接口3': 'クイックチェック · API 3',
    '命中敏感词：': '該当する敏感語：',
    'UAPIS': 'UAPIS',
    '极数本源': '極数本源',
    '提交审核': '審査を送信',
    '举报审核邮件': '報告受信箱',
    '待审核': '審査待ち',
    '消息内容': 'メッセージ',
    '举报人': '報告者',
    '提交': '送信',
    '违规': '違反',
    '正常': '問題なし',
    '未知': '不明',
    '无': 'なし',
    '完成': '完了',
    '暂无待审核举报': '審査待ちの報告はありません',
    '举报已提交': '報告を送信しました',
    'AI审核结果': 'AI審査結果',
    '确认违规审核': '違反内容の審査を確定',
    '违规内容': '違反内容',
    '请填写确认的违规内容': '確認した違反内容を入力してください',
    '违规内容不能为空且不能超过500个字符': '違反内容を入力してください（500文字以内）',
    'AI审核接口': 'AI審査 API',
    '审核结论': '審査結果',
    '风险等级': 'リスクレベル',
    '命中类别': '該当カテゴリ',
    '命中内容': '該当内容',
    '内容审核': 'コンテンツ審査',
    '文本审核': 'テキスト審査',
    '提交后，所选消息内容会发送至对应的第三方审核接口。': '選択したメッセージは、選択した第三者審査 API に送信されます。',
    '本次消息内容会发送至所选第三方审核接口。': 'メッセージは選択した第三者審査 API に送信されます。',
    '暂无可选审核员': '選択できる審査担当者はいません',
    '请选择审核员': '審査担当者を選択してください',
    '请选择AI审核接口': 'AI審査 API を選択してください',
    '不能举报自己的消息': '自分のメッセージは報告できません',
    '举报的消息不存在或已过期': '報告するメッセージが存在しないか、有効期限切れです',
    '没有举报审核权限': '報告を審査する権限がありません',
    '举报审核加载失败': '報告受信箱の読み込みに失敗しました',
    '举报的消息无效': '報告するメッセージが無効です',
    '举报理由不能为空且不能超过500个字符': '報告理由を入力してください（500文字以内）',
    '所选审核员无效': '選択した審査担当者が無効です',
    'AI审核接口无效': 'AI審査 API が無効です',
    '消息长度不符合AI审核接口要求': 'メッセージの長さが AI 審査 API の制限外です',
    'AI审核服务尚未配置，请联系网站管理员': 'AI審査が設定されていません。管理者にお問い合わせください。',
    'AI审核服务暂时不可用，请稍后重试': 'AI審査は一時的に利用できません。後でもう一度お試しください。',
    'AI审核未能完成，请稍后重试': 'AI審査を完了できませんでした。後でもう一度お試しください。',
    '审核结果无效': '審査結果が無効です',
    '举报记录无效': '報告が無効です',
    '举报已处理或不属于当前审核员': 'この報告は処理済みか、別の担当者に割り当てられています',
    '举报提交失败，请检查网络后重试。': '報告を送信できませんでした。接続を確認して再試行してください。',
    '审核失败，请稍后重试。': '審査に失敗しました。後でもう一度お試しください。',
    '举报提交者：': '報告者：',
    '举报理由：': '報告理由：',
    '审核结论：': '審査結果：',
    '风险等级：': 'リスクレベル：',
    '命中类别：': '該当カテゴリ：',
    '命中内容：': '該当内容：',
    '提及用户': 'ユーザーにメンション',
    '没有匹配的用户': '該当するユーザーはいません',
    '选择语言': '言語を選択',
    '显示偏好': '表示設定',
    '极夜': 'ダーク',
    '白昼': 'ライト',
    '简体中文': '簡体字中国語',
    '日本語': '日本語',
    '繁體中文': '繁体字中国語',
    '极简聊窗成员': 'シンプルチャットのメンバー',
    '极光聊窗成员': 'オーロラチャットのメンバー',
    '正在加载...': '読み込み中...',
    '关闭成员列表': 'メンバー一覧を閉じる',
    '我的': 'マイプロフィール',
    '管理你的个人资料': 'プロフィールを管理',
    '关闭': '閉じる',
    '点击更改头像': 'クリックしてアバターを変更',
    '选择头像': 'アバターを選択',
    '更改用户名': '表示名を変更',
    '账户名：': 'アカウント名：',
    '新用户名': '新しい表示名',
    '取消': 'キャンセル',
    '保存': '保存',
    '修改密码': 'パスワード変更',
    '退出登录': 'ログアウト',
    '请先验证当前密码': '現在のパスワードを確認してください',
    '当前密码': '現在のパスワード',
    '新密码': '新しいパスワード',
    '确认新密码': '新しいパスワードを確認',
    '确认修改': '変更を確定',
    '用户信息': 'ユーザー情報',
    '设置禁言时长，单位为分钟': 'ミュート時間を分単位で設定',
    '理由': '理由',
    '请填写禁言理由': 'ミュートの理由を入力してください',
    '确认': '確認',
    '在线': 'オンライン',
    '离线': 'オフライン',
    '暂无成员': 'メンバーはいません',
    '成员加载失败': 'メンバーの読み込みに失敗しました',
    '未知用户': '不明なユーザー',
    '禁言': 'ミュート',
    '解除': '解除',
    '图片处理失败': '画像処理に失敗しました',
    '发送失败，请检查网络后重试。': '送信に失敗しました。ネットワークを確認して再試行してください。',
    '用户名不能为空': '表示名を入力してください',
    '用户名已更新': '表示名を更新しました',
    '更新失败，请检查网络后重试。': '更新に失敗しました。ネットワークを確認して再試行してください。',
    '请输入大于0的整数分钟': '1以上の整数で分数を入力してください',
    '禁言失败，请检查网络后重试。': 'ミュートに失敗しました。ネットワークを確認して再試行してください。',
    '解除禁言失败，请检查网络后重试。': 'ミュート解除に失敗しました。ネットワークを確認して再試行してください。',
    '头像更新成功！': 'アバターを更新しました。',
    '无法处理这张图片': 'この画像を処理できません',
    '图片压缩失败': '画像の圧縮に失敗しました',
    '退出登录失败，请重试。': 'ログアウトに失敗しました。再試行してください。',
    '请完整填写所有密码': 'すべてのパスワード欄を入力してください',
    '两次输入的新密码不一致': '新しいパスワードが一致しません',
    '密码修改成功': 'パスワードを変更しました',
    '修改失败，请检查网络后重试。': '変更に失敗しました。ネットワークを確認して再試行してください。',
    '请填写账户名和密码': 'アカウント名とパスワードを入力してください',
    '请完整填写所有信息': 'すべての項目を入力してください',
    '两次输入的密码不一致': 'パスワードが一致しません',
    '注册成功，请使用账户名登录。': '登録しました。アカウント名でログインしてください。',
    '暂时无法连接服务器，请稍后重试。': 'サーバーに接続できません。しばらくしてから再試行してください。',
    '连接异常': '接続エラー',
    '加载成员失败': 'メンバーの読み込みに失敗しました',
    '请检查网络后重试。': 'ネットワークを確認して再試行してください。',
    '用户不存在': 'ユーザーが見つかりません',
    '未登录': 'ログインしていません',
    '会话已过期，请重新登录': 'セッションの有効期限が切れました。再度ログインしてください',
    '账户名或密码错误': 'アカウント名またはパスワードが正しくありません',
    '账户名已存在': 'このアカウント名は既に使用されています',
    '注册名额已满(100人)': '登録上限（100人）に達しました',
    '当前密码不正确': '現在のパスワードが正しくありません',
    '没有禁言权限': 'ミュートする権限がありません',
    '没有解除禁言权限': 'ミュートを解除する権限がありません',
    '禁言理由不能为空': 'ミュートの理由を入力してください',
    '不能禁言超管': 'オーナーをミュートできません',
    '该成员当前未被禁言': 'このメンバーはミュートされていません',
    '消息不能为空且不能超过300字': 'メッセージは空欄にできず、300文字以内です',
    '引用消息无效': '引用メッセージが無効です',
    '用户': 'ユーザー',
    '超管': 'オーナー',
    '管理': '管理者',
    'Lv.1': 'ユーザー',
    'Muted {name} for {minutes} min': '{name}を{minutes}分間ミュートしました',
    'Profile of {name}': '{name}のプロフィール',
    'Mute {name}': '{name}をミュート',
    'Mute {name} for (min)': '{name}のミュート時間（分）',
    'Unmute {name}': '{name}のミュートを解除',
    'Unmute {name}?': '{name}のミュートを解除しますか？',
    "View {name}'s profile": '{name}のプロフィールを表示',
    '{name} was unmuted': '{name}のミュートを解除しました',
    '{count} member': '{count}人のメンバー',
    '{count} members': '{count}人のメンバー',
    '共 {count} 位成员': '{count}人のメンバー',
    '账户名只能包含大小写英文字母、数字、下划线和美元符号（$）': 'アカウント名には英字、数字、アンダースコア、ドル記号（$）のみ使用できます',
    '输入分钟数（min）': '分数を入力',
    'AI': 'AI',
    '已将': 'ミュートしました：',
    ' 分钟': ' 分',
    '已解除禁言': 'のミュートを解除しました',
    '上传失败：': 'アップロード失敗：',
    '压缩后的图片读取失败': '圧縮画像の読み込みに失敗しました',
    '图片无法压缩到100KB以内，请选择较小的图片': '画像を100 KB未満に圧縮できません。小さい画像を選んでください',
    '账户名、用户名和密码不能为空': 'アカウント名、表示名、パスワードを入力してください',
    '账户名最多30个字符，昵称长度不能超过24（半角1，全角2）': 'アカウント名は30文字以内、表示名の幅は24以内です（半角1、全角2）',
    '请完整填写当前密码和新密码': '現在と新しいパスワードを入力してください',
    '新密码不能超过128个字符': '新しいパスワードは128文字以内です',
    '成员无效': '無効なメンバーです',
    '禁言时长必须是大于0的整数分钟': 'ミュート時間は1分以上の整数にしてください',
    '禁言理由不能超过200个字符': 'ミュート理由は200文字以内です',
    '禁言时长过长': 'ミュート時間が長すぎます',
    '成员不存在': 'メンバーが見つかりません',
    '管理只能禁言普通用户或AI用户': '管理者は一般ユーザーまたはAIユーザーのみミュートできます',
    '管理只能解除普通用户或AI用户的禁言': '管理者は一般ユーザーまたはAIユーザーのみミュート解除できます',
    '不能解除超管的禁言': 'オーナーのミュートを解除できません',
    '昵称长度不能超过24（半角1，全角2）': '表示名の幅は24以内です（半角1、全角2）',
    '头像必须压缩到100KB以内': 'アバターは100 KB未満に圧縮してください',
    '请输入禁言理由': 'ミュートの理由を入力してください',
    '已被': 'によりミュートされました',
    '的禁言已被': 'のミュートが解除されました',
    '禁言失败': 'ミュートに失敗しました'
  },
  'zh-TW': {
    '[通知]': '[通知]',
    '用户{reported}，因存在违规行为，被用户{reporter}举报，经{reviewer}核实，已确认该用户存在{reason}的行为': '使用者 {reported} 因有違規行為遭使用者 {reporter} 檢舉，經 {reviewer} 查證，確認該使用者有 {reason} 的行為。',
    ' 用户': ' 使用者',
    '已被 ': '已被 ',
    '的禁言已被 ': '的禁言已被 ',
    '，理由：': '，原因：',
    '解除禁言': '解除禁言',
    '禁言至 ': '禁言至 ',
    '将用户禁言': '將使用者禁言',
    '禁言用户，时长（min）': '禁言時間（分鐘）',
    '确认解除该成员的禁言吗？': '確定要解除該成員的禁言嗎？',
    '极简聊窗': '極簡聊窗',
    '极光聊窗': '極光聊窗',
    '极光 · 聊窗': '極光 · 聊窗',
    '讯飞 · 星火AI': '訊飛 · 星火AI',
    '讯飞星火 AI 选项': '訊飛星火 AI 選項',
    'Cloudflare · WorkersAI': 'Cloudflare · WorkersAI',
    'Workers AI': 'Workers AI',
    'CLOUDFLARE WORKERS AI': 'CLOUDFLARE WORKERS AI',
    '有什么可以帮你？': '有什麼可以幫你？',
    '问我任何问题，或告诉我你正在做什么。': '歡迎提問，或告訴我你正在處理什麼。',
    '给 Workers AI 发送消息...': '傳送訊息給 Workers AI...',
    'Enter 发送 · Shift + Enter 换行': 'Enter 傳送 · Shift + Enter 換行',
    '发送消息': '傳送訊息',
    'Workers AI 的回答可能不准确，请自行核实重要信息。': 'Workers AI 的回答可能不準確，重要資訊請自行查證。',
    'Cloudflare Workers AI': 'Cloudflare Workers AI',
    'Workers AI 服务尚未配置，请联系网站管理员。': 'Workers AI 尚未設定，請聯絡網站管理員。',
    'Workers AI 请求失败，请稍后重试。': 'Workers AI 請求失敗，請稍後再試。',
    'Workers AI 服务响应超时，请稍后重试。': 'Workers AI 服務回應逾時，請稍後再試。',
    'Workers AI 返回了无效响应，请稍后重试。': 'Workers AI 傳回無效回應，請稍後再試。',
    'Workers AI 请求无效，请检查输入内容。': 'Workers AI 請求無效，請檢查輸入內容。',
    'AI助手': 'AI 助手',
    'AI对话': 'AI 對話',
    '与讯飞星火模型对话。你发送的内容会传给讯飞星火处理。': '與訊飛星火模型對話。您傳送的內容會提供給訊飛星火處理。',
    '新建对话': '新增對話',
    '你好！我是讯飞星火AI，有什么可以帮你？': '你好！我是訊飛星火AI，有什麼可以幫你？',
    '星火 AI 选项': '星火 AI 選項',
    '思考模式': '思考模式',
    '思考模式说明': '思考模式說明',
    '联网模式': '網路搜尋模式',
    '联网模式说明': '網路搜尋模式說明',
    'Disabled：关闭思考；Auto：由模型自动决定是否思考；Enabled：始终启用思考。若模型返回无效内容，请关闭思考模式以减少Token使用。': 'Disabled：關閉思考；Auto：由模型自動決定是否思考；Enabled：一律啟用思考。若模型回傳無效內容，請關閉思考模式以減少 Token 使用量。',
    '开启后，星火会搜索互联网中的相关信息，并参考搜索结果回答；关闭后仅使用模型已有知识。': '開啟後，星火會搜尋網路上的相關資訊，並參考搜尋結果回答；關閉後僅使用模型既有知識。',
    '思考': '思考',
    '讯飞星火AI': '訊飛星火AI',
    '输入问题，Enter 发送，Shift + Enter 换行': '輸入問題，按 Enter 傳送，Shift + Enter 換行。',
    '对话仅保存在当前页面；刷新或登出后会清空。': '對話僅保存在目前頁面；重新整理或登出後會清除。',
    '输入问题': '輸入問題',
    '请输入问题': '請輸入問題',
    '你': '你',
    '思考中...': '思考中...',
    'AI暂时无法回复，请稍后重试。': 'AI 暫時無法回覆，請稍後再試。',
    '讯飞星火服务尚未配置，请联系网站管理员。': '訊飛星火服務尚未設定，請聯絡網站管理員。',
    '星火AI请求失败，请联系管理员检查服务配置。': '星火 AI 請求失敗，請聯絡管理員檢查服務設定。',
    '星火AI服务响应超时，请稍后重试。': '星火 AI 服務回應逾時，請稍後再試。',
    '讯飞星火服务返回了无效响应，请稍后重试。': '訊飛星火服務傳回無效回應，請稍後再試。',
    '星火AI请求无效，请检查输入内容。': '星火 AI 請求無效，請檢查輸入內容。',
    '账户 · 安全': '帳戶 · 安全',
    '外观 · 设置': '外觀 · 設定',
    '管理员': '管理員',
    '禁言用户': '管理禁言使用者',
    '待处理举报': '待處理檢舉',
    '登出': '登出',
    '主题切换': '主題切換',
    '在明亮与黑暗界面间切换。': '切換明亮與黑暗介面。',
    '明亮界面': '明亮介面',
    '黑暗界面': '黑暗介面',
    '主题配色': '主題配色',
    '四种主题均支持明亮与黑暗界面。': '四種主題皆支援明亮與黑暗介面。',
    '绚彩极光 · 青蓝星海': '絢彩極光 · 青藍星海',
    '深蓝幽紫 · 幻海之境': '深藍幽紫 · 幻海之境',
    '橙霞入暮 · 藏蓝沉星': '橙霞入暮 · 藏藍沉星',
    '初音青绿 · 蔚蓝天依': '初音青綠 · 蔚藍天依',
    '语言': '語言',
    '更改界面显示语言。': '更改介面顯示語言。',
    '管理你的头像、昵称与登录安全。': '管理你的頭像、暱稱與登入安全。',
    '登录后加入对话，和大家分享此刻。': '登入後加入對話，和大家分享此刻。',
    '账户名': '帳號名稱',
    '消息长度不足，无法添加提及': '訊息字數已達上限，無法新增提及',
    '请输入账户名': '請輸入帳號名稱',
    '密码': '密碼',
    '请输入密码': '請輸入密碼',
    '登录': '登入',
    '注册新账号': '註冊新帳號',
    '请使用账户名登录': '請使用帳號名稱登入',
    '支持或改编这个项目？': '想支持或改編這個專案嗎？',
    '给 GitHub 仓库点个 Star': '到 GitHub 專案按個 Star',
    'B站反馈 · 学习交流': 'Bilibili · 錯誤回報與交流',
    '更新日志': '更新紀錄',
    '创建账号': '建立帳號',
    '设置登录账户名和聊天室显示名称。': '設定登入帳號名稱和聊天室顯示名稱。',
    '账户名（唯一）': '帳號名稱（不可重複）',
    '用于登录，不能与他人重复': '用於登入，不能與他人重複',
    '用户名（对外展示）': '顯示名稱',
    '其他成员看到的名称': '其他成員看到的名稱',
    '确认密码': '確認密碼',
    '请再次输入密码': '請再次輸入密碼',
    '返回登录': '返回登入',
    '确认注册': '確認註冊',
    '正在连接...': '正在連線...',
    '人在线': '人在線上',
    '成员': '成員',
    '切换到极夜': '切換至深色模式',
    '切换到白昼': '切換至淺色模式',
    '打开我的资料': '開啟我的個人資料',
    '聊天消息': '聊天訊息',
    '这里暂时还没有消息': '目前還沒有訊息',
    '发送第一条消息，开启对话吧。': '傳送第一則訊息，開始聊天吧。',
    '说点什么吧...': '說點什麼吧...',
    '输入消息': '輸入訊息',
    'Enter 发送 · Shift + Enter 换行': 'Enter 傳送 · Shift + Enter 換行',
    '发送': '傳送',
    '发送消息': '傳送訊息',
    '引用': '引用',
    '引用:': '回覆給：',
    '取消引用': '取消引用',
    '举报': '檢舉',
    '举报用户': '檢舉使用者',
    '举报用户{name}': '檢舉使用者 {name}',
    '人工审核': '人工審核',
    '选择一位管理或超管进行审核': '選擇管理員或超級管理員進行審核',
    '使用第三方 AI 内容审核接口': '使用第三方 AI 內容審核介面',
    '选择审核员': '選擇審核員',
    '提交举报': '提交檢舉',
    '举报理由': '檢舉原因',
    'AI智能处理': 'AI 智慧審核',
    'AI审核（接口1）': 'AI审核（接口1）',
    'AI审核（接口2）': 'AI审核（接口2）',
    'AI审核（接口3）': 'AI审核（介面3）',
    '敏感词检测': '敏感詞檢測',
    'UAPIS敏感词检测': 'UAPIS 敏感詞檢測',
    '快速检测 · 接口3': '快速檢測 · 介面3',
    '命中敏感词：': '命中敏感詞：',
    'UAPIS': 'UAPIS',
    '极数本源': '極數本源',
    '提交审核': '提交審核',
    '举报审核邮件': '檢舉審核信箱',
    '待审核': '待審核',
    '消息内容': '訊息內容',
    '举报人': '檢舉人',
    '提交': '提交',
    '违规': '違規',
    '正常': '正常',
    '未知': '未知',
    '无': '無',
    '完成': '完成',
    '暂无待审核举报': '目前沒有待審核的檢舉',
    '举报已提交': '檢舉已提交',
    'AI审核结果': 'AI 審核結果',
    '确认违规审核': '確認違規審核',
    '违规内容': '違規內容',
    '请填写确认的违规内容': '請填寫確認的違規內容',
    '违规内容不能为空且不能超过500个字符': '違規內容不得空白且不能超過 500 個字元',
    'AI审核接口': 'AI 審核介面',
    '审核结论': '審核結論',
    '风险等级': '風險等級',
    '命中类别': '命中類別',
    '命中内容': '命中內容',
    '内容审核': '內容審核',
    '文本审核': '文字審核',
    '提交后，所选消息内容会发送至对应的第三方审核接口。': '提交後，所選訊息內容會傳送至對應的第三方審核介面。',
    '本次消息内容会发送至所选第三方审核接口。': '此訊息內容將傳送至所選的第三方審核介面。',
    '暂无可选审核员': '目前沒有可選的審核員',
    '请选择审核员': '請選擇審核員',
    '请选择AI审核接口': '請選擇 AI 審核介面',
    '不能举报自己的消息': '不能檢舉自己的訊息',
    '举报的消息不存在或已过期': '檢舉的訊息不存在或已過期',
    '没有举报审核权限': '沒有檢舉審核權限',
    '举报审核加载失败': '檢舉審核信箱載入失敗',
    '举报的消息无效': '檢舉的訊息無效',
    '举报理由不能为空且不能超过500个字符': '檢舉原因不得空白且不能超過 500 個字元',
    '所选审核员无效': '所選的審核員無效',
    'AI审核接口无效': 'AI 審核介面無效',
    '消息长度不符合AI审核接口要求': '訊息長度不符合 AI 審核介面的限制',
    'AI审核服务尚未配置，请联系网站管理员': '尚未設定 AI 審核服務，請聯絡網站管理員',
    'AI审核服务暂时不可用，请稍后重试': 'AI 審核服務暫時無法使用，請稍後再試',
    'AI审核未能完成，请稍后重试': 'AI 審核未能完成，請稍後再試',
    '审核结果无效': '審核結果無效',
    '举报记录无效': '檢舉記錄無效',
    '举报已处理或不属于当前审核员': '此檢舉已處理或不屬於目前的審核員',
    '举报提交失败，请检查网络后重试。': '檢舉提交失敗，請檢查網路後再試',
    '审核失败，请稍后重试。': '審核失敗，請稍後再試',
    '举报提交者：': '檢舉人：',
    '举报理由：': '檢舉原因：',
    '审核结论：': '審核結論：',
    '风险等级：': '風險等級：',
    '命中类别：': '命中類別：',
    '命中内容：': '命中內容：',
    '提及用户': '提及使用者',
    '没有匹配的用户': '找不到符合的使用者',
    '选择语言': '選擇語言',
    '显示偏好': '顯示偏好',
    '极夜': '深色',
    '白昼': '淺色',
    '简体中文': '簡體中文',
    '日本語': '日文',
    '繁體中文': '繁體中文',
    '极简聊窗成员': '極簡聊窗成員',
    '极光聊窗成员': '極光聊窗成員',
    '正在加载...': '載入中...',
    '关闭成员列表': '關閉成員清單',
    '我的': '我的個人資料',
    '管理你的个人资料': '管理你的個人資料',
    '关闭': '關閉',
    '点击更改头像': '點擊更改頭像',
    '选择头像': '選擇頭像',
    '更改用户名': '更改顯示名稱',
    '账户名：': '帳號名稱：',
    '新用户名': '新顯示名稱',
    '取消': '取消',
    '保存': '儲存',
    '修改密码': '修改密碼',
    '退出登录': '登出',
    '请先验证当前密码': '請先驗證目前密碼',
    '当前密码': '目前密碼',
    '新密码': '新密碼',
    '确认新密码': '確認新密碼',
    '确认修改': '確認修改',
    '用户信息': '使用者資訊',
    '设置禁言时长，单位为分钟': '設定禁言時間，單位為分鐘',
    '理由': '原因',
    '请填写禁言理由': '請填寫禁言原因',
    '确认': '確認',
    '在线': '在線上',
    '离线': '離線',
    '暂无成员': '目前沒有成員',
    '成员加载失败': '載入成員失敗',
    '未知用户': '未知使用者',
    '禁言': '禁言',
    '解除': '解除',
    '图片处理失败': '圖片處理失敗',
    '发送失败，请检查网络后重试。': '傳送失敗，請檢查網路後重試。',
    '用户名不能为空': '顯示名稱不能空白',
    '用户名已更新': '顯示名稱已更新',
    '更新失败，请检查网络后重试。': '更新失敗，請檢查網路後重試。',
    '请输入大于0的整数分钟': '請輸入大於 0 的整數分鐘',
    '禁言失败，请检查网络后重试。': '禁言失敗，請檢查網路後重試。',
    '解除禁言失败，请检查网络后重试。': '解除禁言失敗，請檢查網路後重試。',
    '头像更新成功！': '頭像更新成功！',
    '无法处理这张图片': '無法處理這張圖片',
    '图片压缩失败': '圖片壓縮失敗',
    '退出登录失败，请重试。': '登出失敗，請重試。',
    '请完整填写所有密码': '請填寫所有密碼欄位',
    '两次输入的新密码不一致': '兩次輸入的新密碼不一致',
    '密码修改成功': '密碼修改成功',
    '修改失败，请检查网络后重试。': '修改失敗，請檢查網路後重試。',
    '请填写账户名和密码': '請輸入帳號名稱和密碼',
    '请完整填写所有信息': '請填寫所有資料',
    '两次输入的密码不一致': '兩次輸入的密碼不一致',
    '注册成功，请使用账户名登录。': '註冊成功，請使用帳號名稱登入。',
    '暂时无法连接服务器，请稍后重试。': '暫時無法連線至伺服器，請稍後重試。',
    '连接异常': '連線異常',
    '加载成员失败': '載入成員失敗',
    '请检查网络后重试。': '請檢查網路後重試。',
    '用户不存在': '使用者不存在',
    '未登录': '尚未登入',
    '会话已过期，请重新登录': '工作階段已過期，請重新登入',
    '账户名或密码错误': '帳號名稱或密碼錯誤',
    '账户名已存在': '帳號名稱已存在',
    '注册名额已满(100人)': '註冊名額已滿（100 人）',
    '当前密码不正确': '目前密碼不正確',
    '没有禁言权限': '沒有禁言權限',
    '没有解除禁言权限': '沒有解除禁言的權限',
    '禁言理由不能为空': '禁言原因不能空白',
    '不能禁言超管': '不能禁言擁有者',
    '该成员当前未被禁言': '該成員目前未被禁言',
    '消息不能为空且不能超过300字': '訊息不能空白且不得超過 300 字',
    '引用消息无效': '引用訊息無效',
    '用户': '使用者',
    '超管': '擁有者',
    '管理': '管理員',
    'Lv.1': '使用者',
    'Muted {name} for {minutes} min': '已將 {name} 禁言 {minutes} 分鐘',
    'Profile of {name}': '{name}的個人資料',
    'Mute {name}': '將 {name} 禁言',
    'Mute {name} for (min)': '將 {name} 禁言（分鐘）',
    'Unmute {name}': '解除 {name} 的禁言',
    'Unmute {name}?': '確定要解除 {name} 的禁言嗎？',
    "View {name}'s profile": '查看 {name} 的個人資料',
    '{name} was unmuted': '已解除 {name} 的禁言',
    '{count} member': '共 {count} 位成員',
    '{count} members': '共 {count} 位成員',
    '共 {count} 位成员': '共 {count} 位成員',
    '账户名只能包含大小写英文字母、数字、下划线和美元符号（$）': '帳號名稱只能包含英文字母、數字、底線和美元符號（$）',
    '输入分钟数（min）': '請輸入分鐘數',
    'AI': 'AI',
    '已将': '已將其禁言：',
    ' 分钟': ' 分鐘',
    '已解除禁言': '已解除禁言',
    '上传失败：': '上傳失敗：',
    '压缩后的图片读取失败': '讀取壓縮後的圖片失敗',
    '图片无法压缩到100KB以内，请选择较小的图片': '圖片無法壓縮至 100 KB 以下，請選擇較小的圖片',
    '账户名、用户名和密码不能为空': '帳號名稱、顯示名稱和密碼不能空白',
    '账户名最多30个字符，昵称长度不能超过24（半角1，全角2）': '帳號名稱最多 30 個字元；暱稱寬度不得超過 24（半形 1、全形 2）',
    '请完整填写当前密码和新密码': '請填寫目前密碼和新密碼',
    '新密码不能超过128个字符': '新密碼不得超過 128 個字元',
    '成员无效': '成員無效',
    '禁言时长必须是大于0的整数分钟': '禁言時間必須是大於 0 的整數分鐘',
    '禁言理由不能超过200个字符': '禁言原因不得超過 200 個字元',
    '禁言时长过长': '禁言時間過長',
    '成员不存在': '成員不存在',
    '管理只能禁言普通用户或AI用户': '管理員只能禁言一般使用者或 AI 使用者',
    '管理只能解除普通用户或AI用户的禁言': '管理員只能解除一般使用者或 AI 使用者的禁言',
    '不能解除超管的禁言': '不能解除擁有者的禁言',
    '昵称长度不能超过24（半角1，全角2）': '暱稱寬度不得超過 24（半形 1、全形 2）',
    '头像必须压缩到100KB以内': '頭像必須壓縮至 100 KB 以下',
    '请输入禁言理由': '請輸入禁言原因',
    '已被': '已被',
    '的禁言已被': '的禁言已被',
    '禁言失败': '禁言失敗'
  }
};
const reverseTranslations = Object.fromEntries(
  Object.entries(localeTranslations).map(([language, dictionary]) => [
    language,
    Object.fromEntries(Object.entries(dictionary).map(([source, translated]) => [translated, source]))
  ])
);
const simplifiedChineseTemplates = {
  'Muted {name} for {minutes} min': '已将{name}禁言 {minutes} 分钟',
  'Profile of {name}': '用户{name}的个人资料',
  'Mute {name}': '将用户{name}禁言',
  'Mute {name} for (min)': '禁言用户{name}，时长（min）',
  'Unmute {name}': '解除用户{name}的禁言',
  'Unmute {name}?': '确认解除{name}的禁言吗？',
  "View {name}'s profile": '查看用户{name}的资料',
  '{name} was unmuted': '{name}已解除禁言',
  '{count} member': '共 {count} 位成员',
  '{count} members': '共 {count} 位成员'
};
const messageTimeFormatters = {
  'zh-CN': new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  en: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
  ja: new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
  'zh-TW': new Intl.DateTimeFormat('zh-TW', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
};

function sourceText(text) {
  if (Object.prototype.hasOwnProperty.call(translations, text)) return text;
  const currentDictionary = reverseTranslations[currentLanguage];
  if (Object.prototype.hasOwnProperty.call(currentDictionary, text)) return currentDictionary[text];
  for (const dictionary of Object.values(reverseTranslations)) {
    if (Object.prototype.hasOwnProperty.call(dictionary, text)) return dictionary[text];
  }
  return text;
}

function localizeText(text) {
  const source = sourceText(text);
  if (currentLanguage === 'zh-CN') return source;
  return localeTranslations[currentLanguage]?.[source] || translations[source] || source;
}

function localizeFormat(template, values) {
  const localized = currentLanguage === 'zh-CN'
    ? simplifiedChineseTemplates[template] || template
    : localizeText(template);
  return localized.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
}

function applyLanguage(root = document) {
  document.documentElement.lang = currentLanguage;
  const excluded = '.sender-name, .content, .quoted-message, .member-name, .notification-user, .notification-reason, #my-button-name, #my-profile-name, #user-info-name, #my-account, #user-info-account, .language-picker, input, textarea, script, style';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement.closest(excluded)) continue;
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
    const original = originalTextNodes.get(node);
    const trimmed = original.trim();
    const translated = localizeText(trimmed);
    const leading = original.match(/^\s*/)[0];
    const trailing = original.match(/\s*$/)[0];
    const localizedValue = `${leading}${translated}${trailing}`;
    if (node.nodeValue !== localizedValue) node.nodeValue = localizedValue;
  }
  root.querySelectorAll?.('*').forEach(element => {
    ['placeholder', 'aria-label', 'title'].forEach(attribute => {
      if (!element.hasAttribute(attribute)) return;
      let originals = originalAttributes.get(element);
      if (!originals) {
        originals = {};
        originalAttributes.set(element, originals);
      }
      if (!(attribute in originals)) originals[attribute] = element.getAttribute(attribute);
      const original = originals[attribute];
      const translated = localizeText(original);
      if (element.getAttribute(attribute) !== translated) element.setAttribute(attribute, translated);
    });
  });
  const languageButton = document.getElementById('language-toggle');
  if (languageButton) languageButton.setAttribute('aria-label', localizeText('选择语言'));
  const languageLabel = document.getElementById('current-language-label');
  if (languageLabel) {
    languageLabel.textContent = ({
      'zh-CN': '简体中文',
      en: 'English',
      ja: '日本語',
      'zh-TW': '繁體中文'
    })[currentLanguage];
  }
  document.querySelectorAll('[data-theme-choice]').forEach(option => {
    option.setAttribute('aria-pressed', String(option.dataset.themeChoice === (document.documentElement.dataset.theme === 'night' ? 'night' : 'day')));
  });
  document.title = localizeText('极光聊窗');
  const languagePicker = document.getElementById('language-picker');
  if (languagePicker) languagePicker.setAttribute('aria-label', localizeText('选择语言'));
  languagePicker?.querySelectorAll('[data-language]').forEach(option => {
    option.setAttribute('aria-pressed', String(option.dataset.language === currentLanguage));
  });
  const mentionButton = document.getElementById('mention-toggle');
  if (mentionButton) {
    mentionButton.setAttribute('aria-label', localizeText('提及用户'));
    mentionButton.setAttribute('title', localizeText('提及用户'));
  }
  const mentionPicker = document.getElementById('mention-picker');
  if (mentionPicker) mentionPicker.setAttribute('aria-label', localizeText('提及用户'));
  document.querySelectorAll('.role-badges .user-badge[data-role]').forEach(badge => {
    badge.textContent = roleLabel(badge.dataset.role);
  });
  if (replyTarget) {
    document.getElementById('reply-preview-label').textContent = localizeText('引用:');
  }
  document.querySelectorAll('.message-time[data-timestamp]').forEach(time => {
    time.textContent = formatMessageTime(Number(time.dataset.timestamp));
  });
  if (document.getElementById('ai-chat-messages')) renderAiConversation();
  if (document.getElementById('workers-ai-chat-messages')) renderWorkersAiConversation();
}

function formatMessageTime(timestamp) {
  return formatLocalizedDateTime(timestamp);
}

function formatLocalizedDateTime(timestamp) {
  const date = new Date(timestamp);
  const time = messageTimeFormatters[currentLanguage].format(date);
  return currentLanguage === 'zh-CN'
    ? `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
    : time;
}

function refreshLocalizedDetails() {
  const memberCount = document.getElementById('members-count');
  if (memberCount.dataset.memberCount !== undefined) {
    const count = Number(memberCount.dataset.memberCount);
    memberCount.textContent = currentLanguage === 'zh-CN'
      ? `共 ${count} 位成员`
      : localizeFormat(count === 1 ? '{count} member' : '{count} members', { count });
  }
  document.querySelectorAll('.member-mute-state[data-muted-until]').forEach(state => {
    const date = formatLocalizedDateTime(Number(state.dataset.mutedUntil));
    state.textContent = `${localizeText('禁言至 ')}${date}`;
  });
  const userInfoDialog = document.getElementById('user-info-dialog');
  if (userInfoDialog.open) {
    const displayName = document.getElementById('user-info-name').textContent;
    document.getElementById('user-info-description').textContent = localizeFormat('Profile of {name}', { name: displayName });
  }
  if (muteTarget && document.getElementById('mute-dialog').open) {
    document.getElementById('mute-title').textContent = localizeFormat('Mute {name}', { name: muteTarget.display_name });
    document.getElementById('mute-duration-label').textContent = localizeFormat('Mute {name} for (min)', { name: muteTarget.display_name });
  }
  if (muteTarget && document.getElementById('unmute-dialog').open) {
    document.getElementById('unmute-title').textContent = localizeFormat('Unmute {name}', { name: muteTarget.display_name });
    document.getElementById('unmute-description').textContent = localizeFormat('Unmute {name}?', { name: muteTarget.display_name });
  }
  document.querySelectorAll('.profile-trigger').forEach(trigger => {
    const member = trigger.closest('.member-item');
    const message = trigger.closest('.message');
    const userId = member?.dataset.userId || message?.dataset.userId;
    const profile = userProfiles.get(String(userId));
    const displayName = profile?.display_name || trigger.textContent;
    if (!userId || !displayName) return;
    trigger.setAttribute('aria-label', localizeFormat("View {name}'s profile", { name: displayName }));
  });
}

async function api(action, method = 'GET', body = null) {
  const options = { method, headers: {} };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`/api/chat?action=${action}`, options);
  return await res.json();
}

function renderAiConversation() {
  renderModelConversation('ai-chat-messages', aiConversation, '你好！我是讯飞星火AI，有什么可以帮你？', '讯飞星火AI');
}

function renderWorkersAiConversation() {
  const welcome = document.getElementById('workers-ai-welcome');
  if (welcome) welcome.hidden = workersAiConversation.length > 0;
  const container = document.getElementById('workers-ai-chat-messages');
  if (!container) return;
  if (workersAiConversation.length === 0) {
    container.replaceChildren();
    return;
  }
  renderModelConversation('workers-ai-chat-messages', workersAiConversation, '', 'Cloudflare Workers AI');
}

function renderModelConversation(containerId, conversation, welcomeMessage, assistantName) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();

  if (conversation.length === 0) {
    const welcome = document.createElement('div');
    welcome.className = 'ai-chat-welcome';
    const title = document.createElement('strong');
    title.textContent = localizeText(welcomeMessage);
    welcome.appendChild(title);
    container.appendChild(welcome);
    return;
  }

  conversation.forEach(message => {
    const item = document.createElement('article');
    item.className = 'ai-chat-message';
    item.dataset.role = message.role;
    if (message.kind) item.dataset.kind = message.kind;
    const label = document.createElement('span');
    label.className = 'ai-chat-message-label';
    label.textContent = message.role === 'user'
      ? localizeText('你')
      : message.kind === 'reasoning' ? localizeText('思考') : localizeText(assistantName);
    const content = document.createElement('p');
    content.className = 'ai-chat-message-content';
    content.textContent = message.content;
    if (message.kind === 'reasoning') {
      const details = document.createElement('details');
      details.className = 'ai-chat-reasoning';
      const summary = document.createElement('summary');
      summary.className = 'ai-chat-reasoning-summary';
      summary.appendChild(label);
      details.append(summary, content);
      item.appendChild(details);
    } else {
      item.append(label, content);
    }
    container.appendChild(item);
  });
  container.scrollTop = container.scrollHeight;
}

function clearAiConversation() {
  if (isAiRequestInProgress) return;
  aiConversation = [];
  document.getElementById('ai-chat-status').textContent = '';
  renderAiConversation();
  document.getElementById('ai-chat-input').focus();
}

async function submitAiChat(event) {
  event.preventDefault();
  if (isAiRequestInProgress) return;

  const input = document.getElementById('ai-chat-input');
  const prompt = input.value.trim();
  const status = document.getElementById('ai-chat-status');
  if (!prompt) {
    status.textContent = localizeText('请输入问题');
    input.focus();
    return;
  }
  aiConversation.push({ role: 'user', content: prompt });
  renderAiConversation();
  input.value = '';
  status.textContent = localizeText('思考中...');
  isAiRequestInProgress = true;
  input.disabled = true;
  const submitButton = document.getElementById('ai-chat-submit-btn');
  const clearButton = document.getElementById('ai-chat-clear-btn');
  const thinkingModeControl = document.getElementById('ai-thinking-mode');
  const thinkingModeButtons = [...thinkingModeControl.querySelectorAll('[data-thinking-mode]')];
  const thinkingMode = thinkingModeControl.dataset.value;
  const webSearchToggle = document.getElementById('ai-web-search-toggle');
  submitButton.disabled = true;
  clearButton.disabled = true;
  thinkingModeButtons.forEach(button => { button.disabled = true; });
  webSearchToggle.disabled = true;

  try {
    const response = await api('chatWithAi', 'POST', {
      messages: aiConversation.filter(message => message.kind !== 'reasoning'),
      thinking: thinkingMode,
      webSearch: webSearchToggle.getAttribute('aria-pressed') === 'true'
    });
    if (response.error) throw new Error(response.error);
    if (typeof response.reply !== 'string' || !response.reply.trim()) {
      throw new Error('AI暂时无法回复，请稍后重试。');
    }
    if (typeof response.reasoning === 'string' && response.reasoning.trim()) {
      aiConversation.push({ role: 'assistant', kind: 'reasoning', content: response.reasoning });
    }
    aiConversation.push({ role: 'assistant', content: response.reply });
    renderAiConversation();
    status.textContent = '';
  } catch (error) {
    status.textContent = localizeText(error.message) || localizeText('AI暂时无法回复，请稍后重试。');
    console.error('星火 AI 请求失败：', error);
  } finally {
    isAiRequestInProgress = false;
    input.disabled = false;
    submitButton.disabled = false;
    clearButton.disabled = false;
    thinkingModeButtons.forEach(button => { button.disabled = false; });
    webSearchToggle.disabled = false;
    input.focus();
  }
}

function clearWorkersAiConversation() {
  if (isWorkersAiRequestInProgress) return;
  workersAiConversation = [];
  document.getElementById('workers-ai-chat-status').textContent = '';
  renderWorkersAiConversation();
  document.getElementById('workers-ai-chat-input').focus();
}

async function submitWorkersAiChat(event) {
  event.preventDefault();
  if (isWorkersAiRequestInProgress) return;

  const input = document.getElementById('workers-ai-chat-input');
  const prompt = input.value.trim();
  const status = document.getElementById('workers-ai-chat-status');
  if (!prompt) {
    status.textContent = localizeText('请输入问题');
    input.focus();
    return;
  }
  workersAiConversation.push({ role: 'user', content: prompt });
  renderWorkersAiConversation();
  input.value = '';
  status.textContent = localizeText('思考中...');
  isWorkersAiRequestInProgress = true;
  input.disabled = true;
  const submitButton = document.getElementById('workers-ai-chat-submit-btn');
  const clearButton = document.getElementById('workers-ai-chat-clear-btn');
  submitButton.disabled = true;
  clearButton.disabled = true;

  try {
    const response = await api('chatWithWorkersAi', 'POST', { messages: workersAiConversation });
    if (response.error) throw new Error(response.error);
    if (typeof response.reply !== 'string' || !response.reply.trim()) {
      throw new Error('Workers AI 返回了无效响应，请稍后重试。');
    }
    workersAiConversation.push({ role: 'assistant', content: response.reply });
    renderWorkersAiConversation();
    status.textContent = '';
  } catch (error) {
    status.textContent = localizeText(error.message) || localizeText('AI暂时无法回复，请稍后重试。');
    console.error('Cloudflare Workers AI 请求失败：', error);
  } finally {
    isWorkersAiRequestInProgress = false;
    input.disabled = false;
    submitButton.disabled = false;
    clearButton.disabled = false;
    input.focus();
  }
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
    message.textContent = localizeText('请完整填写所有信息');
    return;
  }
  if (window.countDisplayWidth(displayName) > 24) {
    message.textContent = localizeText('昵称长度不能超过24（半角1，全角2）');
    return;
  }
  if (!isValidAccount(account)) {
    message.textContent = localizeText('账户名只能包含大小写英文字母、数字、下划线和美元符号（$）');
    return;
  }
  if (password !== confirmPassword) {
    message.textContent = localizeText('两次输入的密码不一致');
    return;
  }

  try {
    const res = await api('register', 'POST', { account, display_name: displayName, password });
    if (res.error) {
      message.textContent = localizeText(res.error);
      return;
    }
    document.getElementById('auth-form').reset();
    document.getElementById('register-form').reset();
    showLoginPage(localizeText('注册成功，请使用账户名登录。'), true);
    document.getElementById('account').value = account;
  } catch (error) {
    message.textContent = localizeText('暂时无法连接服务器，请稍后重试。');
    console.error(error);
  }
}

async function login() {
  const account = document.getElementById('account').value.trim();
  const p = document.getElementById('password').value;
  if (!account || !p) return showAuthMessage(localizeText('请填写账户名和密码'));
  if (!isValidAccount(account)) {
    showAuthMessage(localizeText('账户名只能包含大小写英文字母、数字、下划线和美元符号（$）'));
    return;
  }
  try {
    const res = await api('login', 'POST', { account, password: p });
    if (res.error) {
      showAuthMessage(localizeText(res.error));
    } else {
      myUserId = res.userId;
      myRole = normalizeRole(res.role);
      myAccount = res.account;
      myDisplayName = res.displayName;
      updateReportInboxButton();
      userRoles.set(String(myUserId), myRole);
      document.getElementById('my-button-name').textContent = myDisplayName;
      document.getElementById('my-button-avatar').textContent = myDisplayName.charAt(0).toUpperCase();
      document.getElementById('sidebar-account-name').textContent = myAccount;
      document.getElementById('my-profile-name').textContent = myDisplayName;
      document.getElementById('my-account').textContent = myAccount;
      const myBadge = document.getElementById('my-profile-role');
      setRoleBadges(myBadge, myRole);
      applyLanguage();
      document.getElementById('auth-panel').style.display = 'none';
      document.getElementById('register-panel').hidden = true;
      const chatPanel = document.getElementById('chat-panel');
      chatPanel.style.display = 'grid';
      showWorkspaceView('chat');
      requestAnimationFrame(() => {
        chatPanel.classList.remove('chat-panel-entering');
        void chatPanel.offsetWidth;
        chatPanel.classList.add('chat-panel-entering');
      });
      const finishEntryAnimation = event => {
        if (event.animationName === 'chat-panel-enter') {
          chatPanel.classList.remove('chat-panel-entering');
          chatPanel.removeEventListener('animationend', finishEntryAnimation);
        }
      };
      chatPanel.addEventListener('animationend', finishEntryAnimation);
      startChat();
    }
  } catch (error) {
    showAuthMessage(localizeText('暂时无法连接服务器，请稍后重试。'));
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
  if (role === 'super_admin') return localizeText('超管');
  if (role === 'admin') return localizeText('管理');
  if (role === 'ai') return 'AI';
  return localizeText('Lv.1');
}

function roleLabels(role) {
  if (role === 'ai_admin') return ['admin', 'ai'];
  return [role];
}

function createRoleBadge(role) {
  const group = document.createElement('span');
  group.className = 'role-badges';
  setRoleBadges(group, role);
  return group;
}

function setRoleBadges(group, role) {
  group.className = 'role-badges';
  group.replaceChildren(...roleLabels(role).map(labelRole => {
    const badge = document.createElement('span');
    badge.className = `user-badge${labelRole === 'super_admin' ? ' super-admin' : labelRole === 'admin' ? ' administrator' : labelRole === 'ai' ? ' ai' : ''}`;
    badge.dataset.role = labelRole;
    badge.textContent = roleLabel(labelRole);
    return badge;
  }));
}

function parseMessagePayload(rawText) {
  try {
    const payload = JSON.parse(rawText);
    if (
      payload?.type === 'chat_quote_v1' &&
      typeof payload.text === 'string' &&
      typeof payload.quote?.display_name === 'string' &&
      typeof payload.quote?.text === 'string'
    ) {
      return {
        text: payload.text,
        quote: {
          displayName: payload.quote.display_name,
          text: payload.quote.text
        }
      };
    }
  } catch {
    // Messages predating quote support are stored as plain text.
  }
  return { text: rawText, quote: null };
}

function renderMessageContent(element, text) {
  const mentionPattern = /@[^\s@]+/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(text))) {
    if (match.index > lastIndex) {
      element.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const mention = document.createElement('span');
    mention.className = 'mention-highlight';
    mention.textContent = match[0];
    element.appendChild(mention);
    lastIndex = mentionPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    element.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function showReplyPreview(quote) {
  replyTarget = quote;
  document.getElementById('reply-preview-label').textContent = localizeText('引用:');
  document.getElementById('reply-preview-text').textContent = `『${quote.displayName}: ${quote.text}』`;
  document.getElementById('reply-preview').hidden = false;
  document.getElementById('msg-input').focus();
  updateComposer();
}

function clearReplyPreview() {
  replyTarget = null;
  document.getElementById('reply-preview').hidden = true;
  document.getElementById('reply-preview-text').textContent = '';
  updateComposer();
}

function closeMessageContextMenu() {
  const menu = document.getElementById('message-context-menu');
  menu.hidden = true;
  contextMenuMessage = null;
}

function openMessageContextMenu(message, clientX) {
  const content = message.querySelector('.content');
  const author = message.querySelector('.sender-name');
  if (!content || !author) return;
  contextMenuMessage = {
    messageId: Number(message.dataset.messageId),
    userId: Number(message.dataset.userId),
    displayName: author.textContent,
    text: content.textContent
  };
  const menu = document.getElementById('message-context-menu');
  document.getElementById('report-message-btn').hidden = contextMenuMessage.userId === Number(myUserId);
  menu.hidden = false;
  const bounds = message.getBoundingClientRect();
  const menuBounds = menu.getBoundingClientRect();
  const left = Math.max(8, Math.min(clientX, window.innerWidth - menuBounds.width - 8));
  const top = Math.max(8, Math.min(bounds.bottom + 4, window.innerHeight - menuBounds.height - 8));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function showReportDialog(target) {
  reportTarget = target;
  reportReviewerId = null;
  reportReviewerName = '';
  document.getElementById('report-dialog-title').textContent = localizeFormat('举报用户{name}', { name: target.displayName });
  document.getElementById('report-dialog-status').textContent = '';
  document.getElementById('report-dialog').showModal();
}

async function showReviewerDialog() {
  const dialog = document.getElementById('reviewer-dialog');
  const list = document.getElementById('reviewer-list');
  const status = document.getElementById('reviewer-status');
  list.replaceChildren();
  status.textContent = '';
  document.getElementById('report-dialog').close();
  dialog.showModal();

  try {
    const response = await loadUsers();
    if (response.error) throw new Error(response.error);
    const reviewers = (response.users || []).filter(user =>
      ['super_admin', 'admin', 'ai_admin'].includes(user.role)
    );
    if (reviewers.length === 0) {
      status.textContent = localizeText('暂无可选审核员');
      return;
    }

    reviewers.forEach(user => {
      const option = document.createElement('div');
      option.className = 'reviewer-option';
      const identity = document.createElement('span');
      identity.className = 'reviewer-identity';
      const name = document.createElement('span');
      name.className = 'reviewer-name';
      name.textContent = user.display_name;
      identity.append(name, createRoleBadge(user.role));
      const submit = document.createElement('button');
      submit.className = 'primary-btn';
      submit.type = 'button';
      submit.textContent = localizeText('提交');
      submit.addEventListener('click', () => {
        reportReviewerId = Number(user.id);
        reportReviewerName = user.display_name;
        dialog.close();
        const form = document.getElementById('submit-report-form');
        form.reset();
        document.getElementById('submit-report-reviewer').textContent =
          `${localizeText('选择审核员')}：${reportReviewerName}`;
        document.getElementById('submit-report-status').textContent = '';
        document.getElementById('submit-report-dialog').showModal();
        document.getElementById('report-reason').focus();
      });
      option.append(identity, submit);
      list.appendChild(option);
    });
  } catch (error) {
    status.textContent = localizeText(error.message) || localizeText('请检查网络后重试。');
    console.error('加载举报审核员失败：', error);
  }
}

async function submitManualReport(event) {
  event.preventDefault();
  if (!reportTarget || !reportReviewerId) return;
  const submit = document.getElementById('submit-report-submit-btn');
  const status = document.getElementById('submit-report-status');
  const reason = document.getElementById('report-reason').value.trim();
  status.textContent = '';
  submit.disabled = true;

  try {
    const response = await api('submitReport', 'POST', {
      message_id: reportTarget.messageId,
      reviewer_id: reportReviewerId,
      reason
    });
    if (response.error) throw new Error(response.error);
    document.getElementById('submit-report-dialog').close();
    reportTarget = null;
    document.getElementById('report-dialog-status').textContent = localizeText('举报已提交');
    document.getElementById('report-dialog').showModal();
  } catch (error) {
    status.textContent = localizeText(error.message) || localizeText('举报提交失败，请检查网络后重试。');
    console.error('提交人工举报失败：', error);
  } finally {
    submit.disabled = false;
  }
}

function renderAiReviewResult(provider, result) {
  const container = document.getElementById('ai-result-content');
  container.replaceChildren();
  const providerName = provider === 'content-moderation'
    ? 'AI审核（接口1）'
    : provider === 'text-censor' ? 'AI审核（接口2）' : 'UAPIS敏感词检测';
  const fields = provider === 'content-moderation'
    ? [
        ['审核结论：', result.is_pass ? localizeText('正常') : localizeText('违规')],
        ['风险等级：', result.risk_level],
        ['命中类别：', (result.categories || []).join('、')]
      ]
    : provider === 'text-censor'
      ? [
        ['审核结论：', result.conclusion || localizeText('未知')],
        ['命中类别：', (result.violation_categories || []).join('、')],
        ['命中内容：', (result.violations || []).join('、')]
      ]
      : [
          ['审核结论：', result.is_forbidden ? localizeText('违规') : localizeText('正常')],
          ['命中敏感词：', (result.forbidden_words || []).join('、')]
        ];
  const providerLine = document.createElement('p');
  providerLine.textContent = `${localizeText('AI审核接口')}：${localizeText(providerName)}`;
  container.appendChild(providerLine);
  fields.forEach(([label, value]) => {
    const line = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = localizeText(label);
    line.append(strong, document.createTextNode(String(value || localizeText('无'))));
    container.appendChild(line);
  });
  if (Array.isArray(result.details) && result.details.length > 0) {
    const list = document.createElement('ul');
    result.details.forEach(detail => {
      if (!detail || typeof detail !== 'object') return;
      const item = document.createElement('li');
      const category = detail.category || '';
      const matches = Array.isArray(detail.matches) ? detail.matches.join('、') : '';
      const word = detail.word || '';
      item.textContent = [category, word, matches, detail.msg].filter(Boolean).join('：');
      list.appendChild(item);
    });
    container.appendChild(list);
  }
  document.getElementById('ai-result-dialog').showModal();
}

async function submitAiReport() {
  if (!reportTarget) return;
  const provider = document.querySelector('input[name="ai-review-provider"]:checked')?.value;
  const status = document.getElementById('ai-review-status');
  const submit = document.getElementById('ai-review-submit-btn');
  status.textContent = '';
  if (!provider) {
    status.textContent = localizeText('请选择AI审核接口');
    return;
  }

  submit.disabled = true;
  try {
    const response = await api('submitAiReport', 'POST', {
      message_id: reportTarget.messageId,
      provider
    });
    if (response.error) throw new Error(response.error);
    document.getElementById('ai-review-dialog').close();
    reportTarget = null;
    renderAiReviewResult(response.provider, response.result);
  } catch (error) {
    status.textContent = localizeText(error.message) || localizeText('审核失败，请稍后重试。');
    console.error('AI举报审核失败：', error);
  } finally {
    submit.disabled = false;
  }
}

async function loadReportInbox() {
  const list = document.getElementById('report-inbox-list');
  const count = document.getElementById('report-inbox-count');
  list.replaceChildren();
  count.textContent = localizeText('正在加载...');
  try {
    const response = await api('getPendingReports');
    if (response.error) throw new Error(response.error);
    const reports = response.reports || [];
    count.textContent = `${reports.length} ${localizeText('待审核')}`;
    if (reports.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'report-empty';
      empty.textContent = localizeText('暂无待审核举报');
      list.appendChild(empty);
      return;
    }

    reports.forEach(report => {
      const item = document.createElement('article');
      item.className = 'report-inbox-item';
      const title = document.createElement('h3');
      title.textContent = localizeFormat('举报用户{name}', { name: report.reported_name || localizeText('未知用户') });
      const reporter = document.createElement('p');
      reporter.textContent = `${localizeText('举报人')}：${report.reporter_name || localizeText('未知用户')}`;
      const message = document.createElement('p');
      message.className = 'report-inbox-message';
      message.textContent = report.message_text;
      const reason = document.createElement('p');
      reason.textContent = `${localizeText('举报理由：')}${report.reason}`;
      const actions = document.createElement('div');
      actions.className = 'report-inbox-actions';
      [['violation', '违规', 'report-violation'], ['normal', '正常', 'report-normal']].forEach(([decision, label, className]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = localizeText(label);
        button.addEventListener('click', () => reviewReport(report.id, decision, button));
        actions.appendChild(button);
      });
      item.append(title, reporter, message, reason, actions);
      list.appendChild(item);
    });
  } catch (error) {
    count.textContent = localizeText('举报审核加载失败');
    const message = document.createElement('p');
    message.className = 'report-empty';
    message.textContent = localizeText(error.message) || localizeText('请检查网络后重试。');
    list.appendChild(message);
    console.error('加载举报审核邮件失败：', error);
  }
}

async function reviewReport(reportId, decision, button) {
  if (decision === 'violation') {
    pendingReportReview = { reportId, button };
    document.getElementById('report-violation-form').reset();
    document.getElementById('report-violation-status').textContent = '';
    document.getElementById('report-inbox-dialog').close();
    document.getElementById('report-violation-dialog').showModal();
    document.getElementById('report-violation-content').focus();
    return;
  }

  button.disabled = true;
  try {
    const response = await api('reviewReport', 'POST', {
      report_id: reportId,
      decision
    });
    if (response.error) throw new Error(response.error);
    await loadReportInbox();
  } catch (error) {
    button.disabled = false;
    alert(localizeText(error.message) || localizeText('审核失败，请稍后重试。'));
    console.error('处理举报审核失败：', error);
  }
}

async function submitViolationReview(event) {
  event.preventDefault();
  if (!pendingReportReview) return;

  const { reportId, button } = pendingReportReview;
  const content = document.getElementById('report-violation-content').value.trim();
  const status = document.getElementById('report-violation-status');
  const submit = document.getElementById('report-violation-submit');
  status.textContent = '';
  if (!content || content.length > 500) {
    status.textContent = localizeText('违规内容不能为空且不能超过500个字符');
    return;
  }

  submit.disabled = true;
  try {
    const response = await api('reviewReport', 'POST', {
      report_id: reportId,
      decision: 'violation',
      violation_content: content
    });
    if (response.error) throw new Error(response.error);

    pendingReportReview = null;
    document.getElementById('report-violation-dialog').close();
    document.getElementById('report-inbox-dialog').showModal();
    button.disabled = true;
    await loadReportInbox();
  } catch (error) {
    status.textContent = localizeText(error.message) || localizeText('审核失败，请稍后重试。');
    console.error('提交违规审核失败：', error);
  } finally {
    submit.disabled = false;
  }
}

function updateReportInboxButton() {
  const button = document.getElementById('report-inbox-btn');
  if (!button) return;
  button.hidden = !isModeratorRole(myRole);
  document.getElementById('sidebar-admin-section').hidden = !isModeratorRole(myRole);
}

function showWorkspaceView(viewName) {
  const views = {
    chat: document.getElementById('chat-view'),
    ai: document.getElementById('ai-view'),
    'workers-ai': document.getElementById('workers-ai-view'),
    account: document.getElementById('account-view'),
    appearance: document.getElementById('appearance-view')
  };
  if (!Object.prototype.hasOwnProperty.call(views, viewName)) return;
  const previousView = Object.keys(views).find(name => !views[name].hidden);
  const changed = previousView !== viewName;

  Object.entries(views).forEach(([name, view]) => {
    view.hidden = name !== viewName;
    if (name !== viewName) {
      view.classList.remove('workspace-view-entering');
      window.clearTimeout(workspaceAnimationTimers.get(view));
      workspaceAnimationTimers.delete(view);
    }
  });
  if (changed) {
    const activeView = views[viewName];
    void activeView.offsetWidth;
    activeView.classList.add('workspace-view-entering');
    workspaceAnimationTimers.set(activeView, window.setTimeout(() => {
      activeView.classList.remove('workspace-view-entering');
      workspaceAnimationTimers.delete(activeView);
    }, 750));
  }
  document.querySelectorAll('[data-workspace-view]').forEach(button => {
    const active = button.dataset.workspaceView === viewName;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function normalizeRole(role) {
  return ['super_admin', 'admin', 'ai', 'ai_admin'].includes(role) ? role : 'user';
}

function isKnownRole(role) {
  return role === 'super_admin' || role === 'admin' || role === 'ai' || role === 'ai_admin' || role === 'user';
}

function hasAdminPermissions(role) {
  return role === 'admin' || role === 'ai_admin';
}

function isModeratorRole(role) {
  return ['super_admin', 'admin', 'ai_admin'].includes(role);
}

function updateRoleBadges(rolesById) {
  document.querySelectorAll('.message[data-user-id] .role-badges').forEach(badges => {
    const role = rolesById.get(badges.closest('.message').dataset.userId);
    if (role) {
      badges.replaceWith(createRoleBadge(role));
    }
  });
  document.querySelectorAll('.member-item').forEach(item => {
    const role = rolesById.get(item.dataset.userId);
    if (!role) return;
    const badges = item.querySelector('.member-identity .role-badges');
    if (badges) badges.replaceWith(createRoleBadge(role));
  });
  const myBadge = document.getElementById('my-profile-role');
  const myCurrentRole = rolesById.get(String(myUserId));
  if (myBadge && myCurrentRole) setRoleBadges(myBadge, myCurrentRole);
}

function renderSystemNotification(container, message, existingRow = null) {
  let notification;
  try {
    notification = JSON.parse(message.text);
  } catch {
    notification = null;
  }

  const row = existingRow || document.createElement('div');
  row.replaceChildren();
  row.className = 'system-notification';
  row.dataset.rawText = message.text;
  const marker = document.createElement('span');
  marker.className = 'notification-marker';
  marker.textContent = localizeText('[通知]');
  row.appendChild(marker);

  if (!notification || notification.type !== 'moderation' || !['mute', 'unmute', 'report_violation'].includes(notification.action)) {
    row.append(document.createTextNode(` ${message.text}`));
    if (!existingRow) container.appendChild(row);
    return;
  }

  if (notification.action === 'report_violation') {
    const reportSummary = document.createElement('span');
    reportSummary.className = 'notification-report-summary';
    reportSummary.textContent = localizeFormat(
      '用户{reported}，因存在违规行为，被用户{reporter}举报，经{reviewer}核实，已确认该用户存在{reason}的行为',
      {
        reported: String(notification.targetName || localizeText('未知用户')),
        reporter: String(notification.reporterName || localizeText('未知用户')),
        reviewer: String(notification.actorName || localizeText('未知用户')),
        reason: String(notification.reason || localizeText('违规'))
      }
    );
    row.append(document.createTextNode(' '), reportSummary);
    if (!existingRow) container.appendChild(row);
    return;
  }

  row.append(document.createTextNode(localizeText(' 用户')));
  const targetName = document.createElement('strong');
  targetName.className = 'notification-user';
  targetName.textContent = notification.targetName;
  row.append(targetName, document.createTextNode(' '));

  if (notification.action === 'mute') {
    row.append(document.createTextNode(localizeText('已被 ')));
  } else {
    row.append(document.createTextNode(localizeText('的禁言已被 ')));
  }
  const actorName = document.createElement('strong');
  actorName.className = 'notification-user notification-actor';
  actorName.textContent = notification.actorName;
  const actor = document.createElement('span');
  actor.className = 'notification-actor-group';
  actor.append(createRoleBadge(notification.actorRole), actorName);
  row.append(actor, document.createTextNode(' '));

  const operation = document.createElement('span');
  operation.className = `notification-operation${notification.action === 'unmute' ? ' released' : ''}`;
  operation.textContent = localizeText(notification.action === 'mute' ? '禁言' : '解除禁言');
  row.appendChild(operation);

  if (notification.action === 'mute') {
    const duration = document.createElement('strong');
    duration.className = 'notification-duration';
    duration.textContent = ` ${notification.durationMinutes}min`;
    row.append(duration, document.createTextNode(localizeText('，理由：')));
    const reason = document.createElement('span');
    reason.className = 'notification-reason';
    reason.textContent = notification.reason;
    row.appendChild(reason);
  }

  if (!existingRow) container.appendChild(row);
}

// 登录后启动
async function startChat() {
  await Promise.all([
    refreshPresence(),
    loadUsers().catch(error => {
      console.error('加载用户头像失败：', error);
    })
  ]);
  fetchMessages();
  heartbeat();
  setInterval(heartbeat, 60000);
  setInterval(refreshPresence, 15000);
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
    status.textContent = localizeText('在线');
    dot.classList.remove('offline');
  } catch (error) {
    status.textContent = localizeText('连接异常');
    dot.classList.add('offline');
    console.error(error);
  }
}

// 加载用户头像字典
async function loadUsers() {
  const res = await api('getUsers');
  if (res.error) throw new Error(res.error);
  if (res.users) {
    userProfiles.clear();
    res.users.forEach(user => {
      userProfiles.set(String(user.id), user);
      if (user.avatar_base64) userAvatars[user.id] = user.avatar_base64;
      else delete userAvatars[user.id];
      updateUserAvatar(user.id, user.avatar_base64, user.display_name);
    });
    updateMentionSuggestions();
  }
  return res;
}

function showUserInfo(userId, fallbackName = '', fallbackRole = 'user') {
  const profile = userProfiles.get(String(userId));
  const displayName = profile?.display_name || fallbackName || '未知用户';
  const role = profile?.role || fallbackRole;
  const avatarImage = document.getElementById('user-info-avatar-image');
  avatarImage.replaceChildren();
  const avatarBase64 = profile?.avatar_base64 || userAvatars[userId];
  if (avatarBase64) {
    const image = document.createElement('img');
    image.src = avatarBase64;
    image.alt = '';
    avatarImage.appendChild(image);
  } else {
    avatarImage.textContent = displayName.charAt(0).toUpperCase();
  }
  document.getElementById('user-info-description').textContent = localizeFormat('Profile of {name}', { name: displayName });
  document.getElementById('user-info-name').textContent = displayName;
  document.getElementById('user-info-account').textContent = profile?.account || '—';
  const badge = document.getElementById('user-info-role');
  setRoleBadges(badge, role);
  const dialog = document.getElementById('user-info-dialog');
  dialog.dataset.userId = String(userId);
  dialog.showModal();
}

async function openUserInfo(userId, fallbackName, fallbackRole) {
  if (!userProfiles.has(String(userId))) {
    try {
      await loadUsers();
    } catch (error) {
      console.error('加载用户资料失败：', error);
    }
  }
  showUserInfo(userId, fallbackName, fallbackRole);
}

function makeProfileTrigger(element, user) {
  element.classList.add('profile-trigger');
  element.setAttribute('role', 'button');
  element.tabIndex = 0;
  element.setAttribute('aria-label', localizeFormat("View {name}'s profile", { name: user.display_name }));
  element.addEventListener('click', () => openUserInfo(user.id, user.display_name, user.role));
  element.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openUserInfo(user.id, user.display_name, user.role);
    }
  });
}

async function refreshPresence() {
  try {
    const res = await api('getPresence');
    if (res.error) throw new Error(res.error);
    document.getElementById('online-count').textContent = res.onlineCount ?? 0;
    const users = res.users || [];
    const usersById = new Map(users.map(user => [String(user.id), user]));
    const rolesChanged = users.some(user => {
      const userId = String(user.id);
      return isKnownRole(user.role) && userRoles.has(userId) && userRoles.get(userId) !== user.role;
    });
    users.forEach(user => {
      if (isKnownRole(user.role)) {
        userRoles.set(String(user.id), user.role);
        const profile = userProfiles.get(String(user.id));
        if (profile) profile.role = user.role;
      }
    });
    const currentUser = usersById.get(String(myUserId));
    if (currentUser && isKnownRole(currentUser.role)) myRole = currentUser.role;
    updateReportInboxButton();
    updateRoleBadges(userRoles);
    const userInfoDialog = document.getElementById('user-info-dialog');
    if (userInfoDialog.open) {
      const profile = userProfiles.get(userInfoDialog.dataset.userId);
      const infoUser = usersById.get(userInfoDialog.dataset.userId);
      if (profile && infoUser) {
        profile.role = infoUser.role || profile.role;
        const badge = document.getElementById('user-info-role');
        setRoleBadges(badge, profile.role);
      }
    }

    document.querySelectorAll('.member-item').forEach(item => {
      const user = usersById.get(item.dataset.userId);
      const status = item.querySelector('.member-online-state');
      if (!user || !status) return;
      const isOnline = Boolean(user.is_online);
      status.classList.toggle('offline', !isOnline);
      status.lastChild.textContent = localizeText(isOnline ? '在线' : '离线');
    });
    if (rolesChanged && document.getElementById('members-dialog').open) showMembers();
  } catch (error) {
    console.error('刷新在线状态失败：', error);
  }
}

function updateUserAvatar(userId, avatarBase64, displayName) {
  const profile = userProfiles.get(String(userId));
  if (profile) {
    profile.avatar_base64 = avatarBase64;
    profile.display_name = displayName;
  }
  const selector = `[data-user-id="${userId}"]`;
  const selectors = [` .message${selector} .avatar`, `.member-item${selector} .member-avatar`];
  if (Number(userId) === Number(myUserId)) selectors.push('#my-button-avatar', '#my-profile-avatar-image');
  if (document.getElementById('user-info-dialog').dataset.userId === String(userId)) selectors.push('#user-info-avatar-image');
  document.querySelectorAll(selectors.join(',')).forEach(avatar => {
    if (avatarBase64) {
      let image = avatar.querySelector('img');
      if (!image) {
        image = document.createElement('img');
        image.alt = '';
        avatar.replaceChildren(image);
      }
      if (image.src !== avatarBase64) image.src = avatarBase64;
    } else if (avatar.querySelector('img') || avatar.textContent !== displayName.charAt(0).toUpperCase()) {
      avatar.textContent = displayName.charAt(0).toUpperCase();
    }
  });
}

async function showMembers() {
  const dialog = document.getElementById('members-dialog');
  const list = document.getElementById('members-list');
  const count = document.getElementById('members-count');
  list.replaceChildren();
  count.textContent = localizeText('正在加载...');
  if (!dialog.open) dialog.showModal();

  try {
    const res = await loadUsers();
    if (res.error) throw new Error(res.error);

    const currentUser = res.users?.find(user => Number(user.id) === Number(myUserId));
    if (currentUser && isKnownRole(currentUser.role)) myRole = currentUser.role;
    updateReportInboxButton();
    (res.users || []).forEach(user => {
      if (isKnownRole(user.role)) userRoles.set(String(user.id), user.role);
    });
    updateRoleBadges(userRoles);

    const roleOrder = { super_admin: 0, admin: 1, ai_admin: 1, ai: 2 };
    const users = (res.users || []).sort((first, second) =>
      (roleOrder[first.role] ?? 3) - (roleOrder[second.role] ?? 3) ||
      first.display_name.localeCompare(second.display_name, 'zh-CN')
    );
    count.dataset.memberCount = users.length;
    count.textContent = currentLanguage === 'zh-CN'
      ? `共 ${users.length} 位成员`
      : localizeFormat(users.length === 1 ? '{count} member' : '{count} members', { count: users.length });
    if (users.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'members-message';
      empty.textContent = localizeText('暂无成员');
      list.appendChild(empty);
      return;
    }

    users.forEach(user => {
      const item = document.createElement('div');
      item.className = 'member-item';
      item.dataset.userId = user.id;

      const avatar = document.createElement('div');
      avatar.className = 'member-avatar';
      makeProfileTrigger(avatar, user);
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
      const badge = createRoleBadge(user.role);
      identity.append(displayName, badge);

      const onlineState = document.createElement('span');
      onlineState.className = `member-online-state${user.is_online ? '' : ' offline'}`;
      const stateDot = document.createElement('span');
      stateDot.className = 'member-online-dot';
      onlineState.append(stateDot, document.createTextNode(localizeText(user.is_online ? '在线' : '离线')));

      const profile = document.createElement('div');
      profile.className = 'member-profile';
      profile.append(identity, onlineState);
      item.append(avatar, profile);

      if (user.muted_until > Date.now()) {
        const muteState = document.createElement('span');
        muteState.className = 'member-mute-state';
        muteState.dataset.mutedUntil = user.muted_until;
        muteState.textContent = `${localizeText('禁言至 ')}${formatLocalizedDateTime(user.muted_until)}`;
        item.appendChild(muteState);
      }

      const canModerateTarget = myRole === 'super_admin'
        ? user.role !== 'super_admin'
        : hasAdminPermissions(myRole) && ['user', 'ai'].includes(user.role);
      if (canModerateTarget) {
        const muteButton = document.createElement('button');
        muteButton.className = 'member-mute-btn';
        muteButton.type = 'button';
        const isMuted = user.muted_until > Date.now();
        muteButton.textContent = localizeText(isMuted ? '解除' : '禁言');
        muteButton.classList.toggle('unmute', isMuted);
        muteButton.addEventListener('click', () => {
          if (user.muted_until > Date.now()) openUnmuteDialog(user);
          else openMuteDialog(user);
        });
        item.appendChild(muteButton);
      }

      list.appendChild(item);
    });
  } catch (error) {
    count.textContent = localizeText('成员加载失败');
    const message = document.createElement('p');
    message.className = 'members-message error';
    message.textContent = localizeText(error.message) || localizeText('请检查网络后重试。');
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

          const isSystemNotification = Number(msg.user_id) === 0
            || msg.display_name === '[通知]'
            || (() => {
              try {
                return JSON.parse(msg.text).type === 'moderation';
              } catch {
                return false;
              }
            })();
          if (isSystemNotification) {
            renderSystemNotification(msgContainer, msg);
            document.getElementById('empty-state').hidden = true;
            return;
          }
          const messagePayload = parseMessagePayload(msg.text);

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

          const userId = String(msg.user_id);
          const messageRole = isKnownRole(msg.role) ? msg.role : userRoles.get(userId);
          if (isKnownRole(msg.role)) userRoles.set(userId, msg.role);
          const badgeDiv = createRoleBadge(messageRole);

          const usernameSpan = document.createElement('span');
          usernameSpan.className = 'sender-name';
          usernameSpan.textContent = msg.display_name;
          const isOtherUser = Number(msg.user_id) !== Number(myUserId);
          if (isOtherUser) {
            const profile = { id: msg.user_id, display_name: msg.display_name, role: messageRole };
            makeProfileTrigger(avatarDiv, profile);
          }
          senderDiv.append(badgeDiv, usernameSpan);

          const contentDiv = document.createElement('div');
          contentDiv.className = 'content';
          renderMessageContent(contentDiv, messagePayload.text);
          if (messagePayload.quote) {
            const quoteDiv = document.createElement('blockquote');
            quoteDiv.className = 'quoted-message';
            quoteDiv.textContent = `『${messagePayload.quote.displayName}: ${messagePayload.quote.text}』`;
            bubbleDiv.appendChild(quoteDiv);
          }
          bubbleDiv.appendChild(contentDiv);

          const timeDiv = document.createElement('div');
          timeDiv.className = 'message-time';
          timeDiv.dataset.timestamp = msg.created_at;
          timeDiv.textContent = formatMessageTime(Number(msg.created_at));

          bodyDiv.appendChild(senderDiv);
          bodyDiv.appendChild(bubbleDiv);
          bodyDiv.appendChild(timeDiv);
          div.appendChild(avatarDiv);
          div.appendChild(bodyDiv);
          userProfiles.set(userId, {
            ...(userProfiles.get(userId) || {}),
            id: msg.user_id,
            display_name: msg.display_name,
            role: messageRole
          });

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
  if (isSendingMessage) return;
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  isSendingMessage = true;
  updateComposer();
  try {
    const res = await api('sendMessage', 'POST', {
      text,
      quote: replyTarget
        ? { display_name: replyTarget.displayName, text: replyTarget.text }
        : null
    });
    if (res.error) {
      alert(localizeText(res.error));
      return;
    }
    input.value = '';
    closeMentionPicker();
    clearReplyPreview();
    updateComposer();
    await fetchMessages();
  } catch (error) {
    alert(localizeText('发送失败，请检查网络后重试。'));
    console.error(error);
  } finally {
    isSendingMessage = false;
    updateComposer();
  }
}

async function changeDisplayName(event) {
  event.preventDefault();
  const input = document.getElementById('my-name-input');
  const message = document.getElementById('my-name-msg');
  const saveButton = document.getElementById('my-name-save-btn');
  const displayName = input.value.trim();
  message.textContent = '';
  message.classList.remove('success');

  if (!displayName) {
    message.textContent = localizeText('用户名不能为空');
    return;
  }
  if (window.countDisplayWidth(displayName) > 24) {
    message.textContent = localizeText('昵称长度不能超过24（半角1，全角2）');
    return;
  }

  saveButton.disabled = true;
  try {
    const res = await api('changeDisplayName', 'POST', { display_name: displayName });
    if (res.error) {
      message.textContent = localizeText(res.error);
      return;
    }

    myDisplayName = res.displayName;
    const myProfile = userProfiles.get(String(myUserId));
    if (myProfile) myProfile.display_name = myDisplayName;
    document.getElementById('my-button-name').textContent = myDisplayName;
    document.getElementById('sidebar-account-name').textContent = myAccount;
    document.getElementById('my-profile-name').textContent = myDisplayName;
    document.querySelectorAll('.message').forEach(row => {
      if (Number(row.dataset.userId) !== Number(myUserId)) return;
      const name = row.querySelector('.sender-name');
      const badge = row.querySelector('.role-badges');
      const avatar = row.querySelector('.avatar');
      if (name) name.textContent = res.displayName;
      if (badge) setRoleBadges(badge, myRole);
      if (avatar && !avatar.querySelector('img')) avatar.textContent = res.displayName.charAt(0).toUpperCase();
    });

    const member = document.querySelector(`.member-item[data-user-id="${myUserId}"] .member-name`);
    if (member) member.textContent = res.displayName;
    updateUserAvatar(myUserId, userAvatars[myUserId], myDisplayName);
    message.textContent = localizeText('用户名已更新');
    message.classList.add('success');
    document.getElementById('my-name-edit-form').hidden = true;
  } catch (error) {
    message.textContent = localizeText('更新失败，请检查网络后重试。');
    console.error('更改用户名失败：', error);
  } finally {
    saveButton.disabled = false;
  }
}

function openMuteDialog(user) {
  muteTarget = user;
  document.getElementById('mute-title').textContent = localizeFormat('Mute {name}', { name: user.display_name });
  document.getElementById('mute-duration-label').textContent = localizeFormat('Mute {name} for (min)', { name: user.display_name });
  document.getElementById('mute-duration').value = '';
  document.getElementById('mute-reason').value = '';
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
  const reason = document.getElementById('mute-reason').value.trim();
  message.textContent = '';
  message.classList.remove('success');

  if (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) {
    message.textContent = localizeText('请输入大于0的整数分钟');
    return;
  }
  if (!reason) {
    message.textContent = localizeText('请填写禁言理由');
    return;
  }

  confirmButton.disabled = true;
  try {
    const res = await api('muteUser', 'POST', {
      user_id: muteTarget.id,
      duration_minutes: durationMinutes,
      reason
    });
    if (res.error) {
      message.textContent = localizeText(res.error);
      return;
    }

    message.textContent = localizeFormat('Muted {name} for {minutes} min', {
      name: res.displayName,
      minutes: durationMinutes
    });
    message.classList.add('success');
    muteTarget.muted_until = res.mutedUntil;
    const member = document.querySelector(`.member-item[data-user-id="${res.userId}"]`);
    if (member) {
      let state = member.querySelector('.member-mute-state');
      if (!state) {
        state = document.createElement('span');
        state.className = 'member-mute-state';
        member.insertBefore(state, member.querySelector('.member-mute-btn'));
      }
      state.dataset.mutedUntil = res.mutedUntil;
      state.textContent = `${localizeText('禁言至 ')}${formatLocalizedDateTime(res.mutedUntil)}`;
      const button = member.querySelector('.member-mute-btn');
      if (button) {
        button.textContent = localizeText('解除');
        button.classList.add('unmute');
      }
    }
    await fetchMessages();
    window.setTimeout(() => document.getElementById('mute-dialog').close(), 700);
  } catch (error) {
    message.textContent = localizeText('禁言失败，请检查网络后重试。');
    console.error('禁言成员失败：', error);
  } finally {
    confirmButton.disabled = false;
  }
}

function openUnmuteDialog(user) {
  muteTarget = user;
  document.getElementById('unmute-title').textContent = localizeFormat('Unmute {name}', { name: user.display_name });
  document.getElementById('unmute-description').textContent = localizeFormat('Unmute {name}?', { name: user.display_name });
  document.getElementById('unmute-msg').textContent = '';
  document.getElementById('unmute-dialog').showModal();
}

async function unmuteMember() {
  if (!muteTarget) return;
  const message = document.getElementById('unmute-msg');
  const confirmButton = document.getElementById('unmute-confirm-btn');
  confirmButton.disabled = true;
  message.textContent = '';

  try {
    const res = await api('unmuteUser', 'POST', { user_id: muteTarget.id });
    if (res.error) {
      message.textContent = localizeText(res.error);
      return;
    }

    message.textContent = localizeFormat('{name} was unmuted', { name: res.displayName });
    message.classList.add('success');
    muteTarget.muted_until = 0;
    const member = document.querySelector(`.member-item[data-user-id="${res.userId}"]`);
    if (member) {
      member.querySelector('.member-mute-state')?.remove();
      const button = member.querySelector('.member-mute-btn');
      if (button) {
        button.textContent = localizeText('禁言');
        button.classList.remove('unmute');
      }
    }
    await fetchMessages();
    window.setTimeout(() => document.getElementById('unmute-dialog').close(), 700);
  } catch (error) {
    message.textContent = localizeText('解除禁言失败，请检查网络后重试。');
    console.error('解除禁言失败：', error);
  } finally {
    confirmButton.disabled = false;
  }
}

function setTheme(theme) {
  const isNight = theme === 'night';
  document.documentElement.dataset.theme = isNight ? 'night' : 'day';
  document.querySelectorAll('[data-theme-choice]').forEach(option => {
    const selected = option.dataset.themeChoice === (isNight ? 'night' : 'day');
    option.setAttribute('aria-pressed', String(selected));
  });
  updateThemeColor();
  try {
    localStorage.setItem('chat-theme', isNight ? 'night' : 'day');
  } catch (error) {
    console.error('无法保存主题偏好：', error);
  }
}

function setAccentColor(color) {
  if (!supportedAccentColors.has(color)) return;
  document.documentElement.dataset.accent = color;
  document.querySelectorAll('[data-accent-choice]').forEach(option => {
    option.setAttribute('aria-pressed', String(option.dataset.accentChoice === color));
  });
  updateThemeColor();
  try {
    localStorage.setItem('chat-accent', color);
  } catch (error) {
    console.error('无法保存主题色偏好：', error);
  }
}

function updateThemeColor() {
  const sceneColor = getComputedStyle(document.documentElement).getPropertyValue('--scene-base').trim();
  document.querySelector('meta[name="theme-color"]').content = sceneColor;
}

function setLanguage(language) {
  if (!Object.prototype.hasOwnProperty.call(localeTranslations, language)) return;
  currentLanguage = language;
  applyLanguage();
  refreshLocalizedDetails();
  if (reportTarget && document.getElementById('report-dialog').open) {
    document.getElementById('report-dialog-title').textContent =
      localizeFormat('举报用户{name}', { name: reportTarget.displayName });
  }
  document.querySelectorAll('.system-notification[data-raw-text]').forEach(row => {
    renderSystemNotification(row.parentElement, { text: row.dataset.rawText }, row);
  });
  updateMentionSuggestions();
  try {
    localStorage.setItem('chat-language', currentLanguage);
  } catch (error) {
    console.error('无法保存语言偏好：', error);
  }
}

function closeMentionPicker() {
  const picker = document.getElementById('mention-picker');
  const input = document.getElementById('msg-input');
  if (!picker || !input) return;
  picker.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  mentionStartIndex = -1;
  mentionFilteredUsers = [];
  mentionActiveIndex = 0;
}

function showMentionMessage(message) {
  const input = document.getElementById('msg-input');
  const picker = document.getElementById('mention-picker');
  if (!input || !picker) return;
  const status = document.createElement('p');
  status.className = 'mention-empty';
  status.textContent = localizeText(message);
  picker.replaceChildren(status);
  picker.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  input.removeAttribute('aria-activedescendant');
  mentionStartIndex = -1;
  mentionFilteredUsers = [];
}

function updateMentionSuggestions() {
  const input = document.getElementById('msg-input');
  const picker = document.getElementById('mention-picker');
  if (!input || !picker) return;

  const beforeCaret = input.value.slice(0, input.selectionStart);
  const match = /@([^\s@]*)$/.exec(beforeCaret);
  if (!match) {
    closeMentionPicker();
    return;
  }

  mentionStartIndex = match.index;
  const query = match[1].toLocaleLowerCase(currentLanguage);
  mentionFilteredUsers = [...userProfiles.values()].filter(user =>
    String(user.display_name || '').toLocaleLowerCase(currentLanguage).includes(query)
  );
  mentionActiveIndex = Math.min(mentionActiveIndex, mentionFilteredUsers.length - 1);
  if (mentionActiveIndex < 0) mentionActiveIndex = 0;
  picker.replaceChildren();

  if (mentionFilteredUsers.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'mention-empty';
    empty.textContent = localizeText('没有匹配的用户');
    picker.appendChild(empty);
  } else {
    mentionFilteredUsers.forEach((user, index) => {
      const option = document.createElement('button');
      option.id = `mention-option-${index}`;
      option.className = 'mention-option';
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.dataset.userId = user.id;
      option.setAttribute('aria-selected', String(index === mentionActiveIndex));
      option.textContent = user.display_name;
      option.addEventListener('mousedown', event => event.preventDefault());
      option.addEventListener('click', () => insertMention(user));
      picker.appendChild(option);
    });
  }

  picker.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  if (mentionFilteredUsers.length > 0) {
    input.setAttribute('aria-activedescendant', `mention-option-${mentionActiveIndex}`);
  } else {
    input.removeAttribute('aria-activedescendant');
  }
}

function insertMention(user) {
  const input = document.getElementById('msg-input');
  if (!input || mentionStartIndex < 0) return;
  const caret = input.selectionStart;
  const mention = `@${user.display_name} `;
  const value = input.value.slice(0, mentionStartIndex) + mention + input.value.slice(caret);
  if (value.length > Number(input.maxLength)) {
    showMentionMessage('消息长度不足，无法添加提及');
    return;
  }
  const nextCaret = mentionStartIndex + mention.length;
  input.value = value;
  input.setSelectionRange(nextCaret, nextCaret);
  closeMentionPicker();
  input.focus();
  updateComposer();
}

function insertMentionTrigger() {
  const input = document.getElementById('msg-input');
  if (!input) return;
  if (input.value.length >= Number(input.maxLength)) {
    showMentionMessage('消息长度不足，无法添加提及');
    return;
  }
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.setRangeText('@', start, end, 'end');
  input.focus();
  updateMentionSuggestions();
  updateComposer();
}

// === 头像压缩与上传逻辑 ===
async function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  
  try {
    const base64 = await compressImage(file, 1000, 1000);
    const res = await api('updateAvatar', 'POST', { avatar_base64: base64 });
    if (res.error) {
      alert(localizeText('上传失败：') + localizeText(res.error));
    } else {
      alert(localizeText('头像更新成功！'));
      userAvatars[myUserId] = base64;
      updateUserAvatar(myUserId, base64, myDisplayName);
    }
  } catch (e) {
    alert(localizeText(e.message) || localizeText('图片处理失败'));
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
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error(localizeText('无法处理这张图片')));
          return;
        }

        const initialScale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        let scale = initialScale;
        let quality = 0.9;
        let attempts = 0;

        const encode = () => {
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error(localizeText('图片压缩失败')));
              return;
            }
            if (blob.size <= 100 * 1024) {
              const outputReader = new FileReader();
              outputReader.onload = () => resolve(outputReader.result);
              outputReader.onerror = () => reject(new Error(localizeText('压缩后的图片读取失败')));
              outputReader.readAsDataURL(blob);
              return;
            }
            attempts += 1;
            if (attempts >= 12) {
              reject(new Error(localizeText('图片无法压缩到100KB以内，请选择较小的图片')));
              return;
            }
            if (quality > 0.65) quality -= 0.1;
            else {
              quality = 0.85;
              scale *= 0.8;
            }
            encode();
          }, 'image/jpeg', quality);
        };

        encode();
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

async function logoutFromProfile() {
  try {
    const res = await api('logout', 'POST');
    if (res.error) throw new Error(res.error);
    location.reload();
  } catch (error) {
    alert(localizeText(error.message) || localizeText('退出登录失败，请重试。'));
    console.error('退出登录失败：', error);
  }
}

async function changePassword(event) {
  event.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-new-password').value;
  const message = document.getElementById('change-password-msg');
  const submitButton = document.getElementById('change-password-submit');
  message.textContent = '';
  message.classList.remove('success');

  if (!currentPassword || !newPassword || !confirmPassword) {
    message.textContent = localizeText('请完整填写所有密码');
    return;
  }
  if (newPassword !== confirmPassword) {
    message.textContent = localizeText('两次输入的新密码不一致');
    return;
  }

  submitButton.disabled = true;
  try {
    const res = await api('changePassword', 'POST', {
      current_password: currentPassword,
      new_password: newPassword
    });
    if (res.error) {
      message.textContent = localizeText(res.error);
      return;
    }
    message.textContent = localizeText('密码修改成功');
    message.classList.add('success');
    document.getElementById('change-password-form').reset();
    window.setTimeout(() => document.getElementById('change-password-dialog').close(), 700);
  } catch (error) {
    message.textContent = localizeText('修改失败，请检查网络后重试。');
    console.error('修改密码失败：', error);
  } finally {
    submitButton.disabled = false;
  }
}

// === 新增：监听键盘 Enter 发送逻辑 ===
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('msg-input');
  const authForm = document.getElementById('auth-form');
  const registerForm = document.getElementById('register-form');
  const messageForm = document.getElementById('message-form');
  const membersDialog = document.getElementById('members-dialog');
  const languageDialog = document.getElementById('language-dialog');
  const userInfoDialog = document.getElementById('user-info-dialog');
  const changePasswordDialog = document.getElementById('change-password-dialog');
  const muteDialog = document.getElementById('mute-dialog');
  const unmuteDialog = document.getElementById('unmute-dialog');

  try {
    const savedLanguage = localStorage.getItem('chat-language');
    currentLanguage = Object.prototype.hasOwnProperty.call(localeTranslations, savedLanguage) ? savedLanguage : 'zh-CN';
  } catch (error) {
    console.error('无法读取语言偏好：', error);
  }
  applyLanguage();
  refreshLocalizedDetails();

  let savedTheme = 'day';
  try {
    savedTheme = localStorage.getItem('chat-theme') === 'night' ? 'night' : 'day';
  } catch (error) {
    console.error('无法读取主题偏好：', error);
  }
  setTheme(savedTheme);
  let savedAccent = 'aurora';
  try {
    const storedAccent = localStorage.getItem('chat-accent');
    if (supportedAccentColors.has(storedAccent)) savedAccent = storedAccent;
  } catch (error) {
    console.error('无法读取主题色偏好：', error);
  }
  setAccentColor(savedAccent);
  const languageButton = document.getElementById('language-toggle');
  const languagePicker = document.getElementById('language-picker');
  languageButton.addEventListener('click', () => {
    languageButton.setAttribute('aria-expanded', 'true');
    languageDialog.showModal();
    languagePicker.querySelector(`[data-language="${currentLanguage}"]`)?.focus();
  });
  languagePicker.querySelectorAll('[data-language]').forEach(option => {
    option.addEventListener('click', () => {
      setLanguage(option.dataset.language);
      languageDialog.close();
    });
  });
  document.getElementById('language-dialog-close').addEventListener('click', () => languageDialog.close());
  languageDialog.addEventListener('close', () => {
    languageButton.setAttribute('aria-expanded', 'false');
    languageButton.focus();
  });
  document.querySelectorAll('[data-theme-choice]').forEach(option => {
    option.addEventListener('click', () => setTheme(option.dataset.themeChoice));
  });
  document.querySelectorAll('[data-accent-choice]').forEach(option => {
    option.addEventListener('click', () => setAccentColor(option.dataset.accentChoice));
  });
  const thinkingModeControl = document.getElementById('ai-thinking-mode');
  const thinkingModeButtons = [...thinkingModeControl.querySelectorAll('[data-thinking-mode]')];
  const selectThinkingMode = selectedButton => {
    thinkingModeControl.dataset.value = selectedButton.dataset.thinkingMode;
    thinkingModeButtons.forEach(button => {
      const selected = button === selectedButton;
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
  };
  thinkingModeButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectThinkingMode(button));
    button.addEventListener('keydown', event => {
      let nextIndex;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % thinkingModeButtons.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (index - 1 + thinkingModeButtons.length) % thinkingModeButtons.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = thinkingModeButtons.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      const nextButton = thinkingModeButtons[nextIndex];
      selectThinkingMode(nextButton);
      nextButton.focus();
    });
  });
  const webSearchToggle = document.getElementById('ai-web-search-toggle');
  webSearchToggle.addEventListener('click', () => {
    webSearchToggle.setAttribute(
      'aria-pressed',
      String(webSearchToggle.getAttribute('aria-pressed') !== 'true')
    );
  });
  document.querySelectorAll('[data-workspace-view]').forEach(button => {
    button.addEventListener('click', () => showWorkspaceView(button.dataset.workspaceView));
  });
  document.getElementById('mention-toggle').addEventListener('click', insertMentionTrigger);
  document.addEventListener('click', event => {
    if (!event.target.closest('.composer') && !event.target.closest('.mention-toggle')) closeMentionPicker();
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

  document.getElementById('ai-chat-form').addEventListener('submit', submitAiChat);
  document.getElementById('ai-chat-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      event.currentTarget.form.requestSubmit();
    }
  });
  document.getElementById('ai-chat-clear-btn').addEventListener('click', clearAiConversation);
  document.getElementById('workers-ai-chat-form').addEventListener('submit', submitWorkersAiChat);
  document.getElementById('workers-ai-chat-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      event.currentTarget.form.requestSubmit();
    }
  });
  document.getElementById('workers-ai-chat-clear-btn').addEventListener('click', clearWorkersAiConversation);

  const messages = document.getElementById('messages');
  const contextMenu = document.getElementById('message-context-menu');
  messages.addEventListener('contextmenu', event => {
    const message = event.target.closest('.message[data-user-id]');
    if (!message || Number(message.dataset.userId) === 0 || !message.querySelector('.content')) {
      closeMessageContextMenu();
      return;
    }
    event.preventDefault();
    openMessageContextMenu(message, event.clientX);
  });
  document.getElementById('quote-message-btn').addEventListener('click', () => {
    if (!contextMenuMessage) return;
    showReplyPreview(contextMenuMessage);
    closeMessageContextMenu();
  });
  document.getElementById('report-message-btn').addEventListener('click', () => {
    if (!contextMenuMessage || contextMenuMessage.userId === Number(myUserId)) return;
    const target = { ...contextMenuMessage };
    closeMessageContextMenu();
    showReportDialog(target);
  });
  document.getElementById('report-dialog-close').addEventListener('click', () => {
    document.getElementById('report-dialog').close();
    reportTarget = null;
  });
  document.getElementById('manual-report-option').addEventListener('click', showReviewerDialog);
  document.getElementById('ai-report-option').addEventListener('click', () => {
    document.getElementById('report-dialog').close();
    document.getElementById('ai-review-status').textContent = '';
    document.querySelectorAll('input[name="ai-review-provider"]').forEach(input => { input.checked = false; });
    document.getElementById('ai-review-dialog').showModal();
  });
  document.getElementById('reviewer-dialog-close').addEventListener('click', () => {
    document.getElementById('reviewer-dialog').close();
    reportTarget = null;
  });
  document.getElementById('reviewer-cancel-btn').addEventListener('click', () => {
    document.getElementById('reviewer-dialog').close();
    reportTarget = null;
  });
  document.getElementById('submit-report-close').addEventListener('click', () => {
    document.getElementById('submit-report-dialog').close();
    reportTarget = null;
  });
  document.getElementById('submit-report-cancel-btn').addEventListener('click', () => {
    document.getElementById('submit-report-dialog').close();
    reportTarget = null;
  });
  document.getElementById('submit-report-form').addEventListener('submit', submitManualReport);
  document.getElementById('ai-review-close').addEventListener('click', () => {
    document.getElementById('ai-review-dialog').close();
    reportTarget = null;
  });
  document.getElementById('ai-review-cancel-btn').addEventListener('click', () => {
    document.getElementById('ai-review-dialog').close();
    reportTarget = null;
  });
  document.getElementById('ai-review-submit-btn').addEventListener('click', submitAiReport);
  document.getElementById('ai-result-close').addEventListener('click', () => document.getElementById('ai-result-dialog').close());
  document.getElementById('ai-result-done-btn').addEventListener('click', () => document.getElementById('ai-result-dialog').close());
  document.getElementById('report-inbox-btn').addEventListener('click', () => {
    document.getElementById('report-inbox-dialog').showModal();
    loadReportInbox();
  });
  document.getElementById('report-inbox-close').addEventListener('click', () => document.getElementById('report-inbox-dialog').close());
  document.getElementById('report-violation-close').addEventListener('click', () => {
    document.getElementById('report-violation-dialog').close();
  });
  document.getElementById('report-violation-cancel').addEventListener('click', () => {
    document.getElementById('report-violation-dialog').close();
  });
  document.getElementById('report-violation-dialog').addEventListener('close', () => {
    if (!pendingReportReview) return;
    const { button } = pendingReportReview;
    pendingReportReview = null;
    document.getElementById('report-inbox-dialog').showModal();
    button.focus();
  });
  document.getElementById('report-violation-form').addEventListener('submit', submitViolationReview);
  document.getElementById('reply-cancel-btn').addEventListener('click', clearReplyPreview);
  document.addEventListener('click', event => {
    if (!contextMenu.contains(event.target)) closeMessageContextMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMessageContextMenu();
  });
  messages.addEventListener('scroll', closeMessageContextMenu);
  window.addEventListener('resize', closeMessageContextMenu);
  window.addEventListener('scroll', closeMessageContextMenu);

  document.getElementById('members-btn').addEventListener('click', showMembers);
  document.getElementById('chat-members-btn').addEventListener('click', showMembers);
  document.getElementById('members-close').addEventListener('click', () => membersDialog.close());
  document.getElementById('user-info-close').addEventListener('click', () => userInfoDialog.close());
  document.getElementById('my-profile-avatar').addEventListener('click', () => document.getElementById('avatar-input').click());
  document.getElementById('my-name-edit-btn').addEventListener('click', () => {
    const form = document.getElementById('my-name-edit-form');
    form.hidden = false;
    document.getElementById('my-name-input').value = myDisplayName;
    document.getElementById('my-name-msg').textContent = '';
    document.getElementById('my-name-input').focus();
  });
  document.getElementById('my-name-cancel-btn').addEventListener('click', () => {
    document.getElementById('my-name-edit-form').hidden = true;
  });
  document.getElementById('my-name-edit-form').addEventListener('submit', changeDisplayName);
  document.getElementById('change-password-btn').addEventListener('click', () => {
    document.getElementById('change-password-form').reset();
    document.getElementById('change-password-msg').textContent = '';
    document.getElementById('change-password-msg').classList.remove('success');
    changePasswordDialog.showModal();
    document.getElementById('current-password').focus();
  });
  document.getElementById('change-password-close').addEventListener('click', () => changePasswordDialog.close());
  document.getElementById('change-password-cancel').addEventListener('click', () => changePasswordDialog.close());
  document.getElementById('change-password-form').addEventListener('submit', changePassword);
  document.getElementById('my-logout-btn').addEventListener('click', logoutFromProfile);
  document.getElementById('mute-dialog-close').addEventListener('click', () => muteDialog.close());
  document.getElementById('mute-cancel-btn').addEventListener('click', () => muteDialog.close());
  document.getElementById('mute-form').addEventListener('submit', muteMember);
  document.getElementById('unmute-dialog-close').addEventListener('click', () => unmuteDialog.close());
  document.getElementById('unmute-cancel-btn').addEventListener('click', () => unmuteDialog.close());
  document.getElementById('unmute-confirm-btn').addEventListener('click', unmuteMember);

  if (input) {
    input.addEventListener('input', () => {
      mentionActiveIndex = 0;
      updateMentionSuggestions();
      updateComposer();
    });
    input.addEventListener('keyup', updateMentionSuggestions);
    input.addEventListener('keydown', (e) => {
      const picker = document.getElementById('mention-picker');
      if (!picker.hidden && mentionFilteredUsers.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const direction = e.key === 'ArrowDown' ? 1 : -1;
          mentionActiveIndex = (mentionActiveIndex + direction + mentionFilteredUsers.length) % mentionFilteredUsers.length;
          updateMentionSuggestions();
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          mentionActiveIndex = 0;
          updateMentionSuggestions();
          insertMention(mentionFilteredUsers[0]);
          return;
        }
      }
      if (e.key === 'Escape' && !picker.hidden) {
        e.preventDefault();
        closeMentionPicker();
        return;
      }
      // 如果按下的是 Enter 键
      if (e.key === 'Enter') {
        // 如果没有按 Shift，则发送消息并阻止默认换行
        if (!e.shiftKey) {
          e.preventDefault(); // 阻止默认的回车换行行为
          if (!e.repeat) sendMessage();
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
  sendButton.disabled = isSendingMessage || !input.value.trim();
}