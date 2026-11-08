  // ================= PIXEL BEACON — "رسالة إلى الفضاء" (Arabic, kids, ~12 s) =================
  // Reads right-to-left: things flow from the right side of the frame to the left.
  const TL = {
    title: 0.12, titleShrink: [1.25, 1.75],
    gridIn: [1.5, 1.9], paint: [1.9, 3.2], lab1: 1.95,
    bits: [3.35, 4.25], lab2: 3.35, tiles: [3.75, 4.35],
    move: [4.75, 5.35], dishIn: [4.95, 5.4], arrow: [5.25, 5.7], flow: [5.6, 7.35], lab3: 5.0, arecibo: 6.15,
    sweep: [7.3, 8.15],
    alienIn: [7.85, 8.35], lab4: 8.15, stack: [8.25, 9.45], hit: 9.45,
    take: [10.15, 10.75], qr: 10.55, link: [10.75, 11.15], line: 11.0, D: 12.4,
  };
  // stretch the whole timeline to 18 s (same beats, slower pace)
  { const TS = 18 / 12.4; for (const k in TL) TL[k] = Array.isArray(TL[k]) ? TL[k].map((v) => v * TS) : TL[k] * TS; TL.D = 18; }
  const GW = 11, GH = 13;
  const ART = [
    '...........',
    '....rrr....',
    '....rrr....',
    '.r...r...r.',
    '..r.rrr.r..',
    '...rrrrr...',
    '.....r.....',
    '....r.r....',
    '...r...r...',
    '...........',
    'yyy.b.b.b..',
    '...........',
    'ppppppppppp',
  ];
  const CELLC = { r: ['#ff9aa8', C.red, '#9c1638'], y: ['#fff2a6', C.yellow, '#c98a14'], b: ['#9ff3ff', '#3a9be0', '#1d2f86'], p: ['#d8b8ff', C.violet, '#4a2a9c'] };
  const BITS = []; const LIT = [];
  ART.forEach((row, y) => [...row].forEach((ch, xx) => { BITS.push(ch === '.' ? 0 : 1); if (ch !== '.') LIT.push({ x: xx, y, c: ch }); }));
  // paint order: row by row, right to left (the way an Arabic reader scans)
  LIT.sort((a, b) => a.y - b.y || b.x - a.x);
  const NB = BITS.length; // 143 = 11 × 13
  const paintAt = (i) => TL.paint[0] + (i / LIT.length) * (TL.paint[1] - TL.paint[0]);
  const flowBit = (i) => TL.flow[0] + (i / NB) * (TL.flow[1] - TL.flow[0]);
  const stackRow = (r) => TL.stack[0] + (r / GH) * (TL.stack[1] - TL.stack[0]);

  // ---------- pieces ----------
  function tile(x, X, Y, s, pal, a = 1) {
    if (s <= 0.5) return;
    x.save(); x.globalAlpha *= a;
    const g = x.createLinearGradient(X, Y, X + s, Y + s);
    g.addColorStop(0, pal[0]); g.addColorStop(0.45, pal[1]); g.addColorStop(1, H.rgba(H.mix(pal[1], pal[2], 0.6)));
    x.fillStyle = g; rr(x, X, Y, s, s, s * 0.22); x.fill();
    x.fillStyle = H.rgba(pal[2], 0.45); rr(x, X, Y + s * 0.72, s, s * 0.28, s * 0.14); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.45)'; rr(x, X + s * 0.16, Y + s * 0.12, s * 0.42, s * 0.12, s * 0.06); x.fill();
    x.restore();
  }
  // the drawing panel; o.paintT = time for painting, o.digits = 0..1 bit reveal sweep, o.mono = 0..1 white-on-black
  function gridPanel(x, cx, cy, cs, t, o = {}) {
    const w = GW * cs, h = GH * cs, pad = cs * 0.45, X = cx - w / 2, Y = cy - h / 2;
    x.save();
    glow(x, cx, cy, Math.max(w, h) * 0.95, '#5a7bff', 0.28);
    x.fillStyle = 'rgba(6,6,30,0.5)'; rr(x, X - pad + 6, Y - pad + 12, w + pad * 2, h + pad * 2, cs * 0.6); x.fill();
    const bg = x.createLinearGradient(X, Y - pad, X, Y + h + pad); bg.addColorStop(0, '#202a78'); bg.addColorStop(1, '#0f1450');
    x.fillStyle = bg; rr(x, X - pad, Y - pad, w + pad * 2, h + pad * 2, cs * 0.6); x.fill();
    x.fillStyle = 'rgba(160,240,255,0.18)'; rr(x, X - pad + cs * 0.5, Y - pad + cs * 0.18, w * 0.5, cs * 0.14, cs * 0.07); x.fill();
    // empty cells
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { x.fillStyle = 'rgba(80,96,200,0.28)'; rr(x, X + gx * cs + cs * 0.08, Y + gy * cs + cs * 0.08, cs * 0.84, cs * 0.84, cs * 0.2); x.fill(); }
    // painted cells
    LIT.forEach((c, i) => {
      const s = o.paintT == null ? 1 : back(seg(o.paintT, paintAt(i), paintAt(i) + 0.22), 2.2);
      if (s <= 0) return;
      const pal = o.mono > 0 ? CELLC[c.c].map((col) => H.rgba(H.mix(col, '#ffffff', o.mono))) : CELLC[c.c];
      const cx2 = X + c.x * cs + cs / 2, cy2 = Y + c.y * cs + cs / 2, ss = cs * 0.9 * s;
      tile(x, cx2 - ss / 2, cy2 - ss / 2, ss, pal);
    });
    // digits sweep
    if (o.digits > 0) {
      for (let gy = 0; gy < GH; gy++) {
        const u = back(cl(o.digits * (GH + 3) - gy), 1.8);
        if (u <= 0) continue;
        for (let gx = 0; gx < GW; gx++) {
          const b = BITS[gy * GW + gx], cx2 = X + gx * cs + cs / 2, cy2 = Y + gy * cs + cs / 2;
          x.save(); x.translate(cx2, cy2); x.scale(u, u);
          x.font = FNUM(900, cs * 0.62); x.textAlign = 'center'; x.textBaseline = 'middle';
          x.fillStyle = b ? 'rgba(20,24,70,0.9)' : 'rgba(170,190,255,0.55)';
          x.fillText(b ? '1' : '0', 0, cs * 0.04); x.restore();
        }
      }
    }
    x.restore();
  }
  // big example tile with a digit and a word under it
  function bitTile(x, cx, cy, s, on, word, k) {
    if (k <= 0.01) return;
    x.save(); x.translate(cx, cy); x.scale(k, k);
    if (on) { glow(x, 0, 0, s * 1.3, C.yellow, 0.4); tile(x, -s / 2, -s / 2, s, CELLC.y); }
    else { x.fillStyle = 'rgba(6,6,30,0.45)'; rr(x, -s / 2 + 4, -s / 2 + 9, s, s, s * 0.22); x.fill(); x.fillStyle = '#141a5c'; rr(x, -s / 2, -s / 2, s, s, s * 0.22); x.fill(); x.strokeStyle = 'rgba(140,160,255,0.5)'; x.lineWidth = 4; rr(x, -s / 2 + 2, -s / 2 + 2, s - 4, s - 4, s * 0.2); x.stroke(); }
    text(x, on ? '1' : '0', 0, 2, s * 0.66, on ? C.ink : '#9fb0ff', { num: true, shadow: on ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)' });
    text(x, word, 0, s * 0.5 + 40, 34, '#ffffff', { w: 800 });
    x.restore();
  }
  // radio telescope dish, pointing up-left
  function dish(x, cx, cy, s, t, beam) {
    if (s <= 0.01) return;
    x.save(); x.translate(cx, cy); x.scale(s, s);
    // stand
    x.fillStyle = '#2b3590'; x.beginPath(); x.moveTo(-70, 120); x.lineTo(70, 120); x.lineTo(26, 10); x.lineTo(-26, 10); x.closePath(); x.fill();
    x.fillStyle = 'rgba(160,200,255,0.25)'; x.beginPath(); x.moveTo(-60, 116); x.lineTo(-30, 116); x.lineTo(-12, 14); x.lineTo(-22, 14); x.closePath(); x.fill();
    x.fillStyle = '#1c246a'; rr(x, -95, 112, 190, 24, 12); x.fill();
    ball(x, 0, 6, 26, C.teal, { sha: 0.45 });
    x.rotate(-0.62);
    // bowl
    const g = x.createLinearGradient(-130, -60, 130, 40); g.addColorStop(0, '#f3f0ff'); g.addColorStop(0.5, '#b9b2ec'); g.addColorStop(1, '#6a5fc0');
    x.fillStyle = g; x.beginPath(); x.ellipse(0, -18, 138, 64, 0, 0, Math.PI); x.closePath(); x.fill();
    x.fillStyle = 'rgba(74,63,140,0.55)'; x.beginPath(); x.ellipse(0, -18, 138, 64, 0, 0.55 * Math.PI, Math.PI); x.ellipse(0, -18, 110, 44, 0, Math.PI, 0.55 * Math.PI, true); x.closePath(); x.fill();
    x.fillStyle = '#dcd8ff'; x.beginPath(); x.ellipse(0, -18, 138, 16, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#8f86d8'; x.beginPath(); x.ellipse(0, -16, 124, 11, 0, 0, Math.PI * 2); x.fill();
    // feed arms + receiver
    x.strokeStyle = '#3a4aa8'; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.moveTo(-104, -20); x.lineTo(0, -128); x.moveTo(104, -20); x.lineTo(0, -128); x.stroke();
    glow(x, 0, -132, 60 + 30 * beam, C.cyan, 0.4 + 0.5 * beam);
    ball(x, 0, -132, 16, C.orange, { sha: 0.45 });
    x.restore();
  }
  // signal arcs leaving the dish toward the top-left
  function beams(x, cx, cy, t, a) {
    if (a <= 0.01) return;
    const ang = -Math.PI / 2 - 0.62;
    x.save(); x.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const u = ((t * 1.25 + i / 4) % 1), r = 60 + u * 520;
      x.globalAlpha = a * (1 - u) * 0.9; x.strokeStyle = i % 2 ? C.cyan : '#b9a8ff'; x.lineWidth = 14 * (1 - u * 0.5);
      x.setLineDash([0.01, 26]); x.beginPath(); x.arc(cx, cy, r, ang - 0.36, ang + 0.36); x.stroke();
    }
    x.restore();
  }
  // the alien: chibi astronaut (after the user's 3D model) — big round head, ball-tipped antennae,
  // pointy ears, round eyes, button nose, wide open mouth, spacesuit with collar, belt and chunky boots.
  // (fx, fy) = point between the feet; R = head radius.
  const SKIN = ['#c4ffd9', '#38e08e', '#137a52'];
  const SUIT = ['#ffffff', '#d4ccff', '#6a5fc0'];
  function alien(x, fx, fy, R, o = {}) {
    if (R < 1) return;
    const t = o.t || 0, happy = o.happy || 0, wow = o.wow ? 1 : 0;
    const cx = fx, cy = fy - R * 2.6; // head centre
    // ground shadow
    x.save(); x.fillStyle = 'rgba(10,20,60,0.35)'; x.beginPath(); x.ellipse(fx, fy + R * 0.04, R * 0.85, R * 0.14, 0, 0, TAU); x.fill(); x.restore();
    // antennae (behind the head)
    const sw = Math.sin(t * 3) * 0.1;
    x.save(); x.strokeStyle = '#1f9c62'; x.lineWidth = R * 0.11; x.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const bx = cx + sd * R * 0.36, by = cy - R * 0.8, tx = cx + sd * R * (0.62 + sw), ty = cy - R * 1.55;
      x.beginPath(); x.moveTo(bx, by); x.lineTo(tx, ty); x.stroke();
      glow(x, tx, ty, R * 0.42, C.yellow, 0.25 + 0.2 * Math.sin(t * 5 + sd) + 0.3 * happy);
      ball(x, tx, ty, R * 0.2, SKIN, { sha: 0.45 });
    }
    x.restore();
    // ears (behind the head, pointing out and up)
    for (const sd of [-1, 1]) {
      const wig = Math.sin(t * 2.2 + sd) * R * 0.03;
      const g = x.createLinearGradient(cx + sd * R * 0.8, cy - R * 0.4, cx + sd * R * 1.6, cy + R * 0.2);
      g.addColorStop(0, SKIN[1]); g.addColorStop(1, H.rgba(H.mix(SKIN[1], SKIN[2], 0.5)));
      x.fillStyle = g; x.beginPath(); x.moveTo(cx + sd * R * 0.78, cy - R * 0.32);
      x.quadraticCurveTo(cx + sd * R * 1.3, cy - R * 0.52, cx + sd * R * 1.62, cy - R * 0.72 + wig);
      x.quadraticCurveTo(cx + sd * R * 1.38, cy + R * 0.05, cx + sd * R * 0.86, cy + R * 0.32); x.closePath(); x.fill();
      x.fillStyle = 'rgba(19,122,82,0.55)'; x.beginPath(); x.moveTo(cx + sd * R * 0.9, cy - R * 0.16);
      x.quadraticCurveTo(cx + sd * R * 1.25, cy - R * 0.36, cx + sd * R * 1.42, cy - R * 0.56 + wig);
      x.quadraticCurveTo(cx + sd * R * 1.22, cy + R * 0.0, cx + sd * R * 0.92, cy + R * 0.16); x.closePath(); x.fill();
    }
    // boots + legs
    for (const sd of [-1, 1]) {
      const lx = cx + sd * R * 0.27;
      x.fillStyle = H.rgba(H.mix(SUIT[1], SUIT[2], 0.25)); rr(x, lx - R * 0.17, cy + R * 1.68, R * 0.34, R * 0.62, R * 0.12); x.fill();
      x.fillStyle = 'rgba(106,95,192,0.45)'; rr(x, lx - R * 0.17 + (sd > 0 ? R * 0.2 : 0), cy + R * 1.68, R * 0.14, R * 0.62, R * 0.07); x.fill();
      // chunky boot
      const bg = x.createLinearGradient(0, fy - R * 0.42, 0, fy); bg.addColorStop(0, '#3c49b0'); bg.addColorStop(1, '#1c246a');
      x.fillStyle = bg; rr(x, lx - R * 0.29 + sd * R * 0.03, fy - R * 0.44, R * 0.58, R * 0.42, R * 0.18); x.fill();
      x.fillStyle = '#121a52'; rr(x, lx - R * 0.31 + sd * R * 0.03, fy - R * 0.1, R * 0.62, R * 0.12, R * 0.06); x.fill();
      x.fillStyle = 'rgba(170,200,255,0.4)'; rr(x, lx - R * 0.2, fy - R * 0.38, R * 0.22, R * 0.06, R * 0.03); x.fill();
      ball(x, lx + sd * R * 0.1, fy - R * 0.24, R * 0.06, ['#fff6c0', C.yellow, '#c98a14'], { sha: 0.3 });
    }
    // arms (behind the torso edge), wave up when happy
    for (const sd of [-1, 1]) {
      const up = (o.armUp || 0) * (sd > 0 ? 1 : 0.85), ang = sd * (0.32 + 0.08 * Math.sin(t * 2.4 + sd) + up * 2.25);
      const sx = cx + sd * R * 0.56, sy = cy + R * 1.12, ex = sx + Math.sin(ang) * R * 0.62, ey = sy + Math.cos(ang) * R * 0.62;
      x.strokeStyle = H.rgba(H.mix(SUIT[1], SUIT[2], 0.3)); x.lineWidth = R * 0.26; x.lineCap = 'round';
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
      ball(x, ex, ey, R * 0.17, ['#7d8cff', '#3c49b0', '#1c246a'], { sha: 0.4 }); // glove
    }
    // torso
    const tw = R * 1.08, ty0 = cy + R * 0.9, th = R * 0.95;
    const tg = x.createLinearGradient(cx - tw / 2, ty0, cx + tw / 2, ty0 + th);
    tg.addColorStop(0, SUIT[0]); tg.addColorStop(0.5, SUIT[1]); tg.addColorStop(1, H.rgba(H.mix(SUIT[1], SUIT[2], 0.55)));
    x.fillStyle = tg; rr(x, cx - tw / 2, ty0, tw, th, R * 0.3); x.fill();
    x.fillStyle = 'rgba(106,95,192,0.4)'; rr(x, cx + tw * 0.18, ty0 + R * 0.12, tw * 0.3, th - R * 0.2, R * 0.14); x.fill();
    // shoulder pads
    for (const sd of [-1, 1]) ball(x, cx + sd * R * 0.52, cy + R * 1.08, R * 0.2, SUIT, { sha: 0.4 });
    // chest panel with lights
    x.fillStyle = '#2b3590'; rr(x, cx - R * 0.26, ty0 + R * 0.24, R * 0.52, R * 0.3, R * 0.08); x.fill();
    ['#ffd23f', '#ff5d8f', '#56e8ff'].forEach((c, i) => { const bx = cx + (i - 1) * R * 0.15, by = ty0 + R * 0.39; glow(x, bx, by, R * 0.1, c, 0.5 + 0.3 * Math.sin(t * 4 + i)); x.fillStyle = c; x.beginPath(); x.arc(bx, by, R * 0.045, 0, TAU); x.fill(); });
    // belt + buckle
    x.fillStyle = '#1c246a'; rr(x, cx - tw / 2 + R * 0.02, ty0 + th - R * 0.28, tw - R * 0.04, R * 0.16, R * 0.06); x.fill();
    x.fillStyle = C.yellow; rr(x, cx - R * 0.12, ty0 + th - R * 0.31, R * 0.24, R * 0.22, R * 0.06); x.fill();
    x.fillStyle = '#c98a14'; rr(x, cx - R * 0.06, ty0 + th - R * 0.25, R * 0.12, R * 0.1, R * 0.03); x.fill();
    // collar ring
    x.fillStyle = H.rgba(H.mix(SUIT[1], SUIT[2], 0.35)); rr(x, cx - R * 0.42, cy + R * 0.8, R * 0.84, R * 0.2, R * 0.1); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.6)'; rr(x, cx - R * 0.32, cy + R * 0.82, R * 0.4, R * 0.05, R * 0.025); x.fill();
    // head
    glow(x, cx, cy, R * 1.9, C.green, 0.18 + 0.3 * happy);
    ball(x, cx, cy, R, SKIN, { sha: 0.45 });
    // eye sockets + big round eyes (always round, like the model)
    const look = o.look || [0, 0], bl = 1 - 0.92 * (o.blink || 0);
    for (const sd of [-1, 1]) {
      const ex = cx + sd * R * 0.34, ey = cy - R * 0.14, er = R * 0.27;
      x.fillStyle = 'rgba(19,122,82,0.45)'; x.beginPath(); x.arc(ex, ey + R * 0.03, er * 1.18, 0, TAU); x.fill();
      x.save(); x.translate(ex, ey); x.scale(1, bl);
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(0, 0, er, 0, TAU); x.fill();
      const pr = er * (happy ? 0.5 : 0.4), px = look[0] * er * 0.4, py = look[1] * er * 0.4;
      x.fillStyle = '#141638'; x.beginPath(); x.arc(px, py, pr, 0, TAU); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.36, 0, TAU); x.fill();
      x.restore();
      // brow ridge
      x.save(); x.strokeStyle = 'rgba(19,122,82,0.7)'; x.lineWidth = R * 0.06; x.lineCap = 'round';
      x.beginPath(); x.arc(ex, ey + R * 0.02, er * 1.32, -Math.PI * 0.78 - (wow + happy) * 0.08, -Math.PI * 0.22 + (wow + happy) * 0.08); x.stroke(); x.restore();
    }
    // button nose
    ball(x, cx, cy + R * 0.17, R * 0.13, SKIN, { sha: 0.4, rima: 0.5 });
    // cheeks
    x.fillStyle = 'rgba(255,120,160,0.4)'; for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(cx + sd * R * 0.62, cy + R * 0.3, R * 0.11, R * 0.065, 0, 0, TAU); x.fill(); }
    // wide open mouth: rounded box, top teeth, tongue
    const mw = R * (0.82 + 0.14 * happy - 0.1 * wow), mh = R * (0.34 + 0.12 * happy + 0.06 * wow), my = cy + R * 0.38;
    x.save();
    x.fillStyle = 'rgba(19,122,82,0.6)'; rr(x, cx - mw / 2 - R * 0.05, my - R * 0.04, mw + R * 0.1, mh + R * 0.1, R * 0.16); x.fill();
    x.beginPath(); rr(x, cx - mw / 2, my, mw, mh, Math.min(mh * 0.45, R * 0.14)); x.fillStyle = '#3a0f2a'; x.fill(); x.clip();
    x.fillStyle = '#ffffff'; rr(x, cx - mw / 2, my - R * 0.02, mw, R * 0.09, R * 0.03); x.fill();
    x.fillStyle = '#ff6f8e'; x.beginPath(); x.ellipse(cx, my + mh + R * 0.02, mw * 0.32, mh * 0.48, 0, 0, TAU); x.fill();
    x.restore();
  }
  // the alien's screen where rows of bits stack up
  function stackScreen(x, cx, cy, cs, t, o = {}) {
    const w = GW * cs, h = GH * cs, pad = cs * 0.5, X = cx - w / 2, Y = cy - h / 2;
    glow(x, cx, cy, Math.max(w, h) * 0.9, o.hitK > 0 ? '#ffe28a' : '#56e8ff', 0.25 + 0.4 * (o.hitK || 0));
    x.fillStyle = 'rgba(6,6,30,0.5)'; rr(x, X - pad + 6, Y - pad + 12, w + pad * 2, h + pad * 2, cs * 0.7); x.fill();
    x.fillStyle = o.frame || '#2a3a9c'; rr(x, X - pad, Y - pad, w + pad * 2, h + pad * 2, cs * 0.7); x.fill();
    x.fillStyle = '#070a2c'; rr(x, X - cs * 0.2, Y - cs * 0.2, w + cs * 0.4, h + cs * 0.4, cs * 0.4); x.fill();
    const rows = o.rows == null ? GH : o.rows, col = o.color || 0;
    for (let gy = 0; gy < GH; gy++) {
      const ru = cl(rows - gy); if (ru <= 0) continue;
      const drop = (1 - eo(ru)) * -cs * 1.6;
      for (let gx = 0; gx < GW; gx++) {
        const b = BITS[gy * GW + gx], X2 = X + gx * cs + cs * 0.07, Y2 = Y + gy * cs + cs * 0.07 + drop;
        x.globalAlpha = ru;
        if (b) {
          const ch = ART[gy][gx];
          const pal = col > 0 ? CELLC[ch].map((c) => H.rgba(H.mix('#ffffff', c, col))) : ['#ffffff', '#eef2ff', '#b7c0ff'];
          tile(x, X2, Y2, cs * 0.86, pal);
        } else { x.fillStyle = 'rgba(70,86,190,0.3)'; rr(x, X2, Y2, cs * 0.86, cs * 0.86, cs * 0.18); x.fill(); }
      }
      x.globalAlpha = 1;
    }
    if (o.hitK > 0) { x.save(); x.globalAlpha = 0.5 * o.hitK; x.fillStyle = '#ffffff'; rr(x, X - cs * 0.2, Y - cs * 0.2, w + cs * 0.4, h + cs * 0.4, cs * 0.4); x.fill(); x.restore(); }
  }
  // QR card (illustrative pattern, seeded)
  function qrCard(x, cx, cy, s, k) {
    if (k <= 0.01) return;
    x.save(); x.translate(cx, cy); x.scale(k * s, k * s);
    x.fillStyle = 'rgba(6,6,30,0.45)'; rr(x, -110 + 6, -110 + 12, 220, 220, 28); x.fill();
    x.fillStyle = '#ffffff'; rr(x, -110, -110, 220, 220, 28); x.fill();
    const n = 15, m = 170 / n, o0 = -85, r = H.rng(1974);
    x.fillStyle = C.ink;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const inF = (a, b) => a < 5 && b < 5;
      if (inF(i, j) || inF(n - 1 - i, j) || inF(i, n - 1 - j)) continue;
      if (r() < 0.48) { rr(x, o0 + i * m + 1, o0 + j * m + 1, m - 2, m - 2, m * 0.3); x.fill(); }
    }
    for (const [fx, fy] of [[0, 0], [n - 5, 0], [0, n - 5]]) {
      const X = o0 + fx * m, Y = o0 + fy * m, S = m * 5;
      x.fillStyle = C.ink; rr(x, X, Y, S, S, m * 1.2); x.fill();
      x.fillStyle = '#ffffff'; rr(x, X + m, Y + m, S - 2 * m, S - 2 * m, m * 0.8); x.fill();
      x.fillStyle = C.violet; rr(x, X + m * 1.7, Y + m * 1.7, S - 3.4 * m, S - 3.4 * m, m * 0.6); x.fill();
    }
    x.restore();
  }
  // phone showing the drawing and its sound
  function phone(x, cx, cy, s, t, k, scr) {
    if (k <= 0.01) return;
    const w = 250, h = 470;
    x.save(); x.translate(cx, cy); x.rotate(-0.06 * (1 - k)); x.scale(k * s, k * s);
    glow(x, 0, 0, 380, '#8b5cff', 0.35);
    x.fillStyle = 'rgba(6,6,30,0.5)'; rr(x, -w / 2 + 8, -h / 2 + 14, w, h, 44); x.fill();
    const g = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, '#ff9ac0'); g.addColorStop(0.5, C.pink); g.addColorStop(1, '#a8285e');
    x.fillStyle = g; rr(x, -w / 2, -h / 2, w, h, 44); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.35)'; rr(x, -w / 2 + 26, -h / 2 + 10, w * 0.5, 8, 4); x.fill();
    x.fillStyle = '#0b0e2c'; rr(x, -w / 2 + 14, -h / 2 + 18, w - 28, h - 36, 32); x.fill();
    x.fillStyle = '#1b1f4a'; rr(x, -32, -h / 2 + 26, 64, 14, 7); x.fill();
    if (scr) scr(x, w - 28, h - 36);
    x.restore();
  }
  function phoneScreen(t) {
    return (x, w, h) => {
      // the drawing (in colour again)
      const cs = 15, X = -GW * cs / 2, Y = -h / 2 + 70;
      LIT.forEach((c) => tile(x, X + c.x * cs + 1, Y + c.y * cs + 1, cs - 2, CELLC[c.c]));
      // sound row: play button + bars
      const yy = h / 2 - 70;
      ball(x, 70, yy, 26, ['#fff2a6', C.yellow, '#c98a14'], { sha: 0.4 });
      x.fillStyle = C.ink; x.beginPath(); x.moveTo(62, yy - 12); x.lineTo(62, yy + 12); x.lineTo(82, yy); x.closePath(); x.fill();
      for (let i = 0; i < 9; i++) {
        const v = 0.35 + 0.65 * Math.abs(Math.sin(t * 6 + i * 1.7)) * (BITS[(i * 13) % NB] ? 1 : 0.5);
        x.fillStyle = i % 2 ? C.cyan : '#b9a8ff'; rr(x, 22 - i * 14, yy - 26 * v, 9, 52 * v, 4.5); x.fill();
      }
    };
  }
  function header(x, a) { pill(x, 1088, 44, 'رسالة إلى الفضاء', 30, { a, bg: 'rgba(255,255,255,0.95)' }); }

  // ================= SCENE A: draw → bits → send =================
  const GRID0 = [800, 400], CS0 = 36;
  const GRID1 = [1010, 300], CS1 = 19;
  const DISH = [470, 520];
  function exA(x, W, H_, t) {
    const pull = 1 + 1.6 * (1 - eo(seg(t, 0, 1.3)));
    const mv = eio(seg(t, TL.move[0], TL.move[1]));
    sky(x, W, H_, t, { z: pull, x: -t * 14 - mv * 40, y: 0 });
    planet(x, 1180 + t * 5, 640, 120, PL.magenta, { glowA: 0.28 });
    planet(x, 150 + t * 3, 150 - mv * 20, 46 * back(seg(t, 0.2, 0.8)), PL.coral, { glowA: 0.3 });
    planet(x, 1170, 120, 22, PL.moon);

    // the drawing
    const gin = back(seg(t, TL.gridIn[0], TL.gridIn[1]), 1.3);
    const gcx = lerp(GRID0[0], GRID1[0], mv), gcy = lerp(GRID0[1], GRID1[1], mv), cs = lerp(CS0, CS1, mv) * gin;
    const sent = t > TL.flow[0] ? cl((t - TL.flow[0]) / (TL.flow[1] - TL.flow[0])) : 0;
    if (gin > 0.01) gridPanel(x, gcx, gcy, cs, t, { paintT: t, digits: seg(t, TL.bits[0], TL.bits[1]), mono: 0 });
    // bits leaving: a soft white shutter row over sent rows
    if (sent > 0) {
      const w = GW * cs, h = GH * cs, rows = sent * GH;
      x.save(); x.globalAlpha = 0.55; x.fillStyle = '#0b1046';
      rr(x, gcx - w / 2, gcy - h / 2, w, Math.min(h, rows * cs), cs * 0.2); x.fill(); x.restore();
    }

    // label 1 → label 2 (same pill, text swaps)
    const l1 = back(seg(t, TL.lab1, TL.lab1 + 0.35)) * (1 - seg(t, TL.lab2 - 0.12, TL.lab2));
    const l2 = back(seg(t, TL.lab2, TL.lab2 + 0.35)) * (1 - seg(t, TL.move[0], TL.move[0] + 0.25));
    pill(x, 350, 200, 'ارسم بالمربّعات', 50, { s: l1, bg: C.yellow });
    pill(x, 350, 200, 'كل مربّع = رقم', 50, { s: l2, bg: C.cyan });
    // the two example tiles
    const tOut = 1 - seg(t, TL.move[0], TL.move[0] + 0.25);
    bitTile(x, 470, 400, 128, true, 'مضيء', back(seg(t, TL.tiles[0], TL.tiles[0] + 0.35), 1.8) * tOut);
    bitTile(x, 230, 400, 128, false, 'مطفأ', back(seg(t, TL.tiles[0] + 0.18, TL.tiles[0] + 0.53), 1.8) * tOut);

    // send: dish, dotted arrow, flowing bits, beams
    const din = back(seg(t, TL.dishIn[0], TL.dishIn[1]), 1.3);
    const beamA = seg(t, TL.flow[0] + 0.1, TL.flow[0] + 0.4) * (1 - seg(t, TL.flow[1] + 0.1, TL.flow[1] + 0.5));
    beams(x, DISH[0] - 30, DISH[1] - 140, t, beamA);
    const AP = [[gcx - 120, gcy + 150], [gcx - 200, 560], [700, 600], [DISH[0] + 70, DISH[1] - 60]];
    arrow(x, AP, eio(seg(t, TL.arrow[0], TL.arrow[1])), '#7ff0ff', 10, { dots: true, a: 0.8 * (1 - seg(t, TL.flow[1] + 0.2, TL.flow[1] + 0.5)) });
    if (t > TL.flow[0] - 0.1 && t < TL.flow[1] + 0.5) {
      for (let i = 0; i < NB; i++) {
        const u = (t - flowBit(i)) / 0.55; if (u <= 0 || u >= 1) continue;
        const p = bez(AP, eio(u)), on = BITS[i];
        if (on) { glow(x, p[0], p[1], 22, C.yellow, 0.6); }
        x.save(); x.translate(p[0], p[1]); const sc = 1 - 0.6 * H.smooth(0.75, 1, u);
        x.font = FNUM(900, 30 * sc); x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = on ? '#fff3b0' : 'rgba(160,190,255,0.75)'; x.fillText(on ? '1' : '0', 0, 0); x.restore();
      }
    }
    dish(x, DISH[0], DISH[1], 0.95 * din, t, beamA);
    const l3 = back(seg(t, TL.lab3, TL.lab3 + 0.35));
    pill(x, 640, 150, 'نحوّلها إلى صوت ونرسلها!', 50, { s: l3, bg: C.yellow });
    pill(x, 470, 676, 'مثل رسالة أريسيبو عام 1974', 30, { s: back(seg(t, TL.arecibo, TL.arecibo + 0.35)), bg: '#ffffff' });

    // title hook → header
    const tp = eio(seg(t, TL.titleShrink[0], TL.titleShrink[1]));
    if (tp < 1) {
      const words = ['رسالة', 'إلى', 'الفضاء!'], px = 96; x.font = F(800, px);
      const sp = x.measureText(' ').width, ws = words.map((w) => x.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + sp * 2;
      const cx = lerp(640, 1088, tp), cy = lerp(300, 44, tp), sc = lerp(1, 30 / px, tp);
      x.save(); x.translate(cx, cy); x.scale(sc, sc);
      let wx = tot / 2; // right to left
      words.forEach((w, i) => {
        const u = back(seg(t, TL.title + i * 0.16, TL.title + i * 0.16 + 0.42), 1.3);
        x.save(); x.translate(wx - ws[i] / 2, (1 - u) * 44); x.scale(u, u);
        text(x, w, 0, 0, px, i === 2 ? C.yellow : '#ffffff');
        x.restore(); wx -= ws[i] + sp;
      });
      x.restore();
    }
    if (tp > 0.75) header(x, seg(tp, 0.75, 1));
  }

  // ================= SCENE B: the alien rebuilds it → take it home =================
  const AL = [330, 470], SCR = [880, 380];
  function exB(x, W, H_, t) {
    const tk = eio(seg(t, TL.take[0], TL.take[1]));
    sky(x, W, H_, t, { x: -400 - t * 18, y: 60 + tk * 40, z: 1 + 0.15 * tk });
    // alien home planet: big horizon
    planet(x, 640 - tk * 120, 1220 + tk * 260, 720, PL.teal, { glowA: 0.35, atmo: 1 });
    planet(x, 1150, 140, 54, PL.magenta, { glowA: 0.3 });
    // incoming signal arcs from the top-right
    const inA = seg(t, TL.stack[0] - 0.3, TL.stack[0]) * (1 - seg(t, TL.hit - 0.1, TL.hit + 0.2));
    if (inA > 0) {
      x.save(); x.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const u = ((t * 1.4 + i / 3) % 1), r = 80 + u * 420; x.globalAlpha = inA * u * 0.8; x.strokeStyle = C.cyan; x.lineWidth = 12; x.setLineDash([0.01, 24]); x.beginPath(); x.arc(1280, -40, 900 - r, 2.0, 2.75); x.stroke(); }
      x.restore();
    }
    const hitK = t > TL.hit ? Math.max(0, 1 - (t - TL.hit) / 0.6) : 0;
    const rows = GH * eio(seg(t, TL.stack[0], TL.stack[1]));
    const colorK = eio(seg(t, TL.hit + 0.15, TL.hit + 0.6));
    // screen → phone
    const scx = lerp(SCR[0], 470, tk), scy = lerp(SCR[1], 400, tk), scs = lerp(30, 15, tk);
    const scrIn = back(seg(t, TL.alienIn[0] + 0.1, TL.alienIn[1] + 0.1), 1.3);
    if (tk < 0.55) { x.save(); x.globalAlpha = 1 - seg(tk, 0, 0.55); stackScreen(x, scx, scy, scs * scrIn, t, { rows, hitK, color: colorK }); x.restore(); }
    flare(x, SCR[0], SCR[1], hitK * (1 - tk), t);
    burst(x, SCR[0], SCR[1], (t - TL.hit) * 1.1, 77, 360);

    // alien
    const ain = back(seg(t, TL.alienIn[0], TL.alienIn[1]), 1.2);
    const aOut = tk;
    const happy = t > TL.hit + 0.05 ? 1 : 0;
    const ax = AL[0] - aOut * 520, fy = 578 - (happy ? Math.abs(Math.sin((t - TL.hit) * 7)) * 14 * Math.max(0, 1 - (t - TL.hit) / 1.6) : 0) + (1 - ain) * 420;
    x.save(); x.translate(ax, fy); x.scale(1, 1 + 0.03 * Math.sin(t * 2.4)); x.translate(-ax, -fy);
    alien(x, ax, fy, 86, { t, look: t < TL.hit ? [0.9, -0.3] : [0.6, -0.1], blink: blinkAt(t, 0.6), happy, wow: t > TL.stack[0] && !happy, armUp: happy ? 1 : 0 });
    x.restore();
    const l4 = back(seg(t, TL.lab4, TL.lab4 + 0.35)) * (1 - seg(t, TL.hit - 0.1, TL.hit + 0.05));
    pill(x, 640, 112, 'الفضائي يرتّبها صفوفًا…', 50, { s: l4, bg: C.cyan });
    const l5 = back(seg(t, TL.hit, TL.hit + 0.4), 2) * (1 - seg(t, TL.take[0], TL.take[0] + 0.3));
    pill(x, 640, 112, 'فتظهر الرسمة!', 60, { s: l5, bg: C.yellow });

    // takeaway: QR → phone
    if (t > TL.take[0]) {
      const qk = back(seg(t, TL.qr, TL.qr + 0.4), 1.6), pk = back(seg(t, TL.take[0] + 0.2, TL.take[1] + 0.15), 1.3);
      qrCard(x, 900, 420, 1.15, qk);
      text(x, 'امسح الرمز', 900, 600, 36, '#ffffff', { a: seg(t, TL.qr + 0.2, TL.qr + 0.5) });
      const LP2 = [[770, 360], [700, 300], [640, 300], [600, 340]];
      arrow(x, LP2, eio(seg(t, TL.link[0], TL.link[1])), C.yellow, 10, { dots: true });
      phone(x, 430, 410, 0.95, t, pk, phoneScreen(t));
      const ln = back(seg(t, TL.line, TL.line + 0.4), 1.6);
      x.save(); x.translate(640, 118); x.scale(ln, ln); text(x, 'وخذ رسمتك وصوتها معك!', 0, 0, 66, '#ffffff'); x.restore();
      if (t > TL.line + 0.3) for (let i = 0; i < 7; i++) { const q = H.rng(400 + i); spark(x, q.range(120, 1160), q.range(200, 680), q.range(8, 15) * (0.5 + 0.5 * Math.sin(t * 3 + i)), '#ffffff', seg(t, TL.line + 0.3, TL.line + 0.6)); }
    }
    header(x, 1);
  }

  function explainer(ctx, W, H_, t) {
    const x = ctx;
    x.direction = 'rtl';
    const sw = eio(seg(t, TL.sweep[0], TL.sweep[1])), spx = lerp(W + 980, -980, sw);
    if (t < TL.sweep[0] || spx > 640) exA(x, W, H_, t);
    else exB(x, W, H_, t);
    if (sw > 0 && sw < 1) planet(x, spx, 380 + (sw - 0.5) * 120, 880, PL.coral, { glowA: 0.4 });
    finish(x, W, H_, t);
  }

  // ================= SOUND =================
  function scoreSound(k) {
    const D = TL.D, hz = k.hz;
    const pan = (px) => cl((px / 1280) * 2 - 1, -1, 1) * 0.6;
    const when = (t0, t1, ease, u) => { for (let i = 0; i <= 400; i++) { const tt = t0 + ((t1 - t0) * i) / 400; if (ease(i / 400) >= u - 1e-6) return tt; } return t1; };
    const backPeak = (t0, t1, s) => when(t0, t1, (u) => back(u, s), 1);
    const pluck = (t, n, g = 1, p = 0, minor = false) => { const f = hz(n); k.tone(t, { f, dur: 0.9, gain: 0.2 * g, a: 0.003, pan: p, verb: 0.25, minor }); k.tone(t, { f: f * 4, dur: 0.09, gain: 0.04 * g, a: 0.001, pan: p, minor }); k.tone(t, { f: f * 2, type: 'triangle', dur: 0.32, gain: 0.045 * g, a: 0.003, pan: p, minor }); };
    const boop = (t, f0, g = 1, p = 0, minor = true) => { k.tone(t, { f: [[0, f0], [0.07, f0 * 1.45], [0.16, f0 * 1.3]], dur: 0.2, gain: 0.17 * g, a: 0.008, pan: p, verb: 0.15, minor }); k.tone(t, { f: [[0, f0 * 0.5], [0.08, f0 * 0.72]], type: 'triangle', dur: 0.14, gain: 0.06 * g, a: 0.006, pan: p, minor }); };
    const air = (t, dur, top, g = 1, p = 0, peak = 0.55, minor = false) => k.noise(t, { dur, color: 'pink', filter: 'bandpass', f: [[0, 260], [dur * peak, top], [dur, 340]], q: 0.55, gain: 0.26 * g, a: dur * peak, pan: p, verb: 0.3, minor });
    const chord = (t, notes, g = 1, dur = 2.2) => notes.forEach((n, i) => { k.tone(t + i * 0.012, { f: n, type: 'triangle', dur, gain: 0.07 * g, a: 0.02, verb: 0.35, filter: 'lowpass', f2: 1800, pan: (i / (notes.length - 1) - 0.5) * 0.6 }); k.tone(t + i * 0.012, { f: hz(n) * 1.003, dur, gain: 0.06 * g, a: 0.03, verb: 0.35 }); });
    const shimmer = (t, notes, g = 1, p = 0) => k.withMinor(() => notes.forEach((n, i) => k.tone(t + i * 0.055, { f: n, dur: 0.7, gain: 0.07 * g, a: 0.004, verb: 0.4, pan: p + (i % 2 ? 0.25 : -0.25) })));

    // bright, curious pad (C → Am → F → G)
    k.music('pad', 0, D, { bpm: 76, gain: 0.4, chords: [['C4', 'E4', 'G4', 'B4'], ['A3', 'C4', 'E4', 'G4'], ['F3', 'A3', 'C4', 'E4'], ['G3', 'B3', 'D4', 'G4']] });

    // 1 HOOK
    air(0, 1.3, 1500, 0.8, 0, 0.35);
    ['C4', 'E4', 'G4'].forEach((n, i) => pluck(backPeak(TL.title + i * 0.16, TL.title + i * 0.16 + 0.42, 1.3), n, 0.9, 0.3 - i * 0.3));
    k.noise(TL.titleShrink[0], { dur: 0.55, color: 'pink', filter: 'bandpass', f: [[0, 700], [0.55, 300]], q: 0.7, gain: 0.08, a: 0.2, pan: 0.4, minor: true });

    // 2 DRAW: panel pops, cells pop on (throttled ≤ 12/s, rising pitch)
    boop(backPeak(TL.gridIn[0], TL.gridIn[1], 1.3), 330, 1.0, pan(800), false);
    pluck(backPeak(TL.lab1, TL.lab1 + 0.35), 'G4', 0.8, pan(350));
    const scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
    let last = -1;
    LIT.forEach((c, i) => { const tt = paintAt(i) + 0.06; if (tt - last < 1 / 11) return; last = tt; k.play('pop', tt, { f: hz(scale[Math.min(5, Math.floor(c.y / 2.2))]), gain: 0.55, pan: pan(800 + (c.x - 5) * 36), minor: true }); });

    // 3 BITS: digit wave row by row, then the two example tiles
    pluck(backPeak(TL.lab2, TL.lab2 + 0.35), 'E4', 0.9, pan(350));
    for (let r = 0; r < GH; r++) { const tt = TL.bits[0] + (r / (GH + 3)) * (TL.bits[1] - TL.bits[0]); if (r % 2 === 0) k.play('blip', tt + 0.02, { f: r % 4 ? 'E6' : 'C6', gain: 0.6, pan: pan(800), minor: true }); }
    k.tone(backPeak(TL.tiles[0], TL.tiles[0] + 0.35, 1.8), { f: 1320, dur: 0.18, gain: 0.12, a: 0.004, hold: 0.1, pan: pan(470) }); // "1" = high tone
    k.tone(backPeak(TL.tiles[0] + 0.18, TL.tiles[0] + 0.53, 1.8), { f: 880, dur: 0.18, gain: 0.12, a: 0.004, hold: 0.1, pan: pan(230) }); // "0" = low tone

    // 4 SEND: things slide, dish lands, arrow draws, the real two-tone signal plays
    air(TL.move[0], 0.6, 1100, 0.5, 0, 0.6, true);
    k.play('thud', backPeak(TL.dishIn[0], TL.dishIn[1], 1.3), { f: 120, gain: 0.35, pan: pan(470) });
    pluck(backPeak(TL.lab3, TL.lab3 + 0.35), 'C5', 0.9, 0);
    for (let i = 1; i <= 4; i++) k.play('tock', when(TL.arrow[0], TL.arrow[1], eio, i / 4), { f: 820 - i * 60, gain: 0.32, pan: pan(900 - i * 100), minor: true });
    for (let i = 0; i < NB; i++) { const tt = flowBit(i) + 0.5; k.tone(tt, { f: BITS[i] ? 1320 : 880, dur: (TL.flow[1] - TL.flow[0]) / NB + 0.006, gain: 0.07, a: 0.002, pan: pan(470), verb: 0.1 }); }
    pluck(backPeak(TL.arecibo, TL.arecibo + 0.35), 'A4', 0.6, pan(470), true);

    // transition: a giant planet sweeps past
    air(TL.sweep[0], TL.sweep[1] - TL.sweep[0], 1300, 1.2, 0, 0.5);
    k.noise(TL.sweep[0] + 0.1, { dur: 0.75, color: 'brown', filter: 'lowpass', f: 260, gain: 0.3, a: 0.35, verb: 0.2 });

    // 5 ALIEN: arrives, rows stack, picture appears (the big hit)
    boop(backPeak(TL.alienIn[0], TL.alienIn[1], 1.2), 420, 1.1, pan(330), false);
    pluck(backPeak(TL.lab4, TL.lab4 + 0.35), 'D5', 0.8, 0);
    for (let r = 0; r < GH; r++) { const tt = when(TL.stack[0], TL.stack[1], eio, (r + 0.5) / GH); k.play('tock', tt, { f: 540 + r * 30, gain: 0.45, pan: pan(880), minor: true }); }
    k.noise(TL.hit - 0.7, { dur: 0.75, color: 'pink', filter: 'bandpass', f: [[0, 250], [0.7, 1800]], q: 0.8, gain: 0.2, a: 0.7, verb: 0.3 });
    k.play('impact', TL.hit, { gain: 0.7 });
    chord(TL.hit, ['C3', 'G3', 'C4', 'E4', 'G4', 'D5'], 1.5, 2.2);
    shimmer(TL.hit + 0.08, ['E5', 'G5', 'C6', 'E6'], 0.8, 0.2);
    boop(TL.hit + 0.12, 560, 0.9, pan(330), true);

    // 6 TAKEAWAY
    air(TL.take[0], TL.take[1] - TL.take[0], 1000, 0.6, 0, 0.5, true);
    boop(backPeak(TL.take[0] + 0.2, TL.take[1] + 0.15, 1.3), 480, 0.9, pan(430));
    pluck(backPeak(TL.qr, TL.qr + 0.4, 1.6), 'G4', 0.8, pan(900));
    k.play('stroke', TL.link[0], { material: 'marker', dur: TL.link[1] - TL.link[0], gain: 0.5, pan: pan(680) });
    chord(backPeak(TL.line, TL.line + 0.4, 1.6), ['C3', 'G3', 'C4', 'E4', 'G4', 'C5'], 1.1, 1.4);
    pluck(backPeak(TL.line, TL.line + 0.4, 1.6), 'C5', 1.0, 0);
  }

  window.DURATION = TL.D;
  window.scoreSound = scoreSound;
  window.explainer = explainer;
  window.TL = TL;
