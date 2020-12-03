const buttonList = ["left", "right", "softDrop", "hardDrop", "rotateCounterClockwise", "rotateClockwise"];
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

class PlayScreenBase {
	constructor(parent, gridX, gridY, nextX, nextY, holdX, holdY, minoSize, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		this.parent = parent;
		this.gridX = gridX;
		this.gridY = gridY;
		this.nextX = nextX;
		this.nextY = nextY;
		this.holdX = holdX;
		this.holdY = holdY;
		this.minoSize = minoSize;
		this.random = new MersenneTwister();
		this.board = [];
		let col = [];
		this.minos = [];
		this.totalMinos = 0;
		for (let i = 0; i < 40; i++) {
			col.push(undefined);
			this.minos.push(0);
		}
		for (let i = 0; i < 10; i++) this.board.push([...col]);
		this.score = 0;
		this.lines = 0;
		this.current = null;
		this.queue = [];
		this.hold = null;
		this.combo = -1;
		this.backToBack = false;
		this.moveCounter = 0;
		this.softDropCounter = -1;
		this.softDropLock = false;
		this.buttonMoveLeft = false;
		this.moveLeftCounter = -1;
		this.oldMoveLeftCounter = -1;
		this.buttonMoveRight = false;
		this.moveRightCounter = -1;
		this.oldMoveRightCounter = -1;
		this.autoRepeatDelay = 150;
		this.autoRepeatPeriod = 40;
		this.softDropPeriod = 25;
		this.shouldHintTetrimino = false;
		this.fallTime = 0;
		this.lockTime = 0;
		this.maxY = 0;
		this.clearTime = 0;
		this.oldTime = null;
		this.state = GameState.warmup;
		this.buttonHardDrop = false;
		this.buttonRotateClockwise = false;
		this.buttonRotateCounterClockwise = false;
		this.buttonHold = false;
		this.buttonEsc = false;
		this.buttonVolumeUp = false;
		this.buttonVolumeDown = false;
		this.volumeDisplayTime = 0;
		this.rewardName = "";
		this.rewardAmount = 0;
		this.rewardTime = 0;
		this.allClearTime = 0;
		this.holdSwitched = false;
		this.playTime = 0;
		this.stats = [[null, 0, null], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, null, null]]; // First level: number of lines cleared; Second level: normal, by T-spin, total.
		this.rewardAmounts = [100, 400, 900, 2500, 25, 50, 75, 50, 150, 600, 1250];
		this.clearedLines = [];
		this.clearEffectTime = 1000;
		this.tetriminoes = 0;
		this.warmupLeft = 5;
		this.warmupSecond = 0;
		this.showKeystrokes = showKeystrokes;
		this.stackMinY = 40;
		this.particles = [];
		this.holds = 0;
		this.keypresses = 0;
		this.wasNull = true;
		this.moveLock = 0; // 0: None; 1: Left; 2: Right.
		this.moveDisabledLeft = this.moveDisabledRight = false;
		this.lineClearDelayEnabled = lineClearDelayEnabled;
		if (this.doSaveReplay = doSaveReplay) this.replay = {
			states: [],
			actions: [],
			mode: this.getModeName(),
			modeParameters: {},
			lineClearDelayEnabled: this.lineClearDelayEnabled
		};
		this.singleSaveableFields = ["score", "lines", "combo", "backToBack", "holdSwitched", "clearTime", "clearedLines", "tetriminoes", "holds", "keypressed", "wasNull", "moveLock", "isClearing"];
		this.isReplay = false;
		this.isClearing = false;
		this.isSeeking = false;
		this.replaySpeed = 1;
		this.actionQueue = [];
		this.actionMapping = [
			(timestamp) => { this.fall(timestamp) },
			(timestamp) => { this.lockDown(timestamp); },
			(timestamp) => { this.softDrop(timestamp); },
			(timestamp) => { this.hardDrop(timestamp); },
			(timestamp) => { this.rotateClockwise(timestamp); },
			(timestamp) => { this.rotateCounterClockwise(timestamp); },
			(timestamp) => { this.doHold(timestamp); },
			(timestamp) => { if (!this.moveDisabledLeft) this.move(-1, false, timestamp); },
			(timestamp) => { if (!this.moveDisabledLeft) this.move(-1, true, timestamp); },
			(timestamp) => { if (!this.moveDisabledRight) this.move(1, false, timestamp); },
			(timestamp) => { if (!this.moveDisabledRight) this.move(1, true, timestamp); }
		];
		this.actionCompareFunc = (a, b) => {
			if (a[2] - b[2]) return a[2] - b[2];
			else return a[0] - b[0];
		};
	}

	init() {
		if (!this.isReplay) {
			this.pushToQueue();
			sfx.ready.play();
		}
	}

	start() {
		this.state = GameState.playing;
		if (!this.isReplay)	this.nextTetrimino();
		if (this.doSaveReplay) this.saveState();
		this.processInstaFall(0);
	}

	processGameLogic(timePassed) {
		let latestTime = this.latestTime = this.playTime + timePassed;
		if (this.state == GameState.playing) {
			this.clearTime -= timePassed;
			let afterClearTime = this.playTime;
			let fallInterval = this.getFallInterval();
			let iStart = fallInterval == 0 ? this.playTime : this.playTime + (fallInterval - this.fallTime) % fallInterval;
			if (!this.isReplay && this.clearTime < 1 && this.current == null) {
				afterClearTime = latestTime + this.clearTime;
				this.afterClear(afterClearTime);
				iStart = afterClearTime + fallInterval;
			}
			this.fallTime -= Math.min(0, this.clearTime);
			this.clearTime = Math.max(0, this.clearTime);
			if (this.isNewLevel && this.clearTime == 0) this.isNewLevel = false;
			if (!this.isReplay) {
				if (this.current != null) if (this.current.canFall(this.board)) {
					for (let i = iStart, j = 0; fallInterval <= this.fallTime && j < 22; i += fallInterval, this.fallTime -= fallInterval, j++) {
						if (i >= afterClearTime) this.actionQueue.push([0, "fall", i]);
					}
				} else {
					if ((this.lockTime += timePassed) >= this.getLockDelay()) {
						this.actionQueue.push([1, "lockDown", latestTime]);
					}
				}
				if (buttonStatus.softDrop) {
					if (this.softDropCounter == -1) {
						this.actionQueue.push([2, "softDrop", latestTime]);
						this.softDropCounter = 0;
						this.addKeypress();
					} else {
						this.softDropCounter += timePassed;
						let times = Math.floor(this.softDropCounter / this.softDropPeriod);
						let time = this.softDropPeriod == 0 ? latestTime : latestTime - (this.softDropCounter %= this.softDropPeriod) - (times - 1) * this.softDropPeriod;
						times = Math.min(21, times);
						for (let i = 0; i < times; i++) {
							if (time >= afterClearTime) this.actionQueue.push([2, "softDrop", time]);
							time += this.softDropPeriod;
						}
					}
				} else {
					this.softDropCounter = -1;
				}
				if (buttonStatus.hardDrop) {
					if (!this.buttonHardDrop) {
						this.actionQueue.push([3, "hardDrop", latestTime]);
						this.buttonHardDrop = true;
					}
				} else this.buttonHardDrop = false;
				if (buttonStatus.rotateClockwise) {
					if (this.current != null && !this.buttonRotateClockwise) {
						this.actionQueue.push([4, "rotateClockwise", latestTime]);
						this.buttonRotateClockwise = true;
					}
				} else this.buttonRotateClockwise = false;
				if (buttonStatus.rotateCounterClockwise) {
					if (this.current != null && !this.buttonRotateCounterClockwise) {
						this.actionQueue.push([5, "rotateCounterClockwise", latestTime]);
						this.buttonRotateCounterClockwise = true;
					}
				} else this.buttonRotateCounterClockwise = false;
				if (buttonStatus.hold) {
					if (!this.buttonHold) {
						if (buttonStatus.quitModifier) {
							this.pause(false);
							this.optionsScreen.openGameScreen();
						} else if (this.current != null) {
							this.actionQueue.push([6, "doHold", latestTime]);
							this.buttonHold = true;
						}
					}
				} else this.buttonHold = false;
			}
			
			let moveEvents = [];
			if (buttonStatus.left) {
				if (!this.moveDisabledLeft && (!this.buttonMoveLeft || this.moveLock != 2)) {
					if (this.moveLeftCounter == -1) {
						moveEvents.push([8, "moveLeft", latestTime]);
						this.moveLeftCounter = this.oldMoveLeftCounter = 0;
						this.moveLock = 1;
					} else {
						this.moveLeftCounter += timePassed;
						let newCounter = DASDiv(this.moveLeftCounter - this.autoRepeatDelay, this.autoRepeatPeriod);
						let times = newCounter - this.oldMoveLeftCounter;
						times = Math.min(9, times);
						let time = this.autoRepeatPeriod == 0 ? latestTime : latestTime - (this.moveLeftCounter - this.autoRepeatDelay) % this.autoRepeatPeriod - (times - 1) * this.autoRepeatPeriod;
						for (let i = 0; i < times; i++) {
							if (time >= afterClearTime) moveEvents.push([7, "moveLeft", time]);
							time += this.autoRepeatPeriod;
						}
						this.oldMoveLeftCounter = newCounter == Infinity ? 0 : newCounter;
					}
					this.buttonMoveLeft = true;
				} else {
					this.moveLeftCounter = -1;
				}
			} else {
				this.moveLeftCounter = -1;
				this.moveLock = 0;
				this.buttonMoveLeft = false;
				this.moveDisabledLeft = false;
			}
			if (buttonStatus.right) {
				if (!this.moveDisabledRight && (!this.buttonMoveRight || this.moveLock != 1)) {
					moveEvents = [];
					if (this.moveRightCounter == -1) {
						moveEvents.push([10, "moveRight", latestTime]);
						this.moveRightCounter = this.oldMoveRightCounter = 0;
						this.moveLock = 2;
					} else {
						this.moveRightCounter += timePassed;
						let newCounter = DASDiv(this.moveRightCounter - this.autoRepeatDelay, this.autoRepeatPeriod);
						let times = newCounter - this.oldMoveRightCounter;
						let time = this.autoRepeatPeriod == 0 ? latestTime : latestTime - (this.moveRightCounter - this.autoRepeatDelay) % this.autoRepeatPeriod - (times - 1) * this.autoRepeatPeriod;
						times = Math.min(9, times);
						for (let i = 0; i < times; i++) {
							if (time >= afterClearTime) moveEvents.push([9, "moveRight", time]);
							time += this.autoRepeatPeriod;
						}
						this.oldMoveRightCounter = newCounter == Infinity ? 0 : newCounter;
					}
					this.buttonMoveRight = true;
				} else {
					this.moveRightCounter = -1;
				}
			} else {
				this.moveRightCounter = -1;
				this.moveLock = 0;
				this.buttonMoveRight = false;
				this.moveDisabledRight = false;
			}
			this.actionQueue.push(...moveEvents);
			
			for (let action of this.actionQueue.sort(this.actionCompareFunc)) {
				this.actionMapping[action[0]](action[2]);
			}

			this.actionQueue = [];
			this.fallTime = fallInterval == 0 ? 0 : this.fallTime % fallInterval;

			this.playTime = latestTime;
			if (this.doSaveReplay && Math.floor(this.playTime / 120000) >= this.replay.states.length) this.saveState();
		} else if (this.state == GameState.warmup) {
			this.warmupSecond -= timePassed;
			if (this.warmupSecond < 1) {
				this.warmupLeft--;
				if (this.warmupLeft == -1) {
					this.start();
				} else {
					this.warmupSecond += 1000;
					if (this.warmupLeft < 3) sfx.countdown.play();
				}
			}
		}

		if (buttonStatus.esc) {
			if (!this.buttonEsc) {
				switch (this.state) {
					case GameState.playing:
						if (buttonStatus.quitModifier) {
							this.quit();
							break;
						}
						this.pause();
						break;
					case GameState.paused:
						if (buttonStatus.quitModifier) {
							this.quit();
							break;
						}
						this.resume();
						break;
					case GameState.over:
						if (this.doSaveReplay && buttonStatus.quitModifier) {
							let date = new Date();
							createAndDownloadFile(`${this.getModeNameForDisplay()} – ${date.getHours()}h${date.getMinutes()<10?"0":""}${date.getMinutes()}.${date.getSeconds()<10?"0":""}${date.getSeconds()} ${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}.tetreml_replay`, pako.gzip(JSON.stringify(this.replay)));
						}
						else this.quit();
						break;
				}
				this.buttonEsc = true;
			}
		} else this.buttonEsc = false;

		if (buttonStatus.quitModifier && buttonStatus.hold && (this.state == GameState.paused || this.state == GameState.over)) this.optionsScreen.openGameScreen();

		if (buttonStatus.volumeUp) {
			if (!this.buttonVolumeUp) {
				setVolume(volume + 1);
				this.volumeDisplayTime = 1000;
				this.buttonVolumeUp = true;
			}
		} else this.buttonVolumeUp = false;

		if (buttonStatus.volumeDown) {
			if (!this.buttonVolumeDown) {
				setVolume(volume - 1);
				this.volumeDisplayTime = 1000;
				this.buttonVolumeDown = true;
			}
		} else this.buttonVolumeDown = false;
	}

	processInstaFall(timestamp) {
		if (this.isReplay || this.state != GameState.playing || this.current == null || this.getFallInterval() != 0) return;
		while (this.current.canFall(this.board)) this.fall(timestamp);
	}

	addKeypress() {
		if (this.current != null) this.keypresses++;
	}

	isMinoVisible(x, y) {
		if (x < 0 || x > 9 || y < 0 || y > 39) return;
		let mino = this.board[x][y];
		return mino != undefined && (this.isReplay || mino.shouldRender(this.playTime)) && mino.textureY != -1;
	}

	render() {
		let timePassed = 0;
		if (this.oldTime == null) {
			this.oldTime = new Date().getTime();
			return;
		} else {
			let currentTime = new Date().getTime();
			timePassed = currentTime - this.oldTime;
			this.oldTime = currentTime;
		}

		if (this.isReplay) {
			if (this.state == GameState.playing) this.handleReplayEpoch(this.playTime + Math.floor(timePassed * this.replaySpeed));
		}
		else this.processGameLogic(timePassed);
		
		// Actually render things on the screen.

		ctx.globalAlpha = 1;
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(playScreenImage, 0, 0);
		
		ctx.fillStyle = "#FFF";
		ctx.font = "16px Tetreml";
		ctx.textAlign = "center";
		ctx.fillText("HOLD", 198, 23);
		ctx.fillText("NEXT", 440, 23);
		ctx.font = "350 24px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("STATS", 19, 86);

		this.renderBehind(timePassed);

		if (this.allClearTime > 0 && ((this.isReplay && this.state != GameState.over) || this.state == GameState.playing)) {
			ctx.fillStyle = "#FFF";
			ctx.font = "20px Tetreml";
			ctx.textAlign = "center";
			ctx.fillText("ALL CLEAR", 320, 40);
			ctx.fillText("1000 points", 320, 65);
			this.allClearTime -= timePassed;
		}

		if (this.isReplay || this.state != GameState.paused) {
			if (this.stackMinY < 24) {
				ctx.fillStyle = "#F00";
				ctx.globalAlpha = 0.4;
				ctx.fillRect(this.gridX, this.gridY + this.minoSize * 2 - 1, this.minoSize * 10, 2);
				if (this.state != GameState.over) {
					ctx.globalAlpha = 0.6;
					let next = this.getNextSpawn();
					for (let mino of next.states[0]) {
						let y = next.y - 18 + mino[1];
						if (y > -1) ctx.drawImage(sprite, 64, 128, 16, 16, this.gridX + this.minoSize * (next.x + mino[0]), this.gridY + this.minoSize * y, this.minoSize, this.minoSize);
					}
				}
			}

			ctx.globalAlpha = 0.7;
			for (let x = 0; x < 10; x++) {
				for (let y = 18; y < 40; y++) {
					let mino = this.board[x][y];
					let shouldRender = mino == undefined ? false : mino.shouldRender(this.playTime);
					if (mino != undefined && (this.isReplay || shouldRender)) {
						if (!shouldRender) ctx.globalAlpha = 0.2;
						let minoX = this.gridX + x * this.minoSize;
						let minoY = this.gridY + this.minoSize * (y - 18);
						this.renderMino(x, y, mino.directions, mino.textureY);
						if (mino.textureY != -1) {
							let uldr = this.isMinoVisible(x + 1, y) << 3 | this.isMinoVisible(x, y - 1) << 2 | this.isMinoVisible(x - 1, y) << 1 | this.isMinoVisible(x, y + 1); // Up left down right.
							ctx.drawImage(outlineSprite, 16 * uldr, 128, 16, 16, minoX, minoY, this.minoSize, this.minoSize);
							if (!this.isMinoVisible(x - 1, y - 1) && (uldr & 0b0110) == 0b0110) ctx.drawImage(outlineSprite, 0, 144, 16, 16, minoX, minoY, this.minoSize, this.minoSize);
							if (!this.isMinoVisible(x + 1, y - 1) && (uldr & 0b1100) == 0b1100) ctx.drawImage(outlineSprite, 16, 144, 16, 16, minoX, minoY, this.minoSize, this.minoSize);
							if (!this.isMinoVisible(x + 1, y + 1) && (uldr & 0b1001) == 0b1001) ctx.drawImage(outlineSprite, 32, 144, 16, 16, minoX, minoY, this.minoSize, this.minoSize);
							if (!this.isMinoVisible(x - 1, y + 1) && (uldr & 0b0011) == 0b0011) ctx.drawImage(outlineSprite, 48, 144, 16, 16, minoX, minoY, this.minoSize, this.minoSize);
						}
						ctx.globalAlpha = 0.7;
					}
				}
			}
			ctx.globalAlpha = 1;
			if (this.shouldDrawGhostTetrimino() && this.current != null && this.state != GameState.over) for (let ghostY = this.current.y; true; ghostY++) {
				if (this.current.checkCollision(this.board, null, ghostY)) {
					let tetriminoX = this.gridX + this.current.x * this.minoSize;
					let tetriminoY = this.gridY + this.minoSize * (ghostY - 19);
					for (let mino of this.current.states[this.current.state])
						if (ghostY + mino[1] > 18) ctx.drawImage(outlineSprite, mino[2] * 16, this.current.textureY * 16, 16, 16, tetriminoX + mino[0] * this.minoSize, tetriminoY + mino[1] * this.minoSize, this.minoSize, this.minoSize);
					break;
				}
			}
			if (this.current != null && this.state != GameState.over) {
				this.current.render(this);
			}
			if (this.hold != null) this.renderTetrimino(this.hold, this.holdX, this.holdY, this.holdSwitched);
			for (let i = 0; i < 3; i++) this.renderTetrimino(this.queue[i], this.nextX, this.nextY + this.minoSize * 3 * i);
		}

		if (this.showKeystrokes) {
			ctx.drawImage(sprite, buttonStatus.hardDrop ? 32 : 0, 128, 32, 32, this.gridX + 223, this.gridY + 203, 32, 32);
			ctx.drawImage(sprite, buttonStatus.left ? 32 : 0, 128, 32, 32, this.gridX + 189, this.gridY + 237, 32, 32);
			ctx.drawImage(sprite, buttonStatus.softDrop ? 32 : 0, 128, 32, 32, this.gridX + 223, this.gridY + 237, 32, 32);
			ctx.drawImage(sprite, buttonStatus.right ? 32 : 0, 128, 32, 32, this.gridX + 257, this.gridY + 237, 32, 32);
			ctx.drawImage(sprite, buttonStatus.rotateCounterClockwise ? 32 : 0, 128, 32, 32, this.gridX + 307, this.gridY + 203, 32, 32);
			ctx.drawImage(sprite, buttonStatus.rotateClockwise ? 32 : 0, 128, 32, 32, this.gridX + 341, this.gridY + 203, 32, 32);
			ctx.drawImage(sprite, 0, buttonStatus.hold ? 192 : 160, 66, 32, this.gridX + 307, this.gridY + 237, 66, 32);

			ctx.textAlign = "center";
			ctx.fillStyle = "#FFF";
			ctx.font = "12px Tetreml";
			ctx.fillText(keyNames.hardDrop, this.gridX + 239, this.gridY + 224, 30);
			ctx.fillText(keyNames.left, this.gridX + 205, this.gridY + 258, 30);
			ctx.fillText(keyNames.softDrop, this.gridX + 239, this.gridY + 258, 30);
			ctx.fillText(keyNames.right, this.gridX + 273, this.gridY + 258, 30);
			ctx.fillText(keyNames.rotateCounterClockwise, this.gridX + 323, this.gridY + 224, 30);
			ctx.fillText(keyNames.rotateClockwise, this.gridX + 357, this.gridY + 224, 30);
			ctx.fillText(keyNames.hold, this.gridX + 340, this.gridY + 258, 62);
		}

		ctx.imageSmoothingEnabled = true;

		if (this.isReplay || this.state != GameState.paused) {
			let newParticles = [];
			for (let particle of this.particles) {
				let ratio = particle.time / particle.lifetime;
				ctx.drawImage(sprite, 84, 132, 9, 9, particle.x + 4.5 * ratio, particle.y - particle.distance * (1 - Math.pow((1 - ratio), 4)) - 4.5 * ratio, 9 * (1 - ratio), 9 * (1 - ratio));
				if ((particle.time += timePassed) < particle.lifetime) newParticles.push(particle);
			}
			this.particles = newParticles;
		}

		if (this.lineClearDelayEnabled && this.clearEffectTime < 151) {
			let ratio = this.clearEffectTime / 150;
			ctx.fillStyle = "rgb(255, 255, " + (255 * (1-ratio)) + ")";
			for (let line of this.clearedLines) ctx.fillRect(this.gridX - 2 * this.minoSize * ratio, this.gridY + this.minoSize * (line - 18) + this.minoSize / 2 * ratio, this.minoSize * (10 + 4 * ratio), this.minoSize * (1 - ratio));
			this.clearEffectTime += timePassed;
		}

		ctx.fillStyle = "#FFF";
		ctx.font = "20px Tetreml";
		ctx.textAlign = "right";
		if (this.rewardTime != 0) ctx.fillText(this.rewardAmount, 632, 348);
		if (this.combo > 0) ctx.fillText("" + this.combo, 632, 323);
		ctx.textAlign = "left";
		if (this.combo > 0) ctx.fillText("COMBO", 406, 323);
		if (this.rewardTime != 0) {
			this.rewardTime = Math.max(0, this.rewardTime - timePassed);
			ctx.fillText(this.rewardName, 406, 348, 221 - ctx.measureText(this.rewardAmount).width);
		}

		ctx.font = "9px Tetreml";
		ctx.textAlign = "left";
		if (this.volumeDisplayTime > 0) {
			ctx.fillText(`Volume: ${volume} / 10`, 20, this.isReplay ? 15 : 351);
			this.volumeDisplayTime -= timePassed;
		} else {
			ctx.globalAlpha = 0.5;
			ctx.fillText(this.getModeNameForDisplay(), 20, this.isReplay ? 15 : 351);
		}
		ctx.globalAlpha = 1;

		switch (this.state) {
			case GameState.warmup:
				ctx.textAlign = "center";
				ctx.fillStyle = "#FF0";
				if (this.warmupLeft > 2) {
					if (this.warmupLeft == 3) ctx.globalAlpha = this.warmupSecond / 1000;
					ctx.font = "300 30px Tetreml";
					ctx.fillText("READY", 320, 195);
				} else {
					ctx.font = "300 45px Tetreml";
					ctx.fillText("" + this.warmupLeft, 320, 205);
				}
				break;
			case GameState.playing:
				if (this.isReplay) break;
				ctx.textAlign = "left";
				ctx.font = "12px Tetreml";
				ctx.fillText(buttonStatus.quitModifier ? keyNames.quitModifier + "+" + keyNames.esc + " Quit" : keyNames.esc + " Pause", 10, 17);
				if (buttonStatus.quitModifier) ctx.fillText(keyNames.quitModifier + "+" + keyNames.hold + " Restart", 10, 32);
				break;
			case GameState.paused:
				if (this.isReplay) break;
				ctx.textAlign = "center";
				ctx.globalAlpha = 1;
				ctx.fillStyle = "#FFF";
				ctx.font = "20px Tetreml";
				ctx.fillText("PAUSED", 320, 121);
				ctx.font = "12px Tetreml";
				ctx.fillText(keyNames.esc + " to continue.", 320, 141);
				ctx.textAlign = "left";
				if (buttonStatus.quitModifier) {
					ctx.fillText(keyNames.quitModifier + "+" + keyNames.esc + " Quit", 10, 17);
					ctx.fillText(keyNames.quitModifier + "+" + keyNames.hold + " Restart", 10, 32);
				}
				break;
			case GameState.over:
				ctx.textAlign = "center";
				ctx.globalAlpha = 0.6;
				ctx.fillStyle = "#000";
				ctx.fillRect(240, 4, 160, 352);
				ctx.globalAlpha = 1;
				ctx.fillStyle = "#FFF";
				ctx.font = "20px Tetreml";
				ctx.fillText("GAME OVER", 320, 40);
				if (this.isReplay) break;
				ctx.font = "12px Tetreml";
				ctx.fillText("Press " + keyNames.esc + " to continue.", 320, 318);
				ctx.fillText(keyNames.quitModifier + "+" + keyNames.esc + " to save replay.", 320, 333);
				ctx.fillText(keyNames.quitModifier + "+" + keyNames.hold + " to restart.", 320, 348);
				break;
		}
		ctx.globalAlpha = 1;
		this.renderInFront(timePassed);
	}

	getNextSpawn() {
		return this.queue[0];
	}

	renderBehind(timePassed) { };

	renderInFront(timePassed) { };

	close() {
		currentSong = null;
	}

	renderMino(x, y, directions, textureY) {
		if (y < 18 || y > 39) return;
		if (textureY == -1)
			ctx.drawImage(spriteElectronika, 0, 0, 16, 16, this.gridX + x * this.minoSize, this.gridY + this.minoSize * (y - 18), this.minoSize, this.minoSize);
		else
			ctx.drawImage(sprite, 16 * directions, textureY * 16, 16, 16, this.gridX + x * this.minoSize, this.gridY + this.minoSize * (y - 18), this.minoSize, this.minoSize);
	}

	renderTetrimino(tetrimino, x, y, gray = false) {
		if (!(tetrimino instanceof TetriminoI) && !(tetrimino instanceof TetriminoO)) x += this.minoSize/2;
		if (tetrimino instanceof TetriminoI) y -= this.minoSize/2;
		for (let mino of tetrimino.states[0]) {
			if (tetrimino.textureY == -1)
				ctx.drawImage(spriteElectronika, gray ? 16 : 0, 0, 16, 16, x + this.minoSize * mino[0], y + this.minoSize * mino[1], this.minoSize, this.minoSize);
			else
				ctx.drawImage(sprite, 16 * mino[2], gray ? 0 : tetrimino.textureY * 16, 16, 16, x + this.minoSize * mino[0], y + this.minoSize * mino[1], this.minoSize, this.minoSize);
		}
	}

	afterClear(time) {
		if (!this.isSeeking && this.lineClearDelayEnabled && this.clearedLines.length != 0) sfx.afterClear.play();
		for (let line of this.clearedLines) {
			for (let i = 0; i < 10; i++) {
				this.board[i].splice(line, 1);
				this.board[i] = [undefined].concat(this.board[i]);
			}
			this.minos.splice(line, 1);
			this.minos = [0].concat(this.minos);
		}
		// Ensure that nextTetrimino always runs.
		if (this.isReplay) this.clearTime = 0;
		this.nextTetrimino();
		this.isClearing = false;
		this.clearedLines = [];
		this.recordAction("afterClear", time);
	}

	fall(timestamp) {
		if (this.current == null || !this.current.canFall(this.board)) return false;
		this.current.onMove();
		if (++this.current.y > this.maxY) {
			this.lockTime = 0;
			this.moveCounter = 0;
			this.maxY = this.current.y;
		}
		if (!this.current.canFall(this.board)) {
			if (!this.isSeeking) sfx.land.play();
			this.lockTime = this.fallTime;
		}
		this.recordAction("fall", timestamp);
		return true;
	}

	lockDown(timestamp) {
		if (this.current == null) return;
		this.recordAction("lockDown", timestamp);
		this.lock(false, timestamp);
		if (!this.isSeeking) sfx.lock.play();
		this.processInstaFall(timestamp);
	}

	move(offset, isInitialPress, timestamp) {
		if (this.state == GameState.playing && this.current != null) {
			let newX = this.current.x + offset;
			if (!this.current.checkCollision(this.board, newX, this.current.y)) {
				if (!this.isSeeking) (this.current.canFall(this.board) ? sfx.move : sfx.moveOnGround).play();
				this.current.x = newX;
				this.current.onMove();
				if (this.moveCounter++ < 15) this.lockTime = 0;
				if (isInitialPress || this.wasNull) this.addKeypress();
				this.wasNull = false;
				this.recordAction(offset > 0 ? "moveRight" : "moveLeft", timestamp);
				if (!this.isSeeking && !this.processInstaFall(timestamp) && this.current.checkCollision(this.board, newX + offset, this.current.y)) sfx.land.play();
				return true;
			}
		}
		this.wasNull = this.current == null;
		return false;
	}

	rotateClockwise(timestamp) {
		if (this.current != null) {
			let inAir = this.current.canFall(this.board);
			if (!this.current.rotateClockwise(this.board)) return;
			this.addKeypress();
			if (!this.isSeeking) (inAir ? sfx.rotate : sfx.rotateOnGround).play();
			if (this.moveCounter++ < 15) this.lockTime = 0;
			this.recordAction("rotateClockwise", timestamp);
			this.processInstaFall(timestamp);
		}
	}

	rotateCounterClockwise(timestamp) {
		if (this.current != null) {
			let inAir = this.current.canFall(this.board);
			if (!this.current.rotateCounterClockwise(this.board)) return;
			this.addKeypress();
			if (!this.isSeeking) (inAir ? sfx.rotate : sfx.rotateOnGround).play();
			if (this.moveCounter++ < 15) this.lockTime = 0;
			this.recordAction("rotateCounterClockwise", timestamp);
			this.processInstaFall(timestamp);
		}
	}

	softDrop(timestamp) {
		if (this.current != null && this.current.canFall(this.board)) {
			if (++this.current.y > this.maxY) {
				this.lockTime = 0;
				this.moveCounter = 0;
				this.maxY = this.current.y;
			}
			this.current.onMove();
			if (!this.isSeeking) {
				sfx.softDrop.play();
				if (!this.current.canFall(this.board)) sfx.land.play();
			}
			this.recordAction("softDrop", timestamp);
			return false;
		}
		return true;
	}

	spawnParticle() {
		let current = this.current;
		this.particles.push({
			x: this.gridX + this.minoSize * (current.x + current.leftX[current.state] - 0.5 + (current.width[current.state] + 1) * Math.random()),
			y: this.gridY + this.minoSize * (current.y + current.topY[current.state] - 19),
			distance: this.minoSize * (0.5 + 1.5 * Math.random()),
			lifetime: 250 + 500 * Math.random(),
			time: 0
		});
	}

	hardDrop(timestamp) {
		if (this.current == null) return;
		let count = 0;
		while (this.current.canFall(this.board)) {
			if (!this.isSeeking && Math.random() < 0.25) this.spawnParticle();
			this.current.y++;
			count++;
		}
		if (count) this.current.onMove();
		if (!this.isSeeking) {
			for (let i = 0; i < 3; i++) this.spawnParticle();
			(count ? sfx.hardDrop : sfx.softLock).play();
		}
		this.recordAction("hardDrop", timestamp);
		this.lock(true, timestamp);
		this.processInstaFall(timestamp);
		return count;
	}

	doHold(timestamp) {
		if (this.current != null && !this.holdSwitched) {
			this.oldHold = this.hold;
			this.hold = this.current;
			if (this.oldHold == null) this.nextTetrimino(); else {
				this.current = this.oldHold;
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
	}

	getBaseline() {
		return this.current.y + this.current.baseY[this.current.state];
	}
	
	lock(isDrop, timestamp) {
		if (this.current == null) return;
		let toClear = [];
		this.tetriminoes++;
		let tSpinType = this.current.getTSpinType(this.board);
		for (let mino of this.current.getLockPositions()) {
			this.board[mino[0]][mino[1]] = new Mino(mino[2], this.current.textureY, this.getMinoDisappearanceTime());
			if (++this.minos[mino[1]] == 10) toClear.push(mino[1]);
		}
		this.totalMinos += 4;
		let baseline = this.getBaseline();
		if (baseline < 20) {
			this.gameOver();
			return -1;
		}
		this.stackMinY = Math.min(this.current.y + this.current.topY[this.current.state], this.stackMinY);
		if (!this.isSeeking && tSpinType) (toClear.length == 0 ? sfx.tSpinZero : sfx.tSpin).play();
		this.addReward(rewardIndexMapping[tSpinType] + toClear.length);
		this.clearLines(toClear);
		if (toClear.length != 0) {
			this.stats[toClear.length][tSpinType ? 1 : 0]++;
			if (this.stats[toClear.length][2] != null) this.stats[toClear.length][2]++;
		} else {
			if (tSpinType) this.stats[0][1]++;
			this.combo = -1;
			this.nextTetrimino();
		}

		if (!this.isReplay && !this.lineClearDelayEnabled && this.clearTime > 0) {
			this.clearTime = 0;
			this.afterClear(timestamp);
		}
		if (this.clearTime == 0) this.moveDisabledLeft = this.moveDisabledRight = true;
		else this.buttonRotateClockwise = this.buttonRotateCounterClockwise = this.buttonHold = false; // Trigger the IRS.
		
		return baseline;
	}

	clearLines(toClear) {
		if (toClear.length == 0) return;
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
		this.lines += toClear.length;
		this.clearTime = 500;
		if (!this.isSeeking) switch (toClear.length) {
			case 1: sfx.single.play(); break;
			case 2: sfx.double.play(); break;
			case 3: sfx.triple.play(); break;
			case 4: sfx.tetris.play(); break;
		}
		if ((this.totalMinos -= toClear.length * 10) == 0) {
			this.score += 1000;
			this.clearTime = 1000;
			this.allClearTime = 1000;
			if (!this.isSeeking) sfx.allClear.play();
		}
		this.current = null;
		this.isClearing = true;
	}

	addReward(reward) {
		if (reward == -1) return;
		if (!this.isSeeking) {
			this.rewardName = this.getRewardName(reward);
			this.rewardTime = 1500;
		}
		this.rewardAmount = this.getRewardAmount(reward);
		if (doesRewardTriggerBackToBack[reward]) {
			if (this.backToBack) {
				this.rewardAmount *= 1.5;
				if (!this.isSeeking) {
					this.rewardName += " BTB";
					sfx.backToBack.play();
				}
			} else this.backToBack = true;
		} else this.backToBack = this.backToBack && reward > 2;
		if (reward != 4 && reward != 7 && ++this.combo > 0) {
			this.rewardAmount += this.getComboBonus();
			if (!this.isSeeking) sfx.combo[Math.min(10, this.combo)].play();
		}
		this.score += this.rewardAmount;
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

	getFallInterval() {
		return 1000;
	}

	getLockDelay() {
		return 500;
	}

	getMinoDisappearanceTime() {
		return -1;
	}

	shouldDrawGhostTetrimino() {
		return true;
	}

	pushToQueue() {
		let bag = [new TetriminoI(), new TetriminoJ(), new TetriminoL(), new TetriminoO(), new TetriminoS(), new TetriminoZ(), new TetriminoT()];
		for (let i = 0; i < 7; i++) {
			this.queue.push(bag.splice(Math.floor(this.random.random() * bag.length), 1)[0]);
		}
	}

	nextTetrimino() {
		if (this.clearTime > 0) {
			this.current = null;
			return;
		}
		this.current = this.queue.shift();
		if (this.queue.length < 6) this.pushToQueue();
		this.fallTime = 0;
		this.lockTime = 0;
		this.moveCounter = 0;
		this.holdSwitched = false;
		this.checkGameOver();
	}

	checkGameOver() {
		if (this.current.checkCollision(this.board)) {
			this.gameOver();
			return;
		}
		if (this.current.canFall(this.board)) this.current.y++;
		this.maxY = this.current.Y;
		if (!this.isSeeking && this.shouldHintTetrimino) sfx["tetrimino" + this.queue[0].code.toUpperCase()].play();
	}

	gameOver() {
		if (this.doSaveReplay) this.replay.length = this.latestTime;
		this.state = GameState.over;
	}

	pause(playSound = true) {
		this.state = GameState.paused;
		if (playSound && !this.isReplay) sfx.pause.play();
	}

	resume() {
		this.state = GameState.playing;
	}

	quit() {
		goBack();
	}

	recordAction(action, timestamp = this.playTime) {
		if (this.doSaveReplay) {
			this.replay.actions.push([timestamp, action]);
			this.oldTimestamp = timestamp;
		}
	}

	saveState() {
		let state = {};
		this.populateStateData(state);
		this.replay.states.push(state);
	}

	populateStateData(state) {
		state.timestamp = this.playTime;
		for (let field of this.singleSaveableFields) state[field] = this[field];
		let board = [];
		for (let x = 0; x < 10; x++) for (let y = 0; y < 40; y++) {
			let mino = this.board[x][y];
			board.push(mino ? [mino.directions, mino.textureY, mino.disappearTime] : -1);
		}
		state.board = board;
		if (this.current == null) state.current = null;
		else state.current = {
			type: this.current.code,
			x: this.current.x,
			y: this.current.y,
			state: this.current.state
		};
		state.randommt = [...this.random.mt];
		state.randommti = this.random.mti;
		state.queue = "";
		for (let tetrimino of this.queue) state.queue += tetrimino.code;
		state.hold = this.hold ? this.hold.code : "";
		state.stats = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
		for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) state.stats[i][j] = this.stats[i][j];
		state.actionIndex = this.replay.actions.length;
	}

	loadState(timestamp) {
		let start = 0, end = this.replay.states.length - 1, index = -1, mid = 0;
		while (start <= end) {
			mid = Math.floor((start + end) / 2);
			if (this.replay.states[mid].timestamp > timestamp) end = mid - 1;
			else {
				index = mid;
				start = mid + 1;
			}
		}
		let state = index == -1 ? this.replay.states[this.replay.states.length - 1] : this.replay.states[index];
		this.readStateData(state);
		return state.actionIndex;
	}

	readStateData(state) {
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

	getModeName() {
		return "???";
	}

	getModeNameForDisplay() {
		return "Tetreml";
	}

	loadModeParameters(parameters) {
		this.isReplay = true;
	}
	
	handleReplayEpoch(playTime) { }

	finalizeSeek() {
		this.particles = [];
		this.clearEffectTime = 200;
		this.allClearTime = 0;
	}
}

// --------------------------

class GameScreenTengen extends PlayScreenBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, 240, 4, 424, 48, 182, 54, 16, showKeystrokes, doSaveReplay, lineClearDelayEnabled);
		this.levels = [[0, 550, 1000], [30, 467, 1000], [30, 400, 1000], [30, 333, 1000], [30, 283, 1000], [30, 233, 1000], [50, 183, 1000], [50, 150, 1000], [50, 117, 1000], [50, 100, 1000], [50, 92, 1000], [50, 83, 1000], [50, 75, 1000], [50, 67, 1000], [50, 63, 1000], [50, 58, 1000], [50, 54, 1000], [50, 50, 1000], [50, 46, 1000], [50, 42, 1000], [50, 39, 1000], [50, 36, 1000], [50, 33, 1000], [50, 30, 1000], [50, 27, 1000], [50, 24, 1000], [50, 22, 1000], [50, 20, 1000]];
		this.linesOfCurrentLevel = 0;
		this.totalLinesToNextLevel = 0;
		this.isNewLevel = false;
		this.lockScore = 0;
		this.lockScoreLine = 0;
		this.lockScoreTime = 0;
		this.level = 1;
		this.singleSaveableFields.push("linesOfCurrentLevel", "totalLinesToNextLevel", "isNewLevel", "lockScore", "lockScoreTime", "level");
		this.speedCurveNames = ["TetrisDotCom", "Tengen", "NESNTSC", "NESPAL"];
		let level6 = new Music("endless_level6Opening", new Music("endless_level6Loop"));
		let level11 = new Music("endless_level11Opening", new Music("endless_level11Loop"));
		this.music = {
			level1: new Music("endless_level1Opening", new Music("endless_level1Loop")),
			level6Trigger: new Music("endless_level6Trigger", level6),
			level6: level6,
			level11Trigger: new Music("endless_level11Trigger", level11),
			level11: level11
		};
	}

	init() {
		super.init();
		if (!this.isReplay) {
			let highScoreName = "tetrisHighScore" + this.speedCurveNames[this.speedCurve];
			let maxLinesName = "tetrisMaxLines" + this.speedCurveNames[this.speedCurve];
			this.highScore = localStorage[highScoreName] == undefined ? 0 : localStorage[highScoreName];
			this.maxLines = localStorage[maxLinesName] == undefined ? 0 : localStorage[maxLinesName];
		}
		if (this.level != this.levels.length) this.totalLinesToNextLevel = this.levels[this.level][0];
	}

	start() {
		super.start();
		currentSong = this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1;
		if (!this.isReplay) currentSong.play();
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Score", 485, 30);
		ctx.fillText("Level " + this.level, 485, 85);
		ctx.fillText("Lines: " + this.lines, 485, 111);
		ctx.fillText("Time elapsed", 485, 164);
		if (!this.isReplay) {
			ctx.fillText("Max lines", 485, 137);
			ctx.fillText("High score", 485, 57);
		}

		ctx.fillText("Zero-line", 20, 155);
		ctx.fillText("Single", 20, 180);
		ctx.fillText("Double", 20, 205);
		ctx.fillText("Triple", 20, 230);
		ctx.fillText("Tetris", 20, 255);

		ctx.fillText("Tetriminoes placed", 20, 295);
		ctx.fillText("Holds", 20, 315);

		ctx.textAlign = "right";
		ctx.fillText("Normal", 118, 130);
		ctx.fillText("T-spin", 163, 130);
		ctx.fillText("Total", 208, 130);

		ctx.fillText("" + this.tetriminoes, 208, 295);
		ctx.fillText("" + this.holds, 208, 315);

		for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) if (this.stats[i][j] != null) ctx.fillText("" + this.stats[i][j], 118 + 45 * j, 155 + 25 * i);
		let isLastLevel = this.level == this.levels.length;
		ctx.fillText("" + (isLastLevel ? "" : this.level + 1), 632, 85);
		ctx.fillText("" + (isLastLevel ? "" : this.totalLinesToNextLevel), 632, 111);
		if (!isLastLevel)
			ctx.fillRect(485, 89, 147 * (this.linesOfCurrentLevel / this.levels[this.level][0]), 10);
		ctx.fillText(formatDuration(Math.floor(this.playTime / 1000)), 632, 164);

		if (!this.isReplay) {
			ctx.fillText("" + this.highScore, 632, 57);
			ctx.fillText("" + this.maxLines, 632, 137);
			ctx.fillRect(485, 115, this.maxLines == 0 ? 147 : Math.min(147, 147 * this.lines / this.maxLines), 10);
			ctx.fillRect(485, 34, this.highScore == 0 ? 147 : Math.min(147, 147 * this.score / this.highScore), 10);
		}

		ctx.font = "20px Tetreml";
		ctx.fillText("" + this.score, 632, 30);
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);

		if ((this.state != GameState.paused || this.isReplay) && this.lockScoreTime != 0 && this.lockScoreLine > 17) {
			ctx.font = "12px Tetreml";
			ctx.textAlign = "right";
			if (this.state != GameState.paused) this.lockScoreTime = Math.max(0, this.lockScoreTime - timePassed);
			ctx.fillText(this.lockScore == 1000 ? "1k" : "" + this.lockScore, 233, 16 + 16 * (this.lockScoreLine - 17));
		}

		switch (this.state) {
			case GameState.playing:
				if (this.isNewLevel && this.clearTime > 0) {
					ctx.fillStyle = this.level == 6 || this.level == 11 ? "#FF0" : "#FFF";
					ctx.font = "12px Tetreml";
					ctx.textAlign = "center";
					ctx.fillText("LEVEL UP", 320, 130);
					ctx.font = "300 30px Tetreml";
					ctx.fillText("" + this.level, 320, 160);
				}
				break;
			case GameState.paused:
				break;
			case GameState.over:
				break;
		}
	}

	lock(isDrop, timestamp) {
		let baseline = super.lock(isDrop, timestamp)-1;
		if (baseline == -1) return;
		this.lockScoreLine = baseline;
		this.lockScore = Math.floor(Math.min(1000, (isDrop ? 2 : 1) * this.level * (this.level + 39 - this.lockScoreLine)));
		this.score += this.lockScore;
		this.lockScoreTime = 1000;
	}

	clearLines(toClear) {
		if (toClear.length == 0) return;
		super.clearLines(toClear);
		this.linesOfCurrentLevel += toClear.length;
		if (this.level < this.levels.length && this.linesOfCurrentLevel >= this.levels[this.level][0]) {
			this.linesOfCurrentLevel -= this.levels[this.level][0];
			this.level++;
			if (this.level != this.levels.length) this.totalLinesToNextLevel += this.levels[this.level][0];
			this.isNewLevel = true;
			if (!this.isSeeking) switch (this.level) {
				case 6:
					this.music.level6Trigger.play(this.music.level6Trigger.id == 0);
					break;
				case 11:
					this.music.level11Trigger.play(this.music.level11Trigger.id == 0);
					break;
			}
			this.clearTime = 1000;
		}
	}

	gameOver() {
		super.gameOver();
		if (!this.isReplay) {
			if (this.score > this.highScore) localStorage["tetrisHighScore" + this.speedCurveNames[this.speedCurve]] = this.score;
			if (this.lines > this.maxLines) localStorage["tetrisMaxLines" + this.speedCurveNames[this.speedCurve]] = this.lines;
		}
		stopCurrentMusic();
		if (!this.isSeeking) sfx.gameOver.play();
	}

	pause(playSound = true) {
		super.pause(playSound);
		stopCurrentMusic();
	}

	resume() {
		super.resume();
		currentSong.resume(true);
	}

	getFallInterval() {
		return this.levels[this.level - 1][1];
	}

	getLockDelay() {
		return this.levels[this.level - 1][2];
	}

	quit() {
		stopCurrentMusic();
		super.quit();
	}

	getComboBonus() {
		return 0;
	}

	getModeName() {
		return "Endless Tengen";
	}

	getModeNameForDisplay() {
		return "Endless (Tengen-like)";
	}

	loadModeParameters(parameters) {
		super.loadModeParameters(parameters);
		this.levels = parameters.levels;
		this.level = parameters.startingLevel;
	}

	readStateData(state) {
		this.oldLevel = this.level;
		stopCurrentMusic();
		super.readStateData(state);
	}

	finalizeSeek() {
		super.finalizeSeek();
		if (this.state != GameState.over && Math.floor((this.level - 1) / 5) != Math.floor((this.oldLevel - 1) / 5)) {
			(this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1).setCurrent();
		}
	}
}

