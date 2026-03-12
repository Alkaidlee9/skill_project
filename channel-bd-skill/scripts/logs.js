#!/usr/bin/env node

/**
 * Channel BD - 查看日志
 * 显示发送日志和执行记录
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPaths = [
    path.join(process.cwd(), 'config/.env'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '../config/.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*export\s+([\w_]+)=['"]?([^'"]*)['"]?\s*$/);
        if (match) {
          process.env[match[1]] = match[2];
        }
      });
      return;
    }
  }
}

function parseTimeAgo(timeStr) {
  const now = Date.now();
  const match = timeStr.match(/^(\d+)(s|m|h|d)?$/);
  if (!match) return 24 * 60 * 60 * 1000;

  const value = parseInt(match[1]);
  const unit = match[2] || 'h';

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return value * 60 * 60 * 1000;
  }
}

function showFetchLogs(since) {
  const logFile = path.join(process.cwd(), 'cache', 'fetch_log.json');
  if (!fs.existsSync(logFile)) {
    console.log('ℹ️  暂无获取日志');
    return;
  }

  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  const cutoff = Date.now() - parseTimeAgo(since);

  const recentLogs = logs.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime >= cutoff;
  });

  if (recentLogs.length === 0) {
    console.log(`ℹ️  过去 ${since} 内无获取记录`);
    return;
  }

  console.log(`📊 获取日志 (过去 ${since}):\n`);
  console.log('┌─────────────────────┬──────────┬────────────┬─────────────────┐');
  console.log('│ 时间                │ 耗时 (s) │ 项目数量   │ 数据源          │');
  console.log('├─────────────────────┼──────────┼────────────┼─────────────────┤');

  recentLogs.forEach(log => {
    const time = new Date(log.timestamp).toLocaleString('zh-CN', { hour12: false });
    const sources = log.data_sources_used?.join(', ') || 'N/A';
    console.log(`│ ${time.padEnd(19)} │ ${String(log.duration_seconds).padEnd(8)} │ ${String(log.total_projects).padEnd(10)} │ ${sources.padEnd(15)} │`);
  });

  console.log('└─────────────────────┴──────────┴────────────┴─────────────────┘');
  console.log(`\n共 ${recentLogs.length} 条记录`);
}

function showSendLogs(since) {
  const logFile = path.join(process.cwd(), 'logs', 'send_log.json');
  if (!fs.existsSync(logFile)) {
    console.log('ℹ️  暂无发送日志');
    return;
  }

  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  const cutoff = Date.now() - parseTimeAgo(since);

  const recentLogs = logs.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime >= cutoff;
  });

  if (recentLogs.length === 0) {
    console.log(`ℹ️  过去 ${since} 内无发送记录`);
    return;
  }

  console.log(`📧 发送日志 (过去 ${since}):\n`);
  console.log('┌─────────────────────┬──────────────┬─────────┬──────────┬────────────┐');
  console.log('│ 时间                │ 项目名称     │ 桶位    │ 状态     │ 邮箱       │');
  console.log('├─────────────────────┼──────────────┼─────────┼──────────┼────────────┤');

  recentLogs.forEach(log => {
    const time = new Date(log.timestamp).toLocaleString('zh-CN', { hour12: false });
    const name = (log.project_name || '').slice(0, 12).padEnd(12);
    const bucket = (log.bucket || 'N/A').padEnd(7);
    const status = (log.status || 'unknown').padEnd(8);
    const email = (log.email || 'N/A').slice(0, 20);
    console.log(`│ ${time.padEnd(19)} │ ${name} │ ${bucket} │ ${status} │ ${email.padEnd(20)} │`);
  });

  console.log('└─────────────────────┴──────────────┴─────────┴──────────┴────────────┘');
  console.log(`\n共 ${recentLogs.length} 条记录`);
}

function showStats() {
  const logFile = path.join(process.cwd(), 'cache', 'fetch_log.json');
  if (!fs.existsSync(logFile)) return;

  const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  if (logs.length === 0) return;

  const totalProjects = logs.reduce((sum, log) => sum + (log.total_projects || 0), 0);
  const avgDuration = (logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / logs.length).toFixed(2);
  const lastRun = logs[logs.length - 1].timestamp;

  console.log('\n📊 统计摘要:');
  console.log(`  总运行次数：${logs.length}`);
  console.log(`  累计获取项目：${totalProjects}`);
  console.log(`  平均耗时：${avgDuration}s`);
  console.log(`  最后运行：${new Date(lastRun).toLocaleString('zh-CN')}`);
}

function main() {
  loadEnvFile();

  const sinceArg = process.argv.find((_, i) => process.argv[i - 1] === '--since');
  const typeArg = process.argv.find((_, i) => process.argv[i - 1] === '--type');
  
  const since = sinceArg || '24h';
  const type = typeArg || 'all';

  console.log('📋 Channel BD - 日志查看\n');

  if (type === 'all' || type === 'fetch') {
    showFetchLogs(since);
    console.log();
  }

  if (type === 'all' || type === 'send') {
    showSendLogs(since);
    console.log();
  }

  showStats();

  const logFile = path.join(process.cwd(), 'logs', 'channel-bd.log');
  if (fs.existsSync(logFile)) {
    console.log(`\n📝 完整日志文件：${logFile}`);
  }
}

main();
