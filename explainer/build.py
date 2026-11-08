"""Builds storyboard.html (and later the player) from the shared explainer code."""
import base64, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.environ.get('FONTSOURCE_DIR', os.path.join(HERE, 'node_modules', '@fontsource'))


def rd(p):
    return open(os.path.join(HERE, p), encoding='utf-8').read()


def b64(p):
    return base64.b64encode(open(p, 'rb').read()).decode()


AR_RANGE = 'U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC'
FONT_CSS = f"""
@font-face{{font-family:"Baloo Bhaijaan 2";font-weight:800;font-display:block;src:url(data:font/woff2;base64,{b64(FONTS + '/baloo-bhaijaan-2/files/baloo-bhaijaan-2-arabic-800-normal.woff2')}) format("woff2");unicode-range:{AR_RANGE}}}
@font-face{{font-family:"Baloo Bhaijaan 2";font-weight:800;font-display:block;src:url(data:font/woff2;base64,{b64(FONTS + '/baloo-bhaijaan-2/files/baloo-bhaijaan-2-latin-800-normal.woff2')}) format("woff2")}}
@font-face{{font-family:"Nunito";font-weight:900;font-display:block;src:url(data:font/woff2;base64,{b64(FONTS + '/nunito/files/nunito-latin-900-normal.woff2')}) format("woff2")}}
"""
FONT_SPECS = ['800 64px "Baloo Bhaijaan 2"', '900 64px "Nunito"']

STYLE_JS = '{\n' + rd('style-helpers.js') + '\n' + rd('explainer.js') + '\n}\n'
LIBS = '<script>\n' + rd('lib-harness.js') + '\n</script>\n<script>\n' + rd('lib-sound.js') + '\n</script>\n<script>\n' + STYLE_JS + '</script>\n'

BEATS = [
    dict(n=1, t0=0.0, t1=1.7, at=0.95, text='رسالة إلى الفضاء!',
         how='Opens on the starfield with the camera pulling back. The three words pop on from right to left, then shrink into the header pill at top right.',
         snd='Airy whoosh as the camera pulls back, a pluck on each word, a soft glide as the title moves to the corner.'),
    dict(n=2, t0=1.7, t1=3.3, at=3.05, text='ارسم بالمربّعات',
         how='Continuous. The drawing grid pops in, then the game’s example picture paints on square by square, row by row from right to left. The yellow label lands at the left.',
         snd='A boop as the grid lands, a pluck for the label, and a pop for each square (no more than 11 a second), rising in pitch.'),
    dict(n=3, t0=3.3, t1=4.7, at=4.55, text='كل مربّع = رقم  ·  مضيء = 1  ·  مطفأ = 0',
         how='Continuous. The label swaps text in place. A wave turns every square into a 1 or a 0, and two big example tiles pop in to show that lit means 1 and off means 0.',
         snd='Chip blips run down the rows. The “1” tile plays the high tone and the “0” tile the low tone, the same two tones the game uses.'),
    dict(n=4, t0=4.7, t1=7.3, at=6.55, text='نحوّلها إلى صوت ونرسلها!  ·  مثل رسالة أريسيبو عام 1974',
         how='Continuous. The grid shrinks to the top right and a radio dish lands. A dotted arrow draws from the grid to the dish, the 1s and 0s fly along it, and signal arcs leave the dish toward space.',
         snd='A thud as the dish lands and tocks as the arrow draws. Then the real signal plays: all 143 bits as high and low beeps, the same as the game.'),
    dict(n=5, t0=7.3, t1=8.2, at=7.78, text='(no text)',
         how='Scene change, done the style’s own way: a giant planet sweeps across the camera as the wipe, carrying us to the alien’s planet.',
         snd='A long airy whoosh with a low rumble as the planet passes.'),
    dict(n=6, t0=8.2, t1=9.45, at=9.05, text='الفضائي يرتّبها صفوفًا…',
         how='A big-eyed green alien bounces up on its teal planet. On its screen the bits drop in row by row (11 per row), white on black, because the alien only receives on and off.',
         snd='A boop as the alien arrives, a pluck for the label, a tock for each of the 13 rows, and a swell building into the reveal.'),
    dict(n=7, t0=9.45, t1=10.15, at=9.75, text='فتظهر الرسمة!',
         how='The key moment, with an emphasis move: the last row lands and the screen flashes and flares. The picture blooms back into colour, the alien cheers with its arms up, and sparks burst out.',
         snd='The biggest hit: a warm impact, a full major chord and a shimmer, plus a happy boop from the alien.'),
    dict(n=8, t0=10.15, t1=12.4, at=12.0, text='امسح الرمز  ·  وخذ رسمتك وصوتها معك!',
         how='Continuous. The alien’s screen glides left and becomes a phone showing the drawing, a play button and sound bars. A QR card pops in on the right, and a dotted arrow draws from the QR to the phone. The takeaway line holds for about 1 second.',
         snd='A soft whoosh, a boop as the phone appears, a pluck for the QR, a marker stroke for the arrow, and a resolving chord on the final line.'),
]


