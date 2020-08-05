var editScreenImage = new Image();
editScreenImage.src = "Textures/Sandbox edit screen.png";

var playScreenImage = new Image();
playScreenImage.src = "Textures/Play screen sandbox.png";

var sprite = new Image();
sprite.src = "Textures/Sprite singleplayer.png";

const sfx = {
	single: new SFX("SFX/Single.wav", 4),
	double: new SFX("SFX/Double.wav", 4),
	triple: new SFX("SFX/Triple.wav", 4),
	tetris: new SFX("SFX/Tetris.wav", 4),
	tSpin: new SFX("SFX/T spin.wav", 2),
	move: new SFX("SFX/Move.wav", 8),
	rotate: new SFX("SFX/Rotate.wav", 4),
	softDrop: new SFX("SFX/Soft drop.wav", 8),
	hardDrop: new SFX("SFX/Hard drop.wav", 8),
	lock: new SFX("SFX/Lock.wav", 4),
	land: new SFX("SFX/Land.wav", 4),
	hold: new SFX("SFX/Hold.wav", 3),
	pause: new SFX("SFX/Pause.wav", 4),
	afterClear: new SFX("SFX/After clear.wav", 2),
	softLock: new SFX("SFX/Soft lock.wav", 4)
};

music = new Audio("Music/Sandbox.mp3");
music.loop = true;
music.preload = "auto";
music.load();

const rewardNames = [
	"Single",
	"Double",
	"Triple",
	"Tetris",
	"T-spin",
	"T-spin single",
	"T-spin double",
	"T-spin triple"
];

var configuredControls = undefined;
if ('tetrisSingleplayerControlsMapping' in localStorage) configuredControls = JSON.parse(localStorage.tetrisSingleplayerControlsMapping); else {
	configuredControls = { ...singleplayerControlsMapping };
	localStorage.tetrisSingleplayerControlsMapping = JSON.stringify(configuredControls);
}

var keyMapping = {};
var keyNames = {};
var buttonStatus = {};
for (let key of ["left", "right", "softDrop", "hardDrop", "rotateClockwise", "rotateCounterClockwise", "hold", "reset", "esc", "quitModifier", "volumeDown", "volumeUp"]) {
	keyMapping[configuredControls[key]] = key;
	keyNames[key] = formatKeycode(configuredControls[key]);
	buttonStatus[key] = false;
}

var volume;

function setVolume(newVolume) {
	volume = Math.max(0, Math.min(10, newVolume));
	localStorage.tetrisVolume = volume;
	newVolume = Math.pow(volume / 10, 4);
	music.volume = newVolume;
	for (let effect of Object.values(sfx)) effect.setVolume(newVolume);
}

setVolume(localStorage.tetrisVolume == undefined ? 10 : Number.parseInt(localStorage.tetrisVolume));

const tetriminoMapping = {
	I: new TetriminoI(),
	O: new TetriminoO(),
	T: new TetriminoT(),
	J: new TetriminoJ(),
	L: new TetriminoL(),
	S: new TetriminoS(),
	Z: new TetriminoZ(),
};

document.addEventListener("keydown", (key) => {
	let code = key.code;
	if (!(code in keyMapping)) return;
	buttonStatus[keyMapping[code]] = true;
});

document.addEventListener("keyup", (key) => {
	let code = key.code;
	if (!(code in keyMapping)) return;
	buttonStatus[keyMapping[code]] = false;
});

const fumenStateMapping = ["spawn", "right", "reverse", "left"];

