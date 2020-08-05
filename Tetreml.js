var playScreenImage = new Image();
playScreenImage.src = "Textures/Play screen singleplayer.png";

const sfx = {
	ready: new SFX("SFX/Ready.wav", gainNode),
	countdown: new SFX("SFX/Countdown.wav", gainNode),
	single: new SFX("SFX/Single.wav", gainNode),
	double: new SFX("SFX/Double.wav", gainNode),
	triple: new SFX("SFX/Triple.wav", gainNode),
	tetris: new SFX("SFX/Tetris.wav", gainNode),
	tSpin: new SFX("SFX/T spin.wav", gainNode),
	move: new SFX("SFX/Move.wav", gainNode),
	rotate: new SFX("SFX/Rotate.wav", gainNode),
	softDrop: new SFX("SFX/Soft drop.wav", gainNode),
	hardDrop: new SFX("SFX/Hard drop.wav", gainNode),
	lock: new SFX("SFX/Lock.wav", gainNode),
	land: new SFX("SFX/Land.wav", gainNode),
	hold: new SFX("SFX/Hold.wav", gainNode),
	pause: new SFX("SFX/Pause.wav", gainNode),
	gameOver: new SFX("SFX/Game over.wav", gainNode),
	complete: new SFX("SFX/Win.wav", gainNode),
	allClear: new SFX("SFX/All clear.wav", gainNode),
	afterClear: new SFX("SFX/After clear.wav", gainNode),
	softLock: new SFX("SFX/Soft lock.wav", gainNode)
};

const music = {
	level1Opening: new Audio("Music/Level 1 opening.mp3"),
	level1: new Audio("Music/Level 1 main.mp3"),
	level6Start: new Audio("SFX/Level 6.wav"),
	level6: new Audio("Music/Level 6.mp3"),
	level11Start: new Audio("SFX/Level 11.wav"),
	level11Opening: new Audio("Music/Level 11 opening.mp3"),
	level11: new Audio("Music/Level 11 main.mp3"),
};

for (let m of Object.values(music)) {
	m.preload = "auto";
	m.load();
	audioContext.createMediaElementSource(m).connect(gainNode);
}

music.level1.loop = music.level6.loop = music.level11.loop = true;

var volume;

function setVolume(newVolume) {
	volume = Math.max(0, Math.min(10, newVolume));
	localStorage.tetrisVolume = volume;
	newVolume = Math.pow(volume / 10, 4);
	gainNode.gain.value = newVolume;
}

setVolume(localStorage.tetrisVolume == undefined ? 10 : Number.parseInt(localStorage.tetrisVolume));

function loadControls() {
	keyMapping = {};
	for (let key of ["left", "right", "softDrop", "hardDrop", "rotateClockwise", "rotateCounterClockwise", "hold", "esc", "quitModifier", "volumeUp", "volumeDown"]) {
		keyMapping[configuredControls[key]] = key;
		keyNames[key] = formatKeycode(configuredControls[key]);
		buttonStatus[key] = false;
	}
}

function onControlsSave(controlsList) {
	configuredControls = {
		left: controlsList[1][1][1],
		right: controlsList[1][2][1],
		softDrop: controlsList[1][3][1],
		hardDrop: controlsList[1][4][1],
		rotateCounterClockwise: controlsList[1][5][1],
		rotateClockwise: controlsList[1][6][1],
		hold: controlsList[1][7][1],
		reset: controlsList[1][8][1],
		esc: controlsList[0][1][1],
		quitModifier: controlsList[0][2][1],
		volumeDown: controlsList[0][3][1],
		volumeUp: controlsList[0][4][1],
	};
	localStorage.tetrisSingleplayerControlsMapping = JSON.stringify(configuredControls);
	loadControls();
}

var configuredControls = undefined;
if ('tetrisSingleplayerControlsMapping' in localStorage) configuredControls = JSON.parse(localStorage.tetrisSingleplayerControlsMapping); else {
	configuredControls = { ...singleplayerControlsMapping };
	localStorage.tetrisSingleplayerControlsMapping = JSON.stringify(configuredControls);
}

var keyMapping = {};
var keyNames = {};
var buttonStatus = {};
loadControls();

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

// ------------------------------------------

const zeroToNine = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // For generating handicapped lines.

