@echo off
title RoadWise Unified C++ Server
echo =======================================================
echo   RoadWise — Smart Road Repair Prioritization
echo   Starting Native C++ REST Engine on Port 8000...
echo =======================================================
cd /d "%~dp0engine"
if not exist "build\roadwise_engine.exe" (
    echo [ERROR] roadwise_engine.exe not found! Running build first...
    call "%~dp0build_all.bat"
)
start http://localhost:8000/
C:\msys64\usr\bin\bash.exe -c "./build/roadwise_engine.exe --server 8000"
pause
