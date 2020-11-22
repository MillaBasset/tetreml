// This file implements the Shirase mode from Tetris: The grand master 3 – Terror instinct.

class GameScreenShirase extends GameScreenGuidelineBase {
	constructor(parent, showKeystrokes, doSaveReplay) {
		super(parent, showKeystrokes, doSaveReplay, true);
		
		this.shouldHintTetrimino = true;
		this.level = 0;
		// Speed to next level; Delay without clear; Delay with clear; Auto-repeat delay; Lock delay.
		this.timingSteps = [[100, 200, 233, 167, 300], [200, 200, 200, 133, 300], [300, 200, 167, 133, 283], [500, 100, 167, 133, 250], [600, 100, 133, 100, 200], [1100, 100, 133, 100, 167], [1200, 100, 133, 100, 133], [Infinity, 100, 200, 100, 250]];
		this.timingStepPointer = 0;
		this.timingStepNext = this.timingSteps[0][0];
		this.tetriminoDelay = this.timingSteps[0][1];
		this.clearDelay = this.timingSteps[0][2];
		this.autoRepeatDelay = this.timingSteps[0][3];
		this.autoRepeatPeriod = 17;
		this.lockDelay = this.timingSteps[0][4];
		this.shouldRingTheBell = false;

		this.levelsPerClear = [0, 1, 2, 4, 6];
		this.regretTime = 0;
		this.regrets = 0;
		this.lastRegretMarkTime = 0;
		this.gameOverFromTorikan = false;

		this.garbageSteps = [[600, 19], [700, 17], [800, 9], [900, 8], [1000, 7], [Infinity, Infinity]];
		this.garbageStepPointer = -1;
		this.garbageStepNext = 500;
		this.garbageThreshold = Infinity;
		this.garbageCharge = 0;

		let level500 = new Music("shirase_level500Opening", new Music("shirase_level500Loop"));
		let level700 = new Music("shirase_level700Opening", new Music("shirase_level700Loop"));
		let level1000 = new Music("shirase_level1000Opening", new Music("shirase_level1000Loop"));
		let noMusic = new Music(0, undefined, false);
		this.musicSegments = [
			[485, null, new Music("shirase_level0Opening", new Music("shirase_level0Loop"))],
			[500, noMusic, noMusic],
			[685, new Music("shirase_level500Trigger", level500), level500],
			[700, noMusic, noMusic],
			[985, new Music("shirase_level700Trigger", level700), level700],
			[1000, noMusic, noMusic],
			[Infinity, new Music("shirase_level1000Trigger", level1000), level1000]
		];
		this.musicLevel1300 = new Audio("Music/Level 999.mp3?state=original");
		this.musicLevel1300.preload = "auto";
		this.musicLevel1300.load();
		audioContext.createMediaElementSource(this.musicLevel1300).connect(gainNode);

		// -2: Not level 1300; -1: Going to be level 1300; >-1: Time left for level 1300.
		this.level1300Time = -2;

		this.singleSaveableFields.push("level", "timingStepPointer", "timingStepNext", "tetriminoDelay", "clearDelay", "autoRepeatDelay", "lockDelay", "shouldRingTheBell", "regrets", "lastRegretMarkTime", "garbageStepPointer", "garbageStepNext", "garbageThreshold", "garbageCharge", "level1300Time");

		this.tetriminoTypeMapping = {
			O: TetriminoO,
			I: TetriminoI,
			T: TetriminoT,
			J: TetriminoJ,
			L: TetriminoL,
			S: TetriminoS,
			Z: TetriminoZ,
			o: TetriminoOElectronika,
			i: TetriminoIElectronika,
			t: TetriminoTElectronika,
			j: TetriminoJElectronika,
			l: TetriminoLElectronika,
			s: TetriminoSElectronika,
			z: TetriminoZElectronika
		};

		this.bigTetriminoMapping = {
			O: TetriminoOBig,
			I: TetriminoIBig,
			T: TetriminoTBig,
			J: TetriminoJBig,
			L: TetriminoLBig,
			S: TetriminoSBig,
			Z: TetriminoZBig
		}
	}

	init() {
		super.init();
	}

	start() {
		super.start();
		this.musicPointer = 0;
		this.musicNext = this.musicSegments[0][0];
		currentSong = this.musicSegments[0][2];
		if (!this.isReplay) currentSong.play();
	}

	getMusicIndex() {
		let res = 0;
		while (this.level >= this.musicSegments[res][0]) res++;
		return res;
	}

