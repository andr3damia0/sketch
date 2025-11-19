let numPads = 12;
let pads = [];
let sounds = [];
let cols = 6;
let rows = 2;
let padW, padH;

let reverb, delay;
let reverbSlider, delaySlider;
let reverbLabel, delayLabel;

let startButton;
let audioStarted = false;

// vídeo de fundo
let bgVideo;

function preload() {
    // carrega seus arquivos Sound1.wav ... Sound12.wav dentro de assets/audio
    for (let i = 0; i < numPads; i++) {
        // ex: assets/audio/Sound1.wav
        sounds[i] = loadSound(`assets/audio/Sound${i + 1}.wav`);
    }

    // carrega vídeo (ex: assets/video/background.mp4)
    bgVideo = createVideo("assets/video/background.mp4");
    bgVideo.hide(); // não mostrar o player nativo
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    rectMode(CORNER);
    noStroke();
    textAlign(CENTER, CENTER);

    padW = width / cols;
    padH = (height * 0.5) / rows;

    // cria pads coloridos
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let i = r * cols + c;
            pads.push({
                x: c * padW,
                y: r * padH,
                w: padW,
                h: padH,
                color: color(
                    random(100, 255),
                    random(100, 255),
                    random(100, 255)
                ),
                active: false
            });
        }
    }

    // botão inicial para liberar áudio
    startButton = createButton("🎵 Ativar Som");
    startButton.position(width / 2 - 60, height / 2 - 25);
    startButton.size(120, 50);
    startButton.style("font-size", "18px");
    startButton.mousePressed(startAudio);

    // sliders (escondidos até ativar)
    createSliders();

    // efeitos disponíveis
    reverb = new p5.Reverb();
    delay = new p5.Delay();
}

function draw() {
    background(20);

    if (audioStarted) {
        // desenha o vídeo de fundo ocupando toda a tela
        if (bgVideo) {
            image(bgVideo, 0, 0, width, height);
        }

        // leve overlay para realçar os pads
        fill(0, 150);
        rect(0, 0, width, height);
    }

    if (!audioStarted) {
        fill(255);
        textSize(22);
        text(
            "Toque em 🎵 Ativar Som para começar",
            width / 2,
            height * 0.4
        );
        return;
    }

    // desenha os pads
    for (let i = 0; i < numPads; i++) {
        let pad = pads[i];
        fill(pad.active ? lerpColor(pad.color, color(255), 0.4) : pad.color);
        rect(pad.x + 5, pad.y + 5, pad.w - 10, pad.h - 10, 15);
        fill(0);
        textSize(24);
        text(i + 1, pad.x + pad.w / 2, pad.y + pad.h / 2);
    }

    // atualiza efeitos pelos sliders
    let reverbVal = reverbSlider.value();
    let delayVal = delaySlider.value();

    reverb.drywet(reverbVal);
    delay.delayTime(map(delayVal, 0, 1, 0, 0.5));
    delay.feedback(map(delayVal, 0, 1, 0, 0.6));

    fill(255);
    textSize(16);
    text(
        "Ajuste os efeitos globais abaixo 🎚️",
        width / 2,
        height * 0.7
    );
}

function startAudio() {
    // libera contexto de áudio (necessário em browsers modernos)
    userStartAudio();
    audioStarted = true;
    startButton.hide();
    showSliders();

    // inicia o vídeo apenas após interação do usuário
    if (bgVideo) {
        bgVideo.loop(); // ou bgVideo.play();
        bgVideo.volume(0); // deixa o vídeo mudo, se tiver som
    }
}

function createSliders() {
    let yBase = height * 0.75;
    let w = 150;
    let spacing = 250;

    reverbSlider = createSlider(0, 1, 0, 0.01);
    delaySlider = createSlider(0, 1, 0, 0.01);

    reverbSlider.position(60, yBase);
    delaySlider.position(60 + spacing, yBase);

    reverbLabel = createDiv("🌫️ Reverb");
    delayLabel = createDiv("⏱️ Delay");

    let labels = [reverbLabel, delayLabel];
    let sliders = [reverbSlider, delaySlider];

    for (let i = 0; i < labels.length; i++) {
        labels[i].style("color", "white");
        labels[i].style("font-size", "18px");
        labels[i].position(sliders[i].x + 40, yBase - 30);
        labels[i].hide();
        sliders[i].hide();
    }
}

function showSliders() {
    [reverbSlider, delaySlider].forEach((s) => s.show());
    [reverbLabel, delayLabel].forEach((l) => l.show());
}

// interação mouse
function mousePressed() {
    if (!audioStarted) return;

    for (let i = 0; i < numPads; i++) {
        let pad = pads[i];
        if (insidePad(pad, mouseX, mouseY)) {
            pad.active = true;

            if (sounds[i].isPlaying()) sounds[i].stop();
            sounds[i].play();

            // aplica efeitos aos sons
            sounds[i].disconnect();
            sounds[i].connect(reverb);
            reverb.connect(delay);
            delay.connect();
        }
    }
}

function mouseReleased() {
    pads.forEach((p) => (p.active = false));
}

// suporte a toque em celular / tablet
function touchStarted() {
    mousePressed();
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
