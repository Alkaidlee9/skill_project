#!/usr/bin/env node

/**
 * Channel BD - 筛选和评分
 * 执行硬过滤条件，计算综合分数，分桶
 */

const fs = require('fs');
const path = require('path');

function applyHardFilters(project, filters) {
  const reasons = [];

  if (filters.min_market_cap && project.market_cap < filters.min_market_cap) {
    reasons.push(`市值过低 ($${(project.market_cap / 1e6).toFixed(1)}M < $${(filters.min_market_cap / 1e6).toFixed(1)}M)`);
  }
  if (filters.max_market_cap && project.market_cap > filters.max_market_cap) {
    reasons.push(`市值过高`);
  }
  if (filters.min_fdv && project.fdv && project.fdv < filters.min_fdv) {
    reasons.push(`FDV 过低`);
  }
  if (filters.max_fdv && project.fdv && project.fdv > filters.max_fdv) {
    reasons.push(`FDV 过高`);
  }
  if (filters.excluded_tags?.some(tag => project.tags?.includes(tag))) {
    reasons.push(`包含排除标签`);
  }
  if (filters.required_tags?.length && !filters.required_tags.some(tag => project.tags?.includes(tag))) {
    reasons.push(`缺少必需标签`);
  }
  if (project.launched && filters.min_age_days) {
    const ageDays = (Date.now() - new Date(project.launched).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < filters.min_age_days) {
      reasons.push(`项目太新 (${Math.floor(ageDays)}天 < ${filters.min_age_days}天)`);
    }
  }

  return reasons;
}

function calculateScore(project, weights) {
  const scores = {};
  let total = 0;
  let maxTotal = 0;

  // 市值排名分 (归一化到 0-100)
  if (weights.market_cap_rank && project.cmc_rank) {
    scores.market_cap_rank = Math.max(0, 100 - project.cmc_rank);
    total += scores.market_cap_rank * (weights.market_cap_rank / 100);
    maxTotal += weights.market_cap_rank;
  }

  // 社交媒体分 (简化：假设有网站/twitter)
  if (weights.social_score) {
    scores.social_score = project.website ? 50 : 0;
    total += scores.social_score * (weights.social_score / 100);
    maxTotal += weights.social_score;
  }

  // GitHub 活跃度 (需要后续抓取)
  if (weights.github_activity) {
    scores.github_activity = 50; // 默认中等
    total += scores.github_activity * (weights.github_activity / 100);
    maxTotal += weights.github_activity;
  }

  // 团队透明度
  if (weights.team_transparency) {
    scores.team_transparency = 50;
    total += scores.team_transparency * (weights.team_transparency / 100);
    maxTotal += weights.team_transparency;
  }

  // 合作伙伴
  if (weights.partnerships) {
    scores.partnerships = project.tags?.length ? 50 : 30;
    total += scores.partnerships * (weights.partnerships / 100);
    maxTotal += weights.partnerships;
  }

  // 近期里程碑
  if (weights.recent_milestones) {
    scores.recent_milestones = 50;
    total += scores.recent_milestones * (weights.recent_milestones / 100);
    maxTotal += weights.recent_milestones;
  }

  // 官网质量
  if (weights.website_quality) {
    scores.website_quality = project.website ? 60 : 0;
    total += scores.website_quality * (weights.website_quality / 100);
    maxTotal += weights.website_quality;
  }

  // 文档完整性
  if (weights.documentation) {
    scores.documentation = 50;
    total += scores.documentation * (weights.documentation / 100);
    maxTotal += weights.documentation;
  }

  // 归一化到 0-100
  const normalized = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return {
    score: Math.round(normalized),
    breakdown: scores,
    explanation: Object.entries(scores)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => `${k}: ${Math.round(v)}`)
      .join(', ')
  };
}

function assignBucket(score, thresholds) {
  if (score >= thresholds.A) return 'A';
  if (score >= thresholds.B) return 'B';
  return 'C';
}

async function filter(config) {
  const inputPath = path.join(process.cwd(), 'cache', 'projects.json');
  if (!fs.existsSync(inputPath)) {
    throw new Error('未找到项目缓存，请先运行：channel-bd fetch');
  }

  const projects = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const filters = config.hard_filters;
  const weights = config.scoring_weights;
  const thresholds = config.bucket_thresholds;

  const results = {
    filtered: [],
    rejected: [],
    buckets: { A: [], B: [], C: [] }
  };

  console.log(`📋 开始筛选 ${projects.length} 个项目...\n`);

  projects.forEach(project => {
    const rejectReasons = applyHardFilters(project, filters);

    if (rejectReasons.length > 0) {
      results.rejected.push({
        ...project,
        reject_reasons: rejectReasons
      });
      return;
    }

    const { score, breakdown, explanation } = calculateScore(project, weights);
    const bucket = assignBucket(score, thresholds);

    const enriched = {
      ...project,
      score,
      score_breakdown: breakdown,
      score_explanation: explanation,
      bucket,
      filtered_at: new Date().toISOString()
    };

    results.filtered.push(enriched);
    results.buckets[bucket].push(enriched);
  });

  return results;
}

function saveResults(results) {
  const cacheDir = path.join(process.cwd(), 'cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  // 保存筛选后的项目
  fs.writeFileSync(
    path.join(cacheDir, 'filtered.json'),
    JSON.stringify(results.filtered, null, 2)
  );

  // 保存分桶结果
  fs.writeFileSync(
    path.join(cacheDir, 'buckets.json'),
    JSON.stringify(results.buckets, null, 2)
  );

  // 保存被拒绝的项目
  fs.writeFileSync(
    path.join(cacheDir, 'rejected.json'),
    JSON.stringify(results.rejected, null, 2)
  );
}

function printStats(results) {
  console.log('\n📊 筛选统计:\n');
  console.log(`  总项目数：${results.filtered.length + results.rejected.length}`);
  console.log(`  通过筛选：${results.filtered.length}`);
  console.log(`  被拒绝：${results.rejected.length}`);
  console.log('\n  分桶分布:');
  console.log(`    A 桶 (优先): ${results.buckets.A.length}`);
  console.log(`    B 桶 (草稿): ${results.buckets.B.length}`);
  console.log(`    C 桶 (暂缓): ${results.buckets.C.length}`);

  if (results.buckets.A.length > 0) {
    console.log('\n  A 桶前 5 名:');
    results.buckets.A
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .forEach(p => {
        console.log(`    ${p.score}分 - ${p.name} (${p.symbol})`);
      });
  }
}

async function main() {
  const configPath = process.argv.find((_, i) => process.argv[i - 1] === '--config');
  if (!configPath) {
    console.error('用法：node filter.js --config ./config/channel-bd.json');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('🎯 Channel BD - 筛选和评分\n');

  const results = await filter(config);
  saveResults(results);
  printStats(results);

  console.log('\n✨ 筛选完成！');
  console.log('  缓存文件：cache/filtered.json');
  console.log('  分桶文件：cache/buckets.json');
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
