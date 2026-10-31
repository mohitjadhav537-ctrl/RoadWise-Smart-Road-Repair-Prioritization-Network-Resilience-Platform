@echo off
title RoadWise C++ Interactive Terminal Console
cd /d "%~dp0engine"
C:\msys64\usr\bin\bash.exe -c "./build/roadwise_engine.exe --cli"
pause
