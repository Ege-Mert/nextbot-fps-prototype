// Global variables
let scene, camera, renderer;
let player; // Player object that will hold the camera
let canvas;
let instructions, hud, debugInfo, bhopIndicator, movementIndicator;

// Player variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isSprinting = false;
let isWalking = false;
let canJump = false;
let isJumping = false;
let isBhopping = false;
let jumpTime = 0;
let lastJumpTime = 0;
const BHOP_WINDOW = 450; // ms window to perform a successful bhop

// Bhop variables for gradual speed increase
let bhopChainCount = 0;
const MAX_BHOP_CHAIN = 10; // Maximum number of consecutive bhops
const BHOP_BASE_BOOST = 1.2; // Initial speed boost
const BHOP_MAX_BOOST = 2.5; // Maximum speed boost after MAX_BHOP_CHAIN
let currentBhopBoost = BHOP_BASE_BOOST;

// Physics variables
let velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const playerHeight = 2;
const gravity = 30;
const jumpForce = 12;
const walkSpeed = 6;     // Walking speed
const runSpeed = 12;     // Normal running speed
const sprintSpeed = 20;  // Sprinting speed
let playerSpeed = runSpeed; // Default speed

// Movement control variables for smoother acceleration/deceleration
let currentSpeed = 0;
const acceleration = 80;       // Reduced for smoother acceleration
const deceleration = 60;       // Reduced for smoother deceleration
const sprintAcceleration = 120; // Faster acceleration when sprinting
const walkAcceleration = 40;    // Slower acceleration when walking
const maxSpeed = 30;            // Maximum possible speed with bhop

// FOV variables
const defaultFOV = 75;
const runningFOV = 85;
const sprintingFOV = 95;
const walkingFOV = 65;
const fovChangeSpeed = 5; // Reduced for smoother transitions

// Head bobbing variables
let bobTimer = 0;
const bobAmplitude = 0.035; // Significantly reduced for subtler effect
const sprintBobAmplitude = 0.05;
const walkBobAmplitude = 0.02;
const bobFrequency = 8;   // Reduced for smoother bobbing
let currentBobAmplitude = bobAmplitude;
let bobActive = false;
let bobHeight = 0;
let lastBobHeight = 0; // For dampening

// Mouse look variables
let mouseSensitivity = 0.002;
let pitchObject, yawObject;

// Enemy variables
let enemies = [];
const ENEMY_SPEED = 5;
const ENEMY_HEIGHT = 2.5;
const ENEMY_SPAWN_DISTANCE = 30;
const MAX_ENEMIES = 3;

// Initialize the scene, camera, and renderer
function init() {
    // Set up instruction UI elements
    instructions = document.getElementById('instructions');
    hud = document.getElementById('hud');
    debugInfo = document.getElementById('debug-info');
    bhopIndicator = document.getElementById('indicator');
    movementIndicator = document.getElementById('movement-indicator');
    canvas = document.getElementById('game-canvas');

    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150); // Add fog for better distance perception

    // Create the camera (first-person perspective)
    camera = new THREE.PerspectiveCamera(defaultFOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Set up player object as a container for the camera
    player = new THREE.Object3D();
    scene.add(player);
    
    // Add pitch object for vertical rotation
    pitchObject = new THREE.Object3D();
    pitchObject.add(camera);
    
    // Add yaw object for horizontal rotation
    yawObject = new THREE.Object3D();
    yawObject.position.y = playerHeight;
    yawObject.add(pitchObject);
    
    // Add player to the scene
    player.add(yawObject);

    // Create the renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadow quality

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x6b6b6b); // Brighter ambient light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    // Improve shadow quality
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    // Create a ground plane
    createGround();
    
    // Add some obstacles for better gameplay
    createObstacles();
    
    // Spawn initial enemies
    spawnEnemies(MAX_ENEMIES);

    // Set up event listeners
    setupEventListeners();
    
    // Start the animation loop
    animate();
}

