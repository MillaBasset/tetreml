var editScreenImage = new Image();
editScreenImage.src = "Textures/Sandbox edit screen.png";

var playScreenImage = new Image();
playScreenImage.src = "Textures/Play screen singleplayer.png";

var sprite = new Image();
sprite.src = "Textures/Sprite singleplayer.png";

var outlineSprite = new Image();
outlineSprite.src = "Textures/Outline sprite singleplayer.png";

var gifBackground = new Image();
gifBackground.src = "Textures/GIF background.png";

var imageRenderer = document.getElementById('imageRenderer');
var imageRendererContext = imageRenderer.getContext('2d');
imageRendererContext.imageSmoothingEnabled = false;

function openRenderedImage() {
	window.open().document.write(`<iframe src="${imageRenderer.toDataURL()}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
}

const sfx = {
	single: new SFX("single", gainNode),
	double: new SFX("double", gainNode),
	triple: new SFX("triple", gainNode),
	tetris: new SFX("tetris", gainNode),
	tSpinZero: new SFX("tSpinZero", gainNode),
	tSpin: new SFX("tSpin", gainNode),
	move: new SFX("move", gainNode),
	moveOnGround: new SFX("moveOnGround", gainNode),
	rotate: new SFX("rotate", gainNode),
	rotateOnGround: new SFX("rotateOnGround", gainNode),
	softDrop: new SFX("softDrop", gainNode),
	hardDrop: new SFX("hardDrop", gainNode),
	lock: new SFX("lock", gainNode),
	land: new SFX("land", gainNode),
	hold: new SFX("hold", gainNode),
	pause: new SFX("pause", gainNode),
	afterClear: new SFX("afterClear", gainNode),
	softLock: new SFX("softLock", gainNode)
};

loadSoundEffectConfig(() => {
	for (let s of Object.values(sfx)) s.load();
});

music = new Music("sandbox_opening", new Music("sandbox_loop", undefined, false), false);

loadMusicConfig(() => {
	music.load();
});

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
	gainNode.gain.value = newVolume;
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
	constructor(parent, board, sequence, hold, maxTetriminoes, fallPeriod, lockDelay) {
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
			this.board[x][y] = board[x][y].clone();
			this.minos[y]++;
			this.stackMinY = y;
		}
		for (let x = 0; x < 10; x++) if (this.board[x][20]) this.board[x][20].directions &= 0b1011;
		this.hold = [null, new TetriminoI(), new TetriminoJ(), new TetriminoL(), new TetriminoO(), new TetriminoS(), new TetriminoT(), new TetriminoZ(), -1][hold];
		this.maxTetriminoes = this.tetriminoesLeft = maxTetriminoes;
		this.fallPeriod = fallPeriod;
		this.lockDelay = lockDelay;
		let fieldString = "";
		let fumenColorMapping = ["X", "I", "J", "L", "O", "S", "T", "Z"];
		for (let y = this.stackMinY; y < 40; y++) for (let x = 0; x < 10; x++) fieldString += this.board[x][y] ? fumenColorMapping[this.board[x][y].textureY] : "_";
		this.currentFumenPage.field = tetrisFumen.Field.create(fieldString);
		this.currentFumenPageDataCart.flags = { lock: true };

		this.current = null;

		/* Used to generate GIF images. Structure of each frame:
		   – Board state.
		   – Current tetrimino: type, rotation state and position.
		*/
		this.gifFrames = [];
		this.pushGIFFrame();
		this.gifIsRendering = false;

		this.queue = [];
		for (let c of sequence) this.queue.push(new (tetriminoTypeMapping[c])());
		this.softDropCounter = -1;
		this.oldSoftDropCounter = -1;
		this.softDropLock = false;
		this.moveCounter = 0;
		this.buttonMoveLeft = false;
		this.moveLeftCounter = -1;
		this.oldMoveLeftCounter = -1;
		this.buttonMoveRight = false;
		this.moveRightCounter = -1;
		this.oldMoveRightCounter = -1;
		this.moveLock = 0;
		this.moveDisabledLeft = this.moveDisabledRight = false;
		this.autoRepeatDelay = localStorage.tetrisAutoRepeatDelay == null ? 150 : Number.parseInt(localStorage.tetrisAutoRepeatDelay);
		this.autoRepeatPeriod = localStorage.tetrisAutoRepeatPeriod == null ? 40 : Number.parseInt(localStorage.tetrisAutoRepeatPeriod);
		this.softDropPeriod = localStorage.tetrisSoftDropPeriod == null ? 25 : Number.parseInt(localStorage.tetrisSoftDropPeriod);
		this.clearTime = 0;
		this.fallTime = 0;
		this.lockTime = 0;
		this.maxY = 0;
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
		for (let key in buttonStatus) buttonStatus[key] = false;
		this.pushToQueue();
		this.nextTetrimino();
		this.processInstaFall();
		currentSong = music;
		currentSong.play();
	}

	isMinoVisible(x, y) {
		return x > -1 && x < 10 && y > -1 && y < 40 && this.board[x][y] != undefined;
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
			if (this.current != null) if (this.fallPeriod != -1) {
				if (this.current.canFall(this.board)) {
					let fell = false;
					while (this.current.canFall(this.board) && this.fallTime >= this.fallPeriod) {
						if (++this.current.y > this.maxY) {
							this.lockTime = 0;
							this.moveCounter = 0;
							this.maxY = this.current.y;
						}
						fell = true;
						this.fallTime -= this.fallPeriod;
					}
					if (!this.current.canFall(this.board)) sfx.land.play();
					if (fell) {
						this.current.onMove();
						this.lockTime = this.fallTime;
					}
				} else {
					if (this.lockDelay != 0 && (this.lockTime += timePassed) >= this.lockDelay) {
						this.lock(false);
						sfx.lock.play();
					}
				}
				this.fallTime = this.fallPeriod == 0 ? 0 : this.fallTime % this.fallPeriod;
			}
			if (buttonStatus.softDrop) {
				if (!this.softDropLock) {
					if (this.softDropCounter == -1) {
						if (this.current != null && buttonStatus.quitModifier) {
							let fell = false;
							while (this.current.canFall(this.board)) {
								this.current.y++;
								fell = true;
							}
							if (fell) {
								sfx.softDrop.play();
								sfx.land.play();
							}
						} else {
							if (this.current != null) this.softDrop();
							this.softDropCounter = this.oldSoftDropCounter = 0;
						}
					} else {
						if (this.fallPeriod != -1) {
							this.softDropCounter += timePassed;
							if (this.current != null) for (let i = 0; i < Math.floor(this.softDropCounter / this.softDropPeriod); i++) if (this.softDrop()) break;
							this.softDropCounter %= this.softDropPeriod;
						} else {
							this.softDropCounter += timePassed;
							if (this.current != null) for (let i = this.oldSoftDropCounter; i < Math.floor((this.softDropCounter - this.autoRepeatDelay) / this.autoRepeatPeriod); i++) if (this.softDrop()) break;
							this.oldSoftDropCounter = Math.max(0, Math.floor((this.softDropCounter - this.autoRepeatDelay) / this.autoRepeatPeriod));
						}
					}
				}
			} else {
				this.softDropLock = false;
				this.softDropCounter = -1;
			}
			if (buttonStatus.hardDrop) {
				if (this.current != null && !this.buttonHardDrop) {
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
						this.pushGIFFrame();
					} else {
						let fell = false;
						while (this.current.canFall(this.board)) {
							if (Math.random() < 0.25) this.spawnParticle();
							this.current.y++;
							fell = true;
						}
						if (fell) this.current.onMove();
						(fell ? sfx.hardDrop : sfx.softLock).play();
						for (let i = 0; i < 3; i++) this.spawnParticle();
						this.lock(2);
						this.processInstaFall();
					}
					this.buttonHardDrop = true;
				}
			} else this.buttonHardDrop = false;
			if (buttonStatus.rotateClockwise) {
				if (!this.buttonRotateClockwise) {
					if (buttonStatus.quitModifier) {
						this.getFumenURL();
						this.buttonRotateClockwise = true;
					} else if (this.current != null) {
						let inAir = this.current.canFall(this.board);
						if (this.current.rotateClockwise(this.board)) {
							this.processInstaFall();
							(inAir ? sfx.rotate : sfx.rotateOnGround).play();
							if (this.moveCounter++ < 15) this.lockTime = 0;
						}
						this.buttonRotateClockwise = true;
					}
				}
			} else this.buttonRotateClockwise = false;
			if (buttonStatus.rotateCounterClockwise) {
				if (!this.buttonRotateCounterClockwise) {
					if (buttonStatus.quitModifier) {
						this.renderImage();
						this.buttonRotateCounterClockwise = true;
					} else if (this.current != null) {
						let inAir = this.current.canFall(this.board);
						if (this.current.rotateCounterClockwise(this.board)) {
							this.processInstaFall();
							(inAir ? sfx.rotate : sfx.rotateOnGround).play();
							if (this.moveCounter++ < 15) this.lockTime = 0;
						}
						this.buttonRotateCounterClockwise = true;
					}
				}
			} else this.buttonRotateCounterClockwise = false;
			if (buttonStatus.hold) {
				if (!this.buttonHold) {
					if (buttonStatus.quitModifier) {
						this.pause(false);
						this.parent.openGameScreen();
						this.buttonHold = true;
					} else if (this.current != null && this.hold != -1 && !this.holdSwitched) {
						this.current.reset();
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
							this.fallTime = 0;
							this.lockTime = 0;
							this.moveCounter = 0;
							this.checkGameOver();
						}
						this.processInstaFall();
						sfx.hold.play();
						this.holdSwitched = true;
						this.buttonHold = true;
					}
				}
			} else this.buttonHold = false;
			if (buttonStatus.reset) {
				if (this.current != null && !this.buttonReset) {
					this.current.reset();
					this.fumenPagesForCurrent = [];
					this.checkGameOver();
					sfx.hold.play();
					this.buttonReset = true;
				}
			} else this.buttonReset = false;

			if (buttonStatus.left) {
				if (!this.moveDisabledLeft && (!this.buttonMoveLeft || this.moveLock != 2)) {
					if (this.moveLeftCounter == -1) {
						this.move(-1);
						this.moveLeftCounter = this.oldMoveLeftCounter = 0;
						this.moveLock = 1;
					} else {
						this.moveLeftCounter += timePassed;
						let newCounter = DASDiv(this.moveLeftCounter - this.autoRepeatDelay, this.autoRepeatPeriod);
						for (let i = this.oldMoveLeftCounter; i < newCounter; i++) if (!this.move(-1)) break;
						this.oldMoveLeftCounter = newCounter == Infinity ? 0 : newCounter;
					}
					this.buttonMoveLeft = true;
				} else this.moveLeftCounter = -1;
			} else {
				this.moveLeftCounter = -1;
				this.moveLock = 0;
				this.buttonMoveLeft = false;
				this.moveDisabledLeft = false;
			}

			if (buttonStatus.right) {
				let handleMove = true;
				if (!this.buttonMoveRight && this.quitModifier) {
					this.generateGIF();
					this.handleMove = false;
					this.buttonMoveRight = true;
				}
				if (handleMove && !this.moveDisabledRight && (!this.buttonMoveRight || this.moveLock != 1)) {
					if (this.moveRightCounter == -1) {
						this.move(1);
						this.moveRightCounter = this.oldMoveRightCounter = 0;
						this.moveLock = 2;
					} else {
						this.moveRightCounter += timePassed;
						let newCounter = DASDiv(this.moveRightCounter - this.autoRepeatDelay, this.autoRepeatPeriod);
						for (let i = this.oldMoveRightCounter; i < newCounter; i++) if (!this.move(1)) break;
						this.oldMoveRightCounter = newCounter == Infinity ? 0 : newCounter;
					}
					this.buttonMoveRight = true;
				} else this.moveRightCounter = -1;
			} else {
				this.moveRightCounter = -1;
				this.moveLock = 0;
				this.buttonMoveRight = false;
				this.moveDisabledRight = false;
			}
		} else {
			if (buttonStatus.right) {
				if (!this.buttonMoveRight) {
					if (buttonStatus.quitModifier) {
						this.generateGIF();
					}
					this.buttonMoveRight = true;
				}
			} else this.buttonMoveRight = false;
			if (buttonStatus.rotateClockwise) {
				if (!this.buttonRotateClockwise) {
					if (buttonStatus.quitModifier) {
						this.getFumenURL();
					}
					this.buttonRotateClockwise = true;
				}
			} else this.buttonRotateClockwise = false;
			if (buttonStatus.rotateCounterClockwise) {
				if (!this.buttonRotateCounterClockwise) {
					if (buttonStatus.quitModifier) {
						this.renderImage();
					}
					this.buttonRotateCounterClockwise = true;
				}
			} else this.buttonRotateCounterClockwise = false;
			if (buttonStatus.hold) {
				if (!this.buttonHold) {
					if (buttonStatus.quitModifier) {
						this.parent.openGameScreen();
					}
					this.buttonHold = true;
				}
			} else this.buttonHold = false;
		}

		if (buttonStatus.esc) {
			switch (this.state) {
				case GameState.playing:
					if (buttonStatus.quitModifier) {
						currentSong.pause();
						goBack();
					} else {
						this.pause();
					}
					break;
				case GameState.paused:
					if (buttonStatus.quitModifier) {
						goBack();
					} else {
						currentSong.resume();
						this.state = GameState.playing;
					}
					break;
				case GameState.over:
					goBack();
					break;
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
		ctx.imageSmoothingEnabled = false;
		ctx.globalAlpha = 1;
		ctx.drawImage(playScreenImage, 0, 0);
		
		if (this.hold == -1) {
			ctx.strokeStyle = "#F00";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(182, 38);
			ctx.lineTo(213, 69);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(213, 38);
			ctx.lineTo(182, 69);
			ctx.stroke();
		}
		
		ctx.fillStyle = "#FFF";
		ctx.font = "16px Tetreml";
		ctx.textAlign = "center";
		ctx.fillText("HOLD", 198, 23);
		ctx.fillText("NEXT", 440, 23);
		ctx.font = "350 24px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("KEYS", 14, 86);
		
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		this.keyY = 110;
		if (buttonStatus.quitModifier) {
			this.renderKeyLine(keyNames.left, "Move left");
			this.renderKeyLine(keyNames.quitModifier + "+" + keyNames.right, "Render GIF");
			this.renderKeyLine(keyNames.quitModifier + "+" + keyNames.softDrop, "Firm drop");
			this.renderKeyLine(keyNames.quitModifier + "+" + keyNames.hardDrop, "Add intermediate frame");
			this.renderKeyLine(keyNames.quitModifier + "+" + keyNames.rotateCounterClockwise, "Render image");
			this.renderKeyLine(keyNames.quitModifier + "+" + keyNames.rotateClockwise, "Get Fumen URL");
			this.renderKeyLine(keyNames.quitModifier + "+" + keyNames.hold, "Restart");
			this.renderKeyLine(keyNames.reset, "Reset current tetrimino");
			if (this.state != GameState.over) this.renderKeyLine(keyNames.quitModifier + "+" + keyNames.esc, "Return to edit screen"); else this.keyY += 15;
			this.keyY += 15;
			this.renderKeyLine(keyNames.volumeUp, "Volume up");
			this.renderKeyLine(keyNames.volumeDown, "Volume down");
			this.keyY += 15;
			this.renderKeyLine(keyNames.quitModifier, "Extra functions");
		} else {
			this.renderKeyLine(keyNames.left, "Move left");
			this.renderKeyLine(keyNames.right, "Move right");
			this.renderKeyLine(keyNames.softDrop, "Soft drop");
			this.renderKeyLine(keyNames.hardDrop, "Hard drop");
			this.renderKeyLine(keyNames.rotateCounterClockwise, "Rotate counterclockwise");
			this.renderKeyLine(keyNames.rotateClockwise, "Rotate clockwise");
			this.renderKeyLine(keyNames.hold, "Hold");
			this.renderKeyLine(keyNames.reset, "Reset current tetrimino");
			this.renderKeyLine(keyNames.esc, this.state == GameState.over ? "Return to edit screen" : this.state == GameState.playing ? "Pause" : "Continue");
			this.keyY += 15;
			this.renderKeyLine(keyNames.volumeUp, "Volume up");
			this.renderKeyLine(keyNames.volumeDown, "Volume down");
			this.keyY += 15;
			this.renderKeyLine(keyNames.quitModifier, "Extra functions");
		}

		if (this.volumeDisplayTime > 0) {
			ctx.fillText(`Volume: ${volume} / 10`, 15, 350);
			this.volumeDisplayTime -= timePassed;
		}

		if (this.gifIsRendering) ctx.fillText("Rendering GIF...", 15, 20);

		ctx.fillText("Intermediate frames", 485, 20);
		ctx.textAlign = "right";
		ctx.fillText("" + this.fumenPagesForCurrent.length, 632, 40);

		if (this.maxTetriminoes) {
			ctx.textAlign = "left";
			ctx.fillText("Tetriminoes left", 485, 70);
			ctx.fillText(this.tetriminoesLeft, 485, 96, 73);
			ctx.textAlign = "right";
			ctx.fillText(this.maxTetriminoes, 632, 96, 73);
			ctx.fillRect(485, 74, 147 * this.tetriminoesLeft / this.maxTetriminoes, 10);
		}

		ctx.textAlign = "left";

		ctx.font = "20px Tetreml";
		if (this.rewardTime != 0) {
			this.rewardTime = Math.max(0, this.rewardTime - timePassed);
			ctx.fillText(this.rewardName, 406, 348);
		}

		if (this.stackMinY < 24) {
			ctx.fillStyle = "#F00";
			ctx.globalAlpha = 0.4;
			ctx.fillRect(240, 35, 160, 2);
			if (this.state != GameState.over) {
				ctx.globalAlpha = 0.6;
				for (let mino of this.queue[0].states[0]) ctx.drawImage(sprite, 64, 128, 16, 16, 240 + 16 * (4 + mino[0]), 4 + 16 * (1 + mino[1]), 16, 16);
			}
		}

		ctx.globalAlpha = 0.7;
		for (let x = 0; x < 10; x++) {
			for (let y = 18; y < 40; y++) {
				let mino = this.board[x][y];
				if (mino != undefined) {
					this.renderMino(x, y, mino.directions, mino.textureY);
					let minoX = 240 + x * 16;
					let minoY = 4 + 16 * (y - 18);
					let uldr = this.isMinoVisible(x + 1, y) << 3 | this.isMinoVisible(x, y - 1) << 2 | this.isMinoVisible(x - 1, y) << 1 | this.isMinoVisible(x, y + 1); // Up left down right.
					ctx.drawImage(outlineSprite, 16 * uldr, 128, 16, 16, minoX, minoY, 16, 16);
					if (!this.isMinoVisible(x-1, y-1) && (uldr & 0b0110) == 0b0110) ctx.drawImage(outlineSprite, 0, 144, 16, 16, minoX, minoY, 16, 16);
					if (!this.isMinoVisible(x+1, y-1) && (uldr & 0b1100) == 0b1100) ctx.drawImage(outlineSprite, 16, 144, 16, 16, minoX, minoY, 16, 16);
					if (!this.isMinoVisible(x+1, y+1) && (uldr & 0b1001) == 0b1001) ctx.drawImage(outlineSprite, 32, 144, 16, 16, minoX, minoY, 16, 16);
					if (!this.isMinoVisible(x-1, y+1) && (uldr & 0b0011) == 0b0011) ctx.drawImage(outlineSprite, 48, 144, 16, 16, minoX, minoY, 16, 16);
				}
			}
		}
		ctx.globalAlpha = 1;
		if (this.current != null && this.state != GameState.over) for (let ghostY = this.current.y; true; ghostY++) {
			if (this.current.checkCollision(this.board, null, ghostY)) {
				let tetriminoX = 240 + this.current.x * 16;
				let tetriminoY = -12 + 16 * (ghostY - 18);
				for (let mino of this.current.states[this.current.state])
					if (ghostY + mino[1] > 18) ctx.drawImage(outlineSprite, mino[2] * 16, this.current.textureY * 16, 16, 16, tetriminoX + mino[0] * 16, tetriminoY + mino[1] * 16, 16, 16);
				break;
			}
		}
		if (this.current != null && this.state != GameState.over) {
			this.current.render(this);
		}
		if (this.hold != null && this.hold != -1) this.renderTetrimino(this.hold, 182, 54, this.holdSwitched);
		let queueDrawLimit = this.maxTetriminoes == 0 ? 3 : Math.min(3, this.tetriminoesLeft);
		for (let i = 0; i < queueDrawLimit; i++) this.renderTetrimino(this.queue[i], 424, 48 + 48 * i);

		ctx.imageSmoothingEnabled = true;

		let newParticles = [];
		for (let particle of this.particles) {
			let ratio = particle.time / particle.lifetime;
			ctx.drawImage(sprite, 84, 132, 9, 9, particle.x + 4.5 * ratio, particle.y - particle.distance * (1-Math.pow((1-ratio), 4)) - 4.5 * ratio, 9 * (1-ratio), 9 * (1-ratio));
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
				ctx.font = "20px Tetreml";
				ctx.fillText("PAUSED", 521, 230);
				break;
			case GameState.over:
				ctx.textAlign = "center";
				ctx.font = "20px Tetreml";
				ctx.fillText("OVER", 521, 230);
				break;
		}
	}

	renderKeyLine(text1, text2) {
		ctx.fillText(text1, 15, this.keyY, 60);
		ctx.fillText(text2, 80, this.keyY, 155);
		this.keyY += 15;
	}

	resetKeys() {
		for (let key in buttonStatus) buttonStatus[key] = false;
	}

	getFumenURL() {
		prompt("Fumen URL:", "https://harddrop.com/fumen?" + tetrisFumen.encoder.encode(this.fumenPages));
		this.resetKeys();
	}

	renderImage() {
		imageRendererContext.clearRect(0, 0, 160, 352);
		imageRendererContext.globalAlpha = 0.7;
		for (let y = 18; y < 40; y++) for (let x = 0; x < 10; x++) {
			let mino = this.board[x][y];
			if (mino) imageRendererContext.drawImage(sprite, mino.directions * 16, mino.textureY * 16, 16, 16, x * 16, (y - 18) * 16, 16, 16);
		}
		imageRendererContext.globalAlpha = 1;
		if (this.state != GameState.over && this.current != null) for (let mino of this.current.states[this.current.state])
			imageRendererContext.drawImage(sprite, mino[2] * 16, this.current.textureY * 16, 16, 16, (this.current.x + mino[0]) * 16, (this.current.y + mino[1] - 18) * 16, 16, 16);
		this.resetKeys();
		openRenderedImage();
	}

	pushFumenPage() {
		if (this.hold != null && this.hold != -1) this.currentFumenPage.comment = `#Q=[${this.hold.code}](${this.current.code})`;
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

	pushGIFFrame() {
		let boardString = "";
		let x;
		for (let y = 18; y < 40; y++) for (x = 0; x < 10; x++) {
			let mino = this.board[x][y];
			boardString += String.fromCharCode(mino ? 128 | (mino.textureY << 4) | mino.directions : 0);
		}
		this.gifFrames.push({
			board: boardString,
			current: this.current ? this.current.code + String.fromCharCode(this.current.state) + String.fromCharCode(this.current.x) + String.fromCharCode(this.current.y-18) : null
		});
	}

	generateGIF() {
		if (this.gifIsRendering) return;
		this.gifIsRendering = true;

		let gif = new GIF({
			repeat: 0,
			workers: 2,
			quality: 1,
			background: "#000",
		});
		imageRendererContext.fillStyle = "#FFF";

		for (let frame of this.gifFrames) {
			imageRendererContext.clearRect(0, 0, 160, 352);
			imageRendererContext.drawImage(gifBackground, 0, 0);
			const { board, current } = frame;
			const minoes = [];
			imageRendererContext.globalAlpha = 0.8;
			for (let y = 0; y < 22; y++) {
				let count = 0;
				for (let x = 0; x < 10; x++) {
					let code = board.charCodeAt(y * 10 + x);
					if (code & 128) {
						imageRendererContext.drawImage(sprite, 16 * (code & 15), 16 * ((code & 112) >> 4), 16, 16, x * 16, y * 16, 16, 16);
						count++;
					}
				}
				minoes.push(count);
			}
			if (current != null) {
				imageRendererContext.globalAlpha = 1;
				let tetrimino = tetriminoMapping[current[0]];
				let state = current.charCodeAt(1), x = current.charCodeAt(2), y = current.charCodeAt(3);
				for (let mino of tetrimino.states[state]) {
					let row = y + mino[1];
					if (row > -1) {
						imageRendererContext.drawImage(sprite, 16 * mino[2], 16 * tetrimino.textureY, 16, 16, 16 * (x + mino[0]), 16 * row, 16, 16);
						if (++minoes[row] > 9) {
							imageRendererContext.globalAlpha = 0.2;
							imageRendererContext.fillRect(0, 16 * row, 160, 16);
							imageRendererContext.globalAlpha = 1;
						}
					}
				}
			}
			gif.addFrame(imageRenderer, {copy: true});
		}

		gif.on("finished", (blob) => {
			let date = new Date();
			let filename = `Tetreml sandbox – ${date.getHours()}h${date.getMinutes() < 10 ? "0" : ""}${date.getMinutes()}.${date.getSeconds() < 10 ? "0" : ""}${date.getSeconds()} ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.gif`;
			if (window.navigator.msSaveOrOpenBlob) {
				window.navigator.msSaveBlob(blob, filename);
			} else {
				var elem = window.document.createElement('a');
				elem.href = window.URL.createObjectURL(blob);
				elem.download = filename;
				document.body.appendChild(elem);
				elem.click();
				document.body.removeChild(elem);
			}
			this.gifIsRendering = false;
		});

		gif.render();
	}

	pause(playSound = true) {
		currentSong.pause();
		if (playSound) sfx.pause.play();
		this.state = GameState.paused;
	}

	close() {
		
	}

	renderMino(x, y, directions, textureY) {
		if (y < 18 || y > 39) return;
		ctx.drawImage(sprite, 16 * directions, textureY * 16, 16, 16, 240 + x * 16, 4 + 16*(y-18), 16, 16);
	}

	renderTetrimino(tetrimino, x, y, gray = false) {
		if (!(tetrimino instanceof TetriminoI) && !(tetrimino instanceof TetriminoO)) x += 8;
		if (tetrimino instanceof TetriminoI) y -= 8;
		for (let mino of tetrimino.states[0]) {
			ctx.drawImage(sprite, 16 * mino[2], gray ? 0 : tetrimino.textureY * 16, 16, 16, x + 16 * mino[0], y + 16 * mino[1], 16, 16);
		}
	}

	move(offset) {
		if (this.state != GameState.playing || this.current == null) return;
		let newX = this.current.x + offset;
		if (!this.current.checkCollision(this.board, newX, this.current.y)) {
			(this.current.canFall(this.board) ? sfx.move : sfx.moveOnGround).play();
			this.current.x = newX;
			this.current.onMove();
			if (this.moveCounter++ < 15) this.lockTime = 0;
			if (!this.processInstaFall() && this.current.checkCollision(this.board, newX + offset, this.current.y)) sfx.land.play();
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
			this.current.onMove();
			sfx.softDrop.play();
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
		this.pushGIFFrame();
		let toClear = [];
		let tSpinType = this.current.getTSpinType(this.board);
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
		this.addReward(rewardIndexMapping[tSpinType] + toClear.length);
		if (tSpinType) (toClear.length == 0 ? sfx.tSpinZero : sfx.tSpin).play();
		if (toClear.length != 0) {
			this.clearLines(toClear)
		} else {
			this.nextTetrimino();
		}
		if (this.state != GameState.over && this.maxTetriminoes && !(--this.tetriminoesLeft)) this.gameOver();

		if (this.clearTime == 0) this.moveDisabledLeft = this.moveDisabledRight = true;
		else this.buttonRotateClockwise = this.buttonRotateCounterClockwise = this.buttonHold = false; // Trigger the IRS.
	}

	processInstaFall() {
		if (this.state != GameState.playing || this.current == null || this.fallPeriod != 0) return false;
		let fell = false;
		while (this.current.canFall(this.board)) {
			this.current.y++;
			fell = true;
		}
		sfx.land.play();
		if (fell) {
			this.maxY = this.current.y;
			this.current.onMove();
		}
		return true;
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
		if (reward == -1) return;
		this.rewardName = rewardNames[reward];
		this.rewardTime = 1500;
	}

	pushToQueue() {
		let bag = [new TetriminoI(), new TetriminoJ(), new TetriminoL(), new TetriminoO(), new TetriminoS(), new TetriminoZ(), new TetriminoT()];
		for (let i = 0; i < 7; i++) {
			this.queue.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
		}
	}

	nextTetrimino() {
		this.current = this.queue.shift();
		if (this.queue.length < 6) this.pushToQueue();
		this.moveCounter = 0;
		this.fallTime = 0;
		this.lockTime = 0;
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
		currentSong.pause();
	}
}

class PaneButton {
	constructor(x, y, key, getText, clickCallback) {
		this.x = x;
		this.y = y;
		this.key = key;
		this.keyName = formatKeycode(key);
		this.getText = getText;
		this.clickCallback = clickCallback;
	}

	isMouseOn(mouseX, mouseY) {
		return mouseX >= this.x && mouseX < this.x + 196 && mouseY >= this.y && mouseY < this.y + 21;
	}

	render(mouseX, mouseY) {
		if (mouseX != null && this.isMouseOn(mouseX, mouseY)) {
			ctx.globalAlpha = 0.3;
			ctx.fillRect(this.x + 1, this.y + 1, 194, 19);
			ctx.globalAlpha = 1;
		}
		ctx.strokeRect(this.x + 0.5, this.y + 0.5, 195, 20);
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText(this.getText(), this.x + 7, this.y + 15, 155);
		ctx.textAlign = "right";
		ctx.fillText(this.keyName, this.x + 191, this.y + 15, 24);
	}

	onClick(mouseX, mouseY) {
		if (this.isMouseOn(mouseX, mouseY)) this.clickCallback();
	}

	onKey(keycode) {
		if (keycode == this.key) this.clickCallback();
	}
}

class PaneDrawAndMain {
	constructor(owner) {
		this.owner = owner;
		this.buttonList = [
			new PaneButton(209, 233, "KeyM", () => `Max tetriminoes: ${this.owner.maxTetriminoes == 0 ? "\u221e" : this.owner.maxTetriminoes}`, () => {
				let value = Number.parseInt(prompt("Enter maximum number of tetriminoes (0 for unlimited)", this.owner.maxTetriminoes));
				if (!isNaN(value) && value > -1) this.owner.maxTetriminoes = Math.min(1000000, value);
			}),
			new PaneButton(209, 260, "KeyS", () => `Fall period: ${this.owner.fallPeriod == -1 ? "\u221e" : this.owner.fallPeriod + " ms"}`, () => {
				let value = Number.parseInt(prompt("Enter fall period (0 ÷ 1000 ms or -1 for no falling)", this.owner.fallPeriod));
				if (!isNaN(value) && value > -2) this.owner.fallPeriod = Math.min(1000, value);
			}),
			new PaneButton(209, 287, "KeyD", () => `Lock delay: ${this.owner.lockDelay == 0 ? "\u221e" : this.owner.lockDelay + " ms"}`, () => {
				let value = Number.parseInt(prompt("Enter lock delay (100 ÷ 1000 ms or 0 for no auto-locking)", this.owner.lockDelay));
				if (!isNaN(value) && value > -1) this.owner.lockDelay = value == 0 ? 0 : Math.max(100, Math.min(1000, value));
			}),
			new PaneButton(209, 314, "Backspace", () => "Clear board", () => {
				this.owner.board = [];
				let col = [];
				for (let i = 0; i < 40; i++) col.push(undefined);
				for (let i = 0; i < 10; i++) this.owner.board.push([...col]);
			}),
			new PaneButton(419, 233, "KeyP", () => "Render image", () => {
				imageRendererContext.clearRect(0, 0, 160, 352);
				for (let y = 18; y < 40; y++) for (let x = 0; x < 10; x++) {
					let mino = this.owner.board[x][y];
					if (mino) imageRendererContext.drawImage(sprite, mino.directions * 16, mino.textureY * 16, 16, 16, x * 16, (y - 18) * 16, 16, 16);
				}
				openRenderedImage();
			}),
			new PaneButton(419, 260, "KeyI", () => "Import file", async () => {
				if (this.owner.fileInput.files.length == 0) return;
				let reader = new FileReader();
				reader.addEventListener("load", (event) => {
					this.owner.load(event.target.result);
				});
				reader.readAsText(this.owner.fileInput.files[0]);
			}),
			new PaneButton(419, 287, "KeyO", () => "Export file", () => {
				let date = new Date();
				createAndDownloadFile(`${date.getHours()}h${date.getMinutes() < 10 ? "0" : ""}${date.getMinutes()}.${date.getSeconds() < 10 ? "0" : ""}${date.getSeconds()} ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.tetreml_sandbox`, this.owner.getSaveString());
			}),
			new PaneButton(419, 314, "KeyL", () => "Get link", () => {
				prompt("Copy this link to share the current sandbox preset", window.location.origin + window.location.pathname + "?code=" + encodeURIComponent(btoa(this.owner.getSaveString())));
			})
		];
	}

	onKeyPress(keycode) {
		if (this.owner.colorKeyMapping[keycode] != undefined && this.owner.colorKeyMapping[keycode] != 8) this.owner.color = this.owner.colorKeyMapping[keycode];
		else for (let button of this.buttonList) button.onKey(keycode);
	}

	getColorCell(mouseX, mouseY) {
		if (mouseX != null && mouseY > 161 && mouseY < 194 && (mouseX - 271) % 37 < 32) {
			let i = Math.floor((mouseX - 271) / 37);
			return i > -1 && i < 8 ? i : null;
		}
		return null;
	}

	onClick(mouseX, mouseY) {
		if (mouseX == null) return null;
		let cell = this.getColorCell(mouseX, mouseY);
		if (cell != null) this.owner.color = cell;
		else for (let button of this.buttonList) button.onClick(mouseX, mouseY);
	}

	render(mouseX, mouseY) {
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("No modifier key", 210, 94);
		ctx.fillText("Shift", 210, 109);
		ctx.fillText("Ctrl", 210, 124);
		ctx.fillText("Alt", 210, 139);
		ctx.fillText("Left mouse button", 334, 73);
		ctx.fillText("Set cell", 334, 94);
		ctx.fillText("Set row", 334, 109);
		ctx.fillText("Insert row", 334, 124);
		ctx.fillText("Connect", 334, 139);
		ctx.fillText("Right mouse button", 481, 73);
		ctx.fillText("Unset cell", 481, 94);
		ctx.fillText("Unset row", 481, 109);
		ctx.fillText("Delete row", 481, 124);
		ctx.fillText("Copy color", 481, 139);

		ctx.globalAlpha = 0.15;
		ctx.fillRect(205, 82 + 15 * this.owner.getModifier(), 392, 16);
		if (this.owner.button) ctx.fillRect(this.owner.button == 1 ? 330 : 477, 61, 120, 82);
		ctx.globalAlpha = 1;

		ctx.imageSmoothingEnabled = false;
		ctx.textAlign = "center";
		for (let i = 0; i < 8; i++) {
			ctx.drawImage(sprite, 0, i * 16, 16, 16, 270 + 37 * i, 162, 32, 32);
			ctx.fillText(this.owner.colorKeyNameMapping[i], 286 + 37 * i, 208);
		}

		let hoveredCell = this.getColorCell(mouseX, mouseY);
		if (hoveredCell != null) {
			ctx.globalAlpha = 0.3;
			ctx.fillRect(270 + 37 * hoveredCell, 162, 32, 32);
			ctx.globalAlpha = 1;
		}

		ctx.font = "350 15px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Colors", 196, 183);
		
		ctx.strokeStyle = "#FFF";
		ctx.lineWidth = 1;
		ctx.strokeRect(268.5 + 37 * this.owner.color, 160.5, 35, 35);
		for (let button of this.buttonList) button.render(mouseX, mouseY);
	}
}

class PaneTetriminoes {
	constructor(owner) {
		this.owner = owner;
		this.holdBorders = [[353.5, 66.5, 43, 19], [397.5, 66.5, 35, 19], [433.5, 66.5, 27, 19], [461.5, 66.5, 27, 19], [489.5, 66.5, 19, 19], [509.5, 66.5, 27, 19], [537.5, 66.5, 27, 19], [565.5, 66.5, 27, 19], [593.5, 66.5, 19, 19]];
		this.holdHover = [[354, 67, 42, 18], [398, 67, 34, 18], [434, 67, 26, 18], [462, 67, 26, 18], [490, 67, 18, 18], [510, 67, 26, 18], [538, 67, 26, 18], [566, 67, 26, 18], [594, 67, 18, 18]];
		this.holdBounds = [[353, 66, 396, 85], [397, 66, 432, 85], [433, 66, 460, 85], [461, 66, 488, 85], [489, 66, 508, 85], [509, 66, 536, 85], [537, 66, 564, 85], [565, 66, 592, 85], [593, 66, 612, 85]];
		this.holdDrawX = [0, 407, 443, 471, 491, 519, 547, 575];
		this.holdTetriminoMapping = [null, new TetriminoI(), new TetriminoJ(), new TetriminoL(), new TetriminoO(), new TetriminoS(), new TetriminoT(), new TetriminoZ(), -1];
	}

	setSequence() {
		let res = prompt("Set the current tetrimino sequence (space to clear)", this.owner.sequence);
		if (!res) return;
		this.owner.sequence = "";
		for (let c of res.toUpperCase()) if (tetriminoMapping[c]) this.owner.sequence += c;
	}

	onKeyPress(keycode) {
		if (this.owner.colorKeyMapping[keycode] != undefined) this.owner.hold = this.owner.colorKeyMapping[keycode];
		else if (keycode == "KeyS") this.setSequence();
	}

	getHoldTetrimino(mouseX, mouseY) {
		let bounds;
		for (let i = 0; i < 9; i++)	{
			bounds = this.holdBounds[i];
			if (mouseX != null && mouseX > bounds[0] && mouseX < bounds[2] && mouseY > bounds[1] && mouseY < bounds[3]) return i;
		}
		return null;
	}

	onClick(mouseX, mouseY) {
		let tetrimino = this.getHoldTetrimino(mouseX, mouseY);
		if (tetrimino != null) this.owner.hold = tetrimino;
		else if (mouseX != null && mouseX > 300 && mouseX < 335 && mouseY > 108 && mouseY < 128) this.owner.sequence = "";
		else if (mouseX != null && mouseX > 197 && mouseX < 625 && mouseY > 133 && mouseY < 359) this.setSequence();
	}

	render(mouseX, mouseY) {
		ctx.fillStyle = "#FFF";
		ctx.font = "350 15px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Hold", 348, 61);
		ctx.fillText("Sequence", 196, 124);

		ctx.font = "12px Tetreml";
		ctx.fillText("[None.]", 356, 80);
		ctx.fillText("S", 273, 124);
		ctx.fillText("Clear", 304, 124);
		ctx.textAlign = "center";
		for (let i = 0; i < 9; i++) ctx.fillText(this.owner.colorKeyNameMapping[i], this.holdHover[i][0] + this.holdHover[i][2] / 2, 97);
		for (let i = 1; i < 8; i++) this.owner.renderTetrimino(this.holdTetriminoMapping[i], this.holdDrawX[i], 76);
		ctx.drawImage(sprite, 64, 128, 16, 16, 595, 68, 16, 16);
		ctx.strokeStyle = "#FFF";
		ctx.lineWidth = 1;
		ctx.strokeRect(...this.holdBorders[this.owner.hold]);
		let hoveredTetrimino = this.getHoldTetrimino(mouseX, mouseY);
		if (hoveredTetrimino != null) {
			ctx.globalAlpha = 0.3;
			ctx.fillRect(...this.holdHover[hoveredTetrimino]);
			ctx.globalAlpha = 1;
		}

		ctx.strokeRect(300.5, 110.5, 35, 18);
		if (mouseX != null && mouseX > 300 && mouseX < 335 && mouseY > 108 && mouseY < 128) {
			ctx.globalAlpha = 0.3;
			ctx.fillRect(301, 109, 34, 19);
			ctx.globalAlpha = 1;
		}

		ctx.font = "italic 12px Tetreml";
		ctx.textAlign = "right";
		ctx.globalAlpha = 0.5;
		ctx.fillText("Tetriminoes afterwards are random.", 624, 124);
		ctx.globalAlpha = 1;

		ctx.lineWidth = 2;
		ctx.strokeRect(197, 133, 427, 224);
		let xPos = 0;
		let yPos = 0;
		for (let c of this.owner.sequence) {
			let width = c == 'I' ? 32 : 24;
			if (xPos + width > 414) {
				yPos++;
				if (yPos > 8) break;
				xPos = 0;
			}
			if (c == 'O') xPos -= 8;
			this.owner.renderTetrimino(tetriminoMapping[c], 213 + xPos, 149 + yPos * 24);
			xPos += width + 4;
		}
		if (mouseX != null && mouseX > 197 && mouseX < 625 && mouseY > 133 && mouseY < 359) {
			ctx.globalAlpha = 0.3;
			ctx.fillRect(198, 134, 425, 223);
			ctx.globalAlpha = 1;
		}
	}
}

