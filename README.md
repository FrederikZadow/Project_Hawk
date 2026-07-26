# 🦅 Project_Hawk 🦅
Ein interaktives, visuelles Story-Abenteuer (inspiriert von Henry Stickmin). Dabei wird eine
Geschichte erzählt, die sich aus KI-generierten Bildern zusammensetzt und der Nutzer
situationsbedingte Entscheidungen treffen muss, indem er entsprechende Icons anklickt.


## 🌐 Live spielen
Das Spiel ist online verfügbar und kann ohne Installation direkt im Browser getestet werden:
> [Hier klicken](https://hawk.istwunderbar.de)


## 🛠 Technologie-Stack
Das Projekt wurde bewusst ohne verschiedenste Frameworks entwickelt. Es wurden allerdings
folgende Elemente verwendet:
- Benutzeroberfläche: HTML, CSS und JavaScript
- Datenarchitektur: JSON (Hier wird der gesamte Story-Pfad, sowie weitere Hilfsmittel verwaltet)
- Offline-Fähigkeit & PWA: Service Worker im Hintergrund, um Bilder zu laden und zu cachen,
  zusätzlich ein Web App Manifest. Das Laden der Bilder sorgt für eine bequeme Offlinenutzung.
- Datenspeicherung: Um eine Unterbrechung, während dem Spielen zu ermöglichen, verwendet das
  Projekt den **localStorage**, um den Spielstand zu speichern.
- Entwicklungsumgebung: Bun (als lokaler Server getestet)


## 🎮 Steuerung
Das Spiel kann mit Maus-, Touch- und Tastatureingaben gespielt werden.

**Spielmechanik**
- Story-Verlauf: Der Spieler navigiert durch verschiedene Szenen.
- Entscheidungen: An Schlüsselstellen trifft der Nutzer Entscheidungen (über Knöpfe (Icons)).
- Inventar: Auf manchen Pfaden können Items erhalten werden, die automatisch oder manuell
  neue Wege öffnen.
- Fails: Trifft ein Spieler falsche Entscheidungen, zeichnet sich dies durch einen
  "Fail-Screen" aus. Dort kann der Spieler bequem mit einem weiteren Klick zurück zur letzten
  Entscheidung kommen.

**Steuerung**
- Maus / Touch: Das Klicken oder Tippen auf den Bildschirm führt zum nächsten Bild. Klicks
  auf die Icons ermöglichen einen entsprechenden Szenen-Wechsel.
- Tastatur: Die Leertaste ermöglicht einen Bildwechsel. Der Spieler navigiert durch die
  Entscheidungs-Knöpfe indem er die [Tab]-Taste verwendet (zum Fokussieren). Durch das
  Bestätigen mit Leertaste, wird der entsprechende fokussierte Knopf ausgelöst.


## 📱Offline spielen (PWA)
Es ist möglich, das Spiel auch offline zu spielen bzw. als PWA zu installieren.

1. Öffne den obigen Web-Link im Browser
2. Klicke die drei Punkte oben rechts an
3. Klicke auf "Installieren" (oder ähnliches wie "Zum Startbildschirm hinzufügen")

Da der Service-Worker im Hintergrund automatisch alle Story-Pfade, Bilder und Icons in
den Cache des Browsers speichert, kann nun direkt in den Flugmodus gewechselt werden,
falls gewünscht.


## 💻 Lokale Entwicklung
Um das Projekt lokal auszuführen, kann ein lokaler Webserver gestartet werden.

1. Klone oder entpacke das Projektverzeichnis auf das eigene System
2. Öffne ein Terminal im Stammverzeichnis des Projekts
3. Starte einen lokalen Server. Mit Bun zum Beispiel: `bunx serve`
4. Öffne den bereitgestellten lokalen Link (z.B. `http://localhost:3000/src`) in einem
   Browser