/*
	Strata by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var $window = $(window),
		$body = $('body'),
		$header = $('#header'),
		$footer = $('#footer'),
		$main = $('#main'),
		settings = {

			// Parallax background effect?
				parallax: true,

			// Parallax factor (lower = more intense, higher = less intense).
				parallaxFactor: 20

		};

	// Breakpoints.
		breakpoints({
			xlarge:  [ '1281px',  '1800px' ],
			large:   [ '981px',   '1280px' ],
			medium:  [ '737px',   '980px'  ],
			small:   [ '481px',   '736px'  ],
			xsmall:  [ null,      '480px'  ],
		});

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Touch?
		if (browser.mobile) {

			// Turn on touch mode.
				$body.addClass('is-touch');

			// Height fix (mostly for iOS).
				window.setTimeout(function() {
					$window.scrollTop($window.scrollTop() + 1);
				}, 0);

		}

	// Footer.
		breakpoints.on('<=medium', function() {
			$footer.insertAfter($main);
		});

		breakpoints.on('>medium', function() {
			$footer.appendTo($header);
		});

	// Header.

		// Parallax background.

			// Disable parallax on IE (smooth scrolling is jerky), and on mobile platforms (= better performance).
				if (browser.name == 'ie'
				||	browser.mobile)
					settings.parallax = false;

			if (settings.parallax) {

				breakpoints.on('<=medium', function() {

					$window.off('scroll.strata_parallax');
					$header.css('background-position', '');

				});

				breakpoints.on('>medium', function() {

					$header.css('background-position', 'left 0px');

					$window.on('scroll.strata_parallax', function() {
						$header.css('background-position', 'left ' + (-1 * (parseInt($window.scrollTop()) / settings.parallaxFactor)) + 'px');
					});

				});

				$window.on('load', function() {
					$window.triggerHandler('scroll');
				});

			}

	// Main Sections: Two.

		// Analytics helper (Umami) — no-op if umami not loaded
			function trackEvent(name, data) {
				try {
					if (window.umami && typeof window.umami.track === 'function') {
						if (data) window.umami.track(name, data);
						else      window.umami.track(name);
					}
				} catch (e) { /* never break the site over analytics */ }
			}

		// Custom video interactions (MUST run before poptrox binds its handlers)
			(function() {
				var $videoModal    = $('#video-modal');
				var videoPlayerEl  = document.getElementById('video-player');
				var $externalModal = $('#external-modal');
				var $externalTitle = $('#external-title');
				var $externalLink  = $('#external-link');

				function openModal($m) {
					$m.addClass('is-open').attr('aria-hidden', 'false');
					$body.css('overflow', 'hidden');
				}
				function closeModal($m) {
					$m.removeClass('is-open').attr('aria-hidden', 'true');
					$body.css('overflow', '');
				}
				function closeVideoModal() {
					closeModal($videoModal);
					try { videoPlayerEl.pause(); videoPlayerEl.currentTime = 0; } catch (e) {}
					videoPlayerEl.removeAttribute('src');
					videoPlayerEl.load();
				}

				// Bind BEFORE poptrox — using delegated jQuery handler on #portfolio,
				// capture phase via "mousedown" is not reliable in jQuery so we use event
				// namespacing + making sure our handler runs first.
				$('#portfolio').on('click.customvideo', 'a.video-play', function(e) {
					e.preventDefault();
					e.stopImmediatePropagation();
					var src = $(this).attr('data-video') || $(this).attr('href');
					var title = $(this).siblings('h3').first().text();
					trackEvent('aigc-play', { work: title || 'AIGC' });
					videoPlayerEl.setAttribute('src', src);
					openModal($videoModal);
					var p = videoPlayerEl.play();
					if (p && p.catch) p.catch(function() {});
					return false;
				});

				$('#portfolio').on('click.customvideo', 'a.video-external', function(e) {
					e.preventDefault();
					e.stopImmediatePropagation();
					var href = $(this).attr('href') || '';
					var title = $(this).attr('data-title') || 'Open video';
					// Distinguish winter vs summer by URL
					var eventName = 'bilibili-jump';
					if      (href.indexOf('BV1uu4m1u7mR') !== -1) eventName = 'bilibili-winter';
					else if (href.indexOf('BV1bryYYFE2r') !== -1) eventName = 'bilibili-summer';
					trackEvent(eventName + '-click', { title: title });
					$externalTitle.text(title);
					$externalLink.attr('href', href);
					// Store event name on the link element so we can track the actual jump below
					$externalLink.attr('data-bili-event', eventName);
					openModal($externalModal);
					return false;
				});

				// Track Portfolio image views (poptrox-handled, non-video cards)
				$('#portfolio').on('click', '.work-item a.image:not(.video-play):not(.video-external)', function() {
					var title = $(this).siblings('h3').first().text();
					trackEvent('portfolio-view', { work: title || 'untitled' });
				});

				// Modal close buttons (backdrop / × / cancel)
				$(document).on('click', '[data-close]', function() {
					var which = $(this).attr('data-close');
					if (which === 'video')    closeVideoModal();
					if (which === 'external') closeModal($externalModal);
				});
				// "Open on Bilibili" → track the actual jump + dismiss modal shortly after
				$externalLink.on('click', function() {
					var ev = $(this).attr('data-bili-event') || 'bilibili-jump';
					trackEvent(ev + '-confirm');
					setTimeout(function() { closeModal($externalModal); }, 50);
				});
				// ESC key
				$(document).on('keydown', function(e) {
					if (e.key !== 'Escape') return;
					if ($videoModal.hasClass('is-open'))    closeVideoModal();
					if ($externalModal.hasClass('is-open')) closeModal($externalModal);
				});
			})();

		// Lightbox gallery.
			$window.on('load', function() {

				$('#portfolio').poptrox({
					caption: function($a) { return $a.next('h3').text(); },
					overlayColor: '#1a1715',
					overlayOpacity: 0.92,
					fadeSpeed: 180,
					popupSpeed: 180,
					popupCloserText: '',
					popupLoaderText: '',
					// Exclude video thumbs — they are handled above by our custom modal
					selector: '.work-item a.image:not(.video-play):not(.video-external)',
					usePopupCaption: true,
					usePopupDefaultStyling: false,
					usePopupEasyClose: false,
					usePopupNav: true,
					windowMargin: (breakpoints.active('<=small') ? 0 : 50)
				});

			});

})(jQuery);