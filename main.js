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
let lastLandTime = 0; // Track when the player last landed

// Bhop variables for gradual speed increase
let bhopChainCount = 0;
const MAX_BHOP_CHAIN = 10; // Maximum number of consecutive bhops
const BHOP_BASE_BOOST = 1.2; // Initial speed boost
const BHOP_MAX_BOOST = 2.5; // Maximum speed boost after MAX_BHOP_CHAIN
let currentBhopBoost = BHOP_BASE_BOOST;
let bhopResetTimer = null; // Timer for resetting bhop state
// Refined bhop window and momentum system
const BHOP_PERFECT_WINDOW = 200; // ms for perfect timing (max boost)
const BHOP_GOOD_WINDOW = 350;    // ms for good timing (medium boost)
const BHOP_MAX_WINDOW = 450;     // ms for acceptable timing (min boost)
const BHOP_MOMENTUM_DECAY = 0.05; // How quickly bhop momentum decays when not jumping
let bhopMomentum = 0; // 0-1 value representing built-up momentum
let lastBhopQuality = 0; // 0-1 value representing the quality of last bhop

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
let targetSpeed = 0;
const acceleration = 80;       // Reduced for smoother acceleration
const deceleration = 60;       // Reduced for smoother deceleration
const sprintAcceleration = 120; // Faster acceleration when sprinting
const walkAcceleration = 40;    // Slower acceleration when walking
const maxSpeed = 35;            // Maximum possible speed with bhop
const airControl = 0.3;         // 0-1 factor for how much control in air (lower = less)

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
const ENEMY_SPEED_MIN = 4.5;
const ENEMY_SPEED_MAX = 7.5;
const ENEMY_HEIGHT = 2.5;
const ENEMY_SPRINT_MULTIPLIER = 1.8; // How much faster enemies move when in sight
const ENEMY_SPAWN_DISTANCE = 35;
const MAX_ENEMIES = 5;  // Increased number of enemies
const ENEMY_PATH_UPDATE_INTERVAL = 500; // ms between path recalculation
const ENEMY_PERCEPTION_RANGE = 70; // How far enemies can "see" the player
const ENEMY_STUN_DURATION = 1500; // ms that enemy is stunned after hitting an obstacle
const ENEMY_JUMP_HEIGHT = 1; // How high enemies can jump to overcome obstacles
const ENEMY_TELEPORT_COOLDOWN = 10000; // ms between enemy teleports when stuck
const ENEMY_MAX_STUCK_TIME = 3000; // ms before enemy is considered stuck

// Pathfinding grid
const GRID_SIZE = 2; // Size of each grid cell
const GRID_WIDTH = 200; // Width of the grid
const GRID_HEIGHT = 200; // Height of the grid
let pathfindingGrid = [];

// Enemy group behavior variables
const GROUP_DISTANCE = 15; // Maximum distance between grouped enemies
const GROUP_BEHAVIOR_INTERVAL = 2000; // ms between group behavior updates
let lastGroupUpdate = 0;

// Visual effects variables
const particleSystem = {
    bhopParticles: [],
    maxParticles: 50
};

// Enemy textures for face
let enemyFaceTextures = [];

// Sound variables
let audioListener;
let sounds = {};

// Debug variables
let showDebugBhop = false; // Show detailed bhop debugging
let showDebugPaths = false; // Show enemy pathfinding

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
    
    // Set up audio
    setupAudio();
    
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

    // Create the renderer with better performance settings
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: 'high-performance'
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
    // Improve shadow quality but limit shadow map for performance
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    // Load enemy face textures
    loadEnemyFaces();

    // Create a ground plane
    createGround();
    
    // Add some obstacles for better gameplay
    createObstacles();
    
    // Initialize pathfinding grid
    initializePathfindingGrid();
    
    // Setup visual effects
    setupVisualEffects();
    
    // Spawn initial enemies
    spawnEnemies(MAX_ENEMIES);

    // Set up event listeners
    setupEventListeners();
    
    // Start the animation loop
    animate();
}

// Load enemy face textures
function loadEnemyFaces() {
    const textureLoader = new THREE.TextureLoader();
    
    // Create simple canvas textures for enemy faces until real images can be loaded
    for (let i = 0; i < 5; i++) {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Fill background
        context.fillStyle = '#222222';
        context.fillRect(0, 0, 256, 256);
        
        // Draw simple face
        context.fillStyle = '#ffffff';
        
        // Different eye styles for variety
        if (i === 0) {
            // Angry eyes
            context.fillRect(50, 70, 50, 20);
            context.fillRect(156, 70, 50, 20);
        } else if (i === 1) {
            // Round eyes
            context.beginPath();
            context.arc(75, 80, 30, 0, Math.PI * 2);
            context.arc(181, 80, 30, 0, Math.PI * 2);
            context.fill();
        } else if (i === 2) {
            // Square eyes
            context.fillRect(45, 50, 60, 60);
            context.fillRect(151, 50, 60, 60);
        } else if (i === 3) {
            // Triangle eyes
            context.beginPath();
            context.moveTo(45, 90);
            context.lineTo(75, 40);
            context.lineTo(105, 90);
            context.moveTo(151, 90);
            context.lineTo(181, 40);
            context.lineTo(211, 90);
            context.fill();
        } else {
            // X eyes
            context.lineWidth = 10;
            context.strokeStyle = '#ffffff';
            context.beginPath();
            context.moveTo(45, 50);
            context.lineTo(105, 110);
            context.moveTo(105, 50);
            context.lineTo(45, 110);
            context.moveTo(151, 50);
            context.lineTo(211, 110);
            context.moveTo(211, 50);
            context.lineTo(151, 110);
            context.stroke();
        }
        
        // Draw mouth
        context.fillStyle = '#ff0000';
        if (i % 2 === 0) {
            // Wide grin
            context.beginPath();
            context.arc(128, 170, 60, 0, Math.PI);
            context.fill();
        } else {
            // Straight line
            context.fillRect(68, 160, 120, 20);
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        enemyFaceTextures.push(texture);
    }
}

// Set up audio system
function setupAudio() {
    // Create an audio listener and add it to the camera
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    
    // Jump sound
    const jumpSound = new THREE.Audio(audioListener);
    const bhopSound = new THREE.Audio(audioListener);
    const footstepSound = new THREE.Audio(audioListener);
    const enemyAlertSound = new THREE.Audio(audioListener);
    
    // Load sounds (would normally be external, using placeholders)
    const audioLoader = new THREE.AudioLoader();
    
    // Initialize sound placeholders (would be loaded from files)
    sounds.jump = jumpSound;
    sounds.bhop = bhopSound;
    sounds.footstep = footstepSound;
    sounds.enemyAlert = enemyAlertSound;
}

// Set up visual effects systems
function setupVisualEffects() {
    // Create particle geometry for bhop effects
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleSystem.maxParticles * 3);
    const particleSizes = new Float32Array(particleSystem.maxParticles);
    
    // Initialize particle positions off-screen
    for (let i = 0; i < particleSystem.maxParticles; i++) {
        particlePositions[i * 3] = 0;
        particlePositions[i * 3 + 1] = -100; // Below ground
        particlePositions[i * 3 + 2] = 0;
        particleSizes[i] = 0.1;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    
    // Create particle material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.5,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true
    });
    
    // Create particle system
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    particleSystem.geometry = particleGeometry;
    particleSystem.material = particleMaterial;
    particleSystem.particles = particles;
}