def storyboard():
    panels = ''.join(f'''
  <figure class="beat">
    <canvas width="1280" height="720" data-t="{b['at']}"></canvas>
    <figcaption>
      <div class="meta"><span class="num">{b['n']}</span><span class="time">{b['t0']:.1f}–{b['t1']:.1f} s</span></div>
      <p class="ar" dir="rtl">{b['text']}</p>
      <p><b>Flow:</b> {b['how']}</p>
      <p><b>Sound:</b> {b['snd']}</p>
    </figcaption>
  </figure>''' for b in BEATS)
    return f'''<title>Pixel Beacon Storyboard</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
{FONT_CSS}
:root{{--bg:#0d1033;--panel:#171b4a;--line:#2c3274;--ink:#eef0ff;--dim:#a9aed8;--amber:#ffd23f;color-scheme:dark}}
body{{background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding-block:24px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
.wrap{{max-width:1240px;margin:0 auto;display:flex;flex-direction:column;gap:20px}}
h1{{font:800 30px "Baloo Bhaijaan 2",system-ui,sans-serif;margin:0}}
.sub{{color:var(--dim);margin:0;max-width:70ch}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:16px}}
.beat{{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;min-width:0}}
canvas{{display:block;width:100%;height:auto;aspect-ratio:16/9;background:#090b2c}}
figcaption{{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px}}
figcaption p{{margin:0;color:var(--dim);font-size:14px}}
figcaption b{{color:var(--ink)}}
.meta{{display:flex;justify-content:space-between;align-items:center}}
.num{{font:800 13px system-ui;background:var(--amber);color:#1a1300;border-radius:999px;padding:2px 10px}}
.time{{font:600 13px ui-monospace,Menlo,monospace;color:var(--dim);font-variant-numeric:tabular-nums}}
.ar{{font:800 20px "Baloo Bhaijaan 2",system-ui,sans-serif!important;color:var(--ink)!important}}
.notes{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 18px}}
.notes h2{{margin:0 0 6px;font-size:17px}}
.notes ul{{margin:0;padding-left:20px;color:var(--dim)}}
</style>
<div class="wrap">
  <h1>Pixel Beacon: “رسالة إلى الفضاء” storyboard</h1>
  <p class="sub">12.4 seconds, Arabic, for kids. Everything reads right to left, so motion and arrows flow from right to left. These are still frames drawn with the real animation code.</p>
  <div class="grid">{panels}
  </div>
  <div class="notes">
    <h2>Facts and choices I assumed</h2>
    <ul>
      <li>The drawing is the game’s own 11 × 13 example (143 squares = 143 bits), the same one the booth loads with the Example button.</li>
      <li>The signal uses the game’s tones: high (1,320 Hz) for 1, low (880 Hz) for 0. In the video the 143 bits play in about 1.8 seconds.</li>
      <li>Arecibo: the real message was sent from the Arecibo telescope in Puerto Rico in 1974. It was 1,679 bits, which is 23 × 73.</li>
      <li>Digits are shown as 1 and 0, matching what the game shows on screen.</li>
      <li>Arabic text uses the rounded Baloo Bhaijaan 2 font, because Fredoka and Nunito have no Arabic letters. Nunito is still used for the digits.</li>
      <li>The QR pattern is decorative, not a real code.</li>
    </ul>
  </div>
</div>
{LIBS}
<script>
(async () => {{
  try {{ await Promise.all({json.dumps(FONT_SPECS)}.map((f) => document.fonts.load(f, 'رسالة 0123'))); await document.fonts.ready; }} catch (e) {{}}
  for (const c of document.querySelectorAll('canvas[data-t]')) {{
    const x = c.getContext('2d'); explainer(x, 1280, 720, parseFloat(c.dataset.t));
    await new Promise((r) => requestAnimationFrame(r));
  }}
  document.body.dataset.ready = '1';
}})();
</script>
'''


