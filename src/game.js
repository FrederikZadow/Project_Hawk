let gameData = {};
let currentSceneId = null;
let currentImageIndex = 0;
let optionsVisible = false;

async function loadGameData() {
    try {
        // Holt sich die story.json Datei
        const response = await fetch('story.json');

        if (!response.ok) {
            throw new Error('Fehler beim Laden der JSON-Datei');
        }

        gameData = await response.json();
        console.log("Story-Daten geladen:", gameData);
    } catch (error) {
        console.error("Fehler beim Laden der JSON-Datei:", error);
    }
}

function getScenePath(sceneBase, frameNumber) {
    const scenePath = gameData.assetPaths?.scenes || '';
    const sceneExtension = gameData.defaults?.sceneExtension || 'png';

    return `${scenePath}${sceneBase}_scene${frameNumber}.${sceneExtension}`;
}

function getIconPath(iconName) {
    const iconPath = gameData.assetPaths?.icons || '';
    const iconExtension = gameData.defaults?.iconExtension || 'jpg';

    return `${iconPath}${iconName}.${iconExtension}`;
}

function getSceneImages(scene) {
    if (!scene) return [];

    if (scene.images && scene.images.length > 0) {
        return scene.images;
    }

    if (!scene.sceneBase || !scene.frameCount) return [];

    const images = [];

    for (let frameNumber = 1; frameNumber <= scene.frameCount; frameNumber++) {
        images.push(getScenePath(scene.sceneBase, frameNumber));
    }

    return images;
}

function showScene(sceneId) {
    if(!gameData.scenes) {
        console.error("Story-Daten wurden noch nicht geladen.");
        return;
    }

    const scene = gameData.scenes[sceneId];
    if (!scene) {
        console.error(`Szene "${sceneId}" wurde nicht gefunden.`)
        return;
    }

    currentSceneId = sceneId;
    currentImageIndex = 0;
    optionsVisible = false;

    hideOptions();
    showCurrentImage();
}

function showCurrentImage() {
    const scene = gameData.scenes[currentSceneId];
    if (!scene) return;

    const imgElement = document.getElementById('story-image');
    const storyText = document.getElementById('story-text');
    const images = getSceneImages(scene);

    imgElement.classList.remove('story-image--transparent');

    if(images.length > 0) {
        imgElement.src = images[currentImageIndex];
        imgElement.alt = scene.alt || '';
        imgElement.style.display = 'block';
    } else {
        imgElement.removeAttribute('src');
        imgElement.style.display = 'none';
    }

    storyText.innerHTML = scene.text || '';
}

function nextImageOrOptions() {
    if (optionsVisible) return;

    const scene = gameData.scenes[currentSceneId];
    if (!scene) return;

    const images = getSceneImages(scene);
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
        icon.src = getIconPath(option.icon);
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

            if(!option.nextScene) {
                console.warn('Diese Option hat keine nextScene:', option);
                return;
            }

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