	processGameLogic(timePassed) {
		if (this.state == GameState.playing) {
			let endTime = this.playTime + this.level1300Time;
			if (this.level1300Time > -1 && (this.level1300Time -= timePassed) < 1) {
				this.latestTime = endTime;
				this.level1300Time = 0;
				this.gameOver(true);
			}
		}
		super.processGameLogic(timePassed);
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Time", 485, 30);
		ctx.fillText("Level " + this.level, 485, 72);
		ctx.fillText("Score", 485, 114);
		ctx.fillText("Lines", 485, 134);
		
		ctx.textAlign = "right";
		ctx.fillText(this.gameOverFromTorikan ? Math.floor(this.level / 100) * 100 : this.level > 1299 ? 1300 : (Math.floor(this.level / 100) + 1) * 100, 632, 72);
		ctx.fillText(this.score, 632, 114);
		ctx.fillText(this.lines, 632, 134);

		ctx.fillRect(485, 76, this.gameOverFromTorikan || this.level > 1299 ? 147 : 147 * (this.level % 100) / 100, 10);

		ctx.font = "20px Tetreml";
		let time = this.level > 1299 ? this.lastRegretMarkTime : this.playTime;
		ctx.fillText(this.state == GameState.over || this.level == 1300 ? formatDurationWithMilliseconds(time / 1000) : formatDuration(Math.floor(time / 1000)), 632, 30);

		if (this.regretTime != 0) {
			ctx.fillStyle = "#FFB2B2";
			if (this.isReplay || this.showKeystrokes) {
				ctx.font = "12px Tetreml";
				ctx.textAlign = "left";
				ctx.fillText("REGRET!", 485, 159);
			} else {
				ctx.textAlign = "center";
				ctx.fillText("REGRET!", 521, 230);
			}
			this.regretTime = Math.max(0, this.regretTime -= timePassed);
		}
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);
		if (this.state == GameState.over) {
			ctx.font = "350 20px Tetreml";
			ctx.fillStyle = "#FFF";
			ctx.textAlign = "center";
			ctx.fillText("Grade", 320, 105, 160);
			ctx.font = "300 50px Tetreml";
			ctx.fillStyle = "#FF0";
			ctx.fillText(this.gradeText, 320, 160, 150);
		}
	}

	getNextSpawn() {
		if (this.level == 1300) {
			return new (this.bigTetriminoMapping[this.queue[0].code.toUpperCase()])();
		} else return super.getNextSpawn();
	}

	afterClear(time) {
		super.afterClear(time);
		if (this.level % 100 != 99 && this.level < 1300) {
			let oldLevel = this.level;
			this.level++;
			this.speedLevel++;
			if (this.level % 100 == 99) this.shouldRingTheBell = true;
			this.processLeveling(oldLevel);
		}
		if (this.shouldRingTheBell) {
			if (!this.isSeeking) sfx.bell.play();
			this.shouldRingTheBell = false;
		}
		if (this.level1300Time == -1) {
			this.totalMinos = 0;
			if (!this.isSeeking) {
				this.musicLevel1300.currentTime = 0;
				this.musicLevel1300.play();
			}
			this.level1300Time = 54417 + time - this.latestTime;
		}
	}

	processLeveling(oldLevel) {
		oldLevel %= 100;
		let newLevel = this.level % 100;
		if (oldLevel > newLevel) {
			if (this.playTime - this.lastRegretMarkTime > 60000) {
				this.regrets++;
				if (!this.isSeeking) {
					this.coolRegretTime = 5000;
				}
			}
			this.lastRegretMarkTime = this.playTime;
			if (!this.isSeeking && this.state != GameState.over && this.level < 1300) sfx.grandMasterLevelUp.play();
		}

		while (this.level >= this.timingStepNext) {
			this.timingStepPointer++;
			this.timingStepNext = this.timingSteps[this.timingStepPointer][0];
			this.tetriminoDelay = this.timingSteps[this.timingStepPointer][1];
			this.clearDelay = this.timingSteps[this.timingStepPointer][2];
			this.autoRepeatDelay = this.timingSteps[this.timingStepPointer][3];
			this.lockDelay = this.timingSteps[this.timingStepPointer][4];
		}
		while (this.level >= this.garbageStepNext) {
			this.garbageStepPointer++;
			this.garbageStepNext = this.garbageSteps[this.garbageStepPointer][0];
			this.garbageThreshold = this.garbageSteps[this.garbageStepPointer][1];
		}
		if (!this.isSeeking && this.state != GameState.over) {
			let musicChanged = false;
			while (this.level >= this.musicNext) {
				this.musicNext = this.musicSegments[++this.musicPointer][0];
				musicChanged = true;
			}
			if (musicChanged) {
				let music = this.musicSegments[this.musicPointer][1];
				music.play(music.id == 0);
			}
		}
	}

	move(offset, isInitialPress, timestamp) {
		return super.move(this.level == 1300 ? offset * 2 : offset, isInitialPress, timestamp);
	}

	nextTetrimino() {
		if (this.level == 1300) {
			if (this.clearTime > 0) {
				this.current = null;
				return;
			}
			let tetrimino = this.queue.shift();
			this.current = new (this.bigTetriminoMapping[tetrimino.code.toUpperCase()])();
			this.current.textureY = tetrimino.textureY;
			if (this.queue.length < 6) this.pushToQueue();
			this.fallTime = 0;
			this.lockTime = 0;
			this.moveCounter = 0;
			this.holdSwitched = false;
			this.checkGameOver();
		} else super.nextTetrimino();
	}

	doHold(timestamp) {
		if (this.level == 1300) {
			if (this.current != null && !this.holdSwitched) {
				this.oldHold = this.hold;
				this.hold = new (this.tetriminoTypeMapping[this.current.textureY == -1 ? this.current.code.toLowerCase() : this.current.code])();
				if (this.oldHold == null) this.nextTetrimino(); else {
					let tetrimino = this.oldHold;
					this.current = new (this.bigTetriminoMapping[tetrimino.code.toUpperCase()])();
					this.current.textureY = tetrimino.textureY;
					this.current.reset();
					this.fallTime = 0;
					this.lockTime = 0;
					this.moveCounter = 0;
					this.checkGameOver();
				}
				this.holds++;
				if (!this.isSeeking) sfx.hold.play();
				if (this.moveLock) this.wasNull = true;
				this.holdSwitched = true;
				this.recordAction("hold", timestamp);
				this.processInstaFall(timestamp);
			}
		} else super.doHold(timestamp);
	}

	customLock(isDrop) {
		if (this.current == null) return;
		let toClear = [];
		this.tetriminoes++;
		let tSpinType = this.current.getTSpinType(this.board);
		for (let mino of this.current.getLockPositions()) {
			this.board[mino[0]][mino[1]] = new Mino(mino[2], this.current.textureY, this.getMinoDisappearanceTime());
			if (++this.minos[mino[1]] == 10) toClear.push(mino[1]);
		}
		let lines = toClear.length >> 1;
		this.totalMinos += 16;
		let baseline = this.getBaseline();
		if (baseline < 20) {
			this.gameOver();
			return -1;
		}
		this.stackMinY = Math.min(this.current.y + this.current.topY[this.current.state], this.stackMinY);
		if (!this.isSeeking && tSpinType) (lines == 0 ? sfx.tSpinZero : sfx.tSpin).play();
		this.addReward(rewardIndexMapping[tSpinType] + lines);
		this.clearLines(toClear);
		if (lines != 0) {
			this.stats[lines][tSpinType ? 1 : 0]++;
			if (this.stats[lines][2] != null) this.stats[lines][2]++;
		} else {
			if (tSpinType) this.stats[0][1]++;
			this.combo = -1;
			this.nextTetrimino();
		}

		this.buttonRotateClockwise = this.buttonRotateCounterClockwise = this.buttonHold = false;
		
		return baseline;
	}

	lock(isDrop) {
		let baseline;
		if (this.level == 1300)
			baseline = this.customLock(isDrop);
		else
			baseline = super.lock(isDrop);
		let lines = this.clearedLines.length;
		if (this.level > 499) {
			this.garbageCharge = Math.max(0, this.garbageCharge + 1 - lines);
			if (this.garbageCharge > this.garbageThreshold) {
				let y = 39;
				while (this.minos[y] > 9) y--;
				y--;
				for (let x = 0; x < 10; x++) {
					let col = this.board[x];
					col.shift();
					col.push(col[y] == undefined ? undefined : new Mino(0, 0));
				}
				this.minos.shift();
				this.minos.push(this.minos[y]);
				this.totalMinos += this.minos[y];
				this.clearedLines = this.clearedLines.map(l => l - 1);
				this.stackMinY--;
				this.garbageCharge = 0;
				if (!this.isSeeking) sfx.garbageRise.play();
			}
		}
		return baseline;
	}

	customClearLines(toClear) {
		if (toClear.length == 0) return;
		let lines = toClear.length >> 1;
		this.clearedLines = toClear.sort((a, b) => a - b);
		this.stackMinY += this.clearedLines.length;
		this.clearEffectTime = 0;
		for (let line of this.clearedLines) {
			for (let i = 0; i < 10; i++) {
				if (line != 0 && this.board[i][line - 1] != undefined) this.board[i][line - 1].directions &= 0b1110;
				if (line != 39 && this.board[i][line + 1] != undefined) this.board[i][line + 1].directions &= 0b1011;
				this.board[i][line] = undefined;
			}
		}
		this.lines += lines;
		this.clearTime = 500;
		if (!this.isSeeking) switch (lines) {
			case 1: sfx.single.play(); break;
			case 2: sfx.double.play(); break;
			case 3: sfx.triple.play(); break;
			case 4: sfx.tetris.play(); break;
		}
		if ((this.totalMinos -= toClear.length * 10) == 0) {
			this.score += 1000;
			this.clearTime = 1000;
			if (!this.isSeeking) sfx.allClear.play();
		}
		this.current = null;
		this.isClearing = true;
	}

	clearLines(toClear) {
		let baseline;
		if (this.level == 1300)
			baseline = this.customClearLines(toClear);
		else
			baseline = super.clearLines(toClear);
		let lines = toClear.length;
		this.clearTime = lines == 0 ? this.tetriminoDelay : this.clearDelay;
		if (lines != 0 && this.level < 1300) {
			let oldLevel = this.level;
			this.level = Math.min(1300, this.level + this.levelsPerClear[lines]);
			this.speedLevel += this.levelsPerClear[lines];
			if (this.level == 1300) {
				this.level1300Time = -1;
				this.clearTime = 3000;
				this.board = [];
				let col = [];
				this.minos = [];
				this.totalMinos = 1;
				for (let i = 0; i < 40; i++) {
					col.push(undefined);
					this.minos.push(0);
				}
				for (let i = 0; i < 10; i++) this.board.push([...col]);
				this.stackMinY = 40;
				this.clearedLines = [];
				currentSong.pause();
				if (!this.isSeeking) sfx.level999Trigger.play();
			} else if (this.level % 100 == 99) this.shouldRingTheBell = true;
			if (oldLevel < 1000 && this.level > 999) {
				for (let i = 3; i < this.queue.length; i++) {
					this.queue[i] = new (this.tetriminoTypeMapping[this.queue[i].code.toLowerCase()])();
				}
			}
			if ((oldLevel < 500 && this.level > 499 && this.playTime > 183000) || (oldLevel < 1000 && this.level > 999 && this.playTime > 366000)) {
				this.gameOverFromTorikan = true;
				this.gameOver(true);
			}
			this.processLeveling(oldLevel);
		}
	}

	pushToQueue() {
		if (this.level < 1000) super.pushToQueue();
		else {
			let bag = [new TetriminoIElectronika(), new TetriminoJElectronika(), new TetriminoLElectronika(), new TetriminoOElectronika(), new TetriminoSElectronika(), new TetriminoZElectronika(), new TetriminoTElectronika()];
			for (let i = 0; i < 7; i++) {
				this.queue.push(bag.splice(Math.floor(this.random.random() * bag.length), 1)[0]);
			}
		}
	}

	pause(playSound = true) {
		super.pause(playSound);
		if (this.level1300Time > -1) this.musicLevel1300.pause(); else currentSong.pause();
	}

	quit() {
		if (this.level1300Time > -1) this.musicLevel1300.pause(); else currentSong.pause();
		super.quit();
	}

	resume() {
		super.resume();
		if (this.level1300Time > -1) {
			this.musicLevel1300.currentTime = (55000 - this.level1300Time) / 1000;
			this.musicLevel1300.play();
		} else if (this.level != 1300) currentSong.resume();
	}

	gameOver(victory = false) {
		super.gameOver();
		if (this.level1300Time > -1) {
			this.musicLevel1300.pause();
		} else currentSong.pause();
		if (!this.isSeeking) (victory ? sfx.complete : sfx.gameOver).play();
		this.gradeText = "S" + Math.max(1, Math.floor(this.level / 100) - this.regrets);
	}

	getFallInterval() {
		return 0;
	}

	getLockDelay() {
		return this.lockDelay;
	}

	shouldDrawGhostTetrimino() {
		return false;
	}

	readStateData(state) {
		if (this.level1300Time > -1) this.musicLevel1300.pause(); else stopCurrentMusic();
		this.playTime = state.timestamp;
		for (let field of this.singleSaveableFields) if (state[field] !== undefined) this[field] = state[field];
		let minos = 0, x = 0, board = state.board, mino = 0;
		this.totalMinos = 0;
		this.stackMinY = 40;
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
					this.stackMinY = y;
				}
			}
			this.minos[y] = minos;
		}
		if (state.current == null) this.current = null;
		else {
			this.current = new (this.tetriminoTypeMapping[state.current.type])();
			this.current.x = state.current.x;
			this.current.y = state.current.y;
			this.current.state = state.current.state;
		}
		this.random.mt = [...state.randommt];
		this.random.mti = state.randommti;
		this.queue = [];
		for (let char of state.queue) this.queue.push(new (this.tetriminoTypeMapping[char])());
		this.hold = state.hold == "" ? null : new (this.tetriminoTypeMapping[state.hold])();
		for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) this.stats[i][j] = state.stats[i][j];
		if (this.timingStepNext == null) this.timingStepNext = Infinity;
		if (this.garbageStepNext == null) this.garbageStepNext = Infinity;
		if (this.garbageThreshold == null) this.garbageThreshold = Infinity;
	}

	finalizeSeek() {
		super.finalizeSeek();
		let musicIndex = this.getMusicIndex();
		if (this.level != 1300 && musicIndex != this.musicPointer) {
			this.musicPointer = musicIndex;
			this.musicNext = this.musicSegments[musicIndex][0];
			this.musicSegments[musicIndex][2].setCurrent();
		}
	}

	getModeName() {
		return "Shirase";
	}

	getModeNameForDisplay() {
		return "Shirase";
	}
}

