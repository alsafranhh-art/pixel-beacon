"""Derive the standalone booth page (web/booth.html) from the Claude artifact version."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', 'game', 'pixel-beacon.html'), encoding='utf-8').read()
s = src


def rep(x, y, cnt=1):
    global s
    if s.count(x) != cnt:
        raise SystemExit('MISS %d %s' % (s.count(x), x[:80]))
    s = s.replace(x, y)


def cut(start, end_marker, repl, end_after=None):
    """Replace from `start` up to (not including) `end_marker`."""
    global s
    a = s.index(start)
    b = s.index(end_marker, a)
    if end_after:
        b = s.index(end_after, b) + len(end_after)
    s = s[:a] + repl + s[b:]


# --- fonts: served locally by the app
a = s.index('<link rel="preconnect"'); b = s.index('\n', s.index('<link rel="stylesheet"'))
s = s[:a] + '<link rel="icon" href="data:,">' + s[b:]
rep("<style>\n", """<style>
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-size:14px}
img{max-width:100%}
@font-face{font-family:"Silkscreen";font-weight:400;src:url(/fonts/silkscreen-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Silkscreen";font-weight:700;src:url(/fonts/silkscreen-latin-700-normal.woff2) format("woff2")}
@font-face{font-family:"Atkinson Hyperlegible";font-weight:400;src:url(/fonts/atkinson-hyperlegible-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Atkinson Hyperlegible";font-weight:700;src:url(/fonts/atkinson-hyperlegible-latin-700-normal.woff2) format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-weight:400;src:url(/fonts/ibm-plex-mono-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-weight:600;src:url(/fonts/ibm-plex-mono-latin-600-normal.woff2) format("woff2")}
""")
rep('<meta name="claude:viewport-fit-sides" content="cover">',
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">')

# --- no Claude link in the standalone app
rep("const DEFAULT_BASE='https://claude.ai/artifact/Pm2fVA3bLFzgPVWTZQ3ubV';\n", '')

# --- the how-it-works video is served by the app itself
import re as _re
s = _re.sub(r'src="/_blob/[0-9a-f]{32}"', 'src="/media/explainer.mp4"', s)

# --- header: network button
rep('''    <ol class="steps" id="steps">''', '''    <div class="hdr-right">
    <button id="bNet" class="net" title="Booth network settings">Phones: <span id="netAddr">…</span></button>
    <ol class="steps" id="steps">''')
rep('''      <li data-v="result">3 · Scan</li>
    </ol>''', '''      <li data-v="result">3 · Scan</li>
    </ol>
    </div>''')
rep('<div class="toast" id="toast" hidden></div>', '''<div class="toast" id="toast" hidden></div>
<div class="modal" id="netModal" hidden>
  <form class="panel modal-card" id="netForm">
    <h2>Booth network</h2>
    <p class="hint">Phones must be on the same Wi-Fi as this laptop. Pick the address that belongs to that Wi-Fi.</p>
    <label class="field"><span>Address phones open</span><select id="netSel"></select></label>
    <p class="hint">Optional: fill in the Wi-Fi name and password to show a “Join Wi-Fi” code next to every poster code.</p>
    <label class="field"><span>Wi-Fi name</span><input type="text" id="wifiName" autocomplete="off"></label>
    <label class="field"><span>Wi-Fi password</span><input type="text" id="wifiPass" autocomplete="off"></label>
    <div class="row" style="justify-content:flex-end"><button type="submit" class="primary">Done</button></div>
  </form>
</div>''')
rep('''      <div class="qr-frame"><canvas id="qr" aria-label="QR code for your poster"></canvas></div>''',
    '''      <div class="wifi-qr" id="wifiBox" hidden><canvas id="wifiQr" aria-label="QR code to join the booth Wi-Fi"></canvas><p><b>1.</b> Join the booth Wi-Fi<br><span id="wifiLabel"></span><br><b>2.</b> Scan your poster code</p></div>
      <div class="qr-frame"><canvas id="qr" aria-label="QR code for your poster"></canvas></div>''')
rep(".dl-help{margin:0;", """.hdr-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.net{font-family:var(--f-mono);font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px}
.modal{position:fixed;inset:0;background:#171a3366;display:flex;align-items:center;justify-content:center;z-index:30;padding:16px}
.modal-card{width:min(440px,100%);gap:12px}
.wifi-qr{display:flex;align-items:center;gap:10px;flex:none;text-align:left;font-size:13px}
.wifi-qr canvas{width:92px;height:92px;image-rendering:pixelated;background:#fff;border:1px solid var(--line);border-radius:6px;padding:4px}
.wifi-qr p{margin:0;color:var(--dim)}
.dl-help{margin:0;""")

# --- boot: booth only (phones get their own page from the server)
cut("const rawHash=decodeURIComponent", "if(sharedId){openShared(sharedId)}", "show('studio');sizeArt();", end_after="sizeArt()}")
rep("getDL();getAS();\n})();", "loadNet();\n})();")

# --- saving: a normal browser can download directly
cut("let dlP=null;", "function toast(", "function getDL(){return Promise.resolve(true)}\n")
cut("async function save(filename,data,quiet)", "return false}}",
    "async function save(filename,data){const blob=data instanceof Blob?data:new Blob([data]);const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Saved '+filename);return true}",
    end_after="return false}}")

# --- sharing: post to the local server
cut("/* ---------- sharing: store poster", "/* ---------- board: saved drawings", r"""/* ---------- sharing: send the poster to this laptop's server ---------- */
let shareP=null,net={ips:[],port:location.port||'80'},netIp=null;
function shareBase(){return `http://${netIp||location.hostname}:${net.port}`}
async function sharePoster(m){
  const png=await posterPNG(m);
  const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(png)});
  const resp=await fetch('/api/posters',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:m.name,cols:m.cols,rows:m.rows,bps:m.bps,bits:bitsOf(m.grid).join(''),token:toToken(m),png:dataUrl})});
  if(!resp.ok)throw new Error('server '+resp.status);
  return (await resp.json()).id;
}
function setNetLabel(){$('netAddr').textContent=netIp?`${netIp}:${net.port}`:'not on a network'}
async function loadNet(){
  try{net=await (await fetch('/api/info')).json()}catch(e){}
  const ips=net.ips||[];const saved=load('pb-net-ip');netIp=ips.includes(saved)?saved:(ips[0]||null);setNetLabel();
  if(!netIp)toast('This laptop isn’t on a network. Connect to Wi-Fi so phones can scan.');
}
$('bNet').onclick=async()=>{
  try{net=await (await fetch('/api/info')).json()}catch(e){}
  const sel=$('netSel'),ips=net.ips||[];sel.innerHTML='';
  ips.forEach(ip=>{const o=document.createElement('option');o.value=ip;o.textContent=`http://${ip}:${net.port}`;o.selected=ip===netIp;sel.appendChild(o)});
  if(!ips.length){const o=document.createElement('option');o.value='';o.textContent='No network found';sel.appendChild(o)}
  $('wifiName').value=load('pb-wifi-name')||'';$('wifiPass').value=load('pb-wifi-pass')||'';
  $('netModal').hidden=false;sel.focus()};
$('netForm').onsubmit=e=>{e.preventDefault();const v=$('netSel').value;if(v&&(net.ips||[]).includes(v)){netIp=v;store('pb-net-ip',v)}
  store('pb-wifi-name',$('wifiName').value.trim()||null);store('pb-wifi-pass',$('wifiPass').value||null);
  setNetLabel();$('netModal').hidden=true;if(view==='result'&&msg)renderShareQR()};
$('netModal').onclick=e=>{if(e.target.id==='netModal')$('netModal').hidden=true};
function drawQR(cv,text,size){
  let q=null;for(const ecl of['L','M']){try{q=qrcode(0,ecl);q.addData(text);q.make();break}catch(e){q=null}}if(!q)return false;
  const g=cv.getContext('2d'),n=q.getModuleCount(),qz=4,s=Math.max(2,Math.floor(size/(n+qz*2)));cv.width=cv.height=(n+qz*2)*s;
  g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.fillStyle='#000';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))g.fillRect((c+qz)*s,(r+qz)*s,s,s);return true}
