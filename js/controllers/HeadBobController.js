/**
 * HeadBobController - Handles camera head bobbing effect
 */
export class HeadBobController {
    constructor(camera) {
        this.camera = camera;
        
        // Head bobbing variables
        this.bobTimer = 0;
        this.bobActive = false;
        
        // Bob amplitude settings
        this.DEFAULT_AMPLITUDE = 0.035;
        this.SPRINT_AMPLITUDE = 0.05;
        this.WALK_AMPLITUDE = 0.02;
        this.currentAmplitude = this.DEFAULT_AMPLITUDE;
        
        // Bob frequency
        this.FREQUENCY = 8;
    }
    
    /**
     * Update head bobbing effect
     * @param {number} delta - Time delta
     * @param {number} speed - Current movement speed
     * @param {boolean} isGrounded - Whether player is on the ground
     * @param {boolean} isMoving - Whether player is moving
     */
    update(delta, speed, isGrounded, isMoving) {
        if (isMoving && isGrounded) {
            // Only bob when moving and grounded
            this.bobActive = true;
            
            // Scale bobbing speed with movement speed
            const speedFactor = speed / 12; // 12 is base running speed
            this.bobTimer += delta * speedFactor * this.FREQUENCY;
            
            // Calculate bob effect with dampening for smoother motion
            const verticalBob = Math.sin(this.bobTimer) * this.currentAmplitude * speedFactor;
            const lateralBob = Math.cos(this.bobTimer * 0.5) * this.currentAmplitude * 0.5 * speedFactor;
            
            // Use smoothDamp-like approach for camera movement
            const smoothTime = 0.15; // Lower value = faster response
            const omega = 2 / smoothTime;
            const x = omega * delta;
            const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
            
            // Apply smooth damping to camera position
            const targetY = verticalBob;
            const targetX = lateralBob;
            
            this.camera.position.y = this.camera.position.y * exp + targetY * (1 - exp);
            this.camera.position.x = this.camera.position.x * exp + targetX * (1 - exp);
        } else if (this.bobActive) {
            // Gradually fade out the bob when stopping
            this.bobActive = false;
            
            // Use smooth damping approach for stopping
            const smoothTime = 0.3; // Higher value = slower stop
            const omega = 2 / smoothTime;
            const x = omega * delta;
            const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
            
            this.camera.position.y = this.camera.position.y * exp;
            this.camera.position.x = this.camera.position.x * exp;
            
            // Reset to zero if very small values to avoid floating point issues
            if (Math.abs(this.camera.position.y) < 0.002) this.camera.position.y = 0;
            if (Math.abs(this.camera.position.x) < 0.002) this.camera.position.x = 0;
        }
    }
    
    /**
     * Set the bob amplitude based on movement state
     * @param {string} moveState - Current movement state ('WALKING', 'RUNNING', 'SPRINTING')
     */
    setAmplitudeForState(moveState) {
        if (moveState === 'SPRINTING') {
            this.currentAmplitude = this.SPRINT_AMPLITUDE;
        } else if (moveState === 'WALKING') {
            this.currentAmplitude = this.WALK_AMPLITUDE;
        } else {
            this.currentAmplitude = this.DEFAULT_AMPLITUDE;
        }
    }
    
    /**
     * Reset head bob to default state
     */
    reset() {
        this.bobTimer = 0;
        this.bobActive = false;
        this.camera.position.y = 0;
        this.camera.position.x = 0;
    }
}