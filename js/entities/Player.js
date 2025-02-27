/**
 * Player - Represents the player character in the game
 */
import { PhysicsEntity } from './PhysicsEntity.js';
import { CollisionUtils } from '../utils/CollisionUtils.js';
import { BhopController } from '../controllers/BhopController.js';
import { HeadBobController } from '../controllers/HeadBobController.js';
import { FovController } from '../controllers/FovController.js';
import { ParticleManager } from '../utils/ParticleManager.js';

export class Player extends PhysicsEntity {
    constructor(scene, camera) {
        super();
        
        this.scene = scene;
        this.camera = camera;
        
        // Player constants
        this.HEIGHT = 2;
        this.GRAVITY = 30;
        this.JUMP_FORCE = 12;
        this.WALK_SPEED = 6;
        this.RUN_SPEED = 12;
        this.SPRINT_SPEED = 20;
        this.MAX_SPEED = 45; // Increased max speed for bhop mastery
        this.ACCELERATION = 80;
        this.DECELERATION = 60;
        this.SPRINT_ACCELERATION = 120;
        this.WALK_ACCELERATION = 40;
        this.AIR_ACCELERATION = 30; // Separate air acceleration value
        this.AIR_DECELERATION = 10; // Lower deceleration in air
        
        // FOV constants
        this.DEFAULT_FOV = 75;
        this.RUNNING_FOV = 85;
        this.SPRINTING_FOV = 95;
        this.WALKING_FOV = 65;
        
        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;
        this.isWalking = false;
        
        // Jump state
        this.canJump = false;
        this.isJumping = false;
        
        // Current states
        this.moveState = 'RUNNING';
        this.currentSpeed = 0;
        this.targetSpeed = this.RUN_SPEED;
        this.currentAcceleration = this.ACCELERATION;
        this.targetFOV = this.DEFAULT_FOV;
        
        // Knockback handling
        this.knockbackVelocity = new THREE.Vector3();
        this.knockbackRecoveryRate = 5;
        
        // Advanced movement
        this.airControl = 0.8; // How much control in air (0-1)
        this.slideEnabled = true; // Enable slide mechanic
        this.isSliding = false;
        this.slideTimer = 0;
        this.SLIDE_DURATION = 0.6; // seconds
        this.SLIDE_SPEED_BOOST = 1.3;
        this.SLIDE_COOLDOWN = 1.0; // seconds
        this.slideCooldownTimer = 0;
        
        // Initialize target rotations to current rotations
        this.targetYaw = 0;   // Will be set after creating yawObject
        this.targetPitch = 0; // Will be set after creating pitchObject
        
        // Initialize physics properties
        this.init();
        
        // After initializing, store initial rotation values:
        this.targetYaw = this.yawObject.rotation.y;
        this.targetPitch = this.pitchObject.rotation.x;
        
        // Create controllers
        this.bhopController = new BhopController();
        this.headBobController = new HeadBobController(this.camera);
        this.fovController = new FovController(this.camera);
        this.particleManager = new ParticleManager(scene);
        
        // Utility classes
        this.collisionUtils = new CollisionUtils();
    }
    
    /**
     * Initialize the player entity
     */
    init() {
        // Set up player object as a container for the camera
        this.playerObject = new THREE.Object3D();
        this.scene.add(this.playerObject);
        
        // Add pitch object for vertical rotation
        this.pitchObject = new THREE.Object3D();
        this.pitchObject.add(this.camera);
        
        // Add yaw object for horizontal rotation
        this.yawObject = new THREE.Object3D();
        this.yawObject.position.y = this.HEIGHT;
        this.yawObject.add(this.pitchObject);
        
        // Add player to the scene
        this.playerObject.add(this.yawObject);
        
        // Initialize physics values
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
    }
    
    /**
     * Set player movements based on key states
     * @param {Object} keyStates - Current key states
     */
    setMovementFromInput(keyStates) {
        this.moveForward = keyStates.moveForward;
        this.moveBackward = keyStates.moveBackward;
        this.moveLeft = keyStates.moveLeft;
        this.moveRight = keyStates.moveRight;
        this.isSprinting = keyStates.isSprinting;
        this.isWalking = keyStates.isWalking;
        
        // Update movement state
        this.updateMovementState();
    }
    
