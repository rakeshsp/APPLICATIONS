@echo off
echo Starting EPOS Extractor...

:: Start Backend
start "EPOS Backend" cmd /c "npm run server"

:: Start Frontend
start "EPOS Frontend" cmd /c "npm run dev"

:: Wait for servers to initialize (approx 5 seconds)
timeout /t 5 /nobreak >nul

:: Open in default browser
start http://localhost:5173

echo App started! You can minimize this window.
