let gameData = {};
let currentSceneId = null;
let currentImageIndex = 0;
let optionsVisible = false;

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

    imgElement.classList.remove('story-image--transparent');

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
    const imgElement = document.getElementById('story-image');

    optionsVisible = true;
    optionsContainer.innerHTML = '';

    imgElement.classList.add('story-image--transparent');

    options.forEach(option => {
        const button = document.createElement('button');
        button.classList.add('option-button');
        button.type = 'button';
        button.title = option.text || '';

        const icon = document.createElement('img');
        icon.classList.add('option-icon');
        icon.src = option.icon;
        icon.alt = option.alt || option.text || 'Option';

        button.appendChild(icon);

        if (option.text) {
           const label = document.createElement('span');
           label.classList.add('option-label');
           label.textContent = option.text;
           button.appendChild(label);
        }

        button.addEventListener('click', (event) => {
            event.stopPropagation();
            showScene(option.nextScene);
        });

        optionsContainer.appendChild(button);
    });

    optionsContainer.style.display = 'flex';
}

function hideOptions() {
    const optionsContainer = document.getElementById('options-container');
    const imgElement = document.getElementById('story-image');

    optionsVisible = false;
    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'none';

    imgElement.classList.remove('story-image--transparent');
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