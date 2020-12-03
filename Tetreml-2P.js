var playScreenImage = new Image();
playScreenImage.src = "Textures/Play screen two-player.png";

const music = {
	level1: new Music("twoPlayer_level1Opening", new Music("twoPlayer_level1Loop", undefined, false), false),
	level6: new Music("twoPlayer_level6Trigger", new Music("twoPlayer_level6Opening", new Music("twoPlayer_level6Loop", undefined, false), false), false),
	level11: new Music("twoPlayer_level11Trigger", new Music("twoPlayer_level11Opening", new Music("twoPlayer_level11Loop", undefined, false), false), false)
};

function loadControls() {
	keyMappingPlayer1 = {};
	for (let key of ["left", "right", "softDrop", "hardDrop", "rotateClockwise", "rotateCounterClockwise", "hold", "esc", "quitModifier", "volumeUp", "volumeDown"]) {
		keyMappingPlayer1[configuredControlsPlayer1[key]] = key;
		keyNamesPlayer1[key] = formatKeycode(configuredControlsPlayer1[key]);
	}
	keyMappingPlayer2 = {};
	for (let key of ["left", "right", "softDrop", "hardDrop", "rotateClockwise", "rotateCounterClockwise", "hold"]) {
		keyMappingPlayer2[configuredControlsPlayer2[key]] = key;
		keyNamesPlayer2[key] = formatKeycode(configuredControlsPlayer2[key]);
	}
}

function onControlsSave(controlsList) {
	configuredControlsPlayer1 = {
		left: controlsList[1][1][1],
		right: controlsList[1][2][1],
		softDrop: controlsList[1][3][1],
		hardDrop: controlsList[1][4][1],
		rotateCounterClockwise: controlsList[1][5][1],
		rotateClockwise: controlsList[1][6][1],
		hold: controlsList[1][7][1],
		esc: controlsList[0][1][1],
		quitModifier: controlsList[0][2][1],
		volumeDown: controlsList[0][3][1],
		volumeUp: controlsList[0][4][1],
	};
	configuredControlsPlayer2 = {
		left: controlsList[2][1][1],
		right: controlsList[2][2][1],
		softDrop: controlsList[2][3][1],
		hardDrop: controlsList[2][4][1],
		rotateCounterClockwise: controlsList[2][5][1],
		rotateClockwise: controlsList[2][6][1],
		hold: controlsList[2][7][1]
	};
	localStorage.tetrisTwoPlayerControlsMappingPlayer1 = JSON.stringify(configuredControlsPlayer1);
	localStorage.tetrisTwoPlayerControlsMappingPlayer2 = JSON.stringify(configuredControlsPlayer2);
	loadControls();
}

var configuredControlsPlayer1 = undefined;
var configuredControlsPlayer2 = undefined;
if ('tetrisTwoPlayerControlsMappingPlayer1' in localStorage) configuredControlsPlayer1 = JSON.parse(localStorage.tetrisTwoPlayerControlsMappingPlayer1); else {
	configuredControlsPlayer1 = { ...twoPlayerControlsMappingPlayer1 };
	localStorage.tetrisTwoPlayerControlsMappingPlayer1 = JSON.stringify(configuredControlsPlayer1);
}
if ('tetrisTwoPlayerControlsMappingPlayer2' in localStorage) configuredControlsPlayer2 = JSON.parse(localStorage.tetrisTwoPlayerControlsMappingPlayer2); else {
	configuredControlsPlayer2 = { ...twoPlayerControlsMappingPlayer2WithNumpad };
	localStorage.tetrisTwoPlayerControlsMappingPlayer2 = JSON.stringify(configuredControlsPlayer2);
}

var keyMappingPlayer1 = {};
var keyNamesPlayer1 = {};
var keyMappingPlayer2 = {};
var keyNamesPlayer2 = {};
loadControls();

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

const garbageAmounts = [0, 1, 2, 4, 0, 0, 1, 1, 2, 4, 6];

const comboAmounts = [0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5];

var warningPanNode = audioContext.createStereoPanner();
warningPanNode.connect(gainNode);

class SFXWarning {
	constructor() {
		this.ready = false;
		this.playing = false;
	}

	load() {
		let id = soundEffectConfig.warning;
		if ((id ?? 0) == 0) return;
		let request = new XMLHttpRequest();
		request.open('GET', `SFX/${id}.mp3${id > 0 ? "?cacheonly=true" : ""}`, true);
		request.responseType = 'arraybuffer';
		request.onload = () => {
			audioContext.decodeAudioData(request.response, (buffer) => {
				if (request.status != 200) {
					request.onerror();
					return;
				}
				this.buffer = buffer;
				this.ready = true;
				if (this.playing) this.play();
			}, (error) => { console.error(error); });
		};
		request.onerror = () => {
			console.warn(`Tetreml: Failed to retrieve sound effect with ID ${id}. This sound effect will not be played.`)
		};
		request.send();
	}

	play() {
		if (!this.ready || this.playing) return;
		this.source = audioContext.createBufferSource();
		this.source.buffer = this.buffer;
		this.source.loop = true;
		this.source.connect(warningPanNode);
		this.source.start();
		this.playing = true;
	}

	pause() {
		if (!this.ready || !this.playing) return;
		this.source.stop();
		this.playing = false;
	}
}

const sfx = {
	ready: new SFX("ready", gainNode),
	countdown: new SFX("countdown", gainNode),
	pause: new SFX("pause", gainNode),
	gameOver: new SFX("gameOver", gainNode),
	win: new SFX("win", gainNode),

	single: new SFX("single"),
	double: new SFX("double"),
	triple: new SFX("triple"),
	tetris: new SFX("tetris"),
	tSpinZero: new SFX("tSpinZero", gainNode),
	tSpin: new SFX("tSpin"),
	backToBack: new SFX("backToBack"),
	combo: [
		undefined,
		new SFX("combo1"),
		new SFX("combo2"),
		new SFX("combo3"),
		new SFX("combo4"),
		new SFX("combo5"),
		new SFX("combo6"),
		new SFX("combo7"),
		new SFX("combo8"),
		new SFX("combo9"),
		new SFX("combo10")
	],
	move: new SFX("move"),
	moveOnGround: new SFX("moveOnGround"),
	rotate: new SFX("rotate"),
	rotateOnGround: new SFX("rotateOnGround"),
	softDrop: new SFX("softDrop"),
	hardDrop: new SFX("hardDrop"),
	lock: new SFX("lock"),
	softLock: new SFX("softLock"),
	land: new SFX("land"),
	hold: new SFX("hold"),
	allClear: new SFX("allClear"),
	afterClear: new SFX("afterClear"),
	attack: new SFX("attack"),
	attackNear: new SFX("attackNear"),
	attackDetonating: new SFX("attackDetonating"),
	garbageInsertion: new SFX("garbageInsertion"),
	defend: new SFX("defend"),
	warning: new SFXWarning()
};

loadSoundEffectConfig(() => {
	for (let s of Object.values(sfx)) if (s instanceof SFX) s.load();
	for (let i = 1; i < 11; i++) sfx.combo[i].load();
	sfx.warning.load();
});

loadMusicConfig(() => {
	for (let m of Object.values(music)) m.load();
});

const panNodes = [];
for (let i = 0; i < 2; i++) {
	let node = audioContext.createStereoPanner();
	node.connect(gainNode);
	panNodes.push(node);
}

var volume;

function setVolume(newVolume) {
	volume = Math.max(0, Math.min(10, newVolume));
	localStorage.tetrisVolume = volume;
	newVolume = Math.pow(volume / 10, 4);
	gainNode.gain.value = newVolume;
}

setVolume(localStorage.tetrisVolume == undefined ? 10 : Number.parseInt(localStorage.tetrisVolume));

function sum(elements) {
	let s = 0;
	for (e of elements) s += e;
	return s;
}

class GarbageGeneratorTetris99 {
	// Generates garbage similar to Tetris 99: Holes usually line up and there is only 1 mino missing on each line.
	constructor() {
		this.nextPos = 0;
	}

	generate() {
		if (this.nextPos == 0) {
			this.currentLine = [];
			for (let i = 0; i < 10; i++) this.currentLine[i] = new Mino(0, 0);
			this.currentLine[Math.floor(Math.random()*9.9999)] = undefined;
			this.nextPos = 2 + Math.floor(Math.random()*2.9999);
		} else this.nextPos--;
		return [...this.currentLine];
	}
}

class GarbageGeneratorTwoHole {
	// Generates garbage with two holes on each line and they usually line up.
	constructor() {
		this.nextPos = 0;
	}

	generate() {
		if (this.nextPos == 0) {
			this.currentLine = [];
			for (let i = 0; i < 10; i++) this.currentLine[i] = new Mino(0, 0);
			let bag = [...zeroToNine];
			this.currentLine[bag.splice(Math.floor(Math.random()*9.9999), 1)[0]] = undefined;
			this.currentLine[bag.splice(Math.floor(Math.random()*8.9999), 1)[0]] = undefined;
			this.nextPos = 2 + Math.floor(Math.random()*2.9999);
		} else this.nextPos--;
		return [...this.currentLine];
	}
}

class GarbageGeneratorHandicapped {
	// Generates handicapped lines as garbage.
	generate() {
		let bag = [...zeroToNine];
		let minos = 6 + (Math.random() > 0.5 ? 2 : 0); // The number of minos must be even so that the "ALL CLEAR" can happen.
		let line = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
		for (let i = 0; i < minos; i++) {
			line[bag.splice(Math.floor(Math.random()*bag.length-0.00001), 1)[0]] = new Mino(0, 0);
		}
		return [...line];
	}
}

