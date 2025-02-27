/**
 * InputManager - Handles user inputs (keyboard and mouse)
 */
export class InputManager {
    constructor(game) {
        this.game = game;
        
        // Key state tracking
        this.keys = {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            isSprinting: false,
            isWalking: false
        };
        
        // Mouse settings
        this.mouseSensitivity = 0.002;
        this.pointerLocked = false;
        
        // References to DOM elements
        this.canvas = null;
        this.instructions = null;
        
        // Bind methods to maintain proper 'this' context
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.lockChangeAlert = this.lockChangeAlert.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
    }
    
    /**
     * Initialize input handlers
     */
    init() {
        // Get DOM elements
        this.canvas = document.getElementById('game-canvas');
        this.instructions = document.getElementById('instructions');
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Click event to enable pointer lock controls
        this.instructions.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });
        
        // Pointer lock event handlers
        document.addEventListener('pointerlockchange', this.lockChangeAlert, false);
        
        // Keyboard controls
        document.addEventListener('keydown', this.onKeyDown, false);
        document.addEventListener('keyup', this.onKeyUp, false);
        
        // Window resize handler
        window.addEventListener('resize', this.onWindowResize, false);
    }
    
    /**
     * Handle pointer lock changes
     */
    lockChangeAlert() {
        if (document.pointerLockElement === this.canvas) {
            // Pointer is locked, enable mouse movement listener
            document.addEventListener('mousemove', this.onMouseMove, false);
            this.pointerLocked = true;
            
            // Hide instructions
            this.game.uiManager.toggleInstructions(false);
        } else {
            // Pointer is unlocked, disable mouse movement listener
            document.removeEventListener('mousemove', this.onMouseMove, false);
            this.pointerLocked = false;
            
            // Show instructions
            this.game.uiManager.toggleInstructions(true);
        }
    }
    
    /**
     * Handle mouse movement for camera rotation
     * @param {MouseEvent} event - Mouse movement event
     */
    onMouseMove(event) {
        if (!this.pointerLocked) return;
        
        // Get mouse movement with a safety check against browser inconsistencies
        const movementX = event.movementX !== undefined ? event.movementX : 0;
        const movementY = event.movementY !== undefined ? event.movementY : 0;
        
        // Only process if we have valid movement values
        if (isNaN(movementX) || isNaN(movementY)) return;
        
        // Pass movement to player camera system with lower sensitivity (more precise control)
        // We've made input more responsive, so sensitivity can be reduced
        this.game.entityManager.player.handleMouseMovement(
            movementX, 
            movementY, 
            this.mouseSensitivity
        );
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} event - Key down event
     */
    onKeyDown(event) {
        // Always handle ESC to show sensitivity settings
        if (event.code === 'Escape') {
            // Show the sensitivity settings overlay.
            this.game.uiManager.showSensitivitySettings();
            // Exit pointer lock (if not already)
            document.exitPointerLock();
            return; // Prevent further processing.
        }
        
        // For other keys, only process if pointer is locked.
        if (!this.pointerLocked) return;
        
        switch (event.code) {
            case 'KeyW':
                this.keys.moveForward = true;
                break;
            case 'KeyS':
                this.keys.moveBackward = true;
                break;
            case 'KeyA':
                this.keys.moveLeft = true;
                break;
            case 'KeyD':
                this.keys.moveRight = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.isSprinting = true;
                this.keys.isWalking = false;
                break;
            case 'AltLeft':
            case 'AltRight':
            case 'ControlLeft':
            case 'ControlRight':
                this.keys.isWalking = true;
                this.keys.isSprinting = false;
                break;
            case 'Space':
                if (this.game.entityManager.player) {
                    this.game.entityManager.player.jump();
                }
                break;
            case 'KeyB': 
                this.toggleDebugMode();
                break;
        }
        this.updatePlayerMovement();
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} event - Key up event
     */
    onKeyUp(event) {
        if (!this.pointerLocked) return;
        
        switch (event.code) {
            case 'KeyW':
                this.keys.moveForward = false;
                break;
            case 'KeyS':
                this.keys.moveBackward = false;
                break;
            case 'KeyA':
                this.keys.moveLeft = false;
                break;
            case 'KeyD':
                this.keys.moveRight = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.isSprinting = false;
                break;
            case 'AltLeft':
            case 'AltRight':
            case 'ControlLeft':
            case 'ControlRight':
                this.keys.isWalking = false;
                break;
        }
        
        // Update player movement state
        this.updatePlayerMovement();
    }
    
    /**
     * Update player movement based on current key states
     */
    updatePlayerMovement() {
        if (this.game.entityManager.player) {
            this.game.entityManager.player.setMovementFromInput(this.keys);
        }
    }
    
    /**
     * Toggle debug mode
     */
    toggleDebugMode() {
        // This could be expanded for more debugging features
        console.log('Debug mode toggled');
    }
    
    /**
     * Handle window resize event
     */
    onWindowResize() {
        this.game.handleResize();
    }
}