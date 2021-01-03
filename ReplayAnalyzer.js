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

	let averageSpeed = playfield.tetriminoes / (playfield.actionTime / 1000);

	let segmentSize = Number.parseInt(document.getElementById("segmentSizeInput").value);
	let peakSpeed = 0;
	let currentSum = 0;
	let timeLog = playfield.timeLog;
	let heightData = [];
	let speedSVGData = "";
	let bucketsSVGData = "";
	let i = -segmentSize;
	let timeBuckets = []; // Tetriminoes in each bucket.
	let highestBucket = -1, lowestBucket = 0, maxBucket = -1;

	for (let dataPoint of timeLog) {
		currentSum += dataPoint;
		if (i > -2) {
			if (i > -1) currentSum -= timeLog[i];
			let speed = segmentSize / currentSum * 1000;
			heightData.push(speed);
			peakSpeed = Math.max(speed, peakSpeed);
			oldSpeed = speed;
		}
		let bucket = Math.floor(dataPoint / 100);
		if (highestBucket == -1) {
			timeBuckets.push(1);
			highestBucket = lowestBucket = bucket;
		} else {
			while (bucket < lowestBucket) { timeBuckets.unshift(0); lowestBucket--; }
			while (bucket > highestBucket) { timeBuckets.push(0); highestBucket++; }
			timeBuckets[bucket - lowestBucket]++;
		}
		i++;
	}
	let horizontalPadding = i / 200, verticalPadding = peakSpeed / 200;
	for (let j = 0; j <= peakSpeed + verticalPadding; j++) speedSVGData += `<line class="unit ${j % 5 == 0}" x1=0 x2=${i} y1=${peakSpeed - j} y2=${peakSpeed - j} />`;
	i = -1;
	let oldHeight = 0;
	for (let height of heightData) {
		height = peakSpeed - height;
		if (i > -1) speedSVGData += `<line class=main x1=${i} x2=${i + 1} y1=${oldHeight} y2=${height} />`;
		oldHeight = height;
		i++;
	}
	speedSVGData += `
		<line class=average x1=0 x2=${i} y1=${peakSpeed - averageSpeed} y2=${peakSpeed - averageSpeed} />
		<rect class=tooltip x=0 y=${peakSpeed - averageSpeed - 0.1} width=${i} height=0.2><title>Average tetrimino rate:&#10;${formatNumber(averageSpeed)} / second</title></rect>
	`;
	let speedChartSize = i;

	function formatBucketsLabel(value) {
		let lastDigit = value % 10;
		return Math.floor(value / 10) + (lastDigit == 0 ? '"' : `,${lastDigit}"`);
	}
	i = 0; currentBucket = lowestBucket;
	for (bucket of timeBuckets) {
		if (bucket != 0) bucketsSVGData += `<rect class=bucket x=${i} y=${-bucket} width=14 height=${bucket}><title>${formatBucketsLabel(currentBucket)} ÷ ${formatBucketsLabel(currentBucket + 1)}&#10;${bucket} tetrimino${bucket == 1 ? "" : "es"}</title></rect>`;
		currentBucket++;
		i += 15;
		maxBucket = Math.max(maxBucket, bucket);
	}
	let bucketsChartWidth = (highestBucket - lowestBucket + 1) * 15 - 1;
	for (let j = 0; j <= maxBucket; j += 10) bucketsSVGData += `<line class="unit ${j % 50 == 0}" x1=0 x2=${bucketsChartWidth} y1=${-j} y2=${-j} />`;
	let averageTetriminoTime = playfield.actionTime / playfield.tetriminoes;
	let bucketAverageX = (averageTetriminoTime - lowestBucket * 100) * 0.15;
	bucketsSVGData += `
		<line class=average x1=${bucketAverageX} x2=${bucketAverageX} y1=${-maxBucket} y2=0 />
		<rect class=tooltip x=${bucketAverageX - 1} y=${-maxBucket} width=2 height=${maxBucket}><title>Average tetrimino time:&#10;${formatDurationWithMilliseconds(averageTetriminoTime / 1000)}</title></rect>
	`;

	/* Buckets chart labels, not working well currently as there is no way to keep the text size from scaling along with the SVG.
	let bucketsLabelsSVGData = "";
	let maxBucketLabel = Math.floor((highestBucket - 1) / 10) + 1;
	for (let j = Math.floor(lowestBucket / 10) + 1; j < maxBucketLabel; j++)
		bucketsLabelsSVGData += `<text class=bucketsLabel x=${(j * 10 - lowestBucket) * 15} y=0.9 text-anchor=middle>${j}"</text>`;
	bucketsLabelsSVGData += `
		<text class=bucketsLabel x=0 y=0.9 text-anchor=start>${formatBucketsLabel(lowestBucket)}</text>
		<text class=bucketsLabel x=${bucketsChartWidth} y=0.9 text-anchor=end>${formatBucketsLabel(highestBucket+1)}</text>
	`;*/

	let boardString = "";
	let lastID = playfield.lastPlacedBoardID;
	for (let i = lastID; i > -1; i--) {
		boardString += "<tr>";
		for (let color of playfield.placedBoard[i]) boardString += `<td class="minoCell minoCell-${color}"></td>`;
		boardString += "</tr>";
	}
	
	let actionTable = "";
	let lastWasReward = true;
	let maxActionTime = 0;
	for (let action of playfield.actionLog) if (action.type == "Hold" || action.type == "Tetrimino") maxActionTime = Math.max(maxActionTime, action.time);
	let totalActionTime = 0;
	let totalActionScore = 0;
	let totalRewardScore = 0;
	for (let action of playfield.actionLog) {
		switch (action.type) {
			case "Tetrimino":
			case "Hold":
				if (!lastWasReward) actionTable += "<td></td><td></td>";
				actionTable += `
					</tr><tr>
					<td>${formatDurationWithMilliseconds(action.timestamp / 1000)}</td>
					<td>${action.tetrimino}</td>
					<td>${formatDurationWithMilliseconds(action.time / 1000)}</td>
					<td><div class=actionTimeRect style="width: ${action.time / maxActionTime * 100}px;"></div></td>
					<td>${action.score}</td>
				`;
				lastWasReward = false;
				totalActionTime += action.time;
				totalActionScore += action.score;
				break;
			case "Reward":
				if (lastWasReward) actionTable += `</tr><tr><td></td><td></td><td></td><td></td><td></td>`;
				actionTable += `
					<td>${action.rewardName}</td>
					<td>${action.rewardAmount}</td>
				`;
				totalRewardScore += action.rewardAmount;
				lastWasReward = true;
				break;
		}
	}
	actionTable = actionTable.substring(5) + `</tr>
		<tr class=actionTableTotalRow>
			<td>${formatDurationWithMilliseconds(oldTime / 1000)}</td>
			<td></td>
			<td>${formatDurationWithMilliseconds(totalActionTime / 1000)}</td>
			<td></td>
			<td>${totalActionScore}</td>
			<td></td>
			<td>${totalRewardScore}</td>
		</tr>
	`;

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
				<td>${formatNumber(averageSpeed)}</td>
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
			<svg style="flex-grow: 1; height: 300px;" preserveAspectRatio=none viewbox="${-horizontalPadding} ${-verticalPadding} ${speedChartSize + 2 * horizontalPadding} ${peakSpeed + 2 * verticalPadding}">
				<style>
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
					.average {
						stroke: black;
						stroke-width: 1px;
						stroke-dasharray: 5, 5;
					}
					.main {
						stroke: black;
						stroke-width: 2px;
						stroke-linecap: round;
					}
					.tooltip {
						fill: rgba(0, 0, 0, 0);
					}
				</style>
				${speedSVGData}
			</svg>
		</div>
		<p><b>Tetrimino time distribution</b></p>
		<div style="display: flex">
			<svg style="flex-grow: 1; height: 300px;" preserveAspectRatio=none viewBox="0 ${-maxBucket} ${bucketsChartWidth} ${maxBucket + 1}">
				<style>
					* {
						vector-effect: non-scaling-stroke;
					}
					.bucket {
						fill: rgba(0, 0, 0, 0.6);
					}
				</style>
				${bucketsSVGData}
			</svg>
		</div>
		<p><b>Placed field</b></p>
		<div>
			<table>${boardString}</table>
		</div>
		<p><details>
			<summary><b>Action log</b></summary>
			<table class=actionTable>
				<tr class=actionTableHeader>
					<th>Timestamp</th>
					<th colspan=4>Action</th>
					<th colspan=2>Reward</th>
				</tr>
				<tr class=actionTableSubheader>
					<td></td>
					<td>Tetrimino</td>
					<td>Time</td>
					<td></td>
					<td>Score</td>
					<td>Name</td>
					<td>Score</td>
				</tr>
				${actionTable}
			</table>
		</details></p>
	`;
}