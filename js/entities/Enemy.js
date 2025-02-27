/**
 * Enemy - Represents an enemy in the game with improved Nextbot-style AI
 */
import { PhysicsEntity } from './PhysicsEntity.js';
import { CollisionUtils } from '../utils/CollisionUtils.js';
import { PathfindingService } from '../utils/PathfindingService.js';

export class Enemy extends PhysicsEntity {
    constructor(scene, spawnPosition, speedMultiplier = 1.0, game = null) {
        super();
        
        this.scene = scene;
        this.speedMultiplier = speedMultiplier;
        this.game = game; // Store reference to the game object
        
        // Enemy constants
        this.HEIGHT = 2.5;
        this.WIDTH = 1.5;
        this.BASE_SPEED = 5;
        
        // Advanced movement parameters
        this.currentVelocity = new THREE.Vector3(); // For smooth momentum-based movement
        this.acceleration = 25; // How quickly the enemy speeds up
        this.maxSpeed = this.BASE_SPEED * this.speedMultiplier; // Current maximum speed
        this.maxPossibleSpeed = 15; // Absolute maximum possible speed
        this.minSpeed = 1; // Never stop completely
        this.turnRate = 5; // How quickly the enemy can change direction (lower = smoother turns)
        
        // Target tracking
        this.actualTarget = new THREE.Vector3(); // The current movement target
        this.previousTarget = new THREE.Vector3(); // Previous target for interpolation
        this.targetChangedTime = 0; // When the target last changed
        this.targetTransitionDuration = 0.3; // Seconds to smoothly transition to new target
        
        // AI settings
        this.detectionRange = 100; // How far the enemy can detect the player
        this.pathRecalculationInterval = 0.75; // Seconds between path recalculations
        this.targetUpdatePriority = 0.3; // Priority to update target (0-1)
        this.lastPathUpdateTime = 0;
        this.currentPath = [];
        this.currentPathIndex = 0;
        this.hasReachedTarget = false; // Whether enemy has reached its current target
        
        // Stuck detection and recovery
        this.stuckDetectionWindow = 1.0; // Time window to check for being stuck
        this.stuckDetectionDistance = 0.8; // Minimum distance to move to avoid being stuck
        this.stuckDetectionPositions = []; // Stores past positions to detect getting stuck
        this.stuckDetectionTimes = []; // Times when positions were recorded
        this.stuckCounter = 0; // Number of consecutive frames considered stuck
        this.isStuck = false; // Is currently considered stuck
        this.stuckRecoveryTime = 0; // Time stuck recovery began
        this.stuckRecoveryDuration = 1.5; // How long to perform recovery movement
        this.stuckEscapeDirection = new THREE.Vector3(); // Direction to escape when stuck
        
        // Create the enemy mesh
        this.createMesh(spawnPosition);
        
        // Initialize utility classes
        this.collisionUtils = new CollisionUtils();
        this.pathfinding = new PathfindingService(scene);
        
        // State machine
        this.state = 'SPAWN';
        this.previousState = 'SPAWN';
        this.stateTransitionTime = 0;
        
        // History for smoothing
        this.positionHistory = []; // Store recent positions for smoothing
        this.rotationHistory = []; // Store recent rotations for smoothing
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
        
        // Initialize position and rotation history with current values
        for (let i = 0; i < 5; i++) {
            this.positionHistory.push(this.mesh.position.clone());
            this.rotationHistory.push(this.mesh.rotation.y);
        }
        
        // Enable shadows
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.headMesh.castShadow = true;
        this.headMesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Create initial bounding box
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
        
        // Initialize targets
        this.previousTarget.copy(position);
        this.actualTarget.copy(position);
    }
    
