/**
 * Main entry point for the Nextbot FPS Prototype
 * Enhanced version with improved bhop mechanics and enemy AI
 */
import { Game } from './core/Game.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Nextbot FPS Prototype v2.0 starting...');
    console.log('Enhanced with improved bhop mechanics and enemy AI');
    
    // Create and initialize the game
    const game = new Game();
    
    // Add a performance monitor if debug mode
    addPerformanceMonitor();
    
    // Initialize game
    game.init();
    
    // Add a global reference (for debugging)
    window.game = game;
});

/**
 * Add a simple FPS counter for performance monitoring
 */
function addPerformanceMonitor() {
    // Create FPS counter element
    const fpsCounter = document.createElement('div');
    fpsCounter.id = 'fps-counter';
    fpsCounter.style.position = 'fixed';
    fpsCounter.style.top = '5px';
    fpsCounter.style.left = '5px';
    fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    fpsCounter.style.color = 'white';
    fpsCounter.style.padding = '5px';
    fpsCounter.style.borderRadius = '3px';
    fpsCounter.style.fontFamily = 'monospace';
    fpsCounter.style.fontSize = '12px';
    fpsCounter.style.zIndex = '9999';
    document.body.appendChild(fpsCounter);
    
    // Variables for FPS calculation
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;
    
    // Update FPS counter
    function updateFPS() {
        frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - lastTime;
        
        if (elapsed >= 1000) {
            fps = Math.round((frameCount * 1000) / elapsed);
            frameCount = 0;
            lastTime = currentTime;
            
            // Update display with color coding
            fpsCounter.textContent = `FPS: ${fps}`;
            
            // Color code based on performance
            if (fps >= 55) {
                fpsCounter.style.color = '#9fffbf'; // Green for good FPS
            } else if (fps >= 30) {
                fpsCounter.style.color = '#fffb9f'; // Yellow for acceptable FPS
            } else {
                fpsCounter.style.color = '#ff9f9f'; // Red for poor FPS
            }
        }
        
        requestAnimationFrame(updateFPS);
    }
    
    // Start FPS monitoring
    updateFPS();
}