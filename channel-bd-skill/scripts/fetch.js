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

async function fetchFromBinance(config) {
  const apiKey = process.env.BINANCE_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  未配置 BINANCE_API_KEY，跳过 Binance API 数据源');
    return [];
  }

  const url = new URL('https://api.binance.com/api/v3/ticker/24hr');

  const res = await fetch(url, {
    headers: { 'X-MBX-APIKEY': apiKey }
  });

  if (!res.ok) throw new Error(`Binance API 错误：${res.status}`);
  const data = await res.json();

  const validSymbols = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE', 'AVAX', 'TRX', 'DOT', 
                        'LINK', 'MATIC', 'UNI', 'ATOM', 'LTC', 'ETC', 'XLM', 'BCH', 'ALGO', 'VET'];

  return data
    .filter(ticker => ticker.symbol.endsWith('USDT'))
    .map(project => {
      const symbol = project.symbol.replace('USDT', '');
      const normalizedSymbol = symbol.toUpperCase();
      return {
        id: `binance-${symbol}`,
        name: symbol,
        symbol: normalizedSymbol,
        slug: symbol.toLowerCase(),
        website: `https://www.binance.com/en/trade/${project.symbol}`,
        market_cap: parseFloat(project.quoteVolume) * 100,
        fdv: parseFloat(project.quoteVolume) * 100,
        price: parseFloat(project.lastPrice),
        volume_24h: parseFloat(project.quoteVolume),
        percent_change_24h: parseFloat(project.priceChangePercent),
        cmc_rank: null,
        tags: [],
        launched: null,
        source: 'binance'
      };
    })
    .filter(p => validSymbols.includes(p.symbol));
}

async function fetchFromCoinCap(config) {
  const url = new URL('https://api.coincap.io/v2/assets');
  url.searchParams.set('limit', config.limit || 100);
  url.searchParams.set('offset', '0');

  const res = await fetch(url);

  if (!res.ok) throw new Error(`CoinCap API 错误：${res.status}`);
  const data = await res.json();

  return data.data.map(project => ({
    id: `coincap-${project.id}`,
    name: project.name,
    symbol: project.symbol,
    slug: project.id,
    website: project.explorer || `https://coincap.io/coin/${project.id}/`,
    market_cap: parseFloat(project.marketCapUsd) || 0,
    fdv: (parseFloat(project.supply) * parseFloat(project.priceUsd)) || 0,
    price: parseFloat(project.priceUsd) || 0,
    volume_24h: parseFloat(project.volumeUsd24Hr) || 0,
    percent_change_24h: parseFloat(project.changePercent24Hr) || 0,
    cmc_rank: parseInt(project.rank) || null,
    tags: [],
    launched: null,
    source: 'coincap'
  }));
}

async function fetch(config) {
  const projects = [];
  const failedSources = [];
  const successSources = [];

  if (config.cmc?.enabled) {
    console.log('📊 从 CMC 获取项目...');
    try {
      const cmcProjects = await fetchFromCMC(config.cmc);
      projects.push(...cmcProjects);
      console.log(`✅ CMC: ${cmcProjects.length} 个项目`);
      successSources.push('cmc');
    } catch (err) {
      console.warn(`⚠️  CMC 数据源失败：${err.message} - 已跳过，继续其他数据源`);
      failedSources.push({ source: 'cmc', error: err.message });
    }
  }

  if (config.coingecko?.enabled) {
    console.log('📊 从 CoinGecko 获取项目...');
    try {
      const cgProjects = await fetchFromCoinGecko(config.coingecko);
      projects.push(...cgProjects);
      console.log(`✅ CoinGecko: ${cgProjects.length} 个项目`);
      successSources.push('coingecko');
    } catch (err) {
      console.warn(`⚠️  CoinGecko 数据源失败：${err.message} - 已跳过，继续其他数据源`);
      failedSources.push({ source: 'coingecko', error: err.message });
    }
  }

  if (config.binance?.enabled) {
    console.log('📊 从 Binance API 获取项目...');
    try {
      const binanceProjects = await fetchFromBinance(config.binance);
      projects.push(...binanceProjects);
      console.log(`✅ Binance API: ${binanceProjects.length} 个项目`);
      successSources.push('binance');
    } catch (err) {
      console.warn(`⚠️  Binance API 数据源失败：${err.message} - 已跳过，继续其他数据源`);
      failedSources.push({ source: 'binance', error: err.message });
    }
  }

  if (config.coincap?.enabled) {
    console.log('📊 从 CoinCap 获取项目...');
    try {
      const coincapProjects = await fetchFromCoinCap(config.coincap);
      projects.push(...coincapProjects);
      console.log(`✅ CoinCap: ${coincapProjects.length} 个项目`);
      successSources.push('coincap');
    } catch (err) {
      console.warn(`⚠️  CoinCap 数据源失败：${err.message} - 已跳过，继续其他数据源`);
      failedSources.push({ source: 'coincap', error: err.message });
    }
  }

  // 记录日志
  if (failedSources.length > 0) {
    console.warn(`\n⚠️  共 ${failedSources.length} 个数据源失败:`);
    failedSources.forEach(f => {
      console.warn(`  - ${f.source}: ${f.error}`);
    });
    console.warn(`✅ 成功数据源：${successSources.join(', ') || '无'}\n`);
  }

  if (projects.length === 0) {
    throw new Error('所有数据源均失败，无法获取项目数据');
  }

  // 去重和交叉验证
  const deduped = crossValidateDataSources(projects);

  return Array.from(deduped.values());
}