    /**
     * Main update method - called every frame
     * @param {number} delta - Time delta in seconds
     * @param {THREE.Vector3} playerPosition - Current player position
     * @param {THREE.Scene} scene - The game scene
     * @param {number} playerSpeed - Current player speed for dynamic difficulty
     */
    update(delta, playerPosition, scene, playerSpeed = 0) {
        // Ensure delta is reasonable to prevent physics glitches
        delta = Math.min(delta, 0.1);
        
        // Apply gravity for physics consistency
        this.applyGravity(delta, scene);
        
        // Update stuck detection
        this.updateStuckDetection(delta);
        
        // Update state based on conditions
        this.updateState(playerPosition, playerSpeed);
        
        // Execute the appropriate behavior for the current state
        switch (this.state) {
            case 'SPAWN':
                this.executeSpawnBehavior(delta);
                break;
            case 'IDLE':
                this.executeIdleBehavior(delta);
                break;
            case 'CHASE':
                this.executeChaseBehavior(delta, playerPosition, playerSpeed);
                break;
            case 'FLANK':
                this.executeFlankBehavior(delta, playerPosition);
                break;
            case 'STUCK':
                this.executeStuckBehavior(delta);
                break;
        }
        
        // Update bounding box for collision detection
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
    }
    
    /**
     * Apply gravity and handle ground collisions
     * @param {number} delta - Time delta
     * @param {THREE.Scene} scene - The game scene
     */
    applyGravity(delta, scene) {
        // Apply gravity
        this.velocity.y -= 20 * delta;
        
        // Check if on ground
        const isOnGround = this.collisionUtils.isOnGround(
            this.mesh.position, 
            this.HEIGHT / 2,
            scene
        );
        
        if (isOnGround && this.velocity.y < 0) {
            this.velocity.y = 0;
            this.mesh.position.y = this.HEIGHT / 2;
        }
        
        // Apply vertical velocity for jumping/falling
        this.mesh.position.y += this.velocity.y * delta;
        
        // Ensure enemy stays above ground
        if (this.mesh.position.y < this.HEIGHT / 2) {
            this.mesh.position.y = this.HEIGHT / 2;
            this.velocity.y = 0;
        }
    }
    
    /**
     * Update stuck detection by tracking positions over time
     * @param {number} delta - Time delta
     */
    updateStuckDetection(delta) {
        const now = performance.now() / 1000; // Current time in seconds
        
        // Add current position and time to history
        this.stuckDetectionPositions.push(this.mesh.position.clone());
        this.stuckDetectionTimes.push(now);
        
        // Remove old positions outside our detection window
        while (this.stuckDetectionTimes.length > 0 && 
               this.stuckDetectionTimes[0] < now - this.stuckDetectionWindow) {
            this.stuckDetectionPositions.shift();
            this.stuckDetectionTimes.shift();
        }
        
        // If we have enough data points, check if we're stuck
        if (this.stuckDetectionPositions.length > 5 && !this.isStuck) {
            const oldestPos = this.stuckDetectionPositions[0];
            const newestPos = this.stuckDetectionPositions[this.stuckDetectionPositions.length - 1];
            const distanceMoved = oldestPos.distanceTo(newestPos);
            
            // Determine if the enemy is considered stuck
            if (distanceMoved < this.stuckDetectionDistance && this.state !== 'IDLE' && this.state !== 'SPAWN') {
                this.stuckCounter++;
                
                if (this.stuckCounter > 20) { // Need multiple frames of being stuck
                    this.setState('STUCK');
                    this.stuckEscapeDirection = this.generateEscapeDirection();
                    this.stuckRecoveryTime = now;
                }
            } else {
                // Reset counter if moving properly
                this.stuckCounter = Math.max(0, this.stuckCounter - 2);
            }
        }
    }
    
    /**
     * Generate a random direction to escape when stuck
     * @returns {THREE.Vector3} A normalized direction vector
     */
    generateEscapeDirection() {
        const angle = Math.random() * Math.PI * 2;
        return new THREE.Vector3(
            Math.cos(angle),
            0,
            Math.sin(angle)
        ).normalize();
    }
    
