/**
 * Page splash controller: the splash markup is server-rendered inside every
 * BaseLayout page (starts visible, solid cover). This script hides it once
 * the page is ready, re-shows it on internal navigation before the server
 * answers (so a slow backend in production never leaves a dead tab), and
 * keeps the translucent wash for that navigation state. External scripts are
 * allowed by the site CSP (`script-src 'self'`), which is why the logic does
 * not live in an inline script.
 */
(function () {
	'use strict';

	/* Minimum time the splash stays visible since it was last shown, so fast
	   page paints still get the brand moment instead of a jarring flash. */
	var MIN_VISIBLE_MS = 350;
	var HIDDEN_CLASS = 'page-loader--hidden';
	var SOLID_CLASS = 'page-loader--solid';

	var loader = document.getElementById('page-loader');
	if (!loader) return;

	var shownAt = performance.now();

	function hide() {
		var wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt));
		window.setTimeout(function () {
			loader.classList.add(HIDDEN_CLASS);
		}, wait);
	}

	function show(solid) {
		shownAt = performance.now();
		loader.classList.remove(HIDDEN_CLASS);
		loader.classList.toggle(SOLID_CLASS, Boolean(solid));
	}

	hide();

	/* Internal navigation: show the translucent wash as soon as the visitor
	   clicks, before the server responds. Modifier keys, blank targets,
	   downloads, in-page anchors and cross-origin links navigate without this
	   splash. */
	document.addEventListener('click', function (event) {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}

		var anchor = event.target.closest('a');
		if (!anchor || anchor.hasAttribute('download')) return;

		var target = anchor.getAttribute('target');
		if (target && target !== '_self') return;

		var href = anchor.getAttribute('href');
		if (!href || href.charAt(0) === '#') return;

		var url;
		try {
			url = new URL(anchor.href, window.location.href);
		} catch {
			return;
		}

		if (url.origin !== window.location.origin) return;
		if (url.pathname === window.location.pathname && url.search === window.location.search) return;

		show(false);
	});

	/* Back/forward restores the page from the cache in whatever state it had;
	   the splash was already hidden when the visitor left. */
	window.addEventListener('pageshow', function (event) {
		if (event.persisted) hide();
	});
})();
