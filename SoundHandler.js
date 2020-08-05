audioContext = new AudioContext();

var gainNode = audioContext.createGain();
gainNode.connect(audioContext.destination);

class SFX {
	constructor(source, outputNode) {
		this.outputNode = outputNode;
		this.ready = false;
		let request = new XMLHttpRequest();
		request.open('GET', source, true);
		request.responseType = 'arraybuffer';
		let that = this;
		request.onload = function () {
			audioContext.decodeAudioData(request.response, function (buffer) {
				that.buffer = buffer;
				that.ready = true;
			}, (error) => { console.error(error); });
		}
		request.send();
	}

	play() {
		if (!this.ready) return;
		let source = audioContext.createBufferSource();
		source.buffer = this.buffer;
		source.connect(this.outputNode);
		source.start(0);
	}
}