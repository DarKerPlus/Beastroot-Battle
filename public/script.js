class AnimalChess {
    constructor(mode) {
        this.mode = mode;
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        this.currentPlayer = '红方';
        this.gameOver = false;
        this.cellSize = 100;
        this.padding = 0;
        this.selectedPiece = null;
        
        // Socket.io 相关属性
        this.socket = io();
        this.roomId = null;
        this.playerId = null;
        this.playerColor = null;

        // 添加日志容器
        this.logContainer = document.getElementById('game-log');

        // 初始化棋盘和棋子
        this.board = Array(4).fill().map(() => Array(4).fill(null));
        this.animals = {
            '象': 8, '狮': 7, '虎': 6, '豹': 5,
            '狼': 4, '狗': 3, '猫': 2, '鼠': 1
        };

        // 初始化技能状态
        this.skills = {
            red: {
                cat: { active: false, used: false },
                dog: { active: false, used: false },
                tiger: { active: false, used: false },
                leopard: { active: false, used: false },
                wolf: { active: false, used: false },
                rat: { active: false, used: false }
            },
            blue: {
                cat: { active: false, used: false },
                dog: { active: false, used: false },
                tiger: { active: false, used: false },
                leopard: { active: false, used: false },
                wolf: { active: false, used: false },
                rat: { active: false, used: false }
            }
        };
        
        // 初始化游戏状态
        this.initGame();
        
        // 初始化 Socket 事件
        this.initSocketEvents();
    }

    initGame() {
        // 显示房间控制界面
        document.getElementById('mode-selection').style.display = 'none';
        document.getElementById('room-controls').style.display = 'block';
        
        // 绑定房间相关事件
        document.getElementById('create-room').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room').addEventListener('click', () => {
            console.log('调用 joinRoom 方法');
            this.joinRoom();
        });

        // 绑定canvas点击事件
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    startGame(data) {
        // 如果有初始棋盘状态，使用它
        if (data.gameState && data.gameState.board) {
            this.board = data.gameState.board;
        } else {
            // 初始化棋子
            let redPieces = ['象', '狮', '虎', '豹', '狼', '狗', '猫', '鼠'].map(animal => ({
                type: animal,
                player: '红方',
                revealed: false
            }));
            
            let bluePieces = ['象', '狮', '虎', '豹', '狼', '狗', '猫', '鼠'].map(animal => ({
                type: animal,
                player: '蓝方',
                revealed: false
            }));
            
            // 打乱棋子
            let allPieces = [...redPieces, ...bluePieces];
            this.shuffleArray(allPieces);
            
            // 放置棋子
            for(let i = 0; i < 4; i++) {
                for(let j = 0; j < 4; j++) {
                    this.board[i][j] = allPieces[i * 4 + j];
                }
            }

            // 如果是房主，发送初始棋盘状态
            if (this.playerColor === '红方') {
                this.socket.emit('updateGameState', {
                    roomId: this.roomId,
                    gameState: this.getGameState()
                });
            }
        }

        // 绘制棋盘
        this.drawBoard();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    drawBoard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制棋盘格线
        for (let i = 0; i <= 4; i++) {
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding, this.padding + i * this.cellSize);
            this.ctx.lineTo(this.padding + 4 * this.cellSize, this.padding + i * this.cellSize);
            this.ctx.stroke();
            
            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding + i * this.cellSize, this.padding);
            this.ctx.lineTo(this.padding + i * this.cellSize, this.padding + 4 * this.cellSize);
            this.ctx.stroke();
        }

        // 绘制棋子
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.board[i][j]) {
                    this.drawPiece(i, j, this.board[i][j]);
                }
            }
        }
    }

    drawPiece(row, col, piece) {
        const x = this.padding + col * this.cellSize + this.cellSize / 2;
        const y = this.padding + row * this.cellSize + this.cellSize / 2;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize / 2 - 5, 0, Math.PI * 2);
        
        if (!piece.revealed) {
            this.ctx.fillStyle = '#8B4513';
        } else {
            const gradient = this.ctx.createRadialGradient(
                x - 5, y - 5, 5,
                x, y, this.cellSize / 2 - 5
            );
            
            if (piece.player === '红方') {
                gradient.addColorStop(0, '#ff6b6b');
                gradient.addColorStop(1, '#c92a2a');
            } else {
                gradient.addColorStop(0, '#74c0fc');
                gradient.addColorStop(1, '#1864ab');
            }
            
            this.ctx.fillStyle = gradient;
        }
        
        this.ctx.fill();
        this.ctx.strokeStyle = '#2c2c2c';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        if (piece.revealed) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 24px Ma Shan Zheng';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(piece.type, x, y);
        }
    }

    handleClick(e) {
        console.log(`当前 roomId: ${this.roomId}`);  // 添加日志记录 roomId
        if (this.gameOver || this.currentPlayer !== this.playerColor) {
            this.log('现在不是你的回合');
            console.log('点击无效：不是你的回合');
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        console.log(`点击位置：行 ${row}, 列 ${col}`);

        if (row >= 0 && row < 4 && col >= 0 && col < 4) {
            const piece = this.board[row][col];
            console.log(`点击的棋子：${piece ? piece.type : '无'}`);
            
            // 如果点击的是暗置棋子
            if (piece && !piece.revealed) {
                piece.revealed = true;
                this.log(`翻开了一张棋子：${piece.type}`);
                console.log(`翻开棋子：${piece.type}`);
                
                // 发送操作到服务器，包含完整的棋子信息
                if (this.roomId) {
                    this.socket.emit('gameAction', {
                        roomId: this.roomId,
                        action: {
                            type: 'reveal',
                            position: [row, col],
                            piece: piece  // 添加完整的棋子信息
                        },
                        gameState: this.getGameState()
                    });
                    console.log('发送翻开棋子操作到服务器');
                } else {
                    console.log('未能发送操作到服务器：roomId 未定义');
                }

                this.handleTurnEnd();
            }
            // 如果已经选中了一个棋子
            else if (this.selectedPiece) {
                const [selectedRow, selectedCol] = this.selectedPiece;
                const selectedPiece = this.board[selectedRow][selectedCol];
                
                console.log(`选中的棋子：${selectedPiece.type}`);

                // 如果点击的是同一个位置，取消选择
                if (row === selectedRow && col === selectedCol) {
                    this.selectedPiece = null;
                    console.log('取消选择棋子');
                } 
                // 如果是有效移动
                else if (this.canMove(selectedRow, selectedCol, row, col)) {
                    // 移动棋子
                    this.board[row][col] = selectedPiece;
                    this.board[selectedRow][selectedCol] = null;
                    console.log(`移动棋子到：行 ${row}, 列 ${col}`);
                    
                    // 发送操作到服务器
                    if (this.roomId) {
                        this.socket.emit('gameAction', {
                            roomId: this.roomId,
                            action: {
                                type: 'move',
                                from: [selectedRow, selectedCol],
                                to: [row, col]
                            },
                            gameState: this.getGameState()
                        });
                        console.log('发送移动棋子操作到服务器');
                    } else {
                        console.log('未能发送操作到服务器：roomId 未定义');
                    }

                    this.handleTurnEnd();
                }
                this.selectedPiece = null;
            }
            // 选择一个己方的明置棋子
            else if (piece && piece.revealed && piece.player === this.currentPlayer) {
                this.selectedPiece = [row, col];
                console.log(`选择棋子：${piece.type}`);
            }
            
            this.drawBoard();
        }
        console.log(`操作后 roomId: ${this.roomId}`);  // 添加日志记录 roomId
    }

    canMove(fromRow, fromCol, toRow, toCol) {
        // 只能横向或纵向移动一格
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
            const targetPiece = this.board[toRow][toCol];
            
            // 如果目标位置为空，可以移动
            if (!targetPiece) return true;
            
            // 如果目标位置是对方棋子，检查是否可以吃掉
            if (targetPiece.player !== this.currentPlayer) {
                const movingPiece = this.board[fromRow][fromCol];
                return this.canEat(movingPiece, targetPiece);
            }
        }
        
        return false;
    }

    canEat(attacker, defender) {
        if (!attacker || !defender) return false;
        if (attacker.type === '鼠' && defender.type === '象') return true;
        if (defender.type === '鼠' && attacker.type === '象') return false;
        return this.animals[attacker.type] >= this.animals[defender.type];
    }

    handleTurnEnd() {
        this.currentPlayer = this.currentPlayer === '红方' ? '蓝方' : '红方';
        document.getElementById('current-player').textContent = `当前回合：${this.currentPlayer}`;
        document.getElementById('current-player').className = this.currentPlayer === '红方' ? 'red' : 'blue';
        
        // 添加回合提示
        if (this.currentPlayer === this.playerColor) {
            this.log('轮到你的回合了');
        } else {
            this.log('等待对手行动');
        }

        // 如果翻开棋子后不是自己的回合，禁止继续操作
        if (this.currentPlayer !== this.playerColor) {
            this.selectedPiece = null;
        }

        // 发送更新的游戏状态到服务器
        if (this.roomId) {
            this.socket.emit('updateGameState', {
                roomId: this.roomId,
                gameState: this.getGameState()
            });
            console.log('发送更新的游戏状态到服务器');
            console.log(`当前游戏状态：${JSON.stringify(this.getGameState())}`);
        }
    }

    // Socket.io 相关方法
    initSocketEvents() {
        this.socket.on('roomCreated', (data) => {
            console.log('收到 roomCreated 事件');
            console.log(`服务器返回的数据: ${JSON.stringify(data)}`);
            this.roomId = data.roomId;
            this.playerId = data.playerId;
            this.playerColor = '红方';  // 创建房间的玩家是红方
            document.getElementById('current-room-code').textContent = this.roomId;
            document.getElementById('room-info').style.display = 'block';
            this.log(`房间创建成功，房间号：${this.roomId}`);
            console.log(`房间创建成功，房间号：${this.roomId}`);
        });

        this.socket.on('gameStart', (data) => {
            console.log('收到 gameStart 事件');
            console.log('游戏开始时的 roomId:', this.roomId);
            console.log('游戏开始时接收到的数据:', data);
            console.log('当前 this.roomId:', this.roomId);
            console.log('当前 this.playerId:', this.playerId);
            console.log('当前 this.playerColor:', this.playerColor);
            
            // 如果 roomId 为 null，尝试从 sessionStorage 或其他来源获取
            if (!this.roomId) {
                // 尝试从输入框获取 roomId
                const inputRoomId = document.getElementById('room-code').value.trim().toUpperCase();
                if (inputRoomId) {
                    this.roomId = inputRoomId;
                    console.log('从输入框获取 roomId:', this.roomId);
                }
                
                // 如果 playerId 为 null，则从 socket.id 获取
                if (!this.playerId) {
                    this.playerId = this.socket.id;
                    console.log('从 socket.id 获取 playerId:', this.playerId);
                }
                
                // 设置玩家颜色
                if (data.players) {
                    for (const id in data.players) {
                        if (id === this.playerId) {
                            this.playerColor = data.players[id];
                            console.log('从 gameStart 数据中获取 playerColor:', this.playerColor);
                            break;
                        }
                    }
                    
                    // 如果仍然没有设置 playerColor，则根据是否是当前玩家来设置
                    if (!this.playerColor) {
                        this.playerColor = data.currentPlayer === this.playerId ? '红方' : '蓝方';
                        console.log('根据当前玩家设置 playerColor:', this.playerColor);
                    }
                }
                
                console.log('设置后的 this.roomId:', this.roomId);
                console.log('设置后的 this.playerId:', this.playerId);
                console.log('设置后的 this.playerColor:', this.playerColor);
                
                if (!this.roomId) {
                    console.log('游戏开始时 roomId 未定义，无法继续');
                    return;
                }
            }
            
            document.getElementById('room-controls').style.display = 'none';
            document.getElementById('game-board').style.display = 'block';
            if (this.mode === 'spell') {
                document.getElementById('skill-panel').style.display = 'block';
            }
            
            // 显示玩家颜色
            this.log(`游戏开始！你是${this.playerColor}`);
            console.log(`游戏开始！你是${this.playerColor}`);  // 添加控制台日志
            document.getElementById('player-color').textContent = `你是 ${this.playerColor}`;
            document.getElementById('player-color').className = this.playerColor === '红方' ? 'red' : 'blue';
            
            // 初始化游戏状态
            this.startGame(data);
            
            // 确保当前玩家的回合状态正确
            if (this.playerColor === '蓝方') {
                this.log('等待红方行动');
                this.currentPlayer = '红方';
            } else {
                this.currentPlayer = '红方';
                this.log('你是红方，请先行动');
            }
            
            this.drawBoard();
        });

        // 添加游戏状态更新事件
        this.socket.on('gameStateUpdate', (data) => {
            console.log('收到 gameStateUpdate 事件');
            console.log(`更新的游戏状态: ${JSON.stringify(data)}`);
            if (data.gameState) {
                this.board = data.gameState.board;
                this.currentPlayer = data.gameState.currentPlayer;
                this.drawBoard();
            }
        });

        this.socket.on('opponentAction', (action) => {
            console.log('收到 opponentAction 事件');
            console.log(`对手的操作: ${JSON.stringify(action)}`);
            this.handleOpponentAction(action);
        });

        this.socket.on('playerDisconnected', (disconnectedId) => {
            console.log('收到 playerDisconnected 事件');
            console.log(`断开连接的玩家 ID: ${disconnectedId}`);
            if (disconnectedId !== this.playerId) {
                alert('对手已断开连接');
                this.gameOver = true;
            }
        });

        this.socket.on('joinError', (message) => {
            console.log('收到 joinError 事件');
            console.log(`错误信息: ${message}`);
            alert(message);
        });

        this.socket.on('roomJoined', (data) => {
            console.log('收到 roomJoined 事件');
            console.log('服务器返回的数据:', data);
            if (data.roomId) {
                this.roomId = data.roomId;
                console.log('房间加入成功，房间号：', this.roomId);
                this.playerId = data.playerId;
                this.playerColor = '蓝方';  // 加入房间的玩家是蓝方
                document.getElementById('current-room-code').textContent = this.roomId;
                document.getElementById('room-info').style.display = 'block';
                this.log(`成功加入房间，房间号：${this.roomId}`);
                console.log(`成功加入房间，房间号：${this.roomId}`);
            } else {
                console.log('房间加入失败，未接收到 roomId');
                this.log('加入房间失败，未能获取 roomId');
            }
            this.playerId = data.playerId || this.playerId;
            this.playerColor = data.playerColor || this.playerColor;
            console.log('当前 this.roomId:', this.roomId);
            console.log('当前 this.playerId:', this.playerId);
            console.log('当前 this.playerColor:', this.playerColor);
        });
    }

    createRoom() {
        this.socket.emit('createRoom');
        this.socket.on('roomCreated', (data) => {
            this.roomId = data.roomId;
            this.playerId = data.playerId;
            this.playerColor = '红方';  // 创建房间的玩家是红方
            document.getElementById('current-room-code').textContent = this.roomId;
            document.getElementById('room-info').style.display = 'block';
            this.log(`房间创建成功，房间号：${this.roomId}`);
            console.log(`房间创建成功，房间号：${this.roomId}`);
        });
    }

    joinRoom() {
        const roomId = document.getElementById('room-code').value.trim().toUpperCase();
        console.log('调用 joinRoom 方法');
        console.log('输入的房间号:', roomId);
        console.log('准备发送加入房间请求');
        if (roomId) {
            this.socket.emit('joinRoom', roomId);
        } else {
            console.log('房间号为空，无法加入房间');
            alert('请输入房间码');
        }
    }

    handleOpponentAction(action) {
        console.log(`收到对手操作：${action.type}`);
        if (action.type === 'move') {
            const [fromRow, fromCol] = action.from;
            const [toRow, toCol] = action.to;
            
            const piece = this.board[fromRow][fromCol];
            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = null;
            
            this.log(`对手移动了 ${piece.type}`);
            console.log(`对手移动棋子：${piece.type} 到 行 ${toRow}, 列 ${toCol}`);
        } else if (action.type === 'reveal') {
            const [row, col] = action.position;
            // 使用服务器发送的棋子信息
            if (action.piece) {
                this.board[row][col] = action.piece;
                this.board[row][col].revealed = true;
                this.log(`对手翻开了 ${action.piece.type}`);
                console.log(`对手翻开棋子：${action.piece.type} 在 行 ${row}, 列 ${col}`);
            }
        }
        
        this.drawBoard();
        // 确保游戏状态更新
        this.currentPlayer = this.currentPlayer === '红方' ? '蓝方' : '红方';
        document.getElementById('current-player').textContent = `当前回合：${this.currentPlayer}`;
        document.getElementById('current-player').className = this.currentPlayer === '红方' ? 'red' : 'blue';

        // 添加回合提示
        if (this.currentPlayer === this.playerColor) {
            this.log('轮到你的回合了');
        } else {
            this.log('等待对手行动');
        }

        // 发送更新的游戏状态到服务器
        if (this.roomId) {
            this.socket.emit('updateGameState', {
                roomId: this.roomId,
                gameState: this.getGameState()
            });
            console.log('发送更新的游戏状态到服务器');
            console.log(`当前游戏状态：${JSON.stringify(this.getGameState())}`);
        }
    }

    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            skills: this.skills,
            gameOver: this.gameOver
        };
    }

    // 添加日志方法
    log(message) {
        if (this.logContainer) {
            const logEntry = document.createElement('div');
            logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
            this.logContainer.insertBefore(logEntry, this.logContainer.firstChild);
            console.log(message); // 同时在控制台显示
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const modeSelection = document.getElementById('mode-selection');
    const gameContainer = document.getElementById('game-container');
    let game = null;

    // 经典模式按钮点击事件
    document.getElementById('classic-mode').addEventListener('click', () => {
        game = new AnimalChess('classic');
    });

    // 符咒模式按钮点击事件
    document.getElementById('spell-mode').addEventListener('click', () => {
        game = new AnimalChess('spell');
    });
}); 