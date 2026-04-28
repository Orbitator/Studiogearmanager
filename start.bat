@echo off
:: Studio Gear Manager — Launcher für Windows
:: Doppelklick auf diese Datei startet einen lokalen Mini-Server und öffnet
:: die App im Browser. Damit funktioniert "App installieren" in Chrome/Edge.

chcp 65001 > nul
cd /d "%~dp0"

set PORT=8732
set URL=http://localhost:%PORT%/index.html

:: Python-Kommando finden
set PYCMD=
where python >nul 2>nul && set PYCMD=python
if not defined PYCMD where python3 >nul 2>nul && set PYCMD=python3
if not defined PYCMD where py >nul 2>nul && set PYCMD=py

if not defined PYCMD (
  echo.
  echo Python wird benoetigt, ist aber nicht installiert.
  echo Bitte Python 3 von https://www.python.org/downloads/ installieren.
  echo Beim Setup die Option "Add Python to PATH" aktivieren.
  echo.
  pause
  exit /b 1
)

:: Browser oeffnen, dann Server starten
start "" "%URL%"

echo ===============================================
echo  Studio Gear Manager laeuft unter:
echo    %URL%
echo.
echo  Server stoppen: dieses Fenster schliessen.
echo ===============================================

%PYCMD% -m http.server %PORT%