class GameOverScreen {
	constructor(parent, playScreen) {
		this.parent = parent;
		this.playScreen = playScreen;
		this.scrollPos = [0, 0];
		this.content = [playScreen.playfields[0].getStats(), playScreen.playfields[1].getStats()];
		this.top = 83;
		this.left = [73, 457];
		this.right = [180, 564];
		this.scrollbarX = [186, 570];
	}

	init() {
		document.addEventListener('keydown', this.keydown = (key) => { this.onKeyDown(key.code); });
	}

	onKeyDown(key) {
		switch (key) {
			case "KeyW":
				this.scrollPos[0] = Math.max(this.scrollPos[0] - 1, 0);
				break;
			case "KeyS":
				this.scrollPos[0] = Math.min(this.scrollPos[0] + 1, this.content[0].length-5);
				break;
			case "ArrowUp":
				this.scrollPos[1] = Math.max(this.scrollPos[1] - 1, 0);
				break;
			case "ArrowDown":
				this.scrollPos[1] = Math.min(this.scrollPos[1] + 1, this.content[1].length-5);
				break;
		}
	}

	render() {
		this.playScreen.render();
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		for (let i = 0; i < 2; i++) {
			let content = this.content[i];
			let startPos = this.scrollPos[i];
			ctx.textAlign = "left";
			for (let j = 0; j < 5; j++) ctx.fillText(content[startPos + j][0], this.left[i], this.top + 33 * j);
			ctx.textAlign = "right";
			for (let j = 0; j < 5; j++) ctx.fillText(content[startPos + j][1], this.right[i], this.top + 15 + 33 * j);
			let scrollbarHeight = 785 / content.length;
			ctx.fillRect(this.scrollbarX[i], this.top - 10 + (157 - scrollbarHeight) * startPos / (content.length - 5), 1, scrollbarHeight);
		}
		ctx.textAlign = "center";
		ctx.fillText(`Press ${keyNamesPlayer1.esc} to continue.`, 320, 325);
		ctx.fillText(`Press ${keyNamesPlayer1.quitModifier}+${keyNamesPlayer1.hold} to restart.`, 320, 340);
	}

	close() {
		document.removeEventListener("keydown", this.keydown);
		for (let i = 0; i < 2; i++) this.playScreen.playfields[i].close();
		currentSong = null;
	}
}

class PlayScreen {
	constructor(parent, scoring, levels, handicappedLines, garbageType, autoRepeatDelay, autoRepeatPeriod, softDropPeriod, lineClearDelayEnabled, showKeystrokes, stereoSeparation) {
		this.parent = parent;
		this.levels = levels;
		this.level = 1;
		let time = new Date().getTime();
		this.playfields = [
			new Playfield(this, 68, 6, 209, 278, 0, keyMappingPlayer1, time, garbageType, new scoring(), panNodes[0]),
			new Playfield(this, 452, 6, 322, 278, 1, keyMappingPlayer2, time, garbageType, new scoring(), panNodes[1])
		];
		for (let line = 39; line > 39 - handicappedLines; line--) {
			let bag = [...zeroToNine];
			let minos = 6 + (Math.random() > 0.5 ? 2 : 0); // The number of minos must be even so that the "ALL CLEAR" can happen.
			for (let i = 0; i < minos; i++) {
				let minoIndex = bag.splice(Math.floor(Math.random() * bag.length), 1);
				for (let j = 0; j < 2; j++) this.playfields[j].board[minoIndex][line] = new Mino(0, 0);
			}
			for (let j = 0; j < 2; j++) {
				this.playfields[j].totalMinos += (this.playfields[j].minos[line] = minos);
			}
		}
		for (let i = 0; i < 2; i++) {
			let playfield = this.playfields[i];
			playfield.autoRepeatDelay = autoRepeatDelay[i];
			playfield.autoRepeatPeriod = autoRepeatPeriod[i];
			playfield.softDropPeriod = softDropPeriod[i];
			playfield.lineClearDelayEnabled = lineClearDelayEnabled;
			playfield.showKeystrokes = showKeystrokes[i];
			playfield.stackMinY = 40 - handicappedLines;
		}
		this.state = GameState.warmup;
		this.warmupLeft = 5;
		this.warmupSecond = 0;
		this.lines = 0;
		this.linesOfCurrentLevel = 0;
		this.totalLinesToNextLevel = 0;
		this.playTime = 0;
		this.buttonEsc = false;
		this.esc = false;
		this.p = false;
		this.oldTime = null;
		this.levelUpTime = 0;
		this.warning = false;
		this.buttonVolumeDown = false;
		this.buttonVolumeUp = false;
		this.volumeDisplayTime = 0;
		this.stereoSeparation = stereoSeparation;
	}

	init() {
		for (let i = 0; i < 2; i++) this.playfields[i].init();
		this.totalLinesToNextLevel = this.levels[1][0];
		sfx.ready.play();
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

		if (this.playfields[0].buttonStatus.esc) {
			if (!this.buttonEsc) {
				switch (this.state) {
					case GameState.playing:
						if (this.playfields[0].buttonStatus.quitModifier) {
							if (this.warning) sfx.warning.pause();
							currentSong.pause();
							goBack();
							break;
						}
						this.pause();
						break;
					case GameState.paused:
						if (this.playfields[0].buttonStatus.quitModifier) {
							currentSong.pause();
							goBack();
							break;
						}
						this.state = GameState.playing;
						currentSong.resume();
						if (this.warning) sfx.warning.play();
						break;
					case GameState.over:
						goBack();
						break;
				}
				this.buttonEsc = true;
			}
		} else this.buttonEsc = false;

		if (this.playfields[0].buttonStatus.volumeUp) {
			if (!this.buttonVolumeUp) {
				setVolume(volume + 1);
				this.volumeDisplayTime = 1000;
				this.buttonVolumeUp = true;
			}
		} else this.buttonVolumeUp = false;

		if (this.playfields[0].buttonStatus.volumeDown) {
			if (!this.buttonVolumeDown) {
				setVolume(volume - 1);
				this.volumeDisplayTime = 1000;
				this.buttonVolumeDown = true;
			}
		} else this.buttonVolumeDown = false;

		if (this.playfields[0].buttonStatus.quitModifier && this.playfields[0].buttonStatus.hold && (this.state == GameState.paused || this.state == GameState.over)) this.keymappingScreen.openGameScreen();

		ctx.globalAlpha = 1;
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(playScreenImage, 0, 0);
		for (let i = 0; i < 2; i++) this.playfields[i].render(timePassed);
		
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";

		ctx.textAlign = "left";
		ctx.fillText("Level " + this.level, 230, 170);
		ctx.fillText("Lines: " + this.lines, 230, 196);
		ctx.fillText("Time elapsed", 230, 249);

		ctx.textAlign = "right";
		let isLastLevel = this.level == this.levels.length;
		ctx.fillText("" + (isLastLevel ? "" : this.level + 1), 410, 170);
		ctx.fillText("" + (isLastLevel ? "" : this.totalLinesToNextLevel), 410, 196);
		if (!isLastLevel)
			ctx.fillRect(230, 174, 180 * (this.linesOfCurrentLevel / this.levels[this.level][0]), 10);
		ctx.fillText(formatDuration(Math.floor(this.playTime / 1000)), 410, 249);

		if (this.state == GameState.warmup) {
			this.warmupSecond -= timePassed;
			if (this.warmupSecond < 1) {
				this.warmupLeft--;
				if (this.warmupLeft == -1) {
					for (let i = 0; i < 2; i++) this.playfields[i].start();
					this.state = GameState.playing;
					music.level1.play();
				} else {
					this.warmupSecond += 1000;
					if (this.warmupLeft < 3) sfx.countdown.play();
				}
			}
		}

		switch (this.state) {
			case GameState.warmup:
				ctx.textAlign = "center";
				if (this.volumeDisplayTime > 0) {
					ctx.fillText(`Volume: ${volume} / 10`, 320, 17);
					this.volumeDisplayTime -= timePassed;
				}
				ctx.fillStyle = "#FF0";
				if (this.warmupLeft > 2) {
					if (this.warmupLeft == 3) ctx.globalAlpha = this.warmupSecond / 1000;
					ctx.font = "300 30px Tetreml";
					ctx.fillText("READY", 320, 105);
					ctx.globalAlpha = 1;
				} else {
					ctx.font = "300 45px Tetreml";
					ctx.fillText("" + this.warmupLeft, 320, 113);
				}
				break;
			case GameState.playing:
				this.playTime += timePassed;
				ctx.textAlign = "center";
				if (this.volumeDisplayTime > 0) {
					ctx.fillText(`Volume: ${volume} / 10`, 320, 17);
					this.volumeDisplayTime -= timePassed;
				} else {
					ctx.fillText(this.playfields[0].buttonStatus.quitModifier ? `${keyNamesPlayer1.quitModifier}+${keyNamesPlayer1.esc} Quit` : `${keyNamesPlayer1.esc} Pause`, 320, 17);
					if (this.playfields[0].buttonStatus.quitModifier) ctx.fillText(`${keyNamesPlayer1.quitModifier}+${keyNamesPlayer1.hold} Restart`, 320, 32);
				}
				if (this.levelUpTime > 0) {
					ctx.fillText("LEVEL", 320, 75);
					ctx.font = "300 30px Tetreml";
					ctx.fillText("" + this.level, 320, 105);
					this.levelUpTime -= timePassed;
				}
				break;
			case GameState.paused:
				ctx.textAlign = "center";
				ctx.font = "20px Tetreml";
				ctx.fillText("PAUSED", 320, 75);
				ctx.font = "12px Tetreml";
				ctx.fillText(keyNamesPlayer1.esc + " to continue.", 320, 90);
				if (this.volumeDisplayTime > 0) {
					ctx.fillText(`Volume: ${volume} / 10`, 320, 17);
					this.volumeDisplayTime -= timePassed;
				} else if (this.playfields[0].buttonStatus.quitModifier) {
					ctx.fillText(`${keyNamesPlayer1.quitModifier}+${keyNamesPlayer1.esc} Quit`, 320, 17);
					ctx.fillText(`${keyNamesPlayer1.quitModifier}+${keyNamesPlayer1.hold} Restart`, 320, 32);
				}
				break;
			case GameState.over:
				ctx.textAlign = "center";
				if (this.volumeDisplayTime > 0) {
					ctx.fillText(`Volume: ${volume} / 10`, 320, 17);
					this.volumeDisplayTime -= timePassed;
				}
				break;
		}
	}

