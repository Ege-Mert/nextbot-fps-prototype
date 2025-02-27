/**
 * ObstacleBuilder - Responsible for creating obstacles in the game world
 */
export class ObstacleBuilder {
    constructor() {
        // Configuration for random obstacle generation
        this.boxCount = 10;
        this.rampCount = 5;
        this.minDistance = 15; // Minimum distance from center
    }
    
    /**
     * Create obstacles and add them to the scene
     * @param {THREE.Scene} scene - The scene to add obstacles to
     */
    createObstacles(scene) {
        // Create boxes
        this.createBoxes(scene);
        
        // Create ramps
        this.createRamps(scene);
    }
    
    /**
     * Create box obstacles
     * @param {THREE.Scene} scene - The scene to add boxes to
     */
    createBoxes(scene) {
        for (let i = 0; i < this.boxCount; i++) {
            const size = 2 + Math.random() * 3;
            const height = 1 + Math.random() * 4;
            
            const boxGeometry = new THREE.BoxGeometry(size, height, size);
            const boxMaterial = new THREE.MeshStandardMaterial({
                color: 0x808080 + Math.random() * 0x7f7f7f, // Random gray color
                roughness: 0.7,
                metalness: 0.2
            });
            
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            
            // Random position, but keep away from center (player spawn)
            const distance = this.minDistance + Math.random() * 60;
            const angle = Math.random() * Math.PI * 2;
            box.position.x = Math.cos(angle) * distance;
            box.position.z = Math.sin(angle) * distance;
            box.position.y = height / 2;
            
            box.castShadow = true;
            box.receiveShadow = true;
            
            // Add collision metadata
            box.userData.isObstacle = true;
            
            scene.add(box);
        }
    }
    
    /**
     * Create ramp obstacles
     * @param {THREE.Scene} scene - The scene to add ramps to
     */
    createRamps(scene) {
        for (let i = 0; i < this.rampCount; i++) {
            const rampGeometry = new THREE.BoxGeometry(8, 4, 12);
            const rampMaterial = new THREE.MeshStandardMaterial({
                color: 0xccaa88,
                roughness: 0.5
            });
            
            const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
            
            // Random position, but keep away from center
            const distance = 20 + Math.random() * 40;
            const angle = Math.random() * Math.PI * 2;
            ramp.position.x = Math.cos(angle) * distance;
            ramp.position.z = Math.sin(angle) * distance;
            ramp.position.y = 2;
            
            // Rotate ramp to create slope
            ramp.rotation.x = -Math.PI / 12; // 15 degrees
            ramp.rotation.y = Math.random() * Math.PI * 2;
            
            ramp.castShadow = true;
            ramp.receiveShadow = true;
            
            // Add collision tag
            ramp.userData.isObstacle = true;
            
            scene.add(ramp);
        }
    }
}