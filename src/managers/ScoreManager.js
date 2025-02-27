export class ScoreManager {
    /**
     * @param {UIManager} uiManager - Reference to your UI manager to update score display.
     */
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.score = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.comboDuration = 3; // Seconds that the combo multiplier stays active
    }

    /**
     * Call this each frame to update combo timer.
     * @param {number} delta - Time delta since last frame (in seconds).
     */
    update(delta) {
        if (this.comboTimer > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }
    }

    /**
     * Add base score and apply the current combo multiplier.
     * @param {number} basePoints - Points to add before multiplier.
     */
    addScore(basePoints) {
        const pointsEarned = basePoints * this.comboMultiplier;
        this.score += pointsEarned;
        if (this.uiManager && typeof this.uiManager.updateScore === 'function') {
            this.uiManager.updateScore(this.score);
        }
    }

    /**
     * Add score for a successful bunny hop chain.
     * The longer the chain, the higher the bonus and combo multiplier.
     * @param {number} chainCount - Number of consecutive bhops.
     */
    addBhopScore(chainCount) {
        // For instance, each chain gives 10 base points.
        const basePoints = chainCount * 10;
        // Increase combo multiplier based on chain length (e.g., +10% per chain).
        this.comboMultiplier = 1 + chainCount * 0.1;
        // Reset the combo timer.
        this.comboTimer = this.comboDuration;
        this.addScore(basePoints);
    }

    /**
     * Add score based on air time.
     * @param {number} airTime - Time in seconds spent airborne.
     */
    addAirScore(airTime) {
        // Award 15 points per second of air time.
        const basePoints = airTime * 15;
        // Reset combo timer if needed.
        this.comboTimer = this.comboDuration;
        this.addScore(basePoints);
    }

    /**
     * Reset the combo multiplier.
     */
    resetCombo() {
        this.comboMultiplier = 1;
    }

    /**
     * Resets the overall score and combo.
     */
    resetScore() {
        this.score = 0;
        this.resetCombo();
        this.comboTimer = 0;
        if (this.uiManager && typeof this.uiManager.updateScore === 'function') {
            this.uiManager.updateScore(this.score);
        }
    }

    /**
     * Returns the current score.
     * @returns {number} Current score.
     */
    getScore() {
        return this.score;
    }
}