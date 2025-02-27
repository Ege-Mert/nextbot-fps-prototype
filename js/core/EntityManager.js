/**
 * EntityManager - Manages game entities like player and enemies
 */
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';

export class EntityManager {
    constructor(game) {
        this.game = game;
        this.player = null;
        this.enemies = [];
        
        // Enemy constants
        this.ENEMY_SPAWN_DISTANCE = 30;
        this.MAX_ENEMIES = 3;
        this.MIN_ENEMY_DISTANCE = 20; // Minimum distance from player for spawning
        this.ENEMY_SPAWN_INTERVAL = 10000; // ms between enemy spawns
        this.lastEnemySpawnTime = 0;
        
        // Difficulty scaling
        this.difficultyLevel = 1.0;
        this.difficultyScalingEnabled = true;
        this.maxDifficultyLevel = 2.5;
        this.difficultyIncreaseRate = 0.05; // How quickly difficulty increases
        
        // Game metrics for tuning
        this.playerDeaths = 0;
        this.enemiesKilled = 0;
        this.playerBhopSkill = 0; // 0-1 rating of player's bhop proficiency
        
        // Enemy types with different behaviors
        this.enemyTypes = [
            { type: 'standard', speedMultiplier: 1.0, probability: 0.7 },
            { type: 'fast', speedMultiplier: 1.3, probability: 0.2 },
            { type: 'tank', speedMultiplier: 0.8, probability: 0.1 }
        ];
    }
    
    /**
     * Create the player entity
     * @param {THREE.Scene} scene - The game scene
     * @param {THREE.Camera} camera - The game camera
     */
    createPlayer(scene, camera) {
        this.player = new Player(scene, camera);
        
        // Pass the game's particle manager to the player instead of creating its own
        this.player.particleManager = this.game.particleManager;
        
        // Add reference to game for audio access
        this.player.game = this.game;
        
        return this.player;
    }
    
    /**
     * Create a new enemy
     * @param {string} type - Optional enemy type
     * @returns {Enemy} The created enemy
     */
    createEnemy(type = null) {
        if (!this.player) return null;
        
        // Get player position
        const playerPosition = new THREE.Vector3();
        this.player.yawObject.getWorldPosition(playerPosition);
        
        // Choose enemy type if not specified
        if (!type) {
            type = this.chooseEnemyType();
        }
        
        // Get type data
        const enemyTypeData = this.enemyTypes.find(t => t.type === type) || this.enemyTypes[0];
        
        // Apply difficulty scaling to speed
        const scaledSpeedMultiplier = enemyTypeData.speedMultiplier * this.difficultyLevel;
        
        // Create spawn position at a distance from player
        const spawnPosition = this.findSafeSpawnPosition(playerPosition);
        
        // Create enemy
        const enemy = new Enemy(
            this.game.sceneManager.scene,
            spawnPosition, 
            scaledSpeedMultiplier
        );
        
        // Store enemy type in user data
        enemy.enemyType = type;
        
        this.enemies.push(enemy);
        console.log(`Created ${type} enemy at position:`, spawnPosition);
        return enemy;
    }
    
    /**
     * Choose an enemy type based on probabilities
     * @returns {string} Enemy type
     */
    chooseEnemyType() {
        // Adjust probabilities based on difficulty
        const adjustedTypes = this.enemyTypes.map(type => {
            let adjustedProbability = type.probability;
            
            // Increase probability of harder enemies as difficulty increases
            if (type.type === 'fast') {
                adjustedProbability *= (0.5 + this.difficultyLevel / 2);
            }
            
            return {
                type: type.type,
                probability: adjustedProbability
            };
        });
        
        // Normalize probabilities
        const totalProb = adjustedTypes.reduce((sum, type) => sum + type.probability, 0);
        const normalizedTypes = adjustedTypes.map(type => ({
            type: type.type,
            probability: type.probability / totalProb
        }));
        
        // Choose a type based on probability
        const rand = Math.random();
        let cumulativeProbability = 0;
        
        for (const type of normalizedTypes) {
            cumulativeProbability += type.probability;
            if (rand <= cumulativeProbability) {
                return type.type;
            }
        }
        
        // Fallback
        return 'standard';
    }
    
