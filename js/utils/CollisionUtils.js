/**
 * CollisionUtils - Utility class for handling collisions
 */
export class CollisionUtils {
    constructor() {
        // Collision detection settings
        this.MAX_STEP_HEIGHT = 0.25; // Maximum height player can step up
        this.COLLISION_BUFFER = 0.1; // Small buffer to prevent getting too close to obstacles
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
     * Check for collision with obstacles using multiple raycasting for better accuracy
     * @param {THREE.Vector3} currentPos - Current position
     * @param {THREE.Vector3} newPos - Proposed new position
     * @param {number} radius - Collision radius
     * @param {THREE.Scene} scene - The game scene
     * @param {number} rayCount - Number of rays to cast (higher = more accurate but costly)
     * @returns {Object} Collision result with hit point and normal
     */
    checkDetailedCollision(currentPos, newPos, radius, scene, rayCount = 8) {
        // Direction and distance
        const direction = new THREE.Vector3().subVectors(newPos, currentPos).normalize();
        const distance = currentPos.distanceTo(newPos) + radius + this.COLLISION_BUFFER;
        
        // Get all potential obstacles
        const obstacles = scene.children.filter(child => 
            child.userData && child.userData.isObstacle
        );
        
        // Result object
        const result = {
            collision: false,
            hitPoint: null,
            hitNormal: null,
            distance: Infinity
        };
        
        // Cast rays in all directions
        for (let i = 0; i < rayCount; i++) {
            // Calculate angle for this ray
            const angle = (i / rayCount) * Math.PI * 2;
            
            // Create offset perpendicular to movement direction
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
            
            // Apply rotation based on angle
            const offsetX = Math.cos(angle) * radius;
            const offsetZ = Math.sin(angle) * radius;
            
            // Calculate ray origin with offset
            const rayOrigin = new THREE.Vector3(
                currentPos.x + offsetX,
                currentPos.y,
                currentPos.z + offsetZ
            );
            
            // Create the raycaster
            const raycaster = new THREE.Raycaster(rayOrigin, direction, 0, distance);
            
            // Check for intersections
            const intersections = raycaster.intersectObjects(obstacles);
            
            // If this ray hit something closer than previous hits, update result
            if (intersections.length > 0 && intersections[0].distance < result.distance) {
                result.collision = true;
                result.hitPoint = intersections[0].point;
                result.hitNormal = intersections[0].face ? intersections[0].face.normal : null;
                result.distance = intersections[0].distance;
            }
        }
        
        return result;
    }
    
    /**
     * Calculate slide direction when hitting a wall
     * @param {THREE.Vector3} moveDirection - Original movement direction
     * @param {THREE.Vector3} hitNormal - Normal of the surface hit
     * @returns {THREE.Vector3} Slide direction
     */
    calculateSlideDirection(moveDirection, hitNormal) {
        // If no normal is available, just reverse the direction
        if (!hitNormal) {
            return moveDirection.clone().negate();
        }
        
        // Project the movement direction onto the plane defined by the hit normal
        // R = D - 2(D·N)N where D is the incident direction, N is the normal
        const dot = moveDirection.dot(hitNormal);
        
        const slideDirection = new THREE.Vector3()
            .copy(moveDirection)
            .sub(hitNormal.clone().multiplyScalar(2 * dot));
        
        // Ensure slide direction is horizontal (no vertical component)
        slideDirection.y = 0;
        slideDirection.normalize();
        
        return slideDirection;
    }
    
    /**
     * Check if entity can step up over an obstacle
     * @param {THREE.Scene} scene - The game scene
     * @param {THREE.Vector3} position - Current position
     * @param {THREE.Vector3} direction - Movement direction
     * @param {number} radius - Entity radius
     * @returns {boolean} Whether stepping is possible
     */
    canStepUp(scene, position, direction, radius) {
        // Cast a ray downward from a position slightly above current + step height
        const stepUpPos = new THREE.Vector3(
            position.x + direction.x * (radius + 0.1),
            position.y + this.MAX_STEP_HEIGHT + 0.1, // Check slightly above step height
            position.z + direction.z * (radius + 0.1)
        );
        
        // Cast ray downward to check for ground
        const raycaster = new THREE.Raycaster(
            stepUpPos,
            new THREE.Vector3(0, -1, 0),
            0,
            this.MAX_STEP_HEIGHT + 0.2
        );
        
        // Get all obstacles that could be stepped on
        const obstacles = scene.children.filter(child =>
            child.userData && (child.userData.isObstacle || child.userData.isGround)
        );
        
        // Check for ground intersection
        const intersections = raycaster.intersectObjects(obstacles);
        
        // If we hit something, stepping is possible
        return intersections.length > 0;
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
     * Find a safe position to move to when collision occurs
     * @param {THREE.Scene} scene - The game scene
     * @param {THREE.Vector3} currentPos - Current position
     * @param {THREE.Vector3} targetPos - Desired target position
     * @param {number} radius - Entity radius
     * @returns {THREE.Vector3} Safe position to move to
     */
    findSafePosition(scene, currentPos, targetPos, radius) {
        // Create movement vector
        const moveVec = new THREE.Vector3().subVectors(targetPos, currentPos);
        const moveDir = moveVec.clone().normalize();
        const moveDist = moveVec.length();
        
        // If no movement or tiny movement, return current position
        if (moveDist < 0.001) return currentPos.clone();
        
        // Check for collision using detailed method
        const collision = this.checkDetailedCollision(
            currentPos,
            targetPos,
            radius,
            scene
        );
        
        // If no collision, target position is safe
        if (!collision.collision) return targetPos.clone();
        
        // If collision, try to find a safe distance
        let safeDistance = collision.distance - radius - this.COLLISION_BUFFER;
        if (safeDistance < 0) safeDistance = 0;
        
        // Calculate safe position
        const safePos = new THREE.Vector3().copy(currentPos).add(
            moveDir.multiplyScalar(safeDistance)
        );
        
        // Check if we can step up instead
        if (this.canStepUp(scene, currentPos, moveDir, radius)) {
            // Allow movement with slight adjustments
            const stepPos = new THREE.Vector3().copy(targetPos);
            stepPos.y += this.MAX_STEP_HEIGHT;
            return stepPos;
        }
        
        // If not, try sliding
        if (collision.hitNormal) {
            const slideDir = this.calculateSlideDirection(moveDir, collision.hitNormal);
            
            // Calculate a potential slide position
            const slidePos = new THREE.Vector3().copy(safePos).add(
                slideDir.multiplyScalar(moveDist * 0.5) // Half the original movement
            );
            
            // Check if slide position is safe
            if (!this.checkObstacleCollision(scene, slidePos, radius)) {
                return slidePos;
            }
        }
        
        // Return the safe position
        return safePos;
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