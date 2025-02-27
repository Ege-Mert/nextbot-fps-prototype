// Update debugging information
function updateDebugInfo() {
    const nowTime = Date.now();
    const timeSinceLand = nowTime - lastLandTime;
    const bhopWindowRemaining = Math.max(0, BHOP_MAX_WINDOW - timeSinceLand);
    
    let bhopStatusColor = "#ffffff";
    if (bhopWindowRemaining > 0) {
        // In bhop window
        if (bhopWindowRemaining <= BHOP_PERFECT_WINDOW) {
            bhopStatusColor = "#ffff00"; // Perfect
        } else if (bhopWindowRemaining <= BHOP_GOOD_WINDOW) {
            bhopStatusColor = "#00ff00"; // Good
        } else {
            bhopStatusColor = "#00ffff"; // Ok
        }
    }
    
    debugInfo.innerHTML = `
        <div style="color: ${bhopStatusColor}">
        Speed: ${currentSpeed.toFixed(1)} / ${targetSpeed.toFixed(1)} 
        (${isSprinting ? 'Sprinting' : isWalking ? 'Walking' : 'Running'})<br>
        Bhop Chain: ${bhopChainCount} (Boost: ${currentBhopBoost.toFixed(2)}x, Momentum: ${(bhopMomentum*100).toFixed(0)}%)<br>
        </div>
        Bhop Window: ${timeSinceLand}ms / ${BHOP_MAX_WINDOW}ms (${bhopWindowRemaining}ms left)<br>
        FOV: ${camera.fov.toFixed(1)}° • Position: (${yawObject.position.x.toFixed(0)}, ${yawObject.position.z.toFixed(0)})<br>
        Status: ${canJump ? 'Grounded' : 'In Air'} 
        ${isBhopping ? '• <span style="color:#00ff00">Bhop Active</span>' : ''} 
        • Enemies: ${enemies.length} 
        ${showDebugBhop ? '• <span style="color:#ffff00">DEBUG ON</span>' : ''}
    `;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(0.1, clock.getDelta());
    
    updatePlayer(delta);
    updateEnemies(delta);
    
    renderer.render(scene, camera);
}

// Clock for timing
const clock = new THREE.Clock();

// Initialize the application
init();