	pause(playSound = true) {
		this.state = GameState.paused;
		currentSong.pause();
		if (this.warning) sfx.warning.pause();
		if (playSound) sfx.pause.play();
	}

	close() {
	}
	
	getFallInterval() {
		return this.levels[this.level - 1][1];
	}

	getLockDelay() {
		return this.levels[this.level - 1][2];
	}

	addLines(lines) {
		this.lines += lines;
		this.linesOfCurrentLevel += lines;
		if (this.level < this.levels.length && this.linesOfCurrentLevel >= this.levels[this.level][0]) {
			this.linesOfCurrentLevel -= this.levels[this.level][0];
			this.level++;
			if (this.level != this.levels.length) this.totalLinesToNextLevel += this.levels[this.level][0];
			switch (this.level) {
				case 6:
					music.level6.play(music.level6.id == 0);
					this.levelUpTime = 3000;
					break;
				case 11:
					music.level11.play(music.level11.id == 0);
					this.levelUpTime = 3000;
					break;
			}
		}
	}

	updateWarning() {
		let danger = [this.playfields[0].isInDanger(), this.playfields[1].isInDanger()];
		warningPanNode.pan.value = danger[0] ? danger[1] ? 0 : -this.stereoSeparation : this.stereoSeparation;
		if (this.warning != (danger[0] || danger[1])) {
			this.warning = (danger[0] || danger[1]);
			if (this.warning) {
				sfx.warning.currentTime = 0;
				sfx.warning.play();
			} else sfx.warning.pause();
		}
	}

	gameOver(player) {
		this.state = GameState.over;
		currentSong.pause();
		if (this.warning) sfx.warning.pause();
		this.loser = player;
		sfx.win.play();
		openGui(new GameOverScreen(this.parent, this));
	}
}

class Playfield {
	constructor(parent, xPos, yPos, keystrokesX, keystrokesY, player, keyMapping, seed, garbageType, scoring, panNode) {
		this.xPos = xPos;
		this.yPos = yPos;
		this.player = player;
		this.keyMapping = keyMapping;
		this.random = new MersenneTwister(seed);
		this.scoring = scoring;
		switch (garbageType) {
			case 0: this.garbageGenerator = new GarbageGeneratorTetris99(); break;
			case 1: this.garbageGenerator = new GarbageGeneratorTwoHole(); break;
			case 2: this.garbageGenerator = new GarbageGeneratorHandicapped(); break;
		}
		this.parent = parent;
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
		this.current = null;
		this.queue = [];
		this.hold = null;
		this.combo = -1;
		this.backToBack = false;
		this.moveCounter = 0;
		this.softDropCounter = -1;
		this.buttonMoveLeft = false;
		this.moveLeftCounter = -1;
		this.oldMoveLeftCounter = -1;
		this.buttonMoveRight = false;
		this.moveRightCounter = -1;
		this.oldMoveRightCounter = -1;
		this.moveLock = 0; // 0: None; 1: Left; 2: Right.
		this.moveDisabledLeft = this.moveDisabledRight = false;
		this.autoRepeatDelay = 150;
		this.autoRepeatPeriod = 40;
		this.softDropPeriod = 25;
		this.fallTime = 0;
		this.lockTime = 0;
		this.maxY = 0;
		this.clearTime = 0;
		this.oldTime = null;
		this.buttonHardDrop = false;
		this.buttonRotateClockwise = false;
		this.buttonRotateCounterClockwise = false;
		this.buttonHold = false;
		this.rewardName = "";
		this.rewardAmount = 0;
		this.rewardTime = 0;
		this.lockScore = 0;
		this.lockScoreLine = 0;
		this.lockScoreTime = 0;
		this.allClearTime = 0;
		this.holdSwitched = false;
		this.clearedLines = [];
		this.clearEffectTime = 1000;
		this.buttonStatus = {
			left: false,
			right: false,
			softDrop: false,
			hardDrop: false,
			rotateClockwise: false,
			rotateCounterClockwise: false,
			hold: false,
			esc: false,
			quitModifier: false
		}
		this.panNode = panNode;
		this.garbageQueue = [];
		this.garbagePhase = 0; // 0: Preparing; 1: Near; 2: Detonating.
		this.garbageTime = 0;
		this.attackProcessed = false;
		this.stackMinY = 40;
		this.warningTime = 0;
		// Stats
		this.tetriminoes = 0;
		this.lines = 0;
		this.linesByType = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		this.maxCombo = -1;
		this.backToBacks = 0;
		this.attacks = 0;
		this.defenses = 0;
		this.received = 0;
		this.holds = 0;
		this.allClears = 0;
		this.keystrokesX = keystrokesX;
		this.keystrokesY = keystrokesY;
		this.particles = [];
	}

	playSfx(sfx) {
		sfx.play(this.panNode);
	}

	init() {
		document.addEventListener("keydown", this.keyDownHandler = (key) => {
			let code = key.code;
			if (!(code in this.keyMapping)) return;
			this.buttonStatus[this.keyMapping[code]] = true;
		});
		document.addEventListener("keyup", this.keyUpHandler = (key) => {
			let code = key.code;
			if (!(code in this.keyMapping)) return;
			this.buttonStatus[this.keyMapping[code]] = false;
		});

		this.pushToQueue();
	}

	start() {
		this.nextTetrimino();
		this.processInstaFall();
	}

	isMinoVisible(x, y) {
		return x > -1 && x < 10 && y > -1 && y < 40 && this.board[x][y] != undefined;
	}

