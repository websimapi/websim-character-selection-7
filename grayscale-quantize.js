// 8-shade grayscale quantization to standardize assets before recolor
(function(){
  const LEVELS = [0, 32, 64, 96, 128, 160, 192, 255]; // exact 8-level grayscale

  function luma(r,g,b){ return Math.round(0.2126*r + 0.7152*g + 0.0722*b); }
  function band(y){
    let idx=0, min=1e9;
    for(let i=0;i<LEVELS.length;i++){ const d=Math.abs(y-LEVELS[i]); if(d<min){min=d; idx=i;} }
    return idx;
  }

  async function grayscaleQuantize(img, returnBlobUrl=true){
    return new Promise(resolve=>{
      const run=()=>{
        try{
          const c=document.createElement('canvas'), x=c.getContext('2d',{willReadFrequently:true});
          c.width=img.naturalWidth; c.height=img.naturalHeight;
          x.drawImage(img,0,0);
          const d=x.getImageData(0,0,c.width,c.height), p=d.data;
          for(let i=0;i<p.length;i+=4){
            const a=p[i+3]; if(a<5) continue;
            const y=luma(p[i],p[i+1],p[i+2]);
            const b=band(y); const v=LEVELS[b];
            p[i]=v; p[i+1]=v; p[i+2]=v;
          }
          x.putImageData(d,0,0);
          c.toBlob(blob=>{
            if(!blob){ resolve(returnBlobUrl?null:undefined); return; }
            const url=URL.createObjectURL(blob);
            if(returnBlobUrl) resolve(url);
            else { if(img.dataset.grayUrl) URL.revokeObjectURL(img.dataset.grayUrl); img.dataset.grayUrl=url; img.src=url; resolve(); }
          });
        }catch(e){ console.warn('[GrayscaleQuantize] Failed', e); resolve(returnBlobUrl?null:undefined); }
      };
      if(img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, {once:true});
    });
  }

  function loadImage(url){
    return new Promise((resolve,reject)=>{
      const im=new Image(); im.crossOrigin='anonymous';
      im.onload=()=>resolve(im); im.onerror=reject; im.src=url;
    });
  }

  window.grayscaleQuantize = grayscaleQuantize;
  window.loadImage = loadImage;
})();