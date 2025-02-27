/**
 * SlowMotionManager - Handles time dilation effects in the game
 */
export class SlowMotionManager {
    constructor() {
        // The current time scale used by the game (1 = normal speed)
        this.timeScale = 1;
        // When slow motion is triggered, store the initial scale here.
        this.initialSlowMoScale = 1;
        // Duration of the slow-motion effect (in seconds)
        this.slowMoDuration = 0;
        // Timer for the slow-motion effect (in seconds)
        this.slowMoTimer = 0;
    }

    /**
     * Trigger a slow-motion effect.
     * @param {number} newScale - The new time scale to apply (e.g., 0.2 for 20% speed).
     * @param {number} duration - Duration in seconds for the slow-motion effect.
     */
    triggerSlowMotion(newScale, duration) {
        this.initialSlowMoScale = newScale;
        this.timeScale = newScale;
        this.slowMoDuration = duration;
        this.slowMoTimer = duration;
    }

    /**
     * Update the slow-motion effect. Call this every frame.
     * @param {number} delta - Raw time delta (in seconds) since the last frame.
     */
    update(delta) {
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= delta;
            // Calculate interpolation factor: 0 when just triggered, 1 when timer expires.
            const t = 1 - (this.slowMoTimer / this.slowMoDuration);
            // Linearly interpolate from the initial slow motion scale back to 1.
            this.timeScale = this.initialSlowMoScale + t * (1 - this.initialSlowMoScale);
            if (this.slowMoTimer <= 0) {
                this.timeScale = 1;
            }
        }
    }

    /**
     * Returns the current time scale.
     * @returns {number} Current time scale.
     */
    getTimeScale() {
        return this.timeScale;
    }
}
