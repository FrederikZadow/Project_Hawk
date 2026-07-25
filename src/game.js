let gameData = {};
let currentSceneId = null;
let currentImageIndex = 0;
let optionsVisible = false;
let failOverlayVisible = false;
let inventory = new Set();
let lockedOptions = new Set();

const SAVEGAME_KEY = 'project-hawk-savegame-v1';
const PRELOAD_BATCH_SIZE = 6;
const preloadedAssets = new Set();

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
        updateSavegameButtons();
        preloadInitialAssets();
        cacheAllGameAssets();
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

function getSavegameData() {
    return {
        currentSceneId,
        currentImageIndex,
        optionsVisible,
        failOverlayVisible,
        inventory: Array.from(inventory),
        lockedOptions: Array.from(lockedOptions),
        savedAt: new Date().toISOString()
    };
}

function hasSavegame() {
    return localStorage.getItem(SAVEGAME_KEY) !== null;
}

function saveGameState() {
    if (!currentSceneId) return;

    try {
        localStorage.setItem(SAVEGAME_KEY, JSON.stringify(getSavegameData()));
        updateSavegameButtons();
    } catch (error) {
        console.warn("Spielstand konnte nicht gespeichert werden:", error);
    }
}

function loadGameState() {
    const rawSavegame = localStorage.getItem(SAVEGAME_KEY);

    if (!rawSavegame) return;

    try {
        const savegame = JSON.parse(rawSavegame);

        if (!savegame.currentSceneId || !gameData.scenes?.[savegame.currentSceneId]) {
            clearSavegame();
            return false;
        }

        currentSceneId = savegame.currentSceneId;
        currentImageIndex = Number.isInteger(savegame.currentImageIndex) ? savegame.currentImageIndex : 0;
        optionsVisible = false;
        failOverlayVisible = savegame.failOverlayVisible === true;

        inventory = new Set(savegame.inventory || []);
        lockedOptions = new Set(savegame.lockedOptions || []);

        const startScreen = document.getElementById('start-screen');
        const gameContainer = document.getElementById('game-container');

        startScreen.style.display = 'none';
        gameContainer.style.display = 'flex';

        hideOptions();
        hideFailOverlay();
        showCurrentImage();

        if (savegame.failOverlayVisible) {
            showFailOverlay();
        }

        if (savegame.optionsVisible) {
            const scene = gameData.scenes[currentSceneId];

            if (scene.options && scene.options.length > 0) {
                showOptions(scene.options, currentSceneId);
            }

            if (scene.optionGroups && scene.optionGroups.length > 0) {
                showOptionGroups(scene.optionGroups, currentSceneId);
            }
        }

        saveGameState();
        return true;
    } catch (error) {
        console.warn('Spielstand konnte nicht geladen werden:', error);
        clearSavegame();
        return false;
    }
}

function clearSavegame() {
    localStorage.removeItem(SAVEGAME_KEY);
    updateSavegameButtons();
}

