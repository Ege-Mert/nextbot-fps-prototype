/**
 * Player - Represents the player character in the game
 */
import { PhysicsEntity } from './PhysicsEntity.js';
import { CollisionUtils } from '../utils/CollisionUtils.js';
import { BhopController } from '../controllers/BhopController.js';
import { HeadBobController } from '../controllers/HeadBobController.js';
import { FovController } from '../controllers/FovController.js';

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
        
        // Collision parameters
        this.COLLISION_RADIUS = 0.8;
        this.COLLISION_SEGMENTS = 8; // Number of rays for collision detection
        this.COLLISION_PUSH_FACTOR = 0.05; // How strongly to push player away from obstacles
        this.COLLISION_SLIDE_FACTOR = 0.8; // How much velocity to preserve when sliding
        this.STEP_HEIGHT = 0.25; // Maximum height player can step up
        
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
        
        // Previous position for interpolation
        this.previousPosition = new THREE.Vector3();
        this.interpFactor = 0.25; // Used for smoothing collision response
        
        // Initialize physics properties
        this.init();
        
        // Create controllers
        this.bhopController = new BhopController();
        this.headBobController = new HeadBobController(this.camera);
        this.fovController = new FovController(this.camera);
        
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
        
        // Store initial position
        this.previousPosition.copy(this.yawObject.position);
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
        
        // Record jump time
        const jumpTime = Date.now();
        
        // Check for bhop
        const bhopSuccess = this.bhopController.handleJump(jumpTime);
        
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
        this.knockbackVelocity.copy(direction).multiplyScalar(force);
        
        // Add upward component
        this.knockbackVelocity.y += force * 0.5;
        
        // Apply to velocity
        this.velocity.add(this.knockbackVelocity);
    }
    
    /**
     * Handle player landing
     */
    handleLanding() {
        // Record landing time for bhop timing
        const landTime = Date.now();
        this.bhopController.handleLanding(landTime);
        
        this.canJump = true;
        this.isJumping = false;
        
        // End slide if we were sliding
        if (this.isSliding) {
            this.endSlide();
        }
    }
    
    /**
     * Update player velocity and position
     * @param {number} delta - Time delta since last update
     */
    update(delta) {
        // Store previous position for interpolation
        this.previousPosition.copy(this.yawObject.position);
        
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
        
        // Check for collisions and move the player with improved handling
        this.improvedCollisionHandling(newPosition, movementWithKnockback, delta);
        
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
     * Improved collision handling with multi-ray casting and smooth response
     * @param {THREE.Vector3} newPosition - Potential new position
     * @param {THREE.Vector3} moveVelocity - Current movement velocity
     * @param {number} delta - Time delta
     */
    improvedCollisionHandling(newPosition, moveVelocity, delta) {
        // First, handle vertical movement separately (y-axis)
        this.yawObject.position.y += this.velocity.y * delta;
        
        // Now handle horizontal movement with better collision detection
        const currentPos = new THREE.Vector3(
            this.yawObject.position.x,
            this.yawObject.position.y,
            this.yawObject.position.z
        );
        
        const targetPos = new THREE.Vector3(
            newPosition.x,
            this.yawObject.position.y, // Keep current height
            newPosition.z
        );
        
        // Calculate movement vector
        const moveVec = new THREE.Vector3().subVectors(targetPos, currentPos);
        const moveDistance = moveVec.length();
        
        // If no movement, skip collision check
        if (moveDistance < 0.001) return;
        
        // Normalize move vector
        const moveDir = moveVec.clone().normalize();
        
        // Create rays in a circle around the player for better collision detection
        const collisionDetected = this.castCollisionRays(currentPos, moveDir, moveDistance);
        
        if (!collisionDetected) {
            // No collision, move freely
            this.yawObject.position.x = targetPos.x;
            this.yawObject.position.z = targetPos.z;
        } else {
            // Collision detected, use sliding and interpolation for smoother movement
            
            // Try sliding along walls by projecting velocity
            this.handleSlideAlongWalls(currentPos, targetPos, moveDir);
        }
    }
    
    /**
     * Cast multiple rays to detect collisions more accurately
     * @param {THREE.Vector3} position - Current position
     * @param {THREE.Vector3} direction - Movement direction
     * @param {number} distance - Movement distance
     * @returns {boolean} Whether any collision was detected
     */
    castCollisionRays(position, direction, distance) {
        // Cast rays in multiple directions around the player
        const rayCount = this.COLLISION_SEGMENTS;
        const rayLength = distance + this.COLLISION_RADIUS;
        let collisionDetected = false;
        
        // First, cast a ray directly in the movement direction
        const forwardRaycaster = new THREE.Raycaster(
            position,
            direction,
            0,
            rayLength
        );
        
        // Get obstacles
        const obstacles = this.scene.children.filter(child => 
            child.userData && child.userData.isObstacle
        );
        
        // Check forward ray
        const forwardIntersections = forwardRaycaster.intersectObjects(obstacles);
        if (forwardIntersections.length > 0) {
            collisionDetected = true;
        }
        
        // Cast additional rays around the player in a circle
        for (let i = 0; i < rayCount; i++) {
            // Calculate angle for this ray
            const angle = (i / rayCount) * Math.PI * 2;
            
            // Create a ray direction that's offset from the movement direction
            const offsetDir = new THREE.Vector3(
                Math.cos(angle) * this.COLLISION_RADIUS,
                0,
                Math.sin(angle) * this.COLLISION_RADIUS
            );
            
            // Create a ray origin that's offset perpendicular to movement
            const rayOrigin = new THREE.Vector3().copy(position).add(offsetDir);
            
            // Create the raycaster
            const raycaster = new THREE.Raycaster(
                rayOrigin,
                direction,
                0,
                distance
            );
            
            // Check for intersections
            const intersections = raycaster.intersectObjects(obstacles);
            if (intersections.length > 0) {
                collisionDetected = true;
                break;
            }
        }
        
        return collisionDetected;
    }
    
    /**
     * Handle sliding along walls when collision is detected
     * @param {THREE.Vector3} currentPos - Current position
     * @param {THREE.Vector3} targetPos - Target position
     * @param {THREE.Vector3} moveDir - Movement direction
     */
    handleSlideAlongWalls(currentPos, targetPos, moveDir) {
        // Try moving along X-axis only
        const xOnlyMove = new THREE.Vector3(
            targetPos.x - currentPos.x,
            0,
            0
        );
        
        // Check if X-only movement is collision-free
        const xOnlyCollision = this.castCollisionRays(
            currentPos,
            xOnlyMove.clone().normalize(),
            xOnlyMove.length()
        );
        
        // Try moving along Z-axis only
        const zOnlyMove = new THREE.Vector3(
            0,
            0,
            targetPos.z - currentPos.z
        );
        
        // Check if Z-only movement is collision-free
        const zOnlyCollision = this.castCollisionRays(
            currentPos,
            zOnlyMove.clone().normalize(),
            zOnlyMove.length()
        );
        
        // The new position to move to (will be updated based on collision results)
        const newPos = new THREE.Vector3().copy(currentPos);
        
        // Apply sliding movement with interpolation for smoothness
        if (!xOnlyCollision) {
            // Can move along X
            newPos.x = targetPos.x;
            
            // Preserve some Z momentum by sliding
            if (Math.abs(moveDir.z) > 0.1) {
                this.velocity.z *= this.COLLISION_SLIDE_FACTOR;
            }
        }
        
        if (!zOnlyCollision) {
            // Can move along Z
            newPos.z = targetPos.z;
            
            // Preserve some X momentum by sliding
            if (Math.abs(moveDir.x) > 0.1) {
                this.velocity.x *= this.COLLISION_SLIDE_FACTOR;
            }
        }
        
        // Use interpolation for smoother movement near obstacles
        this.yawObject.position.x = this.lerpWithDelta(this.yawObject.position.x, newPos.x, this.interpFactor);
        this.yawObject.position.z = this.lerpWithDelta(this.yawObject.position.z, newPos.z, this.interpFactor);
    }
    
    /**
     * Helper method for smoother interpolation
     * @param {number} current - Current value
     * @param {number} target - Target value
     * @param {number} factor - Interpolation factor
     * @returns {number} Interpolated value
     */
    lerpWithDelta(current, target, factor) {
        // This provides a smoother transition without completely replacing the position
        return current + (target - current) * factor;
    }
    
    /**
     * Check for collision with the ground
     */
    checkGroundCollision() {
        const playerHeight = this.isSliding ? this.HEIGHT * 0.6 : this.HEIGHT;
        
        if (this.yawObject.position.y < playerHeight) {
            // Smoothly interpolate to the correct height instead of snapping
            this.yawObject.position.y = this.lerpWithDelta(
                this.yawObject.position.y,
                playerHeight,
                0.5 // Faster interpolation for ground (feels more solid)
            );
            
            // Ensure we don't go below the minimum height
            if (Math.abs(this.yawObject.position.y - playerHeight) < 0.01) {
                this.yawObject.position.y = playerHeight;
            }
            
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
        this.yawObject.rotation.y -= movementX * sensitivity;
        
        this.pitchObject.rotation.x -= movementY * sensitivity;
        // Constrain pitch to avoid flipping
        this.pitchObject.rotation.x = Math.max(
            -Math.PI/2 + 0.01, 
            Math.min(Math.PI/2 - 0.01, this.pitchObject.rotation.x)
        );
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