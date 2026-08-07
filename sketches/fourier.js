// ===== FOURIER CIRCLES =====
// Author: toibawani
// Email: toibawani14@gmail.com
// Draw a path, decompose it into spinning circles (Fourier series)

let fourierSketch = function(p) {
    let path = [];
    let circles = [];
    let canvasWidth = 800;
    let canvasHeight = 600;
    let complexity = 50;
    let animationTime = 0;
    let isReplaying = false;
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        
        setupControls();
        initSketch(this);
    };
    
    p.draw = function() {
        p.background('#050507');
        
        p.push();
        p.stroke('rgba(232, 160, 76, 0.2)');
        p.strokeWeight(1);
        p.noFill();
        p.rect(20, 20, canvasWidth - 40, canvasHeight - 120);
        p.pop();
        
        if (isReplaying && circles.length > 0) {
            animationTime += 0.01;
            if (animationTime > 1) {
                animationTime = 0;
            }
            
            drawCircles();
            drawReconstructedPath();
        } else if (path.length > 0) {
            drawPath();
        }
        
        drawInfo();
    };
    
    function drawPath() {
        p.push();
        p.stroke('rgba(232, 160, 76, 0.8)');
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        path.forEach((point, i) => {
            if (i === 0) p.vertex(point.x, point.y);
            else p.curveVertex(point.x, point.y);
        });
        p.endShape();
        p.pop();
    }
    
    function drawCircles() {
        p.push();
        let x = canvasWidth / 2;
        let y = canvasHeight / 2;
        
        circles.forEach((circle, i) => {
            let angle = animationTime * p.TWO_PI + circle.phase;
            let circleX = x + circle.radius * p.cos(angle);
            let circleY = y + circle.radius * p.sin(angle);
            
            p.stroke('rgba(100, 150, 200, 0.3)');
            p.strokeWeight(1);
            p.noFill();
            p.ellipse(x, y, circle.radius * 2);
            
            p.stroke('rgba(100, 150, 200, 0.4)');
            p.strokeWeight(1);
            p.line(x, y, circleX, circleY);
            
            p.fill('rgba(100, 150, 200, 0.6)');
            p.noStroke();
            p.ellipse(circleX, circleY, 3);
            
            x = circleX;
            y = circleY;
        });
        
        p.pop();
    }
    
    function drawReconstructedPath() {
        p.push();
        p.stroke('rgba(232, 160, 76, 0.8)');
        p.strokeWeight(2);
        p.noFill();
        
        p.beginShape();
        for (let t = 0; t <= animationTime; t += 0.01) {
            let point = getPointOnPath(t);
            p.vertex(point.x, point.y);
        }
        p.endShape();
        
        p.pop();
    }
    
    function getPointOnPath(t) {
        let x = canvasWidth / 2;
        let y = canvasHeight / 2;
        
        circles.forEach(circle => {
            let angle = t * p.TWO_PI + circle.phase;
            x += circle.radius * p.cos(angle);
            y += circle.radius * p.sin(angle);
        });
        
        return { x, y };
    }
    
    function drawInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.8)');
        p.noStroke();
        p.textAlign(p.LEFT, p.BOTTOM);
        p.textSize(13);
        p.textFont('Inter');
        
        if (path.length === 0) {
            p.text('Draw any shape in the box above', 20, canvasHeight - 20);
        } else {
            p.text(`Path recorded (${path.length} points) | Press space or click Replay`, 20, canvasHeight - 20);
        }
        
        p.pop();
    }
    
    p.mouseDragged = function() {
        if (p.mouseX > 20 && p.mouseX < canvasWidth - 20 && p.mouseY > 20 && p.mouseY < canvasHeight - 120) {
            path.push({ x: p.mouseX, y: p.mouseY });
            
            if (isReplaying) {
                isReplaying = false;
                circles = [];
                animationTime = 0;
            }
            return false;
        }
    };
    
    p.mouseReleased = function() {
        if (path.length > 10) {
            performFourierAnalysis();
            isReplaying = true;
            animationTime = 0;
        }
    };
    
    function performFourierAnalysis() {
        circles = [];
        
        for (let k = 0; k < complexity; k++) {
            let realPart = 0;
            let imagPart = 0;
            
            for (let n = 0; n < path.length; n++) {
                let angle = -2 * p.PI * k * n / path.length;
                realPart += path[n].x * p.cos(angle);
                imagPart += path[n].x * p.sin(angle);
            }
            
            realPart /= path.length;
            imagPart /= path.length;
            
            let radius = p.sqrt(realPart * realPart + imagPart * imagPart);
            let phase = p.atan2(imagPart, realPart);
            
            if (radius > 1) {
                circles.push({ radius, phase });
            }
        }
        
        circles.sort((a, b) => b.radius - a.radius);
        circles = circles.slice(0, 50);
    }
    
    p.keyPressed = function() {
        if (p.key === ' ') {
            if (path.length > 10) {
                performFourierAnalysis();
                isReplaying = true;
                animationTime = 0;
            }
            return false;
        }
    };
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        
        let complexityGroup = createControlGroup('Circles Used', 10, 100, complexity, (val) => {
            complexity = Math.floor(val);
            if (path.length > 10) {
                performFourierAnalysis();
                isReplaying = true;
                animationTime = 0;
            }
        });
        controlsSection.appendChild(complexityGroup);
        
        let clearBtn = createButton('Clear Drawing', () => {
            path = [];
            circles = [];
            isReplaying = false;
            animationTime = 0;
        });
        controlsSection.appendChild(clearBtn);
    }
    
    this.resetSketch = function() {
        path = [];
        circles = [];
        isReplaying = false;
        animationTime = 0;
        complexity = 50;
    };
};

new p5(fourierSketch);