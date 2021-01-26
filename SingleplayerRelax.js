const zoneRewardMapping = [undefined, "Monotris", "Ditris", "Tritris", "Tetratris", "Pentatris", "Hexatris", "Heptatris", "Octotris", "Enneatris", "Decatris", "Hendecatris", "Dodecatris", "Triadecatris", "Tesseradecatris", "Pentedecatris", "Hexadecatris", "Heptadecatris", "Octodecatris", "Enneadecatris", "Icositris", "Icosikaihenatris", "Icosidyotris"];

class GameScreenRelax extends GameScreenGuidelineBase {
	constructor(parent, showKeystrokes, doSaveReplay, lineClearDelayEnabled) {
		super(parent, showKeystrokes, false, true);
		this.inZone = false;
		this.zoneTime = 0;
		this.zoneLines = 0;
		this.oldZoneLines = 0;
		this.zoneMultiplier = 0;
		this.zoneDisplayAnimationTime = 0;
		this.zoneEndAnimationTime = 2000;
		this.originalLineClearDelayEnabled = this.lineClearDelayEnabled = lineClearDelayEnabled;
		this.music = new Music("relax_opening", new Music("relax_loop"));
		this.colorInversionEnabled = false;
		this.colorInversionChanging = false;
		this.colorInversionIncrease = false;
		this.colorInversionTime = 0;
		this.colorInversionValue = 0;
	}

	start() {
		super.start();
		this.music.play();
	}

	processGameLogic(timePassed) {
		if (this.state == GameState.playing && !this.inZone && buttonStatus.zone && this.isTetriminoControllable() && this.zoneTime != 0) {
			buttonStatus.zone = false;
			this.inZone = true;
			this.zoneLines = 0;
			this.zoneMultiplier = this.zoneTime > 19999 ? 1 : 0;
			this.shouldPlayClearSounds = false;
			this.lineClearDelayEnabled = false;
		}
		super.processGameLogic(timePassed);
		if (this.inZone && this.state == GameState.playing && (this.zoneTime = Math.max(0, this.zoneTime - timePassed)) == 0) this.endZone();
	}

	endZone() {
		if (this.zoneLines != 0) {
			this.rewardName = zoneRewardMapping[this.zoneLines];
			this.score += this.rewardAmount = 100 * this.zoneLines;
			this.rewardTime = 5000;
		}
		this.clearedLines = [];
		for (let i = 0, j = 40 - this.zoneLines; i < this.zoneLines; i++, j++) this.clearedLines.push(j);
		this.inZone = false;
		this.stackMinY += this.zoneLines;
		this.lineClearDelayEnabled = this.originalLineClearDelayEnabled;
		if (this.lineClearDelayEnabled && this.zoneLines != 0) {
			this.clearTime = 2000;
			this.oldZoneLines = this.zoneLines;
			this.zoneEndAnimationTime = 0;
		} else this.afterClear();
		this.zoneLines = 0;
		this.zoneTime = 0;
		this.fallTime = 0;
		this.lockTime = 0;
		this.shouldPlayClearSounds = true;
		this.clearEffectTime = 1000;
		this.colorInversionChanging = true;
		this.colorInversionIncrease = false;
		this.colorInversionTime *= 2;
		sfx.zoneEnd.play();
	}

	clearLines(toClear) {
		let oldZoneLines = this.zoneLines;
		this.zoneLines += toClear.length;
		super.clearLines(toClear);
		if (this.inZone) {
			if (toClear.length != 0) {
				let x;
				for (let row of this.clearedLines.sort((a, b) => b - a)) {
					for (let x = 0; x < 10; x++) {
						this.board[x].splice(row, 1);
						this.board[x].push(new Mino(0, 0, 0));
					}
					this.minos.splice(row, 1);
					this.minos.push(10);
				}
				this.clearedLines = [];
				this.zoneDisplayAnimationTime = 150;
				if (oldZoneLines < 8 && this.zoneLines > 7) {
					this.colorInversionEnabled = true;
					this.colorInversionChanging = true;
					this.colorInversionIncrease = true;
					this.zoneMultiplier++;
				}
			}
		} else {
			if (this.zoneLines > 9) {
				this.zoneTime = Math.min(20000, this.zoneTime + 5000 * Math.floor(this.zoneLines / 10));
				this.zoneLines %= 10;
			}
		}
	}

	gameOver() {
		if (this.inZone) {
			this.endZone();
		} else {
			super.gameOver();
			sfx.gameOver.play();
		}
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Score", 485, 30);
		ctx.fillText("Lines", 485, 72);
		ctx.fillText("Zone: " + Math.floor(this.zoneTime / 1000) + (this.inZone ? "," + Math.floor(this.zoneTime % 1000 / 100) : "") + '"', 485, 92);
		ctx.fillText("Time elapsed", 485, 154);
		
		ctx.textAlign = "right";
		ctx.fillText("" + this.lines, 632, 72);
		ctx.fillText("20\"", 632, 92);
		if (!this.inZone) ctx.globalAlpha = 0.6;
		ctx.fillRect(485, 96, 147 / 20000 * this.zoneTime, 10);
		ctx.globalAlpha = 1;
		ctx.fillText(formatDuration(Math.floor(this.playTime / 1000)), 632, 154);

		ctx.font = "20px Tetreml";
		ctx.fillText("" + this.score, 632, 30);
	}

