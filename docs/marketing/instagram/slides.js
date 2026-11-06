/* Vault-It Instagram intro carousel: six 6-second video slides, 1080 x 1350 (4:5), Night look.
   Runs inside the brand book page; render.js exposes the brand book's own 3D house renderer as window.__VI
   and writes the MP4s. The name is set in BRAND below: after a rename, change it there and re-render. */
(function () {
  "use strict";
  var W = 1080, H = 1350, FPS = 30, DUR = 6;
  var BRAND = { a: "Vault", b: "It", full: "Vault-It", site: "vault-it.co" };
  var C = {
    bg: "#080808", panel: "#080D14", panel2: "#0A1A1C", line: "#15302F", text: "#E8E8E8", muted: "#9AA0A6",
    teal: "#44C0B9", tealDeep: "#007F7B", gold: "#E8C56A", brass: "#C9A84C",
    red: "#B8403B", redGlow: "rgba(184,64,59,.6)", goldGlow: "rgba(232,197,106,.65)", onGold: "#1A1400"
  };
  var HEAD = "'Oxanium',sans-serif", BODY = "'DM Sans',sans-serif", MONO = "'Share Tech Mono',monospace", MARK = "'Syne',sans-serif";
  var VI = window.__VI, M = 72;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function ease(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeIO(t) { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function shade(h, f) { var c = hexRgb(h); return "rgb(" + c.map(function (v) { return Math.round(clamp(v * f, 0, 255)); }).join(",") + ")"; }

  /* ---------- icons from the brand set (stroke layer) ---------- */
  var IC = {};
  function loadIcon(id, col) {
    var ic = (VI.ICONS || []).filter(function (x) { return x.id === id; })[0];
    if (!ic) return Promise.resolve();
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96">' +
      '<g fill="' + col + '" fill-opacity=".18" stroke="none">' + (ic.f || "") + '</g>' +
      '<g fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (ic.s || ic.f || "") + '</g></svg>';
    return new Promise(function (res) {
      var im = new Image(); im.onload = function () { IC[id + col] = im; res(); }; im.onerror = function () { res(); };
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  function icon(c, id, col, x, y, s) { var im = IC[id + col]; if (im) c.drawImage(im, x, y, s, s); }

  /* ---------- text ---------- */
  // tokens: [word, colour?, glow?]; words fade and lift in one after another from `start`
  function rich(c, tokens, x, y, size, maxW, t, start, stagger) {
    c.font = "700 " + size + "px " + HEAD; c.textBaseline = "alphabetic";
    var sp = c.measureText(" ").width, lh = size * 1.06, cx = x, cy = y;
    tokens.forEach(function (tk, i) {
      var w = c.measureText(tk[0]).width;
      if (cx > x && cx + w > x + maxW) { cx = x; cy += lh; }
      var k = ease(seg(t, start + i * stagger, start + i * stagger + .45));
      c.save(); c.globalAlpha = k; c.fillStyle = tk[1] || C.text;
      if (tk[2]) { c.shadowColor = tk[2]; c.shadowBlur = size * .35; }
      c.fillText(tk[0], cx, cy + (1 - k) * 18);
      if (tk[2]) { c.shadowBlur = size * .12; c.fillText(tk[0], cx, cy + (1 - k) * 18); }
      c.restore();
      cx += w + sp;
    });
    return cy + size * .3;
  }
  function words(s, col) { return s.split(" ").map(function (w) { return [w, col]; }); }
  function para(c, str, x, y, size, maxW, col, alpha, font, lhK) {
    c.save(); c.globalAlpha = alpha; c.fillStyle = col; c.font = (font || ("400 " + size + "px " + BODY)); c.textBaseline = "alphabetic";
    var ws = str.split(" "), line = "", lh = size * (lhK || 1.32);
    ws.forEach(function (w) { var tst = line ? line + " " + w : w; if (c.measureText(tst).width > maxW && line) { c.fillText(line, x, y); y += lh; line = w; } else line = tst; });
    c.fillText(line, x, y); c.restore(); return y + lh * .4;
  }
  function mono(c, s, x, y, size, col, align, alpha) {
    c.save(); c.globalAlpha = alpha == null ? 1 : alpha; c.font = size + "px " + MONO; c.fillStyle = col; c.textAlign = align || "left"; c.textBaseline = "alphabetic";
    c.fillText(s, x, y); c.restore();
  }

  /* ---------- shared frame: wordmark, slide count, disclaimer ---------- */
  function wordmark(c, x, y, fs) {
    c.save(); c.font = "800 " + fs + "px " + MARK; c.fillStyle = C.text; c.textBaseline = "alphabetic";
    var w1 = c.measureText(BRAND.a).width; c.fillText(BRAND.a, x, y);
    var dw = fs * .3, dh = fs * .17, dx = x + w1 + fs * .07; c.fillStyle = C.teal; rr(c, dx, y - fs * .2, dw, dh, 2); c.fill();
    c.fillStyle = C.text; c.fillText(BRAND.b, dx + dw + fs * .07, y); c.restore();
  }
  function chrome(c, n) {
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(68,192,185,.022)"; for (var y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
    var g = c.createRadialGradient(W * .5, H * .78, 40, W * .5, H * .78, W * .75);
    g.addColorStop(0, "rgba(0,127,123,.16)"); g.addColorStop(1, "rgba(0,127,123,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    VI.drawIcon(c, M, 58, 76, false);
    wordmark(c, M + 76 + 20, 112, 46);
    mono(c, ("0" + n) + " / 06", W - M, 110, 28, C.teal, "right");
    c.fillStyle = C.line; c.fillRect(M, H - 92, W - 2 * M, 2);
    mono(c, "NOT REGULATED BY THE FCA. NOT FINANCIAL ADVICE.", M, H - 46, 23, C.muted);
    mono(c, BRAND.site.toUpperCase(), W - M, H - 46, 23, C.teal, "right");
  }
  function swipe(c, t) {
    var a = .55 + .45 * Math.sin(t * 4), x = W - M, y = H - 130;
    mono(c, "SWIPE", x - 44, y, 26, C.teal, "right", a);
    c.save(); c.globalAlpha = a; c.strokeStyle = C.teal; c.lineWidth = 4; c.lineCap = "round"; c.lineJoin = "round";
    var o = (Math.sin(t * 4) + 1) * 4; c.beginPath(); c.moveTo(x - 30 + o, y - 22); c.lineTo(x - 14 + o, y - 9); c.lineTo(x - 30 + o, y + 4); c.stroke(); c.restore();
  }

  /* ---------- 3D house from the brand book ---------- */
  var HS = {};
  function house(c, key, rect, o) {
    var st = HS[key];
    if (!st) st = HS[key] = VI.houseState({ theme: "dark", sweep: true, noPulse: !!o.noPulse, fscale: o.fscale || 1.6 });
    st.p = o.p; st.yaw = o.yaw; st.now = o.now; st.zoom = o.zoom || 1; st.fit = o.fit || .85; st.noFlash = !!o.noFlash;
    if (o.tag === false) st.tag = false;
    var info = VI.renderHouse(c, rect, st); st.primed = true; return info;
  }
  function fadeTop(c, y, h) {
    var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "rgba(8,8,8,1)"); g.addColorStop(1, "rgba(8,8,8,0)");
    c.fillStyle = g; c.fillRect(0, y, W, h);
  }

  /* ---------- isometric blocks (net worth view) ---------- */
  function cube(c, x, y, s, col, a, k) {
    // x,y = bottom front corner; s = edge; k = scale (pop in or out)
    if (a <= 0 || k <= 0) return;
    s *= k; var hx = s * .866, hy = s * .5;
    c.save(); c.globalAlpha = a;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - hx, y - hy); c.lineTo(x - hx, y - hy - s); c.lineTo(x, y - s); c.closePath(); c.fillStyle = shade(col, .62); c.fill();
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + hx, y - hy); c.lineTo(x + hx, y - hy - s); c.lineTo(x, y - s); c.closePath(); c.fillStyle = shade(col, .82); c.fill();
    c.beginPath(); c.moveTo(x, y - s); c.lineTo(x - hx, y - hy - s); c.lineTo(x, y - 2 * hy - s); c.lineTo(x + hx, y - hy - s); c.closePath(); c.fillStyle = shade(col, 1.08); c.fill();
    c.strokeStyle = "rgba(8,8,8,.55)"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - s); c.lineTo(x - hx, y - hy - s); c.moveTo(x, y - s); c.lineTo(x + hx, y - hy - s); c.stroke();
    c.restore();
  }
  function iso(ox, oy, s, gx, gy, gz) { return [ox + (gx - gy) * s * .866, oy + (gx + gy) * s * .5 - gz * s]; }

  /* ---------- slides ---------- */
  var SL = [];

  // 1. The hook: tagline in the brand's tagline colours, the house building itself
  SL.push({
    cover: 5.6, draw: function (c, t) {
      chrome(c, 1);
      var hy = 600;
      house(c, "s1", { x: 0, y: hy, w: W, h: H - 140 - hy }, { p: .03 + .62 * easeIO(seg(t, .5, 5.4)), yaw: -1.05 + t * .1, now: t * 1000, fscale: 1.8, fit: .95 });
      var y = rich(c, [["Get"], ["out"], ["of"], ["the"], ["red", C.red, C.redGlow], ["and"], ["into"], ["your", C.teal], ["home.", C.gold, C.goldGlow]], M, 262, 96, W - 2 * M, t, .15, .08);
      para(c, "A UK money app that turns your house deposit into bricks on your own 3D house.", M, y + 52, 40, W - 2 * M - 40, C.muted, ease(seg(t, 1.1, 1.7)));
      swipe(c, t);
    }
  });

  // 2. The problem: money in too many places, pulled onto one map
  var CARDS = [
    { l: "Credit card", tag: "OWED", ic: "card", col: C.red }, { l: "Savings pot", tag: "SAVED", ic: "piggy", col: C.teal },
    { l: "Overdraft", tag: "OWED", ic: "overdraft", col: C.red }, { l: "Deposit fund", tag: "GOAL", ic: "house-builder", col: C.gold },
    { l: "Car finance", tag: "OWED", ic: "car", col: C.red }, { l: "Budget notes", tag: "PLAN", ic: "budget", col: C.teal }
  ];
  var SCAT = [[90, 640, -9], [600, 700, 7], [180, 860, 5], [560, 930, -6], [70, 1060, -4], [610, 1110, 9]];
  SL.push({
    cover: 5.6, draw: function (c, t) {
      chrome(c, 2);
      var y = rich(c, words("Your money lives in too many places."), M, 262, 88, W - 2 * M, t, .15, .07);
      para(c, "Debts in one app, savings in another, the deposit on a note in your phone.", M, y + 48, 38, W - 2 * M, C.muted, ease(seg(t, .9, 1.5)));
      var k = easeIO(seg(t, 2.3, 3.5)), px = M, py = 610, pw = W - 2 * M, ph = 524;
      c.save(); c.globalAlpha = k; rr(c, px, py, pw, ph, 22); c.fillStyle = "rgba(10,26,28,.55)"; c.fill(); c.strokeStyle = C.teal; c.lineWidth = 3; c.stroke();
      c.font = "30px " + MONO; c.fillStyle = C.bg; c.fillRect(px + 30, py - 16, c.measureText("ONE MAP").width + 28, 32); c.restore();
      mono(c, "ONE MAP", px + 44, py + 10, 30, C.teal, "left", k);
      CARDS.forEach(function (cd, i) {
        var col = i % 2, row = (i / 2) | 0, gx = px + 34 + col * (pw / 2 - 12), gy = py + 56 + row * 158, cw = pw / 2 - 56, ch = 132;
        var fl = Math.sin(t * 1.6 + i) * 10 * (1 - k), sx = SCAT[i][0], sy = SCAT[i][1] + fl;
        var x = lerp(sx, gx, k), yy = lerp(sy, gy, k), w = lerp(400, cw, k), rot = lerp(SCAT[i][2], 0, k) * Math.PI / 180;
        var a = ease(seg(t, .5 + i * .14, .9 + i * .14));
        c.save(); c.globalAlpha = a; c.translate(x + w / 2, yy + ch / 2); c.rotate(rot); c.translate(-w / 2, -ch / 2);
        c.shadowColor = "rgba(0,0,0,.6)"; c.shadowBlur = 24 * (1 - k); rr(c, 0, 0, w, ch, 16); c.fillStyle = C.panel; c.fill(); c.shadowBlur = 0;
        c.strokeStyle = C.line; c.lineWidth = 2; c.stroke(); c.fillStyle = cd.col; rr(c, 0, 0, 9, ch, [16, 0, 0, 16]); c.fill();
        icon(c, cd.ic, cd.col, 30, 34, 64);
        c.font = "500 34px " + BODY; c.fillStyle = C.text; c.textBaseline = "alphabetic"; c.fillText(cd.l, 112, 62);
        c.font = "24px " + MONO; c.fillStyle = cd.col; c.fillText(cd.tag, 112, 100);
        c.restore();
      });
      var k2 = ease(seg(t, 3.7, 4.4));
      c.save(); c.globalAlpha = k2; c.font = "700 50px " + HEAD; c.fillStyle = C.teal; c.textBaseline = "alphabetic";
      c.shadowColor = "rgba(68,192,185,.45)"; c.shadowBlur = 18; c.fillText("One honest map instead.", M, 1214 + (1 - k2) * 14); c.restore();
      swipe(c, t);
    }
  });

  // 3. The mechanic: saving lays bricks
  SL.push({
    cover: 5.6, draw: function (c, t) {
      chrome(c, 3);
      var hy = 520, p = .1 + .66 * easeIO(seg(t, .6, 5.2));
      // steps: the deposit grows in small jumps, like real saving
      p = .1 + Math.floor((p - .1) * 40) / 40;
      house(c, "s3", { x: 0, y: hy, w: W, h: 1090 - hy }, { p: p, yaw: -.7 + t * .06, now: t * 1000, fscale: 1.8, fit: .92 });
      var y = rich(c, words("Every pound you save lays a brick."), M, 262, 88, W - 2 * M, t, .15, .07);
      para(c, "Set your house price and deposit. Each brick stands for a slice of the deposit, so you watch it rise.", M, y + 48, 38, W - 2 * M, C.muted, ease(seg(t, .9, 1.5)));
      var by = 1112, pc = Math.round(p * 100);
      mono(c, "DEPOSIT SAVED", M, by, 28, C.muted);
      mono(c, pc + "%", W - M, by + 2, 44, C.gold, "right");
      rr(c, M, by + 24, W - 2 * M, 16, 8); c.fillStyle = "#13202A"; c.fill();
      c.save(); c.shadowColor = C.goldGlow; c.shadowBlur = 16; rr(c, M, by + 24, (W - 2 * M) * p, 16, 8); c.fillStyle = C.gold; c.fill(); c.restore();
      mono(c, "ILLUSTRATION", M, by + 84, 20, C.muted, "left", .8);
      swipe(c, t);
    }
  });

  // 4. Debt down, net worth up, in blocks (big block = £1,000, small cube = £100, as in the app)
  SL.push({
    cover: 5.7, draw: function (c, t) {
      chrome(c, 4);
      var y = rich(c, [["Clear"], ["the"], ["red,", C.red, C.redGlow], ["block"], ["by"], ["block."]], M, 262, 88, W - 2 * M, t, .15, .07);
      para(c, "Watch debt shrink and net worth grow, in 3D.", M, y + 48, 38, W - 2 * M, C.muted, ease(seg(t, .9, 1.5)));
      var s = 74;
      // debt pile: 3 x 2 footprint, 2 high; top layer goes first, front blocks last
      var debt = [];
      for (var gz = 0; gz < 2; gz++) for (var gy = 0; gy < 2; gy++) for (var gx = 0; gx < 3; gx++) debt.push([gx, gy, gz]);
      var order = debt.slice().sort(function (a, b) { return (b[2] - a[2]) || ((a[0] + a[1]) - (b[0] + b[1])); });
      var gone = function (b) { var i = order.indexOf(b); return seg(t, .9 + i * .2, 1.15 + i * .2); };
      debt.forEach(function (b) {
        var g = gone(b), pt = iso(300, 1000, s, b[0], b[1], b[2]);
        cube(c, pt[0], pt[1] - g * 40, s, C.red, 1 - g, 1 - g * .4);
      });
      var pk = ease(seg(t, 3.4, 3.9));
      if (pk > 0) {
        c.save(); c.globalAlpha = pk; c.translate(300, 880); c.scale(.8 + .2 * pk, .8 + .2 * pk);
        c.beginPath(); c.arc(0, 0, 70, 0, Math.PI * 2); c.fillStyle = "rgba(68,192,185,.12)"; c.fill(); c.strokeStyle = C.teal; c.lineWidth = 5; c.stroke();
        c.beginPath(); c.moveTo(-30, 2); c.lineTo(-8, 24); c.lineTo(32, -20); c.lineWidth = 9; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
        c.restore();
        mono(c, "PAID OFF", 300, 1000, 34, C.teal, "center", pk);
      }
      mono(c, "DEBT", 300, 1110, 28, C.red, "center", 1 - pk);
      // net worth stack: 2 x 2 footprint rising 3 high, then small cubes on top
      var nw = [];
      for (var z = 0; z < 3; z++) for (var yy = 0; yy < 2; yy++) for (var xx = 0; xx < 2; xx++) nw.push([xx, yy, z]);
      nw.sort(function (a, b) { return (a[2] - b[2]) || ((b[0] + b[1]) - (a[0] + a[1])); });
      // painter's order: back to front within each layer
      var drawN = nw.map(function (b, i) { return { b: b, k: ease(seg(t, 3.1 + i * .16, 3.45 + i * .16)) }; });
      drawN.sort(function (A, B) { return (A.b[2] - B.b[2]) || ((A.b[0] + A.b[1]) - (B.b[0] + B.b[1])); });
      drawN.forEach(function (d) {
        var pt = iso(780, 1000, s, d.b[0], d.b[1], d.b[2]); cube(c, pt[0], pt[1] - (1 - d.k) * 160, s, C.teal, d.k, 1);
      });
      var ss = s * .45, top = 3;
      for (var j = 0; j < 4; j++) {
        var kk = ease(seg(t, 5.0 + j * .12, 5.3 + j * .12)), q = iso(780, 1000, s, .3 + (j % 2) * .9, .3 + ((j / 2) | 0) * .9, top);
        cube(c, q[0], q[1] - (1 - kk) * 80, ss, C.gold, kk, 1);
      }
      mono(c, "NET WORTH", 780, 1110, 28, C.teal, "center", 1);
      // legend
      cube(c, M + 26, 1206, 30, C.teal, 1, 1); mono(c, "= £1,000", M + 62, 1196, 26, C.text);
      cube(c, M + 270, 1202, 16, C.gold, 1, 1); mono(c, "= £100", M + 292, 1196, 26, C.text);
      mono(c, "ILLUSTRATION", M + 430, 1196, 20, C.muted, "left", .8);
      swipe(c, t);
    }
  });

  // 5. Trust: you type the numbers in
  var FIELDS = ["Take-home pay", "Credit card", "Deposit goal"];
  var TICKS = ["No bank login", "No card to join", "Runs in your browser", "Add it to your home screen"];
  SL.push({
    cover: 5.6, draw: function (c, t) {
      chrome(c, 5);
      var y = rich(c, words("You type the numbers in."), M, 262, 70, W - 2 * M, t, .15, .07);
      para(c, "No bank connection to set up. Your own figures, at your own pace.", M, y + 48, 38, W - 2 * M, C.muted, ease(seg(t, .9, 1.5)));
      // phone
      var fx = M + 10, fy = 560, fw = 400, fh = 620, a = ease(seg(t, .4, 1));
      c.save(); c.globalAlpha = a; rr(c, fx, fy, fw, fh, 48); c.fillStyle = C.panel; c.fill(); c.strokeStyle = "#1E3A38"; c.lineWidth = 6; c.stroke();
      rr(c, fx + fw / 2 - 50, fy + 18, 100, 22, 11); c.fillStyle = "#050505"; c.fill(); c.restore();
      FIELDS.forEach(function (lab, i) {
        var t0 = 1.0 + i * 1.2, on = t >= t0 && t < t0 + 1.2, n = Math.floor(clamp((t - t0 - .2) / .17, 0, 5));
        var ly = fy + 100 + i * 148;
        mono(c, lab.toUpperCase(), fx + 34, ly, 22, C.muted, "left", a);
        c.save(); c.globalAlpha = a; rr(c, fx + 30, ly + 16, fw - 60, 78, 14); c.fillStyle = "#0A1018"; c.fill();
        c.strokeStyle = on ? C.teal : C.line; c.lineWidth = on ? 3 : 2; c.stroke();
        c.font = "500 36px " + BODY; c.fillStyle = C.text; c.textBaseline = "middle";
        var txt = "£ " + "•".repeat(n); c.fillText(txt, fx + 54, ly + 56);
        if (on && Math.floor(t * 3) % 2 === 0) { var tw = c.measureText(txt).width; c.fillStyle = C.teal; c.fillRect(fx + 58 + tw, ly + 36, 3, 40); }
        c.restore();
      });
      var bk = ease(seg(t, 4.6, 5.0));
      c.save(); c.globalAlpha = a; rr(c, fx + 30, fy + fh - 100, fw - 60, 66, 33); c.fillStyle = bk > 0 ? C.gold : "#13202A"; c.fill();
      c.font = "700 28px " + HEAD; c.fillStyle = bk > 0 ? C.onGold : C.muted; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("Save", fx + fw / 2, fy + fh - 66); c.restore();
      // ticks
      TICKS.forEach(function (tk, i) {
        var k = ease(seg(t, 1.4 + i * .5, 1.9 + i * .5)), ty = 640 + i * 132, tx = 540;
        c.save(); c.globalAlpha = k; c.translate((1 - k) * 30, 0);
        c.beginPath(); c.arc(tx + 26, ty, 26, 0, Math.PI * 2); c.fillStyle = "rgba(68,192,185,.14)"; c.fill(); c.strokeStyle = C.teal; c.lineWidth = 3; c.stroke();
        c.beginPath(); c.moveTo(tx + 14, ty + 1); c.lineTo(tx + 23, ty + 10); c.lineTo(tx + 39, ty - 8); c.lineWidth = 5; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
        c.restore();
        para(c, tk, tx + 74, ty + 12, 36, W - M - tx - 74, C.text, k, "500 36px " + BODY, 1.15);
      });
      swipe(c, t);
    }
  });

  // 6. The ask: free beta, link in bio
  SL.push({
    cover: 5.6, draw: function (c, t) {
      chrome(c, 6);
      var hy = 486;
      house(c, "s6", { x: 0, y: hy, w: W, h: 1000 - hy + 40 }, { p: .92 + .08 * easeIO(seg(t, .3, 2.2)), yaw: -.4 + t * .12, now: t * 1000, fscale: 1.6, fit: .9, noFlash: true });
      var y = rich(c, [["Free", C.gold, C.goldGlow], ["during"], ["the"], ["beta."]], M, 262, 96, W - 2 * M, t, .15, .09);
      para(c, "Your road from debt to your own front door.", M, y + 48, 38, W - 2 * M, C.muted, ease(seg(t, .8, 1.4)));
      var k = ease(seg(t, 2.0, 2.6)), bw = 560, bx = (W - bw) / 2, by = 1052;
      c.save(); c.globalAlpha = k; c.translate(0, (1 - k) * 20);
      c.shadowColor = C.goldGlow; c.shadowBlur = 26 + 10 * Math.sin(t * 2.6); rr(c, bx, by, bw, 96, 48); c.fillStyle = C.gold; c.fill(); c.shadowBlur = 0;
      c.font = "700 42px " + HEAD; c.fillStyle = C.onGold; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("Join the beta list", W / 2, by + 50);
      c.restore();
      mono(c, "LINK IN BIO  ·  " + BRAND.site.toUpperCase(), W / 2, 1196, 28, C.teal, "center", ease(seg(t, 2.4, 3.0)));
      c.save(); c.globalAlpha = ease(seg(t, 2.8, 3.4)); c.font = "400 28px " + BODY; c.fillStyle = C.muted; c.textAlign = "center"; c.textBaseline = "alphabetic";
      c.fillText("No card. No bank login. Made in Lincoln by Pete Thickett.", W / 2, 1238); c.restore();
    }
  });

  /* ---------- stills: profile picture and highlight covers ---------- */
  var HL = [["Start here", "home"], ["How it works", "house-builder"], ["Beta", "rocket"], ["Questions", "info"], ["Founder", "user"]];
  function avatar(c) {
    var S = 1080; c.canvas.width = S; c.canvas.height = S; c.fillStyle = C.bg; c.fillRect(0, 0, S, S);
    VI.drawIcon(c, 90, 90, 900, false);
  }
  function highlight(c, i) {
    var w = 1080, h = 1920; c.canvas.width = w; c.canvas.height = h; c.fillStyle = C.bg; c.fillRect(0, 0, w, h);
    var g = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 520); g.addColorStop(0, "rgba(0,127,123,.28)"); g.addColorStop(1, "rgba(0,127,123,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.beginPath(); c.arc(w / 2, h / 2, 330, 0, Math.PI * 2); c.strokeStyle = C.teal; c.lineWidth = 16; c.stroke();
    var col = HL[i][1] === "house-builder" ? C.gold : C.teal;
    icon(c, HL[i][1], col, w / 2 - 210, h / 2 - 210, 420);
  }

  async function prepare() {
    var fonts = ["700 80px Oxanium", "800 40px Syne", "400 30px 'DM Sans'", "500 30px 'DM Sans'", "30px 'Share Tech Mono'"];
    await Promise.all(fonts.map(function (f) { return document.fonts.load(f, "Get out £1,000"); }));
    var need = [];
    CARDS.forEach(function (cd) { need.push([cd.ic, cd.col]); });
    HL.forEach(function (h) { need.push([h[1], h[1] === "house-builder" ? C.gold : C.teal]); });
    await Promise.all(need.map(function (n) { return loadIcon(n[0], n[1]); }));
    return { slides: SL.length, fonts: fonts.map(function (f) { return document.fonts.check(f); }), icons: Object.keys(IC).length };
  }

  function b64(buf) {
    var u = new Uint8Array(buf), s = "", CH = 0x8000;
    for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
    return btoa(s);
  }

  async function encode(i) {
    HS = {};
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d");
    var target = new Mp4Muxer.ArrayBufferTarget();
    var mux = new Mp4Muxer.Muxer({ target: target, video: { codec: "avc", width: W, height: H, frameRate: FPS }, fastStart: "in-memory" });
    var err = null;
    var enc = new VideoEncoder({ output: function (ch, meta) { mux.addVideoChunk(ch, meta); }, error: function (e) { err = e; } });
    enc.configure({ codec: "avc1.640028", width: W, height: H, bitrate: 12e6, framerate: FPS, avc: { format: "avc" } });
    var N = FPS * DUR, cover = null, cf = Math.round(SL[i].cover * FPS);
    for (var f = 0; f < N; f++) {
      SL[i].draw(c, f / FPS);
      var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(vf, { keyFrame: f % FPS === 0 }); vf.close();
      if (f === cf) cover = cv.toDataURL("image/png");
      while (enc.encodeQueueSize > 6) await new Promise(function (r) { setTimeout(r, 5); });
      if (err) throw err;
    }
    await enc.flush(); mux.finalize(); if (err) throw err;
    return { mp4: b64(target.buffer), png: cover };
  }

  function still(kind, i) {
    var cv = document.createElement("canvas"), c = cv.getContext("2d");
    if (kind === "avatar") avatar(c); else if (kind === "highlight") highlight(c, i);
    else { HS = {}; cv.width = W; cv.height = H; for (var f = 0; f <= Math.round(SL[i].cover * FPS); f += 3) SL[i].draw(c, f / FPS); }
    return cv.toDataURL("image/png");
  }

  window.__IG = { prepare: prepare, encode: encode, still: still, count: function () { return SL.length; }, highlights: HL.map(function (h) { return h[0]; }) };
})();