    /**
     * Update movement state (walking/running/sprinting)
     */
    updateMovementState() {
        if (this.isSliding) {
            // Sliding state overrides other movement modes
            this.moveState = 'SLIDING';
            this.currentAcceleration = this.ACCELERATION;
            this.targetFOV = this.SPRINTING_FOV + 10;
            return;
        }
        
        if (this.isSprinting) {
            this.targetSpeed = this.SPRINT_SPEED;
            this.moveState = 'SPRINTING';
            this.currentAcceleration = this.SPRINT_ACCELERATION;
            this.targetFOV = this.SPRINTING_FOV;
        } else if (this.isWalking) {
            this.targetSpeed = this.WALK_SPEED;
            this.moveState = 'WALKING';
            this.currentAcceleration = this.WALK_ACCELERATION;
            this.targetFOV = this.WALKING_FOV;
        } else {
            this.targetSpeed = this.RUN_SPEED;
            this.moveState = 'RUNNING';
            this.currentAcceleration = this.ACCELERATION;
            this.targetFOV = this.RUNNING_FOV;
        }
        
        // Apply bhop boost if active
        if (this.bhopController.isBhopping) {
            this.targetSpeed *= this.bhopController.currentBoost;
            this.targetSpeed = Math.min(this.targetSpeed, this.MAX_SPEED);
            
            // Add FOV boost during bhop - scaled with speed
            const speedFactor = this.currentSpeed / this.RUN_SPEED;
            this.targetFOV += this.bhopController.chainCount * 1.5 * speedFactor;
        }
    }
    
    /**
     * Process jump input
     * @returns {boolean} Whether the jump was successful
     */
    jump() {
        // Can't jump if currently sliding
        if (this.isSliding) return false;
        
        if (!this.canJump) return false;
        
        // Apply jump force
        this.velocity.y = this.JUMP_FORCE;
        this.canJump = false;
        this.isJumping = true;
        
        // Play jump sound if audio manager is available
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playJumpSound();
        }
        
        // Record jump time
        const jumpTime = Date.now();
        this.lastJumpTime = jumpTime; // Store the jump time for air time calculation
        
        // Check for bhop
        const bhopSuccess = this.bhopController.handleJump(jumpTime);
        
        // Add score for successful bhops
        if (bhopSuccess && this.game && this.game.scoreManager) {
            this.game.scoreManager.addBhopScore(this.bhopController.chainCount);
            // Optionally, trigger a score sound or UI animation here.
        }
        
        // Update FOV for jump
        this.updateMovementState();
        
