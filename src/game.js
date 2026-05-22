let gameData = {};

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

    // 1. Text aktualisieren
    document.getElementById('story-text').innerText = scene.text;

    // 2. Bild aktualisieren
    const imgElement = document.getElementById('story-image');
    if (scene.image) {
        imgElement.src = scene.image;      // Setzt den Pfad aus der JSON ein (z.B. images/start.gif)
        imgElement.style.display = "block"; // Macht das Bild sichtbar
    } else {
        imgElement.style.display = "none";  // Versteckt das Bild, falls keins angegeben ist
    }

    // 3. Alte Buttons löschen
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    // 4. Neue Buttons für diese Szene erstellen
    scene.options.forEach(option => {
        const button = document.createElement('button');
        button.innerText = option.text;

        // Klick-Event: Lade die nächste Szene
        button.addEventListener('click', () => {
            showScene(option.nextScene);
        });

        optionsContainer.appendChild(button);
    });
}

let startBtn = document.getElementById('btnStartGame');

startBtn.addEventListener('click', () => {
    document.getElementById('btnStartGame').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    showScene("start");
});

loadGameData().then(r => "image");