class PlayScreen {
	constructor(parent, board, sequence) {
		this.parent = parent;
		this.fumenPages = [];
		this.currentFumenPage = {};
		this.currentFumenPageDataCart = {};
		this.fumenPagesForCurrent = [];
		this.board = [];
		let col = [];
		this.minos = [];
		for (let i = 0; i < 40; i++) {
			col.push(undefined);
			this.minos.push(0);
		}
		for (let i = 0; i < 10; i++) this.board.push([...col]);
		this.stackMinY = 40;
		for (let y = 40; y > 19; y--) for (let x = 0; x < 10; x++) if (board[x][y]) {
			this.board[x][y] = board[x][y];
			this.minos[y]++;
			this.stackMinY = y;
		}
		let fieldString = "";
		for (let y = this.stackMinY; y < 40; y++) for (let x = 0; x < 10; x++) fieldString += this.board[x][y] ? "X" : "_";
		this.currentFumenPage.field = tetrisFumen.Field.create(fieldString);
		this.currentFumenPageDataCart.flags = { lock: true };

		this.current = null;
		this.queue = [];
		for (let c of sequence) this.queue.push(new (tetriminoTypeMapping[c])());
		this.hold = null;
		this.softDropCounter = -1;
		this.oldSoftDropCounter = -1;
		this.softDropLock = false;
		this.buttonMoveLeft = false;
		this.moveLeftCounter = -1;
		this.oldMoveLeftCounter = -1;
		this.buttonMoveRight = false;
		this.moveRightCounter = -1;
		this.oldMoveRightCounter = -1;
		this.moveLock = 0;
		this.autoRepeatDelay = 150;
		this.autoRepeatPeriod = 40;
		this.softDropPeriod = 25;
		this.clearTime = 0;
		this.oldTime = null;
		this.state = GameState.playing;
		this.buttonSoftDrop = false;
		this.buttonHardDrop = false;
		this.buttonRotateClockwise = false;
		this.buttonRotateCounterClockwise = false;
		this.buttonHold = false;
		this.buttonReset = false;
		this.buttonPause = true;
		this.buttonVolumeDown = false;
		this.buttonVolumeUp = false;
		this.volumeDisplayTime = 0;
		this.rewardName = "";
		this.rewardTime = 0;
		this.holdSwitched = false;
		this.clearedLines = [];
		this.clearEffectTime = 1000;
		this.particles = [];
	}

	init() {
		this.pushToQueue();
		this.nextTetrimino();
		music.currentTime = 0;
		music.play();
	}

