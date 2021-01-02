const rewardNames = [
	"Single",
	"Double",
	"Triple",
	"Tetris",
	"T-spin mini",
	"T-spin mini single",
	"T-spin mini double",
	"T-spin",
	"T-spin single",
	"T-spin double",
	"T-spin triple"
];
const rewardIndexMapping = [-1, 4, 7];
const doesRewardTriggerBackToBack = [false, false, false, true, false, false, true, false, true, true, true];

// Currently just a stripped down version of the in-game playfield.
class ReplayPlayfield {
	constructor() {
		this.random = new MersenneTwister();
		this.board = [];
		let col = [];
		this.minos = [];
		this.totalMinos = 0;
		this.placedBoard = [];
		this.rowIDs = [];
		this.lastRowID = 39;
		this.lastPlacedBoardID = -1;
		for (let i = 0; i < 40; i++) {
			col.push(undefined);
			this.minos.push(0);
			this.rowIDs.push(39-i);
		}
		for (let i = 0; i < 10; i++) this.board.push([...col]);
		this.score = 0;
		this.lines = 0;
		this.current = null;
		this.queue = [];
		this.hold = null;
		this.combo = -1;
		this.backToBack = false;
		this.stats = [[null, 0, null], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, null, null]]; // First level: number of lines cleared; Second level: normal, by T-spin, total.
		this.rewardAmounts = [100, 400, 900, 2500, 25, 50, 75, 50, 150, 600, 1250];
		this.backToBacks = 0;
		this.holds = 0;
		this.maxCombo = 0;
		this.allClears = 0;
		this.dropScore = 0;
		this.lastTimeMark = 0;
		this.lastTetriminoTime = 0;
		this.timeLog = [];
		this.actionLog = [];
		this.singleSaveableFields = ["score", "lines", "combo", "backToBack", "holdSwitched", "clearTime", "clearedLines", "tetriminoes", "holds", "keypressed", "wasNull", "moveLock", "isClearing"];
		this.over = false;
	}

	processTimePassed(timePassed) {}

	afterClear(timestamp) {
		for (let line of this.clearedLines) {
			for (let i = 0; i < 10; i++) {
				this.board[i].splice(line, 1);
				this.board[i] = [undefined].concat(this.board[i]);
			}
			this.minos.splice(line, 1);
			this.minos.unshift(0);
			this.rowIDs.splice(line, 1);
			this.rowIDs.unshift(++this.lastRowID);
		}
		this.dropScore = 0;
		this.nextTetrimino(timestamp);
	}

	fall() {
		if (this.current == null || !this.current.canFall(this.board)) return;
		this.current.onMove();
		this.current.y++;
	}

	lockDown(timestamp) {
		if (this.current == null) return;
		this.lock(timestamp);
	}

	move(offset) {
		if (this.current != null) {
			let newX = this.current.x + offset;
			if (!this.current.checkCollision(this.board, newX, this.current.y)) {
				this.current.x = newX;
				this.current.onMove();
			}
		}
	}

	rotateClockwise() {
		if (this.current != null) this.current.rotateClockwise(this.board);
	}

	rotateCounterClockwise() {
		if (this.current != null) this.current.rotateCounterClockwise(this.board);
	}

	softDrop() {
		if (this.current != null && this.current.canFall(this.board)) {
			this.current.y++;
			this.current.onMove();
		}
	}

	hardDrop(timestamp) {
		if (this.current == null) return;
		let count = 0;
		while (this.current.canFall(this.board)) {
			this.current.y++;
			count++;
		}
		if (count) this.current.onMove();
		this.lock(timestamp);
		return count;
	}

	doHold(timestamp) {
		if (this.current != null && !this.holdSwitched) {
			this.oldHold = this.hold;
			this.hold = this.current;
			this.actionLog.push({
				timestamp: timestamp,
				type: "Hold",
				tetrimino: this.hold.code,
				score: this.dropScore,
				time: timestamp - this.lastTimeMark
			});
			if (this.oldHold == null) this.nextTetrimino(timestamp); else {
				this.current = this.oldHold;
				this.current.reset();
				this.checkGameOver();
			}
			this.holds++;
			this.holdSwitched = true;
			this.dropScore = 0;
			this.lastTimeMark = timestamp;
		}
	}

	getBaseline() {
		return this.current.y + this.current.baseY[this.current.state];
	}

	lock(timestamp) {
		if (this.current == null) return;

		this.timeLog.push(timestamp - this.lastTimeMark);
		this.actionLog.push({
			timestamp: timestamp,
			type: "Tetrimino",
			tetrimino: this.current.code,
			time: timestamp - this.lastTetriminoTime,
			score: this.dropScore
		});
		this.dropScore = 0;

		let toClear = [];
		this.tetriminoes++;
		let tSpinType = this.current.getTSpinType(this.board);
		for (let mino of this.current.getLockPositions()) {
			this.board[mino[0]][mino[1]] = new Mino(mino[2], this.current.textureY, 0);
			if (++this.minos[mino[1]] == 10) toClear.push(mino[1]);
		}
		this.totalMinos += 4;
		let baseline = this.getBaseline();
		if (baseline < 20) {
			this.gameOver();
			return -1;
		}
		this.addReward(rewardIndexMapping[tSpinType] + toClear.length, timestamp);
		this.clearLines(toClear, timestamp);
		if (toClear.length != 0) {
			this.stats[toClear.length][tSpinType ? 1 : 0]++;
			if (this.stats[toClear.length][2] != null) this.stats[toClear.length][2]++;
		} else {
			if (tSpinType) this.stats[0][1]++;
			this.combo = -1;
			this.nextTetrimino(timestamp);
		}
		return baseline;
	}

	clearLines(toClear, timestamp) {
		if (toClear.length == 0) return;
		this.clearedLines = toClear.sort((a, b) => a - b);
		for (let line of this.clearedLines) {
			let row = [];
			for (let i = 0; i < 10; i++) {
				if (line != 0 && this.board[i][line - 1] != undefined) this.board[i][line - 1].directions &= 0b1110;
				if (line != 39 && this.board[i][line + 1] != undefined) this.board[i][line + 1].directions &= 0b1011;
				row.push(this.getMinoColor(i, line));
				//this.board[i][line] = undefined; Not needed for this purpose.
			}
			this.setPlacedRow(this.rowIDs[line], row);
		}
		this.lines += toClear.length;
		if ((this.totalMinos -= toClear.length * 10) == 0) {
			this.score += 1000;
			this.actionLog.push({
				timestamp: timestamp,
				type: "Reward",
				rewardName: "All clear",
				rewardAmount: 1000
			});
			this.allClears++;
		}
		this.current = null;
	}

	addReward(reward, timestamp) {
		if (reward == -1) return;
		let rewardName = this.getRewardName(reward);
		let rewardAmount = this.getRewardAmount(reward);
		if (doesRewardTriggerBackToBack[reward]) {
			if (this.backToBack) {
				rewardAmount *= 1.5;
				rewardName += " BTB";
				this.backToBacks++;
			} else this.backToBack = true;
		} else this.backToBack = this.backToBack && reward > 2;
		if (reward != 4 && reward != 7 && ++this.combo > 0) {
			rewardAmount += this.getComboBonus();
			if (this.combo > this.maxCombo) this.maxCombo = this.combo;
		}
		this.score += rewardAmount;
		this.actionLog.push({
			timestamp: timestamp,
			type: "Reward",
			rewardName: rewardName,
			rewardAmount: rewardAmount
		});
	}	

	getRewardName(reward) {
		return rewardNames[reward];
	}

	getRewardAmount(reward) {
		return this.rewardAmounts[reward];
	}

	getComboBonus() {
		return this.combo * 50;
	}
	
	pushToQueue() {
		let bag = [new TetriminoI(), new TetriminoJ(), new TetriminoL(), new TetriminoO(), new TetriminoS(), new TetriminoZ(), new TetriminoT()];
		for (let i = 0; i < 7; i++) {
			this.queue.push(bag.splice(Math.floor(this.random.random() * bag.length), 1)[0]);
		}
	}

	nextTetrimino(timestamp) {
		this.current = this.queue.shift();
		if (this.queue.length < 6) this.pushToQueue();
		this.holdSwitched = false;
		this.lastTimeMark = this.lastTetriminoTime = timestamp;
		this.checkGameOver();
	}

	checkGameOver() {
		if (this.current.checkCollision(this.board)) {
			this.gameOver();
			return;
		}
		if (this.current.canFall(this.board)) this.current.y++;
	}

	gameOver() {
		this.over = true;
	}

	getMinoColor(x, y) {
		let mino = this.board[x][y];
		return mino == undefined ? -1 : mino.textureY;
	}

	setPlacedRow(id, data) {
		while (this.lastPlacedBoardID < id) {
			this.placedBoard.push(null);
			this.lastPlacedBoardID++;
		}
		this.placedBoard[id] = data;
	}

	finalizeData() {
		for (let y = 39; y > -1; y--) {
			let row = [];
			let hasMinoes = false;
			for (let x = 0; x < 10; x++) {
				let color = this.getMinoColor(x, y);
				row.push(color);
				if (color != -1) hasMinoes = true;
			}
			if (hasMinoes) {
				this.setPlacedRow(this.rowIDs[y], row);
			}
		}
	}

	readStateData(state) {
		this.playTime = state.timestamp;
		for (let field of this.singleSaveableFields) if (state[field] !== undefined) this[field] = state[field];
		let minos = 0, x = 0, board = state.board, mino = 0;
		this.totalMinos = 0;
		for (let y = 0; y < 40; y++) {
			minos = 0;
			for (x = 0; x < 10; x++) {
				mino = board[x * 40 + y];
				if (mino == -1) {
					this.board[x][y] = undefined;
				} else {
					this.board[x][y] = new Mino(mino[0], mino[1], mino[2]);
					minos++;
					this.totalMinos++;
				}
			}
			this.minos[y] = minos;
		}
		if (state.current == null) this.current = null;
		else {
			this.current = new tetriminoTypeMapping[state.current.type]();
			this.current.x = state.current.x;
			this.current.y = state.current.y;
			this.current.state = state.current.state;
		}
		this.random.mt = [...state.randommt];
		this.random.mti = state.randommti;
		this.queue = [];
		for (let char of state.queue) this.queue.push(new tetriminoTypeMapping[char]());
		this.hold = state.hold == "" ? null : new tetriminoTypeMapping[state.hold]();
		for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) this.stats[i][j] = state.stats[i][j];
	}
}

class ReplayPlayfieldGuideline extends ReplayPlayfield {
	constructor() {
		super();
		this.rewardAmounts = [100, 300, 500, 800, 100, 200, 400, 400, 800, 1200, 1600];
		this.singleSaveableFields.push("lockScore", "lockScoreStartLine", "lockScoreEndLine", "lockScoreTime");
	}

	softDrop(timestamp) {
		let res = super.softDrop(timestamp);
		if (!res) {
			this.score++;
			this.dropScore++;
		}
		return res;
	}

	hardDrop(timestamp) {
		if (this.current == null) return;
		let res = super.hardDrop(timestamp);
		let lockScore = 2 * res;
		this.dropScore += lockScore;
		this.score += lockScore;
		return res;
	}
}

class ReplayPlayfieldGuideline40Line extends ReplayPlayfieldGuideline {
	constructor() {
		super();
		this.singleSaveableFields.push("actionTime");
		this.actionTime = 0;
	}

	processTimePassed(timePassed) {
		super.processTimePassed(timePassed);
		if (this.current != null) this.actionTime += timePassed;
	}

	clearLines(toClear) {
		if (toClear.length == 0) return;
		super.clearLines(toClear);
		if (this.lines > 39) super.gameOver();
	}
}