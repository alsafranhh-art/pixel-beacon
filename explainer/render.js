const {chromium}=require('playwright');const fs=require('fs');const {spawn}=require('child_process');
// Usage: node render.js <outdir>   (then mux video.tmp.mp4 + audio.raw with ffmpeg, see README)
const path=require('path');const OUT=process.argv[2]||'.';
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'pixel-beacon-explainer.html'));await p.waitForFunction(()=>document.body.dataset.ready==='1');
const D=await p.evaluate(()=>window.DURATION);const N=Math.round(D*30);
// audio
const a=await p.evaluate(async(D)=>{const r=await SOUND.renderOffline(window.scoreSound,D,48000,{voiceover:false});const f=r.inter;const i16=new Int16Array(f.length);for(let k=0;k<f.length;k++){const v=Math.max(-1,Math.min(1,f[k]));i16[k]=v*32767}let s='';const u8=new Uint8Array(i16.buffer);for(let k=0;k<u8.length;k+=32768)s+=String.fromCharCode.apply(null,u8.subarray(k,k+32768));return {b64:btoa(s),peak:r.peak}},D);
fs.writeFileSync(OUT+'/audio.raw',Buffer.from(a.b64,'base64'));console.log('audio peak',a.peak.toFixed(3));
const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-r','30',OUT+'/video.tmp.mp4'],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<N;i++){const u=await p.evaluate((t)=>{window.seek(t);return document.getElementById('cv').toDataURL('image/jpeg',0.92)},i/30);
  if(!ff.stdin.write(Buffer.from(u.split(',')[1],'base64')))await new Promise(r=>ff.stdin.once('drain',r));}
ff.stdin.end();const code=await new Promise(r=>ff.on('close',r));console.log('frames',N,'ffmpeg',code,errs);await b.close()})();