// -----------------------------

const kickJSLTZBig = {
	0: {
		1: [[0, 0], [-2, 0], [-2, -2], [0, 4], [-2, 4]],
		3: [[0, 0], [2, 0], [2, -2], [0, 4], [2, 4]]
	},
	1: {
		2: [[0, 0], [2, 0], [2, 2], [0, -4], [2, -4]],
		0: [[0, 0], [2, 0], [2, 2], [0, -4], [2, -4]]
	},
	2: {
		3: [[0, 0], [2, 0], [2, -2], [0, 4], [2, 4]],
		1: [[0, 0], [-2, 0], [-2, -2], [0, 4], [-2, 4]]
	},
	3: {
		0: [[0, 0], [-2, 0], [-2, 2], [0, -4], [-2, -4]],
		2: [[0, 0], [-2, 0], [-2, 2], [0, -4], [-2, -4]]
	}
};

class TetriminoIElectronika extends TetriminoI {
	constructor() {
		super();
		this.textureY = -1;
		this.code = "i";
	}
}

class TetriminoJElectronika extends TetriminoJ {
	constructor() {
		super();
		this.textureY = -1;
		this.code = "j";
	}
}

class TetriminoLElectronika extends TetriminoL {
	constructor() {
		super();
		this.textureY = -1;
		this.code = "l";
	}
}

