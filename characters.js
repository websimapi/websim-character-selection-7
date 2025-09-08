// Character data and management
const characters = [
    { name: 'Warrior', img: '/character1.png', baseHue: 240, stats: { strength: 9, speed: 5, magic: 2, armour: 8 } },
    { 
        name: 'Archer', 
        genders: {
            male: { img: '/character2.png' },
            female: { img: '/character_archer_female.png' }
        },
        baseHue: 120, 
        stats: { strength: 6, speed: 9, magic: 4, armour: 5 } 
    },
    { name: 'Wizard', img: '/character_wizard.png', baseHue: 60, stats: { strength: 3, speed: 6, magic: 10, armour: 3 } },
    { name: 'Valkyrie', img: '/character_valkrie.png', baseHue: 0, stats: { strength: 7, speed: 7, magic: 6, armour: 6 } }
];

const ANIMATION_DURATION = 500; // ms

// Cache for pre-processed character images
const characterImageCache = {};

// Update a character slot with new character data
function updateCharacterSlot(slot, character, direction) {
    const imageWrapper = slot.querySelector('.character-image-wrapper');
    // Cleanup: ensure only the topmost image remains before we animate
    const imgs = imageWrapper.querySelectorAll('.character-image');
    if (imgs.length > 1) {
        for (let i = 0; i < imgs.length - 1; i++) {
            if (imgs[i].dataset.blobUrl) URL.revokeObjectURL(imgs[i].dataset.blobUrl);
            imgs[i].remove();
        }
    }
    let oldImage = imageWrapper.querySelector('.character-image');
    const arrows = slot.querySelectorAll('.arrow');
    const nameText = slot.querySelector('.character-name-text');
    const color = slot.dataset.color;
    const genderToggleContainer = slot.querySelector('.gender-toggle-container');
    const genderToggles = slot.querySelectorAll('.gender-toggle');

    // Update character index on the slot itself
    const newCharacterIndex = characters.indexOf(character);
    slot.dataset.characterIndex = newCharacterIndex;

    // Handle gendered characters
    let characterImgSrc;
    if (character.genders) {
        const gender = slot.dataset.archerGender || 'male';
        characterImgSrc = character.genders[gender].img;
        genderToggleContainer.style.visibility = 'visible';
    } else {
        characterImgSrc = character.img;
        genderToggleContainer.style.visibility = 'hidden';
    }

    // Disable controls during animation
    arrows.forEach(arrow => arrow.disabled = true);
    genderToggles.forEach(toggle => toggle.disabled = true);
    document.dispatchEvent(new CustomEvent('relic-cursor-refresh'));
    
    // Fade out name
    nameText.classList.add('fade-out');

    // Create new image
    const newImage = document.createElement('img');
    const cachedSrc = characterImageCache[characterImgSrc]?.[color];
    newImage.src = cachedSrc || characterImgSrc; // Use cached image if available
    
    newImage.alt = character.name;
    newImage.className = 'character-image';
    newImage.dataset.baseHue = character.baseHue;
    
    // Position new image for entry animation
    if (direction === 'fade') {
        newImage.style.opacity = '0';
    } else {
        newImage.classList.add(direction === 'right' ? 'slide-in-from-right' : 'slide-in-from-left');
    }
    imageWrapper.appendChild(newImage);

    // If we used a fallback, apply shader (should be rare after preloading)
    if (!cachedSrc) {
        applyColorShaderToImage(newImage, color);
    }

    // Animate old image out (guard if none)
    if (oldImage) {
        if (direction === 'fade') {
            oldImage.style.transition = `opacity ${ANIMATION_DURATION}ms ease-in-out`;
            oldImage.style.opacity = '0';
            newImage.style.transition = `opacity ${ANIMATION_DURATION}ms ease-in-out`;
            requestAnimationFrame(() => requestAnimationFrame(() => newImage.style.opacity = '1'));
        } else {
            oldImage.classList.add(direction === 'right' ? 'slide-out-to-left' : 'slide-out-to-right');
        }
    } else {
        // No previous image, just reveal new one
        newImage.style.opacity = '1';
    }

    // Play sound
    playSound(stoneShiftBuffer);

    // After animation is complete, clean up and update stats
    setTimeout(() => {
        // Revoke old blob url if it exists to prevent memory leaks
        if (oldImage && oldImage.dataset.blobUrl) {
            URL.revokeObjectURL(oldImage.dataset.blobUrl);
        }
        if (oldImage) oldImage.remove();
        newImage.classList.remove('slide-in-from-left', 'slide-in-from-right');
        newImage.style.opacity = '';
        newImage.style.transition = '';
        
        // Update the stat text (except name, which is handled separately for timing)
        slot.querySelector('.strength').textContent = `Strength: ${character.stats.strength}`;
        slot.querySelector('.speed').textContent = `Speed: ${character.stats.speed}`;
        slot.querySelector('.magic').textContent = `Magic: ${character.stats.magic}`;
        slot.querySelector('.armour').textContent = `Armour: ${character.stats.armour}`;
        
        // Re-enable controls
        arrows.forEach(arrow => arrow.disabled = false);
        genderToggles.forEach(toggle => toggle.disabled = false);
        document.dispatchEvent(new CustomEvent('relic-cursor-refresh'));
    }, ANIMATION_DURATION);

    // Halfway through the animation, change the name and fade it in
    setTimeout(() => {
        nameText.textContent = character.name;
        nameText.classList.remove('fade-out');
    }, ANIMATION_DURATION / 2);
}

