// Audio system management
let audioContext;
let stoneShiftBuffer;
let backgroundMusicBuffer;
let isMusicPlaying = false;
let stoneShiftLoading = false;

// Function to load a sound
async function loadSound(url) {
    if (!audioContext) return null;
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    } catch (error) {
        console.error(`Error loading sound: ${url}`, error);
        return null;
    }
}

// Function to play a sound
function playSound(buffer) {
    if (!audioContext) return;
    if (!buffer) {
        if (!stoneShiftLoading) {
            stoneShiftLoading = true;
            loadSound('stone_shift.mp3').then(b => { stoneShiftBuffer = b; stoneShiftLoading = false; if (b) playSound(b); });
        }
        return;
    }

    // Resume AudioContext if it's in a suspended state (required by browser autoplay policies)
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            if (!isMusicPlaying) {
                playBackgroundMusic();
            }
        });
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

function playBackgroundMusic() {
    if (!audioContext || !backgroundMusicBuffer || isMusicPlaying) return;

    if (audioContext.state !== 'running') {
        // Wait for user interaction to start music
        return;
    }

    isMusicPlaying = true;
    
    const source = audioContext.createBufferSource();
    source.buffer = backgroundMusicBuffer;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5; // Set volume to half

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);

    source.onended = () => {
        isMusicPlaying = false;
        setTimeout(playBackgroundMusic, 5000); // Wait 5 seconds before repeating
    };
}

// Initialize audio system with user interaction
async function initializeAudio() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Resume context if it was suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Preload sounds now that we have user interaction
        if (!stoneShiftBuffer) {
             stoneShiftBuffer = await loadSound('stone_shift.mp3');
        }
        if (!backgroundMusicBuffer) {
            backgroundMusicBuffer = await loadSound('/Ancient_Champions.ogg');
        }
        
        // Start background music
        playBackgroundMusic();

    } catch (e) {
        console.error("Web Audio API is not supported or failed to initialize.", e);
    }
}