	render(timePassed) {
		// Process game logic.
		if (this.parent.state == GameState.playing) {
			this.clearTime -= timePassed;
			this.fallTime -= Math.min(0, this.clearTime);
			if (this.clearTime < 1 && this.current == null) this.afterClear();
			this.clearTime = Math.max(0, this.clearTime);
			if (this.garbageQueue.length != 0) {
				this.garbageTime += timePassed;
				if (this.garbagePhase != 2) {
					let currentDeadline = this.parent.level > 10 ? 500 : this.parent.level > 5 ? 1500 : 2500;
					if (this.garbageTime >= currentDeadline) {
						this.garbageTime -= currentDeadline;
						switch (++this.garbagePhase) {
							case 1: this.playSfx(sfx.attackNear); break;
							case 2: this.playSfx(sfx.attackDetonating); break;
						}
					}
				}
			}
			if (this.current != null) if (this.current.canFall(this.board)) {
				let fell = false;
				while (this.current.canFall(this.board) && this.fallTime >= this.parent.getFallInterval()) {
					if (++this.current.y > this.maxY) {
						this.lockTime = 0;
						this.moveCounter = 0;
						this.maxY = this.current.y;
					}
					fell = true;
					this.fallTime -= this.parent.getFallInterval();
				}
				if (!this.current.canFall(this.board)) this.playSfx(sfx.land);
				if (fell) {
					this.current.onMove();
					this.lockTime = this.fallTime;
				}
			} else {
				if ((this.lockTime += timePassed) >= this.parent.getLockDelay()) {
					this.lock(false);
					this.playSfx(sfx.lock);
				}
			}
			this.fallTime = this.parent.getFallInterval() == 0 ? 0 : this.fallTime % this.parent.getFallInterval();
			if (this.buttonStatus.softDrop) {
				if (this.softDropCounter == -1) {
					if (this.current != null) this.softDrop();
					this.softDropCounter = 0;
				} else {
					this.softDropCounter += timePassed;
					if (this.current != null) for (let i = 0; i < Math.floor(this.softDropCounter / this.softDropPeriod); i++) if (this.softDrop()) break;
					this.softDropCounter %= this.softDropPeriod;
				}
			} else {
				this.softDropCounter = -1;
			}
			if (this.buttonStatus.hardDrop) {
				if (this.current != null && !this.buttonHardDrop) {
					let start = this.current.y + this.current.baseY[this.current.state];
					while (this.current.canFall(this.board)) {
						if (Math.random() < 0.25) this.spawnParticle();
						this.current.y++;
					}
					let end = this.current.y + this.current.baseY[this.current.state];
					this.score += this.scoring.getHardDropScore(start, end);
					if (start != end) this.current.onMove();
					this.playSfx(start != end ? sfx.hardDrop : sfx.softLock);
					for (let i = 0; i < 3; i++) this.spawnParticle();
					this.lock(true);
					this.processInstaFall();
					this.buttonHardDrop = true;
				}
			} else this.buttonHardDrop = false;
			if (this.buttonStatus.rotateClockwise) {
				if (this.current != null && !this.buttonRotateClockwise) {
					let inAir = this.current.canFall(this.board);
					if (this.current.rotateClockwise(this.board)) {
						this.processInstaFall();
						this.playSfx(inAir ? sfx.rotate : sfx.rotateOnGround);
						if (this.moveCounter++ < 15) this.lockTime = 0;
					}
					this.buttonRotateClockwise = true;
				}
			} else this.buttonRotateClockwise = false;
			if (this.buttonStatus.rotateCounterClockwise) {
				if (this.current != null && !this.buttonRotateCounterClockwise) {
					let inAir = this.current.canFall(this.board);
					if (this.current.rotateCounterClockwise(this.board)) {
						this.processInstaFall();
						this.playSfx(inAir ? sfx.rotate : sfx.rotateOnGround);
						if (this.moveCounter++ < 15) this.lockTime = 0;
					}
					this.buttonRotateCounterClockwise = true;
				}
			} else this.buttonRotateCounterClockwise = false;
			if (this.buttonStatus.hold) {
				if (!this.buttonHold) {
					if (this.buttonStatus.quitModifier) {
						this.parent.pause(false);
						this.parent.keymappingScreen.openGameScreen();
					} else if (this.current != null && !this.holdSwitched) {
						this.oldHold = this.hold;
						this.hold = this.current;
						if (this.oldHold == null) this.nextTetrimino(); else {
							this.current = this.oldHold;
							this.current.reset();
							this.fallTime = 0;
							this.lockTime = 0;
							this.moveCounter = 0;
							this.holds++;
							this.checkGameOver();
						}
						this.processInstaFall();
						this.playSfx(sfx.hold);
						this.holdSwitched = true;
						this.buttonHold = true;
					}
				}
			} else this.buttonHold = false;

			if (this.buttonStatus.left) {
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

			if (this.buttonStatus.right) {
				if (!this.moveDisabledRight && (!this.buttonMoveRight || this.moveLock != 1)) {
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

			if (this.allClearTime > 0) {
				ctx.fillStyle = "#FFF";
				ctx.textAlign = "center";
				ctx.font = "16px Tetreml";
				ctx.fillText("ALL CLEAR", this.xPos + 60, this.yPos + 40);
				ctx.fillText("1000 points", this.xPos + 60, this.yPos + 61);
				this.allClearTime -= timePassed;
			}
		}

		// Actually render things on the screen.
		ctx.fillStyle = "#FFF";
		ctx.font = "350 13px Tetreml";
		ctx.textAlign = "center";
		ctx.fillText("HOLD", this.xPos-32, this.yPos+15);
		ctx.fillText("NEXT", this.xPos+152, this.yPos+15);

		ctx.fillStyle = "#F00";
		if (this.isInDanger()) this.warningTime = Math.min(500, this.warningTime + timePassed);
		else this.warningTime = Math.max(0, this.warningTime - timePassed);
		if (this.parent.state != GameState.paused && this.stackMinY < 24) {
			ctx.globalAlpha = 0.4;
			ctx.fillRect(this.xPos, this.yPos + 23, 120, 2);
			if (this.parent.state != GameState.over || this.parent.loser != this.player) {
				ctx.globalAlpha = 0.6;
				for (let mino of this.queue[0].states[0]) ctx.drawImage(sprite, 19, 144, 12, 12, this.xPos + 12 * (4 + mino[0]), this.yPos + 12 * (1 + mino[1]), 12, 12);
			}
		}
		ctx.globalAlpha = this.warningTime / 2500;
		ctx.fillRect(this.xPos, this.yPos, 120, 264);
		ctx.fillStyle = "#FFF";
		if (this.parent.state != GameState.paused) {
			ctx.imageSmoothingEnabled = false;
			ctx.globalAlpha = 0.7;
			for (let x = 0; x < 10; x++) {
				for (let y = 18; y < 40; y++) {
					let mino = this.board[x][y];
					if (mino != undefined) {
						this.renderMino(x, y, mino.directions, mino.textureY);
						let minoX = this.xPos + x * 12;
						let minoY = this.yPos + 12 * (y - 18);
						let uldr = this.isMinoVisible(x + 1, y) << 3 | this.isMinoVisible(x, y - 1) << 2 | this.isMinoVisible(x - 1, y) << 1 | this.isMinoVisible(x, y + 1); // Up left down right.
						ctx.drawImage(outlineSprite, 12 * uldr, 96, 12, 12, minoX, minoY, 12, 12);
						if (!this.isMinoVisible(x-1, y-1) && (uldr & 0b0110) == 0b0110) ctx.drawImage(outlineSprite, 0, 108, 12, 12, minoX, minoY, 12, 12);
						if (!this.isMinoVisible(x+1, y-1) && (uldr & 0b1100) == 0b1100) ctx.drawImage(outlineSprite, 12, 108, 12, 12, minoX, minoY, 12, 12);
						if (!this.isMinoVisible(x+1, y+1) && (uldr & 0b1001) == 0b1001) ctx.drawImage(outlineSprite, 24, 108, 12, 12, minoX, minoY, 12, 12);
						if (!this.isMinoVisible(x-1, y+1) && (uldr & 0b0011) == 0b0011) ctx.drawImage(outlineSprite, 36, 108, 12, 12, minoX, minoY, 12, 12);
					}
				}
			}
			ctx.globalAlpha = 1;
			if (this.current != null && (this.parent.state != GameState.over || this.parent.loser != this.player)) {
				for (let ghostY = this.current.y; true; ghostY++) {
					if (this.current.checkCollision(this.board, null, ghostY)) {
						let tetriminoX = this.xPos + this.current.x * 12;
						let tetriminoY = this.yPos + 12 * (ghostY - 19);
						for (let mino of this.current.states[this.current.state])
							if (ghostY + mino[1] > 18) ctx.drawImage(outlineSprite, mino[2] * 12, this.current.textureY * 12, 12, 12, tetriminoX + mino[0] * 12, tetriminoY + mino[1] * 12, 12, 12);
						break;
					}
				}
				this.current.render(this);
			}
			if (this.hold != null) this.renderTetrimino(this.hold, this.xPos - 44, this.yPos + 36, this.holdSwitched);
			for (let i = 0; i < 3; i++) this.renderTetrimino(this.queue[i], this.xPos + 140, this.yPos + 36 + 36 * i);

			if (this.garbageQueue.length != 0) {
				let x = this.xPos - 15;
				let y = this.yPos + 263;
				let textureY = (this.garbagePhase == 2) && (this.parent.state == GameState.playing) && (Math.floor(this.garbageTime / 250) % 2 == 1) ? 128 : 140 + 12 * this.garbagePhase;
				for (let i = 0; i < this.garbageQueue[0]; i++) {
					ctx.drawImage(sprite, 0, textureY, 12, 12, x, y -= 12, 12, 12);
				}
				for (let j = 1; j < this.garbageQueue.length; j++) {
					y -= 4;
					for (let i = 0; i < this.garbageQueue[j]; i++) {
						ctx.drawImage(sprite, 0, 128, 12, 12, x, y -= 12, 12, 12);
					}
				}
			}

			ctx.fillStyle = "#FFF";
			this.scoring.renderLockScore(timePassed, this.xPos, this.yPos);
		}
		ctx.globalAlpha = 1;
		
		ctx.imageSmoothingEnabled = true;

		if (this.showKeystrokes) {
			ctx.drawImage(sprite, this.buttonStatus.hardDrop ? 28 : 12, 128, 16, 16, this.keystrokesX + 18, this.keystrokesY, 16, 16);
			ctx.drawImage(sprite, this.buttonStatus.left ? 28 : 12, 128, 16, 16, this.keystrokesX, this.keystrokesY + 18, 16, 16);
			ctx.drawImage(sprite, this.buttonStatus.softDrop ? 28 : 12, 128, 16, 16, this.keystrokesX + 18, this.keystrokesY + 18, 16, 16);
			ctx.drawImage(sprite, this.buttonStatus.right ? 28 : 12, 128, 16, 16, this.keystrokesX + 36, this.keystrokesY + 18, 16, 16);
			ctx.drawImage(sprite, this.buttonStatus.rotateCounterClockwise ? 28 : 12, 128, 16, 16, this.keystrokesX + 59, this.keystrokesY, 16, 16);
			ctx.drawImage(sprite, this.buttonStatus.rotateClockwise ? 28 : 12, 128, 16, 16, this.keystrokesX + 77, this.keystrokesY, 16, 16);
			ctx.drawImage(sprite, this.buttonStatus.hold ? 78 : 44, 128, 34, 16, this.keystrokesX + 59, this.keystrokesY + 18, 34, 16);
		}

		if (this.parent.state != GameState.paused) {
			let newParticles = [];
			for (let particle of this.particles) {
				let ratio = particle.time / particle.lifetime;
				ctx.drawImage(sprite, 34, 146, 7, 7, particle.x + 3.5 * ratio, particle.y - particle.distance * (1 - Math.pow((1 - ratio), 4)) - 3.5 * ratio, 7 * (1 - ratio), 7 * (1 - ratio));
				if ((particle.time += timePassed) < particle.lifetime) newParticles.push(particle);
			}
			this.particles = newParticles;
		}

		if (this.clearEffectTime < 151) {
			let ratio = this.clearEffectTime / 150;
			ctx.fillStyle = "rgb(255, 255, " + (255 * (1-ratio)) + ")";
			for (let line of this.clearedLines) ctx.fillRect(this.xPos - 24 * ratio, this.yPos + 12 * (line - 18) + 6 * ratio, 120 + 48 * ratio, 12 * (1 - ratio));
			this.clearEffectTime += timePassed;
		}

		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "right";
		if (this.combo > 0) ctx.fillText("" + this.combo, this.xPos + 122, this.yPos + 326);
		ctx.textAlign = "left";
		if (this.combo > 0) ctx.fillText("COMBO", this.xPos - 13, this.yPos + 326);
		if (this.rewardTime != 0) {
			this.rewardTime = Math.max(0, this.rewardTime - timePassed);
			ctx.fillText(this.rewardName, this.xPos - 13, this.yPos + 311, 130 - ctx.measureText(this.rewardAmount).width);
			ctx.textAlign = "right";
			if (this.rewardTime != 0) ctx.fillText(this.rewardAmount, this.xPos + 122, this.yPos + 311);
		}

		ctx.font = "20px Tetreml";
		ctx.textAlign = "right";
		ctx.fillText(this.score + "", this.xPos + 122, this.yPos + 290);

		if (this.parent.state == GameState.over) {
			ctx.globalAlpha = 0.6;
			ctx.fillStyle = "#000";
			ctx.fillRect(this.xPos, this.yPos, 120, 264);
			ctx.globalAlpha = 1;
			ctx.fillStyle = "#FFF";
			ctx.font = "16px Tetreml";
			ctx.textAlign = "center";
			ctx.fillText(this.parent.loser == this.player ? "GAME OVER" : "WINNER", this.xPos + 60, this.yPos + 40);
		}
	}

	close() {
		document.removeEventListener("keydown", this.keyDownHandler);
		document.removeEventListener("keyup", this.keyUpHandler);
	}

	renderMino(x, y, directions, textureY) {
		if (y < 18 || y > 39) return;
		ctx.drawImage(sprite, 12 * directions, textureY * 12, 12, 12, this.xPos + x * 12, this.yPos + 12*(y-18), 12, 12);
	}

	renderTetrimino(tetrimino, x, y, gray = false) {
		if (!(tetrimino instanceof TetriminoI) && !(tetrimino instanceof TetriminoO)) x += 6;
		if (tetrimino instanceof TetriminoI) y -= 6;
		for (let mino of tetrimino.states[0]) {
			ctx.drawImage(sprite, 12 * mino[2], gray ? 0 : tetrimino.textureY * 12, 12, 12, x + 12 * mino[0], y + 12 * mino[1], 12, 12);
		}
	}

	afterClear() {
		if (this.lineClearDelayEnabled && this.clearedLines.length != 0) this.playSfx(sfx.afterClear);
		for (let line of this.clearedLines) {
			for (let i = 0; i < 10; i++) {
				this.board[i].splice(line, 1);
				this.board[i] = [undefined].concat(this.board[i]);
			}
			this.minos.splice(line, 1);
			this.minos = [0].concat(this.minos);
		}
		this.clearedLines = [];
		this.nextTetrimino();
	}

	move(offset) {
		if (this.parent.state != GameState.playing || this.current == null) return false;
		let newX = this.current.x + offset;
		if (!this.current.checkCollision(this.board, newX, this.current.y)) {
			this.playSfx(this.current.canFall(this.board) ? sfx.move : sfx.moveOnGround);
			this.current.x = newX;
			this.current.onMove();
			if (this.moveCounter++ < 15) this.lockTime = 0;
			if (!this.processInstaFall() && this.current.checkCollision(this.board, newX + offset, this.current.y)) this.playSfx(sfx.land);
			return true;
		}
		return false;
	}

	softDrop() {
		if (this.current.canFall(this.board)) {
			if (++this.current.y > this.maxY) {
				this.lockTime = 0;
				this.moveCounter = 0;
				this.maxY = this.current.y;
			}
			this.current.onMove();
			this.score += this.scoring.getSoftDropScore();
			this.playSfx(sfx.softDrop);
			if (!this.current.canFall(this.board)) this.playSfx(sfx.land);
			return false;
		}
		return true;
	}

	spawnParticle() {
		let current = this.current;
		this.particles.push({
			x: this.xPos + 12 * (current.x + current.leftX[current.state] - 0.5 + (current.width[current.state] + 1) * Math.random()),
			y: this.yPos + 12 * (current.y + current.topY[current.state] - 19),
			distance: 12 * (0.5 + 1.5 * Math.random()),
			lifetime: 250 + 500 * Math.random(),
			time: 0
		});
	}

	lock(isDrop) {
		this.garbageLines = 0;
		this.attackProcessed = false;
		this.tetriminoes++;
		let toClear = [];
		let tSpinType = this.current.getTSpinType(this.board);
		for (let mino of this.current.getLockPositions()) {
			this.board[mino[0]][mino[1]] = new Mino(mino[2], this.current.textureY);
			if (++this.minos[mino[1]] == 10) toClear.push(mino[1]);
		}
		this.totalMinos += 4;
		let baseline = this.current.y + this.current.baseY[this.current.state];
		if (baseline < 20) {
			this.parent.gameOver(this.player);
			return;
		}
		this.stackMinY = Math.min(this.current.y + this.current.topY[this.current.state], this.stackMinY);
		this.score += this.scoring.getLockScore(baseline, this.parent.level, isDrop);
		if (tSpinType) this.playSfx(toClear.length == 0 ? sfx.tSpinZero : sfx.tSpin);
		this.addReward(rewardIndexMapping[tSpinType] + toClear.length);
		if (toClear.length != 0) {
			this.clearLines(toClear);
		} else {
			this.combo = -1;
			this.nextTetrimino();
		}
		this.parent.updateWarning();

		if (!this.lineClearDelayEnabled && this.clearTime > 0) {
			this.clearTime = 0;
			this.afterClear();
		}
		if (this.clearTime == 0) this.moveDisabledLeft = this.moveDisabledRight = true;
		else this.buttonRotateClockwise = this.buttonRotateCounterClockwise = this.buttonHold = false; // Trigger the IRS.
	}

	processInstaFall() {
		if (this.parent.state != GameState.playing || this.current == null || this.parent.getFallInterval() != 0) return false;
		let fell = false;
		while (this.current.canFall(this.board)) {
			this.current.y++;
			fell = true;
		}
		this.playSfx(sfx.land);
		if (fell) {
			this.maxY = this.current.y;
			this.current.onMove();
		}
		return true;
	}

	addGarbage(lines) {
		let total = 0;
		for (let i of this.garbageQueue) total += i;
		lines = Math.min(12 - total, lines);
		if (lines > 0) {
			this.garbageQueue.push(lines);
			this.playSfx(sfx.attack);
			this.received += lines;
			return lines;
		}
		return 0;
	}

	isInDanger() {
		return this.stackMinY - sum(this.garbageQueue) < 24;
	}

	clearLines(toClear) {
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
		this.parent.addLines(toClear.length);
		this.clearTime = 500;
		switch (toClear.length) {
			case 1: this.playSfx(sfx.single); break;
			case 2: this.playSfx(sfx.double); break;
			case 3: this.playSfx(sfx.triple); break;
			case 4: this.playSfx(sfx.tetris); break;
		}
		if ((this.totalMinos -= toClear.length * 10) == 0) {
			this.score += 1000;
			this.clearTime = 1000;
			this.garbageLines += 4;
			this.allClears++;
			this.allClearTime = 1000;
			this.playSfx(sfx.allClear);
		}
		this.current = null;
		this.processAttack();
	}

	addReward(reward) {
		if (reward == -1) return;
		this.linesByType[reward]++;
		this.rewardAmount = this.scoring.getRewardAmount(reward, this.parent.level);
		this.rewardName = rewardNames[reward];
		this.rewardTime = 1500;
		this.garbageLines += garbageAmounts[reward];
		if (doesRewardTriggerBackToBack[reward]) {
			if (this.backToBack) {
				this.rewardAmount *= 1.5;
				this.rewardName += " BTB";
				this.garbageLines += 1;
				this.backToBacks++;
				this.playSfx(sfx.backToBack);
			} else this.backToBack = true;
		} else this.backToBack = this.backToBack && reward > 2;
		this.maxCombo = Math.max(this.maxCombo, ++this.combo);
		if (reward != 4 && reward != 7 && this.combo > 0) {
			this.rewardAmount += this.scoring.getComboAmount(this.combo, this.parent.level);
			this.garbageLines += this.combo > 11 ? 5 : comboAmounts[this.combo];
			this.playSfx(sfx.combo[Math.min(10, this.combo)]);
		}
		this.score += this.rewardAmount;
	}

	pushToQueue() {
		let bag = [new TetriminoI(), new TetriminoJ(), new TetriminoL(), new TetriminoO(), new TetriminoS(), new TetriminoZ(), new TetriminoT()];
		for (let i = 0; i < 7; i++) {
			this.queue.push(bag.splice(Math.floor(this.random.random() * bag.length), 1)[0]);
		}
	}

	processAttack() {
		if (this.attackProcessed) return;
		this.garbageLines = Math.min(20, this.garbageLines);
		if (this.garbageLines != 0) {
			let isDefense = false;
			while (this.garbageLines > 0 && this.garbageQueue.length != 0) {
				if (this.garbageQueue[0] > this.garbageLines) {
					this.garbageQueue[0] -= this.garbageLines;
					this.defenses += this.garbageLines;
					this.garbageLines = 0;
				} else {
					this.garbageLines -= this.garbageQueue[0];
					this.defenses += this.garbageQueue[0];
					this.garbagePhase = 0;
					this.garbageTime = 0;
					this.garbageQueue.splice(0, 1);
				}
				isDefense = true;
			}
			if (isDefense) this.playSfx(sfx.defend);
			this.attacks += this.parent.playfields[this.player ? 0 : 1].addGarbage(this.garbageLines);
		} else if (this.garbagePhase == 2 && this.clearedLines.length == 0) {
			let lines = this.garbageQueue.shift();
			this.stackMinY -= lines;
			for (let i = 0; i < lines; i++) {
				let garbageLine = this.garbageGenerator.generate();
				let minos = 0;
				for (let j = 0; j < 10; j++)
					if (this.board[j][0] != undefined) {
						this.parent.gameOver(this.player);
						return;
					}
				for (let j = 0; j < 10; j++) {
					this.board[j].splice(0, 1);
					this.board[j].push(garbageLine[j]);
					if (garbageLine[j] != undefined) minos++;
				}
				for (let j = 0; j < this.clearedLines.length; j++) this.clearedLines[j]--;
				this.minos.splice(0, 1);
				this.minos.push(minos);
				this.totalMinos += minos;
			}
			this.garbagePhase = 0;
			this.garbageTime = 0;
			this.clearTime = 500;
			this.playSfx(sfx.garbageInsertion);
		}
		this.attackProcessed = true;
		this.parent.updateWarning();
	}

	nextTetrimino() {
		this.processAttack();
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
			this.parent.gameOver(this.player);
			return;
		}
		if (this.current.canFall(this.board)) this.current.y++;
		this.maxY = this.current.Y;
	}

	getStats() {
		return [
			["Tetriminoes placed", this.tetriminoes],
			["Holds", this.holds],
			["Lines cleared", this.lines],
			["Max combo", this.maxCombo < 1 ? "[No combo.]" : this.maxCombo],
			["Back-to-backs", this.backToBacks],
			["All clears", this.allClears],
			["Garbage sent", this.attacks],
			["Garbage received", this.received],
			["Garbage negated", this.defenses],
			["Singles", this.linesByType[0]],
			["Doubles", this.linesByType[1]],
			["Triples", this.linesByType[2]],
			["Tetrises", this.linesByType[3]],
			["T-spin mini zeroes", this.linesByType[4]],
			["T-spin mini singles", this.linesByType[5]],
			["T-spin mini doubles", this.linesByType[6]],
			["T-spin zeroes", this.linesByType[7]],
			["T-spin singles", this.linesByType[8]],
			["T-spin doubles", this.linesByType[9]],
			["T-spin triples", this.linesByType[10]]
		];
	}
}

class ScoringTengen {
	constructor() {
		this.lockScoreTime = 0;
		this.rewardAmounts = [100, 400, 900, 2500, 25, 50, 75, 50, 150, 600, 1250];
	}

	renderLockScore(timePassed, rootX, rootY) {
		if (this.lockScoreTime != 0 && this.lockScoreLine > 17) {
			ctx.textAlign = "left";
			ctx.font = "12px Tetreml";
			this.lockScoreTime = Math.max(0, this.lockScoreTime - timePassed);
			ctx.fillText("" + this.lockScore, rootX+125, rootY + 12 * (this.lockScoreLine - 17));
		}
	}

	getLockScore(baseline, level, isDrop) {
		this.lockScoreLine = baseline;
		this.lockScore = Math.floor(Math.min(1000, (isDrop? 2 : 1) * level * (level + 39 - baseline)));
		this.lockScoreTime = 1000;
		return this.lockScore;
	}

	getSoftDropScore() {
		return 0;
	}

	getHardDropScore(start, end) {
		return 0;
	}

	getRewardAmount(reward, level) {
		return this.rewardAmounts[reward];
	}

	getComboAmount(combo, level) {
		return 50 * combo;
	}
}

class ScoringGuideline {
	constructor() {
		this.lockScoreTime = 0;
		this.rewardAmounts = [100, 300, 500, 800, 100, 200, 400, 400, 800, 1200, 1600];
	}

	renderLockScore(timePassed, rootX, rootY) {
		if (this.lockScoreTime != 0 && this.lockScoreEndLine > 17) {
			ctx.textAlign = "left";
			ctx.font = "12px Tetreml";
			this.lockScoreTime = Math.max(0, this.lockScoreTime - timePassed);
			ctx.fillRect(rootX+123, rootY + 12 * (this.lockScoreStartLine - 18), 1, (this.lockScoreEndLine - this.lockScoreStartLine + 1) * 12);
			ctx.fillText(this.lockScore + "", rootX+127, rootY + 12 * (this.lockScoreEndLine - 17));
		}
	}

	getLockScore(baseline, level, drop) {
		return 0;
	}

	getSoftDropScore() {
		return 1;
	}

	getHardDropScore(start, end) {
		this.lockScoreTime = 1000;
		this.lockScoreStartLine = start;
		this.lockScoreEndLine = end;
		this.lockScore = 2 * (end - start + 1);
		return this.lockScore;
	}

	getRewardAmount(reward, level) {
		return this.rewardAmounts[reward] * level;
	}

	getComboAmount(combo, level) {
		return 50 * combo * level;
	}
}

// ------------------------------------------

class KeymappingScreen {
	constructor(parent) {
		this.parent = parent;
	}

	init() {
		document.addEventListener("keydown", this.keyDownHandler = (key) => { this.onKeyDown(key.code); });
	}

	onKeyDown(keycode) {
		switch (keycode) {
			case "Enter":
				this.openGameScreen();
				break;
			case "KeyC":
				openGui(new ControlsEditScreen(this, [
					[
						"General",
						["Pause", configuredControlsPlayer1.esc],
						["Special functions", configuredControlsPlayer1.quitModifier],
						["Volume down", configuredControlsPlayer1.volumeDown],
						["Volume up", configuredControlsPlayer1.volumeUp]
					],
					[
						"Player 1",
						["Move left", configuredControlsPlayer1.left],
						["Move right", configuredControlsPlayer1.right],
						["Soft drop", configuredControlsPlayer1.softDrop],
						["Hard drop", configuredControlsPlayer1.hardDrop],
						["Rotate counterclockwise", configuredControlsPlayer1.rotateCounterClockwise],
						["Rotate clockwise", configuredControlsPlayer1.rotateClockwise],
						["Hold", configuredControlsPlayer1.hold]
					],
					[
						"Player 2",
						["Move left", configuredControlsPlayer2.left],
						["Move right", configuredControlsPlayer2.right],
						["Soft drop", configuredControlsPlayer2.softDrop],
						["Hard drop", configuredControlsPlayer2.hardDrop],
						["Rotate counterclockwise", configuredControlsPlayer2.rotateCounterClockwise],
						["Rotate clockwise", configuredControlsPlayer2.rotateClockwise],
						["Hold", configuredControlsPlayer2.hold]
					]
				], onControlsSave));
				break;
			case "Escape":
				goBack();
				break;
		}
	}

	openGameScreen() {
		let pan = this.parent.stereoSeparation / 100;
		panNodes[0].pan.value = -pan;
		panNodes[1].pan.value = pan;
		let gui = new PlayScreen(new MainScreen(), this.parent.scorings[this.parent.scoringType], this.parent.speedCurves[this.parent.speedCurve], this.parent.handicappedLines, this.parent.garbageType, this.parent.autoRepeatDelay, this.parent.autoRepeatPeriod, this.parent.softDropPeriod, this.parent.lineClearDelayEnabled, this.parent.showKeystrokes, pan);
		gui.keymappingScreen = this;
		openGui(gui);
	}

	render() {
		ctx.fillStyle = "#FFF";
		ctx.font = "300 40px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Game controls", 15, 50);

		ctx.textAlign = "center";
		ctx.font = "12px Tetreml";
		ctx.fillText("Move left", 320, 100);
		ctx.fillText("Move right", 320, 130);
		ctx.fillText("Soft drop", 320, 160);
		ctx.fillText("Hard drop", 320, 190);
		ctx.fillText("Rotate counterclockwise", 320, 220);
		ctx.fillText("Rotate clockwise", 320, 250);
		ctx.fillText("Hold", 320, 280);

		ctx.fillText("Press C to edit, Enter to start or Esc to go back.", 320, 340);

		ctx.textAlign = "left";
		ctx.fillText(keyNamesPlayer1.left, 90, 100);
		ctx.fillText(keyNamesPlayer1.right, 90, 130);
		ctx.fillText(keyNamesPlayer1.softDrop, 90, 160);
		ctx.fillText(keyNamesPlayer1.hardDrop, 90, 190);
		ctx.fillText(keyNamesPlayer1.rotateCounterClockwise, 90, 220);
		ctx.fillText(keyNamesPlayer1.rotateClockwise, 90, 250);
		ctx.fillText(keyNamesPlayer1.hold, 90, 280);

		ctx.textAlign = "right";
		ctx.fillText(keyNamesPlayer2.left, 550, 100);
		ctx.fillText(keyNamesPlayer2.right, 550, 130);
		ctx.fillText(keyNamesPlayer2.softDrop, 550, 160);
		ctx.fillText(keyNamesPlayer2.hardDrop, 550, 190);
		ctx.fillText(keyNamesPlayer2.rotateCounterClockwise, 550, 220);
		ctx.fillText(keyNamesPlayer2.rotateClockwise, 550, 250);
		ctx.fillText(keyNamesPlayer2.hold, 550, 280);
	}

	close() {
		document.removeEventListener("keydown", this.keyDownHandler);
	}
}

// ------------------------------------------

const zeroToNine = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // For generating handicapped lines.

class OptionsScreen {
	constructor(parent) {
		this.parent = parent;
		this.scoringTypeNames = ["Tengen-like", "Guideline"];
		this.scorings = [ScoringTengen, ScoringGuideline];
		this.garbageTypeNames = ["Tetris 99", "Aligned two-hole", "Handicapped line"];
		this.speedCurveNames = ["tetris.com", "Tengen", "NES (NTSC)", "NES (PAL)"];
		this.speedCurves = [
			[[10, 1000, 500], [10, 793, 500], [10, 618, 500], [10, 473, 500], [10, 355, 500], [10, 262, 500], [10, 190, 500], [10, 135, 500], [10, 94, 500], [10, 64, 500], [10, 43, 500], [10, 28, 500], [10, 18, 500], [10, 11, 500], [10, 7, 500], [10, 4, 500], [10, 3, 500], [10, 2, 500], [10, 1, 500], [10, 0, 450], [10, 0, 400], [10, 0, 350], [10, 0, 300], [10, 0, 250], [10, 0, 200], [10, 0, 190], [10, 0, 180], [10, 0, 170], [10, 0, 160], [10, 0, 150]],
			[[0, 550, 550], [30, 467, 467], [30, 400, 400], [30, 333, 333], [30, 283, 283], [30, 233, 233], [50, 183, 183], [50, 150, 150], [50, 117, 117], [50, 100, 100], [50, 92, 92], [50, 83, 83], [50, 75, 75], [50, 67, 67], [50, 63, 63], [50, 58, 58], [50, 54, 54], [50, 50, 50], [50, 46, 46], [50, 42, 42], [50, 39, 39], [50, 36, 36], [50, 33, 33], [50, 30, 30], [50, 27, 27], [50, 24, 24], [50, 22, 22], [50, 20, 20]],
			[[0, 800, 800], [10, 717, 717], [10, 633, 633], [10, 550, 500], [10, 467, 467], [10, 383, 383], [10, 300, 300], [10, 217, 217], [10, 133, 133], [10, 100, 100], [10, 83, 83], [30, 67, 67], [30, 50, 50], [30, 33, 33], [100, 17, 17]],
			[[0, 720, 720], [10, 640, 640], [10, 580, 580], [10, 500, 500], [10, 440, 440], [10, 360, 360], [10, 300, 300], [10, 220, 220], [10, 140, 140], [10, 100, 100], [10, 80, 80], [30, 60, 60], [30, 40, 40], [30, 20, 20]]
		];
		this.speedCurve = 0;
		this.handicappedLines = 0;
		this.garbageType = 0;
		this.autoRepeatDelay = [0, 0];
		this.autoRepeatPeriod = [0, 0];
		this.softDropPeriod = [0, 0];
		this.showKeystrokes = [false, false];
		this.lineClearDelayEnabled = true;
		this.stereoSeparation = 0;
		this.selectedProperty = [0, 0];

		this.shiftLeft = this.shiftRight = this.ctrlLeft = this.ctrlRight = false;
		this.propertyHandlers = [
			(player, keycode) => this.handleScoringTypeChange(player, keycode),
			(player, keycode) => this.handleSpeedCurveChange(player, keycode),
			(player, keycode) => this.handleHandicappedLinesChange(player, keycode),
			(player, keycode) => this.handleGarbageTypeChange(player, keycode),
			(player, keycode) => this.handleAutoRepeatDelayChange(player, keycode),
			(player, keycode) => this.handleAutoRepeatPeriodChange(player, keycode),
			(player, keycode) => this.handleSoftDropPeriodChange(player, keycode),
			(player, keycode) => this.handleLineClearDelayEnabledChange(player, keycode),
			(player, keycode) => this.handleShowKeystrokesChange(player, keycode),
			(player, keycode) => this.handleStereoSeparationChange(player, keycode)
		];
	}

