/**
 * SceneManager - Manages the 3D scene, camera, and renderer
 */
import { GroundBuilder } from '../environment/GroundBuilder.js';
import { ObstacleBuilder } from '../environment/ObstacleBuilder.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        
        // Environment builders
        this.groundBuilder = new GroundBuilder();
        this.obstacleBuilder = new ObstacleBuilder();
    }
    
    /**
     * Initialize the scene, camera, and renderer
     */
    init() {
        // Get the canvas element
        this.canvas = document.getElementById('game-canvas');
        
        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 150); // Add fog for better distance perception
        
        // Create the camera
        this.initCamera();
        
        // Create the renderer
        this.initRenderer();
        
        // Set up lighting
        this.setupLighting();
    }
    
    /**
     * Initialize the camera with default settings
     */
    initCamera() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    }
    
    /**
     * Initialize the WebGL renderer
     */
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadow quality
    }
    
    /**
     * Set up scene lighting
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x6b6b6b);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        
        // Improve shadow quality
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        
        this.scene.add(directionalLight);
    }
    
    /**
     * Create environment elements (ground, obstacles)
     */
    createEnvironment() {
        // Create ground
        this.groundBuilder.createGround(this.scene);
        
        // Create obstacles
        this.obstacleBuilder.createObstacles(this.scene);
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Render the scene
     */
    render() {
        if (!this.scene || !this.camera || !this.renderer) return;
        this.renderer.render(this.scene, this.camera);
    }
}