class OptionsScreen {
	constructor(parent) {
		this.parent = parent;
		this.modeNames = ["Marathon – Fixed goal", "Marathon – Variable goal", "Marathon – tetris.com", "Endless (Tengen-like scoring)", "Endless (guideline scoring)", "40-line (Sprint)", "2-minute (Ultra)"];
		this.modeClasses = [GameScreenGuidelineMarathon, GameScreenGuidelineMarathonVariable, GameScreenGuidelineMarathonTetrisDotCom, GameScreenTengen, GameScreenGuidelineEndless, GameScreenGuideline40Line, GameScreenGuideline2Minute];
		this.speedCurveNames = ["Normal", "Moderate", "Speedy", "tetris.com"];
		this.speedCurves = [
			[[0, 550, 1000], [30, 467, 1000], [30, 400, 1000], [30, 333, 1000], [30, 283, 1000], [30, 233, 1000], [50, 183, 1000], [50, 150, 1000], [50, 117, 1000], [50, 100, 1000], [50, 92, 1000], [50, 83, 1000], [50, 75, 1000], [50, 67, 1000], [50, 63, 1000], [50, 58, 1000], [50, 54, 1000], [50, 50, 1000], [50, 46, 1000], [50, 42, 1000], [50, 39, 1000], [50, 36, 1000], [50, 33, 1000], [50, 30, 1000], [50, 27, 1000], [50, 24, 1000], [50, 22, 1000], [50, 20, 1000]],
			[[0, 550, 1000], [30, 450, 1000], [30, 375, 1000], [30, 300, 1000], [30, 250, 1000], [30, 200, 1000], [50, 160, 1000], [50, 120, 1000], [50, 100, 1000], [50, 85, 1000], [50, 70, 1000], [50, 60, 1000], [50, 50, 1000], [50, 42, 1000], [50, 33, 1000], [50, 25, 1000], [50, 20, 1000], [50, 16, 1000], [50, 12, 1000], [50, 10, 1000]],
			[[0, 550, 1000], [10, 467, 1000], [10, 400, 1000], [10, 333, 1000], [10, 283, 1000], [10, 233, 1000], [10, 183, 1000], [10, 150, 1000], [10, 117, 1000], [10, 100, 1000], [10, 92, 1000], [10, 83, 1000], [10, 75, 1000], [10, 67, 1000], [10, 63, 1000], [10, 58, 1000], [10, 54, 1000], [10, 50, 1000], [10, 46, 1000], [10, 42, 1000], [10, 39, 1000], [10, 36, 1000], [10, 33, 1000], [10, 30, 1000], [10, 27, 1000], [10, 24, 1000], [10, 22, 1000], [10, 20, 1000], [10, 18, 1000], [10, 16, 1000], [10, 14, 1000], [10, 12, 1000], [10, 10, 1000]],
			[[10, 1000, 500], [10, 793, 500], [10, 618, 500], [10, 473, 500], [10, 355, 500], [10, 262, 500], [10, 190, 500], [10, 135, 500], [10, 94, 500], [10, 64, 500], [10, 43, 500], [10, 28, 500], [10, 18, 500], [10, 11, 500], [10, 7, 500], [10, 4, 500], [10, 3, 500], [10, 2, 500], [10, 1, 500], [10, 0, 450], [10, 0, 400], [10, 0, 350], [10, 0, 300], [10, 0, 250], [10, 0, 200], [10, 0, 190], [10, 0, 180], [10, 0, 170], [10, 0, 160], [10, 0, 150]]
		];
		this.shift = false;
		this.ctrl = false;
		this.shiftLeft = this.shiftRight = this.ctrlLeft = this.ctrlRight = false;
		this.propertyHandlers = [
			(keycode) => this.handleModeChange(keycode),
			(keycode) => this.handleSpeedCurveChange(keycode),
			(keycode) => this.handleStartingLevelChange(keycode),
			(keycode) => this.handleHandicappedLinesChange(keycode),
			(keycode) => this.handleAutoRepeatDelayChange(keycode),
			(keycode) => this.handleAutoRepeatPeriodChange(keycode),
			(keycode) => this.handleSoftDropPeriod(keycode),
			(keycode) => this.handleShowKeystrokesChange(keycode),
		];
		this.startingLevel = 1;
	}

