# Channel BD 使用说明

## 快速开始（5 分钟上手）

### 第一步：初始化（1 分钟）

```bash
# 进入项目目录
cd channel-bd-skill

# 初始化配置和目录
node scripts/init.js
```

输出示例：
```
🔧 Channel BD - 初始化配置...

✅ 创建目录：config
✅ 创建目录：cache
✅ 创建目录：logs
✅ 创建目录：output
✅ 创建目录：templates
✅ 创建配置：config/channel-bd.json
✅ 创建配置：config/suppression.txt

✨ 初始化完成！

下一步：
1. 编辑 config/channel-bd.json 配置筛选条件
2. 复制 config/.env.example 到 .env 并填入 API 密钥
3. 运行：node scripts/run.js --config ./config/channel-bd.json
```

---

### 第二步：配置 API 密钥（2 分钟）

```bash
# 复制环境变量模板
cp config/.env.example config/.env

# 编辑配置文件
vim config/.env
```

**必填配置**（至少配置一个数据源）：

```bash
# CoinMarketCap API（推荐）
# 获取地址：https://coinmarketcap.com/api/
export CMC_API_KEY="your_cmc_api_key_here"

# CoinGecko API（可选）
# 获取地址：https://www.coingecko.com/api
export COINGECKO_API_KEY="your_coingecko_key_here"

# Binance API（可选）
# 获取地址：https://www.binance.com/en/my/settings/api-management
export BINANCE_API_KEY="your_binance_key_here"
```

**免费 API 说明**：
- CMC：免费版每分钟 33 次调用，足够日常使用
- CoinCap：完全免费，无需 API Key
- CoinGecko：免费版每分钟 10-50 次调用

---

### 第三步：配置筛选条件（1 分钟）

```bash
# 编辑配置文件
vim config/channel-bd.json
```

**推荐首次配置**（保守筛选）：

```json
{
  "data_sources": {
    "cmc": {
      "enabled": true,
      "limit": 100
    },
    "coingecko": { "enabled": false },
    "binance": { "enabled": false },
    "coincap": { "enabled": true }
  },
  "hard_filters": {
    "min_market_cap": 1000000,
    "max_market_cap": 100000000,
    "excluded_tags": ["meme", "nft"],
    "has_website": true,
    "has_twitter": true
  },
  "bucket_thresholds": {
    "A": 70,
    "B": 50,
    "C": 0
  },
  "email": {
    "dry_run": true
  }
}
```

**配置说明**：
- `dry_run: true` - 干跑模式，不实际发送邮件（首次必开）
- `min_market_cap` - 最小市值 100 万美元
- `max_market_cap` - 最大市值 1 亿美元
- `bucket_thresholds.A: 70` - 70 分以上为 A 桶（优先联系）

---

### 第四步：运行完整流程（1 分钟）

```bash
# 运行完整流程（约 2-5 分钟）
node scripts/run.js --config ./config/channel-bd.json
```

**运行输出**：
```
🚀 Channel BD - 批量运行

配置文件：./config/channel-bd.json

==================================================
▶️  执行阶段：fetch
==================================================
🚀 Channel BD - 获取项目池

📊 从 CMC 获取项目...
✅ CMC: 100 个项目

✨ 共获取 100 个项目 (耗时：3.85s)

==================================================
▶️  执行阶段：filter
==================================================
🎯 Channel BD - 筛选和评分

📋 开始筛选 100 个项目...

📊 筛选统计:
  总项目数：100
  通过筛选：99
  被拒绝：1
  分桶分布:
    A 桶 (优先): 15
    B 桶 (草稿): 56
    C 桶 (暂缓): 28

✨ 筛选完成！

...（后续阶段自动执行）

✅ 全部完成！
```

---

### 第五步：查看结果（30 秒）

```bash
# 查看分桶统计
cat cache/buckets.json | jq '. | keys[] as $k | "\($k): \(.[$k] | length)"'

# 查看 A 桶项目（前 5 名）
cat cache/filtered.json | jq '.[] | select(.bucket=="A") | {name, symbol, score}' | head -20

# 查看被拒绝原因
cat cache/rejected.json | jq '.[0].reject_reasons'

# 查看导出的 CSV
cat output/projects.csv | head -10
```

---

## 核心命令详解

### 1. 初始化命令

```bash
# 初始化配置和目录
node scripts/init.js
```

