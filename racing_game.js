class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Default track type
        this.trackType = 'classic';
        
        // Create track
        this.track = new Track(this.trackType);
        
        // Create track selector UI
        this.createTrackSelector();
        
        // Create cars
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
    
    createTrackSelector() {
        const container = document.querySelector('.game-container');
        
        // Create track selector container
        const trackSelector = document.createElement('div');
        trackSelector.className = 'track-selector';
        trackSelector.style.marginTop = '10px';
        trackSelector.style.marginBottom = '10px';
        
        // Create label
        const label = document.createElement('span');
        label.textContent = 'Track: ';
        trackSelector.appendChild(label);
        
        // Create select dropdown
        const select = document.createElement('select');
        select.id = 'track-type';
        
        // Add options from TRACK_LAYOUTS
        for (const key in TRACK_LAYOUTS) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = TRACK_LAYOUTS[key].name;
            if (key === this.trackType) {
                option.selected = true;
            }
            select.appendChild(option);
        }
        
        // Add change event
        select.addEventListener('change', (e) => {
            this.trackType = e.target.value;
            this.track.setLayout(this.trackType);
            this.resetGame();
        });
        
        trackSelector.appendChild(select);
        
        // Insert after the title, before the canvas
        const title = container.querySelector('h1');
        container.insertBefore(trackSelector, title.nextSibling);
    }
    
    resetGame() {
        // Reset the track if needed
        this.track.setLayout(this.trackType);
        
        // Get the starting position from the track
        const startPosition = this.track.getStartPosition();
        
        // Create cars with the same starting position but slight vertical offsets to avoid collision
        const startX = startPosition.x;
        const startY = startPosition.y;
        const startAngle = startPosition.angle;
        
        // Create cars with slight offsets
        this.cars = [
            new HumanCar(startX, startY, '#0000ff'), // Player car
            new BasicAICar(startX, startY, '#ff0000'), // Basic AI car
            new AggressiveAICar(startX, startY, '#ff6600'), // Aggressive AI car
        ];
        
        // Set all cars to the same starting angle and reset their racing stats
        this.cars.forEach(car => {
            car.angle = startAngle;
            car.checkpointsPassed.clear();
            car.lap = 1;
            car.finished = false;
            car.bestLapTime = null;
            car.lapStartTime = Date.now();
        });
        
        this.gameStartTime = Date.now();
    }
    
    update() {
        const trackData = this.track.getTrackData();
        
        // Get player car and pass input
        const playerCar = this.cars[0];
        
        this.cars.forEach(car => {
            if (!car.finished) {
                // For human car, we need to pass the input
                if (car === playerCar) {
                    car.decideControls(trackData, this.input);
                } else {
                    car.decideControls(trackData);
                }
                
                car.update(trackData);
                
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
        
        // Update player stats
        document.getElementById('speed').textContent = Math.round(Math.abs(playerCar.speed * 10));
        document.getElementById('lap').textContent = `${Math.min(playerCar.lap, playerCar.totalLaps)}/${playerCar.totalLaps}`;
        
        if (playerCar.bestLapTime) {
            const bestTime = (playerCar.bestLapTime / 1000).toFixed(2);
            document.getElementById('bestTime').textContent = bestTime + 's';
        }
        
        const currentTime = ((Date.now() - playerCar.lapStartTime) / 1000).toFixed(1);
        document.getElementById('currentTime').textContent = currentTime + 's';
        
        // Update or create leaderboard
        this.updateLeaderboard();
    }
    
    updateLeaderboard() {
        // Create leaderboard if it doesn't exist
        let leaderboard = document.getElementById('leaderboard');
        if (!leaderboard) {
            // Create leaderboard container
            leaderboard = document.createElement('div');
            leaderboard.id = 'leaderboard';
            leaderboard.style.marginTop = '15px';
            leaderboard.style.padding = '10px';
            leaderboard.style.background = '#333';
            leaderboard.style.borderRadius = '5px';
            
            // Add title
            const title = document.createElement('div');
            title.textContent = 'Race Positions';
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '5px';
            leaderboard.appendChild(title);
            
            // Add to DOM
            document.querySelector('.game-container').appendChild(leaderboard);
        }
        
        // Calculate race positions
        const positions = [...this.cars].sort((a, b) => {
            // Sort by lap first
            if (b.lap !== a.lap) return b.lap - a.lap;
            
            // Then by checkpoints passed
            if (b.checkpointsPassed.size !== a.checkpointsPassed.size) 
                return b.checkpointsPassed.size - a.checkpointsPassed.size;
            
            // Finally by best lap time (if available)
            if (a.bestLapTime && b.bestLapTime)
                return a.bestLapTime - b.bestLapTime;
            
            return 0;
        });
        
        // Generate leaderboard content
        leaderboard.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px;">Race Positions</div>';
        
        positions.forEach((car, index) => {
            const carType = car === this.cars[0] ? 'You' : 
                           car === this.cars[1] ? 'Basic AI' : 'Aggressive AI';
            
            const position = document.createElement('div');
            position.style.display = 'flex';
            position.style.justifyContent = 'space-between';
            position.style.margin = '2px 0';
            
            // Position marker with car color
            const marker = document.createElement('span');
            marker.innerHTML = `<span style="color: ${car.color};">■</span> ${index + 1}. ${carType}`;
            
            // Status
            const status = document.createElement('span');
            status.textContent = `Lap ${car.lap}/${car.totalLaps}`;
            
            position.appendChild(marker);
            position.appendChild(status);
            leaderboard.appendChild(position);
        });
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

// Start the game when the page is loaded
window.onload = function() {
    const game = new Game();
};
