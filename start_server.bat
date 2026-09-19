@echo off
title Translucent Licensing & Admin Server
echo Starting Translucent Authentication and Admin Server...
cd /d "%~dp0\server"
node server.js
pause