// Create the ground plane
function createGround() {
    // Create textured ground
    const groundSize = 200;
    
    // Create a grid texture for the ground
    const gridHelper = new THREE.GridHelper(groundSize, 20, 0x000000, 0x444444);
    gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
    scene.add(gridHelper);
    
    // Create the main ground
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b7d4e,
        roughness: 0.8,
        metalness: 0.1
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);
}

// Create some obstacles for more interesting gameplay
function createObstacles() {
    // Create a few boxes scattered around
    for (let i = 0; i < 10; i++) {
        const size = 2 + Math.random() * 3;
        const height = 1 + Math.random() * 4;
        
        const boxGeometry = new THREE.BoxGeometry(size, height, size);
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080 + Math.random() * 0x7f7f7f,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        
        // Random position, but keep away from center (player spawn)
        const distance = 15 + Math.random() * 60;
        const angle = Math.random() * Math.PI * 2;
        box.position.x = Math.cos(angle) * distance;
        box.position.z = Math.sin(angle) * distance;
        box.position.y = height / 2;
        
        box.castShadow = true;
        box.receiveShadow = true;
        
        // Add collision box
        box.userData.isObstacle = true;
        
        scene.add(box);
    }
    
    // Create some ramps
    for (let i = 0; i < 5; i++) {
        const rampGeometry = new THREE.BoxGeometry(8, 4, 12);
        const rampMaterial = new THREE.MeshStandardMaterial({
            color: 0xccaa88,
            roughness: 0.5
        });
        
        const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
        
        // Random position, but keep away from center
        const distance = 20 + Math.random() * 40;
        const angle = Math.random() * Math.PI * 2;
        ramp.position.x = Math.cos(angle) * distance;
        ramp.position.z = Math.sin(angle) * distance;
        ramp.position.y = 2;
        
        // Rotate ramp to create slope
        ramp.rotation.x = -Math.PI / 12; // 15 degrees
        ramp.rotation.y = Math.random() * Math.PI * 2;
        
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        
        // Add collision tag
        ramp.userData.isObstacle = true;
        
        scene.add(ramp);
    }
}

// Create and spawn enemies
function createEnemy() {
    // Create more interesting enemy geometry
    const enemyGeometry = new THREE.BoxGeometry(1.5, ENEMY_HEIGHT, 1);
    const enemyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,  // Red color for the enemy
        emissive: 0x550000, // Slight glow
        roughness: 0.5
    });
    
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    
    // Position the enemy randomly around the player, but at a distance
    const angle = Math.random() * Math.PI * 2;
    enemy.position.x = yawObject.position.x + Math.cos(angle) * ENEMY_SPAWN_DISTANCE;
    enemy.position.z = yawObject.position.z + Math.sin(angle) * ENEMY_SPAWN_DISTANCE;
    enemy.position.y = ENEMY_HEIGHT / 2;
    
    enemy.castShadow = true;
    enemy.receiveShadow = true;
    
    // Add enemy to the scene and to our tracking array
    scene.add(enemy);
    
    // Create enemy object with properties
    const enemyObj = {
        mesh: enemy,
        speed: ENEMY_SPEED * (0.8 + Math.random() * 0.4), // Vary speed slightly
        boundingBox: new THREE.Box3().setFromObject(enemy)
    };
    
    enemies.push(enemyObj);
    
    return enemyObj;
}

// Create and spawn enemies
function spawnEnemies(count) {
    for (let i = 0; i < count; i++) {
        createEnemy();
    }
}

