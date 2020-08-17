// Version: 1
self.addEventListener('install', function (event) {
	console.log("Tetreml: Updating files...");
	event.waitUntil(caches.delete("Tetreml"));
	event.waitUntil(caches.open("Tetreml").then(function(cache) { return cache.addAll([
		'Font/font.css',
		'Font/segoeui.ttf',
		'Font/segoeuii.ttf',
		'Font/segoeuil.ttf',
		'Font/segoeuisl.ttf',
	
		'Music/Level 1 main.mp3',
		'Music/Level 1 opening.mp3',
		'Music/Level 6.mp3',
		'Music/Level 11 main.mp3',
		'Music/Level 11 opening.mp3',
		'Music/Level 999.mp3',
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

		'SFX/After clear.mp3',
		'SFX/All clear.mp3',
		'SFX/Attack 1.mp3',
		'SFX/Attack 2.mp3',
		'SFX/Attack detonating.mp3',
		'SFX/Attack near.mp3',
		'SFX/Bell.mp3',
		'SFX/Countdown.mp3',
		'SFX/Defend.mp3',
		'SFX/Double.mp3',
		'SFX/Game over.mp3',
		'SFX/Hard drop.mp3',
		'SFX/Hold.mp3',
		'SFX/Land.mp3',
		'SFX/Level 6.mp3',
		'SFX/Level 11.mp3',
		'SFX/Level 999 trigger.mp3',
		'SFX/Lock.mp3',
		'SFX/Move.mp3',
		'SFX/Pause.mp3',
		'SFX/Ready.mp3',
		'SFX/Rotate.mp3',
		'SFX/Single.mp3',
		'SFX/Soft drop.mp3',
		'SFX/Soft lock.mp3',
		'SFX/T spin.mp3',
		'SFX/Tetrimino I.mp3',
		'SFX/Tetrimino J.mp3',
		'SFX/Tetrimino L.mp3',
		'SFX/Tetrimino O.mp3',
		'SFX/Tetrimino S.mp3',
		'SFX/Tetrimino T.mp3',
		'SFX/Tetrimino Z.mp3',
		'SFX/Tetris.mp3',
		'SFX/Triple.mp3',
		'SFX/Warning.mp3',
		'SFX/Win.mp3',

		'Textures/Play screen singleplayer.png',
		'Textures/Play screen two-player.png',
		'Textures/Sandbox edit screen.png',
		'Textures/Sprite singleplayer.png',
		'Textures/Sprite two-player.png',

		'Controls.js',
		'/favicon.ico',
		'Fumen.js',
		'HTMLHandler.js',
		'index.html',
		'MersenneTwister.js',
		'ProgressiveInstaller.js',
		'ReplayerSingleplayer.html',
		'ReplayerSingleplayer.js',
		'RulesetsSingleplayer.js',
		'SingleplayerTGM.js',
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
