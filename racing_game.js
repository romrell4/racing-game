class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
    subtract(v) { return new Vector2(this.x - v.x, this.y - v.y); }
    multiply(s) { return new Vector2(this.x * s, this.y * s); }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() { 
        const len = this.length();
        return len > 0 ? new Vector2(this.x / len, this.y / len) : new Vector2(0, 0);
    }
    dot(v) { return this.x * v.x + this.y * v.y; }
}

class Car {
    constructor(x = 400, y = 400, color = '#0000ff', isAI = false) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 8;
        this.acceleration = 0.3;
        this.friction = 0.95;
        this.turnSpeed = 0.05;
        this.width = 20;
        this.height = 10;
        this.color = color;
        this.isAI = isAI;
        
        // Racing stats
        this.lap = 1;
        this.checkpointsPassed = new Set();
        this.lapStartTime = Date.now();
        this.bestLapTime = null;
        this.totalLaps = 3;
        this.finished = false;
        this.checkpointImmunity = 0; // Frames of immunity after lap completion
    }
    
    // This method can be overridden for AI agents
    drive(input, trackData) {
        if (this.isAI) {
            // AI driving logic will go here
            this.aiDrive(trackData);
        } else {
            // Human player controls
            this.humanDrive(input);
        }
    }
    
    humanDrive(input) {
        // Acceleration/Deceleration
        if (input.up) {
            this.speed += this.acceleration;
        } else if (input.down) {
            this.speed -= this.acceleration * 0.7;
        } else {
            this.speed *= 0.98; // Gradual slowdown
        }
        
        // Turning (only when moving)
        if (Math.abs(this.speed) > 0.1) {
            if (input.left) {
                this.angle -= this.turnSpeed * Math.abs(this.speed) / this.maxSpeed;
            }
            if (input.right) {
                this.angle += this.turnSpeed * Math.abs(this.speed) / this.maxSpeed;
            }
        }
        
        // Speed limits
        this.speed = Math.max(-this.maxSpeed * 0.5, Math.min(this.maxSpeed, this.speed));
    }
    
    // Enhanced AI driving implementation with improved obstacle avoidance
    aiDrive(trackData) {
        // Keep track of consecutive frames where speed is very low (to detect being stuck)
        if (!this.stuckCounter) this.stuckCounter = 0;
        if (!this.lastPosition) this.lastPosition = new Vector2(this.position.x, this.position.y);
        if (!this.lastCheckpointId) this.lastCheckpointId = -1;
        if (!this.avoidanceDirection) this.avoidanceDirection = 1; // 1 for right, -1 for left
        
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
        
        if (this.stuckCounter > 45) { // Stuck for about 45 frames
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
            const avoidanceStrength = Car.map(closestObstacleDistance, 0, 80, 0.6, 0.1);
            
            // Steer away from obstacle
            if (obstacleDirection > 0) {
                // Obstacle is on the right, steer left
                targetAngle -= Math.PI/3 * avoidanceStrength;
            } else {
                // Obstacle is on the left, steer right
                targetAngle += Math.PI/3 * avoidanceStrength;
            }
            
            // Slow down more when obstacle is closer
            const slowFactor = Car.map(closestObstacleDistance, 0, 80, 0.3, 0.7);
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
    
    // Helper function for mapping values (like Arduino's map function)
    static map(value, fromLow, fromHigh, toLow, toHigh) {
        return toLow + (toHigh - toLow) * (value - fromLow) / (fromHigh - fromLow);
    }
    
    update() {
        // Apply physics
        this.velocity.x = Math.cos(this.angle) * this.speed;
        this.velocity.y = Math.sin(this.angle) * this.speed;
        
        this.position = this.position.add(this.velocity);
        this.velocity = this.velocity.multiply(this.friction);
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);
        
        // Car body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Car details
        ctx.fillStyle = '#333';
        ctx.fillRect(-this.width/2 + 3, -this.height/2 + 1, this.width - 6, 2);
        ctx.fillRect(-this.width/2 + 3, this.height/2 - 3, this.width - 6, 2);
        
        // Direction indicator
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.width/2 - 3, -2, 4, 4);
        
        ctx.restore();
    }
    
    getCorners() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const hw = this.width / 2;
        const hh = this.height / 2;
        
        return [
            new Vector2(this.position.x + cos * hw - sin * hh, this.position.y + sin * hw + cos * hh),
            new Vector2(this.position.x - cos * hw - sin * hh, this.position.y - sin * hw + cos * hh),
            new Vector2(this.position.x - cos * hw + sin * hh, this.position.y - sin * hw - cos * hh),
            new Vector2(this.position.x + cos * hw + sin * hh, this.position.y + sin * hw - cos * hh)
        ];
    }
}