function renderWifi(){
  const name=load('pb-wifi-name');const box=$('wifiBox');if(!name){box.hidden=true;return}
  const pass=load('pb-wifi-pass')||'';const esc=t=>t.replace(/([\\;,:"])/g,'\\$1');
  drawQR($('wifiQr'),`WIFI:T:${pass?'WPA':'nopass'};S:${esc(name)};${pass?'P:'+esc(pass)+';':''};`,240);
  $('wifiLabel').textContent=name;box.hidden=false}
let sndCache=null;

""")

# --- encoding: no video; send the poster when the signal finishes
rep("  const rec=startVideo();\n", "")
rep("    const m=msg;const vidP=rec?rec.finish(900):Promise.resolve(null);shareP=vidP.then(v=>sharePoster(m,v));",
    "    const m=msg;shareP=sharePoster(m);")
rep("  try{transmit(b,msg.bps,msg.ook,{onFrame:frame,onEnd:done,extraDest:rec&&rec.dest})}",
    "  try{transmit(b,msg.bps,msg.ook,{onFrame:frame,onEnd:done})}")

# --- QR card
cut("async function renderShareQR(){", "let alienWidth=", r"""async function renderShareQR(){
  const my=msg;renderWifi();renderQRStatus('Saving your poster…');
  let id=null;try{id=shareP?await shareP:null}catch(e){}
  if(msg!==my||view!=='result')return;
  if(!id){renderQRStatus('Couldn’t save this poster. Make sure the Pixel Beacon window is still open.');return}
  if(!netIp){renderQRStatus('This laptop isn’t on a network, so phones can’t open the code. Connect to Wi-Fi, then press “Phones:” at the top.');return}
  const cv=$('qr');$('qrNote').hidden=true;cv.hidden=false;drawQR(cv,`${shareBase()}/p/${id}`,720);
}
""")

for bad in ('claude.use', 'claude.ai', 'DEFAULT_BASE+', 'getAS(', 'openShared(', 'startVideo(', '/_blob/'):
    if bad in s:
        print('leftover:', bad)
out = '<!doctype html>\n<html lang="en">\n<head>\n' + s + '\n</html>\n'
open(os.path.join(HERE, 'web', 'booth.html'), 'w', encoding='utf-8').write(out)
print('ok', len(out))
