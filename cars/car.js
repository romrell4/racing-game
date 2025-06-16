class Car {
    constructor(x = 400, y = 400, color = '#0000ff') {
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
        
        // Racing stats
        this.lap = 1;
        this.checkpointsPassed = new Set();
        this.lapStartTime = Date.now();
        this.bestLapTime = null;
        this.totalLaps = 3;
        this.finished = false;
        this.checkpointImmunity = 0;
    }
    
    // Abstract method - must be implemented by subclasses
    decideControls(trackData) {
        throw new Error("decideControls method must be implemented by subclass");
    }
    
    // Updates car physics based on current controls
    update(trackData) {
        if (!this.finished) {
            // Apply physics (common to all car types)
            this.velocity.x = Math.cos(this.angle) * this.speed;
            this.velocity.y = Math.sin(this.angle) * this.speed;
            
            this.position = this.position.add(this.velocity);
            this.velocity = this.velocity.multiply(this.friction);
        }
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