**创建内容**：
- `config/` - 配置文件目录
- `cache/` - 缓存目录
- `logs/` - 日志目录
- `output/` - 输出目录
- `config/channel-bd.json` - 主配置文件
- `config/suppression.txt` - 抑制名单

---

### 2. 获取项目池

```bash
# 从配置的数据源获取项目
node scripts/fetch.js --config ./config/channel-bd.json
```

**输出文件**：
- `cache/projects.json` - 原始项目数据
- `cache/fetch_log.json` - 获取日志

**示例输出**：
```
🚀 Channel BD - 获取项目池

📊 从 CMC 获取项目...
✅ CMC: 100 个项目
📊 从 CoinGecko 获取项目...
⚠️  未配置 COINGECKO_API_KEY，跳过

✨ 共获取 100 个项目 (耗时：3.85s)
💾 保存到：cache/projects.json
```

---

### 3. 筛选评分

```bash
# 执行硬过滤和评分
node scripts/filter.js --config ./config/channel-bd.json
```

**输出文件**：
- `cache/filtered.json` - 通过筛选的项目
- `cache/buckets.json` - 分桶结果（A/B/C）
- `cache/rejected.json` - 被拒绝的项目及原因

**筛选逻辑**：
1. **硬条件过滤** - 不满足条件直接排除
2. **综合评分** - 10 个维度打分
3. **自动分桶** - 按分数分配到 A/B/C 桶

---

### 4. 资料补全

```bash
# 抓取官网、社媒等信息
node scripts/scrape.js --config ./config/channel-bd.json
```

**输出文件**：
- `cache/scraped.json` - 补全后的项目资料

**补全内容**：
- 官网链接
- Twitter 账号
- GitHub 仓库
- 项目描述
- 里程碑信息

---

### 5. 联系方式抽取

```bash
# 提取邮箱、Telegram 等联系方式
node scripts/extract.js --config ./config/channel-bd.json
```

**输出文件**：
- `cache/contacts.json` - 联系方式列表

**抽取内容**：
- 邮箱地址
- Telegram 账号
- 联系表单 URL
- 置信度评分

---

### 6. 导出表单

```bash
# 导出到 CSV/Google Sheets/Airtable
node scripts/export.js --config ./config/channel-bd.json
```

**输出文件**：
- `output/projects.csv` - 项目 CSV
- `output/contacts.csv` - 联系人 CSV

---

### 7. 批量发送

```bash
# 发送 A 桶邮件
node scripts/send.js --bucket A --config ./config/channel-bd.json

# 干跑测试（不实际发送）
node scripts/send.js --bucket A --dry-run --config ./config/channel-bd.json
```

**输出文件**：
- `logs/send_log.json` - 发送日志

---

### 8. 批量运行（推荐）

```bash
# 运行完整流程
node scripts/run.js --config ./config/channel-bd.json

# 仅执行到筛选阶段
node scripts/run.js --config ./config/channel-bd.json --stage filter

# 仅执行特定阶段
node scripts/run.js --config ./config/channel-bd.json --stage scrape
```

**支持的阶段**：
- `fetch` - 获取项目池
- `filter` - 筛选评分
- `scrape` - 资料补全
- `extract` - 联系方式抽取
- `export` - 导出表单

---

### 9. 查看日志

```bash
# 查看 24 小时内的日志
node scripts/logs.js --since 24h

# 查看 7 天内的发送日志
node scripts/logs.js --since 7d --type send
```

---

### 10. 清理缓存

```bash
# 清理所有缓存和输出
rm -rf cache/* output/*

# 或手动清理
rm cache/projects.json cache/filtered.json
```

---

## 配置详解

### 环境变量（config/.env）

```bash
# 数据源 API（至少配置一个）
export CMC_API_KEY="your_key"
export COINGECKO_API_KEY="your_key"
export BINANCE_API_KEY="your_key"

# Google Sheets 输出（可选）
export GOOGLE_SHEET_ID="your_sheet_id"

# SMTP 邮件配置（可选）
export SMTP_HOST="smtp.example.com"
export SMTP_USER="your_email"
export SMTP_PASSWORD="your_password"
export SMTP_FROM="noreply@example.com"

# 运行配置（可选）
export CHANNEL_BD_DRY_RUN="true"      # 干跑模式
export CHANNEL_BD_LOG_LEVEL="info"    # 日志级别
```

---

### 主配置（config/channel-bd.json）