class GameScreenNES extends PlayScreenBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, 240, 4, 424, 48, 182, 54, 16, showKeystrokes, doSaveReplay, lineClearDelayEnabled);
		this.levels = [[0, 550, 1000], [30, 467, 1000], [30, 400, 1000], [30, 333, 1000], [30, 283, 1000], [30, 233, 1000], [50, 183, 1000], [50, 150, 1000], [50, 117, 1000], [50, 100, 1000], [50, 92, 1000], [50, 83, 1000], [50, 75, 1000], [50, 67, 1000], [50, 63, 1000], [50, 58, 1000], [50, 54, 1000], [50, 50, 1000], [50, 46, 1000], [50, 42, 1000], [50, 39, 1000], [50, 36, 1000], [50, 33, 1000], [50, 30, 1000], [50, 27, 1000], [50, 24, 1000], [50, 22, 1000], [50, 20, 1000]];
		this.linesOfCurrentLevel = 0;
		this.totalLinesToNextLevel = 0;
		this.isNewLevel = false;
		this.currentLockScore = 0;
		this.lockScore = 0;
		this.lockScoreLine = 0;
		this.lockScoreTime = 0;
		this.level = 1;
		this.rewardAmounts = [40, 100, 300, 1200, 125, 250, 500, 500, 1000, 2000, 3000];
		this.singleSaveableFields.push("linesOfCurrentLevel", "totalLinesToNextLevel", "isNewLevel", "lockScore", "lockScoreTime", "level");
		this.speedCurveNames = ["TetrisDotCom", "Tengen", "NESNTSC", "NESPAL"];
		let level6 = new Music("endless_level6Opening", new Music("endless_level6Loop"));
		let level11 = new Music("endless_level11Opening", new Music("endless_level11Loop"));
		this.music = {
			level1: new Music("endless_level1Opening", new Music("endless_level1Loop")),
			level6Trigger: new Music("endless_level6Trigger", level6),
			level6: level6,
			level11Trigger: new Music("endless_level11Trigger", level11),
			level11: level11
		};
	}

	init() {
		super.init();
		if (!this.isReplay) {
			let highScoreName = "tetrisNESHighScore" + this.speedCurveNames[this.speedCurve];
			let maxLinesName = "tetrisNESMaxLines" + this.speedCurveNames[this.speedCurve];
			this.highScore = localStorage[highScoreName] == undefined ? 0 : localStorage[highScoreName];
			this.maxLines = localStorage[maxLinesName] == undefined ? 0 : localStorage[maxLinesName];
		}
		if (this.level != this.levels.length) this.totalLinesToNextLevel = this.levels[this.level][0];
	}

	start() {
		super.start();
		currentSong = this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1;
		if (!this.isReplay) currentSong.play();
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Score", 485, 30);
		ctx.fillText("Level " + this.level, 485, 85);
		ctx.fillText("Lines: " + this.lines, 485, 111);
		ctx.fillText("Time elapsed", 485, 164);
		if (!this.isReplay) {
			ctx.fillText("Max lines", 485, 137);
			ctx.fillText("High score", 485, 57);
		}

		ctx.fillText("Zero-line", 20, 155);
		ctx.fillText("Single", 20, 180);
		ctx.fillText("Double", 20, 205);
		ctx.fillText("Triple", 20, 230);
		ctx.fillText("Tetris", 20, 255);

		ctx.fillText("Tetriminoes placed", 20, 295);
		ctx.fillText("Holds", 20, 315);

		ctx.textAlign = "right";
		ctx.fillText("Normal", 118, 130);
		ctx.fillText("T-spin", 163, 130);
		ctx.fillText("Total", 208, 130);

		ctx.fillText("" + this.tetriminoes, 208, 295);
		ctx.fillText("" + this.holds, 208, 315);

		for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) if (this.stats[i][j] != null) ctx.fillText("" + this.stats[i][j], 118 + 45 * j, 155 + 25 * i);
		let isLastLevel = this.level == this.levels.length;
		ctx.fillText("" + (isLastLevel ? "" : this.level + 1), 632, 85);
		ctx.fillText("" + (isLastLevel ? "" : this.totalLinesToNextLevel), 632, 111);
		if (!isLastLevel)
			ctx.fillRect(485, 89, 147 * (this.linesOfCurrentLevel / this.levels[this.level][0]), 10);
		ctx.fillText(formatDuration(Math.floor(this.playTime / 1000)), 632, 164);

		if (!this.isReplay) {
			ctx.fillText("" + this.highScore, 632, 57);
			ctx.fillText("" + this.maxLines, 632, 137);
			ctx.fillRect(485, 115, this.maxLines == 0 ? 147 : Math.min(147, 147 * this.lines / this.maxLines), 10);
			ctx.fillRect(485, 34, this.highScore == 0 ? 147 : Math.min(147, 147 * this.score / this.highScore), 10);
		}

		ctx.font = "20px Tetreml";
		ctx.fillText("" + this.score, 632, 30);
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);

		if ((this.state != GameState.paused || this.isReplay) && this.lockScore != 0 && this.lockScoreTime != 0 && this.lockScoreLine > 17) {
			ctx.font = "12px Tetreml";
			ctx.textAlign = "right";
			if (this.state != GameState.paused) this.lockScoreTime = Math.max(0, this.lockScoreTime - timePassed);
			ctx.fillRect(235, 4 + 16 * (this.lockScoreLine - this.lockScore - 16), 1, this.lockScore * 16);
			ctx.fillText(this.lockScore, 233, 16 + 16 * (this.lockScoreLine - 17));
		}

		switch (this.state) {
			case GameState.playing:
				if (this.isNewLevel && this.clearTime > 0) {
					ctx.fillStyle = this.level == 6 || this.level == 11 ? "#FF0" : "#FFF";
					ctx.font = "12px Tetreml";
					ctx.textAlign = "center";
					ctx.fillText("LEVEL UP", 320, 130);
					ctx.font = "300 30px Tetreml";
					ctx.fillText("" + this.level, 320, 160);
				}
				break;
			case GameState.paused:
				break;
			case GameState.over:
				break;
		}
	}

	fall(timestamp) {
		let res = super.fall(timestamp);
		if (res) {
			if (buttonStatus.softDrop) this.currentLockScore++; else this.currentLockScore = 0;
		}
		return res;
	}

	softDrop(timestamp) {
		let res = super.softDrop(timestamp);
		if (!res) this.currentLockScore++;
		return res;
	}

	hardDrop(timestamp) {
		if (this.current == null) return;
		this.lockScoreStartLine = this.getBaseline();
		let res = super.hardDrop(timestamp);
		this.lockScoreEndLine = this.lockScoreStartLine + res - 1;
		this.lockScore += res;
		this.score += res;
		return res;
	}

	lock(isDrop, timestamp) {
		let baseline = super.lock(isDrop, timestamp)-1;
		if (baseline == -1) return;
		this.lockScoreLine = baseline;
		this.lockScore = this.currentLockScore;
		this.score += this.lockScore;
		this.lockScoreTime = 1000;
		this.currentLockScore = 0;
	}

	clearLines(toClear) {
		if (toClear.length == 0) return;
		super.clearLines(toClear);
		this.linesOfCurrentLevel += toClear.length;
		if (this.level < this.levels.length && this.linesOfCurrentLevel >= this.levels[this.level][0]) {
			this.linesOfCurrentLevel -= this.levels[this.level][0];
			this.level++;
			if (this.level != this.levels.length) this.totalLinesToNextLevel += this.levels[this.level][0];
			this.isNewLevel = true;
			if (!this.isSeeking) switch (this.level) {
				case 6:
					this.music.level6Trigger.play(this.music.level6Trigger.id == 0);
					break;
				case 11:
					this.music.level11Trigger.play(this.music.level11Trigger.id == 0);
					break;
			}
			this.clearTime = 1000;
		}
	}

	gameOver() {
		super.gameOver();
		if (!this.isReplay) {
			if (this.score > this.highScore) localStorage["tetrisNESHighScore" + this.speedCurveNames[this.speedCurve]] = this.score;
			if (this.lines > this.maxLines) localStorage["tetrisNESMaxLines" + this.speedCurveNames[this.speedCurve]] = this.lines;
		}
		stopCurrentMusic();
		if (!this.isSeeking) sfx.gameOver.play();
	}

	pause(playSound = true) {
		super.pause(playSound);
		stopCurrentMusic();
	}

	resume() {
		super.resume();
		currentSong.resume(true);
	}

	getFallInterval() {
		return this.levels[this.level - 1][1];
	}

	getLockDelay() {
		return this.levels[this.level - 1][2];
	}

	getComboBonus() {
		return 0;
	}

	getRewardAmount(reward) {
		return this.rewardAmounts[reward] * this.level;
	}

	quit() {
		stopCurrentMusic();
		super.quit();
	}

	getModeName() {
		return "Endless NES";
	}

	getModeNameForDisplay() {
		return "Endless (NES-like)";
	}

	loadModeParameters(parameters) {
		super.loadModeParameters(parameters);
		this.levels = parameters.levels;
		this.level = parameters.startingLevel;
	}

	readStateData(state) {
		this.oldLevel = this.level;
		stopCurrentMusic();
		super.readStateData(state);
	}

	finalizeSeek() {
		super.finalizeSeek();
		if (this.state != GameState.over && Math.floor((this.level - 1) / 5) != Math.floor((this.oldLevel - 1) / 5)) {
			(this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1).setCurrent();
		}
	}
}

