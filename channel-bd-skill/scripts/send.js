#!/usr/bin/env node

/**
 * Channel BD - 发送邮件（占位脚本）
 * 实际实现需要 SMTP 库和队列管理
 */

const fs = require('fs');
const path = require('path');

async function send(config) {
  const bucketArg = process.argv.find((_, i) => process.argv[i - 1] === '--bucket');
  const bucket = bucketArg ? process.argv[process.argv.indexOf('--bucket') + 1] : 'A';

  const bucketsPath = path.join(process.cwd(), 'cache', 'buckets.json');
  if (!fs.existsSync(bucketsPath)) {
    throw new Error('未找到分桶文件，请先运行：channel-bd filter');
  }

  const buckets = JSON.parse(fs.readFileSync(bucketsPath));
  const projects = buckets[bucket] || [];

  if (projects.length === 0) {
    console.log(`ℹ️  ${bucket}桶为空`);
    return;
  }

  console.log(`📧 准备发送 ${bucket}桶，共 ${projects.length} 封邮件\n`);

  if (config.email?.dry_run) {
    console.log('🔒 干跑模式：不会实际发送邮件\n');
    projects.slice(0, 5).forEach(p => {
      console.log(`  将发送给：${p.name} (${p.symbol}) - ${p.score}分`);
    });
    if (projects.length > 5) {
      console.log(`  ... 还有 ${projects.length - 5} 个项目`);
    }
    return;
  }

  console.log('⚠️  实际发送功能需要实现 SMTP 集成');
  console.log('建议：使用 nodemailer 或第三方邮件服务 API');
}

async function main() {
  const configPath = process.argv.find((_, i) => process.argv[i - 1] === '--config');
  if (!configPath) {
    console.error('用法：node send.js --config ./config/channel-bd.json [--bucket A|B|C]');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('📨 Channel BD - 发送邮件\n');

  await send(config);

  console.log('\n✨ 发送完成！');
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