	init() {
		this.setSpeedCurve(localStorage.tetrisSpeedCurve == null ? 0 : Number.parseInt(localStorage.tetrisSpeedCurve));
		this.setStartingLevel(localStorage.tetrisStartingLevel == null ? 1 : Number.parseInt(localStorage.tetrisStartingLevel));
		this.setMode(localStorage.tetrisMode == null ? 0 : Number.parseInt(localStorage.tetrisMode));
		this.setHandicappedLines(localStorage.tetrisHandicappedLines == null ? 0 : Number.parseInt(localStorage.tetrisHandicappedLines));
		this.setAutoRepeatDelay(localStorage.tetrisAutoRepeatDelay == null ? 150 : Number.parseInt(localStorage.tetrisAutoRepeatDelay));
		this.setAutoRepeatPeriod(localStorage.tetrisAutoRepeatPeriod == null ? 40 : Number.parseInt(localStorage.tetrisAutoRepeatPeriod));
		this.setSoftDropPeriod(localStorage.tetrisSoftDropPeriod == null ? 25 : Number.parseInt(localStorage.tetrisSoftDropPeriod));
		this.setShowKeystrokes(localStorage.tetrisShowKeystrokes == "true");
		document.addEventListener("keydown", this.keyDownHandler = (key) => this.onKeyDown(key));
		document.addEventListener("keyup", this.keyUpHandler = (key) => this.onKeyUp(key));
		this.selectedProperty = 0;
	}

	onKeyDown(key) {
		switch (key.code) {
			case "ArrowDown":
				this.selectedProperty = (this.selectedProperty + 1) % 8;
				if (this.selectedProperty == 1 && (this.mode < 3 || this.mode > 4)) this.selectedProperty = this.mode < 3 ? 2 : 4;
				if (this.selectedProperty == 3 && this.mode < 3) this.selectedProperty = 4;
				break;
			case "ArrowUp":
				this.selectedProperty = (this.selectedProperty + 7) % 8;
				if (this.selectedProperty == 3 && (this.mode < 3 || this.mode > 4)) this.selectedProperty = this.mode < 3 ? 2 : 0;
				if (this.selectedProperty == 1 && this.mode < 3) this.selectedProperty = 0;
				break;
			case "Enter":
				let gui = new (this.modeClasses[localStorage.tetrisMode = this.mode])(this.parent, localStorage.tetrisShowKeystrokes = this.showKeystrokes, true);
				if (this.mode < 3) {
					gui.level = gui.replay.modeParameters.startingLevel = localStorage.tetrisStartingLevel = this.startingLevel;
				}
				else if (this.mode < 5) {
					gui.levels = gui.replay.modeParameters.levels = this.speedCurves[localStorage.tetrisSpeedCurve = this.speedCurve];
					gui.level = gui.replay.modeParameters.startingLevel = localStorage.tetrisStartingLevel = this.startingLevel;
					gui.speedCurve = localStorage.tetrisSpeedCurve = this.speedCurve;
					localStorage.tetrisHandicappedLines = this.handicappedLines;
					for (let line = 39; line > 39 - this.handicappedLines; line--) {
						let bag = [...zeroToNine];
						let minos = gui.minos[line] = 6 + (Math.random() > 0.5 ? 2 : 0); // The number of minos must be even so that the "ALL CLEAR" can happen.
						gui.totalMinos += minos;
						for (let i = 0; i < minos; i++) {
							gui.board[bag.splice(Math.floor(Math.random()*bag.length-0.00001), 1)][line] = new Mino(0, 0);
						}
					}
					gui.stackMinY = 40 - this.handicappedLines;
				}
				gui.autoRepeatDelay = localStorage.tetrisAutoRepeatDelay = this.autoRepeatDelay;
				gui.autoRepeatPeriod = localStorage.tetrisAutoRepeatPeriod = this.autoRepeatPeriod;
				gui.softDropPeriod = localStorage.tetrisSoftDropPeriod = this.softDropPeriod;
				openGui(gui);
				break;
			case "Escape":
				goBack();
				break;
		}
		this.updateModifierKey(key.code, true);
		this.propertyHandlers[this.selectedProperty](key.code);
	}

	onKeyUp(key) {
		this.updateModifierKey(key.code, false);
	}

	updateModifierKey(keycode, down) {
		switch (keycode) {
			case "ShiftLeft": this.shiftLeft = down; break;
			case "ShiftRight": this.shiftRight = down; break;
			case "ControlLeft": this.ctrlLeft = down; break;
			case "ControlRight": this.ctrlRight = down; break;
		}
		this.shift = this.shiftLeft || this.shiftRight;
		this.ctrl = this.ctrlLeft || this.ctrlRight;
	}

	setMode(mode) {
		this.mode = Math.max(0, Math.min(6, mode));
		this.setStartingLevel(this.startingLevel);
	}

