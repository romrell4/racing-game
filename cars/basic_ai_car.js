class BasicAICar extends Car {
    constructor(x = 400, y = 425, color = '#ff0000') {
        super(x, y, color);
        
        // AI-specific state variables
        this.stuckCounter = 0;
        this.lastPosition = new Vector2(this.position.x, this.position.y);
        this.lastCheckpointId = -1;
        this.avoidanceDirection = 1; // 1 for right, -1 for left
        this.sameCheckpointCounter = 0;
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
        const sensorAngles = [-Math.PI/4, 0, Math.PI/4, Math.PI/2, -Math.PI/2]; // 45° left, straight, 45° right, 90° left/right
        const sensorDistances = [60, 80, 60, 40, 40]; // Longer range for straight ahead
        
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
        
        if (this.stuckCounter > 10) { // Stuck for about 45 frames
            inRecoveryMode = true;
            // Reverse direction dramatically
            this.speed = -this.maxSpeed * 0.6;
            // Turn sharply 
            this.angle += this.turnSpeed * 3 * this.avoidanceDirection;
            
            // Reset counter periodically to try different approaches
            if (this.stuckCounter > 75) {
                this.stuckCounter = 0;
                this.avoidanceDirection *= -1; // Change avoidance direction
            }
        } 
        // If we've been targeting the same checkpoint for too long, try a different approach
        else if (this.sameCheckpointCounter > 240) { // About 4 seconds
            inRecoveryMode = true;
            
            // Make a wide circle to approach from a different angle
            this.angle += this.turnSpeed * 2 * this.avoidanceDirection;
            this.speed = this.maxSpeed * 0.5;
            
            // Reset if we've been trying this for too long
            if (this.sameCheckpointCounter > 360) {
                this.sameCheckpointCounter = 0;
                this.avoidanceDirection *= -1;
            }
        }
        // Apply obstacle avoidance if needed
        else if (obstacleDetected && !inRecoveryMode) {
            // Calculate avoidance angle based on which direction the obstacle is detected
            const avoidanceStrength = mapValue(closestObstacleDistance, 0, 80, 0.6, 0.1);
            
            // Steer away from obstacle
            if (obstacleDirection > 0) {
                // Obstacle is on the right, steer left
                targetAngle -= Math.PI/3 * avoidanceStrength;
            } else {
                // Obstacle is on the left, steer right
                targetAngle += Math.PI/3 * avoidanceStrength;
            }
            
            // Slow down more when obstacle is closer
            const slowFactor = mapValue(closestObstacleDistance, 0, 80, 0.3, 0.7);
            this.speed *= slowFactor;
        }
        
        // Normal driving behavior (when not in recovery mode)
        if (!inRecoveryMode) {
            // Calculate the difference between current angle and target angle
            let angleDiff = targetAngle - this.angle;
            
            // Normalize angle between -PI and PI
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Steering: Turn based on the angle difference
            if (angleDiff > 0.05) {
                // Turn right
                this.angle += this.turnSpeed * Math.min(2, angleDiff);
            } else if (angleDiff < -0.05) {
                // Turn left
                this.angle += this.turnSpeed * Math.max(-2, angleDiff);
            }
            
            // Throttle control: Accelerate when pointing toward checkpoint, brake when not
            const alignment = Math.cos(this.angle - targetAngle);
            
            if (alignment > 0.7) {
                // When well-aligned, accelerate, but slow down when getting close
                const targetSpeed = distanceToCheckpoint < 100 ? 
                    this.maxSpeed * 0.5 : 
                    (obstacleDetected ? this.maxSpeed * 0.4 : this.maxSpeed * 0.8);
                
                this.speed += this.acceleration * alignment;
                this.speed = Math.min(targetSpeed, this.speed);
            } else {
                // When poorly aligned, slow down to turn better
                this.speed *= 0.95;
            }
            
            // Adjust speed around corners
            if (Math.abs(angleDiff) > 0.5) {
                // Sharp turn ahead, reduce speed more
                this.speed *= 0.9;
            }
        }
    }
}