    /**
     * Update the enemy state based on conditions
     * @param {THREE.Vector3} playerPosition - Current player position
     * @param {number} playerSpeed - Player's current speed
     */
    updateState(playerPosition, playerSpeed) {
        const now = performance.now() / 1000; // Current time in seconds
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        
        // Special case: already in stuck state
        if (this.state === 'STUCK') {
            // Check if we should exit stuck state
            if (now - this.stuckRecoveryTime > this.stuckRecoveryDuration) {
                this.isStuck = false;
                this.stuckCounter = 0;
                
                // Return to appropriate state
                if (distanceToPlayer <= this.detectionRange) {
                    this.setState('CHASE');
                } else {
                    this.setState('IDLE');
                }
            }
            return; // Don't change state otherwise
        }
        
        // Special case: spawn state is temporary
        if (this.state === 'SPAWN' && now - this.stateTransitionTime > 0.5) {
            this.setState(distanceToPlayer <= this.detectionRange ? 'CHASE' : 'IDLE');
            return;
        }
        
        // Player detection
        if (distanceToPlayer <= this.detectionRange) {
            // Player detected, enter chase or flank mode
            if (this.state !== 'CHASE' && this.state !== 'FLANK') {
                // 85% chance to chase directly, 15% chance to try flanking
                const newState = Math.random() < 0.85 ? 'CHASE' : 'FLANK';
                this.setState(newState);
            }
            // Switch between chase and flank modes occasionally for more dynamic behavior
            else if (this.state === 'CHASE' && Math.random() < 0.002) {
                this.setState('FLANK');
            }
            else if (this.state === 'FLANK' && Math.random() < 0.01) {
                this.setState('CHASE');
            }
        } else if (this.state !== 'IDLE' && this.state !== 'SPAWN') {
            // Player out of range, go idle
            this.setState('IDLE');
        }
    }
    
    /**
     * Change the enemy state
     * @param {string} newState - The new state to enter
     */
    setState(newState) {
        if (this.state === newState) return;
        
        this.previousState = this.state;
        this.state = newState;
        this.stateTransitionTime = performance.now() / 1000;
        
        // Reset path when state changes
        if (newState === 'CHASE' || newState === 'FLANK') {
            this.currentPath = [];
            this.currentPathIndex = 0;
            this.lastPathUpdateTime = 0; // Force path recalculation
        }
        
        // Special handling for stuck state
        if (newState === 'STUCK') {
            this.isStuck = true;
        }
        
        console.log(`Enemy changed state from ${this.previousState} to ${newState}`);
    }
    
    /**
     * Execute behavior for spawn state
     * @param {number} delta - Time delta
     */
    executeSpawnBehavior(delta) {
        // Rise animation from ground
        const spawnProgress = Math.min(1, (performance.now() / 1000 - this.stateTransitionTime) / 0.5);
        
        // Simple sine-based easing for smooth rise
        const easedProgress = Math.sin(spawnProgress * Math.PI / 2);
        
        // Gradually rise to full height
        this.mesh.scale.y = easedProgress;
        this.mesh.position.y = this.HEIGHT / 2 * easedProgress;
        
        // Rotation for effect
        this.mesh.rotation.y += delta * 2;
    }
    
    /**
     * Execute behavior for idle state
     * @param {number} delta - Time delta
     */
    executeIdleBehavior(delta) {
        // Slow rotation
        this.mesh.rotation.y += delta * 0.5;
        
        // Slight bobbing motion
        const time = performance.now() / 1000;
        const bobHeight = Math.sin(time * 1.5) * 0.05;
        this.mesh.position.y = this.HEIGHT / 2 + bobHeight;
        
        // Gradually slow down any existing velocity
        this.currentVelocity.x *= 0.95;
        this.currentVelocity.z *= 0.95;
        
        // Apply remaining velocity
        this.mesh.position.x += this.currentVelocity.x * delta;
        this.mesh.position.z += this.currentVelocity.z * delta;
    }
    
