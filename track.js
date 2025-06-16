// Track layout definitions
const TRACK_LAYOUTS = {
    classic: {
        name: "Classic Track",
        checkpoints: [
            { x: 700, y: 300, width: 60, height: 15, id: 0 },
            { x: 400, y: 100, width: 15, height: 60, id: 1 },
            { x: 100, y: 300, width: 60, height: 15, id: 2 },
            { x: 400, y: 500, width: 15, height: 60, id: 3 }
        ],
        walls: [
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
        ],
        backgroundColor: '#444',
        startPosition: {
            x: 700, // Start near first checkpoint
            y: 350, // Position below the first checkpoint
            angle: Math.PI // Initial angle facing left
        }
    },
    open: {
        name: "Open Field",
        checkpoints: [
            { x: 700, y: 300, width: 60, height: 15, id: 0 },
            { x: 600, y: 150, width: 15, height: 60, id: 1 },
            { x: 400, y: 100, width: 60, height: 15, id: 2 },
            { x: 200, y: 150, width: 15, height: 60, id: 3 },
            { x: 100, y: 300, width: 60, height: 15, id: 4 },
            { x: 200, y: 450, width: 15, height: 60, id: 5 },
            { x: 400, y: 500, width: 60, height: 15, id: 6 },
            { x: 600, y: 450, width: 15, height: 60, id: 7 }
        ],
        walls: [], // No walls for open track
        backgroundColor: '#335533', // Grass-like color
        startPosition: {
            x: 700, // Start near first checkpoint
            y: 350, // Position below the first checkpoint
            angle: Math.PI / 2 * 3 // Initial angle facing upward (toward 2nd checkpoint)
        }
    },
    zigzag: {
        name: "Zig-Zag Challenge",
        checkpoints: [
            { x: 700, y: 550, width: 60, height: 15, id: 0 },
            { x: 550, y: 450, width: 15, height: 60, id: 1 },
            { x: 400, y: 550, width: 60, height: 15, id: 2 },
            { x: 250, y: 450, width: 15, height: 60, id: 3 },
            { x: 100, y: 550, width: 60, height: 15, id: 4 },
            { x: 100, y: 300, width: 15, height: 60, id: 5 },
            { x: 250, y: 150, width: 60, height: 15, id: 6 },
            { x: 400, y: 50, width: 15, height: 60, id: 7 },
            { x: 550, y: 150, width: 60, height: 15, id: 8 },
            { x: 700, y: 50, width: 15, height: 60, id: 9 }
        ],
        walls: [
            // Border walls
            { x: 0, y: 0, width: 800, height: 20 },
            { x: 0, y: 580, width: 800, height: 20 },
            { x: 0, y: 0, width: 20, height: 600 },
            { x: 780, y: 0, width: 20, height: 600 },
            
            // Zigzag obstacles
            { x: 150, y: 350, width: 500, height: 20 },
            { x: 150, y: 200, width: 500, height: 20 },
            { x: 150, y: 500, width: 200, height: 20 },
            { x: 450, y: 500, width: 200, height: 20 }
        ],
        backgroundColor: '#334455', // Blue-gray color
        startPosition: {
            x: 700, // Start near first checkpoint
            y: 530, // Position a bit above the first checkpoint to avoid walls
            angle: Math.PI / 4 * 5 // Initial angle facing up-left (toward 2nd checkpoint)
        }
    }
};

class Track {
    constructor(layoutName = 'classic') {
        this.setLayout(layoutName);
    }
    
    setLayout(layoutName) {
        if (!TRACK_LAYOUTS[layoutName]) {
            console.warn(`Track layout "${layoutName}" not found, using classic instead.`);
            layoutName = 'classic';
        }
        
        const layout = TRACK_LAYOUTS[layoutName];
        this.name = layout.name;
        this.checkpoints = layout.checkpoints;
        this.walls = layout.walls;
        this.backgroundColor = layout.backgroundColor;
        this.startPosition = layout.startPosition;
        this.currentLayout = layoutName;
    }
    
    draw(ctx, cars = []) {
        // Draw track background
        ctx.fillStyle = this.backgroundColor;
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
            
            // Handle multiple cars more generically
            if (cars.length > 0) {
                // For horizontal checkpoints
                if (isHorizontal) {
                    const segmentWidth = checkpoint.width * 0.2; // Width of each indicator segment
                    
                    // Left side - Player
                    const player = cars[0];
                    const playerPassed = player && player.checkpointsPassed.has(checkpoint.id);
                    const playerColor = player ? player.color : '#0000ff';
                    
                    ctx.fillStyle = playerPassed ? playerColor : '#aaa';
                    ctx.fillRect(
                        checkpoint.x - checkpoint.width/2, 
                        checkpoint.y - checkpoint.height/2,
                        segmentWidth,
                        checkpoint.height
                    );
                    
                    // Right side - AIs (can be multiple)
                    if (cars.length > 1) {
                        // Calculate segment size for AIs
                        const aiCount = cars.length - 1;
                        const aiSegmentWidth = segmentWidth / aiCount;
                        
                        for (let i = 1; i < cars.length; i++) {
                            const ai = cars[i];
                            const aiPassed = ai && ai.checkpointsPassed.has(checkpoint.id);
                            const aiColor = ai ? ai.color : '#ff0000';
                            
                            ctx.fillStyle = aiPassed ? aiColor : '#aaa';
                            ctx.fillRect(
                                checkpoint.x + checkpoint.width/2 - segmentWidth + ((i-1) * aiSegmentWidth), 
                                checkpoint.y - checkpoint.height/2,
                                aiSegmentWidth,
                                checkpoint.height
                            );
                        }
                    }
                } 
                // For vertical checkpoints
                else {
                    const segmentHeight = checkpoint.height * 0.2; // Height of each indicator segment
                    
                    // Top side - Player
                    const player = cars[0];
                    const playerPassed = player && player.checkpointsPassed.has(checkpoint.id);
                    const playerColor = player ? player.color : '#0000ff';
                    
                    ctx.fillStyle = playerPassed ? playerColor : '#aaa';
                    ctx.fillRect(
                        checkpoint.x - checkpoint.width/2,
                        checkpoint.y - checkpoint.height/2,
                        checkpoint.width,
                        segmentHeight
                    );
                    
                    // Bottom side - AIs (can be multiple)
                    if (cars.length > 1) {
                        // Calculate segment size for AIs
                        const aiCount = cars.length - 1;
                        const aiSegmentHeight = segmentHeight / aiCount;
                        
                        for (let i = 1; i < cars.length; i++) {
                            const ai = cars[i];
                            const aiPassed = ai && ai.checkpointsPassed.has(checkpoint.id);
                            const aiColor = ai ? ai.color : '#ff0000';
                            
                            ctx.fillStyle = aiPassed ? aiColor : '#aaa';
                            ctx.fillRect(
                                checkpoint.x - checkpoint.width/2,
                                checkpoint.y + checkpoint.height/2 - segmentHeight + ((i-1) * aiSegmentHeight),
                                checkpoint.width,
                                aiSegmentHeight
                            );
                        }
                    }
                }
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
            height: 600,
            startPosition: this.startPosition
        };
    }
    
    getStartPosition() {
        return this.startPosition;
    }
}
