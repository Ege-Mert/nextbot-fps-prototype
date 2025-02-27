/**
 * BhopController - Handles enhanced bunny hop (bhop) mechanics
 */
export class BhopController {
    constructor() {
        // Bhop timing variables
        this.lastJumpTime = 0;
        this.lastLandTime = 0;
        this.BHOP_WINDOW = 450; // ms window to perform a successful bhop
        this.PERFECT_BHOP_WINDOW = 150; // ms window for "perfect" bhop (higher boost)
        
        // Bhop state
        this.isBhopping = false;
        this.chainCount = 0;
        this.perfectJumps = 0;
        this.comboMeter = 0; // Additional combo meter for continuous bhops
        
        // Bhop boost variables
        this.BASE_BOOST = 1.2; // Initial speed boost
        this.MAX_BOOST = 2.5; // Maximum speed boost after MAX_CHAIN_COUNT
        this.PERFECT_BOOST_MULTIPLIER = 1.15; // Extra multiplier for perfect timing
        this.MAX_CHAIN_COUNT = 10; // Maximum number of consecutive bhops
        this.currentBoost = this.BASE_BOOST;
        
        // Momentum preservation
        this.momentumLossRate = 0.85; // How quickly momentum is lost when bhop chain breaks (higher = less loss)
        this.momentumPreservationTime = 800; // ms to preserve some momentum after chain breaks
        this.lastChainBrokenTime = 0;
        
        // Timer for resetting bhop state
        this.resetTimer = null;
        
        // Visual feedback
        this.lastJumpQuality = 'NONE'; // 'NONE', 'GOOD', 'PERFECT'
        
        // Analytics
        this.bhopStats = {
            totalJumps: 0,
            successfulBhops: 0,
            perfectBhops: 0,
            longestChain: 0,
            averageTiming: 0,
            totalTiming: 0
        };
        
        // Advanced settings
        this.airAccelerationBoost = 1.3; // Air control multiplier while bhopping
        this.useStaminaSystem = false; // Optional stamina system for longer sessions
        this.stamina = 100; // Max stamina
        this.staminaPerJump = 5; // Stamina used per bhop
        this.staminaRegenRate = 10; // Stamina regenerated per second when not bhopping
    }
    
    /**
     * Handle player jumping, check for bhop
     * @param {number} jumpTime - Time when the jump occurred
     * @returns {boolean} Whether a successful bhop was performed
     */
    handleJump(jumpTime) {
        this.lastJumpTime = jumpTime;
        this.bhopStats.totalJumps++;
        
        // Clear any existing reset timers
        this.clearResetTimers();
        
        // Check for bhop timing between landing and jumping again
        const timeSinceLastLand = jumpTime - this.lastLandTime;
        
        // If there was a previous landing and it was within the bhop window
        if (this.lastLandTime > 0 && timeSinceLastLand <= this.BHOP_WINDOW) {
            // Check if it was a "perfect" bhop
            const isPerfectTiming = timeSinceLastLand <= this.PERFECT_BHOP_WINDOW;
            
            // Update jump quality for visual feedback
            this.lastJumpQuality = isPerfectTiming ? 'PERFECT' : 'GOOD';
            
            // Increment counters
            this.chainCount = Math.min(this.MAX_CHAIN_COUNT, this.chainCount + 1);
            this.bhopStats.successfulBhops++;
            
            if (isPerfectTiming) {
                this.perfectJumps++;
                this.bhopStats.perfectBhops++;
            }
            
            // Track longest chain
            if (this.chainCount > this.bhopStats.longestChain) {
                this.bhopStats.longestChain = this.chainCount;
            }
            
            // Track timing stats
            this.bhopStats.totalTiming += timeSinceLastLand;
            this.bhopStats.averageTiming = this.bhopStats.totalTiming / this.bhopStats.successfulBhops;
            
            // Calculate combo meter (0-100%)
            this.comboMeter = Math.min(100, this.comboMeter + (isPerfectTiming ? 15 : 10));
            
            // Calculate bhop boost based on chain count
            let baseBoostFactor = this.BASE_BOOST + 
                ((this.MAX_BOOST - this.BASE_BOOST) * (this.chainCount / this.MAX_CHAIN_COUNT));
            
            // Apply perfect jump multiplier if applicable
            if (isPerfectTiming) {
                baseBoostFactor *= this.PERFECT_BOOST_MULTIPLIER;
            }
            
            // Apply combo meter bonus (up to additional 10% at max combo)
            const comboBonus = 1 + (this.comboMeter / 1000); // 0-10% bonus
            this.currentBoost = baseBoostFactor * comboBonus;
            
            // Apply stamina cost if using stamina system
            if (this.useStaminaSystem) {
                this.stamina = Math.max(0, this.stamina - this.staminaPerJump);
                // If out of stamina, limit boost
                if (this.stamina <= 0) {
                    this.currentBoost = Math.min(this.currentBoost, 1.5);
                }
            }
            
            this.isBhopping = true;
            console.log(`BHOP activated! Chain: ${this.chainCount}, Quality: ${this.lastJumpQuality}, Boost: ${this.currentBoost.toFixed(2)}x`);
            
            return true;
        } else {
            // Failed bhop chain - handle momentum preservation
            if (this.chainCount > 0) {
                console.log(`BHOP chain broken! Was at ${this.chainCount}`);
                this.lastChainBrokenTime = jumpTime;
                
                // Preserve some momentum based on chain count
                const preservationFactor = Math.min(0.8, 0.5 + (this.chainCount / 20));
                this.currentBoost = this.BASE_BOOST + 
                    ((this.currentBoost - this.BASE_BOOST) * this.momentumLossRate * preservationFactor);
            }
            
            this.lastJumpQuality = 'NONE';
            this.isBhopping = false;
            this.chainCount = 0;
            this.perfectJumps = 0;
            this.comboMeter = Math.max(0, this.comboMeter - 30); // Drop combo meter
            
            return false;
        }
    }
    