function preprocessCharacters() {
    const tasks = [];
    document.querySelectorAll('.character-slot').forEach(slot => {
        const img = slot.querySelector('.character-image');
        const color = slot.dataset.color;
        const character = characters[parseInt(slot.dataset.characterIndex, 10)];

        let characterImgSrc;
        if (character.genders) {
             const gender = slot.dataset.archerGender || 'male';
             characterImgSrc = character.genders[gender].img;
        } else {
            characterImgSrc = character.img;
        }

        const cachedSrc = characterImageCache[characterImgSrc]?.[color];
        
        if (cachedSrc) {
            if (img.dataset.blobUrl) URL.revokeObjectURL(img.dataset.blobUrl);
            img.src = cachedSrc;
            img.dataset.blobUrl = cachedSrc;
        } else {
             // Fallback for safety, though should not be needed after preloading
            tasks.push(applyColorShaderToImage(img, color));
        }
    });
    return Promise.all(tasks);
}

async function preloadAllCharacterImages() {
    console.log("Preloading all character image variants...");
    const colors = ['blue', 'green', 'yellow', 'red'];
    const promises = [];
    const imagesToLoad = [];

    for (const character of characters) {
        if (character.genders) {
            imagesToLoad.push(character.genders.male.img);
            imagesToLoad.push(character.genders.female.img);
        } else {
            imagesToLoad.push(character.img);
        }
    }
    
    const uniqueImages = [...new Set(imagesToLoad)];

    for (const imgSrc of uniqueImages) {
        characterImageCache[imgSrc] = {};
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Necessary for canvas operations
        img.src = imgSrc;

        const loadPromise = new Promise((resolve, reject) => {
            img.onload = () => {
                // Find the original character data to get baseHue
                const characterData = characters.find(c => c.img === imgSrc || (c.genders && Object.values(c.genders).some(g => g.img === imgSrc)));
                for (const color of colors) {
                    const colorPromise = processAndCacheImage(img, characterData, color)
                        .then(blobUrl => {
                            if (blobUrl) {
                                characterImageCache[imgSrc][color] = blobUrl;
                            }
                        });
                    promises.push(colorPromise);
                }
                resolve();
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${imgSrc}`);
                reject(`Failed to load image: ${imgSrc}`);
            };
        });
        await loadPromise; // Wait for each image to load before processing the next one
    }

    await Promise.all(promises);
    console.log("Preloading complete.", characterImageCache);
}

window.characterImageCache = characterImageCache;