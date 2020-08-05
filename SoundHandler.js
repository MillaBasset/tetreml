class SFX {
	constructor(source, polyphony) {
		this.polyphony = polyphony;
		this.instances = [];
		this.lastInstance = -1;
		for (let i = 0; i < polyphony; i++) {
			let audio = new Audio(source);
			audio.preload = "auto";
			audio.load();
			this.instances.push(audio);
		}
	}

	play() {
		this.instances[this.lastInstance = (this.lastInstance + 1) % this.polyphony].play();
	}

	setVolume(newVolume) {
		for (let instance of this.instances) instance.volume = newVolume;
	}
}