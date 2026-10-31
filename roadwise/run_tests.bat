@echo off
title RoadWise C++ Unit Test Suite (25 Tests)
echo =======================================================
echo   Running RoadWise C++ Graph & Optimization Tests...
echo =======================================================
cd /d "%~dp0engine"
C:\msys64\usr\bin\bash.exe -c "./build/roadwise_tests.exe"
pause