class EditScreen {
	constructor(parent) {
		this.parent = parent;
		this.button = 0;
		this.shiftLeft = this.shiftRight = this.shift = false;
		this.ctrlLeft = this.ctrlRight = this.ctrl = false;
		this.altLeft = this.altRight = this.alt = false;

		this.board = [];
		let col = [];
		for (let i = 0; i < 40; i++) col.push(undefined);
		for (let i = 0; i < 10; i++) this.board.push([...col]);

		this.sequence = "";
		this.hold = 0;
		this.maxTetriminoes = 0;
		this.color = 0;
		this.fallPeriod = -1;
		this.lockDelay = 0;

		this.colorKeyMapping = { Backquote: 0, Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5, Digit6: 6, Digit7: 7, Digit8: 8 };
		this.colorKeyNameMapping = ["`", "1", "2", "3", "4", "5", "6", "7", "8"];
		this.holdCodeMapping = "NIJLOSTZX";

		this.drawAndMainPane = new PaneDrawAndMain(this);
		this.tetriminoesPane = new PaneTetriminoes(this);

		this.connectMapping = {
			"-10": [0b0001, 0b0100],
			"-1": [0b1000, 0b0010],
			"1": [0b0010, 0b1000],
			"10": [0b0100, 0b0001]
		};

		this.fileInput = document.getElementById("fileSelector");
		this.fileInputWrapper = document.getElementById("fileInputWrapper");

		let code = new URL(window.location).searchParams.get('code');
		if (code != null) try {
			this.load(atob(code));
		} catch (e) {
			console.error(e);
		}
	}

