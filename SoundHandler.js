audioContext = new AudioContext();

var gainNode = audioContext.createGain();
gainNode.connect(audioContext.destination);

class SFX {
	constructor(id, outputNode) {
		this.ready = false;
		this.outputNode = outputNode;
		this.id = id;
	}

	load() {
		let id = this.id;
		delete this.id;
		id = soundEffectConfig[id];
		if ((id ?? 0) == 0) return;
		let request = new XMLHttpRequest();
		request.open('GET', `SFX/${id}.mp3?cacheonly=true`, true);
		request.responseType = 'arraybuffer';
		request.onload = () => {
			if (request.status != 200) {
				request.onerror();
				return;
			}
			audioContext.decodeAudioData(request.response, (buffer) => {
				this.buffer = buffer;
				this.ready = true;
			}, (error) => { console.error(error); });
		};
		request.onerror = () => {
			console.warn(`Tetreml: Failed to retrieve sound effect with ID ${id}. This sound effect will not be played.`)
		};
		request.send();
	}

	play(outputNode = this.outputNode) {
		if (!this.ready) return;
		let source = audioContext.createBufferSource();
		source.buffer = this.buffer;
		source.connect(outputNode);
		source.start();
	}
}

var originalSoundEffectConfig = {};

function loadOriginalSoundEffectConfig(callback) {
	let request = new XMLHttpRequest();
	request.open('GET', 'SFX/sfxconfig.json?state=original', true);
	request.responseType = 'json';
	request.onload = () => {
		if (request.status != 200) {
			request.onerror();
			return;
		}
		originalSoundEffectConfig = request.response;
		callback();
	};
	request.onerror = () => {};
	request.send();
}

var soundEffectConfig = {};

function loadSoundEffectConfig(callback) {
	let request = new XMLHttpRequest();
	request.open('GET', 'SFX/sfxconfig.json', true);
	request.responseType = 'json';
	request.onload = () => {
		if (request.status != 200) {
			request.onerror();
			return;
		}
		soundEffectConfig = request.response;
		loadOriginalSoundEffectConfig(async () => {
			let changed = false;
			for (let entry in originalSoundEffectConfig) if (!(entry in soundEffectConfig)) {
				soundEffectConfig[entry] = originalSoundEffectConfig[entry];
				changed = true;
			}
			if (changed) {
				(await caches.open("TetremlCustomAssets")).put('SFX/sfxconfig.json', new Response(JSON.stringify(soundEffectConfig)));
			}
			callback();
		});
	};
	request.onerror = () => {
		console.warn("Tetreml: Failed to retrieve sound effect configuration. No sound effects will be played.");
	};
	request.send();
}

var currentSong = null;

function stopCurrentMusic() {
	if (currentSong != null) currentSong.pause();
}

class Music {
	constructor(id, next, loadImmediately=true) {
		this.ready = false;
		this.id = id;
		this.next = next;
		this.playing = false;
		this.loadImmediately = loadImmediately;
		if (loadImmediately) this.load();
	}

	load() {
		this.id = musicConfig[this.id];
		if ((this.id ?? 0) == 0) {
			if (this.next != undefined && !this.loadImmediately) this.next.load();
			return;
		}
		this.audio = new Audio();
		this.audio.onloadeddata = () => {
			this.ready = true;
			if (this.playing) this.resume();
		};
		this.audio.onerror = () => {
			console.warn(`Tetreml: Failed to retrieve music track with ID ${this.id}. This track will not be played.`);
		}
		if (this.next == undefined)
			this.audio.loop = true;
		else {
			if (!this.loadImmediately) this.next.load();
			this.audio.onended = () => {
				this.next.play();
			};
		}
		this.audio.preload = "auto";
		this.audio.load();
		audioContext.createMediaElementSource(this.audio).connect(gainNode);
		this.audio.src = `Music/${this.id}.mp3?cacheonly=true`;
	}

	play(keepable = false) {
		if (keepable && currentSong != null && currentSong.id != 0 && (currentSong.next == undefined ? this.next != undefined && this.next.id == currentSong.id : this.id == currentSong.id)) return;
		if (this.id == 0 && this.next != undefined) {
			this.next.play(keepable);
			return;
		}
		if (currentSong != null) currentSong.pause();
		currentSong = this;
		this.playing = true;
		if (!this.ready) return;
		this.audio.currentTime = 0;
		this.audio.play();
	}

	pause() {
		this.playing = false;
		if (!this.ready) return;
		this.audio.pause();
	}

	resume(keepable = false) {
		if (this.id == 0) {
			if (this.next != undefined) {
				this.next.play(keepable);
			}
			return;
		}
		this.playing = true;
		if (!this.ready) return;
		this.audio.play();
	}

	reset() {
		if (!this.ready) return;
		this.audio.currentTime = 0;
	}

	setCurrent() {
		if (currentSong != null && (this.id == 0 ? this.next != undefined && this.next.id == currentSong.id : this.id == currentSong.id)) return;
		currentSong = this;
		this.reset();
	}
}

var originalMusicConfig = {};

function loadOriginalMusicConfig(callback) {
	let request = new XMLHttpRequest();
	request.open('GET', 'Music/musicconfig.json?state=original', true);
	request.responseType = 'json';
	request.onload = () => {
		if (request.status != 200) {
			request.onerror();
			return;
		}
		originalMusicConfig = request.response;
		callback();
	};
	request.onerror = () => {};
	request.send();
}

var musicConfig = {};

function loadMusicConfig(callback = () => {}) {
	let request = new XMLHttpRequest();
	request.open('GET', 'Music/musicconfig.json', true);
	request.responseType = 'json';
	request.onload = async () => {
		if (request.status != 200) {
			request.onerror();
			return;
		}
		musicConfig = request.response;
		loadOriginalMusicConfig(async () => {
			let changed = false;
			for (let entry in originalMusicConfig) if (!(entry in musicConfig)) {
				musicConfig[entry] = originalMusicConfig[entry];
				changed = true;
			}
			if (changed) {
				(await caches.open("TetremlCustomAssets")).put('Music/musicconfig.json', new Response(JSON.stringify(musicConfig)));
			}
			callback();
		});
	};
	request.onerror = () => {
		console.warn("Tetreml: Failed to retrieve music configuration. No music will be played.");
	};
	request.send();
}