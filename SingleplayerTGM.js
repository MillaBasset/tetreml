// This file implements the Master mode from Tetris: The grand master 3 – Terror instinct. As this mode is quite complicated it is separated from RulesetsSingleplayer.js.

class GameScreenTGM extends GameScreenGuidelineBase {
	constructor(parent, showKeystrokes, doSaveReplay) {
		super(parent, showKeystrokes, doSaveReplay, true);
		this.shouldHintTetrimino = true;
		this.level = 0;
		this.speedLevel = 0;
		this.speedStepPointer = 0;
		this.speedSteps = [[30, 1067], [35, 711], [40, 533], [50, 427], [60, 356], [70, 267], [80, 133], [90, 89], [100, 67], [120, 53], [140, 44], [160, 38], [170, 33], [200, 30], [220, 1067], [230, 133], [233, 67], [236, 44], [239, 33], [243, 27], [247, 22], [251, 19], [300, 17], [330, 8], [360, 5], [400, 4], [420, 3], [450, 4], [500, 5], [Infinity, 0]];
		this.speedStepNext = this.speedSteps[0][0];
		this.fallPeriod = this.speedSteps[0][1];
		this.timingStepPointer = 0;
		// Speed to next level; Delay without clear; Delay with clear; Auto-repeat delay; Lock delay.
		this.timingSteps = [[500, 450, 1117, 267, 500], [600, 450, 867, 167, 500], [700, 450, 566, 167, 500], [800, 300, 433, 167, 500], [900, 233, 233, 167, 500], [1000, 233, 233, 133, 283], [1100, 133, 233, 133, 283], [1200, 117, 217, 133, 250], [Infinity, 100, 200, 133, 250]];
		this.timingStepNext = this.timingSteps[0][0];
		this.tetriminoDelay = this.timingSteps[0][1];
		this.clearDelay = this.timingSteps[0][2];
		this.autoRepeatDelay = this.timingSteps[0][3];
		this.autoRepeatPeriod = 17;
		this.lockDelay = this.timingSteps[0][4];
		this.shouldRingTheBell = false;

		this.levelsPerClear = [0, 1, 2, 4, 6];
		this.gradeNames = ['9', '8', '7', '6', '5', '4', '3', '2', '1', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'Master', 'MasterK', 'MasterV', 'MasterO', 'MasterM', 'Grand master'];
		// Grade boost; Decay interval; Single; Double; Triple; Tetris awards.
		this.internalGrades = [
			[0, 2083, 10, 20, 40, 50],
			[1, 1333, 10, 20, 30, 40],
			[2, 1333, 10, 20, 30, 40],
			[3, 833, 10, 15, 30, 40],
			[4, 750, 10, 15, 20, 40],
			[5, 750, 5, 15, 20, 30],
			[5, 750, 5, 10, 20, 30],
			[6, 667, 5, 10, 15, 30],
			[6, 667, 5, 10, 15, 30],
			[7, 667, 5, 10, 15, 30],
			[7, 667, 2, 12, 13, 30],
			[7, 667, 2, 12, 13, 30],
			[8, 500, 2, 12, 13, 30],
			[8, 500, 2, 12, 13, 30],
			[8, 500, 2, 12, 13, 30],
			[9, 333, 2, 12, 13, 30],
			[9, 333, 2, 12, 13, 30],
			[9, 333, 2, 12, 13, 30],
			[10, 333, 2, 12, 13, 30],
			[11, 333, 2, 12, 13, 30],
			[12, 250, 2, 12, 13, 30],
			[12, 250, 2, 12, 13, 30],
			[12, 250, 2, 12, 13, 30],
			[13, 250, 2, 12, 13, 30],
			[13, 250, 2, 12, 13, 30],
			[14, 250, 2, 12, 13, 30],
			[15, 250, 2, 12, 13, 30],
			[15, 250, 2, 12, 13, 30],
			[15, 250, 2, 12, 13, 30],
			[16, 250, 2, 12, 13, 30],
			[16, 166, 2, 12, 13, 30],
			[17, 166, 2, 12, 13, 30]
		];
		// Single; Double; Triple; Tetris.
		this.comboMultipliers = [[1, 1, 1, 1], [1, 1.2, 1.4, 1.5], [1, 1.2, 1.5, 1.8], [1, 1.4, 1.6, 2], [1, 1.4, 1.7, 2.2], [1, 1.4, 1.8, 2.3], [1, 1.4, 1.9, 2.4], [1, 1.5, 2, 2.5], [1, 1.5, 2.1, 2.6], [1, 2, 2.5, 3]];
		this.coolTimes = [52000, 52000, 49000, 45000, 45000, 42000, 42000, 38000, 38000];
		this.regretTimes = [90000, 75000, 75000, 68000, 60000, 60000, 50000, 50000, 50000, 50000];
		this.lastRegretMarkTime = 0;
		this.invisibleRollEligible = true;
		this.lastWasCool = false;
		this.coolDisplayLevel = 88;
		this.internalGrade = 0;
		this.internalGradePoints = 0;
		this.decayCounter = 0;
		this.coolRegretTime = 0;
		this.coolRegretBoost = 0;
		// This combo differs from the guideline. It only counts up if a double or better is made.
		this.internalCombo = -1;
		this.gameOverFromTorikan = false;

		// "Level 999" here is equivalent to the staff roll.
		this.level999DisappearingPoints = [0, 4, 8, 12, 26, 50];
		this.level999InvisiblePoints = [0, 10, 20, 30, 100, 160];
		this.level999Score = 0;
		// -2: Not level 999; -1: Going to be level 999; >-1: Time left for level 999.
		this.level999Time = -2;
		this.minoVisibilityLifetime = -1;
		
		let level500 = new Music("grandMaster_level500Opening", new Music("grandMaster_level500Loop"));
		let level800 = new Music("grandMaster_level800Opening", new Music("grandMaster_level800Loop"));
		this.musicSegments = [
			[500, null, new Music("grandMaster_level0Opening", new Music("grandMaster_level0Loop"))],
			[800, new Music("grandMaster_level500Trigger", level500), level500],
			[Infinity, new Music("grandMaster_level800Trigger", level800), level800]
		];
		this.musicLevel999 = new Audio("Music/Level 999.mp3?state=original");
		this.musicLevel999.preload = "auto";
		this.musicLevel999.load();
		this.musicEmpty = new Music(0, undefined, false);
		audioContext.createMediaElementSource(this.musicLevel999).connect(gainNode);

		this.singleSaveableFields.push("level", "speedLevel", "speedStepPointer", "speedStepNext", "fallPeriod", "timingStepPointer", "timingStepNext", "tetriminoDelay", "clearDelay", "autoRepeatDelay", "autoRepeatPeriod", "lockDelay", "shouldRingTheBell", "lastRegretMarkTime", "invisibleRollEligible", "lastWasCool", "coolDisplayLevel", "internalGrade", "internalGradePoints", "decayCounter", "coolRegretBoost", "internalCombo", "gameOverFromTorikan", "level999Score", "level999Time", "minoVisibilityLifetime");
	}