	init() {
		mainWindow.addEventListener("mousedown", this.mouseDownListener = (event) => { this.onMouseDown(event); });
		mainWindow.addEventListener("mousemove", this.mouseMoveListener = (event) => { this.onMouseMove(event); });
		document.addEventListener("mouseup", this.mouseUpListener = (event) => { this.onMouseUp(event); });
		mainWindow.addEventListener("mouseenter", this.mouseEnterListener = (event) => { this.onMouseEnter(event); });
		mainWindow.addEventListener("mouseleave", this.mouseLeaveListener = (event) => { this.onMouseLeave(event); });
		mainWindow.addEventListener("contextmenu", this.contextMenuListener = (event) => {
			if (this.ctrl && this.shift)
				this.ctrl = this.shift = this.alt = this.shiftLeft = this.shiftRight = this.ctrlLeft = this.ctrlRight = this.altLeft = this.altRight = false;
			else event.preventDefault();
		});
		document.addEventListener("keydown", this.keyDownListener = (event) => { this.onKeyDown(event); });
		document.addEventListener("keyup", this.keyUpListener = (event) => { this.onKeyUp(event); });

		this.mouseOn = false;
		this.mouseX = 0;
		this.mouseY = 0;
		this.paneFlag = false;
		this.currentPane = this.drawAndMainPane;
		this.fileInputWrapper.style.display = "block";
	}

