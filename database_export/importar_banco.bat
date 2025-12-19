@echo off
chcp 65001 >nul
echo.
echo ============================================================
echo    IMPORTACAO DO BANCO DE DADOS MONGODB - ERP Emily Kids
echo ============================================================
echo.

REM Verificar se Python está instalado
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Python nao encontrado!
    echo Por favor, instale Python 3.11+ em: https://python.org/downloads
    pause
    exit /b 1
)

REM Verificar/Instalar dependências
echo [INFO] Verificando dependencias...
pip show pymongo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Instalando pymongo...
    pip install pymongo
)

REM Executar importação
echo.
python "%~dp0import_database.py"

echo.
echo Pressione qualquer tecla para sair...
pause >nul