	init() {
		super.init();
	}

	start() {
		super.start();
		this.musicPointer = 0;
		currentSong = this.musicSegments[0][2];
		if (!this.isReplay) currentSong.play();
	}

	getMusicIndex() {
		let res = 0;
		while (this.speedLevel >= this.musicSegments[res][0]) res++;
		return res;
	}

	processGameLogic(timePassed) {
		if (this.state == GameState.playing) {
			if (this.level != 999 && this.current != null && this.internalGradePoints != 0 && this.internalCombo < 1 && (this.decayCounter += timePassed) >= this.internalGrades[Math.min(31, this.internalGrade)][1]) {
				this.internalGradePoints = Math.max(0, this.internalGradePoints - Math.floor(this.decayCounter / this.internalGrades[Math.min(31, this.internalGrade)][1]));
				if (this.internalGradePoints == 0) this.decayCounter = 0; else this.decayCounter %= this.internalGrades[Math.min(31, this.internalGrade)][1];
			}
			let endTime = this.playTime + this.level999Time;
			if (this.level999Time > -1 && (this.level999Time -= timePassed) < 1) {
				this.latestTime = endTime;
				this.level999Score += (this.invisibleRollEligible ? this.level999InvisiblePoints : this.level999DisappearingPoints)[5];
				this.level999Time = 0;
				this.gameOver(true);
			}
		}
		super.processGameLogic(timePassed);
	}

	renderBehind(timePassed) {
		super.renderBehind(timePassed);
		ctx.fillStyle = "#FFF";
		ctx.font = "12px Tetreml";
		ctx.textAlign = "left";
		ctx.fillText("Time", 485, 30);
		ctx.fillText("Level " + this.level, 485, 72);
		ctx.fillText("Score", 485, 114);
		ctx.fillText("Lines", 485, 134);
		
		ctx.textAlign = "right";
		ctx.fillText(this.gameOverFromTorikan ? 500 : this.level > 899 ? 999 : (Math.floor(this.level / 100) + 1) * 100, 632, 72);
		ctx.fillText(this.score, 632, 114);
		ctx.fillText(this.lines, 632, 134);

		ctx.fillRect(485, 76, this.gameOverFromTorikan ? 147 : 147 * (this.level % 100) / (this.level > 899 ? 99 : 100), 10);

		ctx.font = "20px Tetreml";
		let time = this.level == 999 ? this.lastRegretMarkTime : this.playTime;
		ctx.fillText(this.state == GameState.over || this.level == 999 ? formatDurationWithMilliseconds(time / 1000) : formatDuration(Math.floor(time / 1000)), 632, 30);

		if (this.coolRegretTime != 0) {
			ctx.fillStyle = this.coolRegretColor;
			if (this.isReplay || this.showKeystrokes) {
				ctx.font = "12px Tetreml";
				ctx.textAlign = "left";
				ctx.fillText(this.coolRegretText, 485, 159);
			} else {
				ctx.textAlign = "center";
				ctx.fillText(this.coolRegretText, 521, 230);
			}
			this.coolRegretTime = Math.max(0, this.coolRegretTime -= timePassed);
		}
	}

