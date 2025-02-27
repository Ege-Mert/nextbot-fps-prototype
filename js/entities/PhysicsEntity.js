/**
 * PhysicsEntity - Base class for entities that use physics
 */
export class PhysicsEntity {
    constructor() {
        // All physics entities have a velocity vector
        this.velocity = new THREE.Vector3();
        
        // Bounding box for collision detection
        this.boundingBox = null;
    }
    
    /**
     * Update the entity's bounding box based on its current position
     * @param {THREE.Mesh} mesh - The entity's mesh
     */
    updateBoundingBox(mesh) {
        if (mesh) {
            this.boundingBox = new THREE.Box3().setFromObject(mesh);
        }
    }
    
    /**
     * Check if this entity collides with another entity
     * @param {PhysicsEntity} otherEntity - The other entity to check collision with
     * @returns {boolean} Whether the entities collide
     */
    collidesWith(otherEntity) {
        if (!this.boundingBox || !otherEntity.boundingBox) {
            return false;
        }
        
        return this.boundingBox.intersectsBox(otherEntity.boundingBox);
    }
    
    /**
     * Apply physics update (to be implemented by subclasses)
     * @param {number} delta - Time delta
     */
    update(delta) {
        // Base implementation does nothing
        // Subclasses should override this method
    }
}