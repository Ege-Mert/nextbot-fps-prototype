// Global variables
let scene, camera, renderer;
let canvas;
let instructions, hud, debugInfo;

// Player variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let isJumping = false;
let isBhopping = false;
let jumpTime = 0;
let lastJumpTime = 0;
// Increase bhop window to make it more forgiving
const BHOP_WINDOW = 400; // ms window to perform a successful bhop (increased from 200)
const BHOP_BOOST = 1.8; // Speed multiplier for successful bhop (increased from 1.5)

// Physics variables
let velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const playerHeight = 2;
const gravity = 30;
const jumpForce = 12;
const playerSpeed = 10;

// FOV variables
const defaultFOV = 75;
const runningFOV = 85;
const fovChangeSpeed = 5;

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
    canvas = document.getElementById('game-canvas');

    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background

    // Create the camera (first-person perspective)
    camera = new THREE.PerspectiveCamera(defaultFOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = playerHeight;

    // Create the renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create a ground plane
    createGround();
    
    // Spawn initial enemies
    spawnEnemies(MAX_ENEMIES);

    // Set up event listeners
    setupEventListeners();
    
    // Start the animation loop
    animate();
}

// Create the ground plane
function createGround() {
    // Increased ground size from 100x100 to 200x200
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22, // Forest green
        roughness: 0.8
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);
}

// Create and spawn enemies
function createEnemy() {
    // Create enemy mesh
    const enemyGeometry = new THREE.BoxGeometry(1.5, ENEMY_HEIGHT, 1);
    const enemyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,  // Red color for the enemy
        roughness: 0.5
    });
    
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    
    // Position the enemy randomly around the player, but at a distance
    const angle = Math.random() * Math.PI * 2;
    enemy.position.x = camera.position.x + Math.cos(angle) * ENEMY_SPAWN_DISTANCE;
    enemy.position.z = camera.position.z + Math.sin(angle) * ENEMY_SPAWN_DISTANCE;
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
        // Update the enemy's position to move towards the player
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, enemy.mesh.position).normalize();
        
        // Don't change the y-position (keep enemy on the ground)
        direction.y = 0;
        
        // Move the enemy towards the player
        enemy.mesh.position.x += direction.x * enemy.speed * delta;
        enemy.mesh.position.z += direction.z * enemy.speed * delta;
        
        // Make the enemy face the player
        enemy.mesh.lookAt(new THREE.Vector3(camera.position.x, enemy.mesh.position.y, camera.position.z));
        
        // Update the enemy's bounding box
        enemy.boundingBox.setFromObject(enemy.mesh);
        
        // Check for collision with player
        const playerBoundingBox = new THREE.Box3().setFromObject(camera);
        if (enemy.boundingBox.intersectsBox(playerBoundingBox)) {
            console.log('Player collided with enemy!');
            // TODO: implement game over or damage logic
        }
    });
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

// Handle mouse movement for camera rotation
function onMouseMove(event) {
    // Rotate the camera based on mouse movement
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    // Horizontal rotation (yaw)
    camera.rotation.y -= movementX * 0.002;
    
    // Vertical rotation (pitch) with limits to prevent over-rotation
    const newRotationX = camera.rotation.x - movementY * 0.002;
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, newRotationX));
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
                    isBhopping = true;
                    console.log('BHOP activated!');
                } else {
                    isBhopping = false;
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
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update player movement and physics
function updatePlayer(delta) {
    // Apply gravity
    velocity.y -= gravity * delta;
    
    // Handle movement based on camera direction
    const speed = isBhopping ? playerSpeed * BHOP_BOOST : playerSpeed;
    
    // Fix: Corrected the direction calculation to fix inverted forward/backward
    direction.z = Number(moveBackward) - Number(moveForward);  // Fixed inversion
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    
    // Move forward/backward
    if (moveForward || moveBackward) {
        velocity.z = direction.z * speed;
    } else {
        velocity.z = 0;
    }
    
    // Move left/right
    if (moveLeft || moveRight) {
        velocity.x = direction.x * speed;
    } else {
        velocity.x = 0;
    }
    
    // Adjust movement direction based on camera rotation
    const angle = camera.rotation.y;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    
    const vx = velocity.x * cos - velocity.z * sin;
    const vz = velocity.x * sin + velocity.z * cos;
    
    // Move the camera (player)
    camera.position.x += vx * delta;
    camera.position.z += vz * delta;
    camera.position.y += velocity.y * delta;
    
    // Update FOV for speed effect
    updateFOV(delta);
    
    // Ground collision check
    if (camera.position.y < playerHeight) {
        camera.position.y = playerHeight;
        velocity.y = 0;
        canJump = true;
        isJumping = false;
        
        // Reset bhop status after landing
        setTimeout(() => {
            isBhopping = false;
        }, 300); // Increased from 200ms to give more time
    }
    
    // Boundary checks to keep player within the play area
    const boundaryLimit = 99; // Increased to match larger ground
    
    if (Math.abs(camera.position.x) > boundaryLimit) {
        camera.position.x = Math.sign(camera.position.x) * boundaryLimit;
    }
    
    if (Math.abs(camera.position.z) > boundaryLimit) {
        camera.position.z = Math.sign(camera.position.z) * boundaryLimit;
    }
    
    // Update debug info
    updateDebugInfo();
}

// Update FOV based on movement to enhance speed sensation
function updateFOV(delta) {
    // Determine if player is moving
    const isMoving = moveForward || moveBackward || moveLeft || moveRight;
    
    // Adjust FOV
    if (isMoving) {
        // Gradually increase FOV when moving
        if (camera.fov < runningFOV) {
            camera.fov += fovChangeSpeed * delta * 10;
            if (camera.fov > runningFOV) camera.fov = runningFOV;
            camera.updateProjectionMatrix();
        }
    } else {
        // Gradually decrease FOV when standing still
        if (camera.fov > defaultFOV) {
            camera.fov -= fovChangeSpeed * delta * 10;
            if (camera.fov < defaultFOV) camera.fov = defaultFOV;
            camera.updateProjectionMatrix();
        }
    }
    
    // Increase FOV more when bhopping
    if (isBhopping && camera.fov < runningFOV + 5) {
        camera.fov += fovChangeSpeed * delta * 15;
        camera.updateProjectionMatrix();
    }
}

// Update debugging information
function updateDebugInfo() {
    debugInfo.innerHTML = `
        Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})<br>
        Velocity: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)})<br>
        FOV: ${camera.fov.toFixed(1)}<br>
        Can Jump: ${canJump}<br>
        Is Jumping: ${isJumping}<br>
        Bhop Active: ${isBhopping}<br>
        Jump Time: ${jumpTime}<br>
        Last Jump Time: ${lastJumpTime}<br>
        Time Since Last Jump: ${jumpTime - lastJumpTime}ms<br>
        Enemy Count: ${enemies.length}
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