class GameScreenGuidelineBase extends PlayScreenBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, 240, 4, 424, 48, 182, 54, 16, showKeystrokes, doSaveReplay, lineClearDelayEnabled);
		this.lockScore = 0;
		this.lockScoreStartLine = 0;
		this.lockScoreEndLine = 0;
		this.lockScoreTime = 0;
		this.rewardAmounts = [100, 300, 500, 800, 100, 200, 400, 400, 800, 1200, 1600];
		this.singleSaveableFields.push("lockScore", "lockScoreStartLine", "lockScoreEndLine", "lockScoreTime");
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";

		ctx.fillText("Zero-line", 20, 155);
		ctx.fillText("Single", 20, 180);
		ctx.fillText("Double", 20, 205);
		ctx.fillText("Triple", 20, 230);
		ctx.fillText("Tetris", 20, 255);

		ctx.fillText("Tetriminoes placed", 20, 295);
		ctx.fillText("Holds", 20, 315);

		ctx.textAlign = "right";
		ctx.fillText("Normal", 118, 130);
		ctx.fillText("T-spin", 163, 130);
		ctx.fillText("Total", 208, 130);

		ctx.fillText("" + this.tetriminoes, 208, 295);
		ctx.fillText("" + this.holds, 208, 315);
		for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) if (this.stats[i][j] != null) ctx.fillText("" + this.stats[i][j], 118 + 45 * j, 155 + 25 * i);
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);

		if ((this.state != GameState.paused || this.isReplay) && this.lockScoreTime != 0 && this.lockScoreEndLine > 17) {
			ctx.font = "12px Tetreml";
			ctx.textAlign = "right";
			if (this.state != GameState.paused) this.lockScoreTime = Math.max(0, this.lockScoreTime - timePassed);
			ctx.fillRect(235, 4 + 16 * (this.lockScoreStartLine - 17), 1, (this.lockScoreEndLine - this.lockScoreStartLine + 1) * 16);
			ctx.fillText(this.lockScore + "", 231, 16 + 16 * (this.lockScoreEndLine - 17));
		}

		switch (this.state) {
			case GameState.playing:
				break;
			case GameState.paused:
				break;
			case GameState.over:
				break;
		}
	}

	softDrop(timestamp) {
		let res = super.softDrop(timestamp);
		if (!res) this.score++;
		return res;
	}

	hardDrop(timestamp) {
		if (this.current == null) return;
		this.lockScoreStartLine = this.getBaseline();
		let res = super.hardDrop(timestamp);
		this.lockScoreEndLine = this.lockScoreStartLine + res - 1;
		this.lockScore = 2 * res;
		this.score += this.lockScore;
		this.lockScoreTime = 1000;
		return res;
	}
}