	render() {
		// Process game logic.
		let timePassed = 0;
		if (this.oldTime == null) {
			this.oldTime = new Date().getTime();
			return;
		} else {
			let currentTime = new Date().getTime();
			timePassed = currentTime - this.oldTime;
			this.oldTime = currentTime;
		}
		if (this.state == GameState.playing) {
			this.clearTime -= timePassed;
			this.fallTime -= Math.min(0, this.clearTime);
			if (this.clearTime < 1 && this.current == null) {
				if (this.clearedLines.length != 0) sfx.afterClear.play();
				for (let line of this.clearedLines) {
					for (let i = 0; i < 10; i++) {
						this.board[i].splice(line, 1);
						this.board[i] = [undefined].concat(this.board[i]);
					}
					this.minos.splice(line, 1);
					this.minos = [0].concat(this.minos);
				}
				this.nextTetrimino();
			}
			this.clearTime = Math.max(0, this.clearTime);
			if (this.current != null) {
				if (buttonStatus.softDrop) {
					if (!this.softDropLock) {
						if (this.softDropCounter == -1) {
							this.softDrop();
							this.softDropCounter = this.oldSoftDropCounter = 0;
						} else {
							this.softDropCounter += timePassed;
							for (let i = this.oldSoftDropCounter; i < Math.floor((this.softDropCounter - this.autoRepeatDelay) / this.autoRepeatPeriod); i++) if (!this.softDrop()) break;
							this.oldSoftDropCounter = Math.max(0, Math.floor((this.softDropCounter - this.autoRepeatDelay) / this.autoRepeatPeriod));
						}
					}
				} else {
					this.softDropLock = false;
					this.softDropCounter = -1;
				}
				if (buttonStatus.hardDrop) {
					if (!this.buttonHardDrop) {
						if (buttonStatus.quitModifier) {
							let page = {
								operation: {
									type: this.current.code,
									rotation: fumenStateMapping[this.current.state],
									x: this.current.x + this.current.fumenOffsetX[this.current.state],
									y: 39 - this.current.y + this.current.fumenOffsetY[this.current.state]
								},
								flags: {
									lock: false
								}
							};
							if (this.hold != null) page.comment = `#Q=[${this.hold.code}](${this.current.code})`;
							this.fumenPagesForCurrent.push(page);
						} else {
							let fell = false;
							while (this.current.canFall(this.board)) {
								if (Math.random() < 0.25) this.spawnParticle();
								this.current.y++;
								fell = true;
							}
							(fell ? sfx.hardDrop : sfx.softLock).play();
							for (let i = 0; i < 3; i++) this.spawnParticle();
							this.lock(2);
						}
						this.buttonHardDrop = true;
					}
				} else this.buttonHardDrop = false;
				if (buttonStatus.rotateClockwise) {
					if (!this.buttonRotateClockwise) {
						if (this.current.rotateClockwise(this.board)) {
							sfx.rotate.play();
							if (this.moveCounter++ < 15) this.lockTime = 0;
						}
						this.buttonRotateClockwise = true;
					}
				} else this.buttonRotateClockwise = false;
				if (buttonStatus.rotateCounterClockwise) {
					if (!this.buttonRotateCounterClockwise) {
						if (this.current.rotateCounterClockwise(this.board)) {
							sfx.rotate.play();
							if (this.moveCounter++ < 15) this.lockTime = 0;
						}
						this.buttonRotateCounterClockwise = true;
					}
				} else this.buttonRotateCounterClockwise = false;
				if (buttonStatus.hold) {
					if (!this.buttonHold && !this.holdSwitched) {
						this.current.x = 4;
						this.current.y = 19;
						this.currentFumenPageDataCart.operation = {
							type: this.current.code,
							rotation: fumenStateMapping[this.current.state],
							x: this.current.x + this.current.fumenOffsetX[this.current.state],
							y: (this.current.canFall(this.board) ? 19 : 20) + this.current.fumenOffsetY[this.current.state]
						};
						this.currentFumenPageDataCart.flags.lock = false;
						this.applyFumenPageDataCart(this.currentFumenPageDataCart);
						this.pushFumenPage();
						this.prepareFumenPageDataCart();
						this.fumenPagesForCurrent = [];
						this.oldHold = this.hold;
						this.hold = this.current;
						if (this.oldHold == null) this.nextTetrimino(); else {
							this.current = this.oldHold;
							this.current.state = 0;
							this.moveCounter = 0;
							this.checkGameOver();
						}
						sfx.hold.play();
						this.holdSwitched = true;
					}
				} else this.buttonHold = false;
				if (buttonStatus.reset) {
					if (!this.buttonReset) {
						this.current.state = 0;
						this.current.x = 4;
						this.current.y = 19;
						this.fumenPagesForCurrent = [];
						this.checkGameOver();
						sfx.hold.play();
						this.buttonReset = true;
					}
				} else this.buttonReset = false;
			}

			if (buttonStatus.left) {
				if (!this.buttonMoveLeft || this.moveLock != 2) {
					if (this.moveLeftCounter == -1) {
						this.move(-1);
						this.moveLeftCounter = this.oldMoveLeftCounter = 0;
						this.moveLock = 1;
					} else {
						this.moveLeftCounter += timePassed;
						for (let i = this.oldMoveLeftCounter; i <= Math.floor((this.moveLeftCounter - this.autoRepeatDelay) / this.autoRepeatPeriod); i++) if (!this.move(-1)) break;
						this.oldMoveLeftCounter = Math.max(0, Math.floor((this.moveLeftCounter - this.autoRepeatDelay) / this.autoRepeatPeriod));
					}
					this.buttonMoveLeft = true;
				} else this.moveLeftCounter = -1;
			} else {
				this.moveLeftCounter = -1;
				this.moveLock = 0;
				this.buttonMoveLeft = true;
			}

			if (buttonStatus.right) {
				if (!this.buttonMoveRight || this.moveLock != 1) {
					if (this.moveRightCounter == -1) {
						this.move(1);
						this.moveRightCounter = this.oldMoveRightCounter = 0;
						this.moveLock = 2;
					} else {
						this.moveRightCounter += timePassed;
						for (let i = this.oldMoveRightCounter; i <= Math.floor((this.moveRightCounter - this.autoRepeatDelay) / this.autoRepeatPeriod); i++) if (!this.move(1)) break;
						this.oldMoveRightCounter = Math.max(0, Math.floor((this.moveRightCounter - this.autoRepeatDelay) / this.autoRepeatPeriod));
					}
					this.buttonMoveRight = true;
				} else this.moveRightCounter = -1;
			} else {
				this.moveRightCounter = -1;
				this.moveLock = 0;
				this.buttonMoveRight = true;
			}
		}

		if (buttonStatus.esc) {
			if (buttonStatus.quitModifier) {
				prompt("Fumen URL:", "https://harddrop.com/fumen?" + tetrisFumen.encoder.encode(this.fumenPages));
				buttonStatus.quitModifier = false;
			} else {
				music.pause();
				goBack();
			}
			buttonStatus.esc = false;
		}

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

		// Actually render things on the screen.

		ctx.globalAlpha = 1;
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(playScreenImage, 0, 0);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Segoe UI";
		ctx.textAlign = "left";
		ctx.fillText(keyNames.left, 15, 120, 60);
		ctx.fillText(keyNames.right, 15, 135, 60);
		ctx.fillText(keyNames.softDrop, 15, 150, 60);
		ctx.fillText(keyNames.hardDrop, 15, 165, 60);
		ctx.fillText(keyNames.rotateCounterClockwise, 15, 180, 60);
		ctx.fillText(keyNames.rotateClockwise, 15, 195, 60);
		ctx.fillText(keyNames.hold, 15, 210, 60);
		ctx.fillText(keyNames.reset, 15, 235, 60);
		ctx.fillText(keyNames.esc, 15, 265, 60);
		ctx.fillText(keyNames.quitModifier + "+" + keyNames.hardDrop, 15, 280, 60);
		ctx.fillText(keyNames.quitModifier + "+" + keyNames.esc, 15, 295, 60);
		ctx.fillText(keyNames.volumeUp, 15, 310, 60);
		ctx.fillText(keyNames.volumeDown, 15, 325, 60);
		
		ctx.fillText("Move left", 80, 120, 155);
		ctx.fillText("Move right", 80, 135, 155);
		ctx.fillText("Soft drop", 80, 150, 155);
		ctx.fillText("Hard drop", 80, 165, 155);
		ctx.fillText("Rotate counterclockwise", 80, 180, 155);
		ctx.fillText("Rotate clockwise", 80, 195, 155);
		ctx.fillText("Hold", 80, 210, 155);
		ctx.fillText("Reset current tetrimino", 80, 235, 155);
		ctx.fillText("Return to edit screen", 80, 265, 155);
		ctx.fillText("Add intermediate Fumen frame", 80, 280, 155);
		ctx.fillText("Get Fumen URL", 80, 295, 155);
		ctx.fillText("Increase volume", 80, 310, 155);
		ctx.fillText("Decrease volume", 80, 325, 155);

		if (this.volumeDisplayTime > 0) {
			ctx.fillText(`Volume: ${volume} / 10`, 15, 350);
			this.volumeDisplayTime -= timePassed;
		}

		ctx.fillText("Intermediate Fumen frames", 485, 20);
		ctx.textAlign = "right";
		ctx.fillText("" + this.fumenPagesForCurrent.length, 635, 40);

		ctx.textAlign = "left";

		ctx.font = "20px Segoe UI";
		if (this.rewardTime != 0) {
			this.rewardTime = Math.max(0, this.rewardTime - timePassed);
			ctx.fillText(this.rewardName, 406, 348);
		}
		ctx.imageSmoothingEnabled = false;

		if (this.stackMinY < 24) {
			ctx.fillStyle = "#F00";
			ctx.globalAlpha = 0.4;
			ctx.fillRect(240, 35, 160, 2);
			if (this.state != GameState.over) {
				ctx.globalAlpha = 0.6;
				for (let mino of this.queue[0].states[0]) ctx.drawImage(sprite, 192, 0, 16, 16, 240 + 16 * (4 + mino[0]), 4 + 16 * (1 + mino[1]), 16, 16);
			}
		}

		ctx.globalAlpha = 0.7;
		for (let x = 0; x < 10; x++) {
			for (let y = 18; y < 40; y++) {
				if (this.board[x][y] != undefined) this.renderMino(x, y, this.board[x][y].directions, this.board[x][y].textureY);
			}
		}
		ctx.globalAlpha = 1;
		if (this.current != null && this.state != GameState.over) for (let ghostY = this.current.y; true; ghostY++) {
			if (this.current.checkCollision(this.board, null, ghostY)) {
				ctx.fillStyle = this.current.outlineColor;
				let tetriminoX = 240 + this.current.x * 16;
				let tetriminoY = -12 + 16 * (ghostY - 18);
				for (let mino of this.current.states[this.current.state]) {
					let minoX = tetriminoX + mino[0] * 16;
					let minoY = tetriminoY + mino[1] * 16;
					if (minoY < 4) continue;
					if (!(mino[2] & 1)) ctx.fillRect(minoX, minoY+14, 16, 2);
					if (!(mino[2] & 2)) ctx.fillRect(minoX, minoY, 2, 16);
					if (!(mino[2] & 4)) ctx.fillRect(minoX, minoY, 16, 2);
					if (!(mino[2] & 8)) ctx.fillRect(minoX + 14, minoY, 2, 16);
					if ((mino[2] & 1) && (mino[2] & 2)) ctx.fillRect(minoX, minoY + 14, 2, 2);
					if ((mino[2] & 2) && (mino[2] & 4)) ctx.fillRect(minoX, minoY, 2, 2);
					if ((mino[2] & 4) && (mino[2] & 8)) ctx.fillRect(minoX + 14, minoY, 2, 2);
					if ((mino[2] & 8) && (mino[2] & 1)) ctx.fillRect(minoX + 14, minoY + 14, 2, 2);
				}
				break;
			}
		}
		if (this.current != null && this.state != GameState.over) {
			this.current.render(this);
		}
		if (this.hold != null) this.renderTetrimino(this.hold, 182, 54, this.holdSwitched);
		for (let i = 0; i < 3; i++) this.renderTetrimino(this.queue[i], 424, 48 + 48 * i);

		ctx.imageSmoothingEnabled = true;

		let newParticles = [];
		for (let particle of this.particles) {
			let ratio = particle.time / particle.lifetime;
			ctx.drawImage(sprite, 208, 0, 9, 9, particle.x + 4.5 * ratio, particle.y - particle.distance * (1-Math.pow((1-ratio), 4)) - 4.5 * ratio, 9 * (1-ratio), 9 * (1-ratio));
			if ((particle.time += timePassed) < particle.lifetime) newParticles.push(particle);
		}
		this.particles = newParticles;

		if (this.clearEffectTime < 151) {
			let ratio = this.clearEffectTime / 150;
			ctx.fillStyle = "rgb(255, 255, " + (255 * (1-ratio)) + ")";
			for (let line of this.clearedLines) ctx.fillRect(240 - 32 * ratio, 4 + 16 * (line - 18) + 8 * ratio, 160 + 64 * ratio, 16 * (1 - ratio));
			this.clearEffectTime += timePassed;
		}
		ctx.fillStyle = "#FFF";

		switch (this.state) {
			case GameState.playing:
				break;
			case GameState.paused:
				ctx.textAlign = "center";
				ctx.font = "20px Segoe UI";
				ctx.fillText("PAUSED", 512, 230);
				break;
			case GameState.over:
				ctx.textAlign = "center";
				ctx.font = "20px Segoe UI";
				ctx.fillText("OVER", 512, 230);
				break;
		}
	}

