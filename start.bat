@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cls

echo ========================================
echo       项目启动脚本
echo ========================================
echo.

REM 第一步：检查并释放端口
echo [步骤 1/2] 检查端口 3200...
set "PORT_FOUND=0"

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3200 ^| findstr LISTENING 2^>nul') do (
    set "PORT_FOUND=1"
    echo.
    echo [发现占用] 端口 3200 被进程 ID: %%a 占用
    echo [释放端口] 正在终止进程...

    taskkill /F /PID %%a >nul 2>&1

    if !errorlevel! equ 0 (
        echo [✓ 成功] 进程已终止
    ) else (
        echo [× 失败] 无法终止进程，请手动检查
    )
)

if %PORT_FOUND% equ 0 (
    echo [✓ 正常] 端口 3200 未被占用
)

echo.
echo [等待] 确保端口完全释放...
timeout /t 2 /nobreak >nul

REM 第二步：启动应用
echo.
echo [步骤 2/2] 启动应用...
echo ========================================
echo.

node src/app.js

REM 如果应用异常退出，暂停以显示错误信息
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo [错误] 应用启动失败，错误代码: %errorlevel%
    echo ========================================
    pause
)
