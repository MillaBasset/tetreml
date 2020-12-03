// Version: 11
self.addEventListener('install', function (event) {
	console.log("Tetreml: Updating files...");
	event.waitUntil(caches.open("TetremlCustomAssets"));
	event.waitUntil(caches.delete("Tetreml"));
	event.waitUntil(caches.open("Tetreml").then(function(cache) { return cache.addAll([
		'Font/font.css',
		'Font/Tetreml.ttf',
		'Font/Tetreml italic.ttf',
		'Font/Tetreml semilight.ttf',
		'Font/Tetreml light.ttf',

		'GIF/gif.js',
		'GIF/gif.worker.js',
	
		'Music/-1.mp3',
		'Music/-2.mp3',
		'Music/-3.mp3',
		'Music/-4.mp3',
		'Music/-5.mp3',
		'Music/-6.mp3',
		'Music/-7.mp3',
		'Music/-8.mp3',
		'Music/-9.mp3',
		'Music/-10.mp3',
		'Music/-11.mp3',
		'Music/-12.mp3',
		'Music/-13.mp3',
		'Music/Level 999.mp3',
		'Music/musicconfig.json',

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

		'SFX/-1.mp3',
		'SFX/-2.mp3',
		'SFX/-3.mp3',
		'SFX/-4.mp3',
		'SFX/-5.mp3',
		'SFX/-6.mp3',
		'SFX/-7.mp3',
		'SFX/-8.mp3',
		'SFX/-9.mp3',
		'SFX/-10.mp3',
		'SFX/-11.mp3',
		'SFX/-12.mp3',
		'SFX/-13.mp3',
		'SFX/-14.mp3',
		'SFX/-15.mp3',
		'SFX/-16.mp3',
		'SFX/-17.mp3',
		'SFX/-18.mp3',
		'SFX/-19.mp3',
		'SFX/-20.mp3',
		'SFX/-21.mp3',
		'SFX/-22.mp3',
		'SFX/-23.mp3',
		'SFX/-24.mp3',
		'SFX/-25.mp3',
		'SFX/-26.mp3',
		'SFX/-27.mp3',
		'SFX/-28.mp3',
		'SFX/-29.mp3',
		'SFX/-30.mp3',
		'SFX/-31.mp3',
		'SFX/-32.mp3',
		'SFX/-33.mp3',
		'SFX/-34.mp3',
		'SFX/-35.mp3',
		'SFX/-36.mp3',
		'SFX/sfxconfig.json',

		'Textures/GIF background.png',
		'Textures/Outline sprite singleplayer.png',
		'Textures/Outline sprite two-player.png',
		'Textures/Play screen singleplayer.png',
		'Textures/Play screen two-player.png',
		'Textures/Sandbox edit screen.png',
		'Textures/Sprite singleplayer.png',
		'Textures/Sprite two-player.png',

		'Controls.js',
		'Customizer.html',
		'/favicon.ico',
		'Fumen.js',
		'HTMLHandler.js',
		'index.html',
		'MersenneTwister.js',
		'ProgressiveInstaller.js',
		'ReplayerSingleplayer.html',
		'ReplayerSingleplayer.js',
		'RulesetsSingleplayer.js',
		'SingleplayerShirase.js',
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


self.addEventListener('fetch', function (event) {
	let params = new URL(event.request.url).searchParams;
	event.respondWith(
		(async () => { return (params.get("state") != "original" && (await caches.match(event.request, { cacheName: "TetremlCustomAssets", ignoreSearch: true, ignoreVary: true }))) || (await caches.match(event.request, { cacheName: "Tetreml", ignoreSearch: true, ignoreVary: true })) || (params.get("cacheonly") == "true" ? new Response(null, { status: 404 }) : fetch(event.request)); })()
	);
});