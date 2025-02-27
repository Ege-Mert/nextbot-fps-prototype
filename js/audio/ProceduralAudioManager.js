import * as Tone from 'tone';

export class ProceduralAudioManager {
    constructor() {
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
    }

    /**
     * Plays a jump sound.
     */
    playJumpSound() {
        // Ensure Tone.js is started (on modern browsers this must be triggered via user interaction)
        Tone.start();
        this.jumpSynth.triggerAttackRelease("C2", "8n");
    }

    /**
     * Plays a landing sound.
     */
    playLandingSound() {
        Tone.start();
        this.landingSynth.triggerAttackRelease("E2", "8n");
    }

    /**
     * Plays a collision sound.
     */
    playCollisionSound() {
        Tone.start();
        this.collisionSynth.triggerAttackRelease("G2", "16n");
    }

    /**
     * Plays a score sound (e.g., when increasing the combo).
     */
    playScoreSound() {
        Tone.start();
        this.scoreSynth.triggerAttackRelease("A3", "16n");
    }
}
