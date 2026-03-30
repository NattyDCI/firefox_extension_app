function setup() {
  const holder = document.getElementById("canvas-holder");

  if (!holder) {
    console.error("canvas-holder not found");
    return;
  }

  const cnv = createCanvas(200, 200);
  cnv.parent("canvas-holder");

  angleMode(DEGREES);
  colorMode(RGB, 255);
  textAlign(CENTER, CENTER);
  textSize(14);
}

function draw() {
  const data = window.popupClockData || {
    domain: "",
    sessionMs: 0,
    totalMs: 0
  };

  drawClock(data);
}

function drawClock(data) {
  const bgCol = color(245, 242, 232);
  const secCol = color(220, 40, 40);
  const baseCol = color(250, 250, 245);
  const minutesgoneCol = color(35, 85, 200);
  const secColBall = color(245, 200, 35);

  background(bgCol);

  const totalSeconds = Math.floor((data.sessionMs || 0) / 1000);
  const hr = Math.floor(totalSeconds / 3600);
  const mn = Math.floor(totalSeconds / 60) % 60;
  const sc = totalSeconds % 60;

  const cx = width / 2;
  const cy = height / 2;

  // Seconds pie
  push();
  let tsec = map(sc, 0, 59, 0, 360);
  stroke(0);
  strokeWeight(2);
  fill(secCol);
  arc(cx, cy, 170, 170, -90, tsec - 90, PIE);
  pop();

  // Inner circle
  push();
  stroke(0);
  strokeWeight(1.5);
  fill(baseCol);
  ellipse(cx, cy, 125, 125);
  pop();

  // Minutes pie
  let end = map(mn, 0, 59, 0, 360);
  push();
  noStroke();
  fill(minutesgoneCol);
  arc(cx, cy, 125, 125, -90, end - 90, PIE);
  pop();

  // Seconds moving circle
  push();
  let angleSec = map(sc, 0, 59, 0, 360);
  translate(cx, cy);
  rotate(angleSec);
  blendMode(DIFFERENCE);
  noStroke();
  fill(secColBall);
  circle(0, -42, 20);
  blendMode(BLEND);
  pop();

  // Hour pointer
  let fluidHrPointer = (hr % 12) + mn / 60;
  let angleHr = map(fluidHrPointer, 0, 12, 0, 360);
  let fillColor = colorModeChrono(hr);

  push();
  translate(cx, cy);
  rotate(angleHr);
  fill(fillColor);
  stroke(0);
  strokeWeight(2);
  rectMode(CENTER);
  rect(0, -68, 8, 28);
  pop();

  // Digital session display
  fill(0);
  noStroke();
  textSize(11);
  text(formatMs(data.sessionMs || 0), width / 2, height - 10);
}

function colorModeChrono(hourValue) {
  if (hourValue < 4) return color(140, 0, 0);
  if (hourValue < 12) return color(35, 85, 200);
  if (hourValue < 18) return color(245, 200, 35);
  return color(30, 30, 30);
}

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}