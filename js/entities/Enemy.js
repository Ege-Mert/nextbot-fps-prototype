/**
 * Enemy - Represents an enemy in the game with improved Nextbot-style AI
 */
import { PhysicsEntity } from './PhysicsEntity.js';
import { CollisionUtils } from '../utils/CollisionUtils.js';
import { PathfindingService } from '../utils/PathfindingService.js';

export class Enemy extends PhysicsEntity {
    constructor(scene, spawnPosition, speedMultiplier = 1.0) {
        super();
        
        this.scene = scene;
        this.speedMultiplier = speedMultiplier;
        
        // Enemy constants
        this.HEIGHT = 2.5;
        this.WIDTH = 1.5;
        this.BASE_SPEED = 5;
        
        // Calculate actual speed using multiplier
        this.speed = this.BASE_SPEED * this.speedMultiplier;
        
        // AI settings
        this.detectionRange = 100; // How far the enemy can detect the player
        this.updateInterval = 500; // ms between path recalculations
        this.lastPathUpdate = 0;
        this.targetPosition = null;
        this.currentPath = [];
        this.currentPathIndex = 0;
        this.stuckCounter = 0;
        this.maxStuckCount = 5;
        this.lastPosition = new THREE.Vector3();
        this.stuckThreshold = 0.5; // Distance threshold to consider enemy stuck
        
        // Create the enemy mesh
        this.createMesh(spawnPosition);
        
        // Utility classes
        this.collisionUtils = new CollisionUtils();
        this.pathfinding = new PathfindingService(scene);
        
        // Special abilities
        this.canJump = true;
        this.jumpCooldown = 0;
        this.jumpForce = 8;
        this.jumpProbability = 0.02; // 2% chance per frame to jump when chasing
        
        // State machine for more complex behaviors
        this.state = 'IDLE';
        this.states = {
            IDLE: {
                update: this.updateIdle.bind(this)
            },
            CHASE: {
                update: this.updateChase.bind(this)
            },
            FLANK: {
                update: this.updateFlank.bind(this)
            },
            STUCK: {
                update: this.updateStuck.bind(this)
            }
        };
        
        // Initialize velocity
        this.velocity = new THREE.Vector3();
    }
    