	init() {
		this.setScoringType(localStorage.tetris2PScoringType == null ? 0 : Number.parseInt(localStorage.tetris2PScoringType));
		this.setSpeedCurve(localStorage.tetris2PSpeedCurve == null ? 0 : Number.parseInt(localStorage.tetris2PSpeedCurve));
		this.setHandicappedLines(localStorage.tetris2PHandicappedLines == null ? 0 : Number.parseInt(localStorage.tetris2PHandicappedLines));
		this.setGarbageType(localStorage.tetris2PGarbageType == null ? 0 : Number.parseInt(localStorage.tetris2PGarbageType));
		for (let i = 0; i < 2; i++) {
			this.setAutoRepeatDelay(i, localStorage.tetris2PAutoRepeatDelay == null ? 150 : JSON.parse("[" + localStorage.tetris2PAutoRepeatDelay + "]")[i]);
			this.setAutoRepeatPeriod(i, localStorage.tetris2PAutoRepeatPeriod == null ? 40 : JSON.parse("[" + localStorage.tetris2PAutoRepeatPeriod + "]")[i]);
			this.setSoftDropPeriod(i, localStorage.tetris2PSoftDropPeriod == null ? 25 : JSON.parse("[" + localStorage.tetris2PSoftDropPeriod + "]")[i]);
			this.setShowKeystrokes(i, localStorage.tetris2PShowKeystrokes == null ? false : JSON.parse("[" + localStorage.tetris2PShowKeystrokes + "]")[i]);
		}
		this.setLineClearDelayEnabled(localStorage.tetris2PLineClearDelayEnabled == undefined ? true : localStorage.tetris2PLineClearDelayEnabled == true);
		this.setStereoSeparation(localStorage.tetris2PStereoSeparation == null ? 0 : Number.parseInt(localStorage.tetris2PStereoSeparation));
		document.addEventListener("keydown", this.keyDownHandler = (key) => this.onKeyDown(key));
		document.addEventListener("keyup", this.keyUpHandler = (key) => this.onKeyUp(key));
	}

