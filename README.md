# Nextbot FPS Prototype

A first-person shooter prototype featuring Nextbot-style enemy AI and bunny-hop mechanics built with Three.js.

## Overview

This project implements a simple FPS game prototype with:
- First-person camera controls using pointer lock API
- WASD keyboard movement controls
- Simple physics simulation with gravity and jumping
- Advanced bunny-hop (bhop) movement mechanics
- Nextbot-style AI enemies that chase the player

## Features

### FPS Player Controls
- **Movement**: WASD keys for directional movement
- **Camera**: Mouse for looking around (pointer lock API)
- **Jumping**: Spacebar to jump
- **Bunny-hop Mechanics**: Time your jumps correctly to gain a speed boost

### Physics and Collisions
- Basic gravity simulation
- Ground collision detection
- Boundary checks to keep the player within bounds
- Experimental bunny-hop mechanics that reward precise timing

### Enemy AI
- Simple Nextbot-style enemies that chase the player
- Enemy movement with variable speeds
- Basic collision detection for enemy-player interactions
- Automatic enemy spawning system

## Implementation Details

### First-Person Controls
The first-person controls are implemented using the browser's Pointer Lock API, which allows for immersive mouse-based camera rotation without the cursor leaving the game window.

```javascript
function onMouseMove(event) {
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    // Horizontal rotation (yaw)
    camera.rotation.y -= movementX * 0.002;
    
    // Vertical rotation (pitch) with limits
    const newRotationX = camera.rotation.x - movementY * 0.002;
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, newRotationX));
}
```

### Bunny-Hop Mechanics
The bunny-hop (bhop) mechanics work by detecting when the player jumps within a small time window after landing from a previous jump:

```javascript
// Constants for bhop mechanics
const BHOP_WINDOW = 200; // ms window to perform a successful bhop
const BHOP_BOOST = 1.5; // Speed multiplier for successful bhop

// In the jump handler:
if (canJump) {
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
```

### Enemy AI
The enemy AI is straightforward: each enemy calculates the direction to the player and moves along that path:

```javascript
function updateEnemies(delta) {
    enemies.forEach(enemy => {
        // Calculate direction to player
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, enemy.mesh.position).normalize();
        
        // Keep enemies grounded
        direction.y = 0;
        
        // Move towards player
        enemy.mesh.position.x += direction.x * enemy.speed * delta;
        enemy.mesh.position.z += direction.z * enemy.speed * delta;
        
        // Make enemy face player
        enemy.mesh.lookAt(new THREE.Vector3(
            camera.position.x, 
            enemy.mesh.position.y, 
            camera.position.z
        ));
        
        // Update collision detection
        // ...
    });
}
```

## Future Improvements

The following improvements are planned for future development:

- Refine collision detection for more accurate interactions
- Fine-tune physics and bhop parameters for better gameplay feel
- Add environmental hazards and obstacles for more dynamic gameplay
- Implement scoring system and game states (menu, game over, etc.)
- Add sounds and visual effects
- Create more realistic enemy models and animations
- Implement a level design system

## Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/Ege-Mert/nextbot-fps-prototype.git
   ```

2. Open the `index.html` file in a modern web browser (Chrome, Firefox, etc.)

3. Click on the instructions to start the game and enable pointer lock

## Credits

This project uses [Three.js](https://threejs.org/) for 3D rendering capabilities.

## License

MIT © Ege Mert
