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
        this.init();
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
        
        // 添加棋子阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize / 2 - 5, 0, Math.PI * 2);
        
        if (!piece.revealed) {
            // 暗置的棋子使用木纹色
            this.ctx.fillStyle = '#8B4513';
        } else {
            // 明置的棋子
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
            // 重置阴影
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 24px Ma Shan Zheng';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(piece.type, x, y);
        }
        
        // 重置阴影
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
                piece.revealed = true;
                this.currentPlayer = this.currentPlayer === '红方' ? '蓝方' : '红方';
                this.updateCurrentPlayer();
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
                
                // 尝试移动棋子
                if (this.canMove(selectedRow, selectedCol, row, col)) {
                    const targetPiece = this.board[row][col];
                    
                    // 如果目标位置有对方的棋子，检查是否可以吃掉
                    if (targetPiece && targetPiece.revealed && 
                        targetPiece.player !== this.currentPlayer && 
                        this.canEat(selectedPiece, targetPiece)) {
                        
                        this.board[row][col] = selectedPiece;
                        this.board[selectedRow][selectedCol] = null;
                        this.currentPlayer = this.currentPlayer === '红方' ? '蓝方' : '红方';
                        this.updateCurrentPlayer();
                        this.checkWinner();
                    } 
                    // 如果目标位置为空，直接移动
                    else if (!targetPiece) {
                        this.board[row][col] = selectedPiece;
                        this.board[selectedRow][selectedCol] = null;
                        this.currentPlayer = this.currentPlayer === '红方' ? '蓝方' : '红方';
                        this.updateCurrentPlayer();
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

    restart() {
        this.init();
        this.currentPlayer = '红方';
        this.gameOver = false;
        this.selectedPiece = null;
        this.updateCurrentPlayer();
    }
}

// 初始化游戏
new AnimalChess(); 