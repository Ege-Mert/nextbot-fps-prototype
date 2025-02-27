/**
 * ScoreManager - Manages game scoring system
 */
export class ScoreManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.killCount = 0;
        this.comboMultiplier = 1;
        this.lastKillTime = 0;
        this.comboTimeout = 5000; // 5 seconds to maintain combo
    }

    /**
     * Update method for time-based logic like combo decay
     * @param {number} delta - Time elapsed since last update
     */
    update(delta) {
        // Check for combo timeout
        const now = Date.now();
        if (this.comboMultiplier > 1 && now - this.lastKillTime > this.comboTimeout) {
            // Reset combo if timeout expired
            this.comboMultiplier = 1;
            this.updateUI(); // Update UI to show reset combo
        }
    }

    /**
     * Add points to the score
     * @param {number} points - Points to add
     * @param {boolean} isKill - Whether the points are from a kill
     */
    addPoints(points, isKill = false) {
        const now = Date.now();
        
        // Update combo system
        if (isKill) {
            this.killCount++;
            
            // Check if within combo time
            if (now - this.lastKillTime < this.comboTimeout) {
                this.comboMultiplier = Math.min(this.comboMultiplier + 0.5, 5); // Max 5x multiplier
            } else {
                this.comboMultiplier = 1; // Reset combo
            }
            
            this.lastKillTime = now;
        }
        
        // Apply combo multiplier
        const pointsToAdd = Math.floor(points * this.comboMultiplier);
        this.score += pointsToAdd;
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        
        // Update UI
        this.updateUI(pointsToAdd);
        
        return pointsToAdd;
    }
    
    /**
     * Update the UI with current score info
     */
    updateUI(pointsAdded = 0) {
        const scoreData = {
            score: this.score,
            highScore: this.highScore,
            killCount: this.killCount,
            comboMultiplier: this.comboMultiplier,
            pointsAdded: pointsAdded
        };
        
        this.uiManager.updateScore(scoreData);
    }
    
    /**
     * Reset the score
     */
    reset() {
        this.score = 0;
        this.killCount = 0;
        this.comboMultiplier = 1;
        this.lastKillTime = 0;
        this.updateUI();
    }
    
    /**
     * Load high score from local storage
     */
    loadHighScore() {
        const savedScore = localStorage.getItem('nextbotFPS_highScore');
        return savedScore ? parseInt(savedScore) : 0;
    }
    
    /**
     * Save high score to local storage
     */
    saveHighScore() {
        localStorage.setItem('nextbotFPS_highScore', this.highScore.toString());
    }
}