class GameScreenGuidelineMarathon extends GameScreenGuidelineBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled);
		this.level = 1;
		this.fallIntervals = [0, 1000, 793, 618, 473, 355, 262, 190, 135, 94, 64, 43, 28, 18, 11, 7];
		this.linesOfCurrentLevel = 0;
		this.linesToNextLevel = 10;
		this.totalLinesToNextLevel = 10;
		this.singleSaveableFields.push("level", "linesOfCurrentLevel", "totalLinesToNextLevel", "linesToNextLevel");
		let level6 = new Music("marathonFixedGoal_level6Opening", new Music("marathonFixedGoal_level6Loop"));
		let level11 = new Music("marathonFixedGoal_level11Opening", new Music("marathonFixedGoal_level11Loop"));
		this.music = {
			level1: new Music("marathonFixedGoal_level1Opening", new Music("marathonFixedGoal_level1Loop")),
			level6Trigger: new Music("marathonFixedGoal_level6Trigger", level6),
			level6: level6,
			level11Trigger: new Music("marathonFixedGoal_level11Trigger", level11),
			level11: level11
		};
	}

	init() {
		super.init();
		if (!this.isReplay) this.highScore = localStorage.tetrisMarathonHighScore == undefined ? 0 : localStorage.tetrisMarathonHighScore;
		this.totalLinesToNextLevel = this.linesToNextLevel = this.level * 10;
	}

	start() {
		super.start();
		currentSong = this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1;
		if (!this.isReplay) currentSong.play();
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Score", 485, 30);
		if (!this.isReplay) ctx.fillText("High score", 485, 57);
		ctx.fillText("Level " + this.level, 485, 85);
		ctx.fillText("Lines: " + this.lines, 485, 111);
		ctx.fillText("Time elapsed", 485, 154);
		
		ctx.textAlign = "right";
		ctx.fillText("" + (this.level == 15 ? "Finish" : this.level + 1), 632, 85);
		ctx.fillText("" + this.totalLinesToNextLevel, 632, 111);
		ctx.fillRect(485, 89, 147 * Math.min(1, this.linesOfCurrentLevel / this.linesToNextLevel), 10);
		ctx.fillText(formatDuration(Math.floor(this.playTime / 1000)), 632, 154);

		if (!this.isReplay) {
			ctx.fillText("" + this.highScore, 632, 57);
			ctx.fillRect(485, 34, this.highScore == 0 ? 147 : Math.min(147, 147 * this.score / this.highScore), 10);
		}

		ctx.font = "20px Tetreml";
		ctx.fillText("" + this.score, 632, 30);
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);
		switch (this.state) {
			case GameState.playing:
				if (this.isNewLevel && this.clearTime > 0) {
					ctx.fillStyle = this.level == 6 || this.level == 11 ? "#FF0" : "#FFF";
					ctx.font = "12px Tetreml";
					ctx.textAlign = "center";
					ctx.fillText("LEVEL UP", 320, 130);
					ctx.font = "300 30px Tetreml";
					ctx.fillText("" + this.level, 320, 160);
				}
				break;
			case GameState.paused:
				break;
			case GameState.over:
				ctx.font = "12px Tetreml";
				ctx.textAlign = "center";
				ctx.fillText(this.gameOverMessage, 320, 60, 150);
				break;
		}
	}

	clearLines(toClear) {
		if (toClear.length == 0) return;
		super.clearLines(toClear);
		this.linesOfCurrentLevel += toClear.length;
		if (this.linesOfCurrentLevel >= this.linesToNextLevel) {
			if (this.level == 15) {
				this.gameOverMessage = "Level 15 has been completed.";
				super.gameOver();
				if (!this.isReplay && this.score > this.highScore) localStorage.tetrisMarathonHighScore = this.score;
				stopCurrentMusic();
				if (!this.isSeeking) sfx.complete.play();
			} else {
				this.linesOfCurrentLevel -= this.linesToNextLevel;
				this.linesToNextLevel = 10;
				this.level++;
				this.totalLinesToNextLevel += 10;
				this.isNewLevel = true;
				if (!this.isSeeking && (this.level == 6 || this.level == 11)) {
					let music = this.level == 6 ? this.music.level6Trigger : this.music.level11Trigger;
					music.play(music.id == 0);
				}
				this.clearTime = 1000;
			}
		}
	}

	gameOver() {
		super.gameOver();
		this.gameOverMessage = "The stack got too high.";
		stopCurrentMusic();
		if (!this.isSeeking) sfx.gameOver.play();
	}

	pause(playSound = true) {
		super.pause(playSound);
		stopCurrentMusic();
	}

	resume() {
		super.resume();
		currentSong.resume();
	}

	getFallInterval() {
		return this.fallIntervals[this.level];
	}

	getLockDelay() {
		return 500;
	}

	getRewardAmount(reward) {
		return this.rewardAmounts[reward] * this.level;
	}

	getComboBonus() {
		return this.combo * 50 * this.level;
	}

	quit() {
		stopCurrentMusic();
		super.quit();
	}

	getModeName() {
		return "Marathon";
	}

	getModeNameForDisplay() {
		return "Marathon – Fixed goal";
	}

	readStateData(state) {
		this.oldLevel = this.level;
		stopCurrentMusic();
		super.readStateData(state);
	}

	finalizeSeek() {
		super.finalizeSeek();
		if (this.state != GameState.over && Math.floor((this.level-1) / 5) != Math.floor((this.oldLevel-1) / 5)) {
			(this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1).setCurrent();
		}
	}

	loadModeParameters(parameters) {
		super.loadModeParameters(parameters);
		this.level = parameters.startingLevel;
	}
}