def player():
    return f"""<title>Pixel Beacon Explainer</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
{FONT_CSS}
:root{{--bg:#05061a;--bar:#121640;--line:#2c3274;--ink:#eef0ff;--dim:#a9aed8;--amber:#ffd23f;color-scheme:dark}}
html,body{{height:100%}}
body{{background:var(--bg);color:var(--ink);font:14px system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;overflow:hidden}}
.stage{{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding-left:max(0px,env(safe-area-inset-left,0px));padding-right:max(0px,env(safe-area-inset-right,0px))}}
canvas{{display:block;max-width:100%;max-height:100%;aspect-ratio:16/9;background:#090b2c}}
.bar{{flex:none;display:flex;align-items:center;gap:10px;background:var(--bar);border-top:1px solid var(--line);padding-block:8px;padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:max(12px,env(safe-area-inset-right,0px))}}
button{{font:700 14px system-ui;color:var(--ink);background:#1d2260;border:1px solid var(--line);border-radius:8px;padding:7px 12px;cursor:pointer;min-width:44px}}
button[aria-pressed=true]{{background:var(--amber);color:#1a1300;border-color:var(--amber)}}
button:focus-visible,input:focus-visible{{outline:2px solid var(--amber);outline-offset:2px}}
input[type=range]{{flex:1;min-width:0;accent-color:var(--amber)}}
.time{{font:600 13px ui-monospace,Menlo,monospace;color:var(--dim);font-variant-numeric:tabular-nums;white-space:nowrap}}
</style>
<div class="stage"><canvas id="cv" width="1280" height="720" aria-label="Pixel Beacon explainer animation"></canvas></div>
<div class="bar">
  <button id="bPlay" aria-label="Play">▶</button>
  <input type="range" id="scrub" min="0" max="1000" value="0" aria-label="Scrub">
  <span class="time" id="time">0.0 / 0.0</span>
  <button id="bSnd" aria-pressed="true">Sound</button>
  <button id="bLoop" aria-pressed="true">Loop</button>
</div>
{LIBS}
<script>
(async () => {{
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d'), D = window.DURATION;
  try {{ await Promise.all({json.dumps(FONT_SPECS)}.map((f) => document.fonts.load(f, 'رسالة 0123'))); await document.fonts.ready; }} catch (e) {{}}
  let t = 0, playing = false, t0 = 0, p0 = 0, stopSound = null, sound = true, loop = true;
  const draw = (tt) => {{ ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,1280,720); explainer(ctx, 1280, 720, tt); }};
  window.seek = (tt) => {{ t = Math.max(0, Math.min(D, tt)); draw(t); ui(); }};
  const $ = (i) => document.getElementById(i);
  function ui() {{ $('scrub').value = Math.round(t / D * 1000); $('time').textContent = t.toFixed(1) + ' / ' + D.toFixed(1); $('bPlay').textContent = playing ? '❚❚' : '▶'; $('bPlay').setAttribute('aria-label', playing ? 'Pause' : 'Play'); }}
  function killSound() {{ if (stopSound) {{ stopSound(); stopSound = null; }} }}
  function startSound() {{ killSound(); if (sound && playing) {{ try {{ stopSound = SOUND.live(scoreSound, t, {{ voiceover: false }}); }} catch (e) {{}} }} }}
  function play() {{ if (t >= D - 0.01) t = 0; playing = true; t0 = performance.now(); p0 = t; startSound(); requestAnimationFrame(tick); ui(); }}
  function pause() {{ playing = false; killSound(); ui(); }}
  function tick(now) {{
    if (!playing) return;
    t = p0 + (now - t0) / 1000;
    if (t >= D) {{ if (loop) {{ t = 0; p0 = 0; t0 = now; startSound(); }} else {{ t = D; draw(t); pause(); return; }} }}
    draw(t); ui(); requestAnimationFrame(tick);
  }}
  $('bPlay').onclick = () => playing ? pause() : play();
  $('scrub').oninput = (e) => {{ killSound(); t = e.target.value / 1000 * D; draw(t); if (playing) {{ t0 = performance.now(); p0 = t; startSound(); }} ui(); }};
  $('bSnd').onclick = () => {{ sound = !sound; $('bSnd').setAttribute('aria-pressed', sound); sound ? startSound() : killSound(); }};
  $('bLoop').onclick = () => {{ loop = !loop; $('bLoop').setAttribute('aria-pressed', loop); }};
  window.seek(9.8);
  document.body.dataset.ready = '1';
}})();
</script>
"""


if __name__ == '__main__':
    open(os.path.join(HERE, 'storyboard.html'), 'w', encoding='utf-8').write(storyboard())
    print('storyboard ok')
    open(os.path.join(HERE, 'pixel-beacon-explainer.html'), 'w', encoding='utf-8').write(player())
    print('player ok')