	pushFumenPage() {
		if (this.hold != null) this.currentFumenPage.comment = `#Q=[${this.hold.code}](${this.current.code})`;
		this.fumenPages.push(this.currentFumenPage);
		this.currentFumenPage = {};
	}

	applyFumenPageDataCart(dataCart) {
		this.currentFumenPage.operation = dataCart.operation;
		this.currentFumenPage.flags = dataCart.flags;
	}

	prepareFumenPageDataCart() {		
		this.currentFumenPageDataCart = {};
		this.currentFumenPageDataCart.flags = { lock: true };
	}

	close() {
		
	}

	renderMino(x, y, directions, textureY) {
		if (y < 18 || y > 39) return;
		ctx.drawImage(sprite, 8 * directions, textureY, 8, 8, 240 + x * 16, 4 + 16*(y-18), 16, 16);
	}

	renderTetrimino(tetrimino, x, y, gray = false) {
		if (!(tetrimino instanceof TetriminoI) && !(tetrimino instanceof TetriminoO)) x += 8;
		if (tetrimino instanceof TetriminoI) y -= 8;
		for (let mino of tetrimino.states[0]) {
			ctx.drawImage(sprite, 8 * mino[2], gray ? 0 : tetrimino.textureY, 8, 8, x + 16 * mino[0], y + 16 * mino[1], 16, 16);
		}
	}

