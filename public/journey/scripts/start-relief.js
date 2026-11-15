/*
 * Grey plaster start page for the journey: title, ready state and click-to-start.
 * The relief itself (immersive-g model + shaders) is rendered by start-relief-gl.js.
 * The page is fixed (no scroll) and fades away on the click that starts the story underneath.
 */
(function () {
    'use strict';

    var root = document.getElementById('sr-start');
    if (!root) return;
    var canvas = root.querySelector('.sr-canvas');
    var enter = root.querySelector('.sr-enter');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- start / dismiss ---------- */

    var ready = false;
    var running = true;
    var stopRenderer = null;

    function storyReady() {
        var click = document.querySelector('#preloader-container .click');
        return !!click && getComputedStyle(click).display !== 'none';
    }
    var readyPoll = setInterval(function () {
        if (!storyReady()) return;
        clearInterval(readyPoll);
        ready = true;
        root.classList.remove('is-loading');
        enter.firstElementChild.textContent = 'Start reading';
        enter.disabled = false;
        root.classList.add('is-ready');
    }, 150);

    // The story receives the same click as it bubbles from the intro to the document.
    enter.addEventListener('click', function onClick() {
        if (!ready) return;
        enter.removeEventListener('click', onClick);
        root.classList.add('is-leaving');
        root.inert = true;
        setTimeout(function () {
            running = false;
            if (stopRenderer) stopRenderer();
            root.remove();
        }, 1200);
    });

    /* ---------- relief renderer ---------- */

    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    import(new URL('start-relief-gl.js', document.currentScript.src).href).then(function (mod) {
        if (running) stopRenderer = mod.start(root, canvas, { reduceMotion: reduceMotion, isMobile: isMobile });
    }).catch(function (err) {
        console.warn('[start-relief] renderer failed', err); // the plain grey page still works
    });
})();