	getCell(event) {
		let x = event.offsetX;
		let y = event.offsetY;
		if (x < (22*scale) || x > (181*scale) || y < (4*scale) || y > (355*scale)) return null;
		return { x: Math.floor((x - 22*scale) / (16*scale)), y: Math.floor((y - 4*scale) / (16*scale)) + 18 };
	}

	processAction(cell) {
		if (this.paneFlag || cell == null) return;
		switch (this.button) {
			case 1: // Left
				switch (this.modifier) {
					case 0: // Set cell
						if (this.performed[cell.y*10+cell.x]) return;
						this.board[cell.x][cell.y] = new Mino(0, this.color);
						if (cell.x > 0 && this.board[cell.x-1][cell.y]) this.board[cell.x-1][cell.y].directions &= 0b0111;
						if (cell.x < 9 && this.board[cell.x+1][cell.y]) this.board[cell.x+1][cell.y].directions &= 0b1101;
						if (this.board[cell.x][cell.y-1]) this.board[cell.x][cell.y-1].directions &= 0b1110;
						if (cell.y < 40 && this.board[cell.x][cell.y+1]) this.board[cell.x][cell.y+1].directions &= 0b1011;
						this.performed[cell.y*10+cell.x] = true;
						break;
					case 1: // Set row
						if (this.performed[cell.y]) return;
						for (let x = 0; x < 10; x++) {
							this.board[x][cell.y] = new Mino(0, this.color);
							if (this.board[x][cell.y - 1]) this.board[x][cell.y - 1].directions &= 0b1110;
							if (cell.y < 40 && this.board[x][cell.y+1]) this.board[x][cell.y+1].directions &= 0b1011;
						}
						this.performed[cell.y] = true;
						break;
					case 2: // Insert row
						if (this.performed === 1) return;
						for (let x = 0; x < 10; x++) {
							let col = this.board[x];
							this.board[x] = [...col.slice(1, cell.y+1), undefined, ...col.slice(cell.y+1, 40)];
							if (this.board[x][cell.y - 1]) this.board[x][cell.y - 1].directions &= 0b1110;
							if (cell.y < 40 && this.board[x][cell.y+1]) this.board[x][cell.y+1].directions &= 0b1011;
						}
						this.performed = 1;
						break;
					case 3: // Connect
						if (this.oldCell) {
							let masks = this.connectMapping[(cell.y - this.oldCell.y) * 10 + cell.x - this.oldCell.x];
							if (masks && this.board[cell.x][cell.y] && this.board[this.oldCell.x][this.oldCell.y] && this.board[cell.x][cell.y].textureY == this.board[this.oldCell.x][this.oldCell.y].textureY) {
								this.board[cell.x][cell.y].directions |= masks[0];
								this.board[this.oldCell.x][this.oldCell.y].directions |= masks[1];
							}
						}
						this.oldCell = cell;
						break;
				}
				break;
			case 2: // Right
				switch (this.modifier) {
					case 0: // Unset cell
						if (this.performed[cell.y*10+cell.x]) return;
						this.board[cell.x][cell.y] = undefined;
						if (cell.x > 0 && this.board[cell.x-1][cell.y]) this.board[cell.x-1][cell.y].directions &= 0b0111;
						if (cell.x < 9 && this.board[cell.x+1][cell.y]) this.board[cell.x+1][cell.y].directions &= 0b1101;
						if (this.board[cell.x][cell.y-1]) this.board[cell.x][cell.y-1].directions &= 0b1110;
						if (cell.y < 40 && this.board[cell.x][cell.y+1]) this.board[cell.x][cell.y+1].directions &= 0b1011;
						this.performed[cell.y*10+cell.x] = true;
						break;
					case 1: // Unset row
						if (this.performed[cell.y]) return;
						for (let x = 0; x < 10; x++) {
							this.board[x][cell.y] = undefined;
							if (this.board[x][cell.y - 1]) this.board[x][cell.y - 1].directions &= 0b1110;
							if (cell.y < 40 && this.board[x][cell.y + 1]) this.board[x][cell.y + 1].directions &= 0b1011;
						}
						this.performed[cell.y] = true;
						break;
					case 2: // Delete row
						if (this.performed === 1) return;
						for (let x = 0; x < 10; x++) {
							if (this.board[x][cell.y - 1]) this.board[x][cell.y - 1].directions &= 0b1110;
							if (cell.y < 40 && this.board[x][cell.y+1]) this.board[x][cell.y+1].directions &= 0b1011;
							let col = this.board[x];
							this.board[x] = [undefined, ...col.slice(0, cell.y), ...col.slice(cell.y + 1, 40)];
						}
						this.performed = 1;
						break;
					case 3: // Copy color
						this.color = this.board[cell.x][cell.y].textureY;
						break;
				}
				break;
		}
	}