function crossValidateDataSources(projects) {
  const projectMap = new Map();
  const projectsBySymbol = new Map();

  projects.forEach(p => {
    const symbol = p.symbol.toUpperCase();
    if (!projectsBySymbol.has(symbol)) {
      projectsBySymbol.set(symbol, []);
    }
    projectsBySymbol.get(symbol).push(p);
  });

  for (const [symbol, sources] of projectsBySymbol.entries()) {
    let bestProject = null;
    let maxScore = 0;

    for (const p of sources) {
      let score = 0;
      
      if (p.market_cap && p.market_cap > 0) score += 40;
      if (p.cmc_rank) score += 30;
      if (p.source === 'cmc' || p.source === 'coingecko') score += 20;
      if (p.volume_24h && p.volume_24h > 0) score += 10;

      if (score > maxScore || !bestProject) {
        maxScore = score;
        bestProject = { ...p };
      }
    }

    if (bestProject) {
      const sources_list = sources.map(s => s.source);
      bestProject.data_sources = sources_list;
      bestProject.cross_validated = sources_list.length > 1;
      
      for (const source of sources) {
        if (source.market_cap && (!bestProject.market_cap || bestProject.market_cap === 0)) {
          bestProject.market_cap = source.market_cap;
        }
        if (source.volume_24h && (!bestProject.volume_24h || bestProject.volume_24h === 0)) {
          bestProject.volume_24h = source.volume_24h;
        }
        if (source.cmc_rank && !bestProject.cmc_rank) {
          bestProject.cmc_rank = source.cmc_rank;
        }
      }

      const key = `${bestProject.name}-${bestProject.symbol}`;
      projectMap.set(key, bestProject);
    }
  }

  return projectMap;
}

async function main() {
  const configPath = process.argv.find((_, i) => process.argv[i - 1] === '--config');
  if (!configPath) {
    console.error('用法：node fetch.js --config ./config/channel-bd.json');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('🚀 Channel BD - 获取项目池\n');

  const startTime = Date.now();
  const projects = await fetch(config.data_sources);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ 共获取 ${projects.length} 个项目 (耗时：${duration}s)`);

  // 保存到缓存
  const cacheDir = path.join(process.cwd(), 'cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const cacheFile = path.join(cacheDir, 'projects.json');
  fs.writeFileSync(cacheFile, JSON.stringify(projects, null, 2));
  console.log(`💾 保存到：${cacheFile}`);

  // 保存执行日志
  const logFile = path.join(cacheDir, 'fetch_log.json');
  const logEntry = {
    timestamp: new Date().toISOString(),
    duration_seconds: parseFloat(duration),
    total_projects: projects.length,
    data_sources_used: Array.from(new Set(projects.flatMap(p => p.data_sources || []))),
    cross_validated_count: projects.filter(p => p.cross_validated).length
  };
  
  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  }
  logs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  console.log(`📝 日志已记录：${logFile}`);

  // 显示前 5 个示例
  console.log('\n前 5 个项目示例:');
  projects.slice(0, 5).forEach(p => {
    const validationMark = p.cross_validated ? '✅' : '⚠️';
    const sources = p.data_sources?.join(',') || 'single';
    console.log(`  ${validationMark} ${p.name} (${p.symbol}): $${p.market_cap.toLocaleString()} [${sources}]`);
  });
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