	move(offset) {
		if (this.state != GameState.playing || this.current == null) return;
		let newX = this.current.x + offset;
		if (!this.current.checkCollision(this.board, newX, this.current.y)) {
			this.current.x = newX;
			if (this.moveCounter++ < 15) this.lockTime = 0;
			sfx.move.play();
			if (this.current.checkCollision(this.board, newX + offset, this.current.y)) sfx.land.play();
			return true;
		}
		return false;
	}

	spawnParticle() {
		let current = this.current;
		this.particles.push({
			x: 240 + 16 * (current.x + current.leftX[current.state] - 0.5 + (current.width[current.state] + 1) * Math.random()),
			y: 4 + 16 * (current.y + current.topY[current.state] - 19),
			distance: 16 * (0.5 + 1.5 * Math.random()),
			lifetime: 250 + 500 * Math.random(),
			time: 0
		});
	}

	softDrop() {
		if (this.current.canFall(this.board)) {
			if (++this.current.y > this.maxY) {
				this.lockTime = 0;
				this.moveCounter = 0;
				this.maxY = this.current.y;
			}
			sfx.softDrop.play();
			this.fallTime = 0;
			if (!this.current.canFall(this.board)) sfx.land.play();
			return false;
		}
		return true;
	}

	lock(scoreMultiplier) {
		for (let dataCart of this.fumenPagesForCurrent) {
			this.applyFumenPageDataCart(dataCart);
			this.pushFumenPage();
		}
		this.currentFumenPageDataCart.operation = {
			type: this.current.code,
			rotation: fumenStateMapping[this.current.state],
			x: this.current.x + this.current.fumenOffsetX[this.current.state],
			y: 39-this.current.y + this.current.fumenOffsetY[this.current.state]
		};
		this.applyFumenPageDataCart(this.currentFumenPageDataCart);
		this.pushFumenPage();
		this.prepareFumenPageDataCart();
		this.fumenPagesForCurrent = [];
		let toClear = [];
		let isTSpin = this.current instanceof TetriminoT && this.current.isImmobile(this.board);
		for (let mino of this.current.getLockPositions()) {
			this.board[mino[0]][mino[1]] = new Mino(mino[2], this.current.textureY);
			if (++this.minos[mino[1]] == 10) toClear.push(mino[1]);
		}
		let baseline = this.current.y + this.current.baseY[this.current.state];
		if (baseline < 20) {
			this.gameOver();
			return;
		}
		this.stackMinY = Math.min(this.current.y + this.current.topY[this.current.state], this.stackMinY);
		if (isTSpin) {
			this.addReward(4 + toClear.length);
			sfx.tSpin.play();
			if (toClear.length != 0) {
				this.clearLines(toClear);
			} else {
				this.nextTetrimino();
			}
		} else if (toClear.length != 0) {
			this.addReward(toClear.length - 1);
			this.clearLines(toClear)
		} else {
			this.nextTetrimino();
		}
	}

