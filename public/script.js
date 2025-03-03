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
        
        // 初始化游戏状态
        this.initGame();
        
        // 初始化 Socket 事件
        this.initSocketEvents();
    }

    initGame() {
        // ... 保持原有的初始化代码 ...
        
        // 显示房间控制界面
        document.getElementById('mode-selection').style.display = 'none';
        document.getElementById('room-controls').style.display = 'block';
        
        // 绑定房间相关事件
        document.getElementById('create-room').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room').addEventListener('click', () => this.joinRoom());
    }

    initSocketEvents() {
        // 房间创建成功
        this.socket.on('roomCreated', (data) => {
            this.roomId = data.roomId;
            this.playerId = data.playerId;
            document.getElementById('current-room-code').textContent = this.roomId;
            document.getElementById('room-info').style.display = 'block';
        });

        // 游戏开始
        this.socket.on('gameStart', (data) => {
            this.playerColor = data.players[this.playerId];
            document.getElementById('room-controls').style.display = 'none';
            document.getElementById('game-board').style.display = 'block';
            if (this.mode === 'spell') {
                document.getElementById('skill-panel').style.display = 'block';
            }
            this.startGame(data);
        });

        // 处理对手的操作
        this.socket.on('opponentAction', (action) => {
            this.handleOpponentAction(action);
        });

        // 处理玩家断开连接
        this.socket.on('playerDisconnected', (disconnectedId) => {
            if (disconnectedId !== this.playerId) {
                alert('对手已断开连接');
                this.gameOver = true;
            }
        });

        // 处理加入房间错误
        this.socket.on('joinError', (message) => {
            alert(message);
        });
    }

    createRoom() {
        this.socket.emit('createRoom');
    }

    joinRoom() {
        const roomId = document.getElementById('room-code').value.trim().toUpperCase();
        if (roomId) {
            this.socket.emit('joinRoom', roomId);
        } else {
            alert('请输入房间码');
        }
    }

    handleClick(e) {
        if (this.gameOver || this.currentPlayer !== this.playerColor) return;

        // ... 保持原有的点击处理逻辑 ...

        // 发送操作到服务器
        if (this.roomId) {
            this.socket.emit('gameAction', {
                roomId: this.roomId,
                action: {
                    type: 'move',
                    from: this.selectedPiece,
                    to: [row, col]
                },
                gameState: this.getGameState()
            });
        }
    }

    handleOpponentAction(action) {
        if (action.type === 'move') {
            // 处理移动操作
            const [fromRow, fromCol] = action.from;
            const [toRow, toCol] = action.to;
            
            // 执行移动
            const piece = this.board[fromRow][fromCol];
            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = null;
            
            // 更新游戏状态
            this.handleTurnEnd();
            this.drawBoard();
        } else if (action.type === 'skill') {
            // 处理技能使用
            this.handleOpponentSkill(action);
        }
    }

    handleSkillClick(color, animal) {
        if (this.currentPlayer !== this.playerColor) return;
        
        // ... 保持原有的技能处理逻辑 ...

        // 发送技能使用到服务器
        if (this.roomId) {
            this.socket.emit('gameAction', {
                roomId: this.roomId,
                action: {
                    type: 'skill',
                    color,
                    animal,
                    target: this.selectedPiece
                },
                gameState: this.getGameState()
            });
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

    // ... 保持其他原有方法不变 ...
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