function updateSavegameButtons() {
    const continueButton = document.getElementById('btnContinueGame');
    const clearSaveButton = document.getElementById('btnClearSave');

    if (!continueButton || !clearSaveButton) return;

    const savegameExists = hasSavegame();

    continueButton.disabled = !savegameExists;
    clearSaveButton.disabled = !savegameExists;
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

function getAllGameAssetPaths() {
    const assets = new Set([
        './index.html',
        './main.css',
        './game.js',
        './settings.json',
        './items.json',
        './story.json',
        './manifest.webmanifest',
        '../public/start/icon.png',
        '../public/start/fail.png',
        '../public/start/title_screen.png'
    ]);

    Object.values(gameData.scenes || {}).forEach(scene => {
        getSceneImages(scene).forEach(imagePath => assets.add(imagePath));

        (scene.options || []).forEach(option => {
            if (option.icon) {
                assets.add(getIconPath(option.icon));
            }
        });

        (scene.optionGroups || []).forEach(group => {
            (group.options || []).forEach(option => {
                if (option.icon) {
                    assets.add(getIconPath(option.icon));
                }
            });
        });
    });

    return Array.from(assets);
}

function getScenePreloadAssetPaths(sceneId) {
    const scene = gameData.scenes?.[sceneId];
    if (!scene) return [];

    const assets = new Set(getSceneImages(scene));

    (scene.options || []).forEach(option => {
        if (option.icon) {
            assets.add(getIconPath(option.icon));
        }
    });

    (scene.optionGroups || []).forEach(group => {
        (group.options || []).forEach(option => {
            if (option.icon) {
                assets.add(getIconPath(option.icon));
            }
        });
    });

    if (scene.nextScene && gameData.scenes[scene.nextScene]) {
        getSceneImages(gameData.scenes[scene.nextScene]).forEach(imagePath => assets.add(imagePath));
    }

    if (scene.returnToScene && gameData.scenes[scene.returnToScene]) {
        getSceneImages(gameData.scenes[scene.returnToScene]).forEach(imagePath => assets.add(imagePath));
    }

    if (scene.missingItemScene && gameData.scenes[scene.missingItemScene]) {
        getSceneImages(gameData.scenes[scene.missingItemScene]).forEach(imagePath => assets.add(imagePath));
    }

    return Array.from(assets);
}

function preloadImage(src) {
    if (!src || preloadedAssets.has(src)) {
        return Promise.resolve();
    }

    preloadedAssets.add(src);

    return new Promise(resolve => {
        const image = new Image();

        image.onload = resolve;
        image.onerror = resolve;
        image.src = src;
    });
}

function preloadAssets(assetPaths, batchSize = PRELOAD_BATCH_SIZE) {
    const imageAssets = assetPaths.filter(assetPath => {
        return /\.(png|jpg|jpeg|webp|gif)$/i.test(assetPath);
    });

    let chain = Promise.resolve();

    for (let index = 0; index < imageAssets.length; index += batchSize) {
        const batch = imageAssets.slice(index, index + batchSize);

        chain = chain.then(() => {
            return Promise.all(batch.map(preloadImage));
        });
    }

    return chain;
}

function preloadInitialAssets() {
    const startAssets = getScenePreloadAssetPaths(gameData.startScene || 'start');

    preloadAssets(startAssets, PRELOAD_BATCH_SIZE);
}

function preloadCurrentAndNextSceneAssets() {
    if (!currentSceneId) return;

    const scene = gameData.scenes[currentSceneId];
    const assets = new Set(getScenePreloadAssetPaths(currentSceneId));

    (scene.options || []).forEach(option => {
        if (option.nextScene) {
            getScenePreloadAssetPaths(option.nextScene).forEach(asset => assets.add(asset));
        }

        if (option.returnToScene) {
            getScenePreloadAssetPaths(option.returnToScene).forEach(asset => assets.add(asset));
        }
    });

    (scene.optionCombinations || []).forEach(combination => {
        if (combination.nextScene) {
            getScenePreloadAssetPaths(combination.nextScene).forEach(asset => assets.add(asset));
        }

        if (combination.returnToScene) {
            getScenePreloadAssetPaths(combination.returnToScene).forEach(asset => assets.add(asset));
        }
    });

    preloadAssets(Array.from(assets), PRELOAD_BATCH_SIZE);
}

function cacheAllGameAssets() {
    const assets = getAllGameAssetPaths();

    if('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            if (registration.active) {
                registration.active.postMessage({ type: 'CACHE_ALL_ASSETS', assets });
            }
        });
    }

    preloadAssets(assets, PRELOAD_BATCH_SIZE);
}

function isFailScene(sceneId) {
    return sceneId.includes('fail_');
}