	clearLines(toClear) {
		this.clearedLines = toClear.sort((a, b) => a - b);
		this.stackMinY += this.clearedLines.length;
		this.clearEffectTime = 0;
		this.clearTime = 500;
		for (let line of this.clearedLines) {
			for (let i = 0; i < 10; i++) {
				if (line != 0 && this.board[i][line - 1] != undefined) this.board[i][line - 1].directions &= 0b1110;
				if (line != 39 && this.board[i][line + 1] != undefined) this.board[i][line + 1].directions &= 0b1011;
				this.board[i][line] = undefined;
			}
		}
		this.lines += toClear.length;
		switch (toClear.length) {
			case 1: sfx.single.play(); break;
			case 2: sfx.double.play(); break;
			case 3: sfx.triple.play(); break;
			case 4: sfx.tetris.play(); break;
		}
		this.current = null;
	}

	addReward(reward) {
		this.rewardName = rewardNames[reward];
		this.rewardTime = 1500;
	}

	pushToQueue() {
		let bag = [new TetriminoI(), new TetriminoJ(), new TetriminoL(), new TetriminoO(), new TetriminoS(), new TetriminoZ(), new TetriminoT()];
		for (let i = 0; i < 7; i++) {
			this.queue.push(bag.splice(Math.floor(Math.random() * (bag.length - 0.00001)), 1)[0]);
		}
	}