	bouncy(input) {
		return input < 0.4 ? -2.5 * input**2 + input : (input - 0.4) / 0.6;
	}

	renderZoneLines(zoneLines, alpha) {
		ctx.font = zoneLines < 3 ? "24px Tetreml" : "48px Tetreml";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 2;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		let x = this.gridX + 5 * this.minoSize;
		let y = this.gridY + (22 - zoneLines / 2) * this.minoSize;
		ctx.save();
		let newScale = scale * (1 + this.bouncy(this.zoneDisplayAnimationTime / 150));
		ctx.setTransform(newScale, 0, 0, newScale, x * scale, y * scale);
		ctx.globalAlpha = alpha * (1 - this.zoneDisplayAnimationTime / 150);
		ctx.strokeText(zoneLines, 0, 0);
		ctx.fillText(zoneLines, 0, 0);
		ctx.restore();
		ctx.textBaseline = "alphabetic";
		ctx.globalAlpha = 1;
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);
		if (this.state == GameState.playing) {
			if (this.inZone && this.zoneLines != 0) {
				ctx.globalAlpha = 0.5;
				ctx.fillStyle = "#FFF";
				ctx.fillRect(this.gridX, this.gridY + (22 - this.zoneLines) * this.minoSize, 10 * this.minoSize, this.zoneLines * this.minoSize);
				this.renderZoneLines(this.zoneLines, 0.7);
				this.zoneDisplayAnimationTime = Math.max(0, this.zoneDisplayAnimationTime - timePassed);
			}
			if (this.zoneEndAnimationTime < 2000 && this.oldZoneLines != 0) {
				let curve = (this.zoneEndAnimationTime / 2000) ** 5;
				ctx.fillStyle = "rgb(255, 255, " + (255 * (1 - curve)) + ")";
				ctx.globalAlpha = 1 - curve;
				let height = this.oldZoneLines * this.minoSize;
				ctx.fillRect(
					this.gridX - this.minoSize * 5 * curve,
					this.gridY + (22 - this.oldZoneLines) * this.minoSize + height * curve / 2,
					this.minoSize * 10 * (1 + curve),
					height * (1 - curve)
				);
				this.renderZoneLines(this.oldZoneLines, 1 - Math.max(0, Math.min(1, (this.zoneEndAnimationTime - 500) / 1000)));
				this.zoneEndAnimationTime += timePassed;
				this.zoneDisplayAnimationTime = Math.max(0, this.zoneDisplayAnimationTime - timePassed);
			}
			if (this.colorInversionChanging) {
				if (this.colorInversionIncrease) {
					if ((this.colorInversionTime = Math.min(800, this.colorInversionTime + timePassed)) == 800) this.colorInversionChanging = false;
					this.colorInversionValue = this.colorInversionTime / 800;
				} else {
					if ((this.colorInversionTime = Math.max(0, this.colorInversionTime - timePassed)) == 0) {
						this.colorInversionChanging = false;
						this.colorInversionEnabled = false;
					}
					this.colorInversionValue = this.colorInversionTime / 1600;
				}
			}
		}

		if (this.colorInversionEnabled) {
			ctx.save();
			ctx.filter = `invert(${this.colorInversionValue})`;
			ctx.drawImage(mainWindow, 0, 0, 640, 360);
			ctx.restore();
		}
	}

	hardDrop(timestamp) {
		let res = super.hardDrop(timestamp);
		if (this.inZone) {
			this.score += this.lockScore * this.zoneMultiplier;
			this.lockScore *= this.zoneMultiplier + 1;
		}
		return res;
	}

	softDrop(timestamp) {
		let res = super.softDrop(timestamp);
		if (this.inZone && !res) this.score += this.zoneMultiplier;
		return res;
	}

	getRewardAmount(reward) {
		return super.getRewardAmount(reward) * (this.inZone ? 1 + this.zoneMultiplier : 1);
	}

	getFallInterval() {
		return this.inZone ? Infinity : 1000;
	}

	getLockDelay() {
		return this.inZone ? Infinity : 500;
	}

	pause(playSound = true) {
		super.pause(playSound);
		this.music.pause();
	}

	quit() {
		this.music.pause();
		super.quit();
	}

	resume() {
		super.resume();
		this.music.resume();
	}

	getModeName() {
		return "Relax";
	}

	getModeNameForDisplay() {
		return "Relax";
	}
}