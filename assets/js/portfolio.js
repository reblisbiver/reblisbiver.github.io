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
			'<a class="pf-card' + (featured ? ' is-featured' : '') + '" data-pf-order="' + esc(p._pfOrder) + '" href="project.html?id=' + encodeURIComponent(p.id) + '">' +
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
		}).map(function (project, index) {
			project._pfOrder = index;
			return project;
		});

		var lastCols = 0;
		var balanceTimer;

		// Keep featured projects at the front, then place cards from tallest to
		// shortest into the current shortest column to avoid a large bottom gap.
		var balancing = false;
		function balanceColumns() {
			if (balancing) return;
			balancing = true;
			try {
				_doBalance();
			} finally {
				balancing = false;
			}
		}
		function _doBalance() {
			var columns = Array.prototype.slice.call(grid.querySelectorAll('.pf-col'));
			if (!columns.length) return;

			// Deduplicate: keep only one copy of each card (by data-pf-order).
			var seen = {};
			var allCards = Array.prototype.slice.call(grid.querySelectorAll('.pf-card'));
			allCards.forEach(function (card) {
				var order = card.getAttribute('data-pf-order');
				if (seen[order]) {
					card.parentNode.removeChild(card);
				} else {
					seen[order] = card;
				}
			});

			var cards = Object.keys(seen).map(function (key) {
				var card = seen[key];
				return {
					card: card,
					featured: card.classList.contains('is-featured'),
					order: Number(card.getAttribute('data-pf-order')),
					height: card.offsetHeight
				};
			}).sort(function (a, b) {
				return a.order - b.order;
			});
			var featured = cards.filter(function (item) { return item.featured; });
			var standard = cards.filter(function (item) { return !item.featured; });
			cards.forEach(function (item) { item.card.parentNode.removeChild(item.card); });

			featured.slice(0, columns.length).forEach(function (item, index) {
				columns[index].appendChild(item.card);
			});

			function distribute(items) {
				items.sort(function (a, b) {
					return b.height - a.height || a.order - b.order;
				}).forEach(function (item) {
					// Find the shortest column that doesn't already have
					// 2+ more cards than the fewest, to keep counts balanced.
					var counts = columns.map(function (c) { return c.querySelectorAll('.pf-card').length; });
					var minCount = Math.min.apply(null, counts);
					var shortest = null;
					columns.forEach(function (column, i) {
						var isEligible = counts[i] < minCount + 2;
						if (!isEligible) return;
						if (!shortest || column.offsetHeight < shortest.offsetHeight) {
							shortest = column;
						}
					});
					// Fallback: if all columns are too full, use the shortest.
					if (!shortest) {
						shortest = columns[0];
						columns.forEach(function (column) {
							if (column.offsetHeight < shortest.offsetHeight) shortest = column;
						});
					}
					shortest.appendChild(item.card);
				});
			}

			distribute(featured.slice(columns.length));
			distribute(standard);
		}

		function scheduleBalance() {
			clearTimeout(balanceTimer);
			balanceTimer = setTimeout(balanceColumns, 100);
		}

		function columnsForWidth() {
			var w = window.innerWidth;
			if (w <= 480) return 1;
			if (w <= 980) return 2;
			return 3;
		}

		function layout() {
			var cols = columnsForWidth();
			if (cols !== lastCols) {
				lastCols = cols;
				var colHTML = '';
				for (var c = 0; c < cols; c++) colHTML += '<div class="pf-col"></div>';
				grid.innerHTML = colHTML;
				var colEls = grid.querySelectorAll('.pf-col');
				sorted.forEach(function (p, i) {
					colEls[i % cols].insertAdjacentHTML('beforeend', cardHTML(p));
				});
			}
			scheduleBalance();
		}

		layout();

		window.addEventListener('load', function () {
			setTimeout(scheduleBalance, 250);
		});
		grid.addEventListener('load', function (e) {
			if (e.target.tagName === 'IMG') scheduleBalance();
		}, true);

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
