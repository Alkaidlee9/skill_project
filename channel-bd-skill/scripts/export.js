#!/usr/bin/env node

/**
 * Channel BD - 导出表单
 * 导出到 Google Sheets / Airtable / CSV
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
      console.log(`📝 加载环境变量：${envPath}`);
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
  console.warn('⚠️  未找到 .env 文件，请确保环境变量已配置');
}

async function exportToCSV(projects, contacts, config) {
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const projectsFile = path.join(outputDir, 'projects.csv');
  const contactsFile = path.join(outputDir, 'contacts.csv');

  const projectsCSV = [
    ['project_id', 'name', 'symbol', 'website', 'market_cap', 'fdv', 'cmc_rank', 'tags', 'score', 'bucket', 'twitter_url', 'telegram_url', 'github_url', 'description', 'status', 'data_sources', 'cross_validated', 'created_at'].join(','),
    ...projects.map(p => [
      p.id,
      `"${p.name}"`,
      p.symbol,
      p.website || '',
      p.market_cap || 0,
      p.fdv || 0,
      p.cmc_rank || '',
      `"${(p.tags || []).join(';')}"`,
      p.score || '',
      p.bucket || '',
      p.social_links?.twitter || '',
      p.social_links?.telegram || '',
      p.social_links?.github || '',
      `"${(p.description || '').replace(/"/g, '""')}"`,
      'pending',
      `"${(p.data_sources || []).join(';')}"`,
      p.cross_validated || false,
      new Date().toISOString()
    ].join(','))
  ].join('\n');

  const contactsCSV = [
    ['contact_id', 'project_id', 'name', 'role', 'email', 'telegram_handle', 'telegram_type', 'contact_form_url', 'confidence', 'needs_review', 'status', 'created_at'].join(','),
    ...contacts.map(c => [
      c.contact_id,
      c.project_id,
      c.name || '',
      c.role || '',
      c.email || '',
      c.telegram_handle || '',
      c.telegram_type || '',
      c.contact_form_url || '',
      c.confidence || 'low',
      c.needs_review || false,
      c.status || 'pending',
      c.created_at
    ].join(','))
  ].join('\n');

  fs.writeFileSync(projectsFile, projectsCSV);
  fs.writeFileSync(contactsFile, contactsCSV);

  console.log(`📄 导出 CSV 文件:`);
  console.log(`   - ${projectsFile}`);
  console.log(`   - ${contactsFile}`);
}

async function exportToGoogleSheets(projects, contacts, config) {
  console.log('⚠️  Google Sheets 导出需要安装 googleapis 库');
  console.log('运行：bun add googleapis');
  
  const spreadsheetId = config.output?.google_sheets?.spreadsheet_id || process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    console.warn('⚠️  未配置 GOOGLE_SHEET_ID，跳过 Google Sheets 导出');
    return null;
  }

  console.log(`📊 准备导出到 Google Sheets: ${spreadsheetId}`);
  console.log('提示：请安装 googleapis 库以启用此功能');
  
  return spreadsheetId;
}

async function exportToAirtable(projects, contacts, config) {
  console.log('⚠️  Airtable 导出需要安装 @airtable/blocks.js 库');
  console.log('运行：bun add @airtable/blocks.js');
  
  const baseId = config.output?.airtable?.base_id || process.env.AIRTABLE_BASE_ID;
  if (!baseId) {
    console.warn('⚠️  未配置 AIRTABLE_BASE_ID，跳过 Airtable 导出');
    return null;
  }

  console.log(`📊 准备导出到 Airtable: ${baseId}`);
  console.log('提示：请安装 @airtable/blocks.js 库以启用此功能');
  
  return baseId;
}

async function export(config) {
  const filteredPath = path.join(process.cwd(), 'cache', 'filtered.json');
  const contactsPath = path.join(process.cwd(), 'cache', 'contacts.json');

  if (!fs.existsSync(filteredPath)) {
    throw new Error('未找到筛选数据，请先运行：channel-bd filter');
  }

  const projects = JSON.parse(fs.readFileSync(filteredPath, 'utf8'));
  const contacts = fs.existsSync(contactsPath) 
    ? JSON.parse(fs.readFileSync(contactsPath, 'utf8')) 
    : [];

  console.log(`📦 开始导出 ${projects.length} 个项目和 ${contacts.length} 个联系人...\n`);

  const outputConfig = config.output || {};
  const primaryOutput = outputConfig.primary || 'csv';

  switch (primaryOutput) {
    case 'google_sheets':
      await exportToGoogleSheets(projects, contacts, config);
      await exportToCSV(projects, contacts, config);
      break;
    case 'airtable':
      await exportToAirtable(projects, contacts, config);
      await exportToCSV(projects, contacts, config);
      break;
    case 'csv':
    default:
      await exportToCSV(projects, contacts, config);
      break;
  }

  return { projects, contacts };
}

function printStats(projects, contacts) {
  const buckets = { A: 0, B: 0, C: 0 };
  projects.forEach(p => {
    if (buckets[p.bucket] !== undefined) buckets[p.bucket]++;
  });

  const withEmail = contacts.filter(c => c.email).length;
  const withTelegram = contacts.filter(c => c.telegram_handle).length;
  const highConfidence = contacts.filter(c => c.confidence === 'high').length;

  console.log('\n📊 导出统计:\n');
  console.log('项目分布:');
  console.log(`  A 桶 (优先): ${buckets.A}`);
  console.log(`  B 桶 (草稿): ${buckets.B}`);
  console.log(`  C 桶 (暂缓): ${buckets.C}`);
  console.log('\n联系方式:');
  console.log(`  有邮箱：${withEmail}`);
  console.log(`  有 Telegram: ${withTelegram}`);
  console.log(`  高置信度：${highConfidence}`);
}

async function main() {
  const configPath = process.argv.find((_, i) => process.argv[i - 1] === '--config');
  if (!configPath) {
    console.error('用法：node export.js --config ./config/channel-bd.json');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('📤 Channel BD - 导出表单\n');

  loadEnvFile();

  const startTime = Date.now();
  const { projects, contacts } = await export(config);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  printStats(projects, contacts);
  
  console.log(`\n✨ 完成 (耗时：${duration}s)`);
  console.log('  输出目录：output/');
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
