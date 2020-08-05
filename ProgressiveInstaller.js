if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('ProgressiveWorker.js', { scope: '.' });
}