class TetriminoOElectronika extends TetriminoO {
	constructor() {
		super();
		this.textureY = -1;
		this.code = "o";
	}
}

class TetriminoSElectronika extends TetriminoS {
	constructor() {
		super();
		this.textureY = -1;
		this.code = "s";
	}
}

class TetriminoTElectronika extends TetriminoT {
	constructor() {
		super();
		this.textureY = -1;
		this.code = "t";
	}
}

class TetriminoZElectronika extends TetriminoZ {
	constructor() {
		super();
		this.textureY = -1;
		this.code = "z";
	}
}

class TetriminoBig extends Tetrimino {
	constructor() {
		super();
		this.textureY = -1;
		this.y = 18;
	}

	reset() {
		this.x = 4;
		this.y = 18;
		this.state = 0;
	}
}

class TetriminoIBig extends TetriminoBig {
	constructor() {
		super();
		this.states = [
			[[-2, 0, 9], [-1, 0, 10], [-2, 1, 12], [-1, 1, 10], [0, 0, 10], [1, 0, 10], [0, 1, 10], [1, 1, 10], [2, 0, 10], [3, 0, 10], [2, 1, 10], [3, 1, 10], [4, 0, 10], [5, 0, 3], [4, 1, 10], [5, 1, 6]],
			[[2, -2, 9], [3, -2, 3], [2, -1, 5], [3, -1, 5], [2, 0, 5], [3, 0, 5], [2, 1, 5], [3, 1, 5], [2, 2, 5], [3, 2, 5], [2, 3, 5], [3, 3, 5], [2, 4, 5], [3, 4, 5], [2, 5, 12], [3, 5, 6]],
			[[-2, 2, 9], [-1, 2, 10], [-2, 3, 12], [-1, 3, 10], [0, 2, 10], [1, 2, 10], [0, 3, 10], [1, 3, 10], [2, 2, 10], [3, 2, 10], [2, 3, 10], [3, 3, 10], [4, 2, 10], [5, 2, 3], [4, 3, 10], [5, 3, 6]],
			[[0, -2, 9], [1, -2, 3], [0, -1, 5], [1, -1, 5], [0, 0, 5], [1, 0, 5], [0, 1, 5], [1, 1, 5], [0, 2, 5], [1, 2, 5], [0, 3, 5], [1, 3, 5], [0, 4, 5], [1, 4, 5], [0, 5, 12], [1, 5, 6]]
		];
		this.baseY = [1, 5, 3, 5];
		this.topY = [0, -2, 2, -2];
		this.leftX = [-2, 2, -2, 0];
		this.width = [8, 2, 8, 2];
		this.kickData = {
			0: {
				1: [[0, 0], [-4, 0], [2, 0], [-4, 2], [2, -4]],
				3: [[0, 0], [-2, 0], [4, 0], [-2, -4], [4, 2]]
			},
			1: {
				2: [[0, 0], [-2, 0], [4, 0], [-2, -4], [4, 2]],
				0: [[0, 0], [4, 0], [-2, 0], [4, -2], [-2, 4]]
			},
			2: {
				3: [[0, 0], [4, 0], [-2, 0], [4, -2], [-2, 4]],
				1: [[0, 0], [2, 0], [-4, 0], [2, 4], [-4, -2]]
			},
			3: {
				0: [[0, 0], [2, 0], [-4, 0], [2, 4], [-4, -2]],
				2: [[0, 0], [4, 0], [2, 0], [-4, -2], [2, -4]]
			}
		};
		this.code = "I";
	}
}

