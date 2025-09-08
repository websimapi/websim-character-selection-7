// Main initialization and coordination
// removed character data - now in characters.js
// removed WebAudio setup and sound functions - now in audio.js  
// removed color shader functions - now in color-shader.js
// removed updateCharacterSlot() function - now in characters.js
// removed initializeCharacterSelection() function - now in ui.js
// removed forceLandscape() function - now in mobile.js
// removed initializeStartOverlay() function - now in ui.js
// removed initializeRelicCursor() function - now in cursor.js
// removed preprocessCharacters() function - now in characters.js

let preprocessPromise = null;
let peer = null;
let peerId = null;
let connections = [];
let isHost = false;
let gameMode = null; // 'scan' or 'realtime'
let mySlotIndex = 0;
let playerSlots = [
    { occupied: true, color: 'blue', characterIndex: 0, playerId: 'host', gender: 'male' }, // Player 1 (host)
    { occupied: false, color: 'green', characterIndex: 1, playerId: null, gender: 'male' }, // Player 2
    { occupied: false, color: 'yellow', characterIndex: 2, playerId: null, gender: 'male' }, // Player 3
    { occupied: false, color: 'red', characterIndex: 3, playerId: null, gender: 'male' }  // Player 4
];
let suppressUIAnimationOnce = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    initializeMobile(); // Changed from forceLandscape()
    initializeRelicCursor();
    
    // Preload all character images before doing anything else
    await preloadAllCharacterImages();

    // Hide preloader
    const preloader = document.getElementById('preloader');
    preloader.classList.add('hidden');

    // Initialize networking
    initializePeerJS();

    // Now initialize the rest of the app
    initializeCharacterSelection();
    initializeStartOverlay();
});

function initializePeerJS() {
    peer = new Peer();
    
    peer.on('open', (id) => {
        peerId = id;
        console.log('PeerJS initialized with ID:', id);
        generateHostQRCodes(id);
    });

    peer.on('connection', (conn) => {
        console.log('Incoming connection:', conn.peer);
        handleIncomingConnection(conn);
    });

    peer.on('error', (error) => {
        console.error('PeerJS error:', error);
    });
}

function generateHostQRCodes(id) {
    const joinUrl = `https://champions.on.websim.com?ID=${id}`;
    // Generate mini QR code for in-game display
    new QRious({
        element: document.getElementById('mini-qr-code'),
        value: joinUrl,
        size: 80,
        foreground: '#ffffff',
        background: 'transparent'
    });

    // Generate fullscreen QR code
    new QRious({
        element: document.getElementById('fullscreen-qr-code'),
        value: joinUrl,
        size: Math.min(window.innerWidth, window.innerHeight) * 0.6,
        foreground: '#ffffff',
        background: 'transparent',
        padding: 20
    });

    // Display the Peer ID text
    document.getElementById('peer-id-display').textContent = id;
}

function handleIncomingConnection(conn) {
    connections.push(conn);
    
    conn.on('open', () => {
        console.log('Connection established with:', conn.peer);
        
        // Assign player to available slot
        const availableSlot = playerSlots.find(slot => !slot.occupied);
        if (availableSlot) {
            availableSlot.occupied = true;
            availableSlot.playerId = conn.peer;
            
            // Send slot assignment to new player
            conn.send({
                type: 'slot_assignment',
                slot: playerSlots.indexOf(availableSlot),
                playerSlots: playerSlots
            });
            
            // Broadcast updated player slots to all clients
            broadcastToClients({
                type: 'player_slots_update',
                playerSlots: playerSlots
            });
            
            updateCharacterSlotsUI();
        }
    });

    conn.on('data', (data) => {
        handleClientMessage(conn, data);
    });

    conn.on('close', () => {
        console.log('Connection closed:', conn.peer);
        removePlayer(conn.peer);
    });
}

function sendToHost(message) {
    // Client function to send data to the host
    if (!isHost && connections.length > 0 && connections[0].open) {
        connections[0].send(message);
    }
}

