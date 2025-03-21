const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// 添加测试路由
app.get('/test', (req, res) => {
    res.send('服务器正常工作！');
});

// 提供静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 存储游戏房间信息
const gameRooms = new Map();

// 生成随机房间ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// WebSocket 连接处理
io.on('connection', (socket) => {
    console.log('用户连接：', socket.id);

    // 创建房间
    socket.on('createRoom', () => {
        console.log('收到 createRoom 请求');
        const roomId = generateRoomId();
        gameRooms.set(roomId, {
            players: [socket.id],
            gameState: null,
            currentPlayer: socket.id
        });
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, playerId: socket.id });
        console.log('房间创建：', roomId);
        console.log('当前房间信息：', gameRooms.get(roomId));
    });

    // 加入房间
    socket.on('joinRoom', (roomId) => {
        console.log('收到 joinRoom 请求，房间号：', roomId);
        const room = gameRooms.get(roomId);
        console.log('房间信息：', room);
        if (room && room.players.length < 2) {
            room.players.push(socket.id);
            socket.join(roomId);
            
            // 分配玩家颜色
            const players = {
                [room.players[0]]: '红方',
                [room.players[1]]: '蓝方'
            };
            
            // 通知房间内所有玩家游戏开始
            io.to(roomId).emit('gameStart', {
                players,
                currentPlayer: room.players[0]
            });
            
            console.log('玩家加入房间：', roomId);
            console.log('更新后的房间信息：', gameRooms.get(roomId));
        } else {
            console.log('加入房间失败，房间不存在或已满');
            socket.emit('joinError', '房间不存在或已满');
        }
    });

    // 处理游戏操作
    socket.on('gameAction', (data) => {
        console.log('收到 gameAction 请求，数据：', data);
        const { roomId, action, gameState } = data;
        const room = gameRooms.get(roomId);
        
        if (room && room.players.includes(socket.id)) {
            // 更新游戏状态
            room.gameState = gameState;
            
            // 广播游戏操作给房间内其他玩家
            socket.to(roomId).emit('opponentAction', action);
            console.log('游戏状态更新，房间号：', roomId);
            console.log('当前游戏状态：', room.gameState);
        } else {
            console.log('gameAction 失败，房间不存在或玩家不在房间内');
        }
    });

    // 处理断开连接
    socket.on('disconnect', () => {
        console.log('用户断开连接：', socket.id);
        
        // 查找并清理相关房间
        for (const [roomId, room] of gameRooms.entries()) {
            if (room.players.includes(socket.id)) {
                io.to(roomId).emit('playerDisconnected', socket.id);
                gameRooms.delete(roomId);
                console.log('清理房间：', roomId);
                break;
            }
        }
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 