	handleModeChange(keycode) {
		switch (keycode) {
			case "ArrowLeft":
				this.setMode((this.mode + 6) % 7);
				break;
			case "ArrowRight":
				this.setMode((this.mode + 1) % 7);
				break;
		}
	}

	setSpeedCurve(curve) {
		this.speedCurve = Math.max(0, Math.min(3, curve));
		this.setStartingLevel(this.startingLevel); // Clamps the starting level as the amount of levels has been changed.
	}

	handleSpeedCurveChange(keycode) {
		switch (keycode) {
			case "ArrowLeft":
				this.setSpeedCurve((this.speedCurve + 3) % 4);
				break;
			case "ArrowRight":
				this.setSpeedCurve((this.speedCurve + 1) % 4);
				break;
		}
	}

	setStartingLevel(level) {
		this.startingLevel = this.mode < 2 ? Math.max(1, Math.min(15, level)) : this.mode == 2 ? Math.max(1, Math.min(30, level)) : Math.max(1, Math.min(this.speedCurves[this.speedCurve].length, level));
	}

	handleStartingLevelChange(keycode) {
		switch (keycode) {
			case "ArrowLeft":
				this.setStartingLevel(this.startingLevel - 1);
				break;
			case "ArrowRight":
				this.setStartingLevel(this.startingLevel + 1);
				break;
		}
	}

	setHandicappedLines(lines) {
		this.handicappedLines = Math.max(0, Math.min(15, lines));
	}

	handleHandicappedLinesChange(keycode) {
		switch (keycode) {
			case "ArrowLeft":
				this.setHandicappedLines(this.handicappedLines - 1);
				break;
			case "ArrowRight":
				this.setHandicappedLines(this.handicappedLines + 1);
				break;
		}
	}

	handleNumericPropertyChange(keycode, method, oldValue) {
		switch (keycode) {
			case "ArrowLeft":
				method(oldValue - (this.ctrl ? 100 : this.shift ? 10 : 1));
				break;
			case "ArrowRight":
				method(oldValue + (this.ctrl ? 100 : this.shift ? 10 : 1));
				break;
		}
	}

	setAutoRepeatDelay(amount) {
		this.autoRepeatDelay = Math.max(0, Math.min(1000, amount));
	}

	handleAutoRepeatDelayChange(keycode) {
		this.handleNumericPropertyChange(keycode, (amount) => this.setAutoRepeatDelay(amount), this.autoRepeatDelay);
	}

	setAutoRepeatPeriod(amount) {
		this.autoRepeatPeriod = Math.max(0, Math.min(500, amount));
	}

	handleAutoRepeatPeriodChange(keycode) {
		this.handleNumericPropertyChange(keycode, (amount) => this.setAutoRepeatPeriod(amount), this.autoRepeatPeriod);
	}

	setSoftDropPeriod(amount) {
		this.softDropPeriod = Math.max(0, Math.min(1000, amount));
	}

	handleSoftDropPeriod(keycode) {
		this.handleNumericPropertyChange(keycode, (amount) => this.setSoftDropPeriod(amount), this.softDropPeriod);
	}

	setShowKeystrokes(showKeystrokes) {
		this.showKeystrokes = showKeystrokes;
	}

	handleShowKeystrokesChange(keycode) {
		if (keycode == "ArrowLeft" || keycode == "ArrowRight") this.setShowKeystrokes(!this.showKeystrokes);
	}

