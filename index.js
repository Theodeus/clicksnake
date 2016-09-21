import PIXI from "pixi.js";
import tween from "gsap";
import collide from "line-circle-collision";
import vec from "vectors";
import Tuna from "tunajs";

var renderer = new PIXI.WebGLRenderer(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.view);

const context = new AudioContext();
const tuna = new Tuna(context);
const compressor = new tuna.Compressor();
const pingpong = new tuna.PingPongDelay();
const ballRadius = 20;
const gravity = .07;
const bounce = -1.2;
const wallBounce = 0.9;

const blue = 0x00ddff;
const pink = 0xff00ff;
const darkGray = 0x333333;
const green = 0x44ff44;
const gold = 0xffdd00;

let opacity = 0.3;
let previousTargetPoint = {x: 200, y: 200};
let targetPoint = {x: 300, y: 300};
let linePoints = [];
let collision = false;

compressor.connect(pingpong.input);
pingpong.connect(context.destination);

var stage = new PIXI.Container();
stage.width = renderer.width;
stage.height = renderer.height;

let bg = new PIXI.Graphics();
bg.interactive = true;
bg.on("mousedown", e => {
    tween.killTweensOf(targetPoint);
    previousTargetPoint.x = e.data.global.x;
    previousTargetPoint.y = e.data.global.y;
    targetPoint.x = e.data.global.x;
    targetPoint.y = e.data.global.y;

    let point;
    if (linePoints.length < 2) {
        point = new PIXI.Graphics();
        linePoints.push(point);
        stage.addChild(point);
    } else {
        point = linePoints.shift();
        linePoints.push(point);
    }
    point.click = {x: targetPoint.x, y: targetPoint.y};
});
bg.on("mousemove", e => {
    targetPoint.x = e.data.global.x;
    targetPoint.y = e.data.global.y;
})
bg.beginFill(darkGray, opacity);
bg.drawRect(0, 0, renderer.width, renderer.height);
bg.endFill();
stage.addChild(bg);

let ball = new PIXI.Graphics();
stage.addChild(ball);
ball.direction = {x: 1, y: 1};
ball.currentPosition = {x: 100, y: 100};

let wall = new PIXI.Graphics();
stage.addChild(wall);

let view = new PIXI.Container();
view.addChild(stage);
animate();

function detectCollision() {
    let circle = [ball.currentPosition.x, ball.currentPosition.y];
    let radius = ballRadius;
    let a = [linePoints[0].click.x, linePoints[0].click.y];
    let b = [linePoints[1].click.x, linePoints[1].click.y];
    return collide(a, b, circle, radius);
}

function detectWallCollision() {
    let collider = false;
    if (ball.currentPosition.x + ballRadius >= renderer.width) {
        collider = "right";
    } else if (ball.currentPosition.x - ballRadius <= 0) {
        collider = "left";
    } else if (ball.currentPosition.y + ballRadius >= renderer.height) {
        collider = "bottom";
    } else if (ball.currentPosition.y - ballRadius <= 0) {
        collider = "top";
    }
    return collider;
}

function animate() {
    // start the timer for the next animation loop
    requestAnimationFrame(animate);

    linePoints.forEach((point, i) => {
        point.clear();
        if (i === 2) return;
        point.beginFill(blue, opacity);
        point.drawCircle(point.click.x, point.click.y, 30);
        point.endFill();
    });

    wall.clear();
    wall.lineStyle(4, pink, opacity);

    linePoints.forEach((point, i, arr) => {
        if (i === 1) {
            collision = detectCollision(point, arr[i - 1]);
            if (collision) {
                opacity = 1;
                wall.lineTo(point.click.x, point.click.y);

                wall.lineStyle(4, green, opacity);
                wall.lineTo(targetPoint.x, targetPoint.y);

                let lineAngle;
                if (linePoints[0].click.x > linePoints[1].click.x) {
                    lineAngle = vec.heading(2)(
                        [linePoints[0].click.x, linePoints[0].click.y],
                        [linePoints[1].click.x, linePoints[1].click.y]
                    );
                } else {
                    lineAngle = vec.heading(2)(
                        [linePoints[1].click.x, linePoints[1].click.y],
                        [linePoints[0].click.x, linePoints[0].click.y]
                    );
                }

                let cos = Math.cos(lineAngle);
                let sin = Math.sin(lineAngle);

                let x1 = ball.currentPosition.x - linePoints[0].click.x;
                let y1 = ball.currentPosition.y - linePoints[0].click.y;

                let x2 = cos * x1 + sin * y1;
                let y2 = cos * y1 - sin * x1;

                let vx1 = cos * ball.direction.x + sin * ball.direction.y;
                let vy1 = cos * ball.direction.y - sin * ball.direction.x;

                y2 = -ballRadius;
                vy1 *= bounce;

                x1 = cos * x2 - sin * y2;
                y1 = cos * y2 + sin * x2;
                ball.direction.x = cos * vx1 - sin * vy1;
                ball.direction.y = cos * vy1 + sin * vx1;
                ball.currentPosition.x = linePoints[0].click.x + x1;
                ball.currentPosition.y = linePoints[0].click.y + y1;

                collision = false;

                //play sound
                let osc = context.createOscillator();
                osc.frequency.value = 440;
                osc.connect(compressor.input);
                osc.start(context.currentTime);
                osc.stop(context.currentTime + 0.05);
            } else {
                wall.lineTo(point.click.x, point.click.y);

                wall.lineStyle(4, green, opacity);
                wall.lineTo(targetPoint.x, targetPoint.y);
            }
        } else if (i === 0) {
            wall.moveTo(point.click.x, point.click.y);
        }
    });

    ball.clear();
    ball.direction.y += gravity;
    ball.currentPosition.x += ball.direction.x;
    ball.currentPosition.y += ball.direction.y;
    ball.beginFill(gold, opacity);
    ball.drawCircle(ball.currentPosition.x, ball.currentPosition.y, ballRadius);
    ball.endFill();

    let wallCollision = detectWallCollision();
    if(wallCollision) {
        opacity = 1;
        //play sound
        let osc = context.createOscillator();
        osc.frequency.value = 880;
        osc.connect(compressor.input);
        osc.start(context.currentTime);
        osc.stop(context.currentTime + 0.05);
        switch(wallCollision) {
            case "right":
                ball.currentPosition.x = renderer.width - ballRadius;
                ball.direction.x = -ball.direction.x * wallBounce;
                break;
            case "left":
                ball.currentPosition.x = ballRadius;
                ball.direction.x = -1 * ball.direction.x * wallBounce;
                break;
            case "top":
                ball.currentPosition.y = ballRadius;
                ball.direction.y = -1 * ball.direction.y * wallBounce;
            break;
            case "bottom":
                ball.currentPosition.y = renderer.height - ballRadius;
                ball.direction.y = -ball.direction.y * wallBounce;
                break;
        }
    }
    opacity = Math.max(0.3, opacity * 0.9);

    bg.clear();
    bg.beginFill(darkGray, opacity * 0.2);
    bg.drawRect(0, 0, renderer.width, renderer.height);
    bg.endFill();

    renderer.render(view);
}
