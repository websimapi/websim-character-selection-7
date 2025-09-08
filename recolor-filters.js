// Character-specific recoloring logic

function selectiveRecolorWarrior(img, targetHue, returnBlob = false) {
    const shift = ((targetHue - 240) + 360) % 360;
    return new Promise((resolve) => {
        const process = () => {
            try {
                const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                x.drawImage(img, 0, 0);
                const d = x.getImageData(0, 0, c.width, c.height); const p = d.data;
                for (let i = 0; i < p.length; i += 4) {
                    const r = p[i], g = p[i+1], b = p[i+2], a = p[i+3];
                    if (a < 5) continue;
                    const hsl = rgbToHsl(r, g, b); // h:0-360 s,l:0-1

                    // Check for near-#878787 grey pixels and make them transparent
                    // HSL of #878787 is h:0, s:0, l:0.53
                    if (hsl.s < 0.1 && hsl.l > 0.5 && hsl.l < 0.56) {
                        const pixelIndex = i / 4;
                        const px = pixelIndex % c.width;
                        const py = Math.floor(pixelIndex / c.width);

                        // Apply to bottom-left quadrant, and bottom half of bottom-right quadrant
                        const isBottomLeft = px < c.width / 2 && py > c.height / 2;
                        const isBottomHalfOfBottomRight = px >= c.width / 2 && py > c.height * 0.75;

                        if (isBottomLeft || isBottomHalfOfBottomRight) {
                            p[i+3] = 0; // Set alpha to transparent
                            continue; // Skip other color processing for this pixel
                        }
                    }

                    if (isBluish(hsl.h, hsl.s, hsl.l, r, g, b)) {
                        let h = (hsl.h + shift) % 360; let s = hsl.s, l = hsl.l;
                        if (targetHue === 60) { // Yellow
                            h = 52; 
                            s = Math.min(1, s * 1.22); 
                            l = Math.max(0, Math.min(1, l * 1.12)); 
                        } else if (targetHue === 0) { // Darker Red
                            h = 0; // Force pure red hue to avoid purple tint
                            s = Math.min(1, s * 1.1); // Slightly boost saturation for a richer red
                            l = Math.max(0, l * 0.85); // Make it darker
                        }
                        const rgb = hslToRgb(h, s, l);
                        let rr = rgb.r, gg = rgb.g, bb = rgb.b;
                        if (targetHue === 60) {
                           rr = Math.min(255, rgb.r + 22);
                           gg = Math.max(0, rgb.g - 4);
                           bb = Math.max(0, rgb.b - 36);
                        } else if (targetHue === 0) { // Darker Red RGB fine-tuning
                            // Reduce green and blue components to ensure a deep, pure red
                            gg = Math.max(0, rgb.g - 15);
                            bb = Math.max(0, rgb.b - 15);
                        }
                        p[i] = rr; p[i+1] = gg; p[i+2] = bb;
                    }
                }
                x.putImageData(d, 0, 0);
                c.toBlob(blob => {
                    if (!blob) { resolve(returnBlob ? null : undefined); return; }
                    const url = URL.createObjectURL(blob);
                    if (returnBlob) {
                        resolve(url);
                    } else {
                        if (img.dataset.blobUrl) URL.revokeObjectURL(img.dataset.blobUrl);
                        img.dataset.blobUrl = url;
                        img.style.filter = ''; img.src = url;
                        console.info('[Warrior Recolor] Applied selective blue shift -> hue', targetHue);
                        resolve();
                    }
                });
            } catch (e) { 
                console.warn('[Warrior Recolor] Fallback to CSS filter', e); 
                if (!returnBlob) img.style.filter = `hue-rotate(${targetHue-240}deg)`;
                resolve(returnBlob ? null : undefined);
            }
        };
        if (img.complete && img.naturalWidth) process(); else img.addEventListener('load', process, { once: true });
    });
}

