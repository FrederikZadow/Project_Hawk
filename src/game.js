let gameData = {};
let currentSceneId = null;
let currentImageIndex = 0;

async function loadGameData() {
    try {
        // Holt sich die story.json Datei
        const response = await fetch('story.json');
        gameData = await response.json();

    } catch (error) {
        console.error("Fehler beim Laden der JSON-Datei:", error);
    }
}

function showScene(sceneId) {
    const scene = gameData.scenes[sceneId];
    if (!scene) return;

    currentSceneId = sceneId;
    currentImageIndex = 0;

    hideOptions();
    showCurrentImage();
}

function showCurrentImage() {
    const scene = gameData.scenes[currentSceneId];
    if (!scene) return;

    const imgElement = document.getElementById('story-image');
    const images = scene.images || [];

    if(images.length > 0) {
        imgElement.src = images[currentImageIndex];
        imgElement.style.display = 'block';
    } else {
        imgElement.style.display = 'none';
    }

    const storyText = document.getElementById('story-text');
    storyText.innerHTML = scene.text || '';
}

function nextImageOrOptions() {
    const scene = gameData.scenes[currentSceneId];
    if (!scene) return;

    const images = scene.images || [];
    const isLastImage = currentImageIndex >= images.length - 1;

    if (!isLastImage) {
        currentImageIndex++;
        showCurrentImage();
        return;
    }

    if (scene.options && scene.options.length > 0) {
        showOptions(scene.options);
    }
}

function showOptions(options) {
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    options.forEach(option => {
        const button = document.createElement('button');
        button.classList.add('btn')
        button.addEventListener('click', () => {
            event.stopPropagation();
            showScene(option.nextScene);
        });

        optionsContainer.appendChild(button);
    });

    optionsContainer.style.display = 'flex';
}

function hideOptions() {
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'none';
}

const startBtn = document.getElementById('btnStartGame');
const gameContainer = document.getElementById('game-container');

startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    gameContainer.style.display = 'flex';
    showScene("start");
});

gameContainer.addEventListener('click', () => {
    nextImageOrOptions();
});

loadGameData();