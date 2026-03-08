@echo off
echo Starting GitGreenAdvance Application...

echo.
echo Starting backend server on port 3001...
start "GitGreenAdvance Server" cmd /k "cd /d %~dp0 && npm run server"

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting frontend development server on port 5173...
start "GitGreenAdvance Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Application is starting...
echo.
echo Server: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window..