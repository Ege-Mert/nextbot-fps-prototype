/**
 * HeadBobController - Handles camera head bobbing effect with added landing shake feedback
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
        
        // New properties for landing shake effect
        this.landingShake = 0; // Current intensity of the landing shake
        this.shakeDecay = 2;   // How quickly the shake effect decays (per second)
    }
    
    /**
     * Update head bobbing and landing shake effect.
     * @param {number} delta - Time delta since last frame
     * @param {number} speed - Current movement speed
     * @param {boolean} isGrounded - Whether player is on the ground
     * @param {boolean} isMoving - Whether player is moving
     */
    update(delta, speed, isGrounded, isMoving) {
        // First, update landing shake effect if active.
        if (this.landingShake > 0) {
            // Apply a slight random offset to simulate impact shake.
            const shakeX = (Math.random() - 0.5) * this.landingShake;
            const shakeY = (Math.random() - 0.5) * this.landingShake;
            this.camera.position.x += shakeX;
            this.camera.position.y += shakeY;
            // Decay the shake effect over time.
            this.landingShake = Math.max(0, this.landingShake - this.shakeDecay * delta);
        }
        
        // Proceed with head bobbing if moving and grounded.
        if (isMoving && isGrounded) {
            this.bobActive = true;
            const speedFactor = speed / 12; // Base running speed is 12
            this.bobTimer += delta * speedFactor * this.FREQUENCY;
            const verticalBob = Math.sin(this.bobTimer) * this.currentAmplitude * speedFactor;
            const lateralBob = Math.cos(this.bobTimer * 0.5) * this.currentAmplitude * 0.5 * speedFactor;
            
            // Use a smooth damping approach.
            const smoothTime = 0.15;
            const omega = 2 / smoothTime;
            const x = omega * delta;
            const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
            const targetY = verticalBob;
            const targetX = lateralBob;
            
            this.camera.position.y = this.camera.position.y * exp + targetY * (1 - exp);
            this.camera.position.x = this.camera.position.x * exp + targetX * (1 - exp);
        } else if (this.bobActive) {
            // Gradually fade out bobbing when stopping.
            this.bobActive = false;
            const smoothTime = 0.3;
            const omega = 2 / smoothTime;
            const x = omega * delta;
            const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
            this.camera.position.y = this.camera.position.y * exp;
            this.camera.position.x = this.camera.position.x * exp;
            if (Math.abs(this.camera.position.y) < 0.002) this.camera.position.y = 0;
            if (Math.abs(this.camera.position.x) < 0.002) this.camera.position.x = 0;
        }
    }
    
    /**
     * Apply a landing shake effect with a given intensity.
     * @param {number} intensity - The intensity of the shake effect.
     */
    applyLandingShake(intensity) {
        this.landingShake = intensity;
    }
    
    /**
     * Set the bob amplitude based on movement state.
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
     * Reset head bobbing to its default state.
     */
    reset() {
        this.bobTimer = 0;
        this.bobActive = false;
        this.camera.position.y = 0;
        this.camera.position.x = 0;
        this.landingShake = 0; // Reset landing shake as well
    }
}