class TetriminoJBig extends TetriminoBig {
	constructor() {
		super();
		this.states = [
			[[-2, -2, 9], [-1, -2, 3], [-2, -1, 5], [-1, -1, 5], [-2, 0, 5], [-1, 0, 12], [-2, 1, 12], [-1, 1, 10], [0, 0, 10], [1, 0, 10], [0, 1, 10], [1, 1, 10], [2, 0, 10], [3, 0, 3], [2, 1, 10], [3, 1, 6]],
			[[2, -2, 10], [3, -2, 3], [2, -1, 10], [3, -1, 6], [0, -2, 9], [1, -2, 10], [0, -1, 5], [1, -1, 9], [0, 0, 5], [1, 0, 5], [0, 1, 5], [1, 1, 5], [0, 2, 5], [1, 2, 5], [0, 3, 12], [1, 3, 6]],
			[[-2, 0, 9], [-1, 0, 10], [-2, 1, 12], [-1, 1, 10], [0, 0, 10], [1, 0, 10], [0, 1, 10], [1, 1, 10], [2, 0, 10], [3, 0, 3], [2, 1, 3], [3, 1, 5], [2, 2, 5], [3, 2, 5], [2, 3, 12], [3, 3, 6]],
			[[0, -2, 9], [1, -2, 3], [0, -1, 5], [1, -1, 5], [0, 0, 5], [1, 0, 5], [0, 1, 5], [1, 1, 5], [0, 2, 6], [1, 2, 5], [0, 3, 10], [1, 3, 6], [-2, 2, 9], [-1, 2, 10], [-2, 3, 12], [-1, 3, 10]]
		];
		this.baseY = [1, 3, 3, 3];
		this.topY = [-2, -2, 0, -2];
		this.leftX = [-2, 0, -2, -2];
		this.width = [6, 4, 6, 4];
		this.kickData = kickJSLTZBig;
		this.code = "J";
	}
}