function handleClientMessage(conn, data) {
    const playerSlot = playerSlots.find(slot => slot.playerId === conn.peer);
    if (!playerSlot) {
        console.warn('Received message from unassigned player:', conn.peer);
        return;
    }
    const slotIndex = playerSlots.indexOf(playerSlot);
    const oldCharacterIndex = playerSlot.characterIndex;

    switch (data.type) {
        case 'character_change':
            if (slotIndex === data.slotIndex) { // Security check
                playerSlot.characterIndex = data.characterIndex;
                
                // Broadcast the updated state to all clients
                broadcastToClients({
                    type: 'character_change',
                    slotIndex: slotIndex,
                    characterIndex: data.characterIndex,
                    direction: data.direction
                });
                
                // Also update host's UI with animation
                const slotElement = document.querySelector(`.character-slot[data-player="${slotIndex + 1}"]`);
                if (slotElement) {
                    updateCharacterSlot(slotElement, characters[data.characterIndex], data.direction);
                }
            }
            break;
        case 'gender_change':
             if (slotIndex === data.slotIndex) { // Security check
                playerSlot.gender = data.gender;
                
                // Broadcast the updated state to all clients
                broadcastToClients({
                    type: 'gender_change',
                    slotIndex: slotIndex,
                    gender: data.gender
                });
                
                // Also update host's UI with animation
                const slotElement = document.querySelector(`.character-slot[data-player="${slotIndex + 1}"]`);
                if (slotElement) {
                     // The gender property is already updated in playerSlots array.
                     // updateCharacterSlot will read from the dataset which we update before calling.
                     slotElement.dataset.archerGender = data.gender;
                     updateCharacterSlot(slotElement, characters[playerSlot.characterIndex], 'fade');
                }
            }
            break;
        case 'slot_switch':
            hostAssignClientToSlot(conn.peer, data.targetIndex);
            break;
    }
}

function broadcastToClients(message) {
    connections.forEach(conn => {
        if (conn.open) {
            conn.send(message);
        }
    });
}

function removePlayer(playerId) {
    const slot = playerSlots.find(slot => slot.playerId === playerId);
    if (slot) {
        slot.occupied = false;
        slot.playerId = null;
        
        broadcastToClients({
            type: 'player_slots_update',
            playerSlots: playerSlots
        });
        
        updateCharacterSlotsUI();
    }
    
    connections = connections.filter(conn => conn.peer !== playerId);
}

function updateCharacterSlotsUI() {
    const slots = document.querySelectorAll('.character-slot');
    slots.forEach((slot, index) => {
        const playerSlot = playerSlots[index];
        const currentCharacterIndex = parseInt(slot.dataset.characterIndex, 10);
        const currentGender = slot.dataset.archerGender;

        if (playerSlot.occupied) {
            slot.classList.remove('empty');
            const skull = slot.querySelector('.skull-overlay'); if (skull) skull.remove();
            
            let characterChanged = playerSlot.characterIndex !== currentCharacterIndex;
            let genderChanged = false;
            if (characters[playerSlot.characterIndex].genders) {
                genderChanged = playerSlot.gender !== currentGender;
            }

            // Only update if there's a change
            if (characterChanged || genderChanged) {
                if (!suppressUIAnimationOnce) {
                    updateCharacterSlot(slot, characters[playerSlot.characterIndex], 'fade');
                }
            }
            
            // Always ensure data attributes are in sync, even if no visual update is needed right now.
            slot.dataset.characterIndex = playerSlot.characterIndex;
            if (characters[playerSlot.characterIndex].genders) {
                slot.dataset.archerGender = playerSlot.gender;
                const genderContainer = slot.querySelector('.gender-toggle-container');
                genderContainer.style.visibility = 'visible';
                genderContainer.querySelectorAll('.gender-toggle').forEach(t => {
                    t.classList.toggle('active', t.dataset.gender === playerSlot.gender);
                });
            } else {
                 slot.querySelector('.gender-toggle-container').style.visibility = 'hidden';
            }

        } else {
            slot.classList.add('empty');
            const wrap = slot.querySelector('.character-image-wrapper');
            if (wrap && !slot.querySelector('.skull-overlay')) {
                const skull = document.createElement('div');
                skull.className = 'skull-overlay';
                skull.innerHTML = '<img src="/skull.png" alt="Empty Slot">';
                wrap.appendChild(skull);
            }
            
            // Add "waiting for player" text if it doesn't exist
            const statsContainer = slot.querySelector('.character-stats');
            if (statsContainer && !statsContainer.querySelector('.waiting-for-player')) {
                const waitingText = document.createElement('div');
                waitingText.className = 'waiting-for-player';
                waitingText.innerHTML = 'Waiting for a player to join<span class="ellipsis"></span>';
                statsContainer.appendChild(waitingText);
            }
        }
    });
    suppressUIAnimationOnce = false;
    if (typeof renderPlayersStrip === 'function') renderPlayersStrip();
}

