#!/usr/bin/env node

/**
 * Channel BD - 初始化配置脚本
 * 创建必要的目录和配置文件
 */

const fs = require('fs');
const path = require('path');

const directories = [
  'config',
  'cache',
  'logs',
  'output',
  'templates'
];

const configFiles = {
  'config/channel-bd.json': {
    data_sources: {
      cmc: { enabled: true, api_key: '${CMC_API_KEY}', limit: 100 },
      coingecko: { enabled: true, api_key: '${COINGECKO_API_KEY}' }
    },
    hard_filters: {
      min_market_cap: 1000000,
      max_market_cap: 100000000,
      excluded_tags: ['meme', 'nft'],
      has_website: true,
      has_twitter: true
    },
    scoring_weights: {
      market_cap_rank: 20,
      social_score: 15,
      github_activity: 15,
      team_transparency: 10,
      partnerships: 10,
      recent_milestones: 10,
      website_quality: 10,
      documentation: 10
    },
    bucket_thresholds: { A: 80, B: 50, C: 0 },
    output: { primary: 'google_sheets', backup: 'csv' },
    email: {
      provider: 'smtp',
      dry_run: true,
      rate_limit: { per_hour: 50, per_day: 200 }
    }
  },
  'config/suppression.txt': `# 抑制名单 - 每行一个邮箱或域名
# @domain.com 屏蔽整个域名
# user@example.com 屏蔽单个邮箱
`
};

function init() {
  console.log('🔧 Channel BD - 初始化配置...\n');

  // 创建目录
  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ 创建目录：${dir}`);
    } else {
      console.log(`✓  目录已存在：${dir}`);
    }
  });

  // 创建配置文件
  Object.entries(configFiles).forEach(([file, content]) => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
      console.log(`✅ 创建配置：${file}`);
    } else {
      console.log(`✓  配置已存在：${file}`);
    }
  });

  console.log('\n✨ 初始化完成！');
  console.log('\n下一步：');
  console.log('1. 编辑 config/channel-bd.json 配置筛选条件');
  console.log('2. 复制 config/.env.example 到 .env 并填入 API 密钥');
  console.log('3. 运行：channel-bd run --config ./config/channel-bd.json');
}

init();
