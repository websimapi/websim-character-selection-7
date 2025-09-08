// Palette-based recolor: 8 grayscale bands -> slot color + per-character accents + skin + hair
(function(){
  const SLOT_HUES = { blue: 240, green: 120, yellow: 60, red: 0 };
  const DEFAULT_PALETTES = {
    Warrior: { skinH: 28, skinS: 0.45, skinL: 0.72, unique1: '#9aa3ad', unique2: '#6b3f1f' },
    Archer:  { skinH: 30, skinS: 0.55, skinL: 0.60, unique1: '#8b5a2b', unique2: '#2e8b57' },
    Wizard:  { skinH: 25, skinS: 0.25, skinL: 0.82, unique1: '#c9a227', unique2: '#1f2a44' },
    Valkyrie:{ skinH: 22, skinS: 0.35, skinL: 0.85, unique1: '#b7c2cc', unique2: '#7a1322' },
    Unknown: { skinH: 25, skinS: 0.35, skinL: 0.80, unique1: '#888888', unique2: '#555555' }
  };

  function hexToRgb(hex){ const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:128,g:128,b:128}; }
  function hslToRgb(h,s,l){ const c=(1-Math.abs(2*l-1))*s, hp=h/60, x=c*(1-Math.abs((hp%2)-1)); let r1=0,g1=0,b1=0;
    if(hp>=0&&hp<1){r1=c;g1=x;} else if(hp<2){r1=x;g1=c;} else if(hp<3){g1=c;b1=x;} else if(hp<4){g1=x;b1=c;} else if(hp<5){r1=x;b1=c;} else {r1=c;b1=x;}
    const m=l-c/2; return {r:Math.round((r1+m)*255), g:Math.round((g1+m)*255), b:Math.round((b1+m)*255)}; }
  function clamp01(v){ return Math.max(0, Math.min(1, v)); }

  // Map luma to nearest of the 8 exact grayscale levels used by assets
  const LEVELS = [0, 32, 64, 96, 128, 160, 192, 255];
  function bandForLuma(y){
    let idx=0, min=1e9;
    for(let i=0;i<LEVELS.length;i++){ const d=Math.abs(y-LEVELS[i]); if(d<min){min=d; idx=i;} }
    return idx;
  }

  function slotShadeColor(hue, band){
    const shadeIdx = band - 1; // 0..3
    const sat = [0.65, 0.70, 0.75, 0.80][shadeIdx];
    const light = [0.28, 0.42, 0.60, 0.78][shadeIdx];
    return hslToRgb(hue, sat, light);
  }

  function skinColor(palette, luma){ // keep some shading from original luma
    const s = palette.skinS, h = palette.skinH;
    const baseL = palette.skinL;
    const shade = (luma - 200) / 55 * 0.10; // -0.10..+0.10
    return hslToRgb(h, s, clamp01(baseL + shade));
  }

  function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = d / (1 - Math.abs(2 * l - 1));
      if (l < 0.5) {
        h = (max - g) / d + (max - b) / d * 6;
      } else {
        h = (max - g) / d + (max - b) / d * 6;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    return { h: h, s: s, l: l };
  }

  function paletteFor(character){
    const name = character?.name || 'Unknown';
    return DEFAULT_PALETTES[name] || DEFAULT_PALETTES.Unknown;
  }

  function getLuma(r,g,b){ return Math.round(0.2126*r + 0.7152*g + 0.0722*b); }

  async function paletteRecolor(img, character, slotColorName, returnBlob=true){
    return new Promise(resolve=>{
      const run=()=>{
        try{
          const c=document.createElement('canvas'), x=c.getContext('2d',{willReadFrequently:true});
          c.width=img.naturalWidth; c.height=img.naturalHeight;
          x.drawImage(img,0,0);
          const d=x.getImageData(0,0,c.width,c.height), p=d.data;
          const hue=SLOT_HUES[slotColorName] ?? 240;
          const lerp=(a,b,t)=>Math.round(a+(b-a)*t);
          for(let i=0;i<p.length;i+=4){
            const a=p[i+3]; if(a<5) continue;
            const r=p[i], g=p[i+1], b=p[i+2]; const y=getLuma(r,g,b);
            const hsl=rgbToHsl(r,g,b);
            const band=bandForLuma(y);
            const neutral = (Math.abs(r-g)<8 && Math.abs(g-b)<8 && hsl.s < 0.18);
            const isTrimBand = (band>=1 && band<=4);
            const exclude = (y<8) || Math.abs(y-28)<10 || Math.abs(y-170)<10; // 000000 hair, 1C1C1C, AAAAAA
            if (neutral && isTrimBand && !exclude){ const tgt=slotShadeColor(hue, band); const dy=(y-LEVELS[band]); const w=Math.exp(-(dy*dy)/(2*16*16)); p[i]=lerp(r,tgt.r,w); p[i+1]=lerp(g,tgt.g,w); p[i+2]=lerp(b,tgt.b,w); }
          }
          x.putImageData(d,0,0);
          c.toBlob(blob=>{
            if(!blob){ resolve(returnBlob?null:undefined); return; }
            const url=URL.createObjectURL(blob);
            if(returnBlob){ resolve(url); }
            else { if(img.dataset.blobUrl) URL.revokeObjectURL(img.dataset.blobUrl); img.dataset.blobUrl=url; img.src=url; resolve(); }
          });
        }catch(e){ console.warn('[PaletteRecolor] Failed, leaving original image', e); resolve(returnBlob?null:undefined); }
      };
      if(img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, {once:true});
    });
  }

  window.paletteRecolor = paletteRecolor;
})();