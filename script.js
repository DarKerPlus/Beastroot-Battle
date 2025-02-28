class AnimalChess {
    constructor() {
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        this.currentPlayer = '红方';
        this.gameOver = false;
        this.cellSize = 100;
        this.padding = 0;
        this.selectedPiece = null;
        
        // 定义动物及其等级
        this.animals = {
            '象': 8, '狮': 7, '虎': 6, '豹': 5,
            '狼': 4, '狗': 3, '猫': 2, '鼠': 1
        };
        
        this.board = Array(4).fill().map(() => Array(4).fill(null));
        
        // 添加技能状态
        this.skills = {
            red: {
                cat: { active: false, used: false },
                lion: { active: false, used: false },
                dog: { active: false, used: false }
            },
            blue: {
                cat: { active: false, used: false },
                lion: { active: false, used: false },
                dog: { active: false, used: false }
            }
        };
        
        this.stunned = null; // 记录被咆哮的棋子位置
        this.stunnedPlayer = null; // 记录被咆哮棋子的所属方
        this.hasStunnedPlayerMoved = false; // 记录被咆哮方是否已经行动
        this.init();
        this.initSkills();
    }

    init() {
        // 初始化棋盘
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
        
        this.drawBoard();
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        document.getElementById('restart').addEventListener('click', () => this.restart());
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
        
        // 如果有选中的棋子，绘制高亮
        if (this.selectedPiece) {
            const [row, col] = this.selectedPiece;
            this.highlightPiece(row, col);
        }
    }

    drawPiece(row, col, piece) {
        const x = this.padding + col * this.cellSize + this.cellSize / 2;
        const y = this.padding + row * this.cellSize + this.cellSize / 2;
        
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize / 2 - 5, 0, Math.PI * 2);
        
        if (!piece.revealed) {
            this.ctx.fillStyle = '#8B4513';
        } else {
            const gradient = this.ctx.createRadialGradient(
                x - 5, y - 5, 5,
                x, y, this.cellSize / 2 - 5
            );
            
            // 检查是否被咆哮
            if (this.stunned && 
                this.stunned[0] === row && 
                this.stunned[1] === col) {
                // 被咆哮的棋子显示为灰色
                gradient.addColorStop(0, '#a0a0a0');
                gradient.addColorStop(1, '#606060');
            } else {
                if (piece.player === '红方') {
                    gradient.addColorStop(0, '#ff6b6b');
                    gradient.addColorStop(1, '#c92a2a');
                } else {
                    gradient.addColorStop(0, '#74c0fc');
                    gradient.addColorStop(1, '#1864ab');
                }
            }
            
            this.ctx.fillStyle = gradient;
        }
        
        this.ctx.fill();
        this.ctx.strokeStyle = '#2c2c2c';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        if (piece.revealed) {
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 24px Ma Shan Zheng';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(piece.type, x, y);

            // 如果是猫且有两命，添加标记
            if (piece.type === '猫') {
                const color = piece.player === '红方' ? 'red' : 'blue';
                if (this.skills[color].cat.active && !this.skills[color].cat.used) {
                    // 在棋子上方绘制小圆点表示两命
                    this.ctx.beginPath();
                    this.ctx.arc(x, y - this.cellSize/3, 5, 0, Math.PI * 2);
                    this.ctx.fillStyle = '#32CD32'; // 绿色圆点表示有两命
                    this.ctx.fill();
                }
            }
        }
        
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }

    canEat(attacker, defender) {
        if (!attacker || !defender) return false;
        if (attacker.type === '鼠' && defender.type === '象') return true;
        return this.animals[attacker.type] >= this.animals[defender.type];
    }

    updateCurrentPlayer() {
        const playerSpan = document.getElementById('current-player');
        playerSpan.textContent = this.currentPlayer;
        playerSpan.className = this.currentPlayer === '红方' ? 'red' : 'blue';
        
        // 更新棋盘边框高亮
        const boardContainer = document.querySelector('.board-container');
        boardContainer.classList.remove('red-turn', 'blue-turn');
        boardContainer.classList.add(this.currentPlayer === '红方' ? 'red-turn' : 'blue-turn');
    }

    checkWinner() {
        let redPieces = 0;
        let bluePieces = 0;

        // 统计双方剩余棋子数量
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const piece = this.board[i][j];
                if (piece) {
                    if (piece.player === '红方') redPieces++;
                    else bluePieces++;
                }
            }
        }

        // 如果某一方棋子数量为0，另一方获胜
        if (redPieces === 0) {
            alert('蓝方获胜！');
            this.gameOver = true;
        } else if (bluePieces === 0) {
            alert('红方获胜！');
            this.gameOver = true;
        }
    }

    handleClick(e) {
        if (this.gameOver) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        if (row >= 0 && row < 4 && col >= 0 && col < 4) {
            const piece = this.board[row][col];
            
            // 如果点击的是暗置棋子
            if (piece && !piece.revealed) {
                this.revealPiece(row, col);
                this.handleTurnEnd();
                this.drawBoard();
                return;
            }
            
            // 如果已经选中了一个棋子
            if (this.selectedPiece) {
                const [selectedRow, selectedCol] = this.selectedPiece;
                const selectedPiece = this.board[selectedRow][selectedCol];
                
                // 如果点击的是同一个位置，取消选择
                if (row === selectedRow && col === selectedCol) {
                    this.selectedPiece = null;
                    this.drawBoard();
                    return;
                }
                
                // 检查是否被咆哮
                if (this.stunned && 
                    this.stunned[0] === selectedRow && 
                    this.stunned[1] === selectedCol) {
                    alert('该棋子被咆哮震慑，本回合无法行动！');
                    this.selectedPiece = null;
                    this.drawBoard();
                    return;
                }
                
                // 尝试移动棋子
                if (this.canMove(selectedRow, selectedCol, row, col)) {
                    const targetPiece = this.board[row][col];
                    
                    // 如果目标位置有对方的棋子，检查是否可以吃掉
                    if (targetPiece && targetPiece.revealed && 
                        targetPiece.player !== this.currentPlayer && 
                        this.canEat(selectedPiece, targetPiece)) {
                        
                        // 处理猫的两命技能
                        if (targetPiece.type === '猫') {
                            const color = targetPiece.player === '红方' ? 'red' : 'blue';
                            if (this.skills[color].cat.active && !this.skills[color].cat.used &&
                                !(selectedPiece.type === '狮' && this.skills[selectedPiece.player === '红方' ? 'red' : 'blue'].lion.active)) {
                                this.skills[color].cat.used = true;
                                document.getElementById(`${color}-cat-skill`).classList.add('used');
                                alert('猫使用了两命技能，免疫了这次伤害！');
                                this.handleTurnEnd();
                                this.selectedPiece = null;
                                this.drawBoard();
                                return;
                            }
                        }
                        
                        // 正常的吃子逻辑
                        this.board[row][col] = selectedPiece;
                        this.board[selectedRow][selectedCol] = null;
                        this.handleTurnEnd();
                        this.checkWinner();
                    } 
                    // 如果目标位置为空，直接移动
                    else if (!targetPiece) {
                        this.board[row][col] = selectedPiece;
                        this.board[selectedRow][selectedCol] = null;
                        this.handleTurnEnd();
                    }
                }
                
                this.selectedPiece = null;
                this.drawBoard();
                return;
            }
            
            // 选择一个己方的明置棋子
            if (piece && piece.revealed && piece.player === this.currentPlayer) {
                this.selectedPiece = [row, col];
                this.drawBoard();
                // 高亮显示选中的棋子
                this.highlightPiece(row, col);
            }
        }
    }

    canMove(fromRow, fromCol, toRow, toCol) {
        // 只能横向或纵向移动一格
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    highlightPiece(row, col) {
        const x = this.padding + col * this.cellSize + this.cellSize / 2;
        const y = this.padding + row * this.cellSize + this.cellSize / 2;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize / 2 - 2, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ffeb3b';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#000';
    }

    initSkills() {
        // 初始化技能点击事件
        ['red', 'blue'].forEach(color => {
            ['cat', 'lion', 'dog'].forEach(animal => {
                const skillBox = document.getElementById(`${color}-${animal}-skill`);
                skillBox.addEventListener('click', () => this.handleSkillClick(color, animal));
            });
        });
    }

    handleSkillClick(color, animal) {
        if (this.currentPlayer !== `${color === 'red' ? '红' : '蓝'}方`) return;
        const skill = this.skills[color][animal];
        
        if (!skill.active || skill.used) return;

        if (animal === 'dog' && !skill.used) {
            // 处理咆哮技能
            this.activateDogSkill(color);
        }
    }

    activateDogSkill(color) {
        this.canvas.style.cursor = 'crosshair';
        const handler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const col = Math.floor(x / this.cellSize);
            const row = Math.floor(y / this.cellSize);
            
            if (row >= 0 && row < 4 && col >= 0 && col < 4) {
                const piece = this.board[row][col];
                if (piece && piece.revealed && piece.player !== `${color === 'red' ? '红' : '蓝'}方`) {
                    this.stunned = [row, col];
                    this.stunnedPlayer = piece.player; // 记录被咆哮棋子的所属方
                    this.hasStunnedPlayerMoved = false; // 重置行动标记
                    this.skills[color].dog.used = true;
                    document.getElementById(`${color}-dog-skill`).classList.add('used');
                    alert(`${piece.type}被咆哮震慑，下回合无法行动！`);
                    this.canvas.style.cursor = 'default';
                    this.canvas.removeEventListener('click', handler);
                    this.drawBoard();
                }
            }
        };
        
        this.canvas.addEventListener('click', handler);
    }

    // 在棋子翻开时激活对应的技能
    revealPiece(row, col) {
        const piece = this.board[row][col];
        if (!piece || piece.revealed) return;
        
        piece.revealed = true;
        const color = piece.player === '红方' ? 'red' : 'blue';
        
        // 激活对应技能
        if (['猫', '狮', '狗'].includes(piece.type)) {
            const skillType = piece.type === '猫' ? 'cat' : 
                            piece.type === '狮' ? 'lion' : 'dog';
            this.skills[color][skillType].active = true;
            const skillBox = document.getElementById(`${color}-${skillType}-skill`);
            skillBox.classList.add('active');
            skillBox.querySelector('.skill-status').textContent = '已激活';
        }
    }

    restart() {
        this.init();
        this.currentPlayer = '红方';
        this.gameOver = false;
        this.selectedPiece = null;
        this.updateCurrentPlayer();
        
        // 重置技能状态
        ['red', 'blue'].forEach(color => {
            ['cat', 'lion', 'dog'].forEach(animal => {
                this.skills[color][animal] = { active: false, used: false };
                const skillBox = document.getElementById(`${color}-${animal}-skill`);
                skillBox.classList.remove('active', 'used');
            });
        });
        
        this.stunned = null;
        this.stunnedPlayer = null;
        this.hasStunnedPlayerMoved = false;
    }

    // 添加新方法来处理玩家行动后的状态更新
    handleTurnEnd() {
        // 在切换玩家之前，检查是否是被咆哮方的行动
        if (this.stunned && this.currentPlayer === this.stunnedPlayer) {
            this.hasStunnedPlayerMoved = true;
        }

        // 如果被咆哮方已经行动过，解除咆哮状态
        if (this.hasStunnedPlayerMoved) {
            this.stunned = null;
            this.stunnedPlayer = null;
            this.hasStunnedPlayerMoved = false;
            this.drawBoard();
        }

        // 切换玩家
        this.currentPlayer = this.currentPlayer === '红方' ? '蓝方' : '红方';
        this.updateCurrentPlayer();
    }
}

// 初始化游戏
new AnimalChess(); 