function isEndScene(sceneId) {
    return sceneId.includes('end_');
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
    clearSavegame();

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

    currentSceneId = sceneId;
    currentImageIndex = settings.startAtLastImage && images.length > 0 ? images.length - 1 : 0;
    optionsVisible = false;

    hideOptions();
    hideFailOverlay();
    showCurrentImage();
    saveGameState();
    preloadCurrentAndNextSceneAssets();

    if (settings.showOptionsImmediately && scene.options && scene.options.length > 0) {
        showOptions(scene.options, sceneId);
    }

    if (settings.showOptionsImmediately && scene.optionGroups && scene.optionGroups.length > 0) {
        showOptionGroups(scene.optionGroups, sceneId);
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
    saveGameState();
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
        saveGameState();
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

    if (scene.optionGroups && scene.optionGroups.length > 0) {
        showOptionGroups(scene.optionGroups, currentSceneId);
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

function handleOptionSelection(option) {
    applyOptionEffects(option);
    saveGameState();

    if(option.returnToScene) {
        showScene(option.returnToScene, {
           startAtLastImage: true,
           showOptionsImmediately: true
        });
        return;
    }

    if (!option.nextScene) return;

    showScene(option.nextScene);
}

function createOptionButton(option) {
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

    return button;
}

function showOptions(options, sceneId = currentSceneId) {
    const optionsContainer = document.getElementById('options-container');
    const imgElement = document.getElementById('story-image');

    optionsVisible = true;
    optionsContainer.innerHTML = '';

    imgElement.classList.add('story-image--transparent');

    options.forEach(option => {
        if (isOptionLocked(sceneId, option)) return;

        const button = createOptionButton(option);

        button.addEventListener('click', (event) => {
            event.stopPropagation();
            handleOptionSelection(option);
        });

        optionsContainer.appendChild(button);
    });

    optionsContainer.classList.remove('options-container--dual');
    optionsContainer.style.display = 'flex';
    saveGameState();
    preloadCurrentAndNextSceneAssets();
}

function showOptionGroups(optionGroups, sceneId = currentSceneId) {
    const optionsContainer = document.getElementById('options-container');
    const imgElement = document.getElementById('story-image');
    const selectedOptions = new Map();

    optionsVisible = true;
    optionsContainer.innerHTML = '';

    imgElement.classList.add('story-image--transparent');
    optionsContainer.classList.add('options-container--dual');

    optionGroups.forEach((group, groupIndex) => {
        const groupElement = document.createElement('div');
        groupElement.classList.add('option-group');

        if (group.title) {
            const title = document.createElement('h2');
            title.classList.add('option-group-title');
            title.textContent = group.title;
            groupElement.appendChild(title);
        }

        const choicesElement = document.createElement('div');
        choicesElement.classList.add('option-group-choices');

        group.options.forEach(option => {
            if (isOptionLocked(sceneId, option)) return;

            const button = createOptionButton(option);

            button.addEventListener('click', (event) => {
                event.stopPropagation();

                selectedOptions.set(groupIndex, option);

                choicesElement.querySelectorAll('.option-button').forEach(optionButton => {
                    optionButton.classList.remove('option-button--selected');
                });

                button.classList.add('option-button--selected');
                updateConfirmButtonState();
            });

            choicesElement.appendChild(button);
        });

        groupElement.appendChild(choicesElement);
        optionsContainer.appendChild(groupElement);

        if (groupIndex < optionGroups.length - 1) {
            const divider = document.createElement('div');
            divider.classList.add('option-group-divider');
            optionsContainer.appendChild(divider);
        }
    });

    const confirmButton = document.createElement('button');
    confirmButton.classList.add('option-confirm-button');
    confirmButton.type = 'button';
    confirmButton.textContent = 'Bestätigen';
    confirmButton.disabled = true;

    confirmButton.addEventListener('click', (event) => {
        event.stopPropagation();

        if (selectedOptions.size < optionGroups.length) return;

        const selectedOptionList = Array.from(selectedOptions.values());
        const matchingCombination = findMatchingOptionCombination(optionGroups, selectedOptionList);

        if (!matchingCombination) return;

        handleOptionSelection(matchingCombination);
    });

    optionsContainer.appendChild(confirmButton);

    function updateConfirmButtonState() {
        confirmButton.disabled = selectedOptions.size < optionGroups.length;
    }

    optionsContainer.style.display = 'flex';
    saveGameState();
    preloadCurrentAndNextSceneAssets();
}

function findMatchingOptionCombination(optionGroups, selectedOptions) {
    const combinations = optionGroups.combinations || gameData.scenes[currentSceneId]?.optionCombinations || [];
    const selectedIds = selectedOptions.map(option => option.id);

    const matchingCombination = combinations.find(combination => {
        if (!combination.options || combination.options.length !== selectedIds.length) return false;

        return combination.options.every(optionId => selectedIds.includes(optionId));
    });

    if (matchingCombination) {
        return matchingCombination;
    }

    return selectedOptions.find(option => option.nextScene || option.returnToScene)
}

function hideOptions() {
    const optionsContainer = document.getElementById('options-container');
    const imgElement = document.getElementById('story-image');

    optionsVisible = false;
    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'none';
    optionsContainer.classList.remove('options-container--dual');

    imgElement.classList.remove('story-image--transparent');
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('Service Worker registriert:', registration.scope);
            })
            .catch(error => {
                console.warn('Service Worker konnte nicht registriert werden:', error);
            });
    });
}

const startBtn = document.getElementById('btnStartGame');
const continueBtn = document.getElementById('btnContinueGame');
const clearSaveBtn = document.getElementById('btnClearSave');
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');

startBtn.addEventListener('click', () => {
    resetGameState();
    clearSavegame();

    startScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    showScene(gameData.startScene || "start");
});

continueBtn.addEventListener('click', () => {
    loadGameState();
});

clearSaveBtn.addEventListener('click', () => {
    clearSavegame();
})

gameContainer.addEventListener('click', () => {
    nextImageOrOptions();
});

registerServiceWorker();
loadGameData();