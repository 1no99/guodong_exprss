#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

const PORT = 3200;

console.log('========================================');
console.log('       项目启动脚本');
console.log('========================================\n');

// 函数：检查并释放端口
function killPort(port) {
  try {
    console.log(`[步骤 1/2] 检查端口 ${port}...`);

    const isWindows = process.platform === 'win32';
    let pid;

    if (isWindows) {
      // Windows 系统
      try {
        const result = execSync(
          `netstat -aon | findstr :${port} | findstr LISTENING`,
          { encoding: 'utf8' }
        );

        if (result.trim()) {
          const match = result.match(/LISTENING\s+(\d+)/);
          if (match) {
            pid = match[1];
          }
        }
      } catch (e) {
        // 端口未被占用
      }
    } else {
      // Linux/Mac 系统
      try {
        const result = execSync(`lsof -i :${port} -t`, { encoding: 'utf8' });
        pid = result.trim();
      } catch (e) {
        // 端口未被占用
      }
    }

    if (pid) {
      console.log(`\n[发现占用] 端口 ${port} 被进程 ID: ${pid} 占用`);
      console.log(`[释放端口] 正在终止进程...`);

      try {
        if (isWindows) {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } else {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        }
        console.log('[✓ 成功] 进程已终止');
      } catch (e) {
        console.log('[× 失败] 无法终止进程，请手动检查');
      }
    } else {
      console.log(`[✓ 正常] 端口 ${port} 未被占用`);
    }

    console.log('\n[等待] 确保端口完全释放...');
    // 等待 2 秒
    const start = Date.now();
    while (Date.now() - start < 2000) {
      // busy wait
    }
  } catch (error) {
    console.log('[错误] 检查端口时出错:', error.message);
  }
}

// 函数：启动应用
function startApp() {
  console.log('\n[步骤 2/2] 启动应用...');
  console.log('========================================\n');

  // 启动 Node.js 应用
  const child = require('child_process').spawn('node', ['src/app.js'], {
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (err) => {
    console.error('\n========================================');
    console.error('[错误] 应用启动失败:', err.message);
    console.error('========================================\n');
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error('\n========================================');
      console.error(`[错误] 应用异常退出，错误代码: ${code}`);
      console.error('========================================\n');
    }
    process.exit(code || 0);
  });
}

// 主函数
async function main() {
  try {
    killPort(PORT);
    startApp();
  } catch (error) {
    console.error('\n[错误] 启动失败:', error.message);
    process.exit(1);
  }
}

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n\n正在停止应用...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n正在停止应用...');
  process.exit(0);
});

main();
