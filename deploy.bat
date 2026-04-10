@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

echo ======================================
echo   Enterprise LLM API Platform - Docker Deployment
echo ======================================
echo.

:: Check if Docker is installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Docker not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

:: Check if Docker Compose is installed
where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    docker compose version >nul 2>nul
    if %errorlevel% neq 0 (
        echo Error: Docker Compose not installed.
        pause
        exit /b 1
    )
    set DOCKER_COMPOSE=docker compose
) else (
    set DOCKER_COMPOSE=docker-compose
)

:: Check .env file
if not exist .env (
    echo Warning: .env file not found, using default configuration.
    copy .env.example .env
)

echo Please select an option:
echo 1. Initial deployment
echo 2. Rebuild and deploy
echo 3. Start deployed services
echo 4. Stop services
echo 5. View service status
echo 6. View logs
set /p choice="Enter option (1-6): "

if "!choice!"=="1" goto option1
if "!choice!"=="2" goto option2
if "!choice!"=="3" goto option3
if "!choice!"=="4" goto option4
if "!choice!"=="5" goto option5
if "!choice!"=="6" goto option6

echo Invalid option.
pause
exit /b 1

:option1
echo.
echo Starting initial deployment...
echo.
echo Note: If you encounter network issues pulling Docker images,
echo please configure Docker mirror registry in Docker Desktop settings:
echo   - Go to Settings ^> Docker Engine
echo   - Add registry mirrors, e.g.: https://docker.m.daocloud.io
echo   - Apply ^& Restart Docker
echo.
!DOCKER_COMPOSE! up -d --build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Deployment failed!
    echo Possible causes:
    echo   1. Network connection issue - Cannot pull Docker images
    echo   2. Docker is not running
    echo   3. Insufficient disk space
    echo.
    echo Solution:
    echo   - Configure Docker mirror registry (see above)
    echo   - Ensure Docker Desktop is running
    echo   - Check your internet connection
    echo.
    pause
    exit /b 1
)
echo.
echo Deployment completed!
echo Access URL: http://localhost:8080
echo Default admin account: admin / admin123456
goto end

:option2
echo.
echo Starting rebuild and deployment...
!DOCKER_COMPOSE! down
!DOCKER_COMPOSE! build --no-cache
!DOCKER_COMPOSE! up -d
echo.
echo Rebuild completed!
goto end

:option3
echo.
echo Starting services...
!DOCKER_COMPOSE! up -d
echo Services started.
goto end

:option4
echo.
echo Stopping services...
!DOCKER_COMPOSE! down
echo Services stopped.
goto end

:option5
echo.
echo Service status:
!DOCKER_COMPOSE! ps
goto end

:option6
echo.
echo Viewing logs (Press Ctrl+C to exit):
!DOCKER_COMPOSE! logs -f
goto end

:end
echo.
echo ======================================
echo   Common Commands Reference
echo ======================================
echo View logs: !DOCKER_COMPOSE! logs -f
echo Restart: !DOCKER_COMPOSE! restart
echo Stop: !DOCKER_COMPOSE! down
echo Update: !DOCKER_COMPOSE! pull ^&^& !DOCKER_COMPOSE! up -d
echo ======================================
pause