class TetriminoLBig extends TetriminoBig {
	constructor() {
		super();
		this.states = [
			[[-2, 0, 9], [-1, 0, 10], [-2, 1, 12], [-1, 1, 10], [0, 0, 10], [1, 0, 10], [0, 1, 10], [1, 1, 10], [2, 0, 6], [3, 0, 5], [2, 1, 10], [3, 1, 6], [2, -2, 9], [3, -2, 3], [2, -1, 5], [3, -1, 5]],
			[[0, -2, 9], [1, -2, 3], [0, -1, 5], [1, -1, 5], [0, 0, 5], [1, 0, 5], [0, 1, 5], [1, 1, 5], [0, 2, 5], [1, 2, 12], [0, 3, 12], [1, 3, 10], [2, 2, 10], [3, 2, 3], [2, 3, 10], [3, 3, 6]],
			[[-2, 2, 5], [-1, 2, 5], [-2, 3, 12], [-1, 3, 6], [-2, 0, 9], [-1, 0, 10], [-2, 1, 5], [-1, 1, 9], [0, 0, 10], [1, 0, 10], [0, 1, 10], [1, 1, 10], [2, 0, 10], [3, 0, 3], [2, 1, 10], [3, 1, 6]],
			[[-2, -2, 9], [-1, -2, 10], [-2, -1, 12], [-1, -1, 10], [0, -2, 10], [1, -2, 3], [0, -1, 3], [1, -1, 5], [0, 0, 5], [1, 0, 5], [0, 1, 5], [1, 1, 5], [0, 2, 5], [1, 2, 5], [0, 3, 12], [1, 3, 6]]
		];
		this.baseY = [1, 3, 3, 3];
		this.topY = [-2, -2, 0, -2];
		this.leftX = [-2, 0, -2, -2];
		this.width = [6, 4, 6, 4];
		this.kickData = kickJSLTZBig;
		this.code = "L";
	}
}

