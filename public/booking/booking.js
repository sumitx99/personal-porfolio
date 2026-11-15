// Booking modal shared by the portfolio and the journey story.
// Any link with a data-booking attribute opens its cal.com href inside a dark modal instead of a new tab.
// Optional attributes: data-booking-title, data-booking-text. Middle/cmd-click still opens the real link.
(function () {
  if (window.__bookingModal) return
  window.__bookingModal = true

  var EMAIL = 'sumitranjan2207@gmail.com'
  var LIME = '#d4ff3a'
  var dialog, mount, openLink, titleEl, textEl, loadedLink, loadedHref
  var layout = 'month_view'
  var renders = 0
  // cal.com hides its own monthly / weekly / column switch inside embeds, so the modal carries its own.
  var LAYOUTS = [
    { id: 'month_view', label: 'Monthly view', path: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' },
    { id: 'week_view', label: 'Weekly view', path: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9 4v16M15 4v16"/>' },
    { id: 'column_view', label: 'Column view', path: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M9.2 4v16M14.8 4v16"/>' },
  ]

  // cal.com's official embed loader (https://cal.com/docs/developing/embeds). A plain iframe of the booking
  // page stays blank, because cal.com only renders inside a frame when its embed script is the parent.
  function loadCal() {
    if (window.Cal) return
    ;(function (C, A, L) {
      var p = function (a, ar) { a.q.push(ar) }
      var d = C.document
      C.Cal = C.Cal || function () {
        var cal = C.Cal
        var ar = arguments
        if (!cal.loaded) {
          cal.ns = {}
          cal.q = cal.q || []
          d.head.appendChild(d.createElement('script')).src = A
          cal.loaded = true
        }
        if (ar[0] === L) {
          var api = function () { p(api, arguments) }
          var namespace = ar[1]
          api.q = api.q || []
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api
            p(cal.ns[namespace], ar)
            p(cal, ['initNamespace', namespace])
          } else p(cal, ar)
          return
        }
        p(cal, ar)
      }
    })(window, 'https://app.cal.com/embed/embed.js', 'init')
  }

  // "https://cal.com/skranjan/30min?overlayCalendar=true" -> { link: "skranjan/30min", config: {...} }
  function parse(href) {
    var url = new URL(href, location.href)
    var config = { layout: 'month_view', theme: 'dark' }
    url.searchParams.forEach(function (value, key) { config[key] = value })
    return { origin: url.origin, link: url.pathname.replace(/^\/+|\/+$/g, ''), config: config }
  }

  function icon(path, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 16) + '" height="' + (size || 16) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>'
  }

  function build() {
    if (dialog) return
    dialog = document.createElement('dialog')
    dialog.className = 'bk'
    dialog.setAttribute('aria-labelledby', 'bk-title')
    dialog.setAttribute('data-lenis-prevent', '')
    dialog.innerHTML =
      '<header class="bk-head">' +
        '<span class="bk-icon">' + icon('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', 19) + '</span>' +
        '<div class="bk-titles"><h2 id="bk-title"></h2><p></p></div>' +
        '<div class="bk-actions">' +
          '<div class="bk-views" role="group" aria-label="Calendar layout">' +
            LAYOUTS.map(function (l) {
              return '<button type="button" data-layout="' + l.id + '" aria-label="' + l.label + '" title="' + l.label + '" aria-pressed="false">' + icon(l.path, 16) + '</button>'
            }).join('') +
          '</div>' +
          '<a class="bk-open" target="_blank" rel="noreferrer" aria-label="Open booking in new tab" title="Open booking in new tab"><span>Open in new tab</span>' + icon('<path d="M7 17 17 7M8 7h9v9"/>', 16) + '</a>' +
          '<button class="bk-close" type="button" aria-label="Close" autofocus>' + icon('<path d="M6 6l12 12M18 6 6 18"/>', 18) + '</button>' +
        '</div>' +
      '</header>' +
      '<div class="bk-body">' +
        '<div class="bk-loading" role="status"><span>Loading calendar…</span></div>' +
        '<div class="bk-cal"></div>' +
      '</div>' +
      '<footer class="bk-foot">' +
        '<a href="mailto:' + EMAIL + '">' + icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>', 15) + 'Prefer email?</a>' +
      '</footer>'
    document.body.appendChild(dialog)
    mount = dialog.querySelector('.bk-cal')
    openLink = dialog.querySelector('.bk-open')
    titleEl = dialog.querySelector('h2')
    textEl = dialog.querySelector('.bk-titles p')
    dialog.querySelector('.bk-close').addEventListener('click', close)
    dialog.querySelector('.bk-views').addEventListener('click', function (event) {
      var button = event.target.closest('button[data-layout]')
      if (!button || button.getAttribute('data-layout') === layout) return
      layout = button.getAttribute('data-layout')
      loadedLink = null
      load(loadedHref)
    })
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); close() })
    dialog.addEventListener('click', function (event) { if (event.target === dialog) close() })
  }

  function load(href) {
    build()
    if (href === loadedLink) return
    loadedLink = href
    loadedHref = href
    var cal = parse(href)
    cal.config.layout = layout
    dialog.querySelectorAll('.bk-views button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-layout') === layout))
    })
    dialog.classList.remove('is-ready')
    mount.innerHTML = ''
    loadCal()
    // A fresh namespace per render, so switching layouts mounts a clean calendar.
    var ns = 'bk' + ++renders
    window.Cal('init', ns, { origin: cal.origin })
    var api = window.Cal.ns[ns]
    api('inline', { elementOrSelector: mount, calLink: cal.link, config: cal.config })
    api('ui', {
      theme: 'dark',
      hideEventTypeDetails: false,
      layout: layout,
      cssVarsPerTheme: { dark: { 'cal-brand': LIME, 'cal-brand-emphasis': '#e6ff8a', 'cal-brand-text': '#0a0a0b', 'cal-bg': '#101012', 'cal-bg-muted': '#141417' } },
    })
    api('on', { action: 'linkReady', callback: function () { if (ns === 'bk' + renders) dialog.classList.add('is-ready') } })
    // Never leave the skeleton up forever if the ready event is missed.
    setTimeout(function () { if (ns === 'bk' + renders) dialog.classList.add('is-ready') }, 6000)
  }

  function open(link) {
    var href = link.getAttribute('href')
    load(href)
    titleEl.textContent = link.getAttribute('data-booking-title') || 'Let’s talk'
    textEl.textContent = link.getAttribute('data-booking-text') || '30 min · Cal Video'
    openLink.href = href
    dialog.classList.remove('is-closing')
    document.documentElement.classList.add('bk-locked')
    dialog.showModal()
    window.dispatchEvent(new CustomEvent('booking:open'))
  }

  function close() {
    if (!dialog || !dialog.open || dialog.classList.contains('is-closing')) return
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    dialog.classList.add('is-closing')
    setTimeout(function () {
      dialog.close()
      dialog.classList.remove('is-closing')
      document.documentElement.classList.remove('bk-locked')
      window.dispatchEvent(new CustomEvent('booking:close'))
    }, reduce ? 0 : 200)
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-booking]')
    if (!link || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    open(link)
  })

  // Start loading the calendar as soon as someone points at a booking button, so it is ready on click.
  function warm(event) {
    var link = event.target.closest && event.target.closest('a[data-booking]')
    if (link) load(link.getAttribute('href'))
  }
  document.addEventListener('pointerover', warm)
  document.addEventListener('focusin', warm)

  window.openBooking = function (href, title, text) {
    var a = document.createElement('a')
    a.setAttribute('href', href)
    if (title) a.setAttribute('data-booking-title', title)
    if (text) a.setAttribute('data-booking-text', text)
    open(a)
  }
})()
