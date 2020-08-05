// Version: 7
self.addEventListener('install', function (event) {
	console.log("Tetreml: Updating files...");
	event.waitUntil(caches.delete("Tetreml"));
	event.waitUntil(caches.open("Tetreml").then(function(cache) { return cache.addAll([
		'Music/Level 1 main.mp3',
		'Music/Level 1 opening.mp3',
		'Music/Level 6.mp3',
		'Music/Level 11 main.mp3',
		'Music/Level 11 opening.mp3',
		'Music/Sandbox.mp3',
		'Music/Singleplayer game over main.mp3',
		'Music/Singleplayer game over opening.mp3',
		'Music/Two-player game over main.mp3',
		'Music/Two-player game over opening.mp3',

		'Pako/pako.min.js',
		'Pako/utils/common.js',
		'Pako/utils/strings.js',
		'Pako/zlib/adler32.js',
		'Pako/zlib/constants.js',
		'Pako/zlib/crc32.js',
		'Pako/zlib/deflate.js',
		'Pako/zlib/gzheader.js',
		'Pako/zlib/inffast.js',
		'Pako/zlib/inflate.js',
		'Pako/zlib/inftrees.js',
		'Pako/zlib/messages.js',
		'Pako/zlib/trees.js',
		'Pako/zlib/zstream.js',

		'SFX/After clear.wav',
		'SFX/All clear.wav',
		'SFX/Attack 1.wav',
		'SFX/Attack 2.wav',
		'SFX/Attack detonating.wav',
		'SFX/Attack near.wav',
		'SFX/Countdown.wav',
		'SFX/Defend.wav',
		'SFX/Double.wav',
		'SFX/Game over.wav',
		'SFX/Hard drop.wav',
		'SFX/Hold.wav',
		'SFX/Land.wav',
		'SFX/Level 6.wav',
		'SFX/Level 11.wav',
		'SFX/Lock.wav',
		'SFX/Move.wav',
		'SFX/Pause.wav',
		'SFX/Ready.wav',
		'SFX/Rotate.wav',
		'SFX/Single.wav',
		'SFX/Soft drop.wav',
		'SFX/Soft lock.wav',
		'SFX/T spin.wav',
		'SFX/Tetris.wav',
		'SFX/Triple.wav',
		'SFX/Warning.wav',
		'SFX/Win.wav',

		'Textures/Play screen sandbox.png',
		'Textures/Play screen singleplayer.png',
		'Textures/Play screen two-player.png',
		'Textures/Sandbox edit screen.png',
		'Textures/Sprite singleplayer.png',
		'Textures/Sprite two-player.png',

		'Controls.js',
		'/favicon.ico',
		'Fumen.js',
		'index.html',
		'MersenneTwister.js',
		'ProgressiveInstaller.js',
		'ReplayerSingleplayer.html',
		'ReplayerSingleplayer.js',
		'RulesetsSingleplayer.js',
		'SoundHandler.js',
		'Tetreml.html',
		'Tetreml.js',
		'Tetreml-2P.html',
		'Tetreml-2P.js',
		'Tetreml-sandbox.html',
		'Tetreml-sandbox.js',
		'Tetriminos.js',
		'Utils.js'
	]).catch((error) => { console.error(error); }) }));
	self.skipWaiting();
});

self.addEventListener('activate', function (event) {
	event.waitUntil(clients.claim());
	console.log("Tetreml: Update successful.");
});


self.addEventListener('fetch', function(event) {
	event.respondWith(
		caches.match(event.request).then(function (response) {
			return response || fetch(event.request);
		})
	);
});