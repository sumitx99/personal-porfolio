// A pixel cat that lives along the bottom of the journey page.
// The sprite is drawn in code on a 36x24 grid and scaled 3x (2x on phones).
// Click it for a menu: Feed, Play, Pet, Sleep, Sit / Roam.
(function () {
    'use strict';

    var GW = 36, GH = 24;
    var MOBILE = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    var SCALE = MOBILE ? 2 : 3;
    var CW = GW * SCALE, CH = GH * SCALE;           // 108 x 72 on desktop
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1 fur, 2 fur shade, 3 stripe, 4 cream, 5 eye, 6 pink, 7 outline, 8 fur light
    var PAL = [null, '#a6a7af', '#85868f', '#6b6c75', '#f2f1ec', '#141417', '#f0a0b0', '#141416', '#c5c6cd'];

    // ---------- tiny raster helpers ----------
    function grid() { return new Uint8Array(GW * GH); }
    function inb(x, y) { return x >= 0 && y >= 0 && x < GW && y < GH; }
    function dot(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (inb(x, y)) g[y * GW + x] = c; }
    function ell(g, cx, cy, rx, ry, c) {
        for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
            for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                var dx = (x - cx) / rx, dy = (y - cy) / ry;
                if (dx * dx + dy * dy <= 1 && inb(x, y)) g[y * GW + x] = c;
            }
        }
    }
    function tri(g, a, b, c, col) {
        var minX = Math.floor(Math.min(a[0], b[0], c[0])), maxX = Math.ceil(Math.max(a[0], b[0], c[0]));
        var minY = Math.floor(Math.min(a[1], b[1], c[1])), maxY = Math.ceil(Math.max(a[1], b[1], c[1]));
        function side(p, q, r) { return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); }
        for (var y = minY; y <= maxY; y++) {
            for (var x = minX; x <= maxX; x++) {
                var p = [x, y], s1 = side(a, b, p), s2 = side(b, c, p), s3 = side(c, a, p);
                if (((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) && inb(x, y)) g[y * GW + x] = col;
            }
        }
    }
    // A soft capsule along a polyline, radius r0 at the start easing to r1 at the end.
    function limb(g, pts, r0, r1, c) {
        for (var i = 0; i < pts.length - 1; i++) {
            var a = pts[i], b = pts[i + 1];
            var steps = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3));
            for (var s = 0; s <= steps; s++) {
                var t = s / steps, k = (i + t) / (pts.length - 1), r = r0 + (r1 - r0) * k;
                ell(g, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, r, c);
            }
        }
    }
    // Light from above: fur gets a light top edge and a shaded underside, then a dark outline all round.
    function finish(g) {
        var src = g.slice(), x, y;
        for (y = 0; y < GH; y++) {
            for (x = 0; x < GW; x++) {
                if (src[y * GW + x] !== 1) continue;
                var up = y > 0 ? src[(y - 1) * GW + x] : 0;
                var down = y < GH - 1 ? src[(y + 1) * GW + x] : 0;
                if (!up) g[y * GW + x] = 8;
                else if (!down) g[y * GW + x] = 2;
            }
        }
        src = g.slice();
        for (y = 0; y < GH; y++) {
            for (x = 0; x < GW; x++) {
                if (src[y * GW + x]) continue;
                if ((x > 0 && src[y * GW + x - 1]) || (x < GW - 1 && src[y * GW + x + 1]) ||
                    (y > 0 && src[(y - 1) * GW + x]) || (y < GH - 1 && src[(y + 1) * GW + x])) g[y * GW + x] = 7;
            }
        }
        return g;
    }
    function stripes(g, x0, x1, y0, y1) {
        for (var x = Math.round(x0); x <= Math.round(x1); x += 2) {
            for (var y = Math.round(y0); y <= Math.round(y1); y++) if (inb(x, y) && g[y * GW + x] === 1) g[y * GW + x] = 3;
        }
    }

    // Eyes: 'open', 'closed', 'happy' or 'up'.
    function eye(g, x, y, look) {
        if (look === 'closed') { dot(g, x - 0.5, y + 0.5, 5); dot(g, x + 0.5, y + 0.5, 5); return; }
        if (look === 'happy') { dot(g, x - 1, y + 1, 5); dot(g, x, y, 5); dot(g, x + 1, y + 1, 5); return; }
        var top = look === 'up' ? y - 1 : y;
        dot(g, x, top, 5); dot(g, x, top + 1, 5);
    }

    // A head turned three-quarters to the right.
    function sideHead(g, hx, hy, look, o) {
        o = o || {};
        tri(g, [hx - 3.6, hy - 1.4], [hx - 0.4, hy - 3.2], [hx - 2.8, hy - 6.6], 1);
        tri(g, [hx + 0.2, hy - 3.3], [hx + 3.8, hy - 1.2], [hx + 2.9, hy - 6.5], 1);
        ell(g, hx, hy, 4.4, 3.8, 1);
        tri(g, [hx - 2.7, hy - 2.6], [hx - 1.2, hy - 3.4], [hx - 2.5, hy - 5.2], 6);
        tri(g, [hx + 1.3, hy - 3.4], [hx + 2.9, hy - 2.4], [hx + 2.6, hy - 5.1], 6);
        ell(g, hx + 2, hy + 1.7, 2, 1.2, 4);
        dot(g, hx + 4, hy + 0.7, 6);
        stripes(g, hx - 2, hx + 1, hy - 3.6, hy - 2.6);
        eye(g, hx + 0.3, hy - 0.8, look);
        eye(g, hx + 2.6, hy - 0.8, look);
        if (o.yawn) { dot(g, hx + 2.6, hy + 2.6, 6); dot(g, hx + 3.4, hy + 2.6, 6); dot(g, hx + 3, hy + 3.2, 5); }
    }

    // ---------- poses (all face right; the element flips for left) ----------
    function poseSide(kind, phase) {
        var g = grid();
        var run = kind === 'run' || kind === 'pounce' || kind === 'toBowl';
        var crouch = kind === 'crouch' || kind === 'land';
        var eat = kind === 'eat';
        var bob = crouch || eat ? 0 : Math.sin(phase * Math.PI * 4) * (run ? 0.6 : 0.3);
        var by = (crouch ? 17.4 : run ? 14.6 : 15) - bob;
        var bx = 16;

        // tail
        var sway = Math.sin(phase * Math.PI * 2 + 1) * (run ? 0.6 : 1.2);
        if (run || crouch) limb(g, [[bx - 7, by - 0.8], [bx - 10, by - 1.8 + sway * 0.6], [bx - 13, by - 2.6 + sway]], 1.3, 1, 1);
        else limb(g, [[bx - 7, by - 1], [bx - 9.6, by - 3.6], [bx - 10.2 + sway, by - 7.4], [bx - 9 + sway * 1.3, by - 8.8]], 1.3, 1.1, 1);

        // legs: far pair first (shaded), near pair after the body
        function leg(lx, off, col) {
            var t = ((phase + off) % 1 + 1) % 1;
            var reach = run ? 3.2 : 2.2, dx, lift;
            if (crouch || eat) { dx = 0; lift = 0; }
            else if (kind === 'pounce') { dx = off < 0.5 ? -3.4 : 3.4; lift = 1.5; }
            else if (t < 0.6) { dx = reach - (t / 0.6) * 2 * reach; lift = 0; }
            else { var u = (t - 0.6) / 0.4; dx = -reach + u * 2 * reach; lift = Math.sin(u * Math.PI) * (run ? 2.4 : 1.6); }
            var foot = [lx + dx, 21.3 - lift];
            limb(g, [[lx, by + 1.6], [(lx + foot[0]) / 2, (by + 1.6 + foot[1]) / 2], foot], 1.5, 1.2, col);
            if (col === 1) dot(g, foot[0] + 0.6, foot[1], 4);
        }
        var gait = run ? { nb: 0, fb: 0.12, nf: 0.5, ff: 0.62 } : { nb: 0, nf: 0.25, fb: 0.5, ff: 0.75 };
        leg(bx + 5.6, gait.ff, 2);
        leg(bx - 4.6, gait.fb, 2);

        ell(g, bx, by, 8, 3.8, 1);
        ell(g, bx - 4.6, by + 0.5, 3.6, 3.6, 1);
        ell(g, bx + 5, by + 0.2, 3.7, 3.8, 1);
        ell(g, bx + 1, by + 2.6, 5, 1.3, 4);
        stripes(g, bx - 5, bx + 3, by - 3.6, by - 2.2);

        leg(bx + 5, gait.nf, 1);
        leg(bx - 5.2, gait.nb, 1);

        var hx = bx + 8.6, hy;
        if (eat) { hy = by + 3 + Math.sin(phase * Math.PI * 2) * 0.5; hx = bx + 9.4; }
        else if (crouch) hy = by - 2.2;
        else hy = by - 4.2 - bob * 0.4;
        sideHead(g, hx, hy, eat ? 'closed' : kind === 'stalk' || crouch ? 'up' : 'open');
        return finish(g);
    }

    function poseSit(kind, phase, o) {
        var g = grid();
        o = o || {};
        var wag = kind === 'sit' ? Math.sin(phase * Math.PI * 2) : 0;
        limb(g, [[10, 20.4], [6.2, 20.8], [3.8, 19.2 - 1.2 * wag], [3.4, 17.2 - 1.8 * wag]], 1.3, 1.1, 1);
        ell(g, 12, 16.8, 5.6, 4.6, 1);
        ell(g, 15.6, 13.8, 4.1, 5.2, 1);
        ell(g, 16.9, 15.8, 2.2, 3.3, 4);
        ell(g, 9.6, 21, 2.2, 0.9, 1);
        stripes(g, 8, 13, 12.6, 13.8);
        limb(g, [[15.4, 16], [15.4, 21.3]], 1.15, 1.05, 1);
        dot(g, 16, 21.3, 4);
        var hx = 17.6, hy = 8.6, look = o.blink ? 'closed' : 'open';
        if (kind === 'groom') {
            var lick = (Math.sin(phase * Math.PI * 2) + 1) / 2;
            hx = 17.2; hy = 9.4;
            look = 'closed';
            limb(g, [[17.2, 16], [19.2, 13.2 - lick], [19.6, 11.4 - lick]], 1.15, 1.1, 1);
            dot(g, 20.2, 11.2 - lick, 4);
        }
        if (kind === 'lookup') { hy = 7.8; look = 'up'; }
        if (kind === 'yawn') look = 'closed';
        sideHead(g, hx, hy, look, { yawn: kind === 'yawn' });
        return finish(g);
    }

    function poseFront(kind, phase, o) {
        var g = grid();
        o = o || {};
        var wag = Math.sin(phase * Math.PI * 2);
        limb(g, [[21.6, 20.8], [25.4, 20.2], [27, 17.6 + 0.8 * wag], [26.4 + wag, 14.6]], 1.3, 1.1, 1);
        ell(g, 18, 16.8, 6.1, 5, 1);
        ell(g, 18, 18, 3, 3.4, 4);
        var kL = 0, kR = 0;
        if (kind === 'knead') {
            kL = 1.5 * Math.max(0, Math.sin(phase * Math.PI * 4));
            kR = 1.5 * Math.max(0, Math.sin(phase * Math.PI * 4 + Math.PI));
        }
        ell(g, 15.8, 21.2 - kL, 1.5, 0.9, 4);
        ell(g, 20.2, 21.2 - kR, 1.5, 0.9, 4);
        // head
        tri(g, [12.2, 9.2], [16.4, 6], [12.6, 2], 1);
        tri(g, [23.8, 9.2], [19.6, 6], [23.4, 2], 1);
        ell(g, 18, 9.6, 5.8, 4.4, 1);
        tri(g, [13.3, 6.6], [15.3, 5.6], [13.5, 3.7], 6);
        tri(g, [22.7, 6.6], [20.7, 5.6], [22.5, 3.7], 6);
        dot(g, 17, 6.2, 3); dot(g, 18, 6.4, 3); dot(g, 19, 6.2, 3);
        ell(g, 18, 11.8, 2.1, 1.1, 4);
        dot(g, 18, 11, 6);
        dot(g, 13.6, 11.4, 6); dot(g, 22.4, 11.4, 6);
        var look = o.happy ? 'happy' : o.blink ? 'closed' : 'open';
        eye(g, 15.6, 9, look);
        eye(g, 20.4, 9, look);
        return finish(g);
    }

    function poseLie(kind, phase, o) {
        var g = grid();
        o = o || {};
        var asleep = kind === 'sleep' || kind === 'nap';
        var breathe = Math.sin(phase * Math.PI * 2) * 0.35;
        if (asleep) limb(g, [[8.4, 20.4], [10, 22], [17, 22], [22, 21.6]], 1.2, 1, 1);
        else limb(g, [[8.4, 19.6], [5, 21], [2.4, 20.4]], 1.2, 1, 1);
        ell(g, 15.4, 18.2 - breathe, 8.8, 3.6 + breathe, 1);
        ell(g, 22.6, 20.8, 2.2, 0.9, 4);
        stripes(g, 10, 19, 14.8, 16);
        var hx = asleep ? 23.4 : 24, hy = asleep ? 16.4 : 14.8;
        sideHead(g, hx, hy, asleep || o.blink ? 'closed' : 'open');
        return finish(g);
    }

    function poseStretch() {
        var g = grid();
        limb(g, [[8.4, 12.4], [6.6, 9], [7.4, 5.6]], 1.3, 1.1, 1);
        limb(g, [[10.4, 16], [10.2, 21.3]], 1.4, 1.2, 2);
        ell(g, 11, 14.2, 4.2, 4, 1);
        ell(g, 16.4, 16.6, 6, 3, 1);
        ell(g, 21.6, 18.6, 3.2, 2.4, 1);
        limb(g, [[20.6, 19.6], [26.6, 21.3]], 1.3, 1.1, 2);
        limb(g, [[12.2, 16], [12.2, 21.3]], 1.4, 1.2, 1);
        limb(g, [[21.4, 19.8], [28, 21.3]], 1.3, 1.1, 1);
        dot(g, 28.6, 21.3, 4);
        stripes(g, 9, 17, 10.6, 14);
        sideHead(g, 26.2, 16.6, 'closed');
        return finish(g);
    }

    function render(kind, phase, o) {
        if (kind === 'walk' || kind === 'run' || kind === 'stalk' || kind === 'toBowl' || kind === 'crouch' ||
            kind === 'pounce' || kind === 'land' || kind === 'eat') return poseSide(kind, phase);
        if (kind === 'front' || kind === 'knead') return poseFront(kind, phase, o);
        if (kind === 'lie' || kind === 'sleep' || kind === 'nap') return poseLie(kind, phase, o);
        if (kind === 'stretch') return poseStretch();
        return poseSit(kind, phase, o);
    }

    function bowlGrid(full) {
        var g = new Uint8Array(16 * 8), w = 16;
        function put(x, y, c) { g[y * w + x] = c; }
        var rows = full
            ? ['....oooooooo....', '...oOoOoOoOoo...', '.kkkkkkkkkkkkkk.', 'kbbbbbbbbbbbbbbk', 'kBbbbbbbbbbbbbBk', '.kBbbbbbbbbbbBk.', '..kkkkkkkkkkkk..', '................']
            : ['................', '................', '.kkkkkkkkkkkkkk.', 'kddddddddddddddk', 'kBbbbbbbbbbbbbBk', '.kBbbbbbbbbbbBk.', '..kkkkkkkkkkkk..', '................'];
        var map = { o: '#c98b52', O: '#a86d3a', k: '#141416', b: '#5b78b8', B: '#3f5a94', d: '#2a3550' };
        rows.forEach(function (r, y) { for (var x = 0; x < w; x++) if (map[r[x]]) put(x, y, r[x]); });
        return { g: g, map: map, w: w, h: 8 };
    }

    // ---------- DOM ----------
    function el(tag, cls, parent) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (parent) parent.appendChild(n);
        return n;
    }

    var root = el('div', 'pc-root', document.body);
    root.style.setProperty('--pc-w', CW + 'px');
    root.style.setProperty('--pc-h', CH + 'px');
    var shadow = el('div', 'pc-shadow', root);
    var catEl = el('div', 'pc-cat', root);
    var CAT_NAME = 'Meow';
    var hit = el('button', 'pc-hit', catEl);
    hit.type = 'button';
    hit.setAttribute('aria-label', CAT_NAME + ', the pixel cat. Click to open the action menu.');
    hit.setAttribute('aria-haspopup', 'true');
    hit.setAttribute('aria-expanded', 'false');
    var canvas = el('canvas', 'pc-canvas', hit);
    canvas.width = GW;
    canvas.height = GH;
    canvas.style.width = CW + 'px';
    canvas.style.height = CH + 'px';
    var ctx = canvas.getContext('2d');
    var mrrp = el('span', 'pc-mrrp', catEl);
    mrrp.textContent = CAT_NAME;
    var heart = el('span', 'pc-heart', catEl);
    heart.textContent = '♥';
    heart.setAttribute('aria-hidden', 'true');
    var zzz = el('span', 'pc-zzz', catEl);
    zzz.innerHTML = '<span>z</span><span>z</span><span>Z</span>';
    zzz.setAttribute('aria-hidden', 'true');
    var bubble = el('div', 'pc-bubble', catEl);
    bubble.hidden = true;
    bubble.setAttribute('role', 'dialog');
    bubble.setAttribute('aria-label', CAT_NAME + ' interaction menu');
    var bubbleText = el('p', '', bubble);
    var bubbleActions = el('div', 'pc-actions', bubble);

    var bowlEl = el('canvas', 'pc-bowl', root);
    bowlEl.width = 16;
    bowlEl.height = 8;
    bowlEl.style.width = 16 * SCALE + 'px';
    bowlEl.style.height = 8 * SCALE + 'px';
    bowlEl.hidden = true;

    function paintBowl(full) {
        var b = bowlGrid(full), c = bowlEl.getContext('2d');
        c.clearRect(0, 0, 16, 8);
        for (var y = 0; y < 8; y++) for (var x = 0; x < 16; x++) {
            var k = b.g[y * 16 + x];
            if (k) { c.fillStyle = b.map[k]; c.fillRect(x, y, 1, 1); }
        }
    }

    var lastKey = '';
    function draw(kind, phase, o) {
        var key = kind + '|' + Math.floor(phase * 24) + '|' + (o.blink ? 1 : 0) + (o.happy ? 1 : 0);
        if (key === lastKey) return;
        lastKey = key;
        var g = render(kind, phase, o);
        ctx.clearRect(0, 0, GW, GH);
        for (var i = 0; i < g.length; i++) {
            if (!g[i]) continue;
            ctx.fillStyle = PAL[g[i]];
            ctx.fillRect(i % GW, (i / GW) | 0, 1, 1);
        }
    }

    // ---------- behaviour ----------
    var STORE = 'sk-journey-cat';
    function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { return {}; } }
    function save(patch) {
        var s = load();
        for (var k in patch) s[k] = patch[k];
        try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* storage off */ }
    }

    var DUR = {
        sit: [2.5, 5], front: [2, 4], groom: [2, 3.2], yawn: [1.3, 1.3], lookup: [1.4, 2],
        lie: [4, 8], sleep: [9, 18], stretch: [1.4, 1.4], knead: [2.6, 3.6], eat: [4, 4],
        crouch: [1.1, 1.1], land: [0.4, 0.4]
    };
    var MOVE = { walk: [34, 24], stalk: [16, 24], toBowl: [60, 24], run: [115, 44], pounce: [170, 44] };

    var saved = load();
    var cat = {
        state: 'sit', until: 0, x: typeof saved.x === 'number' ? saved.x : 40, target: null, dir: 1,
        phase: 0, jump: 0, blinkAt: 0, blinkUntil: 0, happyUntil: 0, stay: !!saved.stay, napUntil: 0, onArrive: null,
        dragging: false, dragged: false, falling: false, y: 0, vx: 0, vy: 0, pointer: null
    };

    function rand(a, b) { return a + Math.random() * (b - a); }
    function bounds() {
        var right = MOBILE ? 8 : 14;             // the skip button and settings sit above the cat's path
        return { min: 8, max: Math.max(8, window.innerWidth - right - CW) };
    }

    function enter(state, opts) {
        opts = opts || {};
        cat.state = state;
        cat.phase = 0;
        if (state !== 'pounce') cat.jump = 0;   // never leave the cat hanging mid-leap
        if (state !== 'crouch') cat.afterCrouch = false;
        var d = DUR[state];
        cat.until = d ? performance.now() + rand(d[0], d[1]) * 1000 : 0;
        if (state === 'nap') cat.until = performance.now() + 60000;
        if (MOVE[state]) {
            var b = bounds();
            cat.target = opts.target != null ? opts.target : b.min + Math.random() * (b.max - b.min);
            cat.target = Math.min(b.max, Math.max(b.min, cat.target));
            if (Math.abs(cat.target - cat.x) < 12 && !opts.target) cat.target = cat.x > (b.min + b.max) / 2 ? b.min + 30 : b.max - 30;
        }
        cat.onArrive = opts.onArrive || null;
        catEl.dataset.state = state;
    }

    function next(from) {
        var r = Math.random();
        if (cat.stay) {
            // Staying put: only calm, on-the-spot states.
            if (from === 'sit') return r < 0.3 ? 'groom' : r < 0.5 ? 'front' : r < 0.65 ? 'lookup' : r < 0.78 ? 'yawn' : 'sit';
            if (from === 'yawn') return r < 0.6 ? 'lie' : 'sit';
            if (from === 'lie') return r < 0.5 ? 'sleep' : 'sit';
            return 'sit';
        }
        switch (from) {
            case 'sit': return r < 0.32 ? 'walk' : r < 0.4 ? 'run' : r < 0.52 ? 'front' : r < 0.64 ? 'groom' : r < 0.72 ? 'yawn' : r < 0.8 ? 'lookup' : r < 0.86 ? 'stalk' : 'stretch';
            case 'front': return r < 0.5 ? 'sit' : r < 0.8 ? 'walk' : 'knead';
            case 'groom': return r < 0.6 ? 'sit' : 'walk';
            case 'yawn': return r < 0.55 ? 'lie' : 'knead';
            case 'knead': return r < 0.5 ? 'lie' : 'sit';
            case 'lie': return r < 0.5 ? 'sleep' : 'sit';
            case 'sleep': return 'stretch';
            case 'stretch': return r < 0.7 ? 'walk' : 'sit';
            case 'land': return 'groom';
            default: return 'sit';
        }
    }

    // ---------- bubble ----------
    var bubbleTimer = 0, bubbleOpen = false, menuMode = false, activeIdx = 0, buttons = [];
    function showBubble(text, actions, autoHide) {
        clearTimeout(bubbleTimer);
        bubbleText.textContent = text;
        bubbleActions.innerHTML = '';
        buttons = (actions || []).map(function (a, i) {
            var b = el('button', '', bubbleActions);
            b.type = 'button';
            b.textContent = a.label;
            b.addEventListener('click', function (ev) { ev.stopPropagation(); a.run(); });
            b.addEventListener('mouseenter', function () { activeIdx = i; });
            return b;
        });
        bubbleActions.hidden = !buttons.length;
        bubble.dataset.side = cat.x > window.innerWidth - 320 ? 'left' : 'right';
        bubble.hidden = false;
        bubbleOpen = true;
        menuMode = !!buttons.length;
        hit.setAttribute('aria-expanded', menuMode ? 'true' : 'false');
        if (autoHide) bubbleTimer = setTimeout(hideBubble, autoHide);
    }
    function hideBubble() {
        clearTimeout(bubbleTimer);
        bubble.hidden = true;
        bubbleOpen = false;
        menuMode = false;
        hit.setAttribute('aria-expanded', 'false');
    }
    function say(text, ms) { showBubble(text, null, ms || 2500); }

    // User-provided cat-meow recording.
    var meowAudio = new Audio('/journey/audio/sfx/meow.mp3');
    meowAudio.preload = 'auto';
    function playMeow() {
        try {
            meowAudio.currentTime = 0;
            var playback = meowAudio.play();
            if (playback && playback.catch) playback.catch(function () {});
        } catch { /* Keep the widget usable if audio is unavailable. */ }
    }

    function meowAction() {
        hideBubble();
        playMeow();
        flashMrrp();
        say('Meow!', 1800);
    }

    function feed() {
        hideBubble();
        var s = load();
        if (s.fedAt && Date.now() - s.fedAt < 120000) { say("I'm full. Maybe later."); return; }
        save({ fedAt: Date.now() });
        var b = bounds();
        var bw = 16 * SCALE;
        var bx = cat.x + CW + 24 < window.innerWidth - 16 ? cat.x + CW - 6 : Math.max(8, cat.x - bw - 18);
        paintBowl(true);
        bowlEl.style.left = bx + 'px';
        bowlEl.hidden = false;
        bowlEl.classList.remove('is-gone');
        // Stand so the face reaches the bowl.
        var stand = bx > cat.x ? bx - CW + 10 : bx + bw - 10;
        stand = Math.min(b.max, Math.max(b.min, stand));
        cat.stayBefore = cat.stay;
        enter('toBowl', {
            target: stand,
            onArrive: function () {
                cat.dir = bx > cat.x ? 1 : -1;
                enter('eat');
                setTimeout(function () { paintBowl(false); }, 3200);
                setTimeout(function () {
                    bowlEl.classList.add('is-gone');
                    setTimeout(function () { bowlEl.hidden = true; }, 500);
                    cat.happyUntil = performance.now() + 2500;
                }, 4200);
            }
        });
    }
    function play() {
        hideBubble();
        enter('crouch');
        cat.afterCrouch = true;
    }
    function pet() {
        hideBubble();
        cat.happyUntil = performance.now() + 3500;
        enter('knead');
        cat.until = performance.now() + 3500;
        flashMrrp();
    }
    function nap() {
        hideBubble();
        enter('yawn');
        setTimeout(function () { if (cat.state === 'yawn') enter('nap'); }, 1300);
    }
    function sitHere() {
        cat.stay = true;
        save({ stay: true, x: cat.x });
        enter('sit');
        say("I'll stay right here.", 2200);
    }
    function roam() {
        cat.stay = false;
        save({ stay: false });
        say('Off I go.', 2000);
    }
    function openMenu(fromKeyboard) {
        if (cat.state === 'walk' || cat.state === 'stalk' || cat.state === 'run') enter('front');
        else if (cat.state === 'nap' || cat.state === 'sleep') enter('stretch');
        showBubble(CAT_NAME + '?', [
            { label: 'Feed', run: feed },
            { label: 'Play', run: play },
            { label: 'Pet', run: pet },
            { label: 'Meow', run: meowAction },
            { label: 'Sleep', run: nap },
            cat.stay ? { label: 'Roam', run: roam } : { label: 'Sit', run: sitHere }
        ], 8000);
        activeIdx = 0;
        if (fromKeyboard && buttons[0]) buttons[0].focus();
        flashMrrp();
    }
    var mrrpTimer = 0;
    function flashMrrp() {
        mrrp.classList.add('is-on');
        clearTimeout(mrrpTimer);
        mrrpTimer = setTimeout(function () { mrrp.classList.remove('is-on'); }, 1200);
    }

    var dragClickTimer = 0;
    hit.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (cat.dragged) {
            cat.dragged = false;
            clearTimeout(dragClickTimer);
            return;
        }
        playMeow();
        flashMrrp();
        if (menuMode) hideBubble();
        else openMenu(ev.detail === 0);
    });

    function beginCatDrag(ev) {
        if (ev.button !== 0 || ev.isPrimary === false) return;
        var rect = catEl.getBoundingClientRect();
        var rootRect = root.getBoundingClientRect();
        if (!cat.falling) cat.y = -cat.jump;
        cat.pointer = {
            id: ev.pointerId,
            startX: ev.clientX,
            startY: ev.clientY,
            lastX: ev.clientX,
            lastY: ev.clientY,
            lastAt: performance.now(),
            offsetX: ev.clientX - rect.left,
            offsetY: ev.clientY - rect.top,
            baseTop: rootRect.bottom - CH,
            vx: 0,
            vy: 0,
            dragging: false
        };
        try { hit.setPointerCapture(ev.pointerId); } catch { /* Browser fallback. */ }
    }

    function moveCatDrag(ev) {
        var p = cat.pointer;
        if (!p || ev.pointerId !== p.id) return;
        if (!p.dragging && Math.hypot(ev.clientX - p.startX, ev.clientY - p.startY) < 5) return;
        if (!p.dragging) {
            p.dragging = true;
            cat.dragging = true;
            cat.falling = false;
            cat.vx = 0;
            cat.vy = 0;
            cat.target = null;
            cat.onArrive = null;
            hideBubble();
            enter('front');
            cat.until = 0;
        }

        var now = performance.now();
        var elapsed = Math.max(0.008, (now - p.lastAt) / 1000);
        var dx = ev.clientX - p.lastX;
        var dy = ev.clientY - p.lastY;
        p.vx = dx / elapsed;
        p.vy = dy / elapsed;
        if (Math.abs(dx) > 1) cat.dir = dx > 0 ? 1 : -1;
        p.lastX = ev.clientX;
        p.lastY = ev.clientY;
        p.lastAt = now;

        var b = bounds();
        cat.x = Math.min(b.max, Math.max(b.min, ev.clientX - p.offsetX));
        var desiredTop = ev.clientY - p.offsetY;
        cat.y = Math.max(-Math.max(0, p.baseTop), Math.min(0, desiredTop - p.baseTop));
        ev.preventDefault();
    }

    function finishCatDrag(ev) {
        var p = cat.pointer;
        if (!p || ev.pointerId !== p.id) return;
        cat.pointer = null;
        if (!p.dragging) return;
        cat.dragging = false;
        cat.falling = true;
        cat.vx = Math.max(-1000, Math.min(1000, p.vx));
        cat.vy = Math.max(-1600, Math.min(1600, p.vy));
        cat.target = null;
        cat.until = 0;
        cat.dragged = true;
        clearTimeout(dragClickTimer);
        dragClickTimer = setTimeout(function () { cat.dragged = false; }, 100);
    }

    function cancelCatDrag(ev) {
        var p = cat.pointer;
        if (!p || (ev.pointerId != null && ev.pointerId !== p.id)) return;
        cat.pointer = null;
        if (!p.dragging) return;
        cat.dragging = false;
        cat.falling = true;
        cat.vx = 0;
        cat.vy = 0;
    }

    hit.addEventListener('pointerdown', beginCatDrag);
    hit.addEventListener('pointermove', moveCatDrag);
    hit.addEventListener('pointerup', finishCatDrag);
    hit.addEventListener('pointercancel', cancelCatDrag);
    bubble.addEventListener('click', function (ev) { ev.stopPropagation(); });
    document.addEventListener('click', function (ev) {
        if (bubbleOpen && !catEl.contains(ev.target)) hideBubble();
    }, true);
    document.addEventListener('keydown', function (ev) {
        if (!menuMode) return;
        if (ev.key === 'Escape') { hideBubble(); hit.focus(); return; }
        var step = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
        if (!step || !buttons.length) return;
        ev.preventDefault();
        activeIdx = (activeIdx + step + buttons.length) % buttons.length;
        buttons[activeIdx].focus();
    });

    // The story scrolls inside its own layer; keep wheel scrolling working over the cat.
    root.addEventListener('wheel', function (ev) {
        var layer = document.getElementById('scroll-manager-container');
        if (!layer) return;
        ev.preventDefault();
        layer.scrollTop += ev.deltaY;
    }, { passive: false });

    // ---------- loop ----------
    var lastT = 0;
    function tick(now) {
        var dt = Math.min(0.3, (now - (lastT || now)) / 1000);
        lastT = now;
        var b = bounds();
        var s = cat.state;

        if (cat.dragging) {
            cat.phase = (cat.phase + dt / 2.4) % 1;
        } else if (cat.falling) {
            cat.x += cat.vx * dt;
            cat.vx *= Math.exp(-2.1 * dt);
            if (cat.x <= b.min) { cat.x = b.min; cat.vx = Math.abs(cat.vx) * 0.42; cat.dir = 1; }
            else if (cat.x >= b.max) { cat.x = b.max; cat.vx = -Math.abs(cat.vx) * 0.42; cat.dir = -1; }
            cat.y += cat.vy * dt;
            cat.vy += 2200 * dt;
            cat.phase = (cat.phase + dt / 2.4) % 1;
            if (cat.y >= 0) {
                cat.y = 0;
                if (cat.vy > 260) {
                    cat.vy = -cat.vy * 0.3;
                    cat.vx *= 0.72;
                    enter('land');
                    cat.until = 0;
                } else {
                    cat.vx = 0;
                    cat.vy = 0;
                    cat.falling = false;
                    enter('sit');
                }
            }
        } else if (MOVE[s] && cat.target != null) {
            var m = MOVE[s], dx = cat.target - cat.x;
            if (Math.abs(dx) > 0.5) cat.dir = dx > 0 ? 1 : -1;
            var stepPx = m[0] * dt;
            cat.phase = (cat.phase + stepPx / m[1]) % 1;
            if (s === 'pounce') {
                var total = Math.abs(cat.target - cat.pounceFrom) || 1;
                var t = 1 - Math.abs(cat.target - cat.x) / total;
                cat.jump = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) * 22;
            }
            if (Math.abs(dx) <= stepPx) {
                cat.x = cat.target;
                cat.target = null;
                cat.jump = 0;
                var arrive = cat.onArrive;
                if (arrive) { cat.onArrive = null; arrive(); }
                else if (s === 'pounce') enter('land');
                else enter('sit');
            } else {
                cat.x += Math.sign(dx) * stepPx;
            }
        } else {
            cat.phase = (cat.phase + dt / (s === 'knead' ? 0.9 : s === 'eat' ? 0.7 : s === 'groom' ? 0.8 : 2.4)) % 1;
            if (cat.until && now > cat.until && !bubbleOpen) {
                if (s === 'crouch' && cat.afterCrouch) {
                    cat.afterCrouch = false;
                    cat.pounceFrom = cat.x;
                    var dir = cat.x > (b.min + b.max) / 2 ? -1 : 1;
                    enter('pounce', { target: cat.x + dir * rand(110, 170) });
                    cat.pounceFrom = cat.x;
                } else if (s === 'nap') {
                    enter('stretch');
                } else if (!reduced || !MOVE[next(s)]) {
                    var n = next(s);
                    enter(reduced && MOVE[n] ? 'sit' : n);
                } else {
                    enter('sit');
                }
            }
        }

        cat.x = Math.min(b.max, Math.max(b.min, cat.x));

        if (now > cat.blinkAt) { cat.blinkUntil = now + 140; cat.blinkAt = now + rand(2500, 5500); }
        var happy = now < cat.happyUntil;
        draw(cat.state, cat.phase, { blink: now < cat.blinkUntil, happy: happy });

        var flip = cat.dir < 0 ? -1 : 1;
        var vertical = cat.dragging || cat.falling ? cat.y : -cat.jump;
        catEl.style.transform = 'translate3d(' + Math.round(cat.x) + 'px,' + Math.round(vertical) + 'px,0)';
        canvas.style.transform = 'scale(' + flip + ',1)';
        catEl.classList.toggle('is-happy', happy);
        catEl.classList.toggle('is-asleep', cat.state === 'sleep' || cat.state === 'nap');
        shadow.style.transform = 'translate3d(' + Math.round(cat.x + CW / 2 - 32) + 'px,0,0)';
        var lift = cat.dragging || cat.falling ? Math.max(0, -cat.y) : cat.jump;
        shadow.style.opacity = String(Math.max(0, 0.35 - lift / 200));
        requestAnimationFrame(tick);
    }

    window.addEventListener('resize', function () {
        var b = bounds();
        cat.x = Math.min(b.max, Math.max(b.min, cat.x));
    });

    enter('sit');
    cat.until = performance.now() + 2500;
    requestAnimationFrame(tick);
})();
