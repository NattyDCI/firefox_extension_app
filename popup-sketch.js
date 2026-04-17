// Custom font used for legend and UI text inside the canvas
let bricolageFont;

// Preload runs before setup in p5.js.
// Used here to load the custom font so it's ready when drawing text.
function preload() {
  bricolageFont = loadFont("font/BricolageGrotesque_36pt-ExtraBold.ttf");
}

function setup() {
  // Get the container where the canvas should be inserted
  const holder = document.getElementById("canvas-holder");

  // If container is missing, stop execution (prevents crashes)
  if (!holder) {
    console.error("canvas-holder not found");
    return;
  }

  // Create p5 canvas with fixed size (fits popup layout)
  const cnv = createCanvas(220, 320);

  // Attach canvas to the HTML container instead of body
  cnv.parent("canvas-holder");

  // Use degrees instead of radians for rotations (more intuitive)
  angleMode(DEGREES);

  // Standard RGB color mode
  colorMode(RGB, 255);

  // Default text alignment for the sketch
  textAlign(CENTER, CENTER);
  textSize(14);
}

function draw() {
  // Data is passed from popup.js into the window object
  // If not available yet, use safe defaults
  const data = window.popupClockData || {
    domain: "",
    sessionMs: 0,
    totalMs: 0
  };

  // Main drawing function
  drawClock(data);
}

function drawClock(data) {
  // ===== COLOR PALETTE =====
  // Bauhaus-inspired colors used consistently in the clock
  const bgCol = color(245, 242, 232);        // background
  const secCol = color(220, 40, 40);         // red (seconds)
  const baseCol = color(250, 250, 245);      // inner base
  const minutesgoneCol = color(35, 85, 200); // blue (minutes)
  const secColBall = color(245, 200, 35);    // yellow (moving dot)

  // Clear canvas with background color
  background(bgCol);

  // ===== TIME CALCULATIONS =====

  // TOTAL STORED TIME FOR TODAY (used for clock + legend)
  const totalClockSeconds = Math.floor((data.totalMs || 0) / 1000);
  const totalHr = Math.floor(totalClockSeconds / 3600);
  const totalMn = Math.floor(totalClockSeconds / 60) % 60;
  const totalSc = totalClockSeconds % 60;

  // CURRENT SESSION TIME
  const sessionSeconds = Math.floor((data.sessionMs || 0) / 1000);
  const sessionHr = Math.floor(sessionSeconds / 3600);
  const sessionMn = Math.floor(sessionSeconds / 60) % 60;
  const sessionSc = sessionSeconds % 60;

  // Center of the clock
  const cx = width / 2;
  const cy = 95;

  // ===== CLOCK VISUALIZATION =====

  // --- Seconds (outer red arc) ---
  // Maps seconds (0–59) to a full circle (0–360°)
  push();
  let tsec = map(totalSc, 0, 59, 0, 360);
  stroke(0);
  strokeWeight(2);
  fill(secCol);
  arc(cx, cy, 170, 170, -90, tsec - 90, PIE);
  pop();

  // --- Inner base circle ---
  // Acts as background for minutes layer
  push();
  stroke(0);
  strokeWeight(1.5);
  fill(baseCol);
  ellipse(cx, cy, 125, 125);
  pop();

  // --- Minutes (blue arc) ---
  // Shows progression of minutes within the hour
  let end = map(totalMn, 0, 59, 0, 360);
  push();
  noStroke();
  fill(minutesgoneCol);
  arc(cx, cy, 125, 125, -90, end - 90, PIE);
  pop();

  // --- Moving seconds indicator (yellow dot) ---
  // Rotates around center to emphasize motion of time
  push();
  let angleSec = map(totalSc, 0, 59, 0, 360);
  translate(cx, cy);
  rotate(angleSec);

  // DIFFERENCE blend creates visual contrast effect
  blendMode(DIFFERENCE);
  noStroke();
  fill(secColBall);
  circle(0, -42, 20);

  // Reset blend mode
  blendMode(BLEND);
  pop();

  // --- Hour pointer (rotating rectangle) ---
  // Combines hours + fractional minutes for smooth motion
  let fluidHrPointer = (totalHr % 12) + totalMn / 60;
  let angleHr = map(fluidHrPointer, 0, 12, 0, 360);

  // Color changes depending on time of day
  let fillColor = colorModeChrono(totalHr);

  push();
  translate(cx, cy);
  rotate(angleHr);
  fill(fillColor);
  stroke(0);
  strokeWeight(2);
  rectMode(CENTER);
  rect(0, -68, 8, 28);
  pop();

  // ===== DATE =====
  // Shows today's date above the session message
  push();
  fill(0);
  noStroke();
  textFont(bricolageFont);
  textSize(11);
  textAlign(CENTER, CENTER);
  text(`Youve been here for this long today`, width / 2, 198);
  pop();

 
  push();
  fill(0);
  noStroke();
  textFont(bricolageFont);
  textSize(10);
  textAlign(CENTER, CENTER);


  // ===== LEGEND (TOTAL TIME FOR TODAY) =====
  // Displays hours, minutes, seconds as numeric values + icons
  push();
  textAlign(LEFT, CENTER);

  let baseY = 240;
  let gap = 28;

  // --- Hours ---
  // Icon: vertical rectangle
  fill(30);
  stroke(0);
  strokeWeight(1.5);
  rectMode(CORNER);
  rect(20, baseY - 10, 8, 20, 2);

  // Value
  noStroke();
  fill(0);
  textFont(bricolageFont);
  textSize(18);
  text(String(totalHr).padStart(2, "0"), 38, baseY);

  // --- Minutes ---
  // Icon: semi-circle
  push();
  translate(24, baseY + gap);
  fill(35, 85, 200);
  stroke(0);
  strokeWeight(1.5);
  arc(0, 0, 18, 18, -90, 180, PIE);
  pop();

  // Value
  noStroke();
  fill(0);
  textFont(bricolageFont);
  textSize(18);
  text(String(totalMn).padStart(2, "0"), 38, baseY + gap);

  // --- Seconds ---
  // Icon: arc line
  push();
  translate(24, baseY + gap * 2);
  noFill();
  stroke(220, 40, 40);
  strokeWeight(3);
  arc(0, 0, 18, 18, -90, 90);
  pop();

  // Value
  noStroke();
  fill(0);
  textFont(bricolageFont);
  textSize(18);
  text(String(totalSc).padStart(2, "0"), 38, baseY + gap * 2);

  pop();
}

// Returns a color based on the hour of the day.
// Used to visually encode time-of-day in the hour pointer.
function colorModeChrono(hourValue) {
  if (hourValue < 4) return color(140, 0, 0);      // night
  if (hourValue < 12) return color(35, 85, 200);   // morning
  if (hourValue < 18) return color(245, 200, 35);  // afternoon
  return color(30, 30, 30);                        // evening
}

// Converts milliseconds into a formatted string HH:MM:SS
function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Returns today's date in a short readable format
function getTodayLabel() {
  const today = new Date();
  return today.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}