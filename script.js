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
        
        // 修改技能状态
        this.skills = {
            red: {
                cat: { active: false, used: false },
                dog: { active: false, used: false },
                tiger: { active: false, used: false },
                leopard: { active: false, used: false }
            },
            blue: {
                cat: { active: false, used: false },
                dog: { active: false, used: false },
                tiger: { active: false, used: false },
                leopard: { active: false, used: false }
            }
        };
        
        // 添加已死亡棋子记录
        this.deadPieces = {
            red: [],
            blue: []
        };
        
        this.stunned = null;
        this.stunnedPlayer = null;
        this.hasStunnedPlayerMoved = false;
        this.tigerJumpMode = false; // 是否在虎跃模式
        this.tigerJumpUsed = false; // 本回合是否已经使用过虎跃
        this.leopardDiagonalMode = false; // 是否在斜扑模式
        this.leopardDiagonalUsed = false; // 本回合是否已经使用过斜扑
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

            // 添加技能标识
            if (['猫', '狗', '虎', '豹'].includes(piece.type)) {
                const color = piece.player === '红方' ? 'red' : 'blue';
                const skillType = piece.type === '猫' ? 'cat' : 
                                piece.type === '狗' ? 'dog' : 
                                piece.type === '虎' ? 'tiger' : 'leopard';
                const skill = this.skills[color][skillType];

                if (skill.active) {
                    // 绘制技能图标
                    this.ctx.beginPath();
                    this.ctx.arc(x + this.cellSize/3, y - this.cellSize/3, 8, 0, Math.PI * 2);
                    
                    if (skill.used) {
                        this.ctx.fillStyle = '#808080';
                    } else {
                        this.ctx.fillStyle = piece.type === '猫' ? '#ff69b4' : 
                                           piece.type === '狗' ? '#ffd700' : 
                                           piece.type === '虎' ? '#ff4500' :
                                           '#9932cc'; // 豹子斜扑为紫色
                    }
                    this.ctx.fill();

                    this.ctx.fillStyle = 'white';
                    this.ctx.font = '12px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(
                        piece.type === '猫' ? '复' : 
                        piece.type === '狗' ? '咆' : 
                        piece.type === '虎' ? '跃' : '扑',
                        x + this.cellSize/3, y - this.cellSize/3
                    );
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
                    
                    // 检查是否是斜扑移动
                    const isDiagonalMove = Math.abs(row - selectedRow) === 1 && 
                                         Math.abs(col - selectedCol) === 1;
                    
                    if (isDiagonalMove) {
                        this.leopardDiagonalUsed = true;
                    }

                    // 如果目标位置有对方的棋子，检查是否可以吃掉
                    if (targetPiece && targetPiece.revealed && 
                        targetPiece.player !== this.currentPlayer && 
                        this.canEat(selectedPiece, targetPiece)) {
                        
                        // 记录被吃的棋子
                        this.handleCapture(selectedRow, selectedCol, row, col);
                        
                        // 执行吃子操作
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
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        // 普通移动：只能横向或纵向移动一格
        if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
            return true;
        }
        
        // 虎跃模式：可以跳过一格
        if (this.tigerJumpMode && !this.tigerJumpUsed) {
            if ((rowDiff === 2 && colDiff === 0) || (rowDiff === 0 && colDiff === 2)) {
                return true;
            }
        }

        // 斜扑模式：可以斜着移动一格
        if (this.leopardDiagonalMode && !this.leopardDiagonalUsed) {
            if (rowDiff === 1 && colDiff === 1) {
                return true;
            }
        }
        
        return false;
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
            ['cat', 'dog', 'tiger', 'leopard'].forEach(animal => {
                const skillBox = document.getElementById(`${color}-${animal}-skill`);
                skillBox.addEventListener('click', () => this.handleSkillClick(color, animal));
            });
        });
    }

    handleSkillClick(color, animal) {
        if (this.currentPlayer !== `${color === 'red' ? '红' : '蓝'}方`) return;
        const skill = this.skills[color][animal];
        
        if (!skill.active || skill.used) return;

        // 检查对应的棋子是否还活着
        let animalAlive = false;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const piece = this.board[i][j];
                if (piece && piece.type === (animal === 'cat' ? '猫' : animal === 'dog' ? '狗' : animal === 'tiger' ? '虎' : '豹') && 
                    piece.player === `${color === 'red' ? '红' : '蓝'}方`) {
                    animalAlive = true;
                    break;
                }
            }
        }

        if (!animalAlive) {
            alert('该棋子已阵亡，无法使用技能！');
            return;
        }

        if (animal === 'dog') {
            this.activateDogSkill(color);
        } else if (animal === 'cat') {
            this.activateReviveSkill(color);
        } else if (animal === 'tiger') {
            this.activateTigerJump(color);
        } else if (animal === 'leopard') {
            this.activateLeopardDiagonal(color);
        }
    }

    activateReviveSkill(color) {
        const deadPieces = this.deadPieces[color];
        if (deadPieces.length === 0) {
            alert('没有可以复活的棋子！');
            return;
        }

        // 创建选择框
        const selectBox = document.createElement('div');
        selectBox.style.position = 'fixed';
        selectBox.style.top = '50%';
        selectBox.style.left = '50%';
        selectBox.style.transform = 'translate(-50%, -50%)';
        selectBox.style.background = 'white';
        selectBox.style.padding = '20px';
        selectBox.style.borderRadius = '10px';
        selectBox.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        selectBox.style.zIndex = '1000';

        const title = document.createElement('h3');
        title.textContent = '选择要复活的棋子：';
        selectBox.appendChild(title);

        const select = document.createElement('select');
        deadPieces.forEach((piece, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = piece.type;
            select.appendChild(option);
        });
        selectBox.appendChild(select);

        const button = document.createElement('button');
        button.textContent = '确定';
        button.style.marginTop = '10px';
        button.onclick = () => {
            const selectedPiece = deadPieces[select.value];
            this.placePieceOnBoard(selectedPiece, color);
            document.body.removeChild(selectBox);
            
            // 标记技能为已使用
            this.skills[color].cat.used = true;
            document.getElementById(`${color}-cat-skill`).classList.add('used');
        };
        selectBox.appendChild(button);

        document.body.appendChild(selectBox);
    }

    placePieceOnBoard(piece, color) {
        const emptySpaces = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (!this.board[i][j]) {
                    emptySpaces.push([i, j]);
                }
            }
        }

        if (emptySpaces.length === 0) {
            alert('棋盘已满，无法复活棋子！');
            return;
        }

        // 随机选择一个空位
        const [row, col] = emptySpaces[Math.floor(Math.random() * emptySpaces.length)];
        this.board[row][col] = {
            ...piece,
            revealed: false
        };

        // 从死亡列表中移除该棋子
        const index = this.deadPieces[color].findIndex(p => p.type === piece.type);
        this.deadPieces[color].splice(index, 1);

        alert(`${piece.type}已复活并暗置在棋盘上`);
        this.drawBoard();
    }

    // 修改吃子逻辑，添加死亡棋子记录
    handleCapture(fromRow, fromCol, toRow, toCol) {
        const capturedPiece = this.board[toRow][toCol];
        const color = capturedPiece.player === '红方' ? 'red' : 'blue';
        this.deadPieces[color].push(capturedPiece);
        
        if (capturedPiece.type === '狗' || capturedPiece.type === '猫' || capturedPiece.type === '虎') {
            const skillType = capturedPiece.type === '狗' ? 'dog' : 
                            capturedPiece.type === '猫' ? 'cat' : 'tiger';
            const skillBox = document.getElementById(`${color}-${skillType}-skill`);
            
            this.skills[color][skillType].active = false;
            this.skills[color][skillType].used = false;
            
            skillBox.classList.remove('active', 'used');
            skillBox.querySelector('.skill-status').textContent = '未激活';
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
        if (['猫', '狗', '虎', '豹'].includes(piece.type)) {
            const skillType = piece.type === '猫' ? 'cat' : 
                             piece.type === '狗' ? 'dog' : 
                             piece.type === '虎' ? 'tiger' : 'leopard';
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
            ['cat', 'dog', 'tiger', 'leopard'].forEach(animal => {
                this.skills[color][animal] = { active: false, used: false };
                const skillBox = document.getElementById(`${color}-${animal}-skill`);
                skillBox.classList.remove('active', 'used');
            });
        });
        
        this.stunned = null;
        this.stunnedPlayer = null;
        this.hasStunnedPlayerMoved = false;
        this.tigerJumpMode = false;
        this.tigerJumpUsed = false;
        this.leopardDiagonalMode = false;
        this.leopardDiagonalUsed = false;
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

        // 回合结束时重置虎跃状态
        this.tigerJumpMode = false;
        this.tigerJumpUsed = false;

        // 回合结束时重置斜扑状态
        this.leopardDiagonalMode = false;
        this.leopardDiagonalUsed = false;

        // 切换玩家
        this.currentPlayer = this.currentPlayer === '红方' ? '蓝方' : '红方';
        this.updateCurrentPlayer();
    }

    activateTigerJump(color) {
        this.tigerJumpMode = true;
        this.tigerJumpUsed = false;
        alert('虎跃模式已激活，本回合所有己方棋子可以跳跃移动');
        
        // 标记技能为已使用
        this.skills[color].tiger.used = true;
        document.getElementById(`${color}-tiger-skill`).classList.add('used');
    }

    activateLeopardDiagonal(color) {
        this.leopardDiagonalMode = true;
        this.leopardDiagonalUsed = false;
        alert('斜扑模式已激活，本回合可以斜着移动一次');
        
        // 标记技能为已使用
        this.skills[color].leopard.used = true;
        document.getElementById(`${color}-leopard-skill`).classList.add('used');
    }
}

// 初始化游戏
new AnimalChess(); 