	renderInFront(timePassed) {
		super.renderInFront(timePassed);
		if (this.state == GameState.over) {
			ctx.font = "350 20px Tetreml";
			ctx.fillStyle = "#FFF";
			ctx.textAlign = "center";
			ctx.fillText("Grade", 320, 105, 160);
			ctx.font = "300 50px Tetreml";
			ctx.fillStyle = "#FF0";
			ctx.fillText(this.gradeText, 320, 160, 150);
		}
	}

	afterClear(time) {
		super.afterClear(time);
		if (this.level % 100 != 99 && this.level < 998) {
			let oldLevel = this.level;
			this.level++;
			this.speedLevel++;
			if (this.level == 998 || this.level % 100 == 99) this.shouldRingTheBell = true;
			this.processLeveling(oldLevel);
		}
		if (this.shouldRingTheBell) {
			if (!this.isSeeking) sfx.bell.play();
			this.shouldRingTheBell = false;
		}
		if (this.level999Time == -1) {
			this.totalMinos = 0;
			if (!this.isSeeking) {
				this.musicLevel999.currentTime = 0;
				this.musicLevel999.play();
			}
			this.level999Time = 54417 + time - this.latestTime;
		}
	}

	processLeveling(oldLevel) {
		oldLevel %= 100;
		let newLevel = this.level % 100;
		if (this.level < 900 && oldLevel < 70 && newLevel > 69) {
			let coolSectionTime = this.playTime - this.lastRegretMarkTime;
			if (this.lastWasCool = (coolSectionTime < (this.lastWasCool ? this.oldCoolSectionTime + 2001 : this.coolTimes[Math.floor(this.level / 100)])))
				this.coolDisplayLevel = 82 + Math.floor(Math.random() * 17);
			else this.invisibleRollEligible = false;
			this.oldCoolSectionTime = coolSectionTime;
		}
		if (oldLevel < 85 && newLevel > 84 && this.speedLevel + (this.lastWasCool ? 200 : 100) > this.musicSegments[this.musicPointer][0]) this.musicEmpty.play();
		if (!this.isSeeking && this.level < 900 && this.lastWasCool && oldLevel < this.coolDisplayLevel && (newLevel >= this.coolDisplayLevel || newLevel < oldLevel)) {
			this.coolRegretText = "COOL!";
			this.coolRegretColor = "#FF0";
			this.coolRegretTime = 5000;
		}
		if (oldLevel > newLevel || this.level == 999) {
			if (this.playTime - this.lastRegretMarkTime > this.regretTimes[Math.floor(this.level / 100) - 1]) {
				this.coolRegretBoost--;
				if (!this.isSeeking) {
					this.coolRegretText = "REGRET!";
					this.coolRegretColor = "#FFB2B2";
					this.coolRegretTime = 5000;
				}
				if (this.lastWasCool) this.speedLevel += 100;
				this.lastWasCool = false;
				this.invisibleRollEligible = false;
			} else if (this.lastWasCool) {
				this.coolRegretBoost++;
				this.speedLevel += 100;
			}
			this.lastRegretMarkTime = this.playTime;
			if (!this.isSeeking) {
				let musicIndex = this.getMusicIndex();
				if (this.state != GameState.over && musicIndex != this.musicPointer) {
					this.musicPointer = musicIndex;
					let music = this.musicSegments[musicIndex][1];
					music.play(music.id == 0);
				}
				if (this.state != GameState.over && this.level != 999) sfx.grandMasterLevelUp.play();
			}
		}

		while (this.speedLevel >= this.speedStepNext) {
			this.speedStepPointer++;
			this.speedStepNext = this.speedSteps[this.speedStepPointer][0];
			this.fallPeriod = this.speedSteps[this.speedStepPointer][1];
		}
		while (this.speedLevel >= this.timingStepNext) {
			this.timingStepPointer++;
			this.timingStepNext = this.timingSteps[this.timingStepPointer][0];
			this.tetriminoDelay = this.timingSteps[this.timingStepPointer][1];
			this.clearDelay = this.timingSteps[this.timingStepPointer][2];
			this.autoRepeatDelay = this.timingSteps[this.timingStepPointer][3];
			this.lockDelay = this.timingSteps[this.timingStepPointer][4];
		}
	}

