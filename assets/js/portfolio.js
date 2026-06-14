/*
	Portfolio grid renderer (home page)
	- Loads assets/data/projects.json
	- Featured projects are sorted to the front with a gold border + ★ badge
	- Each card links to project.html?id=<id>
*/
(function () {
	'use strict';

	var GRID_ID = 'portfolio-grid';

	function track(name, data) {
		try {
			if (window.umami && typeof window.umami.track === 'function') {
				data ? window.umami.track(name, data) : window.umami.track(name);
			}
		} catch (e) { /* analytics must never break the page */ }
	}

	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	function cardHTML(p) {
		var featured = !!p.featured;
		var badge = featured ? '<span class="pf-badge">\u2605 Featured</span>' : '';
		var cat = [p.category, p.date].filter(Boolean).join(' \u00b7 ');
		return '' +
			'<a class="pf-card' + (featured ? ' is-featured' : '') + '" href="project.html?id=' + encodeURIComponent(p.id) + '">' +
				'<span class="pf-thumb">' +
					'<img src="' + esc(p.cover) + '" alt="' + esc(p.title) + '" loading="lazy" />' +
					badge +
					'<span class="pf-view">View details &rarr;</span>' +
				'</span>' +
				'<span class="pf-info">' +
					'<span class="pf-title">' + esc(p.title) + '</span>' +
					'<span class="pf-cat">' + esc(cat) + '</span>' +
				'</span>' +
			'</a>';
	}

	function render(projects) {
		var grid = document.getElementById(GRID_ID);
		if (!grid) return;

		// Featured first, otherwise keep JSON order (stable sort in modern browsers)
		var sorted = projects.slice().sort(function (a, b) {
			return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
		});

		var lastCols = 0;

		// Row-major distribution into N columns: keeps the masonry look (ragged bottoms)
		// while guaranteeing the featured pieces land on the top row(s).
		function columnsForWidth() {
			var w = window.innerWidth;
			if (w <= 480) return 1;
			if (w <= 980) return 2;
			return 3;
		}

		function layout() {
			var cols = columnsForWidth();
			if (cols === lastCols) return;
			lastCols = cols;
			var colHTML = '';
			for (var c = 0; c < cols; c++) colHTML += '<div class="pf-col"></div>';
			grid.innerHTML = colHTML;
			var colEls = grid.querySelectorAll('.pf-col');
			sorted.forEach(function (p, i) {
				colEls[i % cols].insertAdjacentHTML('beforeend', cardHTML(p));
			});
		}

		layout();

		var resizeTimer;
		window.addEventListener('resize', function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(layout, 150);
		});

		grid.addEventListener('click', function (e) {
			var card = e.target.closest && e.target.closest('.pf-card');
			if (card) track('portfolio-card', { id: card.getAttribute('href') });
		});
	}

	function init() {
		var grid = document.getElementById(GRID_ID);
		if (!grid) return;
		fetch('assets/data/projects.json', { cache: 'no-cache' })
			.then(function (r) { return r.json(); })
			.then(function (d) { render((d && d.projects) || []); })
			.catch(function () {
				grid.innerHTML = '<p style="text-align:center;color:#6B645E;">Unable to load projects.</p>';
			});
	}

	if (document.readyState !== 'loading') init();
	else document.addEventListener('DOMContentLoaded', init);
})();
