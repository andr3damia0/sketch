let numPads = 12;
let pads = [];
let sounds = [];
let images = [];
let cols = 6;
let rows = 2;
let padSize;

let reverb, delay;
let startButton;
let audioStarted = false;
let friction = 0.95;
let bounce = 0.8;

// vídeo de fundo
let bgVideo;

function preload() {
    // Ajuste os caminhos conforme a estrutura do repositório
    for (let i = 0; i < numPads; i++) {
        // ex: /assets/audio/Sound1.wav
        sounds[i] = loadSound(`assets/audio/Sound${i + 1}.wav`);
        // ex: /assets/images/image1.png
        images[i] = loadImage(`assets/images/image${i + 1}.png`);
    }
}

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    rectMode(CORNER);
    imageMode(CENTER);
    noStroke();
    textAlign(CENTER, CENTER);

    // 🚫 Impede gestos padrão (scroll, zoom) em mobile
    canvas.elt.addEventListener(
        "touchstart",
        (e) => e.preventDefault(),
        { passive: false }
    );
    canvas.elt.addEventListener(
        "touchmove",
        (e) => e.preventDefault(),
        { passive: false }
    );
    canvas.elt.addEventListener(
        "touchend",
        (e) => e.preventDefault(),
        { passive: false }
    );

    // cria o vídeo de fundo (sem som)
    bgVideo = createVideo("assets/video/background.mp4");
    bgVideo.hide();           // não mostrar o player nativo
    bgVideo.volume(0);        // sem som
    if (bgVideo.elt) {
        bgVideo.elt.muted = true; // iOS/Safari gostam disso
    }

    padSize = min(width / 8, height / 6);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let i = r * cols + c;
            pads.push({
                x: c * padSize * 1.5 + 60,
                y: r * padSize * 1.5 + 100,
                w: padSize,
                h: padSize,
                active: false,
                dragging: false,
                clicked: false,
                offsetX: 0,
                offsetY: 0,
                vx: 0,
                vy: 0,
                clickTime: 0,
                lastDragTime: 0,
                glow: 0 // intensidade do brilho
            });
        }
    }

    startButton = createButton("🎵 Start Audio");
    startButton.position(width / 2 - 60, height / 2 - 25);
    startButton.size(120, 50);
    startButton.style("font-size", "18px");
    startButton.mousePressed(startAudio);
    startButton.touchStarted(startAudio);

    reverb = new p5.Reverb();
    delay = new p5.Delay();
}