class TetriminoOBig extends TetriminoBig {
	constructor() {
		super();
		this.states = [
			[[0, -2, 9], [1, -2, 10], [0, -1, 5], [1, -1, 9], [2, -2, 10], [3, -2, 3], [2, -1, 3], [3, -1, 5], [2, 0, 6], [3, 0, 5], [2, 1, 10], [3, 1, 6], [0, 0, 5], [1, 0, 12], [0, 1, 12], [1, 1, 10]]
		];
		this.baseY = [1];
		this.topY = [-2];
		this.leftX = [0];
		this.width = [4];
		this.code = "O";
	}

	tryChangeState(board, newState) {}
}

class TetriminoSBig extends TetriminoBig {
	constructor() {
		super();
		this.states = [
			[[-2, 0, 9], [-1, 0, 10], [-2, 1, 12], [-1, 1, 10], [0, 0, 6], [1, 0, 5], [0, 1, 10], [1, 1, 6], [0, -2, 9], [1, -2, 10], [0, -1, 5], [1, -1, 9], [2, -2, 10], [3, -2, 3], [2, -1, 10], [3, -1, 6]],
			[[0, -2, 9], [1, -2, 3], [0, -1, 5], [1, -1, 5], [0, 0, 5], [1, 0, 12], [0, 1, 12], [1, 1, 10], [2, 0, 10], [3, 0, 3], [2, 1, 3], [3, 1, 5], [2, 2, 5], [3, 2, 5], [2, 3, 12], [3, 3, 6]],
			[[-2, 2, 9], [-1, 2, 10], [-2, 3, 12], [-1, 3, 10], [0, 2, 6], [1, 2, 5], [0, 3, 10], [1, 3, 6], [0, 0, 9], [1, 0, 10], [0, 1, 5], [1, 1, 9], [2, 0, 10], [3, 0, 3], [2, 1, 10], [3, 1, 6]],
			[[-2, -2, 9], [-1, -2, 3], [-2, -1, 5], [-1, -1, 5], [-2, 0, 5], [-1, 0, 12], [-2, 1, 12], [-1, 1, 10], [0, 0, 10], [1, 0, 3], [0, 1, 3], [1, 1, 5], [0, 2, 5], [1, 2, 5], [0, 3, 12], [1, 3, 6]]
		];
		this.baseY = [1, 3, 3, 3];
		this.topY = [-2, -2, 0, -2];
		this.leftX = [-2, 0, -2, -2];
		this.width = [6, 4, 6, 4];
		this.kickData = kickJSLTZBig;
		this.code = "S";
	}
}