    /**
     * Find a safe position to spawn an enemy
     * @param {THREE.Vector3} playerPosition - Player's current position
     * @returns {THREE.Vector3} Safe spawn position
     */
    findSafeSpawnPosition(playerPosition) {
        // Try several positions to find one that's not obstructed
        for (let i = 0; i < 10; i++) {
            // Random distance between min and max
            const distance = this.MIN_ENEMY_DISTANCE + 
                Math.random() * (this.ENEMY_SPAWN_DISTANCE - this.MIN_ENEMY_DISTANCE);
            
            // Random angle
            const angle = Math.random() * Math.PI * 2;
            
            // Calculate position
            const spawnPosition = new THREE.Vector3(
                playerPosition.x + Math.cos(angle) * distance,
                0, // Ground level
                playerPosition.z + Math.sin(angle) * distance
            );
            
            // Check if position is clear (not inside obstacles)
            const isClear = !this.game.sceneManager.scene.children.some(child => {
                if (child.userData && child.userData.isObstacle) {
                    // Quick check using bounding box
                    const obstacleBbox = new THREE.Box3().setFromObject(child);
                    const point = new THREE.Vector3(spawnPosition.x, 1, spawnPosition.z);
                    return obstacleBbox.containsPoint(point);
                }
                return false;
            });
            
            if (isClear) {
                return spawnPosition;
            }
        }
        
        // Fallback to a simpler position if we couldn't find a clear one
        const fallbackDistance = this.ENEMY_SPAWN_DISTANCE * 1.2;
        const fallbackAngle = Math.random() * Math.PI * 2;
        
        return new THREE.Vector3(
            playerPosition.x + Math.cos(fallbackAngle) * fallbackDistance,
            0,
            playerPosition.z + Math.sin(fallbackAngle) * fallbackDistance
        );
    }
    
    /**
     * Spawn multiple enemies
     * @param {number} count - Number of enemies to spawn
     * @param {boolean} forcedSpawn - Whether to ignore spawn interval
     */
    spawnEnemies(count, forcedSpawn = false) {
        const now = Date.now();
        
        // Check if enough time has passed since last spawn (unless forced)
        if (!forcedSpawn && now - this.lastEnemySpawnTime < this.ENEMY_SPAWN_INTERVAL) {
            return;
        }
        
        for (let i = 0; i < count; i++) {
            this.createEnemy();
        }
        
        this.lastEnemySpawnTime = now;
    }
    
    /**
     * Update difficulty based on player performance
     */
    updateDifficulty() {
        if (!this.difficultyScalingEnabled) return;
        
        // Calculate player's bhop skill based on bhop controller stats
        if (this.player && this.player.bhopController) {
            const stats = this.player.bhopController.bhopStats;
            
            // Calculate skill based on successful bhops and average timing
            const successRate = stats.totalJumps > 0 ? stats.successfulBhops / stats.totalJumps : 0;
            const perfectRate = stats.successfulBhops > 0 ? stats.perfectBhops / stats.successfulBhops : 0;
            const timingFactor = stats.averageTiming > 0 ? 
                (this.player.bhopController.PERFECT_BHOP_WINDOW / stats.averageTiming) : 0;
            
            // Combine factors for overall skill rating
            this.playerBhopSkill = (successRate * 0.5) + (perfectRate * 0.3) + (timingFactor * 0.2);
            this.playerBhopSkill = Math.min(1, this.playerBhopSkill);
        }
        
        // Scale difficulty based on player skill and game progression
        const targetDifficulty = 1.0 + this.playerBhopSkill * 1.5;
        
        // Gradually approach target difficulty
        if (this.difficultyLevel < targetDifficulty) {
            this.difficultyLevel = Math.min(
                this.maxDifficultyLevel, 
                this.difficultyLevel + this.difficultyIncreaseRate * (1/60) // Increase per frame
            );
        }
    }
    
