/**
 * UIManager - Handles all UI elements and overlays
 */
export class UIManager {
    constructor(game) {
        this.game = game;
        
        // UI Elements
        this.instructions = null;
    }
    
    /**
     * Initialize UI elements
     */
    init() {
        // Get DOM elements
        this.instructions = document.getElementById('instructions');
    }
    
    /**
     * Toggle the visibility of the instructions element
     * @param {boolean} visible - Whether the instructions should be visible
     */
    toggleInstructions(visible) {
        if (this.instructions) {
            this.instructions.style.display = visible ? 'flex' : 'none';
        }
    }
    
    /**
     * Displays the sensitivity settings overlay.
     */
    showSensitivitySettings() {
        // If already displayed, do nothing.
        if (document.getElementById('sensitivity-settings')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'sensitivity-settings';
        overlay.style.position = 'absolute';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.padding = '20px';
        overlay.style.borderRadius = '10px';
        overlay.style.zIndex = '1000';
        overlay.style.color = '#fff';
        overlay.style.textAlign = 'center';
        
        overlay.innerHTML = `
            <h2>Sensitivity Settings</h2>
            <label for="sensitivity-slider">Mouse Sensitivity:</label><br>
            <input type="range" id="sensitivity-slider" min="0.001" max="0.01" step="0.001">
            <span id="sensitivity-value"></span>
            <br><br>
            <button id="apply-sensitivity">Apply & Resume</button>
        `;
        
        document.body.appendChild(overlay);
        
        // Initialize slider value from the current sensitivity in InputManager.
        const slider = document.getElementById('sensitivity-slider');
        const display = document.getElementById('sensitivity-value');
        // Use this.game to access inputManager
        slider.value = this.game ? this.game.inputManager.mouseSensitivity : 0.002;
        display.innerText = slider.value;
        
        slider.addEventListener('input', () => {
            display.innerText = slider.value;
        });
        
        document.getElementById('apply-sensitivity').addEventListener('click', () => {
            const newSensitivity = parseFloat(slider.value);
            if (this.game && this.game.inputManager) {
                this.game.inputManager.mouseSensitivity = newSensitivity;
            }
            // Hide the sensitivity settings overlay.
            this.hideSensitivitySettings();
            // Re-request pointer lock.
            if (this.game.inputManager && this.game.inputManager.canvas) {
                this.game.inputManager.canvas.requestPointerLock();
            }
        });
    }

    /**
     * Hides the sensitivity settings overlay.
     */
    hideSensitivitySettings() {
        const overlay = document.getElementById('sensitivity-settings');
        if (overlay) {
            overlay.parentElement.removeChild(overlay);
        }
    }
}
