var mainWindow = document.getElementById("mainWindow");
var ctx = mainWindow.getContext("2d");

var adaptiveSizing = true;
var scale = 1;

function setAdaptiveSizing(enabled) {
	localStorage.tetrisAdaptiveSizing = adaptiveSizing = enabled;
	if (enabled) fitScreen(); else {
		mainWindow.width = 640;
		mainWindow.height = 360;
		ctx.scale(1, 1);
		scale = 1;
	}
}

function fitScreen() {
	let width = innerWidth - 20;
	let height = innerHeight - 20;
	scale = Math.max(1, Math.floor(width / height > 16 / 9 ? height / 360 : width / 640));
	mainWindow.width = Math.floor(640 * scale);
	mainWindow.height = Math.floor(360 * scale);
	ctx.scale(scale, scale);
}

function toggleAdaptiveSizing() {
	setAdaptiveSizing(!adaptiveSizing);
}

addEventListener('resize', function() {
	if (!adaptiveSizing) return;
	fitScreen();
});

setAdaptiveSizing(localStorage.tetrisAdaptiveSizing ? localStorage.tetrisAdaptiveSizing == "true" : true);

var selector = document.getElementById('selector');
selector.addEventListener('change', function(event) {
	location.replace(this.options[this.selectedIndex].value);
});

selector.addEventListener('click', function (event) {
	if (event.detail == 2) {
		event.preventDefault();
		toggleAdaptiveSizing();
	}
});

delete selector;