#!/usr/bin/env node

/**
 * Channel BD - 联系方式抽取
 * 提取邮箱、Telegram、联系表单等
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

function extractEmails(text) {
  if (!text) return [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(text.match(emailRegex) || [])];
}

function extractTelegram(text) {
  if (!text) return null;
  const tgRegex = /(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/|@)([a-zA-Z0-9_]+)/g;
  const matches = [...text.matchAll(tgRegex)];
  return matches.length > 0 ? matches[0][1] : null;
}

function generateContact(project) {
  const contact = {
    contact_id: `contact-${project.id}`,
    project_id: project.id,
    name: null,
    role: null,
    email: null,
    telegram_handle: null,
    telegram_type: 'official',
    contact_form_url: null,
    confidence: 'low',
    needs_review: true,
    evidence_links: [],
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const domain = project.website ? new URL(project.website).hostname : null;
  if (domain) {
    const guessEmail = `bd@${domain}`;
    contact.email = guessEmail;
    contact.evidence_links.push({
      type: 'guessed_email',
      url: `mailto:${guessEmail}`,
      note: '根据域名推测的商务邮箱'
    });
  }

  if (project.social_links?.telegram) {
    contact.telegram_handle = extractTelegram(project.social_links.telegram);
    contact.telegram_type = 'official';
  }

  return contact;
}

async function extract(config) {
  const inputPath = path.join(process.cwd(), 'cache', 'scraped.json');
  if (!fs.existsSync(inputPath)) {
    throw new Error('未找到资料数据，请先运行：channel-bd scrape');
  }

  const projects = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const contacts = [];

  console.log(`📧 开始抽取 ${projects.length} 个项目的联系方式...\n`);

  for (const project of projects) {
    const contact = generateContact(project);
    contacts.push(contact);
    
    if (contact.email || contact.telegram_handle) {
      console.log(`  ✓ ${project.name}: 邮箱=${contact.email || '无'}, TG=${contact.telegram_handle || '无'}`);
    } else {
      console.log(`  ⚠️  ${project.name}: 未找到联系方式`);
    }
  }

  console.log(`\n✅ 联系方式抽取完成`);
  return contacts;
}

function saveContacts(data) {
  const cacheDir = path.join(process.cwd(), 'cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  fs.writeFileSync(
    path.join(cacheDir, 'contacts.json'),
    JSON.stringify(data, null, 2)
  );
}

function printStats(data) {
  const withEmail = data.filter(c => c.email).length;
  const withTelegram = data.filter(c => c.telegram_handle).length;
  const needsReview = data.filter(c => c.needs_review).length;

  console.log('\n📊 联系方式统计:\n');
  console.log(`  有邮箱：${withEmail}`);
  console.log(`  有 Telegram: ${withTelegram}`);
  console.log(`  需要复核：${needsReview}`);
}

async function main() {
  const configPath = process.argv.find((_, i) => process.argv[i - 1] === '--config');
  if (!configPath) {
    console.error('用法：node extract.js --config ./config/channel-bd.json');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('📬 Channel BD - 联系方式抽取\n');

  loadEnvFile();

  const startTime = Date.now();
  const contacts = await extract(config);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  saveContacts(contacts);
  printStats(contacts);
  
  console.log(`\n✨ 完成 (耗时：${duration}s)`);
  console.log('  缓存文件：cache/contacts.json');
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
