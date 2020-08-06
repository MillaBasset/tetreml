// This file contains default Tetreml controls configuration.
// If you are looking to change the game controls, you can now do so in-game.

// Singleplayer controls.
const singleplayerControlsMapping = {
	left: "KeyA",
	right: "KeyD",
	softDrop: "KeyS",
	hardDrop: "KeyW",
	rotateCounterClockwise: "KeyT",
	rotateClockwise: "KeyY",
	hold: "Space",
	reset: "KeyR",
	esc: "Escape",
	quitModifier: "KeyP",
	volumeDown: "Minus",
	volumeUp: "Equal"
};

// Two-player controls.
// Player 1. This player's controls also contain pause, quit and volume keys for the whole game.
const twoPlayerControlsMappingPlayer1 = {
	left: "KeyA",
	right: "KeyD",
	softDrop: "KeyS",
	hardDrop: "KeyW",
	rotateCounterClockwise: "KeyT",
	rotateClockwise: "KeyY",
	hold: "Space",
	esc: "Escape",
	quitModifier: "KeyP",
	volumeDown: "Digit6",
	volumeUp: "Digit7"
};

// Player 2.
// With numpad.
const twoPlayerControlsMappingPlayer2WithNumpad = {
	left: "ArrowLeft",
	right: "ArrowRight",
	softDrop: "ArrowDown",
	hardDrop: "ArrowUp",
	rotateCounterClockwise: "Numpad7",
	rotateClockwise: "Numpad8",
	hold: "Numpad9"
};

// Without numpad.
const twoPlayerControlsMappingPlayer2WithoutNumpad = {
	left: "KeyK",
	right: "Semicolon",
	softDrop: "KeyL",
	hardDrop: "KeyO",
	rotateCounterClockwise: "BracketLeft",
	rotateClockwise: "BracketRight",
	hold: "Backslash"
};

// ---------------

function copyControlsList(controlsList) {
	let res = [];
	for (let subList of controlsList) {
		let newSubList = [subList[0]];
		for (let i = 1; i < subList.length; i++) newSubList.push([...subList[i]]);
		res.push(newSubList);
	}
	return res;
}

class ControlsEditScreen {
	constructor(parent, controlsList, saveCallback) {
		this.parent = parent;
		/*
			Each element of controlsList is a two-element array:
			– If the first element is null, it is a header with the label as the second element.
			– Otherwise, it is a control with label as the first element and the currently configured value as the second.
		*/
		this.originalControlsList = controlsList;
		this.saveCallback = saveCallback;
	}

	init() {
		this.controlsList = copyControlsList(this.originalControlsList);
		this.selectedControl = 0;
		this.selectedSection = 0;
		this.editingTime = 0;
		document.addEventListener("keydown", this.keyDownHandler = (key) => { this.onKeyDown(key.code); });
	}

	onKeyDown(keycode) {
		if (this.editingTime) {
			this.currentControlsSublist[this.selectedControl+1][1] = keycode;
			this.editingTime = 0;
		} else switch (keycode) {
			case "ArrowRight":
				this.selectedSection = (this.selectedSection + 1) % this.controlsList.length;
				this.selectedControl = 0;
				break;
			case "ArrowLeft":
				this.selectedSection = (this.selectedSection + this.controlsList.length - 1) % this.controlsList.length;
				this.selectedControl = 0;
				break;
			case "ArrowDown":
				this.selectedControl = (this.selectedControl + 1) % (this.currentControlsSublist.length - 1);
				break;
			case "ArrowUp":
				this.selectedControl = (this.selectedControl + this.currentControlsSublist.length - 2) % (this.currentControlsSublist.length - 1);
				break;
			case "Enter":
				this.editingTime = 1000;
				break;
			case "KeyR":
				this.controlsList = copyControlsList(this.originalControlsList);
				break;
			case "Escape":
				this.saveCallback(this.controlsList);
				goBack();
				break;
		}
	}

	get currentControlsSublist() {
		return this.controlsList[this.selectedSection];
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
		if (this.editingTime) {
			this.editingTime = Math.max(0, this.editingTime - timePassed);
			if (!this.editingTime) this.currentControlsSublist[this.selectedControl+1][1] = null;
		}

		ctx.fillStyle = "#FFF";
		ctx.font = "300 40px Segoe UI";
		ctx.textAlign = "left";
		ctx.fillText("Edit controls", 15, 50);

		ctx.font = "12px Segoe UI";

		if (this.controlsList.length > 1) {
			ctx.textAlign = "center";
			ctx.fillText(this.currentControlsSublist[0], 475, 50);
			ctx.textAlign = "left";
			ctx.fillText("\u25c4", 360, 50);
			ctx.textAlign = "right";
			ctx.fillText("\u25ba", 590, 50);
		}

		ctx.strokeStyle = "#FFF";
		ctx.lineWidth = 1;
		ctx.strokeRect(70.5, 74.5 + 25 * this.selectedControl, 499, 24);

		if (this.editingTime) {
			ctx.globalAlpha = 0.3;
			ctx.fillRect(71, 75 + 25 * this.selectedControl, 0.498 * this.editingTime, 23);
			ctx.globalAlpha = 1;
		}

		ctx.textAlign = "left";
		for (let i = 1; i < this.currentControlsSublist.length; i++)
			ctx.fillText(this.currentControlsSublist[i][0], 150, 65 + 25 * i);
		ctx.textAlign = "right";
		for (let i = 1; i < this.currentControlsSublist.length; i++)
			ctx.fillText(formatKeycode(this.currentControlsSublist[i][1]), 490, 65 + 25 * i);
		
		ctx.textAlign = "center";
		ctx.fillText(this.editingTime ? "Press a key to set or wait to unset." : "Press Enter to configure this control; Esc to finish or R to revert all current changes.", 320, 340);
	}

	close() {
		document.removeEventListener("keydown", this.keyDownHandler);
	}
}