// Update enemy positions and AI
function updateEnemies(delta) {
    enemies.forEach(enemy => {
        // Get player position
        const playerPosition = new THREE.Vector3();
        yawObject.getWorldPosition(playerPosition);
        
        // Update the enemy's position to move towards the player
        const direction = new THREE.Vector3();
        direction.subVectors(playerPosition, enemy.mesh.position).normalize();
        
        // Don't change the y-position (keep enemy on the ground)
        direction.y = 0;
        
        // Calculate potential new position
        const newPosition = new THREE.Vector3(
            enemy.mesh.position.x + direction.x * enemy.speed * delta,
            enemy.mesh.position.y,
            enemy.mesh.position.z + direction.z * enemy.speed * delta
        );
        
        // Check for collisions with obstacles
        const canMove = !checkObstacleCollision(enemy.mesh.position, newPosition, 1.5);
        
        // Move the enemy towards the player if no obstacles in the way
        if (canMove) {
            enemy.mesh.position.copy(newPosition);
        } else {
            // Simple obstacle avoidance - try to move around the obstacle
            const leftDirection = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
            const rightDirection = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
            
            // Try moving to the left
            const leftPosition = new THREE.Vector3(
                enemy.mesh.position.x + leftDirection.x * enemy.speed * delta,
                enemy.mesh.position.y,
                enemy.mesh.position.z + leftDirection.z * enemy.speed * delta
            );
            
            // Try moving to the right
            const rightPosition = new THREE.Vector3(
                enemy.mesh.position.x + rightDirection.x * enemy.speed * delta,
                enemy.mesh.position.y,
                enemy.mesh.position.z + rightDirection.z * enemy.speed * delta
            );
            
            // Check which direction is clearer
            const leftClear = !checkObstacleCollision(enemy.mesh.position, leftPosition, 1.5);
            const rightClear = !checkObstacleCollision(enemy.mesh.position, rightPosition, 1.5);
            
            if (leftClear) {
                enemy.mesh.position.copy(leftPosition);
            } else if (rightClear) {
                enemy.mesh.position.copy(rightPosition);
            }
        }
        
        // Make the enemy face the player
        enemy.mesh.lookAt(new THREE.Vector3(playerPosition.x, enemy.mesh.position.y, playerPosition.z));
        
        // Update the enemy's bounding box
        enemy.boundingBox.setFromObject(enemy.mesh);
        
        // Check for collision with player
        const playerPosition2 = new THREE.Vector3();
        yawObject.getWorldPosition(playerPosition2);
        const playerBoundingBox = new THREE.Box3().setFromCenterAndSize(
            playerPosition2,
            new THREE.Vector3(1, 2, 1)
        );
        
        if (enemy.boundingBox.intersectsBox(playerBoundingBox)) {
            console.log('Player collided with enemy!');
            // TODO: implement game over or damage logic
        }
    });
}

// Helper function to check for collisions with obstacles
function checkObstacleCollision(currentPos, newPos, radius) {
    // Create a raycaster to check for collisions
    const direction = new THREE.Vector3().subVectors(newPos, currentPos).normalize();
    const raycaster = new THREE.Raycaster(currentPos, direction);
    
    // Get all potential obstacles
    const obstacles = scene.children.filter(child => 
        child.userData && child.userData.isObstacle
    );
    
    // Check for intersections
    const intersections = raycaster.intersectObjects(obstacles);
    
    // If there's an intersection within our movement distance plus safety radius, return true
    const moveDist = currentPos.distanceTo(newPos);
    return intersections.length > 0 && intersections[0].distance < moveDist + radius;
}

// Set up event listeners for controls
function setupEventListeners() {
    // Click event to enable pointer lock controls
    instructions.addEventListener('click', function() {
        canvas.requestPointerLock();
    });

    // Pointer lock event handlers
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    
    // Keyboard controls
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    
    // Window resize handler
    window.addEventListener('resize', onWindowResize, false);
}

// Handle pointer lock changes
function lockChangeAlert() {
    if (document.pointerLockElement === canvas) {
        // Pointer is locked, enable mouse movement listener
        document.addEventListener('mousemove', onMouseMove, false);
        instructions.classList.add('hidden');
    } else {
        // Pointer is unlocked, disable mouse movement listener
        document.removeEventListener('mousemove', onMouseMove, false);
        instructions.classList.remove('hidden');
    }
}

// Handle mouse movement for camera rotation - improved version
function onMouseMove(event) {
    if (document.pointerLockElement !== canvas) return;
    
    // Get mouse movement and apply sensitivity
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    // Apply to yaw (left/right)
    yawObject.rotation.y -= movementX * mouseSensitivity;
    
    // Apply to pitch (up/down) with constraints
    pitchObject.rotation.x -= movementY * mouseSensitivity;
    pitchObject.rotation.x = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitchObject.rotation.x));
}

