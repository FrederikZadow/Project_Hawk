let gameData = {};
let currentSceneId = null;
let currentImageIndex = 0;
let optionsVisible = false;
let failOverlayVisible = false;
let inventory = new Set();
let lockedOptions = new Set();

async function loadJsonFile(filePath) {
    const response = await fetch(filePath);

    if (!response.ok) {
        throw new Error(`Fehler beim Laden der JSON-Datei: ${filePath}`);
    }

    return response.json();
}

async function loadGameData() {
    try {
        const [settingsData, itemsData, storyData] = await Promise.all([
            loadJsonFile('settings.json'),
            loadJsonFile('items.json'),
            loadJsonFile('story.json')
        ]);

        gameData = {
            ...settingsData,
            items: itemsData,
            scenes: storyData.scenes
        };

        initializeLockedOptions();

        console.log("Spieldaten geladen:", gameData);
    } catch (error) {
        console.error("Fehler beim Laden der Spieldaten:", error);
    }
}

function initializeLockedOptions() {
    lockedOptions.clear();

    Object.entries(gameData.scenes || {}).forEach(([sceneId, scene]) => {
        if (!scene.options || scene.options.length === 0) return;

        scene.options.forEach(option => {
            if (option.locked !== true) return;
            if (!option.id) return;

            lockedOptions.add(getOptionLockKey(sceneId, option.id));
        });
    })
}

function hasItem(itemId) {
    return inventory.has(itemId);
}

function obtainItem(itemId) {
    if (!itemId) return;

    if (!gameData.items || !gameData.items[itemId]) {
        console.warn(`Das Item "${itemId}" wurde nicht gefunden.`);
    }

    if (inventory.has(itemId)) return;

    inventory.add(itemId);
    console.log(`Item erhalten:" ${itemId}`, Array.from(inventory));
}

function removeItem(itemId) {
    if (!itemId) return;

    if (!gameData.items || !gameData.items[itemId]) {
        console.warn(`Das Item "${itemId}" wurde nicht gefunden.`);
    }

    if (!inventory.has(itemId)) return;

    inventory.delete(itemId);
    console.log(`Item entfernt: ${itemId}`, Array.from(inventory));
}

function getOptionLockKey(sceneId, optionId) {
    return `${sceneId}:${optionId}`;
}

function isOptionLocked(sceneId, option) {
    if (!option.id) return false;

    return lockedOptions.has(getOptionLockKey(sceneId, option.id));
}

function lockOption(target) {
    if (!target || !target.scene || !target.option) return;

    lockedOptions.add(getOptionLockKey(target.scene, target.option));
}

function unlockOption(target) {
    if (!target || !target.scene || !target.option) return;

    lockedOptions.delete(getOptionLockKey(target.scene, target.option));
}