function hostAssignClientToSlot(peerIdToMove, targetIndex) {
    const target = playerSlots[targetIndex];
    if (!target || target.occupied) return;
    const current = playerSlots.find(s => s.playerId === peerIdToMove);
    if (!current) return;
    target.occupied = true; target.playerId = peerIdToMove; target.characterIndex = current.characterIndex; target.gender = current.gender;
    current.occupied = false; current.playerId = null;
    broadcastToClients({ type: 'player_slots_update', playerSlots });
    const conn = connections.find(c => c.peer === peerIdToMove);
    if (conn && conn.open) {
        conn.send({ type: 'slot_assignment', slot: targetIndex, playerSlots });
    }
    updateCharacterSlotsUI();
}

function hostSwitchToSlot(targetIndex) {
    if (!isHost) return;
    const target = playerSlots[targetIndex];
    if (!target || target.occupied) return;
    const prevIndex = mySlotIndex;
    const current = playerSlots[mySlotIndex];
    target.occupied = true; target.playerId = 'host'; target.characterIndex = current.characterIndex; target.gender = current.gender;
    current.occupied = false; current.playerId = null;
    mySlotIndex = targetIndex;
    suppressUIAnimationOnce = true;
    broadcastToClients({ type: 'player_slots_update', playerSlots });
    updateCharacterSlotsUI();
    const prevEl = document.querySelector(`.character-slot[data-player="${prevIndex + 1}"]`);
    if (prevEl) {
        prevEl.classList.add('empty');
        const wrap = prevEl.querySelector('.character-image-wrapper');
        wrap && wrap.querySelectorAll('.character-image').forEach(img => { if (img.dataset.blobUrl) URL.revokeObjectURL(img.dataset.blobUrl); img.remove(); });
        // add skull overlay to the slot we vacated
        if (wrap && !prevEl.querySelector('.skull-overlay')) {
            const skull = document.createElement('div');
            skull.className = 'skull-overlay';
            skull.innerHTML = '<img src="/skull.png" alt="Empty Slot">';
            wrap.appendChild(skull);
        }
    }
    const targetEl = document.querySelector(`.character-slot[data-player="${targetIndex + 1}"]`);
    if (targetEl) {
        const twrap = targetEl.querySelector('.character-image-wrapper');
        if (twrap) twrap.querySelectorAll('.character-image').forEach(img => { if (img.dataset.blobUrl) URL.revokeObjectURL(img.dataset.blobUrl); img.remove(); });
        const skull = targetEl.querySelector('.skull-overlay');
        if (skull) {
            skull.classList.add('slide-out-to-left');
            setTimeout(() => { skull.remove(); targetEl.classList.remove('empty'); updateCharacterSlot(targetEl, characters[target.characterIndex], 'right'); }, 500);
        } else {
            targetEl.classList.remove('empty');
            updateCharacterSlot(targetEl, characters[target.characterIndex], 'right');
        }
    }
    applyMobileSingleSlotMode();
    updateMobileSlotPicker(); // Update the slot pills for mobile
}