function selectiveRecolorArcher(img, targetHue, returnBlob = false) {
    const shift = ((targetHue - 120) + 360) % 360;
    return new Promise((resolve) => {
        const process = () => {
            try {
                const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                x.drawImage(img, 0, 0);
                const d = x.getImageData(0, 0, c.width, c.height); const p = d.data;
                for (let i = 0; i < p.length; i += 4) {
                    const r = p[i], g = p[i+1], b = p[i+2], a = p[i+3];
                    if (a < 5) continue;
                    const hsl = rgbToHsl(r, g, b); // h:0-360 s,l:0-1
                    if (isGreenish(hsl.h, hsl.s, hsl.l, r, g, b)) {
                        let h = (hsl.h + shift) % 360; let s = hsl.s, l = hsl.l;
                        if (targetHue === 0) { h = 0; s = Math.min(1, s * 1.22); l = Math.max(0, Math.min(1, l * 1.12)); }
                        else if (targetHue === 60) { h = 52; s = Math.min(1, s * 1.22); l = Math.max(0, Math.min(1, l * 1.12)); }
                        const rgb = hslToRgb(h, s, l);
                        const rr = targetHue === 0 ? Math.min(255, rgb.r + 8)  : (targetHue === 60 ? Math.min(255, rgb.r + 22) : rgb.r);
                        const gg = targetHue === 0 ? Math.max(0, rgb.g - 10) : (targetHue === 60 ? Math.max(0, rgb.g - 4)  : rgb.g);
                        const bb = targetHue === 0 ? Math.max(0, rgb.b - 24) : (targetHue === 60 ? Math.max(0, rgb.b - 36) : rgb.b);
                        p[i] = rr; p[i+1] = gg; p[i+2] = bb;
                    }
                }
                x.putImageData(d, 0, 0);
                c.toBlob(blob => {
                    if (!blob) { resolve(returnBlob ? null : undefined); return; }
                    const url = URL.createObjectURL(blob);
                    if (returnBlob) {
                        resolve(url);
                    } else {
                        if (img.dataset.blobUrl) URL.revokeObjectURL(img.dataset.blobUrl);
                        img.dataset.blobUrl = url;
                        img.style.filter = ''; img.src = url;
                        console.info('[Archer Recolor] Applied selective green shift -> hue', targetHue);
                        resolve();
                    }
                });
            } catch (e) { 
                console.warn('[Archer Recolor] Fallback to CSS filter', e); 
                if (!returnBlob) img.style.filter = `hue-rotate(${targetHue-120}deg)`;
                resolve(returnBlob ? null : undefined);
            }
        };
        if (img.complete && img.naturalWidth) process(); else img.addEventListener('load', process, { once: true });
    });
}

function selectiveRecolorValkyrie(img, targetHue, returnBlob = false) {
    const shift = ((targetHue - 0) + 360) % 360;
    return new Promise((resolve) => {
        const process = () => {
            try {
                const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                x.drawImage(img, 0, 0);
                const d = x.getImageData(0, 0, c.width, c.height); const p = d.data;
                for (let i = 0; i < p.length; i += 4) {
                    const r = p[i], g = p[i+1], b = p[i+2], a = p[i+3];
                    if (a < 5) continue;
                    
                    const pixelIndex = i / 4;
                    const y = Math.floor(pixelIndex / c.width);

                    const hsl = rgbToHsl(r, g, b); // h:0-360 s,l:0-1
                    if (isReddish(hsl.h, hsl.s, hsl.l, r, g, b, y, c.height)) {
                        let h = (hsl.h + shift) % 360; 
                        let s = hsl.s, l = hsl.l;

                        if (targetHue === 60) { // Yellow - "light golden bright yellow"
                            h = 50; // Nudge hue towards orange/gold, away from green
                            s = Math.min(1, s * 1.25); // Increase saturation for brightness
                            l = Math.min(1, l * 1.15); // Increase lightness
                        }

                        const rgb = hslToRgb(h, s, l);
                        let rr = rgb.r, gg = rgb.g, bb = rgb.b;

                        if (targetHue === 60) {
                            // Further tweak RGB to enhance the golden feel
                            rr = Math.min(255, rgb.r + 15);
                            gg = Math.max(0, rgb.g - 5);
                            bb = Math.max(0, rgb.b - 30);
                        }
                        
                        p[i] = rr; p[i+1] = gg; p[i+2] = bb;
                    }
                }
                x.putImageData(d, 0, 0);
                c.toBlob(blob => {
                    if (!blob) { resolve(returnBlob ? null : undefined); return; }
                    const url = URL.createObjectURL(blob);
                    if (returnBlob) {
                        resolve(url);
                    } else {
                        if (img.dataset.blobUrl) URL.revokeObjectURL(img.dataset.blobUrl);
                        img.dataset.blobUrl = url;
                        img.style.filter = ''; img.src = url;
                        console.info('[Valkyrie Recolor] Applied selective red shift -> hue', targetHue);
                        resolve();
                    }
                });
            } catch (e) { 
                console.warn('[Valkyrie Recolor] Fallback to CSS filter', e); 
                if (!returnBlob) img.style.filter = `hue-rotate(${targetHue-0}deg)`;
                resolve(returnBlob ? null : undefined);
            }
        };
        if (img.complete && img.naturalWidth) process(); else img.addEventListener('load', process, { once: true });
    });
}

