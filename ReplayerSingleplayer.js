const keyNames = {};

var playScreenImage = new Image();
playScreenImage.src = "Textures/Play screen singleplayer.png";

const sfx = {
	ready: new SFX("ready", gainNode),
	countdown: new SFX("countdown", gainNode),
	single: new SFX("single", gainNode),
	double: new SFX("double", gainNode),
	triple: new SFX("triple", gainNode),
	tetris: new SFX("tetris", gainNode),
	tSpinZero: new SFX("tSpinZero", gainNode),
	tSpin: new SFX("tSpin", gainNode),
	backToBack: new SFX("backToBack", gainNode),
	combo: [
		undefined,
		new SFX("combo1", gainNode),
		new SFX("combo2", gainNode),
		new SFX("combo3", gainNode),
		new SFX("combo4", gainNode),
		new SFX("combo5", gainNode),
		new SFX("combo6", gainNode),
		new SFX("combo7", gainNode),
		new SFX("combo8", gainNode),
		new SFX("combo9", gainNode),
		new SFX("combo10", gainNode)
	],
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
	gameOver: new SFX("gameOver", gainNode),
	complete: new SFX("win", gainNode),
	allClear: new SFX("allClear", gainNode),
	afterClear: new SFX("afterClear", gainNode),
	softLock: new SFX("softLock", gainNode),
	tetriminoO: new SFX("tetriminoO", gainNode),
	tetriminoJ: new SFX("tetriminoJ", gainNode),
	tetriminoL: new SFX("tetriminoL", gainNode),
	tetriminoZ: new SFX("tetriminoZ", gainNode),
	tetriminoS: new SFX("tetriminoS", gainNode),
	tetriminoT: new SFX("tetriminoT", gainNode),
	tetriminoI: new SFX("tetriminoI", gainNode),
	bell: new SFX("bell", gainNode),
	grandMasterLevelUp: new SFX("grandMasterLevelUp", gainNode),
	level999Trigger: new SFX("level999", gainNode),
	garbageRise: new SFX("garbageRise", gainNode)
};

loadSoundEffectConfig(() => {
	for (let s of Object.values(sfx)) if (s instanceof SFX) s.load();
	for (let i = 1; i < 11; i++) sfx.combo[i].load();
});

loadMusicConfig();

var volume;

function setVolume(newVolume) {
	volume = Math.max(0, Math.min(10, newVolume));
	localStorage.tetrisVolume = volume;
	newVolume = Math.pow(volume / 10, 4);
	gainNode.gain.value = newVolume;
}

setVolume(localStorage.tetrisVolume == undefined ? 10 : Number.parseInt(localStorage.tetrisVolume));

var buttonStatus = {
	left: false,
	right: false,
	softDrop: false,
	hardDrop: false,
	rotateClockwise: false,
	rotateCounterClockwise: false,
	hold: false,
	esc: false,
	quitModifier: false
};

var keyMapping = {
	ArrowDown: "playPause",
	ArrowUp: "beginning",
	ArrowLeft: "minus5s",
	ArrowRight: "plus5s",
	ShiftLeft: "shiftLeft",
	ShiftRight: "shiftRight",
	ControlLeft: "ctrlLeft",
	ControlRight: "ctrlRight",
	Minus: "volumeDown",
	Equal: "volumeUp"
};

var keyStatus = {
	beginning: false,
	plus5s: false,
	minus5s: false,
	playPause: false,
	ctrlLeft: false,
	ctrlRight: false,
	shiftLeft: false,
	shiftRight: false,
	volumeDown: false,
	volumeUp: false
};

document.addEventListener("keydown", (key) => {
	let code = key.code;
	if (!(code in keyMapping)) return;
	keyStatus[keyMapping[code]] = true;
});

document.addEventListener("keyup", (key) => {
	let code = key.code;
	if (!(code in keyMapping)) return;
	keyStatus[keyMapping[code]] = false;
});

