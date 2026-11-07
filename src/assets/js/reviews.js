/* Good Times in Cape Town — the people behind the good times (home page, chapter 09)
   The reviews are a grid of cards (index.mjs, living-cape.css), several in view at once and nothing moving by itself.
   Without JavaScript every card shows. With it, the grid starts collapsed to what fits two rows (three cards on
   phones, four on tablets, six on wide screens) and "Show more reviews" opens the rest: a real button with
   aria-expanded, which then reads "Show fewer reviews". It replaces the auto-advancing carousel of the earlier design
   (qa/surgical-change-report.md), so no review is hidden behind a slide and nothing loops.
   Below: the reviewer photo's fallback (an approved photo covers the initials; if it fails to load, the initials show). */
(function () {
  'use strict';
  var grid = document.querySelector('[data-stories]');
  var more = document.querySelector('[data-stories-more]');
  if (!grid || !more) return;
  var cards = grid.querySelectorAll('[data-story-card]');
  // How many cards the collapsed grid shows at this width (living-cape.css: 3, 4 or 6)
  var shown = function () {
    return window.matchMedia('(min-width: 64em)').matches ? 6 : window.matchMedia('(min-width: 40em)').matches ? 4 : 3;
  };
  var label = function () {
    var hidden = cards.length - shown();
    more.hidden = hidden <= 0;
    more.textContent = grid.classList.contains('is-collapsed') ? 'Show ' + hidden + ' more ' + (hidden === 1 ? 'review' : 'reviews') : 'Show fewer reviews';
    more.setAttribute('aria-expanded', grid.classList.contains('is-collapsed') ? 'false' : 'true');
  };
  grid.classList.add('is-collapsed');
  label();
  more.addEventListener('click', function () {
    var opening = grid.classList.contains('is-collapsed');
    grid.classList.toggle('is-collapsed', !opening);
    label();
    if (opening) {
      // Move on to the first card that was hidden, so a keyboard or screen-reader user lands on the new reviews
      var first = cards[shown()];
      var target = first && first.querySelector('a');
      if (target) target.focus({ preventScroll: false });
    }
  });
  var mq = [window.matchMedia('(min-width: 40em)'), window.matchMedia('(min-width: 64em)')];
  mq.forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', label);
  });
  window.__stories = { cards: cards.length, shown: shown }; // read by the browser tests
})();

/* Reviewer photos: an approved photo sits over the reviewer's initials; if one fails to load, the initials show */
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('.story-card__avatar img'), function (img) {
    var drop = function () {
      img.remove();
    };
    img.addEventListener('error', drop);
    if (img.complete && img.naturalWidth === 0) drop();
  });
})();
