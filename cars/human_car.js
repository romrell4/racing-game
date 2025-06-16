class HumanCar extends Car {
    constructor(x = 400, y = 400, color = '#0000ff') {
        super(x, y, color);
    }
    
    decideControls(trackData, input) {
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
}