// Handle key down events
function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = true;
            break;
        case 'KeyS':
            moveBackward = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            // Enable sprinting
            isSprinting = true;
            isWalking = false;
            updateMovementMode();
            break;
        case 'AltLeft':
        case 'AltRight':
        case 'ControlLeft':
        case 'ControlRight':
            // Enable walking
            isWalking = true;
            isSprinting = false;
            updateMovementMode();
            break;
        case 'Space':
            if (canJump) {
                // Regular jump
                velocity.y = jumpForce;
                canJump = false;
                isJumping = true;
                jumpTime = Date.now();
                
                // Check for bhop timing
                const timeSinceLastJump = jumpTime - lastJumpTime;
                if (timeSinceLastJump <= BHOP_WINDOW && timeSinceLastJump > 0) {
                    // Successful bhop - increase counter
                    bhopChainCount = Math.min(MAX_BHOP_CHAIN, bhopChainCount + 1);
                    
                    // Calculate bhop boost based on chain count
                    currentBhopBoost = BHOP_BASE_BOOST + ((BHOP_MAX_BOOST - BHOP_BASE_BOOST) * (bhopChainCount / MAX_BHOP_CHAIN));
                    
                    isBhopping = true;
                    console.log(`BHOP activated! Chain: ${bhopChainCount}, Boost: ${currentBhopBoost.toFixed(2)}x`);
                    
                    // Update bhop indicator
                    bhopIndicator.textContent = `BHOP x${bhopChainCount} (${currentBhopBoost.toFixed(2)}x)`;
                    bhopIndicator.classList.add('active');
                    setTimeout(() => {
                        bhopIndicator.classList.remove('active');
                    }, 1000);
                    
                } else {
                    // Failed bhop chain - reset counter
                    isBhopping = false;
                    bhopChainCount = 0;
                    currentBhopBoost = BHOP_BASE_BOOST;
                }
                
                lastJumpTime = jumpTime;
            }
            break;
    }
}

// Handle key up events
function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = false;
            break;
        case 'KeyS':
            moveBackward = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = false;
            updateMovementMode();
            break;
        case 'AltLeft':
        case 'AltRight':
        case 'ControlLeft':
        case 'ControlRight':
            isWalking = false;
            updateMovementMode();
            break;
    }
}

