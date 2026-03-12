@echo off
echo.
echo   ====================================
echo    Yassir's Agent World v1.1
echo   ====================================
echo.
echo   Starting bridge server on port 3777...
start "" /b node "%~dp0server.js"
timeout /t 2 /nobreak >nul
echo   Opening pixel world in browser...
start "" "http://localhost:3777"
echo.
echo   Bridge:  http://localhost:3777
echo   API:     http://localhost:3777/api/status
echo.
echo   To report from another CLI:
echo     node bridge/report.js agent-start code-fixer "Fixing a bug"
echo.
echo   Press Ctrl+C to stop the server.
echo.
node "%~dp0server.js"
