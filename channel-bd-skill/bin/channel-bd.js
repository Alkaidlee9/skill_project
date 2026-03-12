#!/usr/bin/env node

/**
 * Channel BD - CLI 入口点
 * 命令行接口
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const commands = {
  init: {
    script: 'scripts/init.js',
    description: '初始化配置'
  },
  fetch: {
    script: 'scripts/fetch.js',
    description: '从数据源获取项目池'
  },
  filter: {
    script: 'scripts/filter.js',
    description: '筛选评分分桶'
  },
  scrape: {
    script: 'scripts/scrape.js',
    description: '抓取官网和社媒资料'
  },
  extract: {
    script: 'scripts/extract.js',
    description: '抽取联系方式'
  },
  export: {
    script: 'scripts/export.js',
    description: '导出到 Google Sheets/Airtable/CSV'
  },
  send: {
    script: 'scripts/send.js',
    description: '批量发送邮件'
  },
  run: {
    script: 'scripts/run.js',
    description: '运行完整流程'
  },
  logs: {
    script: 'scripts/logs.js',
    description: '查看执行日志'
  },
  clean: {
    script: null,
    description: '清理缓存和输出文件',
    action: () => {
      const cacheDir = path.join(process.cwd(), 'cache');
      const outputDir = path.join(process.cwd(), 'output');
      
      if (fs.existsSync(cacheDir)) {
        fs.readdirSync(cacheDir).forEach(file => {
          if (file !== '.gitkeep') {
            fs.unlinkSync(path.join(cacheDir, file));
          }
        });
        console.log('✅ 已清理 cache/ 目录');
      }
      
      if (fs.existsSync(outputDir)) {
        fs.readdirSync(outputDir).forEach(file => {
          if (file !== '.gitkeep') {
            fs.unlinkSync(path.join(outputDir, file));
          }
        });
        console.log('✅ 已清理 output/ 目录');
      }
    }
  }
};

function showHelp() {
  console.log(`
Channel BD - 加密货币项目渠道拓展自动化

用法：channel-bd <command> [options]

命令:
${Object.entries(commands).map(([cmd, info]) => 
  `  ${cmd.padEnd(10)} ${info.description}`
).join('\n')}

常用选项:
  --config <path>     指定配置文件 (默认：./config/channel-bd.json)
  --stage <stage>     指定运行阶段 (用于 run 命令)
  --bucket <A|B|C>    指定桶位 (用于 send 命令)
  --dry-run           干跑模式 (不实际发送邮件)
  --since <time>      查看日志时间范围 (用于 logs 命令，如：24h, 7d)

示例:
  channel-bd init                                     # 初始化配置
  channel-bd fetch --config ./config/channel-bd.json  # 获取项目池
  channel-bd filter                                   # 筛选评分
  channel-bd run --full                               # 运行完整流程
  channel-bd send --bucket A                          # 发送 A 桶邮件
  channel-bd logs --since 24h                         # 查看 24 小时日志

配置文件:
  首次运行前请确保已创建 config/channel-bd.json 和 config/.env
  可使用 channel-bd init 命令自动创建模板

`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const cmdConfig = commands[command];
  if (!cmdConfig) {
    console.error(`❌ 未知命令：${command}`);
    console.log('运行 channel-bd --help 查看可用命令');
    process.exit(1);
  }

  if (cmdConfig.action) {
    cmdConfig.action();
    return;
  }

  const scriptPath = path.join(__dirname, '..', cmdConfig.script);
  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ 脚本不存在：${scriptPath}`);
    process.exit(1);
  }

  const nodeArgs = args.slice(1).join(' ');
  const cmd = `node ${scriptPath} ${nodeArgs}`;
  
  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (err) {
    process.exit(err.status || 1);
  }
}

main();
