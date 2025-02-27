/**
 * GroundBuilder - Responsible for creating the ground
 */
export class GroundBuilder {
    constructor() {
        this.groundSize = 200; // Size of the ground plane
    }
    
    /**
     * Create the ground and add it to the scene
     * @param {THREE.Scene} scene - The scene to add the ground to
     */
    createGround(scene) {
        // Create a grid helper for visual reference
        const gridHelper = new THREE.GridHelper(this.groundSize, 20, 0x000000, 0x444444);
        gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
        scene.add(gridHelper);
        
        // Create the main ground plane
        const groundGeometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3b7d4e, // Green color for grass
            roughness: 0.8,
            metalness: 0.1
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = 0;
        ground.receiveShadow = true;
        ground.name = 'ground';
        
        // Add collision data
        ground.userData.isGround = true;
        
        scene.add(ground);
        
        return ground;
    }
}