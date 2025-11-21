@echo off
title Servidor Local - 10.124.2.76:8080
echo Iniciando servidor local em http://10.124.2.76:8080
echo Pressione CTRL+C para parar.

REM Inicia servidor Python na porta 8080 usando o IP fixo
python -m http.server 8080 --bind 10.124.2.76

pause