// Update movement mode (walking/running/sprinting)
function updateMovementMode() {
    if (isSprinting) {
        playerSpeed = sprintSpeed;
        currentBobAmplitude = sprintBobAmplitude;
        movementIndicator.textContent = "SPRINTING";
        movementIndicator.style.color = "#ff9f9f";
    } else if (isWalking) {
        playerSpeed = walkSpeed;
        currentBobAmplitude = walkBobAmplitude;
        movementIndicator.textContent = "WALKING";
        movementIndicator.style.color = "#9fdcff";
    } else {
        playerSpeed = runSpeed;
        currentBobAmplitude = bobAmplitude;
        movementIndicator.textContent = "RUNNING";
        movementIndicator.style.color = "#ffffff";
    }
    
    if (isBhopping) {
        movementIndicator.textContent += ` + BHOP x${bhopChainCount}`;
        movementIndicator.style.color = "#9fffbf";
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update head bobbing effect when moving - significantly improved for smoothness
function updateHeadBob(delta, speed) {
    if ((moveForward || moveBackward || moveLeft || moveRight) && canJump) {
        // Only bob when moving and grounded
        bobActive = true;
        
        // Scale bobbing speed with movement speed
        const speedFactor = speed / runSpeed;
        bobTimer += delta * speedFactor * bobFrequency;
        
        // Calculate bob effect with dampening for smoother motion
        const verticalBob = Math.sin(bobTimer) * currentBobAmplitude * speedFactor;
        const lateralBob = Math.cos(bobTimer * 0.5) * currentBobAmplitude * 0.5 * speedFactor;
        
        // Use smoothDamp-like approach for camera movement
        const smoothTime = 0.15; // Lower value = faster response
        const omega = 2 / smoothTime;
        const x = omega * delta;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        
        // Apply smooth damping to camera position
        const targetY = verticalBob;
        const targetX = lateralBob;
        
        camera.position.y = camera.position.y * exp + targetY * (1 - exp);
        camera.position.x = camera.position.x * exp + targetX * (1 - exp);
    } else if (bobActive) {
        // Gradually fade out the bob when stopping
        bobActive = false;
        const dampFactor = 0.1;
        
        // Use the same smooth damping approach for stopping
        const smoothTime = 0.3; // Higher value = slower stop
        const omega = 2 / smoothTime;
        const x = omega * delta;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        
        camera.position.y = camera.position.y * exp;
        camera.position.x = camera.position.x * exp;
        
        if (Math.abs(camera.position.y) < 0.002) camera.position.y = 0;
        if (Math.abs(camera.position.x) < 0.002) camera.position.x = 0;
    }
}

// Get movement direction relative to camera orientation
function getMovementDirection() {
    // Start with the basic direction from input
    direction.z = Number(moveBackward) - Number(moveForward);
    direction.x = Number(moveRight) - Number(moveLeft);
    
    // Only normalize if we have some movement
    if (direction.x !== 0 || direction.z !== 0) {
        direction.normalize();
    }
    
    // Convert direction to be relative to camera orientation
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationY(yawObject.rotation.y);
    
    direction.applyMatrix4(rotationMatrix);
    
    return direction;
}

// Check for collision with obstacles
function checkCollisions(newPosition, radius) {
    // Get all obstacles
    const obstacles = scene.children.filter(child => 
        child.userData && child.userData.isObstacle
    );
    
    // Create a bounding sphere for the player
    const playerSphere = new THREE.Sphere(newPosition, radius);
    
    // Check each obstacle
    for (const obstacle of obstacles) {
        // Create a bounding box for the obstacle
        const obstacleBounds = new THREE.Box3().setFromObject(obstacle);
        
        // Check for intersection
        if (obstacleBounds.intersectsSphere(playerSphere)) {
            return true; // Collision detected
        }
    }
    
    return false; // No collision
}

// Update player movement with improved physics
function updatePlayer(delta) {
    // Apply gravity
    velocity.y -= gravity * delta;
    
    // Update movement mode based on keys
    updateMovementMode();
    
    // Calculate the target speed based on input, bhop status, and movement mode
    let targetSpeed = 0;
    if (moveForward || moveBackward || moveLeft || moveRight) {
        targetSpeed = isBhopping ? playerSpeed * currentBhopBoost : playerSpeed;
        targetSpeed = Math.min(targetSpeed, maxSpeed);
    }
    
    // Determine which acceleration rate to use based on movement mode
    let currentAcceleration = acceleration;
    if (isSprinting) {
        currentAcceleration = sprintAcceleration;
    } else if (isWalking) {
        currentAcceleration = walkAcceleration;
    }
    
    // Smooth acceleration and deceleration
    if (currentSpeed < targetSpeed) {
        currentSpeed = Math.min(targetSpeed, currentSpeed + currentAcceleration * delta);
    } else if (currentSpeed > targetSpeed) {
        currentSpeed = Math.max(targetSpeed, currentSpeed - deceleration * delta);
    }
    
    // Get movement direction relative to camera orientation
    const moveDirection = getMovementDirection();
    
    // Calculate potential new position
    const newPosition = new THREE.Vector3(
        yawObject.position.x + moveDirection.x * currentSpeed * delta,
        yawObject.position.y + velocity.y * delta,
        yawObject.position.z + moveDirection.z * currentSpeed * delta
    );
    
    // Check for collisions with obstacles
    const playerRadius = 0.8;
    const hasCollision = checkCollisions(
        new THREE.Vector3(newPosition.x, yawObject.position.y, newPosition.z), 
        playerRadius
    );
    
    // Apply horizontal movement if no collision
    if (!hasCollision) {
        yawObject.position.x = newPosition.x;
        yawObject.position.z = newPosition.z;
    } else {
        // If collision, try to slide along walls
        // Try X movement only
        const xOnlyPosition = new THREE.Vector3(
            newPosition.x,
            yawObject.position.y,
            yawObject.position.z
        );
        
        if (!checkCollisions(xOnlyPosition, playerRadius)) {
            yawObject.position.x = newPosition.x;
        }
        
        // Try Z movement only
        const zOnlyPosition = new THREE.Vector3(
            yawObject.position.x,
            yawObject.position.y,
            newPosition.z
        );
        
        if (!checkCollisions(zOnlyPosition, playerRadius)) {
            yawObject.position.z = newPosition.z;
        }
    }
    
    // Apply vertical movement (gravity/jumping)
    yawObject.position.y += velocity.y * delta;
    
    // Update head bobbing with smoother implementation
    updateHeadBob(delta, currentSpeed);
    
    // Update FOV for speed effect
    updateFOV(delta);
    
    // Ground collision check
    if (yawObject.position.y < playerHeight) {
        yawObject.position.y = playerHeight;
        velocity.y = 0;
        canJump = true;
        isJumping = false;
        
        // Reset bhop status after landing with more forgiving timing
        setTimeout(() => {
            isBhopping = false;
            updateMovementMode(); // Update the movement indicator
        }, 350);
    }
    
    // Boundary checks to keep player within the play area
    const boundaryLimit = 99; // To match ground size
    
    if (Math.abs(yawObject.position.x) > boundaryLimit) {
        yawObject.position.x = Math.sign(yawObject.position.x) * boundaryLimit;
    }
    
    if (Math.abs(yawObject.position.z) > boundaryLimit) {
        yawObject.position.z = Math.sign(yawObject.position.z) * boundaryLimit;
    }
    
    // Update debug info
    updateDebugInfo();
}

// Update FOV based on movement to enhance speed sensation
function updateFOV(delta) {
    // Determine base target FOV based on movement mode
    let targetFOV = defaultFOV;
    
    if (isSprinting) {
        targetFOV = sprintingFOV;
    } else if (isWalking) {
        targetFOV = walkingFOV;
    } else if (moveForward || moveBackward || moveLeft || moveRight) {
        targetFOV = runningFOV;
    }
    
    // Add additional FOV boost during bhop proportional to chain count
    if (isBhopping) {
        targetFOV += bhopChainCount * 1.5; // Add 1.5 degrees per bhop in chain
    }
    
    // Smooth transition to target FOV
    camera.fov += (targetFOV - camera.fov) * fovChangeSpeed * delta;
    
    // Ensure FOV stays within reasonable bounds
    camera.fov = Math.max(walkingFOV - 5, Math.min(sprintingFOV + 20, camera.fov));
    
    // Update projection matrix when FOV changes
    camera.updateProjectionMatrix();
}

// Update debugging information
function updateDebugInfo() {
    debugInfo.innerHTML = `
        Position: (${yawObject.position.x.toFixed(2)}, ${yawObject.position.y.toFixed(2)}, ${yawObject.position.z.toFixed(2)})<br>
        Speed: ${currentSpeed.toFixed(2)} (${isSprinting ? 'Sprinting' : isWalking ? 'Walking' : 'Running'})<br>
        FOV: ${camera.fov.toFixed(1)}<br>
        Bhop Chain: ${bhopChainCount} (Boost: ${currentBhopBoost.toFixed(2)}x)<br>
        Controls: WASD (move), SHIFT (sprint), ALT/CTRL (walk)<br>
        Movement Status: ${canJump ? 'Grounded' : 'In Air'}, ${isBhopping ? 'Bhop Active' : ''}<br>
        Enemies: ${enemies.length}
    `;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(0.1, clock.getDelta());
    
    updatePlayer(delta);
    updateEnemies(delta);
    
    renderer.render(scene, camera);
}

// Clock for timing
const clock = new THREE.Clock();

// Initialize the application
init();