	getModifier() {
		return this.shift ? 1 : this.ctrl ? 2 : this.alt ? 3 : 0;
	}

	processDrawMouseDown(event) {
		if (this.button || (event.button != 0 && event.button != 2)) return;
		let cell = this.getCell(event);
		if (cell == null) return;
		this.button = event.button ? 2 : 1;
		this.modifier = this.getModifier();
		this.performed = {};
		this.oldCell = null;
		this.processAction(cell);
	}

	onMouseDown(event) {
		if (!this.paneFlag) this.processDrawMouseDown(event);
		if (event.button) return;
		let mouseX = Math.floor(event.offsetX / scale);
		let mouseY = Math.floor(event.offsetY / scale);
		this.currentPane.onClick(mouseX, mouseY);
		if (mouseX > 194 && mouseX < 322 && mouseY > 54 && mouseY < 74) {
			this.togglePane();
		}
	}

	onMouseMove(event) {
		this.mouseX = Math.floor(event.offsetX / scale);
		this.mouseY = Math.floor(event.offsetY / scale);
		if (!this.button) return;
		this.processAction(this.getCell(event));
	}

	onMouseUp(event) {
		if (!this.button) return;
		this.button = 0;
	}

	onMouseEnter(event) {
		this.mouseOn = true;
	}

