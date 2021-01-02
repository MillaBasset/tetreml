var fileInput = document.getElementById("fileInput");

function onReplayFileChange() {
	document.getElementById("analyzeButton").disabled = fileInput.files.length == 0;
}

async function analyze() {
	let reader = new FileReader();
	let completePromise, replay;
	let promise = new Promise((resolve, reject) => { completePromise = resolve; });
	let fileName = fileInput.files[0].name;
	reader.addEventListener("load", (event) => {
		replay = JSON.parse(pako.inflate(event.target.result, { to: "string" }));
		completePromise();
	});
	reader.readAsBinaryString(fileInput.files[0]);
	await promise;
	if (replay.mode != "40-line") {
		alert("Only 40-line replays are supported currently.");
		return;
	}
	let playfield = new ReplayPlayfieldGuideline40Line();
	playfield.readStateData(replay.states[0]);
	let actionsMapping = {
		"moveLeft": (timestamp) => { playfield.move(-1); },
		"moveRight": (timestamp) => { playfield.move(1); },
		"softDrop": (timestamp) => { playfield.softDrop(); },
		"hardDrop": (timestamp) => { playfield.hardDrop(timestamp); },
		"rotateClockwise": (timestamp) => { playfield.rotateClockwise(); },
		"rotateCounterClockwise": (timestamp) => { playfield.rotateCounterClockwise(); },
		"hold": (timestamp) => { playfield.doHold(timestamp); },
		"afterClear": (timestamp) => { playfield.afterClear(timestamp); },
		"fall": (timestamp) => { playfield.fall(); },
		"lockDown": (timestamp) => { playfield.lockDown(timestamp); }
	};
	let oldTime = 0;
	for (let action of replay.actions) {
		let currentTime = action[0];
		playfield.processTimePassed(currentTime - oldTime);
		oldTime = currentTime;
		actionsMapping[action[1]](currentTime);
		if (playfield.over) break;
	}
	playfield.finalizeData();

	//document.playfield = playfield; // Debug.

	let segmentSize = Number.parseInt(document.getElementById("segmentSizeInput").value);
	let peakSpeed = 0;
	let currentSum = 0;
	let timeLog = playfield.timeLog;
	let heightData = [];
	let speedSVGData = "";
	let i = -segmentSize;
	for (let dataPoint of timeLog) {
		currentSum += dataPoint;
		if (i > -2) {
			if (i > -1) currentSum -= timeLog[i];
			let speed = segmentSize / currentSum * 1000;
			heightData.push(speed);
			peakSpeed = Math.max(speed, peakSpeed);
			oldSpeed = speed;
		}
		i++;
	}
	let horizontalPadding = i / 200, verticalPadding = peakSpeed / 200;
	for (let j = 0; j <= peakSpeed + verticalPadding; j++) speedSVGData += `<line class="unit ${j % 5 == 0}" x1=0 x2=${i} y1=${peakSpeed-j} y2=${peakSpeed-j}></line>`
	i = -1;
	let oldHeight = 0;
	for (let height of heightData) {
		height = peakSpeed - height;
		if (i > -1) speedSVGData += `<line class=main x1=${i} x2=${i + 1} y1=${oldHeight} y2=${height}></line>`;
		oldHeight = height;
		i++;
	}

	let boardString = "";
	let lastID = playfield.lastPlacedBoardID;
	for (let i = lastID; i > -1; i--) {
		boardString += "<tr>";
		for (let color of playfield.placedBoard[i]) boardString += `<td class="minoCell minoCell-${color}"></td>`;
		boardString += "</tr>";
	}

	document.getElementById("report").innerHTML = `
		<h1>Replay report</h1>
		<p>	     File name: <i>${fileName}</i>
			<br> Mode: 40-line (Sprint)
		</p>
		<h2>Basic statistics</h2>
		<table class=statsTable>
			<tr>
				<td>Time:</td>
				<td>${formatDurationWithMilliseconds(playfield.actionTime / 1000)}</td>
			</tr>
			<tr>
				<td>Game time:</td>
				<td>${formatDurationWithMilliseconds(oldTime / 1000)}</td>
			</tr>
			<tr>
				<td>Estimated time with all clear finish:</td>
				<td>${formatDurationWithMilliseconds(playfield.actionTime / playfield.tetriminoes / 10)}</td>
			</tr>
			<tr>
				<td>Tetriminoes placed:</td>
				<td>${playfield.tetriminoes}</td>
			</tr>
			<tr>
				<td>Holds:</td>
				<td>${playfield.holds}</td>
			</tr>
			<tr>
				<td>Tetriminoes per second:</td>
				<td>${formatNumber(playfield.tetriminoes / (playfield.actionTime / 1000))}</td>
			</tr>
			<tr>
				<td>Score:</td>
				<td>${playfield.score}</td>
			</tr>
			<tr>
				<td>Lines cleared:</td>
				<td>${playfield.lines}</td>
			</tr>
			<tr>
				<td>Max combo:</td>
				<td>${playfield.maxCombo || "[No combo.]"}</td>
			</tr>
			<tr>
				<td>Back-to-backs:</td>
				<td>${playfield.backToBacks}</td>
			</tr>
			<tr>
				<td>All clears:</td>
				<td>${playfield.allClears}</td>
			</tr>
		</table>
		<br>
		<table class=statsTable>
			<tr>
				<td>Line clear</td>
				<td class=right>Normal</td>
				<td class=right>T-spin</td>
				<td class=right>Total</td>
			</tr>
			<tr>
				<td>Zero-line</td>
				<td></td>
				<td class=right>${playfield.stats[0][1]}</td>
				<td></td>
			</tr>
			<tr>
				<td>Single</td>
				<td class=right>${playfield.stats[1][0]}</td>
				<td class=right>${playfield.stats[1][1]}</td>
				<td class=right>${playfield.stats[1][2]}</td>
			</tr>
			<tr>
				<td>Double</td>
				<td class=right>${playfield.stats[2][0]}</td>
				<td class=right>${playfield.stats[2][1]}</td>
				<td class=right>${playfield.stats[2][2]}</td>
			</tr>
			<tr>
				<td>Triple</td>
				<td class=right>${playfield.stats[3][0]}</td>
				<td class=right>${playfield.stats[3][1]}</td>
				<td class=right>${playfield.stats[3][2]}</td>
			</tr>
			<tr>
				<td>Tetris</td>
				<td class=right>${playfield.stats[4][0]}</td>
				<td></td>
				<td></td>
			</tr>
		</table>

		<h2>Details</h2>
		<p><b>Speed chart</b> (speed segment size: ${segmentSize})</p>
		<div style="display: flex">
			<svg style="flex-grow: 1; height: 300px;" preserveAspectRatio=none viewbox="${-horizontalPadding} ${-verticalPadding} ${i + 2 * horizontalPadding} ${peakSpeed + 2 * verticalPadding}">
				<style>
					* {
						vector-effect: non-scaling-stroke;
					}
					.unit {
						stroke-width: 1px;
						shape-rendering: crispEdges;
					}
					.unit.false {
						stroke: rgba(0, 0, 0, 0.2);
					}
					.unit.true {
						stroke: rgba(0, 0, 0, 0.7);
					}
					.main {
						stroke: black;
						stroke-width: 2px;
						stroke-linecap: round;
					}
				</style>
				${speedSVGData}
			</svg>
		</div>
		<p><b>Placed field</b></p>
		<div>
			<table>${boardString}</table>
		</div>
	`;
}