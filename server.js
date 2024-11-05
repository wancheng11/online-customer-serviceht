const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 存储所有连接
const clients = new Map();
const customerService = new Map();

// WebSocket 连接处理
wss.on('connection', (ws, req) => {
    // 生成唯一ID
    const id = Math.random().toString(36).substring(7);
    
    // 处理客户端消息
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch(data.type) {
            case 'init':
                // 初始化连接类型（用户/客服）
                if (data.role === 'customer') {
                    clients.set(id, {
                        ws,
                        info: data.userInfo
                    });
                    // 通知所有客服有新用户连接
                    broadcastToCS({
                        type: 'new_user',
                        userId: id,
                        userInfo: data.userInfo
                    });
                } else if (data.role === 'service') {
                    customerService.set(id, {
                        ws,
                        info: data.serviceInfo
                    });
                }
                break;
                
            case 'message':
                // 转发消息
                if (data.role === 'customer') {
                    // 用户发送给客服的消息
                    if (data.toService) {
                        const service = customerService.get(data.toService);
                        if (service) {
                            service.ws.send(JSON.stringify({
                                type: 'message',
                                from: id,
                                content: data.content,
                                userInfo: clients.get(id).info
                            }));
                        }
                    }
                } else if (data.role === 'service') {
                    // 客服发送给用户的消息
                    const client = clients.get(data.toUser);
                    if (client) {
                        client.ws.send(JSON.stringify({
                            type: 'message',
                            from: id,
                            content: data.content,
                            serviceInfo: customerService.get(id).info
                        }));
                    }
                }
                break;
                
            case 'transfer':
                // 处理转接请求
                if (data.role === 'service') {
                    const client = clients.get(data.userId);
                    if (client) {
                        client.ws.send(JSON.stringify({
                            type: 'transfer',
                            toService: id
                        }));
                    }
                }
                break;
        }
    });
    
    // 处理连接关闭
    ws.on('close', () => {
        if (clients.has(id)) {
            clients.delete(id);
            // 通知客服用户离线
            broadcastToCS({
                type: 'user_offline',
                userId: id
            });
        } else if (customerService.has(id)) {
            customerService.delete(id);
        }
    });
});

// 广播消息给所有客服
function broadcastToCS(message) {
    customerService.forEach((service) => {
        service.ws.send(JSON.stringify(message));
    });
}

// 静态文件服务
app.use(express.static('public'));

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 