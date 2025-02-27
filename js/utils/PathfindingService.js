/**
 * PathfindingService - Provides pathfinding functionality for AI
 */
export class PathfindingService {
    constructor(scene) {
        this.scene = scene;
        
        // Grid settings
        this.gridSize = 5;  // Size of each grid cell
        this.gridExtent = 200; // Match the ground size
        
        // Cached obstacle data
        this.obstacles = [];
        this.obstacleMap = {}; // For quick lookup
        this.lastObstacleUpdate = 0;
        this.obstacleUpdateInterval = 2000; // ms between obstacle data updates
    }
    
    /**
     * Find a path from start to end positions
     * @param {THREE.Vector3} startPos - Starting position
     * @param {THREE.Vector3} endPos - Target position
     * @returns {Array<THREE.Vector3>} Array of points forming the path
     */
    findPath(startPos, endPos) {
        // Update obstacle data if needed
        this.updateObstacleData();
        
        // Direct path if no obstacles between start and end
        if (this.hasDirectPath(startPos, endPos)) {
            return [endPos.clone()];
        }
        
        // For performance reasons in this prototype, we'll use a simplified
        // pathfinding approach that generates a few waypoints around obstacles
        
        // Convert to grid coordinates
        const startGridPos = this.worldToGrid(startPos);
        const endGridPos = this.worldToGrid(endPos);
        
        // Simple A* implementation would go here for full pathfinding
        // For our prototype, we'll create a simplified path
        
        // Get the points for a simplified path
        return this.generateSimplifiedPath(startPos, endPos);
    }
    
    /**
     * Check if there's a direct path from start to end with no obstacles
     * @param {THREE.Vector3} startPos - Starting position
     * @param {THREE.Vector3} endPos - Target position
     * @returns {boolean} Whether there's a direct path
     */
    hasDirectPath(startPos, endPos) {
        // Create a raycaster to check for obstacles
        const direction = new THREE.Vector3()
            .subVectors(endPos, startPos)
            .normalize();
        
        const distance = startPos.distanceTo(endPos);
        const raycaster = new THREE.Raycaster(startPos, direction, 0, distance);
        
        // Check for intersections with obstacles
        const intersections = raycaster.intersectObjects(this.obstacles);
        
        return intersections.length === 0;
    }
    
    /**
     * Generate a simplified path that avoids obstacles
     * @param {THREE.Vector3} startPos - Starting position
     * @param {THREE.Vector3} endPos - Target position
     * @returns {Array<THREE.Vector3>} Simplified path waypoints
     */
    generateSimplifiedPath(startPos, endPos) {
        const path = [];
        
        // Direction vector from start to end
        const direction = new THREE.Vector3()
            .subVectors(endPos, startPos)
            .normalize();
        
        // Check if there are obstacles in the way
        const raycaster = new THREE.Raycaster(
            startPos,
            direction,
            0,
            startPos.distanceTo(endPos)
        );
        
        const intersections = raycaster.intersectObjects(this.obstacles);
        
        if (intersections.length > 0) {
            // There are obstacles, so we need to create intermediate waypoints
            
            // Find the first obstacle
            const obstacle = intersections[0].object;
            const obstaclePos = obstacle.position.clone();
            
            // Calculate a point to go around the obstacle
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
            
            // Determine which side is better to go around
            const leftSide = new THREE.Vector3()
                .addVectors(obstaclePos, perpendicular.clone().multiplyScalar(5));
                
            const rightSide = new THREE.Vector3()
                .subVectors(obstaclePos, perpendicular.clone().multiplyScalar(5));
            
            // Choose the side that's closer to the end position
            const leftDist = leftSide.distanceTo(endPos);
            const rightDist = rightSide.distanceTo(endPos);
            
            const waypoint = leftDist < rightDist ? leftSide : rightSide;
            
            // Add the waypoint to the path
            path.push(waypoint);
            
            // Recursively find a path from the waypoint to the end
            const remainingPath = this.findPath(waypoint, endPos);
            path.push(...remainingPath);
        } else {
            // No obstacles, direct path
            path.push(endPos.clone());
        }
        
        return path;
    }
    
    /**
     * Update the cached obstacle data
     */
    updateObstacleData() {
        const now = Date.now();
        
        // Only update obstacle data periodically
        if (now - this.lastObstacleUpdate < this.obstacleUpdateInterval) {
            return;
        }
        
        // Get all obstacles in the scene
        this.obstacles = this.scene.children.filter(child => 
            child.userData && child.userData.isObstacle
        );
        
        // Update obstacle map
        this.obstacleMap = {};
        for (const obstacle of this.obstacles) {
            // Get grid cells occupied by this obstacle
            const gridCells = this.getObstacleGridCells(obstacle);
            
            // Mark cells as occupied
            for (const cell of gridCells) {
                const key = `${cell.x},${cell.z}`;
                this.obstacleMap[key] = true;
            }
        }
        
        this.lastObstacleUpdate = now;
    }
    
    /**
     * Get grid cells occupied by an obstacle
     * @param {THREE.Object3D} obstacle - The obstacle
     * @returns {Array<Object>} Grid cells occupied by the obstacle
     */
    getObstacleGridCells(obstacle) {
        // Calculate bounds of the obstacle
        const bbox = new THREE.Box3().setFromObject(obstacle);
        
        // Convert to grid coordinates
        const minGrid = this.worldToGrid(new THREE.Vector3(bbox.min.x, 0, bbox.min.z));
        const maxGrid = this.worldToGrid(new THREE.Vector3(bbox.max.x, 0, bbox.max.z));
        
        // Get all cells within the bounds
        const cells = [];
        for (let x = minGrid.x; x <= maxGrid.x; x++) {
            for (let z = minGrid.z; z <= maxGrid.z; z++) {
                cells.push({ x, z });
            }
        }
        
        return cells;
    }
    
    /**
     * Convert world position to grid coordinates
     * @param {THREE.Vector3} worldPos - World position
     * @returns {Object} Grid coordinates {x, z}
     */
    worldToGrid(worldPos) {
        const halfExtent = this.gridExtent / 2;
        
        // Convert world coordinates to grid indices
        const x = Math.floor((worldPos.x + halfExtent) / this.gridSize);
        const z = Math.floor((worldPos.z + halfExtent) / this.gridSize);
        
        return { x, z };
    }
    
    /**
     * Convert grid coordinates to world position
     * @param {Object} gridPos - Grid coordinates {x, z}
     * @returns {THREE.Vector3} World position
     */
    gridToWorld(gridPos) {
        const halfExtent = this.gridExtent / 2;
        
        // Convert grid indices to world coordinates (center of cell)
        const x = gridPos.x * this.gridSize - halfExtent + this.gridSize / 2;
        const z = gridPos.z * this.gridSize - halfExtent + this.gridSize / 2;
        
        return new THREE.Vector3(x, 0, z);
    }
    
    /**
     * Check if a grid cell is occupied by an obstacle
     * @param {Object} gridPos - Grid coordinates {x, z}
     * @returns {boolean} Whether the cell is occupied
     */
    isCellOccupied(gridPos) {
        const key = `${gridPos.x},${gridPos.z}`;
        return this.obstacleMap[key] === true;
    }
}