	onMouseLeave(event) {
		this.mouseOn = false;
		this.onMouseUp(event);
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

	togglePane() {
		this.paneFlag = !this.paneFlag;
		this.currentPane = this.paneFlag ? this.tetriminoesPane : this.drawAndMainPane;
	}

	onKeyDown(event) {
		switch (event.code) {
			case "Equal":
				if (this.button) break;
				this.togglePane();
				break;
			case "Enter":
				this.openGameScreen();
				event.preventDefault();
				break;
		}
		this.updateModifierKey(event.code, true);
		this.currentPane.onKeyPress(event.code);
	}

	openGameScreen() {
		openGui(new PlayScreen(this, this.board, this.sequence, this.hold, this.maxTetriminoes, this.fallPeriod, this.lockDelay));
	}

	onKeyUp(event) {
		this.updateModifierKey(event.code, false);
	}

	renderTetrimino(tetrimino, x, y) {
		for (let mino of tetrimino.states[0])
			ctx.drawImage(sprite, mino[2] * 16, tetrimino.textureY * 16, 16, 16, x + 8 * mino[0], y + 8 * mino[1], 8, 8);
	}

	render() {
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(editScreenImage, 0, 0);
		// Render the current board.
		for (let x = 0; x < 10; x++) for (let y = 18; y < 40; y++) {
			let mino = this.board[x][y];
			if (mino) ctx.drawImage(sprite, mino.directions * 16, mino.textureY * 16, 16, 16, 22 + 16 * x, -284 + 16 * y, 16, 16);
		}
		ctx.fillStyle = "#FFF";
		if (!this.paneFlag && this.mouseX != null) {
			let cell = this.getCell({ offsetX: this.mouseX * scale, offsetY: this.mouseY * scale });
			if (cell != null) {
				ctx.globalAlpha = 0.3;
				ctx.fillRect(22 + 16 * cell.x, -284 + 16 * cell.y, 16, 16);
				ctx.globalAlpha = 1;
			}
		}
		// Render text.
		ctx.font = "300 26px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Tetreml sandbox", 194, 36);
		ctx.font = "350 15px Tetreml";
		ctx.fillText(this.paneFlag ? "Tetriminoes" : "Draw & main", 201, 70);
		ctx.font = "12px Tetreml";
		ctx.textAlign = "right";
		ctx.fillText("=", 324, 68);
		ctx.font = "italic 12px Tetreml";
		ctx.globalAlpha = 0.5;
		ctx.fillText("Press Enter to start.", 624, 36);
		ctx.globalAlpha = 1;
		ctx.strokeStyle = "#FFF";
		ctx.lineWidth = 1;
		ctx.strokeRect(194.5, 54.5, 133, 20);
		if (this.mouseOn && this.mouseX > 194 && this.mouseX < 322 && this.mouseY > 54 && this.mouseY < 74) {
			ctx.globalAlpha = 0.3;
			ctx.fillRect(195, 55, 132, 19);
			ctx.globalAlpha = 1;
		}
		this.currentPane.render(this.mouseOn ? this.mouseX : null, this.mouseY);
	}

