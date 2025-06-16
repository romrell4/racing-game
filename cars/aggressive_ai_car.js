class AggressiveAICar extends Car {
    constructor(x = 400, y = 450, color = '#ff6600') {
        super(x, y, color);
        
        // AI-specific state variables
        this.stuckCounter = 0;
        this.lastPosition = new Vector2(this.position.x, this.position.y);
        this.lastCheckpointId = -1;
        this.avoidanceDirection = -1; // 1 for right, -1 for left
        this.sameCheckpointCounter = 0;
        
        // Override car properties for a more aggressive behavior
        this.maxSpeed = 10; // Higher top speed
        this.acceleration = 0.4; // Faster acceleration
        this.turnSpeed = 0.07; // More responsive steering
    }
    
    decideControls(trackData) {
        // Calculate movement since last frame
        const movementDelta = Math.sqrt(
            Math.pow(this.position.x - this.lastPosition.x, 2) + 
            Math.pow(this.position.y - this.lastPosition.y, 2)
        );
        
        // Update last position
        this.lastPosition.x = this.position.x;
        this.lastPosition.y = this.position.y;
        
        // Check if we're stuck (very little movement)
        if (movementDelta < 0.5 && Math.abs(this.speed) > 0.1) {
            this.stuckCounter++;
        } else {
            this.stuckCounter = Math.max(0, this.stuckCounter - 1);
        }
        
        // Determine the next checkpoint to target
        let nextCheckpointId = 0;
        
        // Find the next checkpoint that hasn't been passed
        for (let i = 0; i < trackData.checkpoints.length; i++) {
            if (!this.checkpointsPassed.has(i)) {
                nextCheckpointId = i;
                break;
            }
        }
        
        // If we've been targeting the same checkpoint for too long, try special maneuvers
        if (this.lastCheckpointId === nextCheckpointId) {
            this.sameCheckpointCounter = (this.sameCheckpointCounter || 0) + 1;
        } else {
            this.sameCheckpointCounter = 0;
            this.lastCheckpointId = nextCheckpointId;
            // Flip avoidance direction when we reach a new checkpoint
            this.avoidanceDirection *= -1;
        }
        
        // Target the next checkpoint
        const targetCheckpoint = trackData.checkpoints[nextCheckpointId];
        
        // Calculate direction to target checkpoint
        const targetX = targetCheckpoint.x;
        const targetY = targetCheckpoint.y;
        
        // Vector from car to checkpoint
        const directionX = targetX - this.position.x;
        const directionY = targetY - this.position.y;
        
        // Distance to checkpoint
        const distanceToCheckpoint = Math.sqrt(directionX * directionX + directionY * directionY);
        
        // Calculate target angle (atan2 gives the angle in radians)
        let targetAngle = Math.atan2(directionY, directionX);
        
        // Multi-point obstacle detection (like sensors in different directions)
        // Shorter detection ranges for aggressive driving
        const sensorAngles = [-Math.PI/4, 0, Math.PI/4]; // 45° left, straight, 45° right
        const sensorDistances = [40, 60, 40]; // Shorter ranges than basic AI
        
        let obstacleDetected = false;
        let closestObstacleDistance = Infinity;
        let obstacleDirection = 0; // Direction of the detected obstacle relative to car
        
        // Scan in multiple directions for obstacles
        for (let i = 0; i < sensorAngles.length; i++) {
            const sensorAngle = this.angle + sensorAngles[i];
            const lookDistance = sensorDistances[i];
            
            const lookX = this.position.x + Math.cos(sensorAngle) * lookDistance;
            const lookY = this.position.y + Math.sin(sensorAngle) * lookDistance;
            
            // Check if this sensor detects a wall
            for (let wall of trackData.walls) {
                if (lookX >= wall.x && lookX <= wall.x + wall.width &&
                    lookY >= wall.y && lookY <= wall.y + wall.height) {
                    
                    // Calculate distance to this obstacle
                    const obstacleDistance = Math.sqrt(
                        Math.pow(lookX - this.position.x, 2) + 
                        Math.pow(lookY - this.position.y, 2)
                    );
                    
                    if (obstacleDistance < closestObstacleDistance) {
                        closestObstacleDistance = obstacleDistance;
                        obstacleDirection = sensorAngles[i];
                    }
                    
                    obstacleDetected = true;
                }
            }
        }
        
        // Emergency recovery if we're stuck
        let inRecoveryMode = false;
        
        if (this.stuckCounter > 15) { // More patience before entering recovery
            inRecoveryMode = true;
            // Reverse direction dramatically and try to escape
            this.speed = -this.maxSpeed * 0.8;
            // Turn sharply 
            this.angle += this.turnSpeed * 4 * this.avoidanceDirection;
            
            // Reset counter periodically to try different approaches
            if (this.stuckCounter > 60) {
                this.stuckCounter = 0;
                this.avoidanceDirection *= -1; // Change avoidance direction
            }
        } 
        // If we've been targeting the same checkpoint for too long, try a different approach
        else if (this.sameCheckpointCounter > 300) { // More patience before trying a different approach
            inRecoveryMode = true;
            
            // Make a wide circle to approach from a different angle
            this.angle += this.turnSpeed * 3 * this.avoidanceDirection;
            this.speed = this.maxSpeed * 0.7;
            
            // Reset if we've been trying this for too long
            if (this.sameCheckpointCounter > 420) {
                this.sameCheckpointCounter = 0;
                this.avoidanceDirection *= -1;
            }
        }
        // Apply obstacle avoidance if needed - more aggressive approach
        else if (obstacleDetected && !inRecoveryMode) {
            // Calculate avoidance angle based on which direction the obstacle is detected
            const avoidanceStrength = mapValue(closestObstacleDistance, 0, 60, 0.5, 0.1);
            
            // Steer away from obstacle, but less aggressively
            if (obstacleDirection > 0) {
                // Obstacle is on the right, steer left
                targetAngle -= Math.PI/4 * avoidanceStrength;
            } else {
                // Obstacle is on the left, steer right
                targetAngle += Math.PI/4 * avoidanceStrength;
            }
            
            // Slow down less than basic AI
            const slowFactor = mapValue(closestObstacleDistance, 0, 60, 0.5, 0.8);
            this.speed *= slowFactor;
        }
        
        // Normal driving behavior (when not in recovery mode)
        if (!inRecoveryMode) {
            // Calculate the difference between current angle and target angle
            let angleDiff = targetAngle - this.angle;
            
            // Normalize angle between -PI and PI
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Steering: Turn based on the angle difference - more responsive
            if (angleDiff > 0.05) {
                // Turn right
                this.angle += this.turnSpeed * Math.min(2.5, angleDiff);
            } else if (angleDiff < -0.05) {
                // Turn left
                this.angle += this.turnSpeed * Math.max(-2.5, angleDiff);
            }
            
            // Throttle control: More aggressive acceleration
            const alignment = Math.cos(this.angle - targetAngle);
            
            if (alignment > 0.6) { // Less alignment required to accelerate
                // When aligned, accelerate more aggressively
                const targetSpeed = distanceToCheckpoint < 80 ? 
                    this.maxSpeed * 0.7 : // Less slowing down for corners 
                    (obstacleDetected ? this.maxSpeed * 0.6 : this.maxSpeed * 0.95); // Higher target speed
                
                this.speed += this.acceleration * (alignment + 0.2); // Bonus acceleration
                this.speed = Math.min(targetSpeed, this.speed);
            } else {
                // When poorly aligned, slow down less
                this.speed *= 0.97;
            }
            
            // Adjust speed around corners, but less cautious
            if (Math.abs(angleDiff) > 0.8) { // Only slow for very sharp turns
                this.speed *= 0.92;
            }
        }
    }
}
