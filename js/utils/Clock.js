/**
 * Clock - Utility class for time tracking
 */
export class Clock {
    constructor() {
        this.startTime = 0;
        this.oldTime = 0;
        this.elapsedTime = 0;
        this.running = false;
    }
    
    /**
     * Start the clock
     */
    start() {
        this.startTime = performance.now();
        this.oldTime = this.startTime;
        this.elapsedTime = 0;
        this.running = true;
    }
    
    /**
     * Stop the clock
     */
    stop() {
        this.getElapsedTime();
        this.running = false;
    }
    
    /**
     * Get elapsed time since start or last call to getDelta
     * @returns {number} Elapsed time in seconds
     */
    getElapsedTime() {
        this.getDelta();
        return this.elapsedTime;
    }
    
    /**
     * Get time delta since last call to getDelta
     * @returns {number} Delta time in seconds
     */
    getDelta() {
        let diff = 0;
        
        if (this.running) {
            const newTime = performance.now();
            diff = (newTime - this.oldTime) / 1000; // Convert to seconds
            this.oldTime = newTime;
            this.elapsedTime += diff;
        }
        
        return diff;
    }
    
    /**
     * Reset the clock
     */
    reset() {
        this.startTime = performance.now();
        this.oldTime = this.startTime;
        this.elapsedTime = 0;
    }
}