class Track {
    constructor() {
        this.checkpoints = [
            { x: 700, y: 300, width: 60, height: 15, id: 0 },
            { x: 400, y: 100, width: 15, height: 60, id: 1 },
            { x: 100, y: 300, width: 60, height: 15, id: 2 },
            { x: 400, y: 500, width: 15, height: 60, id: 3 }
        ];
        
        this.walls = [
            // Outer walls
            { x: 0, y: 0, width: 800, height: 20 },
            { x: 0, y: 580, width: 800, height: 20 },
            { x: 0, y: 0, width: 20, height: 600 },
            { x: 780, y: 0, width: 20, height: 600 },
            
            // Inner obstacles
            { x: 200, y: 150, width: 120, height: 20 },
            { x: 480, y: 150, width: 120, height: 20 },
            { x: 200, y: 430, width: 120, height: 20 },
            { x: 480, y: 430, width: 120, height: 20 },
            { x: 350, y: 250, width: 100, height: 100 }
        ];
    }
    
    draw(ctx, cars = []) {
        // Draw track background
        ctx.fillStyle = '#444';
        ctx.fillRect(0, 0, 800, 600);
        
        // Draw walls
        ctx.fillStyle = '#666';
        this.walls.forEach(wall => {
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        });
        
        // Draw checkpoints with player-specific indicators
        this.checkpoints.forEach((checkpoint, i) => {
            // Determine checkpoint orientation (horizontal or vertical)
            const isHorizontal = checkpoint.width > checkpoint.height;
            
            // Main checkpoint body (always yellow)
            ctx.fillStyle = '#ff4'; // Yellow
            ctx.fillRect(checkpoint.x - checkpoint.width/2, checkpoint.y - checkpoint.height/2, 
                       checkpoint.width, checkpoint.height);
            
            // Get player progress and colors
            const player = cars.length > 0 ? cars[0] : null;
            const ai = cars.length > 1 ? cars[1] : null;
            
            const playerPassed = player && player.checkpointsPassed.has(checkpoint.id);
            const aiPassed = ai && ai.checkpointsPassed.has(checkpoint.id);
            
            const playerColor = player ? player.color : '#0000ff'; // Default to blue if no player
            const aiColor = ai ? ai.color : '#ff0000'; // Default to red if no AI
            
            // Draw player indicators
            if (isHorizontal) {
                // For horizontal checkpoints, add indicators on left and right sides
                
                // Player indicator (left side)
                ctx.fillStyle = playerPassed ? playerColor : '#aaa'; // Car color if passed, gray if not
                ctx.fillRect(
                    checkpoint.x - checkpoint.width/2, 
                    checkpoint.y - checkpoint.height/2,
                    checkpoint.width * 0.2, // 20% of the width 
                    checkpoint.height
                );
                
                // AI indicator (right side)
                ctx.fillStyle = aiPassed ? aiColor : '#aaa'; // Car color if passed, gray if not
                ctx.fillRect(
                    checkpoint.x + checkpoint.width/2 - checkpoint.width * 0.2, 
                    checkpoint.y - checkpoint.height/2,
                    checkpoint.width * 0.2, // 20% of the width
                    checkpoint.height
                );
            } else {
                // For vertical checkpoints, add indicators on top and bottom
                
                // Player indicator (top)
                ctx.fillStyle = playerPassed ? playerColor : '#aaa'; // Car color if passed, gray if not
                ctx.fillRect(
                    checkpoint.x - checkpoint.width/2,
                    checkpoint.y - checkpoint.height/2,
                    checkpoint.width,
                    checkpoint.height * 0.2 // 20% of the height
                );
                
                // AI indicator (bottom)
                ctx.fillStyle = aiPassed ? aiColor : '#aaa'; // Car color if passed, gray if not
                ctx.fillRect(
                    checkpoint.x - checkpoint.width/2,
                    checkpoint.y + checkpoint.height/2 - checkpoint.height * 0.2,
                    checkpoint.width,
                    checkpoint.height * 0.2 // 20% of the height
                );
            }
            
            // Checkpoint numbers
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(i + 1, checkpoint.x, checkpoint.y + 4);
        });
    }
    
