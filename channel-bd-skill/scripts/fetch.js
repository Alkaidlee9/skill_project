#!/usr/bin/env node

/**
 * Channel BD - 获取项目池
 * 从 CMC/CoinGecko 等数据源获取项目列表
 */

const fs = require('fs');
const path = require('path');

async function fetchFromCMC(config) {
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  未配置 CMC_API_KEY，跳过 CMC 数据源');
    return [];
  }

  const url = new URL('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest');
  url.searchParams.set('limit', config.limit || 100);
  url.searchParams.set('convert', 'USD');

  const res = await fetch(url, {
    headers: { 'X-CMC_PRO_API_KEY': apiKey }
  });

  if (!res.ok) throw new Error(`CMC API 错误：${res.status}`);
  const data = await res.json();

  return data.data.map(project => ({
    id: `cmc-${project.id}`,
    name: project.name,
    symbol: project.symbol,
    slug: project.slug,
    website: `https://coinmarketcap.com/currencies/${project.slug}/`,
    market_cap: project.quote.USD.market_cap,
    fdv: project.quote.USD.fully_diluted_market_cap,
    price: project.quote.USD.price,
    volume_24h: project.quote.USD.volume_24h,
    percent_change_24h: project.quote.USD.percent_change_24h,
    cmc_rank: project.cmc_rank,
    tags: project.tags || [],
    launched: project.date_launched,
    source: 'cmc'
  }));
}

async function fetchFromCoinGecko(config) {
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  未配置 COINGECKO_API_KEY，跳过 CoinGecko 数据源');
    return [];
  }

  const url = new URL('https://pro-api.coingecko.com/api/v3/coins/markets');
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('order', 'market_cap_desc');
  url.searchParams.set('per_page', config.per_page || 100);
  url.searchParams.set('sparkline', 'false');

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (!res.ok) throw new Error(`CoinGecko API 错误：${res.status}`);
  const data = await res.json();

  return data.map(project => ({
    id: `cg-${project.id}`,
    name: project.name,
    symbol: project.symbol.toUpperCase(),
    slug: project.id,
    website: `https://www.coingecko.com/en/coins/${project.id}`,
    market_cap: project.market_cap,
    fdv: project.fully_diluted_valuation,
    price: project.current_price,
    volume_24h: project.total_volume,
    percent_change_24h: project.price_change_percentage_24h,
    cmc_rank: project.market_cap_rank,
    tags: [],
    launched: null,
    source: 'coingecko'
  }));
}

async function fetch(config) {
  const projects = [];

  if (config.cmc?.enabled) {
    console.log('📊 从 CMC 获取项目...');
    const cmcProjects = await fetchFromCMC(config.cmc);
    projects.push(...cmcProjects);
    console.log(`✅ CMC: ${cmcProjects.length} 个项目`);
  }

  if (config.coingecko?.enabled) {
    console.log('📊 从 CoinGecko 获取项目...');
    const cgProjects = await fetchFromCoinGecko(config.coingecko);
    projects.push(...cgProjects);
    console.log(`✅ CoinGecko: ${cgProjects.length} 个项目`);
  }

  // 去重（按名称 + 符号）
  const deduped = new Map();
  projects.forEach(p => {
    const key = `${p.name}-${p.symbol}`;
    if (!deduped.has(key) || p.market_cap > deduped.get(key).market_cap) {
      deduped.set(key, p);
    }
  });

  return Array.from(deduped.values());
}

async function main() {
  const configPath = process.argv.find((_, i) => process.argv[i - 1] === '--config');
  if (!configPath) {
    console.error('用法：node fetch.js --config ./config/channel-bd.json');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('🚀 Channel BD - 获取项目池\n');

  const projects = await fetch(config.data_sources);
  console.log(`\n✨ 共获取 ${projects.length} 个项目`);

  // 保存到缓存
  const cacheDir = path.join(process.cwd(), 'cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const cacheFile = path.join(cacheDir, 'projects.json');
  fs.writeFileSync(cacheFile, JSON.stringify(projects, null, 2));
  console.log(`💾 保存到：${cacheFile}`);

  // 显示前 5 个示例
  console.log('\n前 5 个项目示例:');
  projects.slice(0, 5).forEach(p => {
    console.log(`  - ${p.name} (${p.symbol}): $${p.market_cap.toLocaleString()}`);
  });
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
