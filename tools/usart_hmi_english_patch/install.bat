@echo off
title USART HMI 1-Click English Patch Installer
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   Meminta Hak Akses Administrator...
echo ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ''%~dp0install.ps1'''"