    checkCollisions(car) {
        const corners = car.getCorners();
        
        for (let wall of this.walls) {
            for (let corner of corners) {
                if (corner.x >= wall.x && corner.x <= wall.x + wall.width &&
                    corner.y >= wall.y && corner.y <= wall.y + wall.height) {
                    return true;
                }
            }
        }
        return false;
    }
    
    checkCheckpoints(car) {
        // Decrease immunity counter if it's active
        if (car.checkpointImmunity > 0) {
            car.checkpointImmunity--;
            return; // Skip checkpoint checks during immunity period
        }
        
        for (let checkpoint of this.checkpoints) {
            if (!car.checkpointsPassed.has(checkpoint.id)) {
                const dx = car.position.x - checkpoint.x;
                const dy = car.position.y - checkpoint.y;
                
                if (Math.abs(dx) < checkpoint.width/2 && Math.abs(dy) < checkpoint.height/2) {
                    car.checkpointsPassed.add(checkpoint.id);
                    
                    // Check if lap completed
                    if (car.checkpointsPassed.size === this.checkpoints.length) {
                        this.completeLap(car);
                    }
                }
            }
        }
    }
    
    completeLap(car) {
        const lapTime = Date.now() - car.lapStartTime;
        
        if (!car.bestLapTime || lapTime < car.bestLapTime) {
            car.bestLapTime = lapTime;
        }
        
        car.lap++;
        car.checkpointsPassed.clear();
        car.lapStartTime = Date.now();
        
        // Add checkpoint immunity to prevent immediate checkpoint registration
        car.checkpointImmunity = 30; // Immunity for 30 frames (~0.5 seconds)
        
        if (car.lap > car.totalLaps) {
            car.finished = true;
        }
    }
    
    getTrackData() {
        return {
            checkpoints: this.checkpoints,
            walls: this.walls,
            width: 800,
            height: 600
        };
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.track = new Track();
        
        // Create player car
        this.resetGame();
        
        this.input = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.input.up = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.input.down = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.input.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.input.right = true;
                    break;
                case 'KeyR':
                    this.resetGame();
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.input.up = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.input.down = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.input.left = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.input.right = false;
                    break;
            }
        });
    }
    
    resetGame() {
        this.cars = [
            new Car(400, 400, '#0000ff', false), // Player car
            new Car(400, 425, '#ff0000', true), // AI car with original position
        ];
        this.gameStartTime = Date.now();
    }
    
    update() {
        const trackData = this.track.getTrackData();
        
        this.cars.forEach(car => {
            if (!car.finished) {
                // Each car drives according to its type (human or AI)
                car.drive(this.input, trackData);
                car.update();
                
                // Check collisions
                if (this.track.checkCollisions(car)) {
                    // Simple collision response - bounce back
                    car.position = car.position.subtract(car.velocity.multiply(2));
                    car.speed *= -0.3;
                }
                
                // Check checkpoints
                this.track.checkCheckpoints(car);
            }
        });
        
        this.updateUI();
    }
    
    updateUI() {
        const playerCar = this.cars[0];
        document.getElementById('speed').textContent = Math.round(Math.abs(playerCar.speed * 10));
        document.getElementById('lap').textContent = `${Math.min(playerCar.lap, playerCar.totalLaps)}/${playerCar.totalLaps}`;
        
        if (playerCar.bestLapTime) {
            const bestTime = (playerCar.bestLapTime / 1000).toFixed(2);
            document.getElementById('bestTime').textContent = bestTime + 's';
        }
        
        const currentTime = ((Date.now() - playerCar.lapStartTime) / 1000).toFixed(1);
        document.getElementById('currentTime').textContent = currentTime + 's';
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.track.draw(this.ctx, this.cars);
        
        this.cars.forEach(car => {
            car.draw(this.ctx);
        });
        
        // Draw finish message
        if (this.cars[0].finished) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, 800, 600);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Race Finished!', 400, 280);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press R to race again', 400, 320);
            
            if (this.cars[0].bestLapTime) {
                const bestTime = (this.cars[0].bestLapTime / 1000).toFixed(2);
                this.ctx.fillText(`Best Lap: ${bestTime}s`, 400, 360);
            }
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game
const game = new Game();