    /**
     * Execute chase behavior - directly pursue the player
     * @param {number} delta - Time delta
     * @param {THREE.Vector3} playerPosition - Player's position
     * @param {number} playerSpeed - Player's current speed
     */
    executeChaseBehavior(delta, playerPosition, playerSpeed) {
        const now = performance.now() / 1000;
        
        // Scale speed based on player speed for dynamic difficulty
        const speedScaleFactor = 1.0 + Math.min(playerSpeed / 25, 0.75);
        this.maxSpeed = Math.min(this.maxPossibleSpeed, this.BASE_SPEED * this.speedMultiplier * speedScaleFactor);
        
        // Recalculate path occasionally
        if (now - this.lastPathUpdateTime > this.pathRecalculationInterval) {
            // Prioritize updating based on distance to player
            const distToPlayer = this.mesh.position.distanceTo(playerPosition);
            const shouldUpdate = Math.random() < this.targetUpdatePriority * (1 + 10/distToPlayer);
            
            if (shouldUpdate) {
                // Predict where player will be based on their velocity
                const predictedPosition = this.predictPlayerPosition(playerPosition, playerSpeed);
                
                // Find a path to the predicted position
                this.calculateNewPath(predictedPosition);
                this.lastPathUpdateTime = now;
            }
        }
        
        // Move along current path
        this.moveAlongPath(delta);
        
        // Always look toward the player directly
        this.smoothLookAt(playerPosition, delta);
    }
    
    /**
     * Execute flanking behavior - try to circle around the player
     * @param {number} delta - Time delta
     * @param {THREE.Vector3} playerPosition - Player's position
     */
    executeFlankBehavior(delta, playerPosition) {
        const now = performance.now() / 1000;
        
        // Recalculate flank position occasionally
        if (now - this.lastPathUpdateTime > this.pathRecalculationInterval * 1.5) {
            this.calculateFlankPosition(playerPosition);
            this.lastPathUpdateTime = now;
        }
        
        // Move along current path
        this.moveAlongPath(delta);
        
        // Look at player while flanking for intimidation
        this.smoothLookAt(playerPosition, delta);
    }
    
    /**
     * Execute behavior when stuck
     * @param {number} delta - Time delta
     */
    executeStuckBehavior(delta) {
        // Try to move in the escape direction
        const escapeDistance = this.maxSpeed * 1.5 * delta;
        
        // Calculate potential new position
        const newPosition = new THREE.Vector3(
            this.mesh.position.x + this.stuckEscapeDirection.x * escapeDistance,
            this.mesh.position.y,
            this.mesh.position.z + this.stuckEscapeDirection.z * escapeDistance
        );
        
        // Try to move, if collision detected, change direction
        const canMove = !this.collisionUtils.checkObstacleCollision(
            this.scene, 
            newPosition, 
            this.WIDTH / 2
        );
        
        if (canMove) {
            // Apply movement with smooth acceleration
            this.currentVelocity.x = this.stuckEscapeDirection.x * this.maxSpeed * 1.2;
            this.currentVelocity.z = this.stuckEscapeDirection.z * this.maxSpeed * 1.2;
            
            this.mesh.position.x += this.currentVelocity.x * delta;
            this.mesh.position.z += this.currentVelocity.z * delta;
        } else {
            // Change direction if we hit an obstacle
            this.stuckEscapeDirection = this.generateEscapeDirection();
        }
        
        // Add random rotation for unstuck attempts
        this.mesh.rotation.y += (Math.random() - 0.5) * delta * 5;
    }
    
    /**
     * Predict player's future position based on their current speed
     * @param {THREE.Vector3} playerPosition - Current player position
     * @param {number} playerSpeed - Player's current speed
     * @returns {THREE.Vector3} Predicted future position
     */
    predictPlayerPosition(playerPosition, playerSpeed) {
        const predictionTime = 0.5; // Predict 0.5 seconds ahead
        
        if (this.game && this.game.entityManager && this.game.entityManager.player) {
            const player = this.game.entityManager.player;
            const moveDirection = player.getMovementDirection();
            
            // Create predicted position based on player velocity
            const predictedPos = playerPosition.clone();
            predictedPos.addScaledVector(moveDirection, playerSpeed * predictionTime);
            
            return predictedPos;
        }
        
        return playerPosition.clone(); // Fallback to current position if no data
    }
    
