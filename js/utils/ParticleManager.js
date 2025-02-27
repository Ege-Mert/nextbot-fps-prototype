import * as THREE from 'three';

export class ParticleManager {
    /**
     * @param {THREE.Scene} scene - The Three.js scene to add particles to.
     */
    constructor(scene) {
        this.scene = scene;
        this.particleSystems = []; // Holds active particle systems
    }
    
    /**
     * Spawns a dust effect at a given position.
     * @param {THREE.Vector3} position - The world position for the effect.
     * @param {number} count - Number of particles (default: 20).
     * @param {number} size - Size of each particle (default: 0.5).
     * @param {number} lifetime - Lifetime in seconds (default: 1.0).
     */
    spawnDustEffect(position, count = 20, size = 0.5, lifetime = 1.0) {
        // Create a buffer geometry for the particles.
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        
        // Initialize particle positions and random velocities.
        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            // Assign a random velocity vector for dispersion.
            velocities[i * 3] = (Math.random() - 0.5) * 2;
            velocities[i * 3 + 1] = Math.random() * 2;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Use a PointsMaterial with transparency to allow fading.
        const material = new THREE.PointsMaterial({
            color: 0xAAAAAA,
            size: size,
            transparent: true,
            opacity: 1
        });
        
        // Create the particle system.
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // Store data for updating.
        const particleSystem = {
            mesh: particles,
            lifetime: lifetime,
            age: 0,
            count: count,
            velocities: velocities
        };
        
        this.particleSystems.push(particleSystem);
    }
    
    /**
     * Updates all active particle systems. Should be called every frame.
     * @param {number} delta - Time delta since last frame.
     */
    update(delta) {
        // Iterate backwards so we can safely remove expired systems.
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const ps = this.particleSystems[i];
            ps.age += delta;
            
            // Update particle positions.
            const positions = ps.mesh.geometry.attributes.position.array;
            for (let j = 0; j < ps.count; j++) {
                positions[j * 3] += ps.velocities[j * 3] * delta;
                positions[j * 3 + 1] += ps.velocities[j * 3 + 1] * delta;
                positions[j * 3 + 2] += ps.velocities[j * 3 + 2] * delta;
            }
            ps.mesh.geometry.attributes.position.needsUpdate = true;
            
            // Fade out particles as they age.
            const opacity = THREE.MathUtils.clamp(1 - (ps.age / ps.lifetime), 0, 1);
            ps.mesh.material.opacity = opacity;
            
            // Remove particle system if lifetime is exceeded.
            if (ps.age >= ps.lifetime) {
                this.scene.remove(ps.mesh);
                ps.mesh.geometry.dispose();
                ps.mesh.material.dispose();
                this.particleSystems.splice(i, 1);
            }
        }
    }
}