class ReplayScreen {
	constructor(replay) {
		this.parent = null;
		this.playScreen = new {
			"Endless Tengen": GameScreenTengen,
			"Endless NES": GameScreenNES,
			"Endless guideline": GameScreenGuidelineEndless,
			"Marathon": GameScreenGuidelineMarathon,
			"Marathon variable": GameScreenGuidelineMarathonVariable,
			"Marathon tetris.com": GameScreenGuidelineMarathonTetrisDotCom,
			"Grand master": GameScreenTGM,
			"Shirase": GameScreenShirase,
			"40-line": GameScreenGuideline40Line,
			"2-minute": GameScreenGuideline2Minute
		}[replay.mode](null, false, false, replay.lineClearDelayEnabled ?? true);
		this.actionsMapping = {
			"moveLeft": () => { this.playScreen.move(-1, false, this.playScreen.playTime); },
			"moveRight": () => { this.playScreen.move(1, false, this.playScreen.playTime); },
			"softDrop": () => { this.playScreen.softDrop(this.playScreen.playTime); },
			"hardDrop": () => { this.playScreen.hardDrop(this.playScreen.playTime); },
			"rotateClockwise": () => { this.playScreen.rotateClockwise(this.playScreen.playTime); },
			"rotateCounterClockwise": () => { this.playScreen.rotateCounterClockwise(this.playScreen.playTime); },
			"hold": () => { this.playScreen.doHold(this.playScreen.playTime); },
			"afterClear": () => { this.playScreen.afterClear(this.playScreen.playTime); },
			"fall": () => { this.playScreen.fall(this.playScreen.playTime); },
			"lockDown": () => { this.playScreen.lockDown(this.playScreen.playTime); }
		};
		this.length = replay.length;
		this.actions = replay.actions;
		this.actionsPointer = 0;
		this.playScreen.replay = replay;
		this.playScreen.loadModeParameters(replay.modeParameters);
		this.playScreen.handleReplayEpoch = (playTime) => {
			if (this.playScreen.isSeeking) return;
			this.processEvents(playTime);
		}
		this.beginning = false;
		this.playPause = false;
		this.minus5s = false;
		this.plus5s = false;
		this.volumeDown = false;
		this.volumeUp = false;
		this.processing = false;
	}

	init() {
		this.playScreen.init();
		this.playScreen.start();
		this.playScreen.pause();
		this.seek(0);
		mainWindow.addEventListener('click', this.clickHandler = (event) => { this.onClick(event); });
	}

	isShiftDown() {
		return keyStatus.shiftLeft || keyStatus.shiftRight;
	}

	isCtrlDown() {
		return keyStatus.ctrlLeft || keyStatus.ctrlRight;
	}

	changeReplaySpeed(delta) {
		this.playScreen.replaySpeed = Math.min(5, Math.max(0.1, this.playScreen.replaySpeed + delta));
	}

	render() {
		if (keyStatus.beginning) {
			if (!this.beginning) {
				this.seek(0);
				this.beginning = true;
			}
		} else this.beginning = false;
		if (keyStatus.playPause) {
			if (!this.playPause) {
				if (this.isCtrlDown()) this.playScreen.replaySpeed = 1;
				else switch (this.playScreen.state) {
					case GameState.playing:
						this.playScreen.pause();
						break;
					case GameState.paused:
						this.playScreen.resume();
						break;
				}
				this.playPause = true;
			}
		} else this.playPause = false;
		if (keyStatus.plus5s) {
			if (!this.plus5s) {
				if (this.isCtrlDown()) this.changeReplaySpeed(0.1);
				else if (this.isShiftDown()) this.changeReplaySpeed(0.01);
				else this.seek(Math.min(this.length, this.playScreen.playTime + 5000));
				this.plus5s = true;
			}
		} else this.plus5s = false;
		if (keyStatus.minus5s) {
			if (!this.minus5s) {
				if (this.isCtrlDown()) this.changeReplaySpeed(-0.1);
				else if (this.isShiftDown()) this.changeReplaySpeed(-0.01);
				else this.seek(Math.max(0, this.playScreen.playTime - 5000));
				this.minus5s = true;
			}
		} else this.minus5s = false;
		if (keyStatus.volumeDown) {
			if (!this.volumeDown) {
				setVolume(volume - 1);
				this.playScreen.volumeDisplayTime = 1000;
				this.volumeDown = true;
			}
		} else this.volumeDown = false;
		if (keyStatus.volumeUp) {
			if (!this.volumeUp) {
				setVolume(volume + 1);
				this.playScreen.volumeDisplayTime = 1000;
				this.volumeUp = true;
			}
		} else this.volumeUp = false;
		this.playScreen.render();
		ctx.fillStyle = "#FFF";
		ctx.strokeStyle = "#FFF";
		ctx.lineWidth = 1;
		ctx.strokeRect(20.5, 345.5, 187, 9);
		ctx.fillRect(21, 346, 186 * Math.min(1, this.playScreen.playTime / this.length), 8);
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		switch (this.playScreen.state) {
			case GameState.playing:
				ctx.beginPath();
				ctx.moveTo(20, 340);
				ctx.lineTo(29, 335.5);
				ctx.lineTo(20, 331);
				ctx.fill();
				break;
			case GameState.paused:
				ctx.fillRect(20, 331, 3.5, 9);
				ctx.fillRect(26, 331, 3.5, 9);
				break;
			case GameState.over:
				ctx.fillRect(20, 331, 9, 9);
				break;
		}
		ctx.fillText(this.playScreen.state == GameState.playing ? formatDuration(Math.floor(this.playScreen.playTime / 1000)) : formatDurationWithMilliseconds(this.playScreen.playTime / 1000), 33, 340);

		ctx.fillText("REPLAY CONTROLS", 468, 202);
		
		if (this.isCtrlDown()) {
			ctx.fillText("Ctrl + \u2190", 468, 222);
			ctx.fillText("Ctrl + \u2192", 468, 237);
			ctx.fillText("Ctrl + \u2193", 468, 252);
			ctx.fillText("Speed +0,1", 520, 222);
			ctx.fillText("Speed –0,1", 520, 237);
			ctx.fillText("Reset speed", 520, 252);
		} else if (this.isShiftDown()) {
			ctx.fillText("Shift + \u2190", 468, 222);
			ctx.fillText("Shift + \u2192", 468, 237);
			ctx.fillText("Speed +0,01", 526, 222);
			ctx.fillText("Speed –0,01", 526, 237);
		} else {
			ctx.fillText("Play/Pause", 488, 222);
			ctx.fillText("Go to beginning", 488, 237);
			ctx.fillText("Go back 5\"", 488, 252);
			ctx.fillText("Advance 5\"", 488, 267);
			ctx.fillText("Shift/Ctrl Change speed", 468, 282);
		}

		ctx.textAlign = "center";
		if (!this.isShiftDown() && !this.isCtrlDown()) {
			ctx.fillText("\u2193", 473, 222);
			ctx.fillText("\u2191", 473, 237);
			ctx.fillText("\u2190", 473, 252);
			ctx.fillText("\u2192", 473, 267);
		}
		ctx.fillText((Math.round(this.playScreen.replaySpeed * 100) / 100 + "").replace(".", ",") + ".", 114, 340);

		ctx.textAlign = "right";
		ctx.fillText(formatDuration(Math.floor(this.length / 1000)), 208, 340);
	}

