@echo off
echo.
echo =================================================================
echo  Iniciando Servidor HTTP para Painel de Controle (Porta 80/8000)
echo =================================================================
echo.

:: Verifica se o Python esta no PATH
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Python nao encontrado. Certifique-se de que o Python esta instalado e no PATH.
    pause
    exit /b 1
)

:: Executa o script Python
:: No Windows, para usar a porta 80, voce DEVE executar este arquivo .bat como ADMINISTRADOR.
python start_server.py

pause