class GameScreenGuidelineMarathonVariable extends GameScreenGuidelineBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled);
		this.level = 1;
		this.fallIntervals = [0, 1000, 793, 618, 473, 355, 262, 190, 135, 94, 64, 43, 28, 18, 11, 7];
		this.linesOfCurrentLevel = 0;
		this.linesToNextLevel = 5;
		this.totalLinesToNextLevel = 5;
		this.singleSaveableFields.push("level", "linesOfCurrentLevel", "totalLinesToNextLevel", "linesToNextLevel");
		let level6 = new Music("marathonVariableGoal_level6Opening", new Music("marathonVariableGoal_level6Loop"));
		let level11 = new Music("marathonVariableGoal_level11Opening", new Music("marathonVariableGoal_level11Loop"));
		this.music = {
			level1: new Music("marathonVariableGoal_level1Opening", new Music("marathonVariableGoal_level1Loop")),
			level6Trigger: new Music("marathonVariableGoal_level6Trigger", level6),
			level6: level6,
			level11Trigger: new Music("marathonVariableGoal_level11Trigger", level11),
			level11: level11
		};
	}

	init() {
		super.init();
		if (!this.isReplay) this.highScore = localStorage.tetrisMarathonVariableHighScore == undefined ? 0 : localStorage.tetrisMarathonVariableHighScore;
		this.totalLinesToNextLevel = this.linesToNextLevel = this.level * 5;
	}

	start() {
		super.start();
		currentSong = this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1;
		if (!this.isReplay) currentSong.play();
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Score", 485, 30);
		if (!this.isReplay) ctx.fillText("High score", 485, 57);
		ctx.fillText("Level " + this.level, 485, 85);
		ctx.fillText("Progress: " + this.lines, 485, 111);
		ctx.fillText("Time elapsed", 485, 154);
		
		ctx.textAlign = "right";
		ctx.fillText("" + (this.level == 15 ? "Finish" : this.level + 1), 632, 85);
		ctx.fillText("" + this.totalLinesToNextLevel, 632, 111);
		ctx.fillRect(485, 89, 147 * Math.min(1, this.linesOfCurrentLevel / this.linesToNextLevel), 10);
		ctx.fillText(formatDuration(Math.floor(this.playTime / 1000)), 632, 154);

		if (!this.isReplay) {
			ctx.fillText("" + this.highScore, 632, 57);
			ctx.fillRect(485, 34, this.highScore == 0 ? 147 : Math.min(147, 147 * this.score / this.highScore), 10);
		}

		ctx.font = "20px Tetreml";
		ctx.fillText("" + this.score, 632, 30);
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);
		switch (this.state) {
			case GameState.playing:
				if (this.isNewLevel && this.clearTime > 0) {
					ctx.fillStyle = this.level == 6 || this.level == 11 ? "#FF0" : "#FFF";
					ctx.font = "12px Tetreml";
					ctx.textAlign = "center";
					ctx.fillText("LEVEL UP", 320, 130);
					ctx.font = "300 30px Tetreml";
					ctx.fillText("" + this.level, 320, 160);
				}
				break;
			case GameState.paused:
				break;
			case GameState.over:
				ctx.font = "12px Tetreml";
				ctx.textAlign = "center";
				ctx.fillText(this.gameOverMessage, 320, 60, 150);
				break;
		}
	}

	clearLines(toClear) {
		if (toClear.length == 0) return;
		super.clearLines(toClear);
		this.lines -= toClear.length; // Awarding line clears here requires custom handling, so we cancel the default behavior.
		// Awarding lines is now handled in addReward.
		if (this.isNewLevel) this.clearTime = 1000;
	}

	addReward(reward) {
		if (reward == -1) return;
		let lines = this.rewardAmounts[reward] / 100 * (doesRewardTriggerBackToBack[reward] && this.backToBack ? 1.5 : 1);
		super.addReward(reward);
		this.lines += lines;
		this.linesOfCurrentLevel += lines;
		while (this.linesOfCurrentLevel >= this.linesToNextLevel) {
			if (this.level == 15) {
				this.gameOverMessage = "Level 15 has been completed.";
				super.gameOver();
				if (!this.isReplay && this.score > this.highScore) localStorage.tetrisMarathonVariableHighScore = this.score;
				stopCurrentMusic();
				if (!this.isSeeking) sfx.complete.play();
				break;
			} else {
				this.linesOfCurrentLevel -= this.linesToNextLevel;
				this.linesToNextLevel = ++this.level * 5;
				this.totalLinesToNextLevel += this.linesToNextLevel;
				this.isNewLevel = true;
				this.clearTime = 1000;
				if (!this.isSeeking && (this.level == 6 || this.level == 11)) {
					let music = this.level == 6 ? this.music.level6Trigger : this.music.level11Trigger;
					music.play(music.id == 0);
				}
			}
		}
	}

	gameOver() {
		super.gameOver();
		this.gameOverMessage = "The stack got too high.";
		stopCurrentMusic();
		if (!this.isSeeking) sfx.gameOver.play();
	}

	pause(playSound = true) {
		super.pause(playSound);
		stopCurrentMusic();
	}

	resume() {
		super.resume();
		currentSong.resume();
	}

	getFallInterval() {
		return this.fallIntervals[this.level];
	}

	getLockDelay() {
		return 500;
	}

	getRewardAmount(reward) {
		return this.rewardAmounts[reward] * this.level;
	}

	getComboBonus() {
		return this.combo * 50 * this.level;
	}

	quit() {
		stopCurrentMusic();
		super.quit();
	}

	getModeName() {
		return "Marathon variable";
	}

	getModeNameForDisplay() {
		return "Marathon – Variable goal";
	}

	readStateData(state) {
		this.oldLevel = this.level;
		stopCurrentMusic();
		super.readStateData(state);
	}

	finalizeSeek() {
		super.finalizeSeek();
		if (this.state != GameState.over && Math.floor((this.level-1) / 5) != Math.floor((this.oldLevel-1) / 5)) {
			(this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1).setCurrent();
		}
	}

	loadModeParameters(parameters) {
		super.loadModeParameters(parameters);
		this.level = parameters.startingLevel;
	}
}

