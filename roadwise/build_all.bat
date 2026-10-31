@echo off
title Build RoadWise Platform (C++ & React)
echo =======================================================
echo   1. Compiling C++20 Computation Engine & Server...
echo =======================================================
set "PATH=C:\msys64\ucrt64\bin;%PATH%"
cd /d "%~dp0engine"
if not exist "build" mkdir build
g++ -std=c++20 -O3 -Iinclude src/roadwise_graph.cpp src/roadwise_store.cpp src/http_server.cpp src/cli_app.cpp src/main.cpp -lws2_32 -o build/roadwise_engine.exe
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to compile C++ engine.
    pause
    exit /b %ERRORLEVEL%
)
g++ -std=c++20 -O3 -Iinclude tests/test_graph.cpp src/roadwise_graph.cpp -o build/roadwise_tests.exe
echo [OK] C++ engine and test suite compiled successfully.

echo.
echo =======================================================
echo   2. Building React TypeScript Frontend Bundle...
echo =======================================================
cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to build frontend.
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Frontend bundle built into frontend/dist.
echo.
echo =======================================================
echo   Build complete! Run start_server.bat to launch.
echo =======================================================
pause