class TetriminoTBig extends TetriminoBig {
	constructor() {
		super();
		this.states = [
			[[-2, 0, 9], [-1, 0, 10], [-2, 1, 12], [-1, 1, 10], [0, 0, 6], [1, 0, 12], [0, 1, 10], [1, 1, 10], [2, 0, 10], [3, 0, 3], [2, 1, 10], [3, 1, 6], [0, -2, 9], [1, -2, 3], [0, -1, 5], [1, -1, 5]],
			[[0, -2, 9], [1, -2, 3], [0, -1, 5], [1, -1, 5], [0, 0, 5], [1, 0, 12], [0, 1, 5], [1, 1, 9], [0, 2, 5], [1, 2, 5], [0, 3, 12], [1, 3, 6], [2, 0, 10], [3, 0, 3], [2, 1, 10], [3, 1, 6]],
			[[-2, 0, 9], [-1, 0, 10], [-2, 1, 12], [-1, 1, 10], [0, 0, 10], [1, 0, 10], [0, 1, 3], [1, 1, 9], [2, 0, 10], [3, 0, 3], [2, 1, 10], [3, 1, 6], [0, 2, 5], [1, 2, 5], [0, 3, 12], [1, 3, 6]],
			[[0, -2, 9], [1, -2, 3], [0, -1, 5], [1, -1, 5], [0, 0, 6], [1, 0, 5], [0, 1, 3], [1, 1, 5], [0, 2, 5], [1, 2, 5], [0, 3, 12], [1, 3, 6], [-2, 0, 9], [-1, 0, 10], [-2, 1, 12], [-1, 1, 10]]
		];
		this.baseY = [1, 3, 3, 3];
		this.topY = [-2, -2, 0, -2];
		this.leftX = [-2, 0, -2, -2];
		this.width = [6, 4, 6, 4];
		this.kickData = kickJSLTZBig;
		this.code = "T";

		// For detecting T-spins.
		this.corners = [[-2, -2], [2, -2], [2, 2], [-2, 2], [-2, -2], [2, -2], [2, 2]];
		this.back = [[0, 2], [-2, 0], [0, -2], [2, 0]];
		this.alreadyTSpin = false;
		this.lastWasRotation = false;
	}

	// The methods below are for detecting T-spins.

	tryChangeState(board, newState) {
		let point = super.tryChangeState(board, newState);
		if (point == 5) this.alreadyTSpin = true;
		else if (point) this.alreadyTSpin = false;
		this.lastWasRotation = true;
		return point;
	}

	getCorners(board) {
		let res = [];
		for (let i = 0; i < 4; i++) {
			let corner = this.corners[this.state + i];
			res.push(this.isCellFilled(board, this.x + corner[0], this.y + corner[1]));
		}
		return res;
	}

	/* 0: No T-spin.
	   1: T-spin mini.
	   2: T-spin.
	*/
	getTSpinType(board) {
		if (!this.lastWasRotation) return 0;
		let corners = this.getCorners(board);
		if (corners[0] && corners[1] && (corners[2] || corners[3])) return 2;
		if (corners[2] && corners[3] && (corners[0] || corners[1])) return this.alreadyTSpin ? 2 : 1;
		return 0;
	}

	reset() {
		super.reset();
		this.alreadyTSpin = false;
		this.lastWasRotation = false;
	}

	onMove() {
		this.lastWasRotation = false;
		this.alreadyTSpin = false;
	}
}

class TetriminoZBig extends TetriminoBig {
	constructor() {
		super();
		this.states = [
			[[-2, -2, 9], [-1, -2, 10], [-2, -1, 12], [-1, -1, 10], [0, -2, 10], [1, -2, 3], [0, -1, 3], [1, -1, 5], [0, 0, 5], [1, 0, 12], [0, 1, 12], [1, 1, 10], [2, 0, 10], [3, 0, 3], [2, 1, 10], [3, 1, 6]],
			[[2, -2, 9], [3, -2, 3], [2, -1, 5], [3, -1, 5], [2, 0, 6], [3, 0, 5], [2, 1, 10], [3, 1, 6], [0, 0, 9], [1, 0, 10], [0, 1, 5], [1, 1, 9], [0, 2, 5], [1, 2, 5], [0, 3, 12], [1, 3, 6]],
			[[-2, 0, 9], [-1, 0, 10], [-2, 1, 12], [-1, 1, 10], [0, 0, 10], [1, 0, 3], [0, 1, 3], [1, 1, 5], [0, 2, 5], [1, 2, 12], [0, 3, 12], [1, 3, 10], [2, 2, 10], [3, 2, 3], [2, 3, 10], [3, 3, 6]],
			[[0, -2, 9], [1, -2, 3], [0, -1, 5], [1, -1, 5], [0, 0, 6], [1, 0, 5], [0, 1, 10], [1, 1, 6], [-2, 0, 9], [-1, 0, 10], [-2, 1, 5], [-1, 1, 9], [-2, 2, 5], [-1, 2, 5], [-2, 3, 12], [-1, 3, 6]]
		];
		this.baseY = [1, 3, 3, 3];
		this.topY = [-2, -2, 0, -2];
		this.leftX = [-2, 0, -2, -2];
		this.width = [6, 4, 6, 4];
		this.kickData = kickJSLTZBig;
		this.code = "Z";
	}
}