    /**
     * Handle player landing
     * @param {number} landTime - Time when the landing occurred
     */
    handleLanding(landTime) {
        this.lastLandTime = landTime;
        
        // Don't reset bhop immediately on landing - give player a chance to jump again
        this.clearResetTimers();
        
        // Set a timer to reset bhop state if player doesn't jump quickly
        this.resetTimer = setTimeout(() => {
            this.resetBhop();
        }, this.BHOP_WINDOW + 100); // Give slightly more time than the bhop window
    }
    
    /**
     * Clear any existing bhop reset timers
     */
    clearResetTimers() {
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }
    
    /**
     * Reset bhop state
     */
    resetBhop() {
        if (this.isBhopping) {
            console.log('BHOP reset due to timeout');
            this.lastChainBrokenTime = Date.now();
        }
        
        this.isBhopping = false;
        this.chainCount = 0;
        this.perfectJumps = 0;
        this.comboMeter = Math.max(0, this.comboMeter - 20); // Gradually decrease combo meter
        
        // Preserve some momentum for a short time after chain breaks
        if (Date.now() - this.lastChainBrokenTime > this.momentumPreservationTime) {
            this.currentBoost = this.BASE_BOOST;
        }
    }
    
    /**
     * Update bhop state
     * @param {number} delta - Time delta
     */
    update(delta) {
        // Regenerate stamina when not bhopping
        if (this.useStaminaSystem && !this.isBhopping) {
            this.stamina = Math.min(100, this.stamina + this.staminaRegenRate * delta);
        }
        
        // Decay combo meter over time
        if (this.comboMeter > 0 && !this.isBhopping) {
            this.comboMeter = Math.max(0, this.comboMeter - (10 * delta));
        }
        
        // Momentum preservation logic
        if (!this.isBhopping && this.currentBoost > this.BASE_BOOST) {
            const timeSinceChainBroken = Date.now() - this.lastChainBrokenTime;
            
            // If we're past the momentum preservation time, gradually return to base boost
            if (timeSinceChainBroken > this.momentumPreservationTime) {
                this.currentBoost = Math.max(
                    this.BASE_BOOST,
                    this.currentBoost - ((this.currentBoost - this.BASE_BOOST) * 0.5 * delta)
                );
            }
        }
    }
    
    /**
     * Get the current air acceleration multiplier based on bhop state
     * @returns {number} Air acceleration multiplier
     */
    getAirAccelerationMultiplier() {
        if (!this.isBhopping) return 1.0;
        
        // Enhanced air control while bhopping
        // Scale with combo meter for better feel at higher chains
        const comboFactor = 1 + (this.comboMeter / 200); // 0-50% bonus
        return this.airAccelerationBoost * comboFactor;
    }
    
    /**
     * Get current bhop status information
     * @returns {Object} Bhop status info
     */
    getBhopStatus() {
        return {
            active: this.isBhopping,
            chainCount: this.chainCount,
            boost: this.currentBoost,
            quality: this.lastJumpQuality,
            comboMeter: this.comboMeter,
            perfectCount: this.perfectJumps,
            stamina: this.useStaminaSystem ? this.stamina : 100
        };
    }
    
    /**
     * Reset all bhop stats
     */
    resetStats() {
        this.bhopStats = {
            totalJumps: 0,
            successfulBhops: 0,
            perfectBhops: 0,
            longestChain: 0,
            averageTiming: 0,
            totalTiming: 0
        };
    }
}