	nextTetrimino() {
		this.current = this.queue.splice(0, 1)[0];
		if (this.queue.length < 6) this.pushToQueue();
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
	}

	gameOver() {
		this.state = GameState.over;
		music.pause();
	}
}

var board = [];
var col = [];
for (let i = 0; i < 40; i++) col.push(undefined);
for (let i = 0; i < 10; i++) board.push([...col]);
delete col;

var sequence = "";

class EditScreen {
	constructor(parent) {
		this.parent = parent;
		this.button = 0;
		this.shiftLeft = this.shiftRight = this.shift = false;
		this.ctrlLeft = this.ctrlRight = this.ctrl = false;
		this.altLeft = this.altRight = this.alt = false;
	}

	init() {
		mainWindow.addEventListener("mousedown", this.mouseDownListener = (event) => { this.onMouseDown(event); });
		mainWindow.addEventListener("mousemove", this.mouseMoveListener = (event) => { this.onMouseMove(event); });
		mainWindow.addEventListener("contextmenu", this.contextMenuListener = (event) => {
			if (this.ctrl && this.shift)
				this.ctrl = this.shift = this.alt = this.shiftLeft = this.shiftRight = this.ctrlLeft = this.ctrlRight = this.altLeft = this.altRight = false;
			else event.preventDefault();
		});
		document.addEventListener("mouseup", this.mouseUpListener = (event) => { this.onMouseUp(event); });
		document.addEventListener("keydown", this.keyDownListener = (event) => { this.onKeyDown(event); });
		document.addEventListener("keyup", this.keyUpListener = (event) => { this.onKeyUp(event); });
	}

	getCell(event) {
		let x = event.offsetX;
		let y = event.offsetY;
		if (x < 22 || x > 181 || y < 4 || y > 355) return null;
		return { x: Math.floor((x - 22) / 16), y: Math.floor((y - 4) / 16) + 18 };
	}

	processAction(cell) {
		if (cell == null) return;
		switch (this.button) {
			case 1: // Left
				switch (this.modifier) {
					case 0: // Set cell
						if (this.performed[cell.y*10+cell.x]) return;
						board[cell.x][cell.y] = new Mino(0, 0);
						this.performed[cell.y*10+cell.x] = true;
						break;
					case 1: // Set row
						if (this.performed[cell.y]) return;
						for (let x = 0; x < 10; x++) board[x][cell.y] = new Mino(0, 0);
						this.performed[cell.y] = true;
						break;
					case 2: // Insert row
						if (this.performed === 1) return;
						for (let x = 0; x < 10; x++) {
							let col = board[x];
							board[x] = [...col.slice(1, cell.y+1), undefined, ...col.slice(cell.y+1, 40)];
						}
						this.performed = 1;
						break;
					case 3: // Invert cell
						if (this.performed[cell.y*10+cell.x]) return;
						if (board[cell.x][cell.y]) board[cell.x][cell.y] = undefined; else board[cell.x][cell.y] = new Mino(0, 0);
						this.performed[cell.y*10+cell.x] = true;
						break;
				}
				break;
			case 2: // Right
				switch (this.modifier) {
					case 0: // Unset cell
						if (this.performed[cell.y*10+cell.x]) return;
						board[cell.x][cell.y] = undefined;
						this.performed[cell.y*10+cell.x] = true;
						break;
					case 1: // Unset row
						if (this.performed[cell.y]) return;
						for (let x = 0; x < 10; x++) board[x][cell.y] = undefined;
						this.performed[cell.y] = true;
						break;
					case 2: // Delete row
						if (this.performed === 1) return;
						for (let x = 0; x < 10; x++) {
							let col = board[x];
							board[x] = [undefined, ...col.slice(0, cell.y), ...col.slice(cell.y + 1, 40)];
						}
						this.performed = 1;
						break;
					case 3: // Invert row
						if (this.performed[cell.y]) return;
						for (let x = 0; x < 10; x++)
							if (board[x][cell.y]) board[x][cell.y] = undefined; else board[x][cell.y] = new Mino(0, 0);
						this.performed[cell.y] = true;
						break;
				}
				break;
		}
	}