function selectiveRecolorWizard(img, targetHue, returnBlob = false) {
    const shift = ((targetHue - 60) + 360) % 360;
    return new Promise((resolve) => {
        const process = () => {
            try {
                const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                x.drawImage(img, 0, 0);
                const d = x.getImageData(0, 0, c.width, c.height); const p = d.data;
                for (let i = 0; i < p.length; i += 4) {
                    const r = p[i], g = p[i+1], b = p[i+2], a = p[i+3];
                    if (a < 5) continue;
                    
                    const pixelIndex = i / 4;
                    const y = Math.floor(pixelIndex / c.width);

                    const hsl = rgbToHsl(r, g, b);
                    if (isYellowish(hsl.h, hsl.s, hsl.l, r, g, b, y, c.height)) {
                        let h = (hsl.h + shift) % 360; 
                        let s = hsl.s, l = hsl.l;
                        
                        const rgb = hslToRgb(h, s, l);
                        p[i] = rgb.r; p[i+1] = rgb.g; p[i+2] = rgb.b;
                    }
                }
                x.putImageData(d, 0, 0);
                c.toBlob(blob => {
                    if (!blob) { resolve(returnBlob ? null : undefined); return; }
                    const url = URL.createObjectURL(blob);
                    if (returnBlob) {
                        resolve(url);
                    } else {
                        if (img.dataset.blobUrl) URL.revokeObjectURL(img.dataset.blobUrl);
                        img.dataset.blobUrl = url;
                        img.style.filter = ''; img.src = url;
                        console.info('[Wizard Recolor] Applied selective yellow shift -> hue', targetHue);
                        resolve();
                    }
                });
            } catch (e) { 
                console.warn('[Wizard Recolor] Fallback to CSS filter', e); 
                if (!returnBlob) img.style.filter = `hue-rotate(${targetHue-60}deg)`;
                resolve(returnBlob ? null : undefined);
            }
        };
        if (img.complete && img.naturalWidth) process(); else img.addEventListener('load', process, { once: true });
    });
}

async function applyHairTintToImage(img, hex){
    return new Promise(resolve=>{
        const run=()=>{
            try{
                const c=document.createElement('canvas'), x=c.getContext('2d',{willReadFrequently:true});
                c.width=img.naturalWidth; c.height=img.naturalHeight; x.drawImage(img,0,0);
                const d=x.getImageData(0,0,c.width,c.height), p=d.data;
                const toRgb=(h)=>({r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)});
                const tgt=toRgb(hex);
                for(let i=0;i<p.length;i+=4){
                    const a=p[i+3]; if(a<5) continue;
                    const r=p[i], g=p[i+1], b=p[i+2];
                    const {h,s,l}=rgbToHsl(r,g,b);
                    const y=0.2126*r+0.7152*g+0.0722*b;
                    if (y<42 && s<0.30) { // target near-black, low-chroma hair
                        const tL = Math.min(0.38, Math.max(0.06, y/255*0.45)); // preserve shading
                        const col=hslToRgb(rgbToHsl(tgt.r,tgt.g,tgt.b).h, 0.85, tL);
                        p[i]=col.r; p[i+1]=col.g; p[i+2]=col.b;
                    }
                }
                x.putImageData(d,0,0);
                c.toBlob(b=>{
                    if (b){
                        if (img.dataset.blobUrlHair) URL.revokeObjectURL(img.dataset.blobUrlHair);
                        const url=URL.createObjectURL(b); img.dataset.blobUrlHair=url; img.src=url;
                    }
                    resolve();
                });
            }catch(e){ console.warn('[HairTint] Failed', e); resolve(); }
        };
        if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, {once:true});
    });
}
window.applyHairTintToImage = applyHairTintToImage;