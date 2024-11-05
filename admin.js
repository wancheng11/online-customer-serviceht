document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const sessionsList = document.getElementById('sessionsList');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const quickReplyBtn = document.getElementById('quickReplyBtn');
    const quickReplyPanel = document.getElementById('quickReplyPanel');
    const viewOrderBtn = document.getElementById('viewOrderBtn');
    const orderPanel = document.getElementById('orderPanel');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const imageInput = document.getElementById('imageInput');

    // 模拟会话数据
    const sessions = [
        {
            id: 1,
            name: '张三',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=1',
            lastMessage: '您好，我想咨询一下订单问题',
            unread: 2,
            userId: 'USER001',
            level: '白金卡会员'
        },
        {
            id: 2,
            name: '李四',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=2',
            lastMessage: '好的，谢谢',
            unread: 0,
            userId: 'USER002',
            level: '黄金卡会员'
        }
    ];

    // WebSocket 连接
    let ws;
    let currentUserId = null;

    function connectWebSocket() {
        ws = new WebSocket('ws://localhost:3000');
        
        ws.onopen = () => {
            // 发送初始化消息
            ws.send(JSON.stringify({
                type: 'init',
                role: 'service',
                serviceInfo: {
                    id: 'KF001',
                    name: '客服小美'
                }
            }));
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'new_user':
                    // 添加新用户到会话列表
                    addSessionItem(data.userId, data.userInfo);
                    break;
                    
                case 'message':
                    // 收到用户消息
                    if (currentUserId === data.from) {
                        addMessage(data.content, 'user');
                    }
                    // 更新会话列表中的最新消息
                    updateSessionPreview(data.from, data.content);
                    break;
                    
                case 'user_offline':
                    // 用户离线，更新状态
                    updateSessionStatus(data.userId, 'offline');
                    break;
            }
        };
        
        ws.onclose = () => {
            // 尝试重新连接
            setTimeout(connectWebSocket, 3000);
        };
    }

    // 修改发送消息函数
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message || !currentUserId) return;

        // 发送客服消息
        addMessage(message, 'service');
        messageInput.value = '';

        // 通过 WebSocket 发送消息
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'message',
                role: 'service',
                content: message,
                toUser: currentUserId
            }));
        }
    }

    // 渲染会话列表
    function renderSessions() {
        sessionsList.innerHTML = sessions.map(session => `
            <div class="session-item" data-id="${session.id}">
                <div class="session-avatar">
                    <img src="${session.avatar}" alt="用户头像">
                </div>
                <div class="session-info">
                    <div class="session-name">${session.name}</div>
                    <div class="session-preview">${session.lastMessage}</div>
                </div>
                ${session.unread ? `<div class="unread-count">${session.unread}</div>` : ''}
            </div>
        `).join('');

        // 添加会话点击事件
        document.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', () => {
                const sessionId = parseInt(item.dataset.id);
                selectSession(sessionId);
            });
        });
    }

    // 选择会话
    function selectSession(sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        // 更新UI
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === sessionId) {
                item.classList.add('active');
            }
        });

        // 更新聊天头部信息
        document.querySelector('.user-name').textContent = session.name;
        document.querySelector('.user-id').textContent = `${session.userId} | ${session.level}`;

        // 清除未读消息
        session.unread = 0;
        renderSessions();

        // 加载聊天记录
        loadChatHistory(sessionId);
    }

    // 加载聊天记录
    function loadChatHistory(sessionId) {
        // 模拟聊天记录
        const chatHistory = [
            {
                type: 'user',
                content: '您好，我想咨询一下订单问题',
                time: '14:20'
            },
            {
                type: 'service',
                content: '您好，请问有什么可以帮您的？',
                time: '14:21'
            }
        ];

        // 渲染聊天记录
        chatMessages.innerHTML = chatHistory.map(message => `
            <div class="message ${message.type}">
                <div class="message-avatar">
                    <img src="${message.type === 'user' ? sessions[0].avatar : 'https://s1.imagehub.cc/images/2024/11/06/ddb31bb09e40db6637ddcddfe8452c7c.jpeg'}" alt="头像">
                </div>
                <div class="message-content">
                    ${message.content}
                    <div class="message-time">${message.time}</div>
                </div>
            </div>
        `).join('');

        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 发送消息
    function sendMessage() {
        const content = messageInput.value.trim();
        if (!content) return;

        // 添加消息到聊天区域
        const messageHtml = `
            <div class="message service">
                <div class="message-avatar">
                    <img src="https://s1.imagehub.cc/images/2024/11/06/ddb31bb09e40db6637ddcddfe8452c7c.jpeg" alt="客服头像">
                </div>
                <div class="message-content">
                    ${content}
                    <div class="message-time">${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', messageHtml);

        // 清空输入框并滚动到底部
        messageInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 快捷回复面板
    quickReplyBtn.addEventListener('click', () => {
        quickReplyPanel.classList.toggle('show');
    });

    // 关闭快捷回复面板
    quickReplyPanel.querySelector('.close-btn').addEventListener('click', () => {
        quickReplyPanel.classList.remove('show');
    });

    // 选择快捷回复
    document.querySelectorAll('.reply-item').forEach(item => {
        item.addEventListener('click', () => {
            messageInput.value = item.textContent;
            quickReplyPanel.classList.remove('show');
            messageInput.focus();
        });
    });

    // 查看订单
    viewOrderBtn.addEventListener('click', () => {
        orderPanel.classList.add('show');
    });

    // 关闭订单面板
    orderPanel.querySelector('.close-btn').addEventListener('click', () => {
        orderPanel.classList.remove('show');
    });

    // 上传图片
    uploadImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    // 处理图片上传
    imageInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files.length) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert('请选择图片文件');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const messageHtml = `
                    <div class="message service">
                        <div class="message-avatar">
                            <img src="https://s1.imagehub.cc/images/2024/11/06/ddb31bb09e40db6637ddcddfe8452c7c.jpeg" alt="客服头像">
                        </div>
                        <div class="message-content">
                            <img src="${event.target.result}" alt="发送的图片" style="max-width: 200px; border-radius: 4px;">
                            <div class="message-time">${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                `;
                chatMessages.insertAdjacentHTML('beforeend', messageHtml);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            };
            reader.readAsDataURL(file);
        });

        imageInput.value = '';
    });

    // 绑定发送消息事件
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 初始化
    renderSessions();
}); 