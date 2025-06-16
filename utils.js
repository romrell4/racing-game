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

// Utility function for mapping values (like Arduino's map function)
function mapValue(value, fromLow, fromHigh, toLow, toHigh) {
    return toLow + (toHigh - toLow) * (value - fromLow) / (fromHigh - fromLow);
}