class GameScreenGuidelineMarathonTetrisDotCom extends GameScreenGuidelineBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled);
		this.level = 1;
		this.fallIntervals = [0, 1000, 793, 618, 473, 355, 262, 190, 135, 94, 64, 43, 28, 18, 11, 7, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		this.lockDelays = [0, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 450, 400, 350, 300, 250, 200, 190, 180, 170, 160, 150];
		this.linesOfCurrentLevel = 0;
		this.linesToNextLevel = 10;
		this.totalLinesToNextLevel = 10;
		this.singleSaveableFields.push("level", "linesOfCurrentLevel", "totalLinesToNextLevel", "linesToNextLevel");
		let level6 = new Music("marathonTetrisDotCom_level6Opening", new Music("marathonTetrisDotCom_level6Loop"));
		let level11 = new Music("marathonTetrisDotCom_level11Opening", new Music("marathonTetrisDotCom_level11Loop"));
		this.music = {
			level1: new Music("marathonTetrisDotCom_level1Opening", new Music("marathonTetrisDotCom_level1Loop")),
			level6Trigger: new Music("marathonTetrisDotCom_level6Trigger", level6),
			level6: level6,
			level11Trigger: new Music("marathonTetrisDotCom_level11Trigger", level11),
			level11: level11
		};
	}

	init() {
		super.init();
		if (!this.isReplay) this.highScore = localStorage.tetrisMarathonTetrisDotComHighScore == undefined ? 0 : localStorage.tetrisMarathonTetrisDotComHighScore;
		this.totalLinesToNextLevel = this.linesToNextLevel = 10;
	}

	start() {
		super.start();
		currentSong = this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1;
		if (!this.isReplay) currentSong.play();
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Score", 485, 30);
		if (!this.isReplay) ctx.fillText("High score", 485, 57);
		ctx.fillText("Level " + this.level, 485, 85);
		ctx.fillText("Lines: " + this.lines, 485, 111);
		ctx.fillText("Time elapsed", 485, 154);
		
		ctx.textAlign = "right";
		ctx.fillText("" + (this.level == 15 ? "Finish" : this.level + 1), 632, 85);
		ctx.fillText("" + this.totalLinesToNextLevel, 632, 111);
		ctx.fillRect(485, 89, 147 * Math.min(1, this.linesOfCurrentLevel / this.linesToNextLevel), 10);
		ctx.fillText(formatDuration(Math.floor(this.playTime / 1000)), 632, 154);

		if (!this.isReplay) {
			ctx.fillText("" + this.highScore, 632, 57);
			ctx.fillRect(485, 34, this.highScore == 0 ? 147 : Math.min(147, 147 * this.score / this.highScore), 10);
		}

		ctx.font = "20px Tetreml";
		ctx.fillText("" + this.score, 632, 30);
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);
		switch (this.state) {
			case GameState.playing:
				if (this.isNewLevel && this.clearTime > 0) {
					ctx.fillStyle = this.level == 6 || this.level == 11 ? "#FF0" : "#FFF";
					ctx.font = "12px Tetreml";
					ctx.textAlign = "center";
					ctx.fillText("LEVEL UP", 320, 130);
					ctx.font = "300 30px Tetreml";
					ctx.fillText("" + this.level, 320, 160);
				}
				break;
			case GameState.paused:
				break;
			case GameState.over:
				ctx.font = "12px Tetreml";
				ctx.textAlign = "center";
				ctx.fillText(this.gameOverMessage, 320, 60, 150);
				break;
		}
	}

	clearLines(toClear) {
		if (toClear.length == 0) return;
		super.clearLines(toClear);
		this.linesOfCurrentLevel += toClear.length;
		if (this.linesOfCurrentLevel >= this.linesToNextLevel) {
			if (this.level == 30) {
				this.gameOverMessage = "Level 30 has been completed.";
				super.gameOver();
				if (!this.isReplay && this.score > this.highScore) localStorage.tetrisMarathonTetrisDotComHighScore = this.score;
				stopCurrentMusic();
				if (!this.isSeeking) sfx.complete.play();
			} else {
				this.linesOfCurrentLevel -= this.linesToNextLevel;
				this.linesToNextLevel = 10;
				this.level++;
				this.totalLinesToNextLevel += 10;
				this.isNewLevel = true;
				if (!this.isSeeking && (this.level == 6 || this.level == 11)) {
					let music = this.level == 6 ? this.music.level6Trigger : this.music.level11Trigger;
					music.play(music.id == 0);
				}
				this.clearTime = 1000;
			}
		}
	}

	gameOver() {
		super.gameOver();
		this.gameOverMessage = "The stack got too high.";
		stopCurrentMusic();
		if (!this.isSeeking) sfx.gameOver.play();
		if (!this.isReplay && this.score > this.highScore) localStorage.tetrisMarathonTetrisDotComHighScore = this.score;
	}

	pause(playSound = true) {
		super.pause(playSound);
		stopCurrentMusic();
	}

	resume() {
		super.resume();
		currentSong.resume();
	}

	getFallInterval() {
		return this.fallIntervals[this.level];
	}

	getLockDelay() {
		return this.lockDelays[this.level];
	}

	getRewardAmount(reward) {
		return this.rewardAmounts[reward] * this.level;
	}

	getComboBonus() {
		return this.combo * 50 * this.level;
	}

	quit() {
		stopCurrentMusic();
		super.quit();
	}

	getModeName() {
		return "Marathon tetris.com";
	}

	getModeNameForDisplay() {
		return "Marathon – tetris.com";
	}

	readStateData(state) {
		this.oldLevel = this.level;
		stopCurrentMusic();
		super.readStateData(state);
	}

	finalizeSeek() {
		super.finalizeSeek();
		if (this.state != GameState.over && Math.floor((this.level-1) / 5) != Math.floor((this.oldLevel-1) / 5)) {
			(this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1).setCurrent();
		}
	}

	loadModeParameters(parameters) {
		super.loadModeParameters(parameters);
		this.level = parameters.startingLevel;
	}
}