	clearLines(toClear) {
		super.clearLines(toClear);
		let lines = toClear.length;
		this.clearTime = lines == 0 ? this.tetriminoDelay : this.clearDelay;
		if (lines != 0 && this.level != 999) {
			let oldLevel = this.level;
			this.level = Math.min(999, this.level + this.levelsPerClear[lines]);
			this.speedLevel += this.levelsPerClear[lines];
			if (this.level == 999) {
				this.level999Time = -1;
				this.clearTime = 3000;
				this.invisibleRollEligible = this.invisibleRollEligible && this.internalGrade > 26;
				this.minoVisibilityLifetime = this.invisibleRollEligible ? 0 : 5000;
				this.board = [];
				let col = [];
				this.minos = [];
				this.totalMinos = 1;
				for (let i = 0; i < 40; i++) {
					col.push(undefined);
					this.minos.push(0);
				}
				for (let i = 0; i < 10; i++) this.board.push([...col]);
				this.stackMinY = 40;
				this.clearedLines = [];
				currentSong.pause();
				if (!this.isSeeking) sfx.level999Trigger.play();
			} else if (this.level == 998 || this.level % 100 == 99) this.shouldRingTheBell = true;
			if (oldLevel < 500 && this.level > 499 && this.playTime > 419999) {
				this.gameOverFromTorikan = true;
				this.gameOver(true);
			}
			this.processLeveling(oldLevel);
		}

		let comboMultiplier = 1;
		if (lines > 1) {
			comboMultiplier = this.comboMultipliers[Math.min(9, ++this.internalCombo)][lines - 1];
		}
		if (lines != 0) {
			if (this.level999Time > -1) {
				this.level999Score += (this.invisibleRollEligible ? this.level999InvisiblePoints : this.level999DisappearingPoints)[lines];
			} else if ((this.internalGradePoints += Math.ceil(this.internalGrades[Math.min(31, this.internalGrade)][lines + 1] * comboMultiplier) * (Math.floor(this.level / 250) + 1)) > 99) {
				this.internalGrade++;
				this.internalGradePoints = 0;
				this.decayCounter = 0;
			}
		} else this.internalCombo = -1;
	}

	pause(playSound = true) {
		super.pause(playSound);
		if (this.level999Time > -1) this.musicLevel999.pause(); else currentSong.pause();
	}

	quit() {
		if (this.level999Time > -1) this.musicLevel999.pause(); else currentSong.pause();
		super.quit();
	}

	resume() {
		super.resume();
		if (this.level999Time > -1) {
			this.musicLevel999.currentTime = (55000 - this.level999Time) / 1000;
			this.musicLevel999.play();
		} else if (this.level != 999 && (this.speedLevel + (this.level % 100 > 84 && this.lastWasCool ? 115 : 15) < this.musicSegments[this.musicPointer][0])) {
			if (currentSong == this.musicEmpty)
				this.musicSegments[this.musicPointer][2].play();
			else currentSong.resume();
		} else this.musicEmpty.play();
	}

	gameOver(victory = false) {
		super.gameOver();
		if (this.level999Time > -1) {
			for (let x = 0; x < 10; x++) for (let y = 0; y < 40; y++) {
				let mino = this.board[x][y];
				if (mino) mino.disappearTime = -1;
			}
			this.musicLevel999.pause();
		} else currentSong.pause();
		if (!this.isSeeking) (victory ? sfx.complete : sfx.gameOver).play();
		this.gradeText = this.gradeNames[Math.min(32, Math.max(0, this.internalGrades[Math.min(31, this.internalGrade)][0] + this.coolRegretBoost + Math.floor(this.level999Score / 100)))];
	}

	getFallInterval() {
		return this.fallPeriod;
	}

	getLockDelay() {
		return this.lockDelay;
	}

	shouldDrawGhostTetrimino() {
		return this.level < 100;
	}

	readStateData(state) {
		if (this.level999Time > -1) this.musicLevel999.pause(); else stopCurrentMusic();
		super.readStateData(state);
		if (this.speedStepNext == null) this.speedStepNext = Infinity;
		if (this.timingStepNext == null) this.timingStepNext = Infinity;
	}

	finalizeSeek() {
		super.finalizeSeek();
		let musicIndex = this.getMusicIndex();
		if (this.level != 999 && musicIndex != this.musicPointer) {
			this.musicPointer = musicIndex;
			this.musicSegments[musicIndex][2].setCurrent();
		}
	}

	getModeName() {
		return "Grand master";
	}

	getModeNameForDisplay() {
		return "Grand master";
	}

	getMinoDisappearanceTime() {
		return this.minoVisibilityLifetime == -1 ? -1 : this.latestTime + this.minoVisibilityLifetime;
	}
}