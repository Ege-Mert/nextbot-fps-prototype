/**
 * CollisionUtils - Utility class for handling collisions
 */
export class CollisionUtils {
    constructor() {
        // No initialization needed for this utility class
    }
    
    /**
     * Check for collision with obstacles
     * @param {THREE.Scene} scene - The game scene
     * @param {THREE.Vector3} position - Position to check
     * @param {number} radius - Collision radius
     * @returns {boolean} Whether there is a collision
     */
    checkObstacleCollision(scene, position, radius) {
        // Get all obstacles in the scene
        const obstacles = scene.children.filter(child => 
            child.userData && child.userData.isObstacle
        );
        
        // Create a bounding sphere for the entity
        const entitySphere = new THREE.Sphere(position, radius);
        
        // Check each obstacle
        for (const obstacle of obstacles) {
            // Create a bounding box for the obstacle
            const obstacleBounds = new THREE.Box3().setFromObject(obstacle);
            
            // Check for intersection
            if (obstacleBounds.intersectsSphere(entitySphere)) {
                return true; // Collision detected
            }
        }
        
        return false; // No collision
    }
    
    /**
     * Check for collision with obstacles using raycasting
     * @param {THREE.Vector3} currentPos - Current position
     * @param {THREE.Vector3} newPos - New position
     * @param {number} radius - Collision radius
     * @param {THREE.Scene} scene - The game scene
     * @returns {boolean} Whether there is a collision
     */
    checkRaycastCollision(currentPos, newPos, radius, scene) {
        // Create a raycaster to check for collisions
        const direction = new THREE.Vector3().subVectors(newPos, currentPos).normalize();
        const raycaster = new THREE.Raycaster(currentPos, direction);
        
        // Get all potential obstacles
        const obstacles = scene.children.filter(child => 
            child.userData && child.userData.isObstacle
        );
        
        // Check for intersections
        const intersections = raycaster.intersectObjects(obstacles);
        
        // If there's an intersection within our movement distance plus safety radius, return true
        const moveDist = currentPos.distanceTo(newPos);
        return intersections.length > 0 && intersections[0].distance < moveDist + radius;
    }
    
    /**
     * Check if entity is on ground
     * @param {THREE.Vector3} position - Entity position
     * @param {number} height - Entity height
     * @param {THREE.Scene} scene - The game scene
     * @returns {boolean} Whether the entity is on ground
     */
    isOnGround(position, height, scene) {
        // Create a downward raycaster
        const raycaster = new THREE.Raycaster(
            new THREE.Vector3(position.x, position.y + 0.1, position.z), // Start slightly above current position
            new THREE.Vector3(0, -1, 0) // Downward direction
        );
        
        // Get ground objects
        const groundObjects = scene.children.filter(child => 
            child.userData && (child.userData.isGround || child.userData.isObstacle)
        );
        
        // Check for intersections
        const intersections = raycaster.intersectObjects(groundObjects);
        
        // If there's a close intersection, entity is on ground
        return intersections.length > 0 && intersections[0].distance <= height + 0.2;
    }
}