    /**
     * Create the enemy mesh and add it to the scene
     * @param {THREE.Vector3} position - Spawn position
     */
    createMesh(position) {
        // Create more interesting enemy geometry
        const bodyGeometry = new THREE.BoxGeometry(this.WIDTH, this.HEIGHT * 0.8, 1);
        const headGeometry = new THREE.BoxGeometry(this.WIDTH * 0.8, this.HEIGHT * 0.3, 0.9);
        
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,  // Red color for the enemy
            emissive: 0x550000, // Slight glow
            roughness: 0.5
        });
        
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3333,  // Slightly lighter red
            emissive: 0x550000,
            roughness: 0.7
        });
        
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
        
        // Group the body and head together
        this.mesh = new THREE.Group();
        this.mesh.add(this.bodyMesh);
        this.mesh.add(this.headMesh);
        
        // Position the head on top of the body
        this.headMesh.position.y = this.HEIGHT * 0.4;
        
        // Set position
        this.mesh.position.copy(position);
        this.mesh.position.y = this.HEIGHT / 2; // Center vertically
        
        // Store initial position for stuck detection
        this.lastPosition.copy(this.mesh.position);
        
        // Enable shadows
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.headMesh.castShadow = true;
        this.headMesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Create initial bounding box
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
    }
    
    /**
     * Update enemy position and behavior
     * @param {number} delta - Time delta
     * @param {THREE.Vector3} playerPosition - Current player position
     * @param {THREE.Scene} scene - Game scene
     * @param {number} playerSpeed - Current player speed for dynamic difficulty
     */
    update(delta, playerPosition, scene, playerSpeed = 0) {
        // Apply gravity (for jumping enemies)
        this.velocity.y -= 20 * delta; // Gravity
        
        // Check if on ground
        const isOnGround = this.collisionUtils.isOnGround(
            this.mesh.position, 
            this.HEIGHT / 2,
            scene
        );
        
        if (isOnGround && this.velocity.y < 0) {
            this.velocity.y = 0;
            this.mesh.position.y = this.HEIGHT / 2;
            this.canJump = true;
        }
        
        // Apply vertical velocity
        this.mesh.position.y += this.velocity.y * delta;
        
        // Ensure enemy stays above ground
        if (this.mesh.position.y < this.HEIGHT / 2) {
            this.mesh.position.y = this.HEIGHT / 2;
            this.velocity.y = 0;
        }
        
        // Update jump cooldown
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= delta;
        }
        
        // Check if stuck by comparing current position to last position
        const distanceMoved = this.mesh.position.distanceTo(this.lastPosition);
        if (distanceMoved < this.stuckThreshold) {
            this.stuckCounter++;
            if (this.stuckCounter > this.maxStuckCount && this.state !== 'STUCK') {
                this.setState('STUCK');
            }
        } else {
            this.stuckCounter = 0;
            this.lastPosition.copy(this.mesh.position);
        }
        
        // Dynamic speed adjustment based on player's speed - makes enemies more challenging
        // when player is using bhop effectively
        const speedModifier = 1.0 + (Math.min(playerSpeed, 30) / 30) * 0.5; // Up to 50% faster
        this.speed = this.BASE_SPEED * this.speedMultiplier * speedModifier;
        
        // Determine if player is within detection range
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        
        if (distanceToPlayer <= this.detectionRange) {
            // Player detected, enter chase mode if not already
            if (this.state !== 'CHASE' && this.state !== 'FLANK' && this.state !== 'STUCK') {
                // 80% chance to chase directly, 20% chance to try flanking
                this.setState(Math.random() < 0.8 ? 'CHASE' : 'FLANK');
            }
            
            // Update target position
            this.targetPosition = playerPosition.clone();
        } else {
            // Player out of range, go idle
            if (this.state !== 'IDLE') {
                this.setState('IDLE');
            }
        }
        
        // Execute current state's update behavior
        if (this.state && this.states[this.state]) {
            this.states[this.state].update(delta, playerPosition);
        }
        
        // Update the enemy's bounding box
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
    }
    
    /**
     * Change enemy state
     * @param {string} newState - New state to transition to
     */
    setState(newState) {
        // Don't change if already in this state
        if (this.state === newState) return;
        
        // Exit current state
        if (this.state === 'STUCK') {
            // Reset stuck counter when leaving stuck state
            this.stuckCounter = 0;
        }
        
        // Enter new state
        this.state = newState;
        
        if (newState === 'FLANK') {
            // Calculate flank position when entering flank state
            this.calculateFlankPosition();
        }
        
        console.log(`Enemy changed state to: ${newState}`);
    }
    
    /**
     * Update behavior in idle state
     * @param {number} delta - Time delta
     */
    updateIdle(delta) {
        // In idle state, enemy just slowly rotates
        this.mesh.rotation.y += 0.5 * delta;
    }
    
    /**
     * Update behavior in chase state - direct pursuit
     * @param {number} delta - Time delta
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    updateChase(delta, playerPosition) {
        const now = Date.now();
        
        // Check if it's time to update the path
        if (!this.targetPosition || now - this.lastPathUpdate > this.updateInterval) {
            this.currentPath = this.pathfinding.findPath(
                this.mesh.position,
                playerPosition
            );
            this.currentPathIndex = 0;
            this.lastPathUpdate = now;
        }
        
        // Move along the path
        this.moveAlongPath(delta);
        
        // Random chance to jump while chasing
        if (this.canJump && this.jumpCooldown <= 0 && Math.random() < this.jumpProbability) {
            this.jump();
        }
        
        // Face the player
        this.lookAt(playerPosition);
    }
    
    /**
     * Update behavior in flank state - try to circle around player
     * @param {number} delta - Time delta
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    updateFlank(delta, playerPosition) {
        const now = Date.now();
        
        // Check if it's time to recalculate flank position
        if (now - this.lastPathUpdate > this.updateInterval * 2) {
            this.calculateFlankPosition();
            this.lastPathUpdate = now;
        }
        
        // Move along the path
        this.moveAlongPath(delta);
        
        // Face the player even while flanking
        this.lookAt(playerPosition);
        
        // Higher chance to jump while flanking for unpredictability
        if (this.canJump && this.jumpCooldown <= 0 && Math.random() < this.jumpProbability * 2) {
            this.jump();
        }
    }
    
    /**
     * Calculate a flanking position around the player
     */
    calculateFlankPosition() {
        if (!this.targetPosition) return;
        
        // Calculate a position to the side of the player
        const angle = Math.random() * Math.PI * 2; // Random angle
        const distance = 10 + Math.random() * 10; // Random distance between 10-20 units
        
        const flankPosition = new THREE.Vector3(
            this.targetPosition.x + Math.cos(angle) * distance,
            this.targetPosition.y,
            this.targetPosition.z + Math.sin(angle) * distance
        );
        
        // Find a path to this flanking position
        this.currentPath = this.pathfinding.findPath(
            this.mesh.position,
            flankPosition
        );
        this.currentPathIndex = 0;
    }
    
    /**
     * Update behavior in stuck state - try to get unstuck
     * @param {number} delta - Time delta
     */
    updateStuck(delta) {
        // Try to jump to get unstuck
        if (this.canJump && this.jumpCooldown <= 0) {
            this.jump();
        }
        
        // Try random movement to get unstuck
        const randomAngle = Math.random() * Math.PI * 2;
        const escapeDirection = new THREE.Vector3(
            Math.cos(randomAngle),
            0,
            Math.sin(randomAngle)
        );
        
        // Move in the random direction
        const newPosition = new THREE.Vector3(
            this.mesh.position.x + escapeDirection.x * this.speed * delta * 2, // Move faster to escape
            this.mesh.position.y,
            this.mesh.position.z + escapeDirection.z * this.speed * delta * 2
        );
        
        // Check if new position is clear
        const canMove = !this.collisionUtils.checkObstacleCollision(
            this.scene, 
            newPosition, 
            this.WIDTH / 2
        );
        
        if (canMove) {
            this.mesh.position.copy(newPosition);
        }
        
        // After a few attempts, transition back to chase mode
        if (Math.random() < 0.1) { // 10% chance per update to exit stuck state
            this.setState('CHASE');
        }
    }
    
    /**
     * Move along the calculated path
     * @param {number} delta - Time delta
     */
    moveAlongPath(delta) {
        // If we have a path and haven't reached the end
        if (this.currentPath && this.currentPath.length > 0 && this.currentPathIndex < this.currentPath.length) {
            const targetPoint = this.currentPath[this.currentPathIndex];
            
            // Get direction to the next point
            const direction = new THREE.Vector3()
                .subVectors(targetPoint, this.mesh.position)
                .normalize();
            
            // Calculate potential new position
            const newPosition = new THREE.Vector3(
                this.mesh.position.x + direction.x * this.speed * delta,
                this.mesh.position.y,
                this.mesh.position.z + direction.z * this.speed * delta
            );
            
            // Check for collisions with obstacles
            const canMove = !this.collisionUtils.checkObstacleCollision(
                this.scene, 
                newPosition, 
                this.WIDTH / 2
            );
            
            // Move the enemy if no obstacles in the way
            if (canMove) {
                this.mesh.position.copy(newPosition);
                
                // Check if we've reached the current path point (within a small threshold)
                const distanceToTarget = this.mesh.position.distanceTo(targetPoint);
                if (distanceToTarget < 1.0) {
                    this.currentPathIndex++;
                }
            } else {
                // Try to find a way around obstacles
                this.avoidObstacle(delta, direction);
            }
        } else if (this.targetPosition) {
            // Direct movement if no path or reached end of path
            const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.mesh.position)
                .normalize();
            
            // Calculate potential new position
            const newPosition = new THREE.Vector3(
                this.mesh.position.x + direction.x * this.speed * delta,
                this.mesh.position.y,
                this.mesh.position.z + direction.z * this.speed * delta
            );
            
            // Check for collisions
            const canMove = !this.collisionUtils.checkObstacleCollision(
                this.scene, 
                newPosition, 
                this.WIDTH / 2
            );
            
            if (canMove) {
                this.mesh.position.copy(newPosition);
            } else {
                this.avoidObstacle(delta, direction);
            }
        }
    }
    
    /**
     * Make the enemy perform a jump
     */
    jump() {
        if (!this.canJump) return;
        
        this.velocity.y = this.jumpForce;
        this.canJump = false;
        this.jumpCooldown = 1.5; // 1.5 seconds cooldown between jumps
    }
    
    /**
     * Simple obstacle avoidance logic
     * @param {number} delta - Time delta
     * @param {THREE.Vector3} direction - Current movement direction
     */
    avoidObstacle(delta, direction) {
        // Try moving perpendicular to the current direction
        const leftDirection = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
        const rightDirection = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
        
        // Try moving to the left
        const leftPosition = new THREE.Vector3(
            this.mesh.position.x + leftDirection.x * this.speed * delta,
            this.mesh.position.y,
            this.mesh.position.z + leftDirection.z * this.speed * delta
        );
        
        // Try moving to the right
        const rightPosition = new THREE.Vector3(
            this.mesh.position.x + rightDirection.x * this.speed * delta,
            this.mesh.position.y,
            this.mesh.position.z + rightDirection.z * this.speed * delta
        );
        
        // Check which direction is clearer
        const leftClear = !this.collisionUtils.checkObstacleCollision(this.scene, leftPosition, this.WIDTH / 2);
        const rightClear = !this.collisionUtils.checkObstacleCollision(this.scene, rightPosition, this.WIDTH / 2);
        
        if (leftClear) {
            this.mesh.position.copy(leftPosition);
        } else if (rightClear) {
            this.mesh.position.copy(rightPosition);
        } else if (this.canJump && this.jumpCooldown <= 0) {
            // If both horizontal directions are blocked, try jumping
            this.jump();
        }
    }
    
    /**
     * Make the enemy face a specific position
     * @param {THREE.Vector3} position - Position to look at
     */
    lookAt(position) {
        this.mesh.lookAt(new THREE.Vector3(
            position.x, 
            this.mesh.position.y, 
            position.z
        ));
    }
    
    /**
     * Remove this enemy from the scene
     */
    destroy() {
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
            // Clean up geometry and material
            if (this.bodyMesh.geometry) this.bodyMesh.geometry.dispose();
            if (this.bodyMesh.material) this.bodyMesh.material.dispose();
            if (this.headMesh.geometry) this.headMesh.geometry.dispose();
            if (this.headMesh.material) this.headMesh.material.dispose();
        }
    }
}