function draw() {
    background(0);

    // desenha o vídeo de fundo sempre (quando estiver carregado)
    if (bgVideo) {
        image(bgVideo, width / 2, height / 2, width, height);
    }

    // overlay leve pra destacar os pads
    fill(0, 140);
    rect(0, 0, width, height);

    if (!audioStarted) {
        fill(255);
        textSize(22);
        text("Tap 🎵 Start Audio to begin", width / 2, height * 0.4);
        return;
    }

    // 🎚️ Controle global dos efeitos pelo movimento médio
    let avgX = 0;
    for (let pad of pads) avgX += pad.x;
    avgX /= pads.length;

    let reverbVal = map(avgX, 0, width, 1, 0);
    let delayVal = map(avgX, 0, width, 0, 1);

    reverb.drywet(reverbVal);
    delay.delayTime(map(delayVal, 0, 1, 0, 0.5));
    delay.feedback(map(delayVal, 0, 1, 0, 0.6));

    // 🧭 Atualiza movimento e brilho
    for (let pad of pads) {
        if (pad.dragging) {
            let targetX = mouseX - pad.offsetX;
            let targetY = mouseY - pad.offsetY;
            targetX = constrain(targetX, 0, width - pad.w);
            targetY = constrain(targetY, 0, height - pad.h);
            pad.vx = targetX - pad.x;
            pad.vy = targetY - pad.y;
            pad.x = targetX;
            pad.y = targetY;
            pad.lastDragTime = millis();
            pad.glow = 255; // brilho máximo durante drag
        } else {
            pad.x += pad.vx;
            pad.y += pad.vy;
            pad.vx *= friction;
            pad.vy *= friction;
            pad.glow = max(0, pad.glow - 10); // brilho desaparece suavemente
        }

        pad.x = constrain(pad.x, 0, width - pad.w);
        pad.y = constrain(pad.y, 0, height - pad.h);

        // Timeout de segurança
        if (pad.dragging && millis() - pad.lastDragTime > 400) {
            pad.dragging = false;
            pad.clicked = false;
        }
    }

    // 💥 Colisões suaves e transferência de movimento
    for (let i = 0; i < pads.length; i++) {
        for (let j = i + 1; j < pads.length; j++) {
            let a = pads[i];
            let b = pads[j];

            let dx = (a.x + a.w / 2) - (b.x + b.w / 2);
            let dy = (a.y + a.h / 2) - (b.y + b.h / 2);
            let distance = sqrt(dx * dx + dy * dy);
            let minDist = (a.w + b.w) / 2;

            if (distance < minDist) {
                let angle = atan2(dy, dx);
                let overlap = (minDist - distance) * 0.5;

                a.x += cos(angle) * overlap;
                a.y += sin(angle) * overlap;
                b.x -= cos(angle) * overlap;
                b.y -= sin(angle) * overlap;

                // Transfere movimento
                let avx = a.vx;
                let avy = a.vy;
                a.vx = b.vx * bounce;
                a.vy = b.vy * bounce;
                b.vx = avx * bounce;
                b.vy = avy * bounce;

                // 💡 Brilho de impacto
                a.glow = 180;
                b.glow = 180;
            }
        }
    }

    // 🖼️ Desenha cada pad com brilho
    for (let i = 0; i < pads.length; i++) {
        let pad = pads[i];

        push();
        // Aplica sombra com intensidade proporcional ao brilho
        drawingContext.shadowBlur = pad.glow * 0.5;
        drawingContext.shadowColor = color(255, 255, 200, pad.glow);

        if (images[i]) {
            image(
                images[i],
                pad.x + pad.w / 2,
                pad.y + pad.h / 2,
                pad.w - 10,
                pad.h - 10
            );
        } else {
            fill(120);
            rect(pad.x + 5, pad.y + 5, pad.w - 10, pad.h - 10, 15);
        }
        pop();

        // Contorno suave quando ativo
        if (pad.active) {
            noFill();
            stroke(255, 200);
            strokeWeight(3);
            rect(pad.x + 3, pad.y + 3, pad.w - 6, pad.h - 6, 15);
            noStroke();
        }
    }

    fill(255);
    textSize(16);
    text(
        "Move pads horizontally to blend Reverb ↔ Delay 🎚️",
        width / 2,
        height - 40
    );
}

function startAudio() {
    userStartAudio();   // necessário para web
    audioStarted = true;
    startButton.hide();

    // inicia o vídeo em loop, sem som, após interação do usuário
    if (bgVideo) {
        bgVideo.loop();
        bgVideo.volume(0);
        if (bgVideo.elt) bgVideo.elt.muted = true;
    }
}

function mousePressed() {
    if (!audioStarted) return;
    for (let pad of pads) {
        if (insidePad(pad, mouseX, mouseY)) {
            pad.active = true;
            pad.clicked = true;
            pad.dragging = false;
            pad.offsetX = mouseX - pad.x;
            pad.offsetY = mouseY - pad.y;
            pad.clickTime = millis();
            break;
        }
    }
}

function mouseDragged() {
    for (let pad of pads) {
        if (pad.clicked) {
            pad.dragging = true;
            pad.clicked = false;
        }

        if (pad.dragging) {
            let newX = mouseX - pad.offsetX;
            let newY = mouseY - pad.offsetY;
            newX = constrain(newX, 0, width - pad.w);
            newY = constrain(newY, 0, height - pad.h);
            pad.vx = newX - pad.x;
            pad.vy = newY - pad.y;
            pad.x = newX;
            pad.y = newY;
            pad.lastDragTime = millis();
            pad.glow = 255;
        }
    }
}

function mouseReleased() {
    for (let pad of pads) {
        if (pad.clicked) {
            let clickDuration = millis() - pad.clickTime;
            if (clickDuration < 200) {
                let i = pads.indexOf(pad);
                if (!sounds[i].isPlaying()) {
                    sounds[i].play();
                    // conecta efeitos
                    sounds[i].disconnect();
                    sounds[i].connect(reverb);
                    reverb.connect(delay);
                    delay.connect();
                }
            }
        }
        pad.active = false;
        pad.dragging = false;
        pad.clicked = false;
    }
}

// mapeia toque para mouse em mobile
function touchStarted() {
    mousePressed();
    return false;
}
function touchMoved() {
    mouseDragged();
    return false;
}
function touchEnded() {
    mouseReleased();
    return false;
}

function insidePad(pad, x, y) {
    return (
        x > pad.x &&
        x < pad.x + pad.w &&
        y > pad.y &&
        y < pad.y + pad.h
    );
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