	onKeyDown(key) {
		switch (key.code) {
			case "KeyS":
				this.selectedProperty[0] = (this.selectedProperty[0] + 1) % 10;
				key.preventDefault();
				break;
			case "KeyW":
				this.selectedProperty[0] = (this.selectedProperty[0] + 9) % 10;
				key.preventDefault();
				break;
			case "ArrowDown":
				this.selectedProperty[1] = (this.selectedProperty[1] + 1) % 10;
				key.preventDefault();
				break;
			case "ArrowUp":
				this.selectedProperty[1] = (this.selectedProperty[1] + 9) % 10;
				key.preventDefault();
				break;
			case "Enter":
				localStorage.tetris2PScoringType = this.scoringType;
				localStorage.tetris2PSpeedCurve = this.speedCurve;
				localStorage.tetris2PHandicappedLines = this.handicappedLines;
				localStorage.tetris2PGarbageType = this.garbageType;
				localStorage.tetris2PAutoRepeatDelay = this.autoRepeatDelay;
				localStorage.tetris2PAutoRepeatPeriod = this.autoRepeatPeriod;
				localStorage.tetris2PSoftDropPeriod = this.softDropPeriod;
				localStorage.tetris2PLineClearDelayEnabled = this.lineClearDelayEnabled;
				localStorage.tetris2PShowKeystrokes = this.showKeystrokes;
				localStorage.tetris2PStereoSeparation = this.stereoSeparation;
				openGui(new KeymappingScreen(this));
				break;
			case "Escape":
				goBack();
				break;
		}
		key.preventDefault();
		if (this.updateModifierKey(key.code, true)) key.preventDefault();
		for (let i = 0; i < 2; i++) if (this.propertyHandlers[this.selectedProperty[i]](i, key.code)) key.preventDefault();
	}

