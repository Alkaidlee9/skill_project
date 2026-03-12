#!/usr/bin/env node

/**
 * Channel BD - 批量运行
 * 按顺序执行完整流程
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const stages = ['fetch', 'filter', 'scrape', 'extract', 'export'];

async function runStage(stage, configPath) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`▶️  执行阶段：${stage}`);
  console.log('='.repeat(50));

  const scriptPath = path.join(__dirname, `${stage}.js`);
  if (!fs.existsSync(scriptPath)) {
    console.log(`⚠️  跳过阶段：${stage} (脚本不存在)`);
    return;
  }

  execSync(`node ${scriptPath} --config ${configPath}`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
}

async function main() {
  const configArg = process.argv.find((_, i) => process.argv[i - 1] === '--config');
  const stageArg = process.argv.find((_, i) => process.argv[i - 1] === '--stage');

  if (!configArg) {
    console.error('用法：node run.js --config ./config/channel-bd.json [--stage <stage>]');
    process.exit(1);
  }

  const configPath = configArg;
  const targetStage = stageArg ? process.argv[process.argv.indexOf('--stage') + 1] : null;

  console.log('🚀 Channel BD - 批量运行\n');
  console.log(`配置文件：${configPath}`);
  if (targetStage) console.log(`目标阶段：${targetStage}`);

  for (const stage of stages) {
    if (targetStage && stage !== targetStage) continue;
    await runStage(stage, configPath);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ 全部完成！');
  console.log('='.repeat(50));
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
