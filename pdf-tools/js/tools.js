/* Jilan PDF Tools — real tool implementations (pdf-lib, PDF.js, jsPDF, Tesseract, docx) */
'use strict';
/* global PDFLib, pdfjsLib, Tesseract, docx */

/* ---------- library guards ---------- */
if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
function hasLib(n){return n==='pdflib'?!!window.PDFLib:n==='pdfjs'?!!(window.pdfjsLib&&pdfjsLib.getDocument):n==='jspdf'?!!(window.jspdf&&window.jspdf.jsPDF):n==='tess'?!!window.Tesseract:n==='docx'?!!window.docx:false;}
function libErr(el,libs){el.innerHTML=`<div class="warn">⚠️ ${t('needNet')}<br><span class="small">(${libs.join(', ')})</span></div>`;return false;}
function readAB(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsArrayBuffer(f);});}
function loadImg(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const i=new Image();
  i.onload=()=>{URL.revokeObjectURL(u);res(i);};i.onerror=e=>{URL.revokeObjectURL(u);rej(e);};i.src=u;});}
function dropHTML(accept,multiple){return `<div class="card"><div class="drop" id="dz"><div style="font-size:2rem">📁</div><div><b>${t('chooseFile')}</b></div><div class="muted small">${accept||''}</div><input type="file" id="fin" accept="${accept||''}" ${multiple?'multiple':''}></div><div id="flist" class="thumbs"></div></div>`;}
function wireDrop(el,onFiles){const dz=el.querySelector('#dz'),fi=el.querySelector('#fin');
  dz.onclick=()=>fi.click();fi.onchange=()=>onFiles([...fi.files]);
  ['dragover','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();if(ev==='drop'&&e.dataTransfer)onFiles([...e.dataTransfer.files]);}));}
function outCard(title){return `<div class="card"><h3>${title}</h3><div class="ores"></div><div class="row oacts"></div></div>`;}
function addOut(cardEl,label,blob,filename,toolLabel,detail){
  const box=cardEl.querySelector('.ores'),acts=cardEl.querySelector('.oacts');
  const row=document.createElement('div');row.className='kv';
  row.innerHTML=`<span>${label}</span><b>${fmtSize(blob.size)}</b>`;box.appendChild(row);
  keepFile(filename,blob.type,blob,toolLabel,detail||label);
  const sv=document.createElement('button');sv.className='btn primary';sv.textContent='⬇️ '+t('save');
  sv.onclick=()=>saveBlob(blob,filename);acts.appendChild(sv);
  const sh=document.createElement('button');sh.className='btn outline';sh.textContent='📤 '+t('share');
  sh.onclick=()=>shareBlob(blob,filename);acts.appendChild(sh);
}
function valPages(str,max){ // "1-3,5" -> [0,1,2,4]
  const set=new Set();
  str.split(',').forEach(p=>{p=p.trim();if(!p)return;const m=p.match(/^(\d+)\s*-\s*(\d+)$/);
    if(m){let a=+m[1],b=+m[2];if(a>b)[a,b]=[b,a];for(let i=a;i<=b;i++)if(i>=1&&i<=max)set.add(i-1);}
    else{const n=+p;if(n>=1&&n<=max)set.add(n-1);}});
  return [...set].sort((a,b)=>a-b);
}

/* ============ 1. Images → PDF ============ */
window.tool_img2pdf=function(el){
  if(!hasLib('jspdf'))return libErr(el,['jsPDF']);
  el.innerHTML=dropHTML('image/*',true)+`<div class="card">
    <div class="row"><label>Page size</label><select id="ps"><option value="img">Image size</option><option value="a4">A4 (fit)</option></select></div>
    <div class="row"><label>JPEG quality</label><input type="range" id="q" min="0.4" max="1" step="0.05" value="0.85"><span id="qv">0.85</span></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div><div id="out"></div>`;
  wireDrop(el,f=>{el._files=f;el.querySelector('#flist').innerHTML=f.map(x=>`<div class="thumb"><div class="n">${esc(x.name)}</div></div>`).join('');});
  el.querySelector('#q').oninput=e=>el.querySelector('#qv').textContent=e.target.value;
  el.querySelector('#go').onclick=async()=>{
    const files=el._files;if(!files||!files.length)return toast(t('errNoFile'));
    showLoad(t('work'));
    try{
      const {jsPDF}=window.jspdf;const q=+el.querySelector('#q').value,ps=el.querySelector('#ps').value;
      let pdf=null;
      for(let i=0;i<files.length;i++){
        setProg(i/files.length*90);
        const img=await loadImg(files[i]);const w=img.naturalWidth,h=img.naturalHeight;
        if(ps==='a4'){
          if(!pdf)pdf=new jsPDF({unit:'pt',format:'a4'});
          else pdf.addPage('a4');
          const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();
          const r=Math.min(pw/w,ph/h),dw=w*r,dh=h*r;
          pdf.addImage(img,'JPEG',(pw-dw)/2,(ph-dh)/2,dw,dh,undefined,'FAST');
        }else{
          const fmt=[w,h];
          if(!pdf)pdf=new jsPDF({unit:'pt',format:fmt,orientation:w>h?'l':'p'});
          else pdf.addPage(fmt,w>h?'l':'p');
          pdf.addImage(img,'JPEG',0,0,w,h,undefined,'FAST');
        }
      }
      setProg(95);
      const blob=pdf.output('blob');hideLoad();
      const oc=outCard('✅ Images → PDF');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      addOut(el.querySelector('#out').firstChild,files.length+' images → PDF',blob,downloadName(files[0].name,'pdf'),'Images → PDF',files.length+' images');
      toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 2. PDF → Images ============ */
window.tool_pdf2img=function(el){
  if(!hasLib('pdfjs'))return libErr(el,['PDF.js']);
  el.innerHTML=dropHTML('application/pdf',false)+`<div class="card">
    <div class="row"><label>Format</label><select id="fmt"><option value="png">PNG</option><option value="jpeg">JPG</option></select></div>
    <div class="row"><label>Quality</label><select id="sc"><option value="1">Standard</option><option value="2" selected>High</option><option value="3">Ultra</option></select></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div><div id="out"></div><div id="pv" class="thumbs"></div>`;
  let file=null;
  wireDrop(el,f=>{file=f[0]||null;el.querySelector('#flist').innerHTML=file?`<div class="thumb"><div class="n">${esc(file.name)}</div></div>`:'';});
  el.querySelector('#go').onclick=async()=>{
    if(!file)return toast(t('errNoFile'));
    showLoad(t('work'));
    try{
      const data=await readAB(file);const pdf=await pdfjsLib.getDocument({data}).promise;
      const fmt=el.querySelector('#fmt').value,sc=+el.querySelector('#sc').value;
      const base=file.name.replace(/\.pdf$/i,'');const pv=el.querySelector('#pv');pv.innerHTML='';
      for(let p=1;p<=pdf.numPages;p++){
        setProg(p/pdf.numPages*90);
        const page=await pdf.getPage(p);const vp=page.getViewport({scale:sc});
        const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
        await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
        const blob=await new Promise(r=>cv.toBlob(r,fmt==='png'?'image/png':'image/jpeg',0.92));
        const th=document.createElement('div');th.className='thumb';
        th.innerHTML=`<img src="${URL.createObjectURL(blob)}"><div class="n">${t('page')} ${p}</div>`;pv.appendChild(th);
        await saveBlob(blob,`${base}-p${p}.${fmt==='png'?'png':'jpg'}`);
      }
      hideLoad();addHist('PDF → Images',pdf.numPages+' pages → '+fmt.toUpperCase());toast(t('done')+' '+pdf.numPages+' '+t('pages'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 3. Merge PDFs ============ */
window.tool_merge=function(el){
  if(!hasLib('pdflib'))return libErr(el,['pdf-lib']);
  el.innerHTML=dropHTML('application/pdf',true)+`<div class="card"><div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div><div id="out"></div>`;
  let files=[];
  wireDrop(el,f=>{files=f;el.querySelector('#flist').innerHTML=f.map(x=>`<div class="thumb"><div class="n">${esc(x.name)}</div></div>`).join('');});
  el.querySelector('#go').onclick=async()=>{
    if(files.length<2)return toast('Select at least 2 PDFs');
    showLoad(t('work'));
    try{
      const out=await PDFLib.PDFDocument.create();let total=0;
      for(let i=0;i<files.length;i++){setProg(i/files.length*90);
        const src=await PDFLib.PDFDocument.load(await readAB(files[i]),{ignoreEncryption:true});
        const pages=await out.copyPages(src,src.getPageIndices());pages.forEach(p=>out.addPage(p));total+=pages.length;}
      setProg(95);const bytes=await out.save();hideLoad();
      const blob=new Blob([bytes],{type:'application/pdf'});
      const oc=outCard('✅ Merge PDFs');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      addOut(el.querySelector('#out').firstChild,files.length+' PDFs → '+total+' pages',blob,downloadName('merged','pdf'),'Merge PDFs',files.length+' files');
      toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 4. Text → PDF ============ */
window.tool_text2pdf=function(el){
  if(!hasLib('jspdf'))return libErr(el,['jsPDF']);
  el.innerHTML=`<div class="card"><textarea id="tx" placeholder="Type or paste text…"></textarea>
    <div class="row"><label>Font size</label><input type="number" id="fs" value="12" min="8" max="24"></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div><div id="out"></div>`;
  el.querySelector('#go').onclick=()=>{
    const txt=el.querySelector('#tx').value.trim();if(!txt)return toast(t('errNoFile'));
    try{
      const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'pt',format:'a4'});
      const fs=+el.querySelector('#fs').value||12;pdf.setFontSize(fs);
      const lines=pdf.splitTextToSize(txt,pdf.internal.pageSize.getWidth()-80);
      let y=50;const lh=fs*1.4;
      lines.forEach(ln=>{if(y>pdf.internal.pageSize.getHeight()-50){pdf.addPage();y=50;}pdf.text(ln,40,y);y+=lh;});
      const blob=pdf.output('blob');
      const oc=outCard('✅ Text → PDF');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      addOut(el.querySelector('#out').firstChild,'Text → PDF',blob,downloadName('text','pdf'),'Text → PDF');
      toast(t('done'));
    }catch(e){toast(t('failed')+e.message);}
  };
};

/* ============ 5. PDF → Text ============ */
window.tool_pdf2text=function(el){
  if(!hasLib('pdfjs'))return libErr(el,['PDF.js']);
  el.innerHTML=dropHTML('application/pdf',false)+`<div class="card"><div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div>
  <div class="card hidden" id="rc"><h3>${t('preview')}</h3><textarea id="rt" style="min-height:200px"></textarea>
  <div class="row"><button class="btn outline" id="cp">📋 Copy</button><button class="btn outline" id="sv">⬇️ Save .txt</button></div></div>`;
  let file=null;wireDrop(el,f=>{file=f[0]||null;});
  el.querySelector('#go').onclick=async()=>{
    if(!file)return toast(t('errNoFile'));showLoad(t('work'));
    try{
      const pdf=await pdfjsLib.getDocument({data:await readAB(file)}).promise;let txt='';
      for(let p=1;p<=pdf.numPages;p++){setProg(p/pdf.numPages*90);
        const tc=await(await pdf.getPage(p)).getTextContent();
        txt+=`\n----- ${t('page')} ${p} -----\n`+tc.items.map(i=>i.str).join(' ')+'\n';}
      hideLoad();el.querySelector('#rc').classList.remove('hidden');el.querySelector('#rt').value=txt;
      addHist('PDF → Text',pdf.numPages+' pages');
      el.querySelector('#cp').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(txt);toast(t('copied'));};
      el.querySelector('#sv').onclick=()=>saveBlob(new Blob([txt],{type:'text/plain'}),downloadName(file.name,'txt'));
      toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 6. Split PDF ============ */
window.tool_split=function(el){
  if(!hasLib('pdflib'))return libErr(el,['pdf-lib']);
  el.innerHTML=dropHTML('application/pdf',false)+`<div class="card">
    <div class="row"><label>Pages</label><input type="text" id="rg" placeholder="e.g. 1-3, 5, 7-9" style="flex:1"></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div><div id="out"></div>`;
  let file=null,wireN=0;
  wireDrop(el,async f=>{file=f[0]||null;
    if(file){const pdf=await PDFLib.PDFDocument.load(await readAB(file),{ignoreEncryption:true});wireN=pdf.getPageCount();
      el.querySelector('#flist').innerHTML=`<div class="thumb"><div class="n">${esc(file.name)} • ${wireN} pages</div></div>`;}});
  el.querySelector('#go').onclick=async()=>{
    if(!file)return toast(t('errNoFile'));
    const idx=valPages(el.querySelector('#rg').value,wireN);
    if(!idx.length)return toast('Invalid page range');
    showLoad(t('work'));
    try{
      const src=await PDFLib.PDFDocument.load(await readAB(file),{ignoreEncryption:true});
      const out=await PDFLib.PDFDocument.create();
      (await out.copyPages(src,idx)).forEach(p=>out.addPage(p));
      const blob=new Blob([await out.save()],{type:'application/pdf'});hideLoad();
      const oc=outCard('✅ Split PDF');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      addOut(el.querySelector('#out').firstChild,idx.length+' pages extracted',blob,downloadName(file.name,'pdf'),'Split PDF',idx.length+' pages');
      toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 7. Page tools: rotate / delete / extract / reorder ============ */
window.tool_pagetools=function(el){
  if(!hasLib('pdflib')||!hasLib('pdfjs'))return libErr(el,['pdf-lib','PDF.js']);
  el.innerHTML=dropHTML('application/pdf',false)+`<div class="card hidden" id="pc">
    <p class="muted small">${t('selPages')}</p><div id="th" class="thumbs"></div>
    <div class="row">
      <button class="btn outline" id="rot">🔄 Rotate 90°</button>
      <button class="btn outline" id="del">🗑️ Delete</button>
      <button class="btn outline" id="ext">📤 Extract</button>
      <button class="btn outline" id="up">⬆️ Up</button>
      <button class="btn outline" id="dn">⬇️ Down</button>
    </div>
    <div class="row"><button class="btn primary" id="apply">${t('apply')} (Rotate/Delete/Reorder)</button>
    <button class="btn outline" id="reset">${t('reset')}</button></div></div><div id="out"></div>`;
  let file=null,order=[],sel=new Set(),rots={};
  wireDrop(el,async f=>{
    file=f[0]||null;if(!file)return;showLoad(t('work'));
    try{
      const pdf=await pdfjsLib.getDocument({data:await readAB(file)}).promise;
      order=[...Array(pdf.numPages).keys()];sel=new Set();rots={};
      const th=el.querySelector('#th');th.innerHTML='';el.querySelector('#pc').classList.remove('hidden');
      for(let p=1;p<=pdf.numPages;p++){setProg(p/pdf.numPages*80);
        const page=await pdf.getPage(p);const vp=page.getViewport({scale:0.35});
        const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
        await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
        const d=document.createElement('div');d.className='thumb';d.dataset.p=p-1;
        d.innerHTML=`<img src="${cv.toDataURL('image/jpeg',0.7)}"><div class="n">${p}</div>`;
        d.onclick=()=>{const k=p-1;sel.has(k)?sel.delete(k):sel.add(k);d.classList.toggle('sel');};
        th.appendChild(d);}
      hideLoad();
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  });
  const refresh=()=>{const th=el.querySelector('#th');
    [...th.children].forEach((d,i)=>{const k=order[i];d.dataset.p=k;
      d.querySelector('.n').textContent=(i+1);d.classList.toggle('sel',sel.has(k));});};
  el.querySelector('#rot').onclick=()=>{sel.forEach(k=>rots[k]=((rots[k]||0)+90)%360);toast('🔄 '+sel.size);};
  el.querySelector('#del').onclick=()=>{order=order.filter(k=>!sel.has(k));sel.clear();refresh();};
  el.querySelector('#up').onclick=()=>{const s=[...sel].sort((a,b)=>order.indexOf(a)-order.indexOf(b));
    s.forEach(k=>{const i=order.indexOf(k);if(i>0){order.splice(i,1);order.splice(i-1,0,k);}});refresh();};
  el.querySelector('#dn').onclick=()=>{const s=[...sel].sort((a,b)=>order.indexOf(b)-order.indexOf(a));
    s.forEach(k=>{const i=order.indexOf(k);if(i<order.length-1){order.splice(i,1);order.splice(i+1,0,k);}});refresh();};
  el.querySelector('#reset').onclick=async()=>{if(file){sel.clear();rots={};el.querySelector('#fin').dispatchEvent(new Event('change'));}};
  el.querySelector('#ext').onclick=async()=>{
    if(!sel.size)return toast(t('errNoFile'));showLoad(t('work'));
    try{
      const src=await PDFLib.PDFDocument.load(await readAB(file),{ignoreEncryption:true});
      const out=await PDFLib.PDFDocument.create();
      (await out.copyPages(src,[...sel].sort((a,b)=>a-b))).forEach(p=>out.addPage(p));
      const blob=new Blob([await out.save()],{type:'application/pdf'});hideLoad();
      const oc=outCard('✅ Extract pages');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      addOut(el.querySelector('#out').firstChild,sel.size+' pages',blob,downloadName(file.name,'pdf'),'Extract pages',sel.size+' pages');
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
  el.querySelector('#apply').onclick=async()=>{
    if(!file)return toast(t('errNoFile'));showLoad(t('work'));
    try{
      const src=await PDFLib.PDFDocument.load(await readAB(file),{ignoreEncryption:true});
      const out=await PDFLib.PDFDocument.create();
      const pages=await out.copyPages(src,order);
      pages.forEach((p,i)=>{const k=order[i];if(rots[k])p.setRotation(PDFLib.degrees(rots[k]));out.addPage(p);});
      const blob=new Blob([await out.save()],{type:'application/pdf'});hideLoad();
      const oc=outCard('✅ Page tools applied');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      addOut(el.querySelector('#out').firstChild,order.length+' pages',blob,downloadName(file.name,'pdf'),'Page tools');
      toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 8. Page numbers ============ */
window.tool_pagenum=function(el){
  if(!hasLib('pdflib'))return libErr(el,['pdf-lib']);
  el.innerHTML=dropHTML('application/pdf',false)+`<div class="card">
    <div class="row"><label>Position</label><select id="pos"><option value="bc">Bottom center</option><option value="br">Bottom right</option><option value="bl">Bottom left</option><option value="tc">Top center</option></select></div>
    <div class="row"><label>Start at</label><input type="number" id="st" value="1" min="1"></div>
    <div class="row"><label>Font size</label><input type="number" id="fs" value="11" min="8" max="24"></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div><div id="out"></div>`;
  let file=null;wireDrop(el,f=>{file=f[0]||null;});
  el.querySelector('#go').onclick=async()=>{
    if(!file)return toast(t('errNoFile'));showLoad(t('work'));
    try{
      const pdf=await PDFLib.PDFDocument.load(await readAB(file),{ignoreEncryption:true});
      const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
      const pos=el.querySelector('#pos').value,st=+el.querySelector('#st').value||1,fs=+el.querySelector('#fs').value||11;
      const pages=pdf.getPages();
      pages.forEach((p,i)=>{const {width,height}=p.getSize();const txt=String(st+i);const tw=font.widthOfTextAtSize(txt,fs);
        let x=width/2-tw/2,y=30;if(pos==='br'){x=width-tw-30;}if(pos==='bl'){x=30;}if(pos==='tc'){y=height-30;}
        p.drawText(txt,{x,y,size:fs,font,color:PDFLib.rgb(0.35,0.35,0.35)});setProg(i/pages.length*90);});
      const blob=new Blob([await pdf.save()],{type:'application/pdf'});hideLoad();
      const oc=outCard('✅ Page numbers');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      addOut(el.querySelector('#out').firstChild,pages.length+' pages numbered',blob,downloadName(file.name,'pdf'),'Page numbers');
      toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 9. Watermark ============ */
window.tool_watermark=function(el){
  if(!hasLib('pdflib'))return libErr(el,['pdf-lib']);
  el.innerHTML=dropHTML('application/pdf',false)+`<div class="card">
    <div class="row"><label>Text</label><input type="text" id="wt" value="JILAN" style="flex:1"></div>
    <div class="row"><label>Opacity</label><input type="range" id="op" min="0.1" max="0.6" step="0.05" value="0.25"><span id="opv">0.25</span></div>
    <div class="row"><label>Size</label><input type="number" id="fs" value="60" min="20" max="150"></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div><div id="out"></div>`;
  let file=null;wireDrop(el,f=>{file=f[0]||null;});
  el.querySelector('#op').oninput=e=>el.querySelector('#opv').textContent=e.target.value;
  el.querySelector('#go').onclick=async()=>{
    const txt=el.querySelector('#wt').value.trim();if(!file)return toast(t('errNoFile'));if(!txt)return toast('Enter watermark text');
    showLoad(t('work'));
    try{
      const pdf=await PDFLib.PDFDocument.load(await readAB(file),{ignoreEncryption:true});
      const font=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const op=+el.querySelector('#op').value,fs=+el.querySelector('#fs').value||60;
      const pages=pdf.getPages();
      pages.forEach((p,i)=>{const {width,height}=p.getSize();const tw=font.widthOfTextAtSize(txt,fs);
        p.drawText(txt,{x:width/2-tw/2,y:height/2,size:fs,font,opacity:op,color:PDFLib.rgb(0.85,0.15,0.15),rotate:PDFLib.degrees(45)});
        setProg(i/pages.length*90);});
      const blob=new Blob([await pdf.save()],{type:'application/pdf'});hideLoad();
      const oc=outCard('✅ Watermark');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      addOut(el.querySelector('#out').firstChild,'"'+txt+'" watermark',blob,downloadName(file.name,'pdf'),'Watermark');
      toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 10. Metadata ============ */
window.tool_metadata=function(el){
  if(!hasLib('pdflib'))return libErr(el,['pdf-lib']);
  el.innerHTML=dropHTML('application/pdf',false)+`<div class="card hidden" id="mc">
    <div class="kv"><span>Pages</span><b id="mp"></b></div>
    <div class="row"><label>Title</label><input type="text" id="mt" style="flex:1"></div>
    <div class="row"><label>Author</label><input type="text" id="ma" style="flex:1"></div>
    <div class="row"><label>Subject</label><input type="text" id="ms" style="flex:1"></div>
    <div class="row"><label>Keywords</label><input type="text" id="mk" style="flex:1"></div>
    <div class="row"><button class="btn primary" id="go">💾 Save metadata</button></div></div><div id="out"></div>`;
  let file=null;
  wireDrop(el,async f=>{file=f[0]||null;if(!file)return;
    try{const pdf=await PDFLib.PDFDocument.load(await readAB(file),{ignoreEncryption:true});
      el.querySelector('#mc').classList.remove('hidden');
      el.querySelector('#mp').textContent=pdf.getPageCount();
      el.querySelector('#mt').value=pdf.getTitle()||'';el.querySelector('#ma').value=pdf.getAuthor()||'';
      el.querySelector('#ms').value=pdf.getSubject()||'';el.querySelector('#mk').value=(pdf.getKeywords()||'').split(' ').join(', ');
    }catch(e){toast(t('failed')+e.message);}});
  el.querySelector('#go').onclick=async()=>{
    if(!file)return toast(t('errNoFile'));showLoad(t('work'));
    try{
      const pdf=await PDFLib.PDFDocument.load(await readAB(file),{ignoreEncryption:true});
      const v=id=>el.querySelector(id).value.trim();
      if(v('#mt'))pdf.setTitle(v('#mt'));if(v('#ma'))pdf.setAuthor(v('#ma'));
      if(v('#ms'))pdf.setSubject(v('#ms'));if(v('#mk'))pdf.setKeywords(v('#mk').split(',').map(s=>s.trim()));
      pdf.setProducer('Jilan PDF Tools');pdf.setCreator('Jilan PDF Tools');
      const blob=new Blob([await pdf.save()],{type:'application/pdf'});hideLoad();
      const oc=outCard('✅ Metadata saved');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      addOut(el.querySelector('#out').firstChild,'Metadata updated',blob,downloadName(file.name,'pdf'),'Metadata');
      toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 11. Compress PDF (honest re-render) ============ */
window.tool_compress=function(el){
  if(!hasLib('pdfjs')||!hasLib('jspdf'))return libErr(el,['PDF.js','jsPDF']);
  el.innerHTML=dropHTML('application/pdf',false)+`<div class="card">
    <p class="muted small">⚙️ Method: pages are re-rendered as compressed images. <b>Text becomes non-selectable.</b> Real measured savings shown — never faked.</p>
    <div class="row"><label>Level</label><select id="lv"><option value="0">Low (best quality)</option><option value="1" selected>Medium</option><option value="2">High (smallest)</option></select></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div><div id="out"></div><div id="pv" class="thumbs"></div>`;
  let file=null;wireDrop(el,f=>{file=f[0]||null;});
  el.querySelector('#go').onclick=async()=>{
    if(!file)return toast(t('errNoFile'));showLoad(t('work'));
    try{
      const orig=file.size;
      const lv=+el.querySelector('#lv').value;
      const sc=[1.2,0.9,0.65][lv],jq=[0.85,0.65,0.45][lv];
      const pdf=await pdfjsLib.getDocument({data:await readAB(file)}).promise;
      const {jsPDF}=window.jspdf;let out=null;
      const pv=el.querySelector('#pv');pv.innerHTML='';
      for(let p=1;p<=pdf.numPages;p++){setProg(p/pdf.numPages*90);
        const page=await pdf.getPage(p);const vp=page.getViewport({scale:sc});
        const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
        const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);
        await page.render({canvasContext:cx,viewport:vp}).promise;
        const url=cv.toDataURL('image/jpeg',jq);
        const w=cv.width,h=cv.height;
        if(!out)out=new jsPDF({unit:'pt',format:[w,h],orientation:w>h?'l':'p'});
        else out.addPage([w,h],w>h?'l':'p');
        out.addImage(url,'JPEG',0,0,w,h,undefined,'FAST');
        if(p===1){const th=document.createElement('div');th.className='thumb';th.innerHTML=`<img src="${url}"><div class="n">Preview</div>`;pv.appendChild(th);}}
      setProg(96);
      const blob=out.output('blob');hideLoad();
      const saved=orig-blob.size,pct=orig>0?Math.max(0,(saved/orig*100)):0;
      const oc=outCard('✅ Compress PDF');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      const card=el.querySelector('#out').firstChild;
      card.querySelector('.ores').insertAdjacentHTML('beforeend',
        `<div class="kv"><span>Original</span><b>${fmtSize(orig)}</b></div><div class="kv"><span>Compressed</span><b>${fmtSize(blob.size)}</b></div><div class="kv"><span>Saved</span><b style="color:var(--red)">${pct.toFixed(1)}%</b></div>`);
      if(blob.size>=orig)card.querySelector('.ores').insertAdjacentHTML('beforeend','<p class="warn">ℹ️ Output is not smaller — your PDF is already optimized. Original kept.</p>');
      addOut(card,'Compressed PDF',blob,downloadName(file.name,'pdf'),'Compress PDF',pct.toFixed(1)+'% saved');
      addHist('Compress PDF',fmtSize(orig)+' → '+fmtSize(blob.size));
      toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 12. OCR: Image → Text ============ */
window.tool_ocr=function(el){
  if(!hasLib('tess'))return libErr(el,['Tesseract.js']);
  el.innerHTML=dropHTML('image/*',false)+`<div class="card">
    <div class="row"><label>Language</label><select id="ol"><option value="eng">English</option><option value="urd">اردو (beta)</option></select></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div>
    <div class="pbar hidden" id="opb"><div id="opf"></div></div><div class="small muted" id="ost"></div></div>
  <div class="card hidden" id="rc"><h3>📝 OCR result</h3><textarea id="rt" style="min-height:180px"></textarea>
    <div class="row"><button class="btn outline" id="cp">📋 Copy</button><button class="btn outline" id="sv">⬇️ Save .txt</button><button class="btn outline" id="wd">📘 Save as Word (.docx)</button></div>
    <p class="muted small">Word export contains recognized <b>text only</b> — original layout is not preserved.</p></div>`;
  let file=null;wireDrop(el,f=>{file=f[0]||null;
    if(file){const th=document.createElement('div');th.className='thumb';th.innerHTML=`<img src="${URL.createObjectURL(file)}"><div class="n">preview</div>`;el.querySelector('#flist').innerHTML='';el.querySelector('#flist').appendChild(th);}});
  const doOCR=async(lang)=>{
    if(!file){toast(t('errNoFile'));return null;}
    showLoad('OCR…');el.querySelector('#opb').classList.remove('hidden');
    try{
      const res=await Tesseract.recognize(file,lang,{logger:m=>{
        if(m.status==='recognizing text'){el.querySelector('#opf').style.width=Math.round((m.progress||0)*100)+'%';el.querySelector('#ost').textContent=Math.round((m.progress||0)*100)+'%';}
        else el.querySelector('#ost').textContent=m.status;}});
      hideLoad();return res.data.text||'';
    }catch(e){hideLoad();
      if(lang!=='eng'){toast('Urdu OCR failed: '+(e.message||e));}
      else toast(t('failed')+(e.message||e));return null;}
  };
  el.querySelector('#go').onclick=async()=>{
    const lang=el.querySelector('#ol').value||localStorage.getItem('pt_ocrlang')||'eng';
    const txt=await doOCR(lang);if(txt===null)return;
    el.querySelector('#rc').classList.remove('hidden');el.querySelector('#rt').value=txt;
    addHist('OCR Image → Text',lang);
    el.querySelector('#cp').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(txt);toast(t('copied'));};
    el.querySelector('#sv').onclick=()=>saveBlob(new Blob([txt],{type:'text/plain'}),downloadName(file.name,'txt'));
    el.querySelector('#wd').onclick=()=>ocrTextToDocx(txt,downloadName(file.name,'docx'));
    toast(t('done'));
  };
  const os=el.querySelector('#ol');os.value=localStorage.getItem('pt_ocrlang')||'eng';
  os.onchange=()=>localStorage.setItem('pt_ocrlang',os.value);
};

/* ---- shared: OCR text → DOCX ---- */
async function ocrTextToDocx(txt,filename){
  if(!hasLib('docx')){toast(t('needNet'));return;}
  showLoad(t('work'));
  try{
    const {Document,Packer,Paragraph,TextRun}=window.docx;
    const paras=txt.split('\n').map(ln=>new Paragraph({children:[new TextRun(ln||' ')]}));
    const doc=new Document({sections:[{children:paras}]});
    const blob=await Packer.toBlob(doc);hideLoad();
    await keepFile(filename,'application/vnd.openxmlformats-officedocument.wordprocessingml.document',blob,'Scan → Word','OCR text');
    await saveBlob(blob,filename);toast(t('done'));
  }catch(e){hideLoad();toast(t('failed')+e.message);}
}

/* ============ 13. Scan → Word (OCR → DOCX) ============ */
window.tool_ocr2docx=function(el){
  if(!hasLib('tess')||!hasLib('docx'))return libErr(el,['Tesseract.js','docx']);
  el.innerHTML=dropHTML('image/*',false)+`<div class="card">
    <p class="muted small">📘 Converts a scanned/image page to an <b>editable .docx</b> using OCR text. Layout/images are <b>not</b> preserved — text only.</p>
    <div class="row"><label>Language</label><select id="ol"><option value="eng">English</option><option value="urd">اردو (beta)</option></select></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div>
    <div class="pbar hidden" id="opb"><div id="opf"></div></div><div class="small muted" id="ost"></div></div>`;
  let file=null;wireDrop(el,f=>{file=f[0]||null;});
  el.querySelector('#go').onclick=async()=>{
    if(!file)return toast(t('errNoFile'));
    const lang=el.querySelector('#ol').value;showLoad('OCR…');el.querySelector('#opb').classList.remove('hidden');
    try{
      const res=await Tesseract.recognize(file,lang,{logger:m=>{if(m.status==='recognizing text'){el.querySelector('#opf').style.width=Math.round((m.progress||0)*100)+'%';}}});
      hideLoad();const txt=res.data.text||'';
      if(!txt.trim()){toast('No text recognized');return;}
      await ocrTextToDocx(txt,downloadName(file.name,'docx'));
      addHist('Scan → Word',lang);
    }catch(e){hideLoad();toast(t('failed')+(e.message||e));}
  };
};

/* ============ 14. Document Scanner ============ */
window.tool_scanner=function(el){
  if(!hasLib('jspdf'))return libErr(el,['jsPDF']);
  el.innerHTML=`<div class="card">
    <video id="sv" playsinline muted style="width:100%;border-radius:12px;background:#000;min-height:220px"></video>
    <div class="row"><button class="btn primary" id="start">📷 Start camera</button><button class="btn outline" id="cap" disabled>📸 Capture</button></div>
    <p class="muted small" id="smsg">Camera permission will be requested. Denied? Use "Images → PDF" with gallery photos instead.</p></div>
  <div class="card"><h3>Enhance</h3>
    <div class="row"><label>Filter</label><select id="flt"><option value="none">Color</option><option value="gray">Grayscale</option><option value="bw">Black & White</option><option value="enh">Enhanced contrast</option></select></div>
    <div class="row"><button class="btn outline" id="rot">🔄 Rotate</button></div></div>
  <div class="card"><h3>Scanned pages (<span id="pcount">0</span>)</h3><div id="spages" class="scan-grid"></div>
    <div class="row"><button class="btn primary" id="exp" disabled>📕 Export PDF</button><button class="btn outline" id="clr">Clear</button></div></div>`;
  const video=el.querySelector('#sv');let stream=null,pages=[],rot=0;
  const filt=el.querySelector('#flt');
  async function stopCam(){if(stream){stream.getTracks().forEach(tr=>tr.stop());stream=null;el.querySelector('#cap').disabled=true;}}
  window.addEventListener('hashchange',function h(){if(!location.hash.includes('scanner')){stopCam();window.removeEventListener('hashchange',h);}});
  el.querySelector('#start').onclick=async()=>{
    try{
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){el.querySelector('#smsg').textContent='Camera not supported in this browser/WebView.';return;}
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      video.srcObject=stream;await video.play();el.querySelector('#cap').disabled=false;
      el.querySelector('#smsg').textContent='Camera on. Frame the document and tap Capture.';
    }catch(e){el.querySelector('#smsg').textContent='⚠️ Camera blocked/denied: '+(e.message||e)+'. Allow camera permission or use Images → PDF.';}
  };
  function applyFilter(cv){
    const f=filt.value;if(f==='none')return;
    const cx=cv.getContext('2d'),id=cx.getImageData(0,0,cv.width,cv.height),d=id.data;
    for(let i=0;i<d.length;i+=4){
      let r=d[i],g=d[i+1],b=d[i+2];
      if(f==='gray'){const v=0.299*r+0.587*g+0.114*b;d[i]=d[i+1]=d[i+2]=v;}
      else if(f==='bw'){const v=0.299*r+0.587*g+0.114*b>128?255:0;d[i]=d[i+1]=d[i+2]=v;}
      else if(f==='enh'){const v=0.299*r+0.587*g+0.114*b;const c=Math.min(255,Math.max(0,(v-128)*1.6+128));d[i]=d[i+1]=d[i+2]=c;}
    }
    cx.putImageData(id,0,0);
  }
  el.querySelector('#cap').onclick=()=>{
    if(!stream)return;const vw=video.videoWidth,vh=video.videoHeight;if(!vw)return toast('Camera not ready');
    const cv=document.createElement('canvas');cv.width=vw;cv.height=vh;
    const cx=cv.getContext('2d');
    if(rot%180!==0){cv.width=vh;cv.height=vw;cx.translate(cv.width/2,cv.height/2);cx.rotate(rot*Math.PI/180);cx.drawImage(video,-vw/2,-vh/2);}
    else{cx.translate(cv.width/2,cv.height/2);cx.rotate(rot*Math.PI/180);cx.drawImage(video,-cv.width/2,-cv.height/2);}
    applyFilter(cv);
    const url=cv.toDataURL('image/jpeg',0.9);pages.push(url);renderPages();toast('📸 Page '+pages.length);
  };
  el.querySelector('#rot').onclick=()=>{rot=(rot+90)%360;toast('🔄 '+(rot)+'°');};
  function renderPages(){
    el.querySelector('#pcount').textContent=pages.length;
    const g=el.querySelector('#spages');g.innerHTML='';
    pages.forEach((u,i)=>{const w=document.createElement('div');w.style.position='relative';
      w.innerHTML=`<img src="${u}"><button class="mini" style="position:absolute;top:2px;right:2px;background:var(--red);color:#fff;border:none">✕</button>`;
      w.querySelector('button').onclick=()=>{pages.splice(i,1);renderPages();};g.appendChild(w);});
    el.querySelector('#exp').disabled=!pages.length;
  }
  el.querySelector('#clr').onclick=()=>{pages=[];renderPages();};
  el.querySelector('#exp').onclick=async()=>{
    if(!pages.length)return;showLoad(t('work'));
    try{
      const {jsPDF}=window.jspdf;let pdf=null;
      for(let i=0;i<pages.length;i++){setProg(i/pages.length*90);
        const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=pages[i];});
        const w=img.naturalWidth,h=img.naturalHeight;
        if(!pdf)pdf=new jsPDF({unit:'pt',format:[w,h],orientation:w>h?'l':'p'});
        else pdf.addPage([w,h],w>h?'l':'p');
        pdf.addImage(img,'JPEG',0,0,w,h,undefined,'FAST');}
      const blob=pdf.output('blob');hideLoad();
      await keepFile(downloadName('scan','pdf'),'application/pdf',blob,'Document Scanner',pages.length+' pages');
      await saveBlob(blob,downloadName('scan','pdf'));addHist('Document Scanner',pages.length+' pages');toast(t('done'));
    }catch(e){hideLoad();toast(t('failed')+e.message);}
  };
};

/* ============ 15. Image tools: convert / resize / rotate ============ */
window.tool_imgtools=function(el){
  el.innerHTML=dropHTML('image/*',false)+`<div class="card hidden" id="ic">
    <img id="ipv" class="preview" alt="preview">
    <div class="kv"><span>Original</span><b id="iinfo"></b></div>
    <div class="row"><label>Format</label><select id="if"><option value="jpeg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div>
    <div class="row"><label>Quality</label><input type="range" id="iq" min="0.4" max="1" step="0.05" value="0.85"><span id="iqv">0.85</span></div>
    <div class="row"><label>Width</label><input type="number" id="iw" style="width:90px"><label style="min-width:0">Height</label><input type="number" id="ih" style="width:90px"></div>
    <div class="row"><label><input type="checkbox" id="ilock" checked> Lock aspect ratio</label></div>
    <div class="row"><button class="btn outline" id="irot">🔄 Rotate 90°</button><button class="btn outline" id="ireset">Reset</button></div>
    <div class="row"><button class="btn primary" id="go">${t('process')}</button></div></div><div id="out"></div>`;
  let file=null,img=null,rot=0,nw=0,nh=0;
  wireDrop(el,async f=>{file=f[0]||null;if(!file)return;
    img=await loadImg(file);rot=0;nw=img.naturalWidth;nh=img.naturalHeight;
    el.querySelector('#ic').classList.remove('hidden');
    el.querySelector('#ipv').src=URL.createObjectURL(file);
    el.querySelector('#iinfo').textContent=`${nw}×${nh} • ${fmtSize(file.size)}`;
    el.querySelector('#iw').value=nw;el.querySelector('#ih').value=nh;});
  el.querySelector('#iq').oninput=e=>el.querySelector('#iqv').textContent=e.target.value;
  el.querySelector('#irot').onclick=()=>{rot=(rot+90)%360;[nw,nh]=[nh,nw];el.querySelector('#iw').value=nw;el.querySelector('#ih').value=nh;toast('🔄 '+rot+'°');};
  el.querySelector('#ireset').onclick=async()=>{if(file){rot=0;nw=img.naturalWidth;nh=img.naturalHeight;el.querySelector('#iw').value=nw;el.querySelector('#ih').value=nh;}};
  el.querySelector('#iw').oninput=e=>{if(el.querySelector('#ilock').checked&&img){nh=Math.round(nw?+e.target.value*img.naturalHeight/img.naturalWidth:nh);el.querySelector('#ih').value=nh;}};
  el.querySelector('#ih').oninput=e=>{if(el.querySelector('#ilock').checked&&img){nw=Math.round(nh?+e.target.value*img.naturalWidth/img.naturalHeight:nw);el.querySelector('#iw').value=nw;}};
  el.querySelector('#go').onclick=()=>{
    if(!img)return toast(t('errNoFile'));
    const W=+el.querySelector('#iw').value||img.naturalWidth,H=+el.querySelector('#ih').value||img.naturalHeight;
    const fmt=el.querySelector('#if').value,q=+el.querySelector('#iq').value;
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const cx=cv.getContext('2d');cx.translate(W/2,H/2);cx.rotate(rot*Math.PI/180);
    const iw=rot%180?H:W,ih=rot%180?W:H;cx.drawImage(img,-iw/2,-ih/2,iw,ih);
    cv.toBlob(async blob=>{
      if(!blob){toast(t('failed')+'format');return;}
      const ext=fmt==='jpeg'?'jpg':fmt;
      const oc=outCard('✅ Image converted');el.querySelector('#out').innerHTML='';el.querySelector('#out').appendChild(Object.assign(document.createElement('div'),{innerHTML:oc}).firstChild);
      const card=el.querySelector('#out').firstChild;
      card.querySelector('.ores').insertAdjacentHTML('beforeend',`<div class="kv"><span>Original</span><b>${fmtSize(file.size)}</b></div><div class="kv"><span>New</span><b>${fmtSize(blob.size)}</b></div><div class="kv"><span>Size</span><b>${W}×${H}</b></div>`);
      addOut(card,`${W}×${H} ${ext.toUpperCase()}`,blob,downloadName(file.name,ext),'Image Tools',`${W}×${H}`);
      if(fmt==='png'&&file.type==='image/jpeg')card.querySelector('.ores').insertAdjacentHTML('beforeend','<p class="muted small">ℹ️ JPG→PNG is lossless but usually larger — no quality is gained.</p>');
      toast(t('done'));
    },'image/'+fmt,q);
  };
};