        return bhopSuccess;
    }
    
    /**
     * Start a slide if possible
     * @returns {boolean} Whether slide was started
     */
    startSlide() {
        // Only allow slide when on ground, moving, and not in cooldown
        if (!this.canJump || this.slideCooldownTimer > 0 || this.isSliding) return false;
        
        // Need minimum speed to slide
        if (this.currentSpeed < this.RUN_SPEED * 0.8) return false;
        
        this.isSliding = true;
        this.slideTimer = this.SLIDE_DURATION;
        
        // Lower player height during slide
        this.yawObject.position.y = this.HEIGHT * 0.6; // Lower camera height
        
        // Apply slide boost
        this.currentSpeed *= this.SLIDE_SPEED_BOOST;
        
        // Update movement state
        this.updateMovementState();
        
        return true;
    }
    
    /**
     * End the current slide
     */
    endSlide() {
        if (!this.isSliding) return;
        
        this.isSliding = false;
        this.slideTimer = 0;
        this.slideCooldownTimer = this.SLIDE_COOLDOWN;
        
        // Restore player height
        this.yawObject.position.y = this.HEIGHT;
        
        // Update movement state
        this.updateMovementState();
    }
    
    /**
     * Apply knockback to the player
     * @param {THREE.Vector3} direction - Knockback direction (normalized)
     * @param {number} force - Knockback force
     */
    applyKnockback(direction, force) {
        // Create horizontal-only knockback - zero out the Y component
        direction.y = 0;
        direction.normalize(); // Re-normalize after zeroing Y
        
        // Apply horizontal knockback
        this.knockbackVelocity.copy(direction).multiplyScalar(force);
        
        // Add a slight downward force to keep player grounded
        this.knockbackVelocity.y = -force * 0.1;
        
        // Apply to velocity
        this.velocity.add(this.knockbackVelocity);
    }
    
    /**
     * Handle player landing
     */
    handleLanding() {
        // Record landing time for bhop timing.
        const landTime = Date.now();
        this.bhopController.handleLanding(landTime);
        
        this.canJump = true;
        this.isJumping = false;
        
        // End slide if we were sliding.
        if (this.isSliding) {
            this.endSlide();
        }
        
        // Calculate air time and add score if significant
        if (this.lastJumpTime && this.game && this.game.scoreManager) {
            const airTime = (landTime - this.lastJumpTime) / 1000;
            if (airTime > 0.2) { // Only add bonus if air time is significant
                this.game.scoreManager.addAirScore(airTime);
            }
        }
        
        // Calculate an intensity for the landing shake.
        // Here, you might base the intensity on the current speed; for simplicity, we use a constant.
        const shakeIntensity = 0.1; // Adjust as needed for a subtle effect.
        this.headBobController.applyLandingShake(shakeIntensity);
        
        // Play landing sound if audio manager is available
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playLandingSound();
        }
        
        // Trigger a dust effect at the player's feet.
        const landingPosition = this.yawObject.position.clone();
        landingPosition.y = 0; // Ground level
        this.particleManager.spawnDustEffect(landingPosition, 25, 0.4, 1.2);
    }
    
    /**
     * Update player velocity and position
     * @param {number} delta - Time delta since last update
     */
    update(delta) {
        // Apply gravity
        this.velocity.y -= this.GRAVITY * delta;
        
        // Update slide timers
        if (this.isSliding) {
            this.slideTimer -= delta;
            if (this.slideTimer <= 0) {
                this.endSlide();
            }
        }
        
        // Update slide cooldown
        if (this.slideCooldownTimer > 0) {
            this.slideCooldownTimer -= delta;
        }
        
        // Smooth acceleration and deceleration
        this.updateSpeed(delta);
        
        // Calculate movement direction
        const moveDirection = this.getMovementDirection();
        
        // Apply knockback recovery
        if (this.knockbackVelocity.lengthSq() > 0.01) {
            this.knockbackVelocity.multiplyScalar(1 - this.knockbackRecoveryRate * delta);
        } else {
            this.knockbackVelocity.set(0, 0, 0);
        }
        
        // Add knockback to movement
        const movementWithKnockback = new THREE.Vector3();
        movementWithKnockback.x = moveDirection.x * this.currentSpeed + this.knockbackVelocity.x;
        movementWithKnockback.z = moveDirection.z * this.currentSpeed + this.knockbackVelocity.z;
        
        // Calculate potential new position
        const newPosition = new THREE.Vector3(
            this.yawObject.position.x + movementWithKnockback.x * delta,
            this.yawObject.position.y + this.velocity.y * delta,
            this.yawObject.position.z + movementWithKnockback.z * delta
        );
        
        // Check for collisions and move the player
        this.handleMovementCollisions(newPosition, delta);
        
        // Update camera rotation with smoothing
        this.updateCameraRotation(delta);
        
        // Update head bobbing effect - disable during slide
        if (!this.isSliding) {
            this.headBobController.update(delta, this.currentSpeed, this.canJump, 
                this.moveForward || this.moveBackward || this.moveLeft || this.moveRight);
        }
        
        // Update FOV based on movement
        this.fovController.update(delta, this.targetFOV);
        
        // Ground collision check
        this.checkGroundCollision();
        
        // Check boundary limits
        this.enforceBoundaries();
        
        // Update particle systems
        this.particleManager.update(delta);
        
        // Update bhop controller
        this.bhopController.update(delta);
    }
    
    /**
     * Update player speed with acceleration/deceleration
     * @param {number} delta - Time delta
     */
    updateSpeed(delta) {
        // Calculate target speed based on input, bhop state, and slide state
        let targetSpeed = 0;
        if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
            targetSpeed = this.targetSpeed;
        }
        
        // Determine which acceleration/deceleration to use based on grounded state
        let effectiveAcceleration = this.canJump ? this.currentAcceleration : this.AIR_ACCELERATION;
        let effectiveDeceleration = this.canJump ? this.DECELERATION : this.AIR_DECELERATION;
        
        // Adjust air acceleration based on bhop state
        if (!this.canJump && this.bhopController.isBhopping) {
            const airControlMultiplier = this.bhopController.getAirAccelerationMultiplier();
            effectiveAcceleration *= airControlMultiplier;
        }
        
        // Apply air control reduction when not bhopping
        if (!this.canJump && !this.bhopController.isBhopping) {
            effectiveAcceleration *= this.airControl;
        }
        
        // Apply acceleration or deceleration
        if (this.currentSpeed < targetSpeed) {
            this.currentSpeed = Math.min(targetSpeed, this.currentSpeed + effectiveAcceleration * delta);
        } else if (this.currentSpeed > targetSpeed) {
            // Maintain speed during slide
            if (this.isSliding) {
                this.currentSpeed = Math.max(targetSpeed, this.currentSpeed - (effectiveDeceleration * 0.3) * delta);
            } else {
                this.currentSpeed = Math.max(targetSpeed, this.currentSpeed - effectiveDeceleration * delta);
            }
        }
    }
    
    /**
     * Get movement direction relative to camera orientation
     * @returns {THREE.Vector3} Normalized direction vector
     */
    getMovementDirection() {
        // Start with the basic direction from input
        this.direction.z = Number(this.moveBackward) - Number(this.moveForward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        
        // Normalize if there's movement
        if (this.direction.x !== 0 || this.direction.z !== 0) {
            this.direction.normalize();
        }
        
        // Convert direction to be relative to camera orientation
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(this.yawObject.rotation.y);
        
        this.direction.applyMatrix4(rotationMatrix);
        
        return this.direction;
    }
    
    /**
     * Handle collisions with obstacles during movement
     * @param {THREE.Vector3} newPosition - Potential new position
     * @param {number} delta - Time delta
     */
    handleMovementCollisions(newPosition, delta) {
        // Check for horizontal collisions (X and Z)
        const playerRadius = 0.8;
        const hasCollision = this.collisionUtils.checkObstacleCollision(
            this.scene,
            new THREE.Vector3(newPosition.x, this.yawObject.position.y, newPosition.z),
            playerRadius
        );
        
        // Apply horizontal movement if no collision
        if (!hasCollision) {
            this.yawObject.position.x = newPosition.x;
            this.yawObject.position.z = newPosition.z;
        } else {
            // If collision, try to slide along walls with smoothing
            const slideFactor = 0.1; // Smoothing factor for sliding
            // Try X movement only
            const xOnlyPosition = new THREE.Vector3(
                newPosition.x,
                this.yawObject.position.y,
                this.yawObject.position.z
            );
            
            if (!this.collisionUtils.checkObstacleCollision(this.scene, xOnlyPosition, playerRadius)) {
                this.yawObject.position.x += (newPosition.x - this.yawObject.position.x) * slideFactor;
            }
            
            // Try Z movement only
            const zOnlyPosition = new THREE.Vector3(
                this.yawObject.position.x,
                this.yawObject.position.y,
                newPosition.z
            );
            
            if (!this.collisionUtils.checkObstacleCollision(this.scene, zOnlyPosition, playerRadius)) {
                this.yawObject.position.z += (newPosition.z - this.yawObject.position.z) * slideFactor;
            }
        }
        
        // Apply vertical movement
        this.yawObject.position.y += this.velocity.y * delta;
    }
    
    /**
     * Check for collision with the ground
     */
    checkGroundCollision() {
        const playerHeight = this.isSliding ? this.HEIGHT * 0.6 : this.HEIGHT;
        
        if (this.yawObject.position.y < playerHeight) {
            this.yawObject.position.y = playerHeight;
            this.velocity.y = 0;
            
            // If we just landed, trigger landing event
            if (!this.canJump) {
                this.handleLanding();
            }
        }
    }
    
    /**
     * Keep player within world boundaries
     */
    enforceBoundaries() {
        const boundaryLimit = 99; // To match ground size
        
        if (Math.abs(this.yawObject.position.x) > boundaryLimit) {
            this.yawObject.position.x = Math.sign(this.yawObject.position.x) * boundaryLimit;
        }
        
        if (Math.abs(this.yawObject.position.z) > boundaryLimit) {
            this.yawObject.position.z = Math.sign(this.yawObject.position.z) * boundaryLimit;
        }
    }
    
    /**
     * Handle mouse movement for camera rotation
     * @param {number} movementX - Mouse X movement
     * @param {number} movementY - Mouse Y movement
     * @param {number} sensitivity - Mouse sensitivity
     */
    handleMouseMovement(movementX, movementY, sensitivity) {
        // Reset any large, anomalous movements (helps with browser glitches)
        const maxSingleMovement = 50;
        if (Math.abs(movementX) > maxSingleMovement || Math.abs(movementY) > maxSingleMovement) {
            console.log('Limiting excessive mouse movement:', movementX, movementY);
            movementX = Math.sign(movementX) * maxSingleMovement;
            movementY = Math.sign(movementY) * maxSingleMovement;
        }
        
        // Apply directly to rotation with smoothing handled separately
        const rotX = movementX * sensitivity;
        const rotY = movementY * sensitivity;
        
        // Directly update the target angles
        this.targetYaw -= rotX;
        this.targetPitch -= rotY;
        
        // Clamp vertical rotation to prevent flipping
        const minPitch = -Math.PI / 2 + 0.01;
        const maxPitch = Math.PI / 2 - 0.01;
        this.targetPitch = Math.max(minPitch, Math.min(maxPitch, this.targetPitch));
    }
    
    /**
     * Update camera rotation with a very responsive but slightly smoothed approach
     * @param {number} delta - Time delta from the game loop
     */
    updateCameraRotation(delta) {
        // Apply a very small amount of smoothing for comfort
        // but make it extremely responsive (almost direct)
        
        // Calculate frame-independent smoothing factor 
        // Higher = more responsive, but less smooth
        const baseResponseFactor = 20.0; // Very high value for immediate response
        const smoothingStrength = Math.min(1.0, baseResponseFactor * delta);
        
        // Apply the actual rotation changes
        if (this.yawObject && this.targetYaw !== undefined) {
            // Simple LERP with high factor for almost immediate response
            this.yawObject.rotation.y += (this.targetYaw - this.yawObject.rotation.y) * smoothingStrength;
            
            // When very close to target, snap to avoid micro-jitter
            if (Math.abs(this.targetYaw - this.yawObject.rotation.y) < 0.0001) {
                this.yawObject.rotation.y = this.targetYaw;
            }
        }
        
        if (this.pitchObject && this.targetPitch !== undefined) {
            // Apply to pitch with same high-responsiveness smoothing
            this.pitchObject.rotation.x += (this.targetPitch - this.pitchObject.rotation.x) * smoothingStrength;
            
            // Snap when close
            if (Math.abs(this.targetPitch - this.pitchObject.rotation.x) < 0.0001) {
                this.pitchObject.rotation.x = this.targetPitch;
            }
        }
    }
    
    /**
     * Get player info for UI and debugging
     * @param {number} enemyCount - Current enemy count
     * @returns {Object} Player information
     */
    getPlayerInfo(enemyCount) {
        const bhopStatus = this.bhopController.getBhopStatus();
        
        return {
            position: this.yawObject.position,
            currentSpeed: this.currentSpeed,
            moveState: this.isSliding ? 'SLIDING' : this.moveState,
            fov: this.camera.fov,
            bhopChainCount: bhopStatus.chainCount,
            bhopBoost: bhopStatus.boost,
            isGrounded: this.canJump,
            isBhopping: bhopStatus.active,
            timeSinceLand: Date.now() - this.bhopController.lastLandTime,
            bhopWindow: this.bhopController.BHOP_WINDOW,
            enemyCount: enemyCount,
            bhopCombo: Math.floor(bhopStatus.comboMeter),
            bhopQuality: bhopStatus.quality,
            isSliding: this.isSliding
        };
    }
}