**数据源配置**：
```json
{
  "data_sources": {
    "cmc": {
      "enabled": true,
      "limit": 100
    },
    "coingecko": { "enabled": false },
    "binance": { "enabled": false },
    "coincap": { "enabled": true }
  }
}
```

**硬条件筛选**：
```json
{
  "hard_filters": {
    "min_market_cap": 1000000,
    "max_market_cap": 100000000,
    "min_fdv": 5000000,
    "excluded_tags": ["meme", "nft"],
    "required_tags": ["defi"],
    "min_age_days": 30,
    "has_website": true,
    "has_twitter": true
  }
}
```

**评分权重**：
```json
{
  "scoring_weights": {
    "market_cap_rank": 20,
    "social_score": 15,
    "github_activity": 15,
    "team_transparency": 10,
    "partnerships": 10,
    "recent_milestones": 10,
    "website_quality": 10,
    "documentation": 10
  }
}
```

**分桶阈值**：
```json
{
  "bucket_thresholds": {
    "A": 70,
    "B": 50,
    "C": 0
  }
}
```

**邮件配置**：
```json
{
  "email": {
    "provider": "smtp",
    "dry_run": true,
    "rate_limit": {
      "per_hour": 50,
      "per_day": 200
    }
  }
}
```

---

## 典型工作流

### 工作流 1：保守筛选（高质量）

适合：精细化运营，重点联系少数高质量项目

```bash
# 配置
# - min_market_cap: 1000 万美元
# - max_market_cap: 5 亿美元
# - min_age_days: 90
# - bucket_thresholds.A: 80

# 运行
node scripts/run.js --config ./config/channel-bd.json

# 查看 A 桶
cat cache/filtered.json | jq '.[] | select(.bucket=="A")'

# 导出 CSV（人工复核）
node scripts/export.js --config ./config/channel-bd.json

# 确认后发送邮件
node scripts/send.js --bucket A --config ./config/channel-bd.json
```

---

### 工作流 2：积极筛选（广撒网）

适合：快速覆盖大量项目

```bash
# 配置
# - min_market_cap: 50 万美元
# - excluded_tags: ["meme"]
# - bucket_thresholds.A: 75, B: 45

# 运行完整流程
node scripts/run.js --config ./config/channel-bd.json

# 自动发送 A 桶
node scripts/send.js --bucket A --config ./config/channel-bd.json

# 人工审核 B 桶后发送
node scripts/send.js --bucket B --config ./config/channel-bd.json
```

---

### 工作流 3：分步执行（调试）

适合：调试和测试，每一步都检查结果

```bash
# Day 1: 获取并筛选
node scripts/fetch.js --config ./config/channel-bd.json
cat cache/projects.json | jq 'length'

node scripts/filter.js --config ./config/channel-bd.json
cat cache/buckets.json | jq '.'

# Day 2: 补全资料
node scripts/scrape.js --config ./config/channel-bd.json
cat cache/scraped.json | jq '.[0]'

# Day 3: 抽取联系方式
node scripts/extract.js --config ./config/channel-bd.json
cat cache/contacts.json | jq '.[0]'

# Day 4: 导出并发送
node scripts/export.js --config ./config/channel-bd.json
node scripts/send.js --bucket A --config ./config/channel-bd.json
```

---

### 工作流 4：测试模式

适合：首次运行，不实际发送邮件

```bash
# 确保 dry_run: true
# 编辑 config/channel-bd.json
{
  "email": {
    "dry_run": true
  }
}

# 运行筛选（不发送）
node scripts/run.js --stage filter --config ./config/channel-bd.json

# 查看结果
cat cache/filtered.json | jq '.[0:3]'

# 导出 CSV（人工检查）
node scripts/export.js --config ./config/channel-bd.json
cat output/projects.csv | head -20

# 确认无误后，关闭干跑模式，实际发送
# 编辑 config/channel-bd.json，设置 dry_run: false
node scripts/send.js --bucket A --config ./config/channel-bd.json
```

---

## 输出文件说明

### 缓存文件（cache/）

| 文件 | 说明 | 内容示例 |
|------|------|---------|
| `projects.json` | 原始项目数据 | 100 个项目 |
| `filtered.json` | 筛选后项目 | 99 个项目（含评分） |
| `buckets.json` | 分桶结果 | A:15, B:56, C:28 |
| `scraped.json` | 资料补全 | 官网/社媒链接 |
| `contacts.json` | 联系方式 | 邮箱/TG/表单 |
| `rejected.json` | 被拒绝项目 | 拒绝原因 |
| `fetch_log.json` | 获取日志 | 时间戳/耗时 |