	floatToString(f) {
		let s = "";
		for (let byte of new Uint8Array(new Float64Array([f]).buffer)) s += String.fromCharCode(byte);
		return s;
	}

	stringToFloat(s) {
		return new Float64Array(new Uint8Array([s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3), s.charCodeAt(4), s.charCodeAt(5), s.charCodeAt(6), s.charCodeAt(7)]).buffer)[0];
	}

	/* Tetreml-sandbox file format:
	   1 byte: Number of lines.
	   (Number of lines . 10) bytes: Board. Each byte contains data for a cell:
	           0      000      0000
	       Has mino  Color  Directions
	   8 bytes: Max tetriminoes stored as 64-bit float.
	   Hold slot: N for none, IJLOSTZ for a tetrimino, X for disabled.
	   8 bytes: Fall period as 64-bit float.
	   8 bytes: Lock delay as 64-bit float.
	   Tetrimino sequence. Each tetrimino is a character corresponding to its name.
	*/

	getSaveString() {
		let str = "";
		let line = "";
		let minY = 40;
		for (let y = 39; y > -1; y--) {
			line = "";
			for (let x = 0; x < 10; x++) {
				let mino = this.board[x][y];
				line += String.fromCharCode(mino ? 128 | (mino.textureY << 4) | mino.directions : 0);
				if (mino) minY = y;
			}
			str = line + str;
		}
		str = String.fromCharCode(40 - minY) + str.substring(10 * minY);
		str += this.floatToString(this.maxTetriminoes);
		str += this.holdCodeMapping[this.hold];
		str += this.floatToString(this.fallPeriod);
		str += this.floatToString(this.lockDelay);
		str += this.sequence;
		return str;
	}

	load(str) {
		let lines = str.charCodeAt(0);
		let minY = 40 - lines;

		let board = [];
		let col = [];
		for (let i = 0; i < 40; i++) col.push(undefined);
		for (let i = 0; i < 10; i++) board.push([...col]);

		let code = 0;
		for (let i = 0; i < lines; i++) for (let x = 0; x < 10; x++) {
			code = str.charCodeAt(1 + i * 10 + x);
			if (code & 128) board[x][minY + i] = new Mino(code & 15, (code & 112) >> 4);
		}

		let pos = lines * 10 + 1;
		let maxTetriminoes = this.stringToFloat(str.substring(pos, pos + 8));
		let hold = this.holdCodeMapping.indexOf(str[pos + 8]);
		if (hold == -1) return;
		let fallPeriod = this.stringToFloat(str.substring(pos + 9, pos + 17));
		let lockDelay = this.stringToFloat(str.substring(pos + 17, pos + 25));
		for (let char of str.substring(pos + 25)) if (!tetriminoMapping[char]) return;

		this.board = board;
		this.maxTetriminoes = maxTetriminoes;
		this.hold = hold;
		this.fallPeriod = fallPeriod;
		this.lockDelay = lockDelay;
		this.sequence = str.substring(pos + 25);
	}

	close() {
		mainWindow.removeEventListener("mousedown", this.mouseDownListener);
		mainWindow.removeEventListener("mousemove", this.mouseMoveListener);
		document.removeEventListener("mouseup", this.mouseUpListener);
		mainWindow.removeEventListener("mouseenter", this.mouseEnterListener);
		mainWindow.removeEventListener("mouseleave", this.mouseLeaveListener);
		mainWindow.removeEventListener("contextmenu", this.contextMenuListener);
		document.removeEventListener("keydown", this.keyDownListener);
		document.removeEventListener("keyup", this.keyUpListener);
		this.fileInputWrapper.style.display = "none";
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