	onKeyUp(key) {
		this.updateModifierKey(key.code, false);
	}

	updateModifierKey(keycode, down) {
		switch (keycode) {
			case "ShiftLeft": this.shiftLeft = down; return true;
			case "ShiftRight": this.shiftRight = down; return true;
			case "ControlLeft": this.ctrlLeft = down; return true;
			case "ControlRight": this.ctrlRight = down; return true;
		}
		return false;
	}

	setScoringType(type) {
		this.scoringType = Math.max(0, Math.min(1, type));
	}

	handleScoringTypeChange(player, keycode) {
		if (player)
			switch (keycode) {
				case "ArrowLeft":
					this.setScoringType((this.scoringType + 1) % 2);
					return true;
				case "ArrowRight":
					this.setScoringType((this.scoringType + 1) % 2); // I know these codes are the same but for the sake of the future I still keep them.
					return true;
			}
		else
			switch (keycode) {
				case "KeyA":
					this.setScoringType((this.scoringType + 1) % 2);
					return true;
				case "KeyD":
					this.setScoringType((this.scoringType + 1) % 2);
					return true;
			}
		return false;
	}

	setSpeedCurve(curve) {
		this.speedCurve = Math.max(0, Math.min(3, curve));
	}

	handleSpeedCurveChange(player, keycode) {
		if (player)
			switch (keycode) {
				case "ArrowLeft":
					this.setSpeedCurve((this.speedCurve + 3) % 4);
					return true;
				case "ArrowRight":
					this.setSpeedCurve((this.speedCurve + 1) % 4);
					return true;
			}
		else
			switch (keycode) {
				case "KeyA":
					this.setSpeedCurve((this.speedCurve + 3) % 4);
					return true;
				case "KeyD":
					this.setSpeedCurve((this.speedCurve + 1) % 4);
					return true;
			}
		return false;
	}

