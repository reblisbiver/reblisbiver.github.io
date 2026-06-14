/*
	Project detail renderer
	- Reads ?id= from the URL, loads assets/data/projects.json
	- Renders "featured" (4-block) or "simple" layout
	- Deliverables block adapts to whatever is provided (video / links / gallery / stats)
	- Prev / Next navigation, image zoom, print-to-PDF
*/
(function () {
	'use strict';

	function track(name, data) {
		try {
			if (window.umami && typeof window.umami.track === 'function') {
				data ? window.umami.track(name, data) : window.umami.track(name);
			}
		} catch (e) {}
	}

	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	function getId() {
		return new URLSearchParams(window.location.search).get('id');
	}

	// Split text on blank lines / newlines into paragraphs
	function paragraphs(text) {
		return String(text || '').split(/\n{1,}/).map(function (t) { return t.trim(); })
			.filter(Boolean).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
	}

	function section(title, text) {
		if (!text) return '';
		return '<section class="project-section"><h2>' + esc(title) + '</h2>' + paragraphs(text) + '</section>';
	}

	function deliverablesHTML(d, hero, skipVideo) {
		if (!d) return '';
		var parts = '';

		// Inline video (skipped when the hero itself plays it)
		if (d.video && !skipVideo) {
			parts += '<div class="pd-video"><video controls playsinline preload="metadata" src="' + esc(d.video) + '"></video></div>';
		}

		// External links (e.g. Bilibili)
		if (d.links && d.links.length) {
			parts += '<div class="pd-links">' + d.links.map(function (l) {
				return '<a class="pd-link-btn" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer" data-track-link="' + esc(l.url) + '">' + esc(l.label || 'Open link') + ' &rarr;</a>';
			}).join('') + '</div>';
		}

		// Image gallery (exclude the hero to avoid duplication)
		if (d.gallery && d.gallery.length) {
			var imgs = d.gallery.filter(function (src) { return src && src !== hero; });
			if (imgs.length) {
				parts += '<div class="pd-gallery">' + imgs.map(function (src) {
					return '<a class="pd-shot" data-zoom="' + esc(src) + '"><img src="' + esc(src) + '" alt="" loading="lazy" /></a>';
				}).join('') + '</div>';
			}
		}

		// Stats / social screenshot
		if (d.stats) {
			parts += '<div class="pd-stats"><a class="pd-shot" data-zoom="' + esc(d.stats) + '"><img src="' + esc(d.stats) + '" alt="Engagement statistics" loading="lazy" /></a></div>';
		}

		if (!parts) return '';
		return '<section class="project-section"><h2>Deliverables</h2>' + parts + '</section>';
	}

	function renderProject(p) {
		var isPortrait = p.orientation === 'portrait';

		// Video detection — inline (mp4) plays in place, external (Bilibili) confirms then opens
		var d = p.deliverables || {};
		var videoMode = '';
		if (d.video) videoMode = 'inline';
		else if (d.links && d.links.length && /bilibili\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(d.links[0].url || '')) videoMode = 'external';

		var html = '';
		html += '<div class="project-layout ' + (isPortrait ? 'layout-portrait' : 'layout-landscape') + '">';

		// Visual column — thumbnail for speed; full image loads only on zoom
		html += '<div class="project-visual">';
		if (p.hero) {
			var imgTag = '<img src="' + esc(p.cover || p.hero) + '" alt="' + esc(p.title) + '" />';
			if (videoMode === 'inline') {
				html += '<div class="project-hero-img is-video" data-play-inline="' + esc(d.video) + '">' + imgTag + '<span class="hero-play" aria-hidden="true">\u25B6</span></div>';
			} else if (videoMode === 'external') {
				html += '<a class="project-hero-img is-video" data-play-external="' + esc(d.links[0].url) + '">' + imgTag + '<span class="hero-play" aria-hidden="true">\u25B6</span></a>';
			} else {
				html += '<a class="project-hero-img" data-zoom="' + esc(p.hero) + '">' + imgTag + '</a>';
			}
		}
		html += '</div>';

		// Content column
		html += '<div class="project-content">';
		html += '<div class="project-head">';
		if (p.category) html += '<span class="project-cat">' + esc(p.category) + '</span>';
		html += '<h1>' + esc(p.title) + '</h1>';
		var meta = [];
		if (p.date) meta.push('<span class="pm"><span class="pm-k">Date</span>' + esc(p.date) + '</span>');
		if (p.tools && p.tools.length) meta.push('<span class="pm"><span class="pm-k">Tools</span>' + esc(p.tools.join(', ')) + '</span>');
		if (p.role) meta.push('<span class="pm"><span class="pm-k">Role</span>' + esc(p.role) + '</span>');
		if (meta.length) html += '<div class="project-meta">' + meta.join('') + '</div>';
		html += '</div>';

		html += '<div class="project-body">';
		html += section('Background & Goals', p.background);
		html += section('My Role & Contribution', p.contribution);
		if (p.description) html += '<section class="project-section">' + paragraphs(p.description) + '</section>';
		html += deliverablesHTML(p.deliverables, p.hero, videoMode === 'inline');
		html += section('Outcomes & Impact', p.outcomes);
		html += '</div>';
		html += '</div>';

		html += '</div>';

		var root = document.getElementById('project-root');
		root.innerHTML = html;
		document.title = p.title + ' — Darwin';

		// Portrait layout: match the text column's scroll height to the image height
		var heroImg = root.querySelector('.project-visual img');
		if (heroImg) {
			if (heroImg.complete) syncPortraitHeights();
			heroImg.addEventListener('load', syncPortraitHeights);
		}
	}

	// Cap the (portrait) content column to the image's rendered height so their bottoms align
	function syncPortraitHeights() {
		var layout = document.querySelector('.project-layout.layout-portrait');
		if (!layout) return;
		var visual = layout.querySelector('.project-visual');
		var content = layout.querySelector('.project-content');
		if (!visual || !content) return;
		if (window.innerWidth <= 736) { content.style.maxHeight = ''; return; }
		content.style.maxHeight = visual.offsetHeight + 'px';
	}

	// Video hero: inline play (mp4) or external confirm-and-open (Bilibili)
	function setupVideoHero() {
		document.addEventListener('click', function (e) {
			var inl = e.target.closest && e.target.closest('[data-play-inline]');
			if (inl) {
				e.preventDefault();
				var src = inl.getAttribute('data-play-inline');
				track('aigc-play', { id: getId() });
				inl.outerHTML = '<div class="project-hero-img"><video controls autoplay playsinline src="' + src + '"></video></div>';
				return;
			}
			var ext = e.target.closest && e.target.closest('[data-play-external]');
			if (ext) {
				e.preventDefault();
				var url = ext.getAttribute('data-play-external');
				track('video-external', { id: getId(), url: url });
				var platform = /youtube\.com|youtu\.be/i.test(url) ? 'YouTube'
					: /bilibili\.com/i.test(url) ? 'Bilibili'
					: /tiktok\.com/i.test(url) ? 'TikTok'
					: 'its hosting platform';
				if (window.confirm('This video will open on ' + platform + ' in a new tab. Continue?')) {
					window.open(url, '_blank', 'noopener');
				}
			}
		});
	}

	function renderNav(list, idx) {
		var nav = document.getElementById('project-nav');
		if (!nav) return;
		var prev = list[idx - 1];
		var next = list[idx + 1];
		var html = '';
		html += prev
			? '<a class="pn-prev" href="project.html?id=' + encodeURIComponent(prev.id) + '">&larr; ' + esc(prev.title) + '</a>'
			: '<span class="pn-prev pn-disabled"></span>';
		html += '<a class="pn-home" href="index.html#portfolio">All works</a>';
		html += next
			? '<a class="pn-next" href="project.html?id=' + encodeURIComponent(next.id) + '">' + esc(next.title) + ' &rarr;</a>'
			: '<span class="pn-next pn-disabled"></span>';
		nav.innerHTML = html;
	}

	function renderNotFound() {
		document.getElementById('project-root').innerHTML =
			'<div class="project-section" style="text-align:center;padding:4em 0;">' +
			'<h2>Project not found</h2><p>This project may have been moved or removed.</p>' +
			'<p><a class="pd-link-btn" href="index.html#portfolio">&larr; Back to Portfolio</a></p></div>';
	}

	// Image zoom overlay
	function setupZoom() {
		var overlay = document.getElementById('zoom-overlay');
		var zoomImg = document.getElementById('zoom-img');
		if (!overlay) return;
		document.addEventListener('click', function (e) {
			var trigger = e.target.closest && e.target.closest('[data-zoom]');
			if (trigger) {
				e.preventDefault();
				zoomImg.src = trigger.getAttribute('data-zoom');
				overlay.classList.add('is-open');
				overlay.setAttribute('aria-hidden', 'false');
				document.body.style.overflow = 'hidden';
				return;
			}
			if (e.target === overlay || e.target === zoomImg) {
				overlay.classList.remove('is-open');
				overlay.setAttribute('aria-hidden', 'true');
				zoomImg.src = '';
				document.body.style.overflow = '';
			}
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
				overlay.classList.remove('is-open');
				overlay.setAttribute('aria-hidden', 'true');
				zoomImg.src = '';
				document.body.style.overflow = '';
			}
		});
	}

	function setupPrint() {
		var btn = document.getElementById('print-btn');
		if (btn) btn.addEventListener('click', function () {
			track('project-print', { id: getId() });
			var ok = window.confirm('To save this page as a PDF, a print dialog will open next — just choose "Save as PDF" as the destination, then Save. Continue?');
			if (ok) window.print();
		});
	}

	function setupLinkTracking() {
		document.addEventListener('click', function (e) {
			var a = e.target.closest && e.target.closest('[data-track-link]');
			if (a) track('deliverable-link', { id: getId(), url: a.getAttribute('data-track-link') });
		});
	}

	function init() {
		setupZoom();
		setupVideoHero();
		setupPrint();
		setupLinkTracking();

		var rt;
		window.addEventListener('resize', function () {
			clearTimeout(rt);
			rt = setTimeout(syncPortraitHeights, 150);
		});

		var id = getId();
		fetch('assets/data/projects.json', { cache: 'no-cache' })
			.then(function (r) { return r.json(); })
			.then(function (d) {
				var list = (d && d.projects) || [];
				// Featured first (stable) so prev/next order matches the home grid
				list = list.slice().sort(function (a, b) {
					return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
				});
				var idx = -1;
				for (var i = 0; i < list.length; i++) { if (list[i].id === id) { idx = i; break; } }
				if (idx < 0) { renderNotFound(); return; }
				renderProject(list[idx]);
				renderNav(list, idx);
				track('project-view', { id: id });
			})
			.catch(function () { renderNotFound(); });
	}

	if (document.readyState !== 'loading') init();
	else document.addEventListener('DOMContentLoaded', init);
})();