    /**
     * Calculate a new path to target
     * @param {THREE.Vector3} targetPosition - Target position
     */
    calculateNewPath(targetPosition) {
        // Store the previous target before updating
        this.previousTarget.copy(this.actualTarget);
        this.actualTarget.copy(targetPosition);
        this.targetChangedTime = performance.now() / 1000;
        
        // Find path to target
        this.currentPath = this.pathfinding.findPath(this.mesh.position, targetPosition);
        this.currentPathIndex = 0;
        this.hasReachedTarget = false;
    }
    
    /**
     * Calculate a flanking position around the player
     * @param {THREE.Vector3} playerPosition - Player's position
     */
    calculateFlankPosition(playerPosition) {
        // Create a position to the side of the player
        const angle = Math.random() * Math.PI * 2; // Random angle around player
        const distance = 8 + Math.random() * 7; // Random distance 8-15 units
        
        const flankPosition = new THREE.Vector3(
            playerPosition.x + Math.cos(angle) * distance,
            playerPosition.y,
            playerPosition.z + Math.sin(angle) * distance
        );
        
        // Recalculate path to flank position
        this.calculateNewPath(flankPosition);
    }
    
    /**
     * Move along the calculated path with smooth acceleration and transitions
     * @param {number} delta - Time delta
     */
    moveAlongPath(delta) {
        if (!this.currentPath || this.currentPath.length === 0) {
            return; // No path to follow
        }
        
        // Get current target point
        const targetPoint = this.getCurrentTargetPoint();
        if (!targetPoint) return;
        
        // SMOOTH MOVEMENT IMPLEMENTATION
        // Calculate normalized direction to target
        const direction = new THREE.Vector3()
            .subVectors(targetPoint, this.mesh.position)
            .normalize();
        
        // Apply acceleration toward target with smooth acceleration
        const targetVelocityX = direction.x * this.maxSpeed;
        const targetVelocityZ = direction.z * this.maxSpeed;
        
        // Smooth acceleration toward target velocity
        this.currentVelocity.x += (targetVelocityX - this.currentVelocity.x) * this.acceleration * delta;
        this.currentVelocity.z += (targetVelocityZ - this.currentVelocity.z) * this.acceleration * delta;
        
        // Calculate potential new position
        const newPosition = new THREE.Vector3(
            this.mesh.position.x + this.currentVelocity.x * delta,
            this.mesh.position.y,
            this.mesh.position.z + this.currentVelocity.z * delta
        );
        
        // Check for collisions with obstacles
        const canMove = !this.collisionUtils.checkObstacleCollision(
            this.scene, 
            newPosition, 
            this.WIDTH / 2
        );
        
        // Apply movement if no obstacle in the way
        if (canMove) {
            this.mesh.position.copy(newPosition);
        } else {
            // Hit an obstacle, try to find a way around
            this.avoidObstacle(delta, direction);
        }
        
        // Check if we've reached the current target point
        const distanceToTarget = this.mesh.position.distanceTo(targetPoint);
        if (distanceToTarget < 1.0) {
            this.currentPathIndex++;
            
            // Check if we've reached the end of the path
            if (this.currentPathIndex >= this.currentPath.length) {
                this.hasReachedTarget = true;
            }
        }
    }
    
    /**
     * Get current target point with smooth transitions
     * @returns {THREE.Vector3} Current target point
     */
    getCurrentTargetPoint() {
        // If we have a valid path and index
        if (this.currentPath && this.currentPath.length > 0 && 
            this.currentPathIndex < this.currentPath.length) {
            return this.currentPath[this.currentPathIndex];
        }
        
        // If we've reached the end of path, return final target
        if (this.hasReachedTarget) {
            return this.actualTarget;
        }
        
        // Fallback to direct movement toward player
        return this.actualTarget;
    }
    
