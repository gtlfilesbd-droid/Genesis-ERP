@echo off
echo ========================================
echo Cursor Workspace Fix - Automated Script
echo ========================================
echo.

echo Step 1: Closing Cursor processes...
taskkill /F /IM "Cursor.exe" >nul 2>&1
timeout /t 2 >nul
echo Done.
echo.

echo Step 2: Clearing Cursor cache...
if exist "%APPDATA%\Cursor\Cache" (
    rmdir /S /Q "%APPDATA%\Cursor\Cache"
    echo Cache cleared.
) else (
    echo Cache folder not found.
)
echo.

echo Step 3: Checking server status...
netstat -ano | findstr ":3001" >nul
if %errorlevel% equ 0 (
    echo Server is running on port 3001.
) else (
    echo Server is NOT running on port 3001.
    echo.
    echo Starting server...
    start "Genesis ERP Server" cmd /k "cd /d %~dp0 && npm start"
    timeout /t 3 >nul
)
echo.

echo ========================================
echo Fix Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Open Cursor IDE
echo 2. Go to File -^> Open Folder
echo 3. Select this folder: %~dp0
echo.
echo OR double-click genesis-erp.code-workspace
echo.
echo Press any key to open the workspace file location...
pause >nul
explorer.exe "%~dp0"
echo.
echo Opening workspace file location...
timeout /t 2 >nul

