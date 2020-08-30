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
		callback();
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
			if (this.playing) this.play();
		};
		this.audio.onerror = () => {
			console.warn(`Tetreml: Failed to retrieve music track with ID ${this.id}. This track will not be played.`);
		}
		if (this.next == undefined)
			this.audio.loop = true;
		else {
			if (!this.loadImmediately) this.next.load();
			this.audio.onended = () => {
				currentSong = this.next;
				currentSong.play();
			};
		}
		this.audio.preload = "auto";
		this.audio.load();
		audioContext.createMediaElementSource(this.audio).connect(gainNode);
		this.audio.src = `Music/${this.id}.mp3?cacheonly=true`;
	}

	play() {
		if (this.id == 0) {
			if (this.next != undefined) {
				currentSong = this.next;
				currentSong.play();
			}
			return;
		}
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

	resume() {
		if (this.id == 0) {
			if (this.next != undefined) {
				currentSong = this.next;
				currentSong.play();
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
}

var musicConfig = {};

function loadMusicConfig(callback = () => {}) {
	let request = new XMLHttpRequest();
	request.open('GET', 'Music/musicconfig.json', true);
	request.responseType = 'json';
	request.onload = () => {
		if (request.status != 200) {
			request.onerror();
			return;
		}
		musicConfig = request.response;
		callback();
	};
	request.onerror = () => {
		console.warn("Tetreml: Failed to retrieve music configuration. No music will be played.");
	};
	request.send();
}