var GameState = {}
GameState.warmup = 0;
GameState.playing = 1;
GameState.paused = 2;
GameState.over = 3;

var Reward = {}
Reward.single = 0;
Reward.double = 1;
Reward.triple = 2;
Reward.tetris = 3;
Reward.zeroTSpin = 4;
Reward.singleTSpin = 5;
Reward.doubleTSpin = 6;
Reward.tripleTSpin = 7;

function formatDuration(secs) {
	sec = secs%60;
	min = Math.floor(secs%3600/60);
	hour = Math.floor(secs%86400/3600);
	day = Math.floor(secs/86400);
	
	return (day > 0 ? day + 'd' : '') + (secs > 3599 && (secs < 86400 || secs%86400 != 0) ? hour + 'h' : '') + (secs > 59 && (secs < 3600 || secs%3600 != 0) ? (secs > 3599 && min < 10 ? '0' : '') + min + (sec < 10 ? ':0' : ':') + sec : secs < 60 ? sec + "\"" : '');
}

function formatDurationWithMilliseconds(s) {
	let secs = Math.floor(s);
	sec = secs%60;
	min = Math.floor(secs%3600/60);
	hour = Math.floor(secs%86400/3600);
	day = Math.floor(secs / 86400);
	millis = Math.floor((s * 1000) % 1000);
	millis = "," + (millis < 100 ? "0" : "") + (millis < 10 ? "0" : "") + millis;
	
	return (day > 0 ? day + 'd' : '') + (secs > 3599 && (secs < 86400 || secs%86400 != 0) ? hour + 'h' : '') + (secs > 59 && (secs < 3600 || secs%3600 != 0) ? (secs > 3599 && min < 10 ? '0' : '') + min + (sec < 10 ? ':0' : ':') + sec + millis : secs < 60 ? sec + millis + "\"" : '');
}

function formatNumber(number, decimalDigits = 3) {
	return number.toFixed(decimalDigits).replace(".", ",");
}

const formatKeycodeNames = {
	null: "[None.]",
	Enter: "\u21B5",
	Escape: "Esc",
	Space: "\u2423",
	Tab: "\u21B9",
	Delete: "\u2326",
	Backspace: "\u232B",
	ArrowUp: "\u2191",
	ArrowDown: "\u2193",
	ArrowLeft: "\u2190",
	ArrowRight: "\u2192",
	Minus: "-",
	Equal: "=",
	BracketLeft: "[",
	BracketRight: "]",
	Semicolon: ";",
	Quote: "'",
	Backquote: "`",
	Comma: ",",
	Period: ".",
	Slash: "/",
	Backslash: "\\",
	NumpadDivide: "Numpad /",
	NumpadMultiply: "Numpad *",
	NumpadAdd: "Numpad +",
	NumpadSubtract: "Numpad -",
	NumpadDecimal: "Numpad ."
};

function formatKeycode(keycode) {
	let keyName = formatKeycodeNames[keycode];
	if (keyName != undefined) return keyName;
	if (keycode.startsWith("Key")) return keycode.substring(3);
	if (keycode.startsWith("Digit")) return keycode.substring(5);
	if (keycode.startsWith("Numpad")) return "Numpad " + keycode.substring(6);
	return keycode;
}

function createAndDownloadFile(filename, data) {
	var blob = new Blob([data], {type: 'text/json'});
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
}

function DASDiv(dividend, divisor) {
	return divisor == 0 ? dividend > 0 ? Infinity : 0 : Math.max(0, Math.floor(dividend / divisor));
}