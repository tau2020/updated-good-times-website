/* Good Times in Cape Town — the review wall (markup: src/partials/review-wall.mjs; styles: review-wall.css)

   Two small jobs, both progressive: without this script every card already shows its date and the link under the
   cards leads to the rest of the reviews.
   - Dates: each <time data-review-date> becomes "3 weeks ago", "last month", "2 years ago", against the visitor's own
     clock (a static page cannot know today's date); the date itself stays in the element and in its tooltip.
   - Load more: the next cards join the list, a step at a time. They wait in the wall's <template>, or, where the wall
     names a page (data-more-from: the home page names the reviews page), they are read from that page's own wall on the
     first press, once, with their links resolved against it and the cards already shown left out; if that page cannot
     be read, the press opens it instead. Focus moves to the first new card, so a keyboard or screen reader visitor
     carries on from there; a status line says how many are showing; the button leaves once every card is in. */
(function () {
  'use strict';
  var DAY = 864e5;
  var hasIntl = typeof Intl !== 'undefined';
  var relative = hasIntl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' }) : null;
  var full = hasIntl ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
  var slice = Array.prototype.slice;

  /** "today", "3 days ago", "last week", "5 months ago", "2 years ago"; '' for a date that cannot be read or is ahead */
  function ago(iso, now) {
    var then = Date.parse(iso + 'T12:00:00Z');
    if (!relative || isNaN(then)) return '';
    var days = Math.floor((now - then) / DAY);
    if (days < 0) return '';
    if (days < 7) return relative.format(-days, 'day');
    if (days < 30) return relative.format(-Math.floor(days / 7), 'week');
    if (days < 365) return relative.format(-Math.max(1, Math.floor(days / 30.44)), 'month');
    return relative.format(-Math.floor(days / 365.25), 'year');
  }

  function dates(root, now) {
    var list = root.querySelectorAll('time[data-review-date]');
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var iso = t.getAttribute('datetime');
      var text = ago(iso, now);
      if (!text) continue;
      if (full) t.title = full.format(new Date(iso + 'T12:00:00Z'));
      t.textContent = text;
    }
  }

  /** A card's identity: the address of the review it links to */
  function key(card) {
    var a = card.querySelector('.review-card__more');
    return a ? a.href : '';
  }

  /** Every card of the first wall on another page of the site, its links made absolute against that page */
  function cardsFrom(url) {
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text().then(function (html) {
          return { html: html, url: r.url || new URL(url, location.href).href };
        });
      })
      .then(function (page) {
        var doc = new DOMParser().parseFromString(page.html, 'text/html');
        var wall = doc.querySelector('[data-review-wall]');
        if (!wall) throw new Error('no wall');
        var rest = wall.querySelector('template[data-review-rest]');
        var cards = slice.call(wall.querySelectorAll('[data-review-list] > .review-card')).concat(rest ? slice.call(rest.content.children) : []);
        cards.forEach(function (card) {
          slice.call(card.querySelectorAll('[href]')).forEach(function (el) {
            el.setAttribute('href', new URL(el.getAttribute('href'), page.url).href);
          });
          slice.call(card.querySelectorAll('[src]')).forEach(function (el) {
            el.setAttribute('src', new URL(el.getAttribute('src'), page.url).href);
          });
        });
        return cards;
      });
  }

  function wall(el) {
    var now = Date.now();
    dates(el, now);
    var list = el.querySelector('[data-review-list]');
    var rest = el.querySelector('template[data-review-rest]');
    var more = el.querySelector('[data-review-more]');
    var status = el.querySelector('[data-review-status]');
    var step = parseInt(el.getAttribute('data-step'), 10) || 8;
    var from = el.getAttribute('data-more-from');
    var waiting = rest && rest.content ? slice.call(rest.content.children) : [];
    if (!list || !more || (!waiting.length && !from)) return;
    more.hidden = false;

    function show() {
      var added = waiting.splice(0, step).map(function (card) {
        var node = document.importNode(card, true);
        node.classList.add('is-new');
        node.setAttribute('tabindex', '-1');
        list.appendChild(node);
        dates(node, now);
        return node;
      });
      if (status) status.textContent = 'Showing ' + list.children.length + ' reviews.';
      if (added[0]) added[0].focus();
      if (!waiting.length && !from) more.hidden = true;
    }

    more.addEventListener('click', function () {
      if (waiting.length || !from) return show();
      // The rest comes from the named page, once
      var url = from;
      from = '';
      more.disabled = true;
      list.setAttribute('aria-busy', 'true');
      cardsFrom(url)
        .then(function (cards) {
          var seen = {};
          slice.call(list.children).forEach(function (card) {
            seen[key(card)] = true;
          });
          waiting = cards.filter(function (card) {
            return !seen[key(card)];
          });
          more.disabled = false;
          list.removeAttribute('aria-busy');
          if (waiting.length) show();
          else more.hidden = true;
        })
        .catch(function () {
          location.assign(url);
        });
    });
  }

  function start() {
    var walls = document.querySelectorAll('[data-review-wall]');
    for (var i = 0; i < walls.length; i++) wall(walls[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