	render() {
		ctx.fillStyle = "#FFF";
		ctx.font = "40px Segoe UI Light";
		ctx.textAlign = "left";
		ctx.fillText("Game options", 15, 50);

		ctx.font = "12px Segoe UI";
		ctx.fillText("Mode", 30, 100);
		if (this.mode < 3 || this.mode > 4) {
			ctx.globalAlpha = 0.5;
			ctx.fillText("Speed curve", 30, 128);
			ctx.fillText("Handicapped lines", 30, 184)
			ctx.globalAlpha = 1;
		} else {
			ctx.fillText("Speed curve", 30, 128);
			ctx.fillText("Handicapped lines", 30, 184)	
		}
		if (this.mode > 4) {
			ctx.globalAlpha = 0.5;
			ctx.fillText("Starting level", 30, 156);
			ctx.globalAlpha = 1;
		} else ctx.fillText("Starting level", 30, 156);
		ctx.fillText("Auto repeat delay", 30, 212);
		ctx.fillText("Auto repeat period", 30, 240);
		ctx.fillText("Soft drop period", 30, 268);
		ctx.fillText("Show keystrokes", 30, 296);

		ctx.fillText("\u25c4", 220, 100 + 28 * this.selectedProperty);
		ctx.fillText("\u25ba", 455, 100 + 28 * this.selectedProperty);
		
		ctx.textAlign = "center";
		ctx.fillText(this.modeNames[this.mode], 340, 100);
		if (this.mode < 3 || this.mode > 4) {
			ctx.globalAlpha = 0.5;
			ctx.fillText(this.speedCurveNames[this.speedCurve], 340, 128);
			ctx.fillText(this.handicappedLines + "", 340, 184);
			ctx.globalAlpha = 1;
		} else {
			ctx.fillText(this.speedCurveNames[this.speedCurve], 340, 128);
			ctx.fillText(this.handicappedLines + "", 340, 184);
		}
		if (this.mode > 4) {
			ctx.globalAlpha = 0.5;
			ctx.fillText(this.startingLevel + "", 340, 156);
			ctx.globalAlpha = 1;
		} else ctx.fillText(this.startingLevel + "", 340, 156);
		ctx.fillText(this.autoRepeatDelay + " ms", 340, 212);
		ctx.fillText(this.autoRepeatPeriod + " ms", 340, 240);
		ctx.fillText(this.softDropPeriod + " ms", 340, 268);
		ctx.fillText(this.showKeystrokes ? "On" : "Off", 340, 296);

		if (this.selectedProperty > 3 && this.selectedProperty < 7) ctx.fillText("None: \u00b1 1 | Shift: \u00b1 10 | Ctrl: \u00b1 100", 320, 320);
		ctx.fillText("Press Enter to start or Esc to cancel.", 320, 340);

		ctx.textAlign = "right";
		ctx.fillText((this.autoRepeatPeriod == 0 ? "\u221e" : Math.floor(1000/this.autoRepeatPeriod)) + " blocks/second", 610, 240);
		ctx.fillText((this.softDropPeriod == 0 ? "\u221e" : Math.floor(1000/this.softDropPeriod)) + " blocks/second", 610, 268);
	}

	close() {
		document.removeEventListener("keydown", this.keyDownHandler);
		document.removeEventListener("keyup", this.keyUpHandler);
	}
}

// ------------------------------------------

var mainWindow = document.getElementById("mainWindow");

var sprite = new Image();
sprite.src = "Textures/Sprite singleplayer.png";

var ctx = mainWindow.getContext("2d");

class MainScreen {
	constructor(parent) {
		this.parent = parent;
		this.onkeypress = (key) => {
			switch (key.code) {
				case "Enter":
					audioContext.resume();
					openGui(new OptionsScreen(this));
					break;
				case "KeyC":
					openGui(new ControlsEditScreen(this, [
						[
							"General",
							["Pause", configuredControls.esc],
							["Quit modifier", configuredControls.quitModifier],
							["Volume down", configuredControls.volumeDown],
							["Volume up", configuredControls.volumeUp]
						],
						[
							"In-game",
							["Move left", configuredControls.left],
							["Move right", configuredControls.right],
							["Soft drop", configuredControls.softDrop],
							["Hard drop", configuredControls.hardDrop],
							["Rotate counterclockwise", configuredControls.rotateCounterClockwise],
							["Rotate clockwise", configuredControls.rotateClockwise],
							["Hold", configuredControls.hold],
							["Reset current tetrimino (sandbox)", configuredControls.reset]
						]
					], onControlsSave));
					break;
			}
		};
	}

	init() {
		document.addEventListener("keypress", this.onkeypress);
	}

	render() {
		ctx.fillStyle = "#FFF";
		ctx.font = "40px Segoe UI Light";
		ctx.textAlign = "center";
		ctx.fillText("Tetreml", 320, 100);
		ctx.font = "12px Segoe UI";
		ctx.fillText("Tetris written with pure HTML and JS.", 320, 125);

		ctx.fillText("Singleplayer version", 320, 200);

		ctx.fillText("Controls", 320, 240);
		ctx.fillText(`${keyNames.left} Left | ${keyNames.right} Right | ${keyNames.softDrop} Soft drop | ${keyNames.hardDrop} Hard drop | ${keyNames.rotateCounterClockwise} Rotate counterclockwise | ${keyNames.rotateClockwise} Rotate clockwise | ${keyNames.hold} Hold`, 320, 255);
		ctx.fillText("Press Enter to set options and start the game or C to edit controls.", 320, 340);
	}

	close() {
		document.removeEventListener("keypress", this.onkeypress);
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

openGui(new MainScreen(null));

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

requestAnimationFrame(render);