	close() {
		mainWindow.removeEventListener('click', this.clickHandler);
	}

	processEvents(epoch) {
		epoch = Math.min(this.length, epoch);
		let oldEpoch = this.playScreen.playTime;
		while (this.actionsPointer < this.actions.length && epoch >= this.actions[this.actionsPointer][0]) {
			this.playScreen.processGameLogic(this.actions[this.actionsPointer][0] - oldEpoch);
			oldEpoch = this.actions[this.actionsPointer][0];
			this.actionsMapping[this.actions[this.actionsPointer++][1]]();
		}
		this.playScreen.processGameLogic(Math.max(0, epoch - oldEpoch));
	}

	seek(epoch) {
		isBusyRendering = true;
		this.playScreen.isSeeking = true;
		this.actionsPointer = this.playScreen.loadState(epoch);
		let oldState = this.playScreen.state;
		this.playScreen.state = GameState.playing;
		this.processEvents(epoch);
		this.playScreen.isSeeking = false;
		this.playScreen.finalizeSeek();
		if (this.playScreen.state != GameState.over) {
			if (this.playScreen.state == GameState.playing) this.playScreen.pause();
			if (oldState == GameState.playing) this.playScreen.resume();
		}
		isBusyRendering = false;
	}

	onClick(event) {
		if (event.offsetX < (21*scale) || event.offsetX > (207*scale) || event.offsetY < (346*scale) || event.offsetY > (353*scale)) return;
		this.seek(Math.floor((event.offsetX - (21*scale)) / (186*scale) * this.length));
	}
}

class InitialScreen {
	init() { }
	render() {
		ctx.font = "14px Tetreml";
		ctx.fillStyle = "#FFF";
		ctx.textAlign = "center";
		ctx.fillText("Select a replay file below and", 320, 165);
		ctx.fillText("click \"Load\" to view that replay.", 320, 185);
	}
	close() {}
}

var mainWindow = document.getElementById("mainWindow");

var sprite = new Image();
sprite.src = "Textures/Sprite singleplayer.png";

var outlineSprite = new Image();
outlineSprite.src = "Textures/Outline sprite singleplayer.png";

var spriteElectronika = new Image();
spriteElectronika.src = "Textures/Electronika.png?state=original";

var ctx = mainWindow.getContext("2d");

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

var isBusyRendering = false;

function render() {
	requestAnimationFrame(render);
	if (!isBusyRendering) try {
		isBusyRendering = true;
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, 640, 360);
		if (currentGui == null) return;
		currentGui.render();
	} finally {
		isBusyRendering = false;
	}
}

var fileSelector = document.getElementById("fileSelector");

function loadReplay() {
	let reader = new FileReader();
	reader.addEventListener("load", (event) => {
		stopCurrentMusic();
		openGui(new ReplayScreen(JSON.parse(pako.inflate(event.target.result, {to: "string"}))));
	});
	reader.readAsBinaryString(fileSelector.files[0]);
}

function onReplayFileChange() {
	document.getElementById("buttonLoad").disabled = fileSelector.files.length == 0;
}

openGui(new InitialScreen(null));

requestAnimationFrame(render);

fileSelector.disabled = false;