    /**
     * Check for collisions between player and enemies
     */
    checkPlayerEnemyCollisions() {
        if (!this.player) return;
        
        // Get player position and bounding box
        const playerPosition = new THREE.Vector3();
        this.player.yawObject.getWorldPosition(playerPosition);
        
        const playerBoundingBox = new THREE.Box3().setFromCenterAndSize(
            playerPosition,
            new THREE.Vector3(1, 2, 1)
        );
        
        // Check collision with each enemy
        for (const enemy of this.enemies) {
            if (enemy.boundingBox.intersectsBox(playerBoundingBox)) {
                // Handle collision
                console.log('Player collided with enemy!');
                this.handlePlayerDamage();
                
                // Always trigger slow-motion on enemy collision
                // Slow down to 25% speed for 1.2 seconds
                this.game.slowMotionManager.triggerSlowMotion(0.25, 1.2);
                
                // Add some knockback to the player
                if (this.player) {
                    const knockbackDirection = new THREE.Vector3()
                        .subVectors(playerPosition, enemy.mesh.position)
                        .normalize();
                    
                    this.player.applyKnockback(knockbackDirection, 15);
                }
            }
        }
    }
    
    /**
     * Handle player taking damage from enemies
     */
    handlePlayerDamage() {
        // Implement player damage logic here
        this.playerDeaths++;
        
        // Reset difficulty slightly when player dies
        this.difficultyLevel = Math.max(1.0, this.difficultyLevel * 0.9);
    }
    
    /**
     * Manage enemy spawning based on player distance and count
     */
    manageEnemySpawns() {
        // Check if we need to spawn more enemies
        if (this.enemies.length < this.MAX_ENEMIES) {
            const enemiesToSpawn = this.MAX_ENEMIES - this.enemies.length;
            this.spawnEnemies(enemiesToSpawn);
        }
        
        // Check if any enemies are too far away and need to be respawned
        if (this.player) {
            const playerPosition = new THREE.Vector3();
            this.player.yawObject.getWorldPosition(playerPosition);
            
            const MAX_ENEMY_DISTANCE = 100; // Maximum distance before respawning
            
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                const distanceToPlayer = enemy.mesh.position.distanceTo(playerPosition);
                
                if (distanceToPlayer > MAX_ENEMY_DISTANCE) {
                    console.log('Enemy too far away, respawning...');
                    enemy.destroy();
                    this.enemies.splice(i, 1);
                    this.createEnemy();
                }
            }
        }
    }
    
    /**
     * Update all entities
     * @param {number} delta - Time delta
     */
    update(delta) {
        // Update difficulty
        this.updateDifficulty();
        
        // Update player
        if (this.player) {
            this.player.update(delta);
        }
        
        // Manage enemy spawning
        this.manageEnemySpawns();
        
        // Update enemies with player's current speed for dynamic difficulty
        const playerSpeed = this.player ? this.player.currentSpeed : 0;
        
        // Update enemies
        for (const enemy of this.enemies) {
            if (this.player) {
                const playerPosition = new THREE.Vector3();
                this.player.yawObject.getWorldPosition(playerPosition);
                enemy.update(delta, playerPosition, this.game.sceneManager.scene, playerSpeed);
            }
        }
        
        // Check collisions
        this.checkPlayerEnemyCollisions();
    }
    
    /**
     * Remove all enemies from the scene
     */
    clearEnemies() {
        for (const enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
    }
    
    /**
     * Get game status information
     * @returns {Object} Game status information
     */
    getGameStatus() {
        return {
            enemyCount: this.enemies.length,
            difficultyLevel: this.difficultyLevel.toFixed(2),
            playerBhopSkill: (this.playerBhopSkill * 100).toFixed(1) + '%',
            playerDeaths: this.playerDeaths,
            enemiesKilled: this.enemiesKilled
        };
    }
}