/**
 * UIManager - Manages game UI elements and HUD
 */
export class UIManager {
    constructor() {
        // UI elements
        this.instructionsElement = null;
        this.hudElement = null;
        this.debugInfoElement = null;
        this.bhopIndicatorElement = null;
        this.movementIndicatorElement = null;
        this.crosshairElement = null;
        
        // HUD display settings
        this.showAdvancedBhopInfo = true;
        this.showEnemyCounter = true;
        this.showDebugInfo = true;
        
        // UI animation frames for smoother transitions
        this.bhopComboAnimation = 0;
        this.bhopQualityAnimation = null;
        
        // Cached UI state
        this.lastBhopChain = 0;
        this.lastBhopQuality = 'NONE';
    }
    
    /**
     * Initialize UI elements
     */
    init() {
        // Get UI element references
        this.instructionsElement = document.getElementById('instructions');
        this.hudElement = document.getElementById('hud');
        this.debugInfoElement = document.getElementById('debug-info');
        this.bhopIndicatorElement = document.getElementById('indicator');
        this.movementIndicatorElement = document.getElementById('movement-indicator');
        this.crosshairElement = document.getElementById('crosshair');
        
        // Create advanced UI elements if they don't exist
        this.createAdvancedUIElements();
    }
    
    /**
     * Create additional UI elements for enhanced feedback
     */
    createAdvancedUIElements() {
        // Check if combo meter exists, create if not
        if (!document.getElementById('bhop-combo-meter')) {
            const comboMeter = document.createElement('div');
            comboMeter.id = 'bhop-combo-meter';
            comboMeter.className = 'combo-meter';
            comboMeter.innerHTML = '<div class="combo-fill"></div><span class="combo-text">0%</span>';
            document.body.appendChild(comboMeter);
            
            // Add CSS for combo meter
            const style = document.createElement('style');
            style.textContent = `
                .combo-meter {
                    position: absolute;
                    bottom: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 200px;
                    height: 6px;
                    background: rgba(0,0,0,0.5);
                    border-radius: 3px;
                    overflow: hidden;
                    opacity: 0;
                    transition: opacity 0.3s;
                }
                .combo-meter.active {
                    opacity: 1;
                }
                .combo-fill {
                    height: 100%;
                    width: 0%;
                    background: linear-gradient(to right, #4fc3f7, #4fc3f7 40%, #9fffbf 70%, #fffb9f 90%, #ff9f9f 100%);
                    transition: width 0.2s;
                }
                .combo-text {
                    position: absolute;
                    right: 5px;
                    top: -15px;
                    color: white;
                    font-size: 12px;
                    font-family: monospace;
                }
                .jump-quality {
                    position: absolute;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: white;
                    font-family: monospace;
                    font-size: 16px;
                    font-weight: bold;
                    text-shadow: 0 0 5px rgba(0,0,0,0.8);
                    opacity: 0;
                    transition: opacity 0.2s, transform 0.3s;
                }
                .jump-quality.good {
                    color: #9fffbf;
                }
                .jump-quality.perfect {
                    color: #fffb9f;
                    font-size: 20px;
                }
                .jump-quality.active {
                    opacity: 1;
                    transform: translateX(-50%) translateY(-10px);
                }
                .enemy-counter {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(0,0,0,0.5);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-family: monospace;
                    font-size: 14px;
                }
                .enemy-counter .enemy-count {
                    color: #ff9f9f;
                    font-weight: bold;
                }
                .difficulty-indicator {
                    position: absolute;
                    top: 40px;
                    right: 10px;
                    background: rgba(0,0,0,0.5);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-family: monospace;
                    font-size: 14px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Check if jump quality indicator exists, create if not
        if (!document.getElementById('jump-quality')) {
            const jumpQuality = document.createElement('div');
            jumpQuality.id = 'jump-quality';
            jumpQuality.className = 'jump-quality';
            document.body.appendChild(jumpQuality);
        }
        
        // Create enemy counter
        if (this.showEnemyCounter && !document.getElementById('enemy-counter')) {
            const enemyCounter = document.createElement('div');
            enemyCounter.id = 'enemy-counter';
            enemyCounter.className = 'enemy-counter';
            enemyCounter.innerHTML = 'Enemies: <span class="enemy-count">0</span>';
            document.body.appendChild(enemyCounter);
            
            // Add difficulty indicator
            const difficultyIndicator = document.createElement('div');
            difficultyIndicator.id = 'difficulty-indicator';
            difficultyIndicator.className = 'difficulty-indicator';
            difficultyIndicator.innerHTML = 'Difficulty: <span class="difficulty-level">1.00x</span>';
            document.body.appendChild(difficultyIndicator);
        }
    }
    
    /**
     * Show/hide the instructions panel
     * @param {boolean} show - Whether to show the instructions
     */
    toggleInstructions(show) {
        if (!this.instructionsElement) return;
        
        if (show) {
            this.instructionsElement.classList.remove('hidden');
        } else {
            this.instructionsElement.classList.add('hidden');
        }
    }
    
    /**
     * Update the debug info display
     * @param {Object} playerInfo - Player information to display
     * @param {Object} gameInfo - Game status information
     */
    updateDebugInfo(playerInfo, gameInfo) {
        if (!this.debugInfoElement) return;
        
        // Only show debug info if enabled
        if (!this.showDebugInfo) {
            this.debugInfoElement.innerHTML = '';
            return;
        }
        
        this.debugInfoElement.innerHTML = `
            Position: (${playerInfo.position.x.toFixed(2)}, ${playerInfo.position.y.toFixed(2)}, ${playerInfo.position.z.toFixed(2)})<br>
            Speed: ${playerInfo.currentSpeed.toFixed(2)} (${playerInfo.moveState})<br>
            FOV: ${playerInfo.fov.toFixed(1)}<br>
            Bhop Chain: ${playerInfo.bhopChainCount} (Boost: ${playerInfo.bhopBoost.toFixed(2)}x)<br>
            Bhop Combo: ${playerInfo.bhopCombo}%<br>
            Controls: WASD (move), SHIFT (sprint), ALT/CTRL (walk)<br>
            Movement Status: ${playerInfo.isGrounded ? 'Grounded' : 'In Air'}, ${playerInfo.isBhopping ? 'Bhop Active' : ''} ${playerInfo.isSliding ? 'Sliding' : ''}<br>
            Time Since Land: ${playerInfo.timeSinceLand}ms / ${playerInfo.bhopWindow}ms<br>
            Difficulty: ${gameInfo.difficultyLevel} (Skill: ${gameInfo.playerBhopSkill})<br>
            Enemies: ${gameInfo.enemyCount}
        `;
    }
    
    /**
     * Update the bhop indicator
     * @param {boolean} active - Whether bhop is active
     * @param {number} chainCount - Current bhop chain count
     * @param {number} boost - Current speed boost multiplier
     * @param {string} quality - Jump quality ('NONE', 'GOOD', 'PERFECT')
     * @param {number} comboMeter - Combo meter value (0-100)
     */
    updateBhopIndicator(active, chainCount, boost, quality, comboMeter) {
        if (!this.bhopIndicatorElement) return;
        
        // Traditional indicator
        if (active) {
            this.bhopIndicatorElement.textContent = `BHOP x${chainCount} (${boost.toFixed(2)}x)`;
            this.bhopIndicatorElement.classList.add('active');
        } else {
            this.bhopIndicatorElement.classList.remove('active');
        }
        
        // Advanced UI updates
        this.updateBhopComboMeter(comboMeter, active);
        
        // Update jump quality indicator if it's changed
        if (quality !== this.lastBhopQuality) {
            this.showJumpQualityAnimation(quality);
            this.lastBhopQuality = quality;
        }
    }
    
    /**
     * Update the bhop combo meter
     * @param {number} comboValue - Current combo meter value (0-100)
     * @param {boolean} active - Whether bhop is active
     */
    updateBhopComboMeter(comboValue, active) {
        const comboMeter = document.getElementById('bhop-combo-meter');
        if (!comboMeter) return;
        
        const comboFill = comboMeter.querySelector('.combo-fill');
        const comboText = comboMeter.querySelector('.combo-text');
        
        // Show meter if combo is above 0 or bhop is active
        if (comboValue > 0 || active) {
            comboMeter.classList.add('active');
        } else {
            comboMeter.classList.remove('active');
        }
        
        // Animate fill
        comboFill.style.width = `${comboValue}%`;
        comboText.textContent = `${Math.floor(comboValue)}%`;
    }
    
    /**
     * Show jump quality animation
     * @param {string} quality - Jump quality ('NONE', 'GOOD', 'PERFECT')
     */
    showJumpQualityAnimation(quality) {
        const jumpQuality = document.getElementById('jump-quality');
        if (!jumpQuality) return;
        
        // Clear any existing animation
        if (this.bhopQualityAnimation) {
            clearTimeout(this.bhopQualityAnimation);
        }
        
        // Reset classes
        jumpQuality.className = 'jump-quality';
        
        if (quality === 'GOOD') {
            jumpQuality.textContent = 'GOOD JUMP!';
            jumpQuality.classList.add('good');
            jumpQuality.classList.add('active');
            
            // Hide after a delay
            this.bhopQualityAnimation = setTimeout(() => {
                jumpQuality.classList.remove('active');
            }, 1000);
        } else if (quality === 'PERFECT') {
            jumpQuality.textContent = 'PERFECT JUMP!';
            jumpQuality.classList.add('perfect');
            jumpQuality.classList.add('active');
            
            // Hide after a delay
            this.bhopQualityAnimation = setTimeout(() => {
                jumpQuality.classList.remove('active');
            }, 1000);
        }
    }
    
    /**
     * Update the movement indicator
     * @param {string} moveState - Current movement state ('WALKING', 'RUNNING', 'SPRINTING', 'SLIDING')
     * @param {boolean} isBhopping - Whether bunny hop is active
     * @param {number} bhopChainCount - Current bhop chain count
     */
    updateMovementIndicator(moveState, isBhopping, bhopChainCount) {
        if (!this.movementIndicatorElement) return;
        
        this.movementIndicatorElement.textContent = moveState;
        
        // Set color based on movement state
        if (moveState === 'SPRINTING') {
            this.movementIndicatorElement.style.color = "#ff9f9f";
        } else if (moveState === 'WALKING') {
            this.movementIndicatorElement.style.color = "#9fdcff";
        } else if (moveState === 'SLIDING') {
            this.movementIndicatorElement.style.color = "#fffb9f";
        } else {
            this.movementIndicatorElement.style.color = "#ffffff";
        }
        
        // Add bhop info if active
        if (isBhopping) {
            this.movementIndicatorElement.textContent += ` + BHOP x${bhopChainCount}`;
            this.movementIndicatorElement.style.color = "#9fffbf";
        }
    }
    
    /**
     * Update the enemy counter
     * @param {number} count - Current enemy count
     * @param {number} difficultyLevel - Current difficulty level
     */
    updateEnemyCounter(count, difficultyLevel) {
        const enemyCounter = document.getElementById('enemy-counter');
        const difficultyIndicator = document.getElementById('difficulty-indicator');
        
        if (enemyCounter) {
            const enemyCountElement = enemyCounter.querySelector('.enemy-count');
            if (enemyCountElement) {
                enemyCountElement.textContent = count;
            }
        }
        
        if (difficultyIndicator) {
            const difficultyLevelElement = difficultyIndicator.querySelector('.difficulty-level');
            if (difficultyLevelElement) {
                difficultyLevelElement.textContent = `${difficultyLevel.toFixed(2)}x`;
                
                // Set color based on difficulty
                if (difficultyLevel >= 2.0) {
                    difficultyLevelElement.style.color = "#ff9f9f"; // Red for high difficulty
                } else if (difficultyLevel >= 1.5) {
                    difficultyLevelElement.style.color = "#fffb9f"; // Yellow for medium
                } else {
                    difficultyLevelElement.style.color = "#9fffbf"; // Green for low
                }
            }
        }
    }
    
    /**
     * Update the crosshair style
     * @param {boolean} isBhopping - Whether bhop is active
     */
    updateCrosshair(isBhopping) {
        if (!this.crosshairElement) return;
        
        // Make crosshair more pronounced when bhopping
        if (isBhopping) {
            this.crosshairElement.style.transform = 'translate(-50%, -50%) scale(1.2)';
            this.crosshairElement.style.opacity = '1';
        } else {
            this.crosshairElement.style.transform = 'translate(-50%, -50%) scale(1)';
            this.crosshairElement.style.opacity = '0.8';
        }
    }
    
    /**
     * Update all UI elements
     * @param {Object} playerInfo - Player information
     * @param {Object} gameInfo - Game status information
     */
    update(playerInfo, gameInfo) {
        if (!playerInfo) return;
        
        // Update debug info
        this.updateDebugInfo(playerInfo, gameInfo);
        
        // Update bhop indicator
        this.updateBhopIndicator(
            playerInfo.isBhopping,
            playerInfo.bhopChainCount,
            playerInfo.bhopBoost,
            playerInfo.bhopQuality,
            playerInfo.bhopCombo
        );
        
        // Update movement indicator
        this.updateMovementIndicator(
            playerInfo.moveState,
            playerInfo.isBhopping,
            playerInfo.bhopChainCount
        );
        
        // Update enemy counter
        this.updateEnemyCounter(
            gameInfo.enemyCount,
            parseFloat(gameInfo.difficultyLevel)
        );
        
        // Update crosshair
        this.updateCrosshair(playerInfo.isBhopping);
    }
}