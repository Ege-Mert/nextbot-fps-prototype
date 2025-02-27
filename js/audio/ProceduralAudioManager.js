// Using global Tone object from the script tag in index.html
// import * as Tone from 'tone';

export class ProceduralAudioManager {
    constructor() {
        // Flag to track if audio has been initialized
        this.initialized = false;
        this.jumpSynth = null;
        this.landingSynth = null;
        this.collisionSynth = null;
        this.scoreSynth = null;
    }
    
    /**
     * Initialize audio after user interaction
     * This should be called after a user gesture (click, keypress, etc.)
     */
    init() {
        if (this.initialized) return;
        
        try {
            // Create a synth for jump sounds (using a membrane synth for a deep thump)
            this.jumpSynth = new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 4,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.2, sustain: 0.2, release: 0.5 }
            }).toDestination();

            // Create a metal synth for landing sounds (a short, metallic impact)
            this.landingSynth = new Tone.MetalSynth({
                frequency: 200,
                envelope: { attack: 0.001, decay: 0.1, release: 0.3 },
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5
            }).toDestination();

            // Create a synth for enemy collision sounds (a quick, striking sound)
            this.collisionSynth = new Tone.MetalSynth({
                frequency: 300,
                envelope: { attack: 0.001, decay: 0.05, release: 0.2 },
                harmonicity: 3.0,
                modulationIndex: 25,
                resonance: 8000,
                octaves: 1.0
            }).toDestination();

            // Create a basic synth for scoring effects (e.g. when reaching a combo or high speed)
            this.scoreSynth = new Tone.Synth({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.3 }
            }).toDestination();
            
            // Start Tone.js context
            Tone.start();
            this.initialized = true;
            console.log("Audio successfully initialized");
        } catch (error) {
            console.error("Error initializing audio:", error);
        }
    }

    /**
     * Plays a jump sound.
     */
    playJumpSound() {
        if (!this.initialized || !this.jumpSynth) return;
        
        try {
            this.jumpSynth.triggerAttackRelease("C2", "8n");
        } catch (error) {
            console.error("Error playing jump sound:", error);
        }
    }

    /**
     * Plays a landing sound.
     */
    playLandingSound() {
        if (!this.initialized || !this.landingSynth) return;
        
        try {
            this.landingSynth.triggerAttackRelease("E2", "8n");
        } catch (error) {
            console.error("Error playing landing sound:", error);
        }
    }

    /**
     * Plays a collision sound.
     */
    playCollisionSound() {
        if (!this.initialized || !this.collisionSynth) return;
        
        try {
            this.collisionSynth.triggerAttackRelease("G2", "16n");
        } catch (error) {
            console.error("Error playing collision sound:", error);
        }
    }

    /**
     * Plays a score sound (e.g., when increasing the combo).
     */
    playScoreSound() {
        if (!this.initialized || !this.scoreSynth) return;
        
        try {
            this.scoreSynth.triggerAttackRelease("A3", "16n");
        } catch (error) {
            console.error("Error playing score sound:", error);
        }
    }
}