    /**
     * Avoid obstacles by finding an alternative direction
     * @param {number} delta - Time delta
     * @param {THREE.Vector3} direction - Current movement direction
     */
    avoidObstacle(delta, direction) {
        // Generate perpendicular directions for navigation
        const leftDirection = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
        const rightDirection = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
        
        // Try positions in multiple directions with different mixing of forward + side movement
        const attemptPositions = [
            // Left side attempts
            new THREE.Vector3(
                this.mesh.position.x + (leftDirection.x * 0.8 + direction.x * 0.2) * this.maxSpeed * delta,
                this.mesh.position.y,
                this.mesh.position.z + (leftDirection.z * 0.8 + direction.z * 0.2) * this.maxSpeed * delta
            ),
            // Right side attempts
            new THREE.Vector3(
                this.mesh.position.x + (rightDirection.x * 0.8 + direction.x * 0.2) * this.maxSpeed * delta,
                this.mesh.position.y,
                this.mesh.position.z + (rightDirection.z * 0.8 + direction.z * 0.2) * this.maxSpeed * delta
            ),
            // Left with more forward
            new THREE.Vector3(
                this.mesh.position.x + (leftDirection.x * 0.5 + direction.x * 0.5) * this.maxSpeed * delta,
                this.mesh.position.y,
                this.mesh.position.z + (leftDirection.z * 0.5 + direction.z * 0.5) * this.maxSpeed * delta
            ),
            // Right with more forward
            new THREE.Vector3(
                this.mesh.position.x + (rightDirection.x * 0.5 + direction.x * 0.5) * this.maxSpeed * delta,
                this.mesh.position.y,
                this.mesh.position.z + (rightDirection.z * 0.5 + direction.z * 0.5) * this.maxSpeed * delta
            ),
            // Pure left
            new THREE.Vector3(
                this.mesh.position.x + leftDirection.x * this.maxSpeed * delta,
                this.mesh.position.y,
                this.mesh.position.z + leftDirection.z * this.maxSpeed * delta
            ),
            // Pure right
            new THREE.Vector3(
                this.mesh.position.x + rightDirection.x * this.maxSpeed * delta,
                this.mesh.position.y,
                this.mesh.position.z + rightDirection.z * this.maxSpeed * delta
            )
        ];
        
        // Try each position and take the first clear one
        for (const position of attemptPositions) {
            const clear = !this.collisionUtils.checkObstacleCollision(this.scene, position, this.WIDTH / 2);
            if (clear) {
                // Update velocity to match chosen direction for smooth momentum
                this.currentVelocity.x = (position.x - this.mesh.position.x) / delta;
                this.currentVelocity.z = (position.z - this.mesh.position.z) / delta;
                
                // Move to the clear position
                this.mesh.position.copy(position);
                return;
            }
        }
        
        // If all attempts failed, slow down instead of coming to an abrupt stop
        this.currentVelocity.x *= 0.8;
        this.currentVelocity.z *= 0.8;
        
        // Increment stuck counter as all avoidance attempts failed
        this.stuckCounter += 0.5;
    }
    
    /**
     * Smoothly look at a target position
     * @param {THREE.Vector3} targetPosition - Position to look at
     * @param {number} delta - Time delta
     */
    smoothLookAt(targetPosition, delta) {
        // Calculate target rotation
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.mesh.position)
            .normalize();
        
        // Calculate target angle
        const targetAngle = Math.atan2(direction.x, direction.z);
        
        // Calculate shortest angle difference (handling the -π to π wrap)
        let angleDiff = targetAngle - this.mesh.rotation.y;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply smooth rotation with rate limiting
        const maxRotation = this.turnRate * delta;
        const rotationAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxRotation);
        
        // Update rotation
        this.mesh.rotation.y += rotationAmount;
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