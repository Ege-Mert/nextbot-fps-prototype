/**
 * FovController - Handles camera field of view (FOV) changes
 */
export class FovController {
    constructor(camera) {
        this.camera = camera;
        
        // FOV constants
        this.DEFAULT_FOV = 75;
        this.RUNNING_FOV = 85;
        this.SPRINTING_FOV = 95;
        this.WALKING_FOV = 65;
        
        // FOV transition speed
        this.FOV_CHANGE_SPEED = 5;
        
        // Set initial FOV
        this.camera.fov = this.DEFAULT_FOV;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Update camera FOV based on movement state
     * @param {number} delta - Time delta
     * @param {number} targetFOV - Target FOV to transition to
     */
    update(delta, targetFOV) {
        // Smooth transition to target FOV
        this.camera.fov += (targetFOV - this.camera.fov) * this.FOV_CHANGE_SPEED * delta;
        
        // Ensure FOV stays within reasonable bounds
        this.camera.fov = Math.max(
            this.WALKING_FOV - 5,
            Math.min(this.SPRINTING_FOV + 20, this.camera.fov)
        );
        
        // Update projection matrix when FOV changes
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Set FOV instantly to a specific value
     * @param {number} fov - The FOV value to set
     */
    setFOV(fov) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Reset FOV to default value
     */
    resetFOV() {
        this.camera.fov = this.DEFAULT_FOV;
        this.camera.updateProjectionMatrix();
    }
}