function applyOptionEffects(option) {
    if (option.obtainItem) {
        obtainItem(option.obtainItem);
    }

    if (option.removeItem) {
        removeItem(option.removeItem);
    }

    if (option.lockOption) {
        lockOption(option.lockOption);
    }

    if (option.lockOptions && option.lockOptions.length > 0) {
        option.lockOptions.forEach(lockOption);
    }

    if (option.unlockOption) {
        unlockOption(option.unlockOption);
    }

    if (option.unlockOptions && option.unlockOptions.length > 0) {
        option.unlockOptions.forEach(unlockOption);
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

function isFailScene(sceneId) {
    return sceneId.includes('_fail_') || sceneId.includes('fail_');
}

function isEndScene(sceneId) {
    return sceneId.includes('_end_') || sceneId.includes('end_');
}

function resetGameState() {
    currentSceneId = null;
    currentImageIndex = 0;
    optionsVisible = false;
    failOverlayVisible = false;

    inventory.clear();
    initializeLockedOptions();
}

function showStartScreen() {
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const imgElement = document.getElementById('story-image');
    const storyText = document.getElementById('story-text');

    resetGameState();

    hideOptions();
    hideFailOverlay();

    imgElement.removeAttribute('src');
    imgElement.style.display = 'none';
    storyText.innerHTML = '';

    gameContainer.style.display = 'none';
    startScreen.style.display = 'flex';
}

function showFailOverlay() {
    const failOverlay = document.getElementById('fail-overlay');
    const imgElement = document.getElementById('story-image');

    failOverlayVisible = true;
    failOverlay.style.display = 'block';
    imgElement.classList.add('story-image--transparent');
}

function hideFailOverlay() {
    const failOverlay = document.getElementById('fail-overlay');
    const imgElement = document.getElementById('story-image');

    failOverlayVisible = false;
    failOverlay.style.display = 'none';
    imgElement.classList.remove('story-image--transparent');
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

function showScene(sceneId, settings = {}) {
    if(!gameData.scenes) {
        console.error("Story-Daten wurden noch nicht geladen.");
        return;
    }

    const scene = gameData.scenes[sceneId];
    if (!scene) {
        console.error(`Szene "${sceneId}" wurde nicht gefunden.`)
        return;
    }

    const images = getSceneImages(scene);

    console.log("Show scene:", {
        sceneId,
        scene,
        images,
        settings
    });

    currentSceneId = sceneId;
    currentImageIndex = settings.startAtLastImage && images.length > 0 ? images.length - 1 : 0;
    optionsVisible = false;

    hideOptions();
    hideFailOverlay();
    showCurrentImage();

    if(settings.showOptionsImmediately && scene.options && scene.options.length > 0) {
        showOptions(scene.options, sceneId);
    }
}

function showCurrentImage() {
    const scene = gameData.scenes[currentSceneId];
    if (!scene) return;

    const imgElement = document.getElementById('story-image');
    const storyText = document.getElementById('story-text');
    const images = getSceneImages(scene);
    const currentImage = images[currentImageIndex];

    imgElement.classList.remove('story-image--transparent');

    if(currentImage) {
        imgElement.src = currentImage;
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

    if (failOverlayVisible) {
       if (scene.returnToScene) {
           showScene(scene.returnToScene, {
              startAtLastImage: true,
           });
       }

       return;
    }

    const images = getSceneImages(scene);
    const isLastImage = currentImageIndex >= images.length - 1;

    if (!isLastImage) {
        currentImageIndex++;
        showCurrentImage();
        return;
    }

    if(isFailScene(currentSceneId) && scene.returnToScene) {
        showFailOverlay();
        return;
    }

    if (isEndScene(currentSceneId)) {
        showStartScreen();
        return;
    }

    if (scene.hasItem && !hasItem(scene.hasItem)) {
        if (scene.missingItemScene) {
            showScene(scene.missingItemScene);
        } else {
            console.warn(`Für Szene "${currentSceneId}" fehlt das Item "${scene.hasItem}".`)
        }

        return;
    }

    if (scene.obtainItem) {
        obtainItem(scene.obtainItem);
    }

    if (scene.removeItem) {
        removeItem(scene.removeItem);
    }

    if (scene.options && scene.options.length > 0) {
        showOptions(scene.options, currentSceneId);
        return;
    }

    if (scene.returnToScene) {
        showScene(scene.returnToScene, {
           startAtLastImage: true,
           showOptionsImmediately: true
        });
        return;
    }

    if (scene.nextScene) {
        showScene(scene.nextScene);
    }
}

function showOptions(options, sceneId = currentSceneId) {
    const optionsContainer = document.getElementById('options-container');
    const imgElement = document.getElementById('story-image');

    optionsVisible = true;
    optionsContainer.innerHTML = '';

    imgElement.classList.add('story-image--transparent');

    options.forEach(option => {
        if (isOptionLocked(sceneId, option)) return;

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

            applyOptionEffects(option);

            if (option.returnToScene) {
                showScene(option.returnToScene, {
                   startAtLastImage: true,
                   showOptionsImmediately: true
                });
                return;
            }

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
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');

startBtn.addEventListener('click', () => {
    resetGameState();

    startScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    showScene(gameData.startScene || "start");
});

gameContainer.addEventListener('click', () => {
    nextImageOrOptions();
});

loadGameData();