	onMouseDown(event) {
		if (this.button || (event.button != 0 && event.button != 2)) return;
		let cell = this.getCell(event);
		if (cell == null) return;
		this.button = event.button ? 2 : 1;
		this.modifier = this.shift ? 1 : this.ctrl ? 2 : this.alt ? 3 : 0;
		this.performed = {};
		this.processAction(cell);
	}

	onMouseMove(event) {
		if (!this.button) return;
		this.processAction(this.getCell(event));
	}

	onMouseUp(event) {
		if (!this.button) return;
		this.button = 0;
	}

	updateModifierKey(code, down) {
		switch (code) {
			case "ShiftLeft": this.shiftLeft = down; break;
			case "ShiftRight": this.shiftRight = down; break;
			case "ControlLeft": this.ctrlLeft = down; break;
			case "ControlRight": this.ctrlRight = down; break;
			case "AltLeft": this.altLeft = down; break;
			case "AltRight": this.altRight = down; break;
		}
		this.shift = this.shiftLeft || this.shiftRight;
		this.ctrl = this.ctrlLeft || this.ctrlRight;
		this.alt = this.altLeft || this.altRight;
	}

	onKeyDown(event) {
		switch (event.code) {
			case "KeyS":
				buttonStatus.softDrop = false;
				let res = prompt("Set the current tetrimino sequence (space to clear)", sequence);
				if (!res) break;
				sequence = "";
				for (let c of res.toUpperCase()) if (tetriminoMapping[c]) sequence += c;
				break;
			case "Enter":
				openGui(new PlayScreen(this, board, sequence));
				break;
		}
		this.updateModifierKey(event.code, true);
	}

	onKeyUp(event) {
		this.updateModifierKey(event.code, false);
	}

	render() {
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(editScreenImage, 0, 0);
		ctx.imageSmoothingEnabled = false;
		// Render the current board.
		for (let x = 0; x < 10; x++) for (let y = 18; y < 40; y++)
			if (board[x][y]) ctx.drawImage(sprite, 0, 0, 8, 8, 22 + 16 * x, -284 + 16 * y, 16, 16);
		// Render the tetrimino sequence.
		let xPos = 0;
		let yPos = 0;
		for (let c of sequence) {
			let width = c == 'I' ? 32 : 24;
			if (xPos + width > 414) {
				yPos++;
				if (yPos > 6) return;
				xPos = 0;
			}
			let tetrimino = tetriminoMapping[c];
			if (c == 'O') xPos -= 8;
			for (let mino of tetrimino.states[0])
				ctx.drawImage(sprite, mino[2] * 8, tetrimino.textureY, 8, 8, 213 + xPos + 8 * mino[0], 200 + yPos * 24 + 8 * mino[1], 8, 8);
			xPos += width + 4;
		}
	}

	close() {
		mainWindow.removeEventListener("mousedown", this.mouseDownListener);
		mainWindow.removeEventListener("mousemove", this.mouseMoveListener);
		mainWindow.removeEventListener("contextmenu", this.contextMenuListener);
		document.removeEventListener("mouseup", this.mouseUpListener);
		document.removeEventListener("keydown", this.keyDownListener);
		document.removeEventListener("keyup", this.keyUpListener);
	}
}

var currentGui = null;

function openGui(gui) {
	if (currentGui != null) currentGui.close();
	currentGui = gui;
	if (currentGui != null) currentGui.init();
}

function goBack() {
	if (currentGui == null) return;
	openGui(currentGui.parent == undefined ? null : currentGui.parent);
}

var mainWindow = document.getElementById("mainWindow");

var ctx = mainWindow.getContext("2d");

openGui(new EditScreen(null));

function render() {
	requestAnimationFrame(render);
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, 640, 360);
	if (currentGui == null) return;
	currentGui.render();
}

requestAnimationFrame(render);