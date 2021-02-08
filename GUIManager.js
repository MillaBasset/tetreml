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
var oldTime = null;

function render(timestamp) {
	requestAnimationFrame(render);
	let timePassed = 0;
	timestamp = Math.floor(timestamp);
	if (oldTime == null) {
		oldTime = timestamp;
		return;
	} else {
		timePassed = timestamp - oldTime;
		oldTime = timestamp;
	}
	if (!isBusyRendering) try {
		isBusyRendering = true;
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, 640, 360);
		if (currentGui == null) return;
		currentGui.render(timePassed);
	} finally {
		isBusyRendering = false;
	}
}