### 输出文件（output/）

| 文件 | 说明 | 格式 |
|------|------|------|
| `projects.csv` | 项目列表 | CSV |
| `contacts.csv` | 联系人列表 | CSV |

### 日志文件（logs/）

| 文件 | 说明 |
|------|------|
| `channel-bd.log` | 完整运行日志 |
| `send_log.json` | 邮件发送记录 |

---

## 常见问题

### Q1: API 限流怎么办？

**错误**：`429 Too Many Requests`

**解决**：
```bash
# 1. 减少获取数量
# 编辑 config/channel-bd.json
{
  "data_sources": {
    "cmc": { "limit": 50 }
  }
}

# 2. 等待 60 秒后重试

# 3. 使用缓存（如果有）
# 检查 cache/projects.json 是否存在
```

---

### Q2: 筛选结果为空？

**原因**：筛选条件太严格

**解决**：
```json
{
  "hard_filters": {
    "min_market_cap": 100000,  // 降低门槛
    "excluded_tags": [],       // 清空排除标签
    "has_twitter": false       // 移除必须条件
  },
  "bucket_thresholds": {
    "A": 60,  // 降低 A 桶阈值
    "B": 40
  }
}
```

---

### Q3: 邮件发送失败？

**错误**：`SMTP authentication failed`

**解决**：
1. 检查 SMTP 凭证
2. 确认启用"允许第三方应用"
3. 使用应用专用密码（如启用 2FA）
4. 测试连接：`telnet smtp.example.com 587`

---

### Q4: 部分数据源失败？

**输出**：`⚠️ CoinGecko 数据源失败：429`

**解决**：
- ✅ 系统会自动跳过失败的数据源
- ✅ 查看 `cache/fetch_log.json` 了解详情
- ✅ 等待限流解除后重新运行

---

### Q5: 如何查看被拒绝原因？

```bash
# 查看所有拒绝原因
cat cache/rejected.json | jq '.[] | {name, reject_reasons}'

# 查看前 5 个
cat cache/rejected.json | jq '.[0:5] | .[] | .reject_reasons'
```

---

## 最佳实践

### 1. 新账号暖发

```json
{
  "email": {
    "dry_run": false,
    "rate_limit": {
      "per_hour": 10,
      "per_day": 30,
      "per_domain": 3
    }
  }
}
```

**发送计划**：
- 第 1 周：每天 30 封
- 第 2 周：每天 50 封
- 第 3 周：每天 100 封
- 第 4 周：每天 200 封

---

### 2. 定期清理缓存

```bash
# 每周清理一次
find cache -name "*.json" -mtime +7 -delete

# 或手动清理
rm -rf cache/projects.json cache/scraped.json
```

---

### 3. 维护抑制名单

编辑 `config/suppression.txt`：

```
# 退订用户
unsubscribe@example.com

# 竞争对手
@competitor-domain.com

# 已 bounce 的邮箱
bounce@example.org
```

---

### 4. 备份配置

```bash
# 备份配置文件
cp config/channel-bd.json config/channel-bd.backup.json
cp config/.env config/.env.backup

# 恢复配置
cp config/channel-bd.backup.json config/channel-bd.json
```

---

### 5. 监控发送成功率

```bash
# 查看发送统计
cat logs/send_log.json | jq 'group_by(.status) | .[] | {status: .[0].status, count: length}'
```

---

## 下一步

1. ✅ **人工复核**: 检查 A 桶项目，确保质量
2. ✅ **发送 B 桶**: 确认 B 桶项目后发送
3. ✅ **跟踪回复**: 监控邮件回复率
4. ✅ **优化配置**: 根据回复率调整筛选条件
5. ✅ **定期运行**: 每周或每月运行一次，发现新项目

---

## 获取帮助

**文档**：
- [SKILL.md](./SKILL.md) - 完整技能文档
- [GUIDE.md](./GUIDE.md) - 详细使用指南
- [QUICKREF.md](./QUICKREF.md) - 快速参考卡

**故障排除**：
- 查看日志：`node scripts/logs.js --since 24h`
- 查看缓存：`ls -lh cache/`
- 测试运行：`node scripts/run.js --dry-run`

---

**祝 BD 工作顺利！🚀**