class GameScreenGuidelineEndless extends GameScreenGuidelineBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled);
		this.level = 1;
		this.linesOfCurrentLevel = 0;
		this.totalLinesToNextLevel = 0;
		this.isNewLevel = false;
		this.singleSaveableFields.push("level", "linesOfCurrentLevel", "isNewLevel");
		this.speedCurveNames = ["Normal", "Moderate", "Speedy", "TetrisDotCom"];
		let level6 = new Music("endless_level6Opening", new Music("endless_level6Loop"));
		let level11 = new Music("endless_level11Opening", new Music("endless_level11Loop"));
		this.music = {
			level1: new Music("endless_level1Opening", new Music("endless_level1Loop")),
			level6Trigger: new Music("endless_level6Trigger", level6),
			level6: level6,
			level11Trigger: new Music("endless_level11Trigger", level11),
			level11: level11
		};
	}

	init() {
		super.init();
		if (!this.isReplay)  {
			let highScoreName = "tetrisGuidelineHighScore" + this.speedCurveNames[this.speedCurve];
			let maxLinesName = "tetrisGuidelineMaxLines" + this.speedCurveNames[this.speedCurve];
			this.highScore = localStorage[highScoreName] == undefined ? 0 : localStorage[highScoreName];
			this.maxLines = localStorage[maxLinesName] == undefined ? 0 : localStorage[maxLinesName];
		}
		if (this.level != this.levels.length) this.totalLinesToNextLevel = this.levels[this.level][0];
	}

	start() {
		super.start();
		currentSong = this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1;
		if (!this.isReplay) currentSong.play();
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Score", 485, 30);
		ctx.fillText("Level " + this.level, 485, 85);
		ctx.fillText("Lines: " + this.lines, 485, 111);
		ctx.fillText("Time elapsed", 485, 164);
		if (!this.isReplay) {
			ctx.fillText("High score", 485, 57);
			ctx.fillText("Max lines", 485, 137);
		}
		
		ctx.textAlign = "right";
		let isLastLevel = this.level == this.levels.length;
		ctx.fillText("" + (isLastLevel ? "" : this.level + 1), 632, 85);
		ctx.fillText("" + (isLastLevel ? "" : this.totalLinesToNextLevel), 632, 111);
		if (!isLastLevel)
			ctx.fillRect(485, 89, 147 * (this.linesOfCurrentLevel / this.levels[this.level][0]), 10);
		ctx.fillText(formatDuration(Math.floor(this.playTime / 1000)), 632, 164);
		if (!this.isReplay) {
			ctx.fillText("" + this.highScore, 632, 57);
			ctx.fillText("" + this.maxLines, 632, 137);
			ctx.fillRect(485, 34, this.highScore == 0 ? 147 : Math.min(147, 147 * this.score / this.highScore), 10);
			ctx.fillRect(485, 115, this.maxLines == 0 ? 147 : Math.min(147, 147 * this.lines / this.maxLines), 10);
		}

		ctx.font = "20px Tetreml";
		ctx.fillText("" + this.score, 632, 30);
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);
		switch (this.state) {
			case GameState.playing:
				if (this.isNewLevel && this.clearTime > 0) {
					ctx.fillStyle = this.level == 6 || this.level == 11 ? "#FF0" : "#FFF";
					ctx.font = "12px Tetreml";
					ctx.textAlign = "center";
					ctx.fillText("LEVEL UP", 320, 130);
					ctx.font = "300 30px Tetreml";
					ctx.fillText("" + this.level, 320, 160);
				}
				break;
			case GameState.paused:
				break;
			case GameState.over:
				break;
		}
	}

	clearLines(toClear) {
		if (toClear.length == 0) return;
		super.clearLines(toClear);
		this.linesOfCurrentLevel += toClear.length;
		if (this.level < this.levels.length && this.linesOfCurrentLevel >= this.levels[this.level][0]) {
			this.linesOfCurrentLevel -= this.levels[this.level][0];
			this.level++;
			if (this.level != this.levels.length) this.totalLinesToNextLevel += this.levels[this.level][0];
			this.isNewLevel = true;
			if (!this.isSeeking && (this.level == 6 || this.level == 11)) {
				let music = this.level == 6 ? this.music.level6Trigger : this.music.level11Trigger;
				music.play(music.id == 0);
			}
			this.clearTime = 1000;
		}
	}

	gameOver() {
		super.gameOver();
		if (!this.isReplay) {
			if (this.score > this.highScore) localStorage["tetrisGuidelineHighScore" + this.speedCurveNames[this.speedCurve]] = this.score;
			if (this.lines > this.maxLines) localStorage["tetrisGuidelineMaxLines" + this.speedCurveNames[this.speedCurve]] = this.lines;
		}
		stopCurrentMusic();
		if (!this.isSeeking) sfx.gameOver.play();
	}

	pause(playSound = true) {
		super.pause(playSound);
		stopCurrentMusic();
	}

	resume() {
		super.resume();
		currentSong.resume();
	}

	getFallInterval() {
		return this.levels[this.level - 1][1];
	}

	getLockDelay() {
		return this.levels[this.level - 1][2];
	}

	getRewardAmount(reward) {
		return this.rewardAmounts[reward] * this.level;
	}

	getComboBonus() {
		return this.combo * 50 * this.level;
	}

	quit() {
		stopCurrentMusic();
		super.quit();
	}

	getModeName() {
		return "Endless guideline";
	}

	getModeNameForDisplay() {
		return "Endless (guideline)";
	}

	loadModeParameters(parameters) {
		super.loadModeParameters(parameters);
		this.levels = parameters.levels;
		this.level = parameters.startingLevel;
	}

	readStateData(state) {
		this.oldLevel = this.level;
		stopCurrentMusic();
		super.readStateData(state);
	}

	finalizeSeek() {
		super.finalizeSeek();
		if (this.state != GameState.over && Math.floor((this.level-1) / 5) != Math.floor((this.oldLevel-1) / 5)) {
			(this.level > 10 ? this.music.level11 : this.level > 5 ? this.music.level6 : this.music.level1).setCurrent();
		}
	}
}