// Create a bhop particle effect at player's position
function createBhopEffect() {
    // Create particles around player's feet
    const particleCount = 10 + Math.floor(bhopChainCount * 3);
    const positions = particleSystem.geometry.attributes.position.array;
    const sizes = particleSystem.geometry.attributes.size.array;
    
    for (let i = 0; i < particleCount; i++) {
        const index = i % particleSystem.maxParticles;
        
        // Set position at player's feet with random spread
        positions[index * 3] = yawObject.position.x + (Math.random() - 0.5) * 2;
        positions[index * 3 + 1] = playerHeight * 0.1 + Math.random() * 0.1;
        positions[index * 3 + 2] = yawObject.position.z + (Math.random() - 0.5) * 2;
        
        // Set size based on bhop chain
        sizes[index] = 0.3 + Math.min(0.5, bhopChainCount * 0.05);
        
        // Create particle object for updating
        particleSystem.bhopParticles.push({
            index: index,
            life: 0,
            maxLife: 30 + Math.random() * 20,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                0.1 + Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            )
        });
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.size.needsUpdate = true;
}

// Update particle effects
function updateParticles(delta) {
    const positions = particleSystem.geometry.attributes.position.array;
    const sizes = particleSystem.geometry.attributes.size.array;
    
    // Update bhop particles
    for (let i = particleSystem.bhopParticles.length - 1; i >= 0; i--) {
        const particle = particleSystem.bhopParticles[i];
        particle.life += delta * 60;
        
        if (particle.life >= particle.maxLife) {
            // Remove dead particles
            positions[particle.index * 3 + 1] = -100; // Move below ground
            sizes[particle.index] = 0;
            particleSystem.bhopParticles.splice(i, 1);
        } else {
            // Update particle position
            positions[particle.index * 3] += particle.velocity.x;
            positions[particle.index * 3 + 1] += particle.velocity.y;
            positions[particle.index * 3 + 2] += particle.velocity.z;
            
            // Apply gravity to particle
            particle.velocity.y -= 0.01;
            
            // Fade out particle
            const lifeRatio = particle.life / particle.maxLife;
            sizes[particle.index] *= 0.98;
        }
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.size.needsUpdate = true;
}

// Initialize the pathfinding grid
function initializePathfindingGrid() {
    // Create empty grid
    pathfindingGrid = new Array(Math.ceil(GRID_WIDTH / GRID_SIZE));
    for (let x = 0; x < pathfindingGrid.length; x++) {
        pathfindingGrid[x] = new Array(Math.ceil(GRID_HEIGHT / GRID_SIZE));
        for (let z = 0; z < pathfindingGrid[x].length; z++) {
            pathfindingGrid[x][z] = 1; // 1 = walkable, 0 = obstacle
        }
    }
    
    // Mark obstacle positions in grid
    scene.children.forEach(child => {
        if (child.userData && child.userData.isObstacle) {
            const box = new THREE.Box3().setFromObject(child);
            
            // Convert world coordinates to grid coordinates
            const minX = Math.floor((box.min.x + GRID_WIDTH/2) / GRID_SIZE);
            const maxX = Math.ceil((box.max.x + GRID_WIDTH/2) / GRID_SIZE);
            const minZ = Math.floor((box.min.z + GRID_HEIGHT/2) / GRID_SIZE);
            const maxZ = Math.ceil((box.max.z + GRID_HEIGHT/2) / GRID_SIZE);
            
            // Mark cells as obstacles
            for (let x = minX; x < maxX; x++) {
                for (let z = minZ; z < maxZ; z++) {
                    if (x >= 0 && x < pathfindingGrid.length && 
                        z >= 0 && z < pathfindingGrid[0].length) {
                        pathfindingGrid[x][z] = 0; // 0 = obstacle
                    }
                }
            }
        }
    });
}

// Convert world coordinates to grid coordinates
function worldToGrid(position) {
    const x = Math.floor((position.x + GRID_WIDTH/2) / GRID_SIZE);
    const z = Math.floor((position.z + GRID_HEIGHT/2) / GRID_SIZE);
    return { x, z };
}

// Convert grid coordinates to world coordinates
function gridToWorld(gridX, gridZ) {
    const x = (gridX * GRID_SIZE) - GRID_WIDTH/2 + GRID_SIZE/2;
    const z = (gridZ * GRID_SIZE) - GRID_HEIGHT/2 + GRID_SIZE/2;
    return { x, z };
}

// Find a path from start to end using A* algorithm
function findPath(startPos, endPos) {
    // Convert world positions to grid coordinates
    const start = worldToGrid(startPos);
    const end = worldToGrid(endPos);
    
    // Check if start or end are out of bounds or in obstacles
    if (start.x < 0 || start.x >= pathfindingGrid.length || 
        start.z < 0 || start.z >= pathfindingGrid[0].length ||
        end.x < 0 || end.x >= pathfindingGrid.length || 
        end.z < 0 || end.z >= pathfindingGrid[0].length ||
        pathfindingGrid[start.x][start.z] === 0 ||
        pathfindingGrid[end.x][end.z] === 0) {
        return []; // No valid path
    }
    
    // If start and end are same cell, return single point
    if (start.x === end.x && start.z === end.z) {
        const worldPos = gridToWorld(start.x, start.z);
        return [new THREE.Vector3(worldPos.x, 0, worldPos.z)];
    }
    
    // A* algorithm
    const openSet = [];
    const closedSet = new Set();
    const gScore = {}; // Cost from start to current
    const fScore = {}; // Estimated total cost
    const cameFrom = {}; // To reconstruct path
    
    // Initialize start node
    const startKey = `${start.x},${start.z}`;
    gScore[startKey] = 0;
    fScore[startKey] = heuristic(start, end);
    openSet.push({ x: start.x, z: start.z, f: fScore[startKey] });
    
    while (openSet.length > 0) {
        // Get node with lowest fScore
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const currentKey = `${current.x},${current.z}`;
        
        // Check if reached end
        if (current.x === end.x && current.z === end.z) {
            // Reconstruct path
            return reconstructPath(cameFrom, current);
        }
        
        // Add to closed set
        closedSet.add(currentKey);
        
        // Check neighbors
        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.z}`;
            
            // Skip if in closed set
            if (closedSet.has(neighborKey)) continue;
            
            // Calculate tentative gScore
            const tentativeGScore = gScore[currentKey] + 1;
            
            // If neighbor not in open set, add it
            let inOpenSet = false;
            for (let i = 0; i < openSet.length; i++) {
                if (openSet[i].x === neighbor.x && openSet[i].z === neighbor.z) {
                    inOpenSet = true;
                    break;
                }
            }
            
            if (!inOpenSet) {
                openSet.push({ 
                    x: neighbor.x, 
                    z: neighbor.z, 
                    f: tentativeGScore + heuristic(neighbor, end) 
                });
            }
            
            // Update if better path found
            if (tentativeGScore < (gScore[neighborKey] || Infinity)) {
                cameFrom[neighborKey] = current;
                gScore[neighborKey] = tentativeGScore;
                fScore[neighborKey] = tentativeGScore + heuristic(neighbor, end);
                
                // Update fScore in openSet
                for (let i = 0; i < openSet.length; i++) {
                    if (openSet[i].x === neighbor.x && openSet[i].z === neighbor.z) {
                        openSet[i].f = fScore[neighborKey];
                        break;
                    }
                }
            }
        }
    }
    
    // No path found
    return [];
}

// Heuristic function for A* (Manhattan distance)
function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

// Get walkable neighbors of a grid cell
function getNeighbors(node) {
    const neighbors = [];
    const directions = [
        { x: 0, z: 1 },  // North
        { x: 1, z: 0 },  // East
        { x: 0, z: -1 }, // South
        { x: -1, z: 0 }, // West
        { x: 1, z: 1 },  // Northeast
        { x: 1, z: -1 }, // Southeast
        { x: -1, z: -1 },// Southwest
        { x: -1, z: 1 }  // Northwest
    ];
    
    for (const dir of directions) {
        const x = node.x + dir.x;
        const z = node.z + dir.z;
        
        // Check bounds
        if (x >= 0 && x < pathfindingGrid.length && 
            z >= 0 && z < pathfindingGrid[0].length) {
            // Check if walkable
            if (pathfindingGrid[x][z] === 1) {
                neighbors.push({ x, z });
            }
        }
    }
    
    return neighbors;
}

// Reconstruct path from A* search
function reconstructPath(cameFrom, current) {
    const path = [];
    let curr = current;
    
    while (curr) {
        const worldPos = gridToWorld(curr.x, curr.z);
        path.unshift(new THREE.Vector3(worldPos.x, 0, worldPos.z));
        
        const key = `${curr.x},${curr.z}`;
        curr = cameFrom[key];
    }
    
    // Optimize path by removing unnecessary waypoints
    return simplifyPath(path);
}

// Simplify path by removing unnecessary waypoints
function simplifyPath(path) {
    if (path.length <= 2) return path;
    
    const simplified = [path[0]];
    let i = 0;
    
    while (i < path.length - 2) {
        // Check if we can move directly from current point to a further point
        let furthestVisible = i + 1;
        
        for (let j = i + 2; j < path.length; j++) {
            if (!lineOfSight(path[i], path[j])) {
                break;
            }
            furthestVisible = j;
        }
        
        simplified.push(path[furthestVisible]);
        i = furthestVisible;
    }
    
    // Add end point if not already added
    if (simplified[simplified.length - 1] !== path[path.length - 1]) {
        simplified.push(path[path.length - 1]);
    }
    
    return simplified;
}

// Check if there's a clear line of sight between two points
function lineOfSight(a, b) {
    // Cast ray between points
    const dir = new THREE.Vector3()
        .subVectors(b, a)
        .normalize();
    
    const raycaster = new THREE.Raycaster(a, dir);
    const obstacles = scene.children.filter(child => 
        child.userData && child.userData.isObstacle
    );
    
    const distance = a.distanceTo(b);
    const intersections = raycaster.intersectObjects(obstacles);
    
    // If any intersection is closer than target, line of sight is blocked
    return intersections.length === 0 || intersections[0].distance > distance;
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
    for (let i = 0; i < 15; i++) {
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
function createEnemy(isCluster = false, clusterCenter = null, clusterRadius = 10) {
    // Create enemy mesh
    const enemyGeometry = new THREE.BoxGeometry(1.5, ENEMY_HEIGHT, 1);
    const enemyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0x550000,
        roughness: 0.5
    });
    
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    
    // Position the enemy
    if (isCluster && clusterCenter) {
        // Position near cluster center
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * clusterRadius;
        enemy.position.x = clusterCenter.x + Math.cos(angle) * distance;
        enemy.position.z = clusterCenter.z + Math.sin(angle) * distance;
    } else {
        // Random position around player
        const angle = Math.random() * Math.PI * 2;
        enemy.position.x = yawObject.position.x + Math.cos(angle) * ENEMY_SPAWN_DISTANCE;
        enemy.position.z = yawObject.position.z + Math.sin(angle) * ENEMY_SPAWN_DISTANCE;
    }
    enemy.position.y = ENEMY_HEIGHT / 2;
    
    // Add Nextbot face
    const faceIndex = Math.floor(Math.random() * enemyFaceTextures.length);
    
    // Create a plane for the face texture
    const faceGeometry = new THREE.PlaneGeometry(1.4, 1.4);
    const faceMaterial = new THREE.MeshBasicMaterial({
        map: enemyFaceTextures[faceIndex],
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.z = 0.51; // Slightly in front of the box
    face.position.y = 0.5;  // Center on the front of the box
    enemy.add(face);
    
    enemy.castShadow = true;
    enemy.receiveShadow = true;
    
    // Add path visualization lines
    const pathLineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.5
    });
    const pathLineGeometry = new THREE.BufferGeometry();
    const pathLine = new THREE.Line(pathLineGeometry, pathLineMaterial);
    pathLine.visible = showDebugPaths;
    scene.add(pathLine);
    
    // Create prediction line for player movement
    const predictionLineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5
    });
    const predictionLineGeometry = new THREE.BufferGeometry();
    const predictionLine = new THREE.Line(predictionLineGeometry, predictionLineMaterial);
    predictionLine.visible = showDebugPaths;
    scene.add(predictionLine);
    
    // Add screaming effect for when close to player
    const screamGeometry = new THREE.SphereGeometry(2, 16, 16);
    const screamMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide
    });
    const screamEffect = new THREE.Mesh(screamGeometry, screamMaterial);
    screamEffect.scale.set(1, 1, 1);
    enemy.add(screamEffect);
    
    // Create enemy object with properties
    const enemyObj = {
        mesh: enemy,
        face: face,
        speed: ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN),
        baseSpeed: ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN),
        boundingBox: new THREE.Box3().setFromObject(enemy),
        lastPathUpdate: 0,
        lastPlayerPos: new THREE.Vector3(),
        path: [],
        currentPathIndex: 0,
        pathLine: pathLine,
        predictionLine: predictionLine,
        stunned: false,
        stunnedUntil: 0,
        teleporting: false,
        teleportCooldown: ENEMY_TELEPORT_COOLDOWN,
        lastTeleport: 0,
        lastMovePos: new THREE.Vector3().copy(enemy.position),
        stuckTime: 0,
        stuckTimeStart: 0,
        isLeader: Math.random() < 0.2, // 20% chance to be a leader
        groupMembers: [],
        role: isCluster ? (Math.random() < 0.2 ? 'flanker' : 'follower') : 'chaser',
        targetOffset: new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            0,
            (Math.random() - 0.5) * 10
        ),
        jumpHeight: 0,
        isJumping: false,
        targetJumpHeight: 0,
        jumpVelocity: 0,
        nextJumpTime: 0,
        predictedPlayerPos: new THREE.Vector3(),
        screamEffect: screamEffect,
        isScreaming: false,
        lastScream: 0,
        screamCooldown: 3000 + Math.random() * 2000
    };
    
    enemies.push(enemyObj);
    
    // If this is a leader, make it larger and red
    if (enemyObj.isLeader) {
        enemy.scale.set(1.4, 1.4, 1.4);
        enemyMaterial.color.set(0xaa0000);
        enemyMaterial.emissive.set(0x330000);
        enemyObj.speed *= 0.8; // Leaders are slower but more coordinated
    }
    
    // If this is a flanker, make it faster but smaller
    if (enemyObj.role === 'flanker') {
        enemy.scale.set(0.9, 0.9, 0.9);
        enemyMaterial.color.set(0xff3333);
        enemyObj.speed *= 1.3; // Flankers are faster
        enemyObj.baseSpeed *= 1.3;
    }
    
    return enemyObj;
}

// Create and spawn enemies
function spawnEnemies(count) {
    // First, spawn a few clustered groups
    const clusterCount = Math.min(2, Math.floor(count / 2));
    let remainingEnemies = count;
    
    for (let i = 0; i < clusterCount; i++) {
        // Create cluster center position
        const angle = Math.random() * Math.PI * 2;
        const clusterCenter = new THREE.Vector3(
            yawObject.position.x + Math.cos(angle) * ENEMY_SPAWN_DISTANCE,
            0,
            yawObject.position.z + Math.sin(angle) * ENEMY_SPAWN_DISTANCE
        );
        
        // Spawn 2-3 enemies in this cluster
        const clusterSize = Math.min(remainingEnemies, 2 + Math.floor(Math.random() * 2));
        remainingEnemies -= clusterSize;
        
        // Create leader first
        const leader = createEnemy(true, clusterCenter, 5);
        leader.isLeader = true;
        leader.mesh.scale.set(1.4, 1.4, 1.4);
        leader.mesh.material.color.set(0xaa0000);
        leader.mesh.material.emissive.set(0x330000);
        leader.speed *= 0.9;
        
        // Create followers
        for (let j = 1; j < clusterSize; j++) {
            const follower = createEnemy(true, clusterCenter, 5);
            leader.groupMembers.push(follower);
            follower.isLeader = false;
            follower.role = Math.random() < 0.3 ? 'flanker' : 'follower';
            
            if (follower.role === 'flanker') {
                follower.mesh.scale.set(0.9, 0.9, 0.9);
                follower.mesh.material.color.set(0xff3333);
                follower.speed *= 1.3;
                follower.baseSpeed *= 1.3;
            }
        }
    }
    
    // Spawn remaining enemies individually
    for (let i = 0; i < remainingEnemies; i++) {
        createEnemy();
    }
}

// Update enemy positions and AI
function updateEnemies(delta) {
    const now = Date.now();
    const playerPosition = new THREE.Vector3();
    yawObject.getWorldPosition(playerPosition);
    
    // Predict player position based on velocity
    const predictedPlayerPosition = new THREE.Vector3(
        playerPosition.x + velocity.x * delta * 10,
        playerPosition.y,
        playerPosition.z + velocity.z * delta * 10
    );
    
    // Check if we need to update group behavior
    if (now - lastGroupUpdate > GROUP_BEHAVIOR_INTERVAL) {
        updateGroupBehavior();
        lastGroupUpdate = now;
    }
    
    enemies.forEach(enemy => {
        // Skip update if enemy is stunned
        if (enemy.stunned) {
            if (now > enemy.stunnedUntil) {
                enemy.stunned = false;
                enemy.mesh.material.color.set(0xff0000); // Reset color
            } else {
                // Flash color while stunned
                const flashSpeed = 200;
                if (Math.floor(now / flashSpeed) % 2 === 0) {
                    enemy.mesh.material.color.set(0xff0000);
                } else {
                    enemy.mesh.material.color.set(0x666666);
                }
                return;
            }
        }
        
        // Check if teleporting (for stuck enemies)
        if (enemy.teleporting) {
            // Make visual effect
            enemy.mesh.position.y += Math.sin(now / 100) * 0.1;
            
            // Finish teleport after delay
            if (now > enemy.teleportTime) {
                enemy.teleporting = false;
                enemy.mesh.visible = true;
                enemy.lastMovePos.copy(enemy.mesh.position);
                enemy.stuckTime = 0;
            }
            return;
        }
        
        // Get distance to player
        const distToPlayer = playerPosition.distanceTo(enemy.mesh.position);
        
        // Update screaming effect
        updateEnemyScream(enemy, distToPlayer, now);
        
        // Check if enemy is stuck
        const moveDistance = enemy.mesh.position.distanceTo(enemy.lastMovePos);
        if (moveDistance < 0.1) {
            if (enemy.stuckTime === 0) {
                enemy.stuckTimeStart = now;
            }
            enemy.stuckTime = now - enemy.stuckTimeStart;
            
            // If stuck for too long, try to teleport
            if (enemy.stuckTime > ENEMY_MAX_STUCK_TIME && now - enemy.lastTeleport > enemy.teleportCooldown) {
                teleportEnemy(enemy, playerPosition);
                return;
            }
        } else {
            enemy.stuckTime = 0;
            enemy.lastMovePos.copy(enemy.mesh.position);
        }
        
        // Handle jumping
        if (enemy.isJumping) {
            updateEnemyJump(enemy, delta);
        }
        
        // Check if within perception range
        if (distToPlayer > ENEMY_PERCEPTION_RANGE) {
            // Enemy can't see player, wander randomly
            if (enemy.path.length === 0 || enemy.currentPathIndex >= enemy.path.length) {
                // If part of a group, follow leader or assigned role
                if (enemy.role === 'follower' && enemy.isLeader === false) {
                    // Find leader or other group members
                    let leader = null;
                    for (const otherEnemy of enemies) {
                        if (otherEnemy.isLeader && otherEnemy.groupMembers.includes(enemy)) {
                            leader = otherEnemy;
                            break;
                        }
                    }
                    
                    if (leader) {
                        // Follow behind leader
                        const leaderDir = new THREE.Vector3().subVectors(
                            leader.mesh.position, 
                            playerPosition
                        ).normalize().multiplyScalar(5);
                        
                        const targetPos = new THREE.Vector3()
                            .addVectors(leader.mesh.position, leaderDir);
                        
                        enemy.path = findPath(enemy.mesh.position, targetPos);
                        enemy.currentPathIndex = 0;
                        updatePathVisualization(enemy);
                    } else {
                        // No leader, wander randomly
                        wanderRandomly(enemy);
                    }
                } else if (enemy.role === 'flanker') {
                    // Try to flank the player's position
                    const flankAngle = Math.random() * Math.PI - Math.PI/2; // -90 to +90 degrees
                    const playerDir = new THREE.Vector3().subVectors(
                        playerPosition, 
                        enemy.mesh.position
                    ).normalize();
                    
                    // Rotate the direction to flank
                    const flankDir = new THREE.Vector3(
                        playerDir.x * Math.cos(flankAngle) - playerDir.z * Math.sin(flankAngle),
                        0,
                        playerDir.x * Math.sin(flankAngle) + playerDir.z * Math.cos(flankAngle)
                    ).normalize().multiplyScalar(20);
                    
                    const targetPos = new THREE.Vector3()
                        .addVectors(playerPosition, flankDir);
                    
                    enemy.path = findPath(enemy.mesh.position, targetPos);
                    enemy.currentPathIndex = 0;
                    updatePathVisualization(enemy);
                } else {
                    // Leader or solo enemy, wander randomly
                    wanderRandomly(enemy);
                }
            }
        } else {
            // Enemy can see player, start chase behavior
            // Check if path needs updating
            const playerMoved = (enemy.lastPlayerPos.distanceTo(playerPosition) > 5);
            const needsPathUpdate = (now - enemy.lastPathUpdate > ENEMY_PATH_UPDATE_INTERVAL) || 
                                  playerMoved || 
                                  enemy.path.length === 0 || 
                                  enemy.currentPathIndex >= enemy.path.length;
            
            if (needsPathUpdate) {
                // Predict where player is going
                enemy.predictedPlayerPos.copy(getPositionPrediction(playerPosition, predictedPlayerPosition, enemy));
                
                // Get target position based on role
                let targetPosition = new THREE.Vector3();
                
                if (enemy.role === 'flanker') {
                    // Flankers try to cut off the player's path
                    const playerVelocityDir = new THREE.Vector3()
                        .subVectors(predictedPlayerPosition, playerPosition)
                        .normalize();
                    
                    if (playerVelocityDir.length() > 0.1) {
                        // Player is moving, try to intercept
                        targetPosition.copy(predictedPlayerPosition);
                    } else {
                        // Player not moving, come from a random angle
                        const angle = Math.random() * Math.PI * 2;
                        targetPosition.set(
                            playerPosition.x + Math.cos(angle) * 10,
                            0,
                            playerPosition.z + Math.sin(angle) * 10
                        );
                    }
                } else if (enemy.role === 'follower' && !enemy.isLeader) {
                    // Followers go directly to player but offset a bit
                    targetPosition.copy(playerPosition).add(enemy.targetOffset);
                } else {
                    // Leaders and chasers go directly to predicted player position
                    targetPosition.copy(enemy.predictedPlayerPos);
                }
                
                // Update path to target
                enemy.path = findPath(enemy.mesh.position, targetPosition);
                enemy.currentPathIndex = 0;
                enemy.lastPathUpdate = now;
                enemy.lastPlayerPos.copy(playerPosition);
                
                // Update path visualization
                updatePathVisualization(enemy);
                
                // Update prediction visualization
                updatePredictionVisualization(enemy);
            }
        }
        
        // Follow path if available
        const hasLineOfSight = lineOfSight(enemy.mesh.position, playerPosition);
        const isCloseToPlayer = distToPlayer < 20;
        
        // Decide movement strategy:
        // 1. Direct chase if close with line of sight
        // 2. Follow path if available 
        // 3. Try to find a new path as a fallback
        
        if (isCloseToPlayer && hasLineOfSight) {
            // Direct chase with line of sight - most aggressive mode
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, enemy.mesh.position).normalize();
            direction.y = 0;
            
            // Move faster when in direct sight of player
            const chaseSpeed = enemy.speed * ENEMY_SPRINT_MULTIPLIER;
            
            // Calculate potential new position
            const newPosition = new THREE.Vector3(
                enemy.mesh.position.x + direction.x * chaseSpeed * delta,
                enemy.mesh.position.y,
                enemy.mesh.position.z + direction.z * chaseSpeed * delta
            );
            
            // Check for collisions with obstacles
            const canMove = !checkObstacleCollision(enemy.mesh.position, newPosition, 1.5);
            
            if (canMove) {
                enemy.mesh.position.copy(newPosition);
                
                // Make the enemy face the player
                enemy.mesh.lookAt(new THREE.Vector3(
                    playerPosition.x,
                    enemy.mesh.position.y,
                    playerPosition.z
                ));
            } else {
                // Check if we can jump over obstacle
                tryJumpObstacle(enemy, direction, delta);
                
                // Enemy hit obstacle, become stunned briefly
                if (!enemy.isJumping) {
                    enemy.stunned = true;
                    enemy.stunnedUntil = now + ENEMY_STUN_DURATION * 0.5; // Reduced stun when in sight
                    
                    // Clear path
                    enemy.path = [];
                    enemy.currentPathIndex = 0;
                    updatePathVisualization(enemy);
                }
            }
        } else if (enemy.path.length > 0 && enemy.currentPathIndex < enemy.path.length) {
            // Follow calculated path
            const targetPoint = enemy.path[enemy.currentPathIndex];
            const direction = new THREE.Vector3();
            direction.subVectors(targetPoint, enemy.mesh.position).normalize();
            
            // Don't change the y-position (keep enemy on the ground)
            direction.y = 0;
            
            // Adjust speed based on distance to player
            let moveSpeed = enemy.speed;
            if (distToPlayer < 30) {
                // Increase speed when closer to player
                moveSpeed *= 1 + (1 - distToPlayer / 30) * 0.5;
            }
            
            // Move the enemy towards the target
            const newPosition = new THREE.Vector3(
                enemy.mesh.position.x + direction.x * moveSpeed * delta,
                enemy.mesh.position.y,
                enemy.mesh.position.z + direction.z * moveSpeed * delta
            );
            
            // Check for collisions with obstacles
            const canMove = !checkObstacleCollision(enemy.mesh.position, newPosition, 1.5);
            
            if (canMove) {
                enemy.mesh.position.copy(newPosition);
                
                // Make the enemy face the direction of movement
                enemy.mesh.lookAt(new THREE.Vector3(
                    enemy.mesh.position.x + direction.x,
                    enemy.mesh.position.y,
                    enemy.mesh.position.z + direction.z
                ));
                
                // Check if waypoint reached
                const distToWaypoint = new THREE.Vector2(
                    enemy.mesh.position.x - targetPoint.x,
                    enemy.mesh.position.z - targetPoint.z
                ).length();
                
                if (distToWaypoint < 1) {
                    enemy.currentPathIndex++;
                }
            } else {
                // Try jumping over obstacle
                tryJumpObstacle(enemy, direction, delta);
                
                if (!enemy.isJumping) {
                    // Path is blocked, recalculate
                    enemy.lastPathUpdate = 0; // Force path update next frame
                    
                    // Become briefly stunned
                    enemy.stunned = true;
                    enemy.stunnedUntil = now + (ENEMY_STUN_DURATION * 0.7); // Reduced stun when following path
                }
            }
        } else {
            // No valid path, force update
            enemy.lastPathUpdate = 0;
        }
        
        // Speed up if player is bhopping
        if (isBhopping && bhopChainCount > 2) {
            enemy.speed = enemy.baseSpeed * (1 + bhopChainCount * 0.05);
        } else {
            enemy.speed = enemy.baseSpeed;
        }
        
        // Update the enemy's bounding box
        enemy.boundingBox.setFromObject(enemy.mesh);
        
        // Check for collision with player
        const playerBoundingBox = new THREE.Box3().setFromCenterAndSize(
            playerPosition,
            new THREE.Vector3(1, 2, 1)
        );
        
        if (enemy.boundingBox.intersectsBox(playerBoundingBox)) {
            console.log('Player collided with enemy!');
            // TODO: implement game over or damage logic
        }
    });
}

// Try to make enemy jump over obstacle
function tryJumpObstacle(enemy, direction, delta) {
    // Check if ready to jump
    const now = Date.now();
    if (enemy.isJumping || now < enemy.nextJumpTime) return false;
    
    // Cast ray down to check if on ground
    const raycaster = new THREE.Raycaster(
        new THREE.Vector3(
            enemy.mesh.position.x, 
            enemy.mesh.position.y + 0.1, 
            enemy.mesh.position.z
        ),
        new THREE.Vector3(0, -1, 0)
    );
    
    const intersects = raycaster.intersectObject(scene.getObjectByName('ground'));
    if (intersects.length === 0 || intersects[0].distance > 1) {
        return false; // Not on ground
    }
    
    // Cast ray forward to check obstacle height
    const forwardRaycaster = new THREE.Raycaster(
        new THREE.Vector3(
            enemy.mesh.position.x, 
            enemy.mesh.position.y, 
            enemy.mesh.position.z
        ),
        direction
    );
    
    const obstacles = scene.children.filter(child => 
        child.userData && child.userData.isObstacle
    );
    
    const obstacleIntersects = forwardRaycaster.intersectObjects(obstacles);
    if (obstacleIntersects.length > 0 && obstacleIntersects[0].distance < 2) {
        // Obstacle detected, check height
        const obstacle = obstacleIntersects[0].object;
        const obstacleHeight = obstacle.position.y + obstacle.geometry.parameters.height / 2;
        
        if (obstacleHeight < ENEMY_JUMP_HEIGHT + enemy.mesh.position.y) {
            // Start jump
            enemy.isJumping = true;
            enemy.jumpVelocity = 10;
            enemy.targetJumpHeight = obstacleHeight + 0.5;
            enemy.nextJumpTime = now + 2000; // Cooldown before next jump
            return true;
        }
    }
    
    return false;
}

// Update enemy jump
function updateEnemyJump(enemy, delta) {
    // Apply gravity
    enemy.jumpVelocity -= gravity * delta;
    
    // Move upward
    enemy.mesh.position.y += enemy.jumpVelocity * delta;
    
    // Check if landed
    if (enemy.mesh.position.y <= ENEMY_HEIGHT / 2) {
        enemy.mesh.position.y = ENEMY_HEIGHT / 2;
        enemy.isJumping = false;
        enemy.jumpVelocity = 0;
    }
}

// Update enemy screaming effect
function updateEnemyScream(enemy, distToPlayer, now) {
    // Only scream when close to player and facing them
    if (distToPlayer < 10 && now - enemy.lastScream > enemy.screamCooldown) {
        if (!enemy.isScreaming) {
            enemy.isScreaming = true;
            enemy.lastScream = now;
            
            // Scream effect animation
            const screamDuration = 500;
            const startScale = 1;
            const endScale = 5;
            const startOpacity = 0.5;
            const endOpacity = 0;
            
            // Show screaming effect
            enemy.screamEffect.material.opacity = startOpacity;
            enemy.screamEffect.scale.set(startScale, startScale, startScale);
            
            // Animate screaming effect
            const screamInterval = setInterval(() => {
                const elapsed = Date.now() - enemy.lastScream;
                const progress = Math.min(1, elapsed / screamDuration);
                
                const currentScale = startScale + (endScale - startScale) * progress;
                const currentOpacity = startOpacity - (startOpacity - endOpacity) * progress;
                
                enemy.screamEffect.scale.set(currentScale, currentScale, currentScale);
                enemy.screamEffect.material.opacity = currentOpacity;
                
                if (progress >= 1) {
                    clearInterval(screamInterval);
                    enemy.isScreaming = false;
                    enemy.screamEffect.material.opacity = 0;
                }
            }, 16);
        }
    }
}

// Update group behavior of enemies
function updateGroupBehavior() {
    // Find all leaders
    const leaders = enemies.filter(enemy => enemy.isLeader);
    
    leaders.forEach(leader => {
        // Check if leader has group members
        if (leader.groupMembers.length > 0) {
            // Assign roles to group members
            let flankerAssigned = false;
            
            leader.groupMembers.forEach(member => {
                // Update group member roles periodically
                if (Math.random() < 0.2) { // 20% chance to change role
                    if (!flankerAssigned) {
                        member.role = 'flanker';
                        flankerAssigned = true;
                    } else {
                        member.role = 'follower';
                    }
                }
                
                // Adjust follower target offsets for better formation
                if (member.role === 'follower') {
                    member.targetOffset.set(
                        (Math.random() - 0.5) * 10,
                        0,
                        (Math.random() - 0.5) * 10
                    );
                }
            });
        }
    });
    
    // Look for enemies without groups that could join together
    const ungroupedEnemies = enemies.filter(enemy => 
        !enemy.isLeader && !leaders.some(leader => leader.groupMembers.includes(enemy))
    );
    
    for (let i = 0; i < ungroupedEnemies.length; i++) {
        for (let j = i + 1; j < ungroupedEnemies.length; j++) {
            const enemy1 = ungroupedEnemies[i];
            const enemy2 = ungroupedEnemies[j];
            
            const dist = enemy1.mesh.position.distanceTo(enemy2.mesh.position);
            
            if (dist < GROUP_DISTANCE) {
                // Close enough to form a group
                if (Math.random() < 0.3) { // 30% chance to form a group
                    // Decide which one becomes the leader
                    if (Math.random() < 0.5) {
                        enemy1.isLeader = true;
                        enemy1.groupMembers.push(enemy2);
                        enemy1.mesh.scale.set(1.4, 1.4, 1.4);
                        enemy1.mesh.material.color.set(0xaa0000);
                        enemy1.speed *= 0.9;
                        
                        enemy2.role = Math.random() < 0.5 ? 'flanker' : 'follower';
                        if (enemy2.role === 'flanker') {
                            enemy2.mesh.scale.set(0.9, 0.9, 0.9);
                            enemy2.mesh.material.color.set(0xff3333);
                            enemy2.speed *= 1.3;
                        }
                    } else {
                        enemy2.isLeader = true;
                        enemy2.groupMembers.push(enemy1);
                        enemy2.mesh.scale.set(1.4, 1.4, 1.4);
                        enemy2.mesh.material.color.set(0xaa0000);
                        enemy2.speed *= 0.9;
                        
                        enemy1.role = Math.random() < 0.5 ? 'flanker' : 'follower';
                        if (enemy1.role === 'flanker') {
                            enemy1.mesh.scale.set(0.9, 0.9, 0.9);
                            enemy1.mesh.material.color.set(0xff3333);
                            enemy1.speed *= 1.3;
                        }
                    }
                }
            }
        }
    }
}

// Make enemy wander randomly
function wanderRandomly(enemy) {
    const randomAngle = Math.random() * Math.PI * 2;
    const randomDist = 10 + Math.random() * 20;
    const randomTarget = new THREE.Vector3(
        enemy.mesh.position.x + Math.cos(randomAngle) * randomDist,
        0,
        enemy.mesh.position.z + Math.sin(randomAngle) * randomDist
    );
    enemy.path = findPath(enemy.mesh.position, randomTarget);
    enemy.currentPathIndex = 0;
    updatePathVisualization(enemy);
}

// Teleport enemy to a new position when stuck
function teleportEnemy(enemy, playerPosition) {
    enemy.teleporting = true;
    enemy.lastTeleport = Date.now();
    enemy.teleportTime = enemy.lastTeleport + 1000; // 1 second teleport animation
    
    // Make particle effect at current position
    const particleCount = 20;
    const positions = particleSystem.geometry.attributes.position.array;
    const sizes = particleSystem.geometry.attributes.size.array;
    
    for (let i = 0; i < particleCount; i++) {
        const index = i % particleSystem.maxParticles;
        
        // Set position at enemy's position with random spread
        positions[index * 3] = enemy.mesh.position.x + (Math.random() - 0.5) * 2;
        positions[index * 3 + 1] = enemy.mesh.position.y + Math.random() * 2;
        positions[index * 3 + 2] = enemy.mesh.position.z + (Math.random() - 0.5) * 2;
        
        // Set size
        sizes[index] = 0.3 + Math.random() * 0.3;
        
        // Create particle object for updating
        particleSystem.bhopParticles.push({
            index: index,
            life: 0,
            maxLife: 30 + Math.random() * 20,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                0.1 + Math.random() * 0.3,
                (Math.random() - 0.5) * 0.3
            )
        });
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.size.needsUpdate = true;
    
    // Find a new position to teleport to
    let newPosition;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
        // Try to find a position behind the player
        const playerLookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        playerLookDir.y = 0;
        playerLookDir.normalize();
        
        const behindPlayerDir = playerLookDir.clone().multiplyScalar(-1);
        
        // Add some randomness to the direction
        behindPlayerDir.x += (Math.random() - 0.5) * 0.5;
        behindPlayerDir.z += (Math.random() - 0.5) * 0.5;
        behindPlayerDir.normalize();
        
        // Position behind player but closer than normal spawn distance
        const distance = 10 + Math.random() * 15;
        newPosition = new THREE.Vector3(
            playerPosition.x + behindPlayerDir.x * distance,
            ENEMY_HEIGHT / 2,
            playerPosition.z + behindPlayerDir.z * distance
        );
        
        // Check if position is valid (not in obstacle)
        const validPosition = !checkCollisions(newPosition, 1.5);
        
        if (validPosition) break;
        
        attempts++;
    } while (attempts < maxAttempts);
    
    // If all attempts failed, just use a random position
    if (attempts >= maxAttempts) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 10;
        newPosition = new THREE.Vector3(
            playerPosition.x + Math.cos(angle) * distance,
            ENEMY_HEIGHT / 2,
            playerPosition.z + Math.sin(angle) * distance
        );
    }
    
    // Set the new position
    enemy.mesh.position.copy(newPosition);
    enemy.lastMovePos.copy(newPosition);
    enemy.path = [];
    enemy.currentPathIndex = 0;
    updatePathVisualization(enemy);
}

// Predict player's future position based on movement and bhop status
function getPositionPrediction(currentPos, predictedPos, enemy) {
    // Calculate base prediction
    const prediction = new THREE.Vector3();
    
    // Weight factors
    let currentWeight = 0.3;  // Weight for current position
    let predictedWeight = 0.7; // Weight for predicted position
    
    // Adjust weights based on player's speed and bhop status
    if (isBhopping) {
        // More weight to prediction when player is bhopping
        currentWeight = 0.1;
        predictedWeight = 0.9;
    } else if (currentSpeed < 5) {
        // More weight to current position when player is moving slowly
        currentWeight = 0.6;
        predictedWeight = 0.4;
    }
    
    // Calculate weighted average
    prediction.addVectors(
        currentPos.clone().multiplyScalar(currentWeight),
        predictedPos.clone().multiplyScalar(predictedWeight)
    );
    
    // Add role-specific offset
    if (enemy.role === 'flanker') {
        // Flankers try to cut off the player
        const moveDir = new THREE.Vector3().subVectors(predictedPos, currentPos).normalize();
        if (moveDir.length() > 0.1) {
            prediction.add(moveDir.multiplyScalar(10));
        }
    } else if (enemy.role === 'follower') {
        // Followers add their target offset
        prediction.add(enemy.targetOffset);
    }
    
    return prediction;
}

// Update the path visualization line
function updatePathVisualization(enemy) {
    if (!showDebugPaths) {
        enemy.pathLine.visible = false;
        return;
    }
    
    enemy.pathLine.visible = true;
    
    // Create line geometry from path points
    if (enemy.path.length > 0) {
        const points = [enemy.mesh.position.clone()];
        points.push(...enemy.path);
        
        // Update line geometry
        enemy.pathLine.geometry.dispose();
        enemy.pathLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    } else {
        // No path, hide line
        enemy.pathLine.geometry.dispose();
        enemy.pathLine.geometry = new THREE.BufferGeometry();
    }
}

// Update the prediction visualization line
function updatePredictionVisualization(enemy) {
    if (!showDebugPaths) {
        enemy.predictionLine.visible = false;
        return;
    }
    
    enemy.predictionLine.visible = true;
    
    // Get player position
    const playerPosition = new THREE.Vector3();
    yawObject.getWorldPosition(playerPosition);
    
    // Create line geometry from player to prediction
    const points = [
        playerPosition,
        enemy.predictedPlayerPos
    ];
    
    // Update line geometry
    enemy.predictionLine.geometry.dispose();
    enemy.predictionLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
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

// Clear any existing bhop reset timers
function clearBhopResetTimers() {
    if (bhopResetTimer) {
        clearTimeout(bhopResetTimer);
        bhopResetTimer = null;
    }
}

// Evaluate bhop timing quality (0-1)
function evaluateBhopTiming(timeSinceLand) {
    if (timeSinceLand <= BHOP_PERFECT_WINDOW) {
        // Perfect timing
        return 1.0;
    } else if (timeSinceLand <= BHOP_GOOD_WINDOW) {
        // Good timing
        return 0.7;
    } else if (timeSinceLand <= BHOP_MAX_WINDOW) {
        // Acceptable timing
        return 0.4;
    }
    // Failed timing
    return 0;
}

// Handle key down events with improved bhop handling
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
                
                // Clear any existing bhop reset timers
                clearBhopResetTimers();
                
                // Check for bhop timing between landing and jumping again
                const timeSinceLand = jumpTime - lastLandTime;
                if (showDebugBhop) console.log(`Time since last land: ${timeSinceLand}ms`);
                
                // Evaluate bhop timing quality
                const bhopQuality = evaluateBhopTiming(timeSinceLand);
                lastBhopQuality = bhopQuality;
                
                if (bhopQuality > 0) {
                    // Successful bhop - increase counter based on quality
                    bhopChainCount = Math.min(MAX_BHOP_CHAIN, bhopChainCount + 1);
                    
                    // Calculate bhop boost based on chain count and quality
                    const chainFactor = bhopChainCount / MAX_BHOP_CHAIN;
                    const qualityBonus = bhopQuality * 0.5; // 0-0.5 bonus based on timing
                    currentBhopBoost = BHOP_BASE_BOOST + 
                                      ((BHOP_MAX_BOOST - BHOP_BASE_BOOST) * chainFactor) +
                                      qualityBonus;
                    
                    // Increase momentum
                    bhopMomentum = Math.min(1.0, bhopMomentum + 0.2);
                    
                    isBhopping = true;
                    console.log(`BHOP activated! Chain: ${bhopChainCount}, Quality: ${(bhopQuality*100).toFixed(0)}%, Boost: ${currentBhopBoost.toFixed(2)}x`);
                    
                    // Create visual effect
                    createBhopEffect();
                    
                    // Update bhop indicator
                    let qualityText = "PERFECT";
                    if (bhopQuality < 1.0) qualityText = "GOOD";
                    if (bhopQuality < 0.7) qualityText = "OK";
                    
                    bhopIndicator.textContent = `BHOP x${bhopChainCount} - ${qualityText} (${currentBhopBoost.toFixed(2)}x)`;
                    bhopIndicator.classList.add('active');
                    
                    // Keep the indicator visible while bhop is active
                    setTimeout(() => {
                        if (!isBhopping) {
                            bhopIndicator.classList.remove('active');
                        }
                    }, 1000);
                } else {
                    // Failed bhop chain - reset counter
                    if (bhopChainCount > 0) {
                        console.log(`BHOP chain broken! Was at ${bhopChainCount}`);
                    }
                    isBhopping = false;
                    bhopChainCount = 0;
                    currentBhopBoost = BHOP_BASE_BOOST;
                    bhopMomentum = 0;
                    updateMovementMode();
                }
                
                lastJumpTime = jumpTime;
            }
            break;
        case 'KeyB': // Debug mode toggle
            showDebugBhop = !showDebugBhop;
            console.log(`Debug Bhop ${showDebugBhop ? 'Enabled' : 'Disabled'}`);
            break;
        case 'KeyP': // Path visualization toggle
            showDebugPaths = !showDebugPaths;
            console.log(`Path visualization ${showDebugPaths ? 'Enabled' : 'Disabled'}`);
            
            // Update path visibility
            enemies.forEach(enemy => {
                enemy.pathLine.visible = showDebugPaths;
                enemy.predictionLine.visible = showDebugPaths;
                updatePathVisualization(enemy);
                updatePredictionVisualization(enemy);
            });
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
        const qualityColor = lastBhopQuality > 0.9 ? "#ffff00" : 
                            lastBhopQuality > 0.6 ? "#a0ff9f" : "#9fffbf";
        movementIndicator.textContent += ` + BHOP x${bhopChainCount}`;
        movementIndicator.style.color = qualityColor;
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
    targetSpeed = 0;
    if (moveForward || moveBackward || moveLeft || moveRight) {
        // Base speed determined by movement mode
        targetSpeed = playerSpeed;
        
        // Apply bhop boost if active
        if (isBhopping) {
            targetSpeed *= currentBhopBoost;
            
            // Apply momentum-based boost
            targetSpeed *= (1 + bhopMomentum * 0.3);
        }
        
        targetSpeed = Math.min(targetSpeed, maxSpeed);
    }
    
    // Determine which acceleration rate to use based on movement mode
    let currentAcceleration = acceleration;
    if (isSprinting) {
        currentAcceleration = sprintAcceleration;
    } else if (isWalking) {
        currentAcceleration = walkAcceleration;
    }
    
    // Adjust acceleration in air
    if (!canJump) {
        currentAcceleration *= airControl;
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
    
    // Store previous y position to detect landing
    const previousY = yawObject.position.y;
    
    // Apply vertical movement (gravity/jumping)
    yawObject.position.y += velocity.y * delta;
    
    // Update head bobbing with smoother implementation
    updateHeadBob(delta, currentSpeed);
    
    // Update FOV for speed effect
    updateFOV(delta);
    
    // Ground collision check - Detect when player lands
    if (yawObject.position.y < playerHeight) {
        yawObject.position.y = playerHeight;
        velocity.y = 0;
        
        // If we just landed (were previously in the air)
        if (!canJump) {
            lastLandTime = Date.now();
            if (showDebugBhop) console.log(`Landed at: ${lastLandTime}`);
            
            // Don't reset bhop immediately on landing - give player a chance to jump again
            clearBhopResetTimers();
            
            // Set a timer to reset bhop state if player doesn't jump quickly
            bhopResetTimer = setTimeout(() => {
                if (canJump && !isJumping) { // Only reset if still grounded
                    if (showDebugBhop && isBhopping) console.log('BHOP reset due to timeout');
                    isBhopping = false;
                    bhopChainCount = 0;
                    currentBhopBoost = BHOP_BASE_BOOST;
                    bhopMomentum = Math.max(0, bhopMomentum - BHOP_MOMENTUM_DECAY);
                    bhopIndicator.classList.remove('active');
                    updateMovementMode();
                }
            }, BHOP_MAX_WINDOW + 50); // Give slightly more time than the bhop window
        }
        
        canJump = true;
        isJumping = false;
    }
    
    // Boundary checks to keep player within the play area
    const boundaryLimit = 99; // To match ground size
    
    if (Math.abs(yawObject.position.x) > boundaryLimit) {
        yawObject.position.x = Math.sign(yawObject.position.x) * boundaryLimit;
    }
    
    if (Math.abs(yawObject.position.z) > boundaryLimit) {
        yawObject.position.z = Math.sign(yawObject.position.z) * boundaryLimit;
    }
    
    // Gradually decay bhop momentum when not jumping
    if (canJump && !isJumping && bhopMomentum > 0) {
        bhopMomentum = Math.max(0, bhopMomentum - BHOP_MOMENTUM_DECAY * delta);
    }
    
    // Update particles
    updateParticles(delta);
    
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
    
    // Add additional FOV boost based on current speed
    const speedRatio = currentSpeed / runSpeed;
    targetFOV += (speedRatio - 1) * 5;
    
    // Add boost for bhop momentum
    if (bhopMomentum > 0) {
        targetFOV += bhopMomentum * 10;
    }
    
    // Smooth transition to target FOV
    camera.fov += (targetFOV - camera.fov) * fovChangeSpeed * delta;
    
    // Ensure FOV stays within reasonable bounds
    camera.fov = Math.max(walkingFOV - 5, Math.min(sprintingFOV + 25, camera.fov));
    
    // Update projection matrix when FOV changes
    camera.updateProjectionMatrix();
}

// Update debugging information
function updateDebugInfo() {
    const nowTime = Date.now();
    const timeSinceLand = nowTime - lastLandTime;
    const bhopWindowRemaining = Math.max(0, BHOP_MAX_WINDOW - timeSinceLand);
    
    let bhopStatusColor = "#ffffff";
    if (bhopWindowRemaining > 0) {
        // In bhop window
        if (bhopWindowRemaining <= BHOP_PERFECT_WINDOW) {
            bhopStatusColor = "#ffff00"; // Perfect
        } else if (bhopWindowRemaining <= BHOP_GOOD_WINDOW) {
            bhopStatusColor = "#00ff00"; // Good
        } else {
            bhopStatusColor = "#00ffff"; // Ok
        }
    }
    
    debugInfo.innerHTML = `
        <div style="color: ${bhopStatusColor}">
        Speed: ${currentSpeed.toFixed(1)} / ${targetSpeed.toFixed(1)} 
        (${isSprinting ? 'Sprinting' : isWalking ? 'Walking' : 'Running'})<br>
        Bhop Chain: ${bhopChainCount} (Boost: ${currentBhopBoost.toFixed(2)}x, Momentum: ${(bhopMomentum*100).toFixed(0)}%)<br>
        </div>
        Bhop Window: ${timeSinceLand}ms / ${BHOP_MAX_WINDOW}ms (${bhopWindowRemaining}ms left)<br>
        FOV: ${camera.fov.toFixed(1)}° • Position: (${yawObject.position.x.toFixed(0)}, ${yawObject.position.z.toFixed(0)})<br>
        Status: ${canJump ? 'Grounded' : 'In Air'} 
        ${isBhopping ? '• <span style="color:#00ff00">Bhop Active</span>' : ''} 
        • Enemies: ${enemies.length} 
        ${showDebugBhop ? '• <span style="color:#ffff00">DEBUG ON</span>' : ''}
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
