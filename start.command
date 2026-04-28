#!/bin/bash
# Studio Gear Manager — Launcher für macOS
# Doppelklick auf diese Datei startet einen lokalen Mini-Server und öffnet
# die App im Browser. Damit funktioniert "Zum Dock hinzufügen" in Safari
# und "App installieren" in Chrome/Edge.

cd "$(dirname "$0")"

PORT=8732
URL="http://localhost:$PORT/index.html"

# Python-Kommando finden (python3 bevorzugt, sonst python)
if command -v python3 > /dev/null 2>&1; then
  PY="python3"
elif command -v python > /dev/null 2>&1; then
  PY="python"
else
  osascript -e 'display dialog "Python wird benötigt, ist aber nicht installiert.\n\nInstallation:\n• Terminal öffnen und  xcode-select --install  ausführen\n• Oder Python von python.org laden" buttons {"OK"} default button 1 with title "Studio Gear Manager"'
  exit 1
fi

# Browser nach kurzer Verzögerung öffnen
( sleep 1 && open "$URL" ) &

echo "==============================================="
echo " Studio Gear Manager läuft unter:"
echo "   $URL"
echo ""
echo " Server stoppen: dieses Fenster schließen"
echo "                 oder Strg+C drücken."
echo "==============================================="

$PY -m http.server $PORT
