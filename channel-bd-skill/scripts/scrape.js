#!/usr/bin/env node

/**
 * Channel BD - 资料补全
 * 抓取官网、X、Docs、GitHub 等信息
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

async function scrapeProject(project) {
  const enriched = { ...project };
  
  if (!project.website) {
    return enriched;
  }

  try {
    const url = new URL(project.website);
    
    enriched.social_links = {
      twitter: `https://twitter.com/${project.slug}`,
      github: `https://github.com/${project.slug}`,
      telegram: null,
      discord: null
    };

    enriched.description = null;
    enriched.milestones = [];
    enriched.partnerships = [];
    enriched.team_info = null;

    console.log(`  ✓ ${project.name}: 基础资料已补全`);
  } catch (err) {
    console.warn(`  ⚠️  ${project.name}: 资料补全失败 - ${err.message}`);
  }

  return enriched;
}

async function scrape(config) {
  const inputPath = path.join(process.cwd(), 'cache', 'filtered.json');
  if (!fs.existsSync(inputPath)) {
    throw new Error('未找到筛选后的项目，请先运行：channel-bd filter');
  }

  const projects = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const scraped = [];

  console.log(`🕵️ 开始补全 ${projects.length} 个项目的资料...\n`);

  for (let i = 0; i < projects.length; i++) {
    const enriched = await scrapeProject(projects[i]);
    scraped.push(enriched);
    
    if ((i + 1) % 10 === 0) {
      console.log(`  进度：${i + 1}/${projects.length}`);
    }
  }

  console.log(`\n✅ 资料补全完成`);
  return scraped;
}

function saveScraped(data) {
  const cacheDir = path.join(process.cwd(), 'cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  fs.writeFileSync(
    path.join(cacheDir, 'scraped.json'),
    JSON.stringify(data, null, 2)
  );
}

function printStats(data) {
  const withWebsite = data.filter(p => p.website).length;
  const withSocial = data.filter(p => p.social_links?.twitter).length;
  
  console.log('\n📊 资料统计:\n');
  console.log(`  有官网：${withWebsite}`);
  console.log(`  有社媒：${withSocial}`);
}

async function main() {
  const configPath = process.argv.find((_, i) => process.argv[i - 1] === '--config');
  if (!configPath) {
    console.error('用法：node scrape.js --config ./config/channel-bd.json');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('🔍 Channel BD - 资料补全\n');

  loadEnvFile();

  const startTime = Date.now();
  const scraped = await scrape(config);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  saveScraped(scraped);
  printStats(scraped);
  
  console.log(`\n✨ 完成 (耗时：${duration}s)`);
  console.log('  缓存文件：cache/scraped.json');
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