class GameScreenGuideline40Line extends GameScreenGuidelineBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled);
		this.singleSaveableFields.push("actionTime");
	}

	init() {
		super.init();
		currentSong = new Music("40Line_opening", new Music("40Line_loop"));
		if (!this.isReplay) {
			this.highScore = localStorage.tetris40LineHighScore == undefined ? 0 : parseInt(localStorage.tetris40LineHighScore);
			this.shortestTime = localStorage.tetris40LineShortestTime == undefined ? -1 : parseInt(localStorage.tetris40LineShortestTime);
		}
		this.actionTime = 0;
	}

	start() {
		super.start();
		if (!this.isReplay) currentSong.play();
	}

	processGameLogic(timePassed) {
		if (this.state == GameState.playing)
			if (this.isReplay) {
				if (!this.isClearing) this.actionTime += timePassed;
			} else this.actionTime -= Math.min(0, this.clearTime - timePassed);
		super.processGameLogic(timePassed);
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);

		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Time", 485, 30);
		ctx.fillText("Lines: " + this.lines, 485, 85);
		ctx.fillText("Score", 485, 126);
		if (!this.isReplay) {
			if (this.shortestTime != -1) ctx.fillText("Shortest time", 485, 57);
			ctx.fillText("High score", 485, 152);
			ctx.fillText("Tetrimino manipulations", 20, 335);
		}
		
		ctx.textAlign = "right";
		ctx.fillText("40", 632, 85);
		ctx.fillText("" + this.score, 632, 126);
		ctx.fillRect(485, 89, Math.min(147, 3.675 * this.lines), 10);

		if (!this.isReplay) {
			ctx.fillText("" + this.highScore, 632, 152);
			if (this.shortestTime != -1) {
				ctx.fillText(formatDurationWithMilliseconds(this.shortestTime / 1000), 632, 57);
				ctx.fillRect(485, 34, Math.min(147, 147 * this.actionTime / this.shortestTime), 10);
			}
			ctx.fillRect(485, 130, this.highScore == 0 ? 147 : Math.min(147, 147 * this.score / this.highScore), 10);
			ctx.fillText("" + this.keypresses, 208, 335);
		}

		ctx.font = "20px Tetreml";
		ctx.fillText(this.state == GameState.over ? formatDurationWithMilliseconds(this.actionTime / 1000) : formatDuration(Math.floor(this.actionTime / 1000)), 632, 30);
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);
		switch (this.state) {
			case GameState.playing:
				break;
			case GameState.paused:
				break;
			case GameState.over:
				ctx.font = "12px Tetreml";
				ctx.textAlign = "center";
				ctx.fillText(this.gameOverMessage, 320, 60, 150);
				break;
		}
	}

	clearLines(toClear) {
		if (toClear.length == 0) return;
		super.clearLines(toClear);
		if (this.lines > 39) {
			this.gameOverMessage = "40 lines have been cleared.";
			super.gameOver();
			if (!this.isReplay) {
				if (this.score > this.highScore) localStorage.tetris40LineHighScore = this.score;
				if (this.actionTime < this.shortestTime || this.shortestTime == -1) localStorage.tetris40LineShortestTime = this.actionTime;
			}
			stopCurrentMusic();
			if (!this.isSeeking) sfx.complete.play();
		}
	}

	pause(playSound = true) {
		super.pause(playSound);
		stopCurrentMusic();
	}

	resume() {
		super.resume();
		currentSong.resume();
	}

	gameOver() {
		super.gameOver();
		if (!this.isReplay && this.score > this.highScore) localStorage.tetris40LineHighScore = this.score;
		this.gameOverMessage = "The stack got too high.";
		stopCurrentMusic();
		if (!this.isSeeking) sfx.gameOver.play();
	}

	quit() {
		stopCurrentMusic();
		super.quit();
	}

	getModeName() {
		return "40-line";
	}

	getModeNameForDisplay() {
		return "40-line (Sprint)";
	}

	readStateData(state) {
		this.oldState = this.state;
		super.readStateData(state);
	}

	finalizeSeek() {
		super.finalizeSeek();
		if (this.oldState == GameState.over && this.state != GameState.over) currentSong.play();
	}
}

class GameScreenGuideline2Minute extends GameScreenGuidelineBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled);
		this.singleSaveableFields.push("timeLeft");
	}

	init() {
		super.init();
		currentSong = new Music("2Minute_opening", new Music("2Minute_loop"));
		if (!this.isReplay) {
			this.highScore = localStorage.tetris2MinuteHighScore == undefined ? 0 : parseInt(localStorage.tetris2MinuteHighScore);
			this.maxLines = localStorage.tetris2MinuteMaxLines == undefined ? 0 : parseInt(localStorage.tetris2MinuteMaxLines);
		}
		this.timeLeft = 120000;
	}

	start() {
		super.start();
		if (!this.isReplay) currentSong.play();
	}

	processGameLogic(timePassed) {
		if (this.state == GameState.playing) {
			if (this.isReplay) {
				if (!this.isClearing) this.timeLeft -= timePassed;
			} else this.timeLeft += Math.min(0, this.clearTime - timePassed);
			if (this.timeLeft < 1) {
				this.playTime = this.latestTime = this.playTime + timePassed + this.timeLeft;
				this.timeLeft = 0;
				this.gameOverMessage = "2' has passed.";
				super.gameOver();
				if (!this.isReplay) {
					if (this.score > this.highScore) localStorage.tetris2MinuteHighScore = this.score;
					if (this.lines > this.maxLines) localStorage.tetris2MinuteMaxLines = this.lines;
				}
				stopCurrentMusic();
				if (!this.isSeeking) sfx.complete.play();
			}
		}
		super.processGameLogic(timePassed);
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Score", 485, 30);
		ctx.fillText("Lines", 485, 85);
		ctx.fillText("Time left: " + formatDuration(Math.floor(this.timeLeft / 1000)), 485, 139);
		if (!this.isReplay) {
			ctx.fillText("High score", 485, 57);
			ctx.fillText("Max lines", 485, 111);
			ctx.fillText("Tetrimino manipulations", 20, 335);
		}
		
		ctx.textAlign = "right";
		ctx.fillText("" + this.lines, 632, 85);
		ctx.fillText("2'", 632, 139);
		ctx.fillRect(485, 143, 0.001225 * this.timeLeft, 10);
		
		if (!this.isReplay) {
			ctx.fillText("" + this.highScore, 632, 57);
			ctx.fillText("" + this.maxLines, 632, 111);
			ctx.fillRect(485, 34, this.highScore == 0 ? 147 : Math.min(147, 147 * this.score / this.highScore), 10);
			ctx.fillRect(485, 89, this.maxLines == 0 ? 147 : Math.min(147, 147 * this.lines / this.maxLines), 10);
			ctx.fillText("" + this.keypresses, 208, 335);
		}

		ctx.font = "20px Tetreml";
		ctx.fillText("" + this.score, 632, 30);
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);
		switch (this.state) {
			case GameState.playing:
				break;
			case GameState.paused:
				break;
			case GameState.over:
				ctx.font = "12px Tetreml";
				ctx.textAlign = "center";
				ctx.fillText(this.gameOverMessage, 320, 60, 150);
				break;
		}
	}

	pause(playSound = true) {
		super.pause(playSound);
		stopCurrentMusic();
	}

	resume() {
		super.resume();
		currentSong.resume();
	}

	gameOver() {
		super.gameOver();
		this.gameOverMessage = "The stack got too high.";
		stopCurrentMusic();
		if (!this.isSeeking) sfx.gameOver.play();
	}

	quit() {
		stopCurrentMusic();
		super.quit();
	}

	getModeName() {
		return "2-minute";
	}

	getModeNameForDisplay() {
		return "2-minute (Ultra)";
	}
	
	readStateData(state) {
		this.oldState = this.state;
		super.readStateData(state);
	}

	finalizeSeek() {
		super.finalizeSeek();
		if (this.oldState == GameState.over && this.state != GameState.over) currentSong.play();
	}
}