/**
 * Game - Core game class that initializes and manages the game loop
 */
import { SceneManager } from './SceneManager.js';
import { InputManager } from '../controllers/InputManager.js';
import { UIManager } from './UIManager.js';
import { EntityManager } from './EntityManager.js';
import { Clock } from '../utils/Clock.js';
import { ParticleManager } from '../utils/ParticleManager.js';
import { ProceduralAudioManager } from '../audio/ProceduralAudioManager.js';
import { ScoreManager } from '../utils/ScoreManager.js';
import { SlowMotionManager } from '../utils/SlowMotionManager.js';

export class Game {
    constructor() {
        this.sceneManager = new SceneManager();
        this.inputManager = new InputManager(this);
        this.uiManager = new UIManager();
        this.entityManager = new EntityManager(this);
        this.clock = new Clock();
        
        // Initialize audio manager
        this.audioManager = new ProceduralAudioManager();
        
        // Initialize score manager
        this.scoreManager = new ScoreManager(this.uiManager);
        
        // Initialize slow motion manager
        this.slowMotionManager = new SlowMotionManager();
        
        // Initialize game state
        this.isRunning = false;
        this.isPaused = false;
        
        // Performance optimization
        this.useOctree = true;
        this.enableFrustumCulling = true;
        this.enableLOD = true;
        
        // Bind methods to maintain proper 'this' context
        this.update = this.update.bind(this);
        this.start = this.start.bind(this);
        this.togglePause = this.togglePause.bind(this);
    }
    
    /**
     * Initialize the game
     */
    init() {
        console.log('Initializing Nextbot FPS Prototype...');
        
        // Initialize managers
        this.sceneManager.init();
        this.inputManager.init();
        this.uiManager.init();
        
        // Initialize particle manager
        this.particleManager = new ParticleManager(this.sceneManager.scene);
        
        // Setup the player
        this.entityManager.createPlayer(this.sceneManager.scene, this.sceneManager.camera);
        
        // Create environment
        this.sceneManager.createEnvironment();
        
        // Spawn initial enemies
        this.entityManager.spawnEnemies(this.entityManager.MAX_ENEMIES, true);
        
        // Performance optimizations
        if (this.useOctree) {
            this.initializeOctree();
        }
        
        // Set up key bindings for game control
        this.setupGameControls();
        
        // Everything is ready, start the game
        this.start();
    }
    
    /**
     * Set up additional game control key bindings
     */
    setupGameControls() {
        // Pause game on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyP') {
                this.togglePause();
            }
        });
    }
    
    /**
     * Initialize octree for spatial partitioning (performance optimization)
     */
    initializeOctree() {
        // Simple implementation for the prototype
        // In a full implementation, we would use a proper octree library
        this.sceneManager.initializeOctree();
    }
    
    /**
     * Start the game loop
     */
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.clock.start();
            this.update();
        }
    }
    
    /**
     * Pause the game
     */
    pause() {
        this.isPaused = true;
    }
    
    /**
     * Resume the game
     */
    resume() {
        this.isPaused = false;
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        // Show/hide pause menu
        // TODO: Implement pause menu
        console.log(`Game ${this.isPaused ? 'paused' : 'resumed'}`);
    }
    
    /**
     * Main game update loop
     */
    update() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(this.update);
        
        // Skip updates if paused
        if (this.isPaused) return;
        
        // Get raw delta time from the clock
        const rawDelta = Math.min(0.1, this.clock.getDelta());
        
        // Update slow-motion manager with raw delta time
        this.slowMotionManager.update(rawDelta);
        
        // Apply time scale to get adjusted delta for game logic
        const delta = rawDelta * this.slowMotionManager.getTimeScale();
        
        // Update score manager (for combo decay, etc.)
        this.scoreManager.update(delta);
        
        // Update all game entities
        this.entityManager.update(delta);
        
        // Update particle systems
        this.particleManager.update(delta);
        
        // Performance optimization: Frustum culling
        if (this.enableFrustumCulling) {
            this.sceneManager.updateFrustumCulling(this.sceneManager.camera);
        }
        
        // Render the scene
        this.sceneManager.render();
        
        // Update UI with player and game info
        if (this.entityManager.player) {
            const playerInfo = this.entityManager.player.getPlayerInfo(this.entityManager.enemies.length);
            const gameInfo = this.entityManager.getGameStatus();
            this.uiManager.update(playerInfo, gameInfo);
        }
    }
    
    /**
     * Handle window resize events
     */
    handleResize() {
        this.sceneManager.handleResize();
    }
    
    /**
     * Clean up resources when game is destroyed
     */
    cleanup() {
        this.isRunning = false;
        this.sceneManager.cleanup();
        this.entityManager.clearEnemies();
        // Remove event listeners
        // TODO: Implement proper event listener cleanup
    }
}