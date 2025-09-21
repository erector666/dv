@echo off
REM Hugging Face CLI Wrapper
REM This batch file provides easy access to the Hugging Face CLI

set PYTHON_SCRIPTS=C:\Users\kango\AppData\Local\Programs\Python\Python312\Scripts
set PATH=%PATH%;%PYTHON_SCRIPTS%

if "%1"=="" (
    echo 🤗 Hugging Face CLI
    echo ==================
    echo.
    echo Usage: hf.bat [command] [options]
    echo.
    echo Common commands:
    echo   hf.bat login          - Log in to Hugging Face
    echo   hf.bat whoami         - Check current user
    echo   hf.bat download       - Download models/datasets
    echo   hf.bat upload         - Upload files to Hub
    echo   hf.bat repo create    - Create a new repository
    echo   hf.bat env            - Show environment info
    echo.
    echo For help with a specific command: hf.bat [command] --help
    goto :eof
)

hf %*



