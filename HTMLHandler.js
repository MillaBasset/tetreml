var mainWindow = document.getElementById("mainWindow");
var ctx = mainWindow.getContext("2d");

var adaptiveSizing = true;
var scale = 1;
var adaptiveSizingPadding = mainWindow.dataset.padding ?? 0;

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
	let width = innerWidth;
	let height = innerHeight - adaptiveSizingPadding;
	scale = width / height > 16 / 9 ? height / 360 : width / 640;
	scale = scale >= 1 ? Math.floor(scale) : 1/Math.ceil(1/scale);
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
	location.replace(this.value);
});

selector.addEventListener('click', function (event) {
	if (event.detail == 2) {
		event.preventDefault();
		toggleAdaptiveSizing();
	}
});

delete selector;