	setHandicappedLines(lines) {
		this.handicappedLines = Math.max(0, Math.min(15, lines));
	}

	handleHandicappedLinesChange(player, keycode) {
		if (player)
			switch (keycode) {
				case "ArrowLeft":
					this.setHandicappedLines(this.handicappedLines - 1);
					return true;
				case "ArrowRight":
					this.setHandicappedLines(this.handicappedLines + 1);
					return true;
			}
		else
			switch (keycode) {
				case "KeyA":
					this.setHandicappedLines(this.handicappedLines - 1);
					return true;
				case "KeyD":
					this.setHandicappedLines(this.handicappedLines + 1);
					return true;
			}
		return false;
	}

	setGarbageType(type) {
		this.garbageType = Math.max(0, Math.min(2, type));
	}

	handleGarbageTypeChange(player, keycode) {
		if (player)
			switch (keycode) {
				case "ArrowLeft":
					this.setGarbageType((this.garbageType + 2) % 3);
					return true;
				case "ArrowRight":
					this.setGarbageType((this.garbageType + 1) % 3);
					return true;
			}
		else
			switch (keycode) {
				case "KeyA":
					this.setGarbageType((this.garbageType + 2) % 3);
					return true;
				case "KeyD":
					this.setGarbageType((this.garbageType + 1) % 3);
					return true;
			}
		return false;
	}

	handleNumericPropertyChange(player, keycode, method, oldValue) {
		if (player)
			switch (keycode) {
				case "ArrowLeft":
					method(1, oldValue[1] - (this.ctrlRight ? 100 : this.shiftRight ? 10 : 1));
					return true;
				case "ArrowRight":
					method(1, oldValue[1] + (this.ctrlRight ? 100 : this.shiftRight ? 10 : 1));
					return true;
			}
		else
			switch (keycode) {
				case "KeyA":
					method(0, oldValue[0] - (this.ctrlLeft ? 100 : this.shiftLeft ? 10 : 1));
					return true;
				case "KeyD":
					method(0, oldValue[0] + (this.ctrlLeft ? 100 : this.shiftLeft ? 10 : 1));
					return true;
			}
		return false;
	}

	setAutoRepeatDelay(player, amount) {
		this.autoRepeatDelay[player] = Math.max(0, Math.min(1000, amount));
	}

	handleAutoRepeatDelayChange(player, keycode) {
		this.handleNumericPropertyChange(player, keycode, (player, amount) => this.setAutoRepeatDelay(player, amount), this.autoRepeatDelay);
	}

	setAutoRepeatPeriod(player, amount) {
		this.autoRepeatPeriod[player] = Math.max(0, Math.min(500, amount));
	}

	handleAutoRepeatPeriodChange(player, keycode) {
		this.handleNumericPropertyChange(player, keycode, (player, amount) => this.setAutoRepeatPeriod(player, amount), this.autoRepeatPeriod);
	}

	setSoftDropPeriod(player, amount) {
		this.softDropPeriod[player] = Math.max(0, Math.min(1000, amount));
	}

	handleSoftDropPeriodChange(player, keycode) {
		this.handleNumericPropertyChange(player, keycode, (player, amount) => this.setSoftDropPeriod(player, amount), this.softDropPeriod);
	}

	setLineClearDelayEnabled(lineClearDelayEnabled) {
		this.lineClearDelayEnabled = lineClearDelayEnabled;
	}

	handleLineClearDelayEnabledChange(player, keycode) {
		if (keycode == "ArrowLeft" || keycode == "ArrowRight" || keycode == "KeyA" || keycode == "KeyD") this.setLineClearDelayEnabled(!this.lineClearDelayEnabled);
	}

	setShowKeystrokes(player, showKeystrokes) {
		this.showKeystrokes[player] = showKeystrokes;
	}

	handleShowKeystrokesChange(player, keycode) {
		if (player) {
			if (keycode == "ArrowLeft" || keycode == "ArrowRight") this.setShowKeystrokes(player, !this.showKeystrokes[player]);
		} else
			if (keycode == "KeyA" || keycode == "KeyD") this.setShowKeystrokes(player, !this.showKeystrokes[player]);
		return false;
	}

	setStereoSeparation(amount) {
		this.stereoSeparation = Math.max(0, Math.min(100, amount));
	}

	handleStereoSeparationChange(player, keycode) {
		this.handleNumericPropertyChange(player, keycode, (player, amount) => this.setStereoSeparation(amount), [this.stereoSeparation, this.stereoSeparation]);
	}

	render() {
		ctx.fillStyle = "#FFF";
		ctx.font = "300 40px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Game options", 15, 50);

		ctx.textAlign = "center";
		ctx.font = "12px Tetreml";
		ctx.fillText("Scoring type", 320, 90);
		ctx.fillText("Speed curve", 320, 112);
		ctx.fillText("Handicapped lines", 320, 134);
		ctx.fillText("Garbage type", 320, 156);
		ctx.fillText("Auto repeat delay", 320, 178);
		ctx.fillText("Auto repeat period", 320, 200);
		ctx.fillText("Soft drop period", 320, 222);
		ctx.fillText("Tetrimino delays", 320, 244);
		ctx.fillText("Show keystrokes", 320, 266);
		ctx.fillText("Stereo separation", 320, 288);

		ctx.fillText("Press Enter to review controls and start or Esc to cancel.", 320, 340);

		for (let i = 0; i < 2; i++) {
			let posX = i == 0 ? 134 : 506;
			ctx.fillText(this.scoringTypeNames[this.scoringType], posX, 90);
			ctx.fillText(this.speedCurveNames[this.speedCurve], posX, 112);
			ctx.fillText(this.handicappedLines + "", posX, 134);
			ctx.fillText(this.garbageTypeNames[this.garbageType], posX, 156);
			ctx.fillText(this.autoRepeatDelay[i] + " ms", posX, 178);
			ctx.fillText(this.autoRepeatPeriod[i] + " ms", posX, 200);
			ctx.fillText(this.softDropPeriod[i] + " ms", posX, 222);
			ctx.fillText(this.lineClearDelayEnabled ? "On" : "Off", posX, 244);
			ctx.fillText(this.showKeystrokes[i] ? "On" : "Off", posX, 266);
			ctx.fillText(this.stereoSeparation + "%", posX, 288);
		}

		ctx.textAlign = "left";
		ctx.fillText("\u25c4", 55, 90 + 22 * this.selectedProperty[0]);
		ctx.fillText("\u25c4", 426, 90 + 22 * this.selectedProperty[1]);
		if ((this.selectedProperty[0] > 3 && this.selectedProperty[0] < 7) || this.selectedProperty[0] == 8) ctx.fillText("None: \u00b1 1 | Shift: \u00b1 10 | Ctrl: \u00b1 100", 30, 320);
		ctx.textAlign = "right";
		ctx.fillText("\u25ba", 214, 90 + 22 * this.selectedProperty[0]);
		ctx.fillText("\u25ba", 585, 90 + 22 * this.selectedProperty[1]);
		if ((this.selectedProperty[1] > 3 && this.selectedProperty[1] < 7) || this.selectedProperty[1] == 8) ctx.fillText("None: \u00b1 1 | Shift: \u00b1 10 | Ctrl: \u00b1 100", 610, 320);
	}

	close() {
		document.removeEventListener("keydown", this.keyDownHandler);
		document.removeEventListener("keyup", this.keyUpHandler);
	}
}

// ------------------------------------------

var sprite = new Image();
sprite.src = "Textures/Sprite two-player.png";

var outlineSprite = new Image();
outlineSprite.src = "Textures/Outline sprite two-player.png";

class MainScreen {
	constructor(parent) {
		this.parent = parent;
		this.onkeypress = (key) => { if (key.code == "Enter") openGui(new OptionsScreen(this)); };
	}

	init() {
		document.addEventListener("keypress", this.onkeypress);
	}

	render() {
		ctx.fillStyle = "#FFF";
		ctx.font = "300 40px Tetreml";
		ctx.textAlign = "center";
		ctx.fillText("Tetreml", 320, 100);
		ctx.font = "12px Tetreml";
		ctx.fillText("Tetris written with pure HTML and JS.", 320, 125);

		ctx.fillText("Two-player", 320, 215);
		ctx.fillText("Press Enter to set options, controls and start the game.", 320, 340);
	}

	close() {
		document.removeEventListener("keypress", this.onkeypress);
	}
}

// -----------------------

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

openGui(new MainScreen());

function render() {
	requestAnimationFrame(render);
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, 640, 360);
	if (currentGui == null) return;
	currentGui.render();
}

requestAnimationFrame(render);