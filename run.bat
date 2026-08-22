@echo off
title Steam Keys Valuation Dashboard
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Creando entorno virtual e instalando dependencias...
    python -m venv .venv
    .\.venv\Scripts\pip install -r requirements.txt
)
echo Iniciando aplicacion...
.\.venv\Scripts\python.exe run.py
pause
