# Channel BD 完整使用指南

## 第一次使用

### 步骤 1: 初始化

```bash
cd channel-bd-skill

# 初始化配置和目录结构
node scripts/init.js
```

这会创建：
- `config/` - 配置文件目录
- `cache/` - 缓存目录
- `logs/` - 日志目录
- `output/` - 输出目录
- `templates/` - 邮件模板目录

### 步骤 2: 配置 API 密钥

复制环境变量模板：

```bash
cp config/.env.example config/.env
```

编辑 `config/.env`：

```bash
# 必填：数据源 API（至少配置一个）
export CMC_API_KEY="your_cmc_api_key_here"
export COINGECKO_API_KEY="your_coingecko_api_key_here"
export BINANCE_API_KEY="your_binance_api_key_here"

# 可选：Google Sheets 输出
export GOOGLE_SHEET_ID="your_sheet_id_here"

# 可选：SMTP 邮件配置
export SMTP_HOST="smtp.example.com"
export SMTP_USER="your_email@example.com"
export SMTP_PASSWORD="your_password"
export SMTP_FROM="partnerships@example.com"
```

**获取 API Key**：
- CMC: https://coinmarketcap.com/api/
- CoinGecko: https://www.coingecko.com/api
- Binance: https://www.binance.com/en/my/settings/api-management

### 步骤 3: 配置筛选条件

复制配置模板：

```bash
cp config/channel-bd.example.json config/channel-bd.json
```

编辑 `config/channel-bd.json`，调整关键配置：

```json
{
  "hard_filters": {
    "min_market_cap": 1000000,
    "max_market_cap": 100000000,
    "excluded_tags": ["meme", "nft"],
    "has_website": true,
    "has_twitter": true
  },
  "bucket_thresholds": {
    "A": 80,
    "B": 50,
    "C": 0
  },
  "email": {
    "dry_run": true
  }
}
```

**重要**：首次运行请设置 `"dry_run": true` 进行测试。

### 步骤 4: 运行完整流程

```bash
# 运行完整流程（筛选 → 抓取 → 导出 → 发送）
node scripts/run.js --config ./config/channel-bd.json
```

运行时间：约 2-5 分钟（取决于项目数量）

### 步骤 5: 查看结果

```bash
# 查看分桶统计
cat cache/buckets.json | jq '. | keys[] as $k | "\($k): \(.[$k] | length)"'

# 查看 A 桶项目
cat cache/filtered.json | jq '.[] | select(.bucket=="A") | {name, symbol, score, market_cap}'

# 查看被拒绝原因
cat cache/rejected.json | jq '.[0:5] | .[] | {name, reject_reasons}'
```

## 典型工作流

### 工作流 1: 保守筛选（高质量项目）

适合：精细化运营，重点联系少数高质量项目

```bash
# 1. 编辑配置，设置严格的筛选条件
# min_market_cap: 1000 万 USD
# max_market_cap: 5 亿 USD
# min_age_days: 90
# has_website: true, has_twitter: true

# 2. 运行筛选
node scripts/run.js --config ./config/channel-bd.json

# 3. 查看 A 桶项目
cat cache/filtered.json | jq '.[] | select(.bucket=="A")'

# 4. 导出表单（人工复核）
node scripts/export.js --config ./config/channel-bd.json

# 5. 人工复核 A 桶项目，然后发送邮件
node scripts/send.js --bucket A --config ./config/channel-bd.json
```

### 工作流 2: 积极筛选（广撒网）

适合：快速覆盖大量项目

```bash
# 1. 编辑配置，设置宽松的筛选条件
# min_market_cap: 50 万 USD
# max_market_cap: 2 亿 USD
# excluded_tags: ["meme"]
# bucket_thresholds: A=75, B=45

# 2. 运行完整流程
node scripts/run.js --config ./config/channel-bd.json

# 3. 自动发送 A 桶邮件
node scripts/send.js --bucket A --config ./config/channel-bd.json

# 4. 人工审核 B 桶，确认后发送
node scripts/send.js --bucket B --confirm --config ./config/channel-bd.json
```

### 工作流 3: 分步执行（推荐）

适合：调试和测试，每一步都检查结果

```bash
# 第 1 天：获取并筛选
node scripts/fetch.js --config ./config/channel-bd.json
cat cache/projects.json | jq 'length'  # 查看获取数量

node scripts/filter.js --config ./config/channel-bd.json
cat cache/buckets.json | jq '. | keys[] as $k | "\($k): \(.[$k] | length)"'

# 第 2 天：补全资料
node scripts/scrape.js --config ./config/channel-bd.json
cat cache/scraped.json | jq '.[0] | {name, website, social_links}'

# 第 3 天：抽取联系方式
node scripts/extract.js --config ./config/channel-bd.json
cat cache/contacts.json | jq '.[] | select(.email != null) | {name, email}'

# 第 4 天：导出并发送
node scripts/export.js --config ./config/channel-bd.json
node scripts/send.js --bucket A --config ./config/channel-bd.json
```

### 工作流 4: 测试模式

适合：首次运行，不实际发送邮件

```bash
# 1. 设置干跑模式
export CHANNEL_BD_DRY_RUN=true

# 2. 运行筛选（不发送）
node scripts/run.js --stage filter --config ./config/channel-bd.json

# 3. 查看结果
cat cache/filtered.json | jq '.[0:3]'

# 4. 导出 CSV（人工检查）
node scripts/export.js --config ./config/channel-bd.json
cat output/projects.csv | head -20

# 5. 确认无误后，关闭干跑模式，实际发送
export CHANNEL_BD_DRY_RUN=false
node scripts/send.js --bucket A --config ./config/channel-bd.json
```

## 配置调优

### 调整筛选条件

**太严格**（通过数量太少）：
```json
{
  "hard_filters": {
    "min_market_cap": 500000,  // 降低门槛
    "excluded_tags": []        // 减少排除标签
  }
}
```

**太宽松**（通过数量太多）：
```json
{
  "hard_filters": {
    "min_market_cap": 5000000,  // 提高门槛
    "min_age_days": 60,         // 增加最小上线天数
    "has_twitter": true         // 增加必须条件
  }
}
```

### 调整分桶阈值

**A 桶太少**：
```json
{
  "bucket_thresholds": {
    "A": 75,  // 从 80 降低到 75
    "B": 50
  }
}
```

**A 桶太多**（质量参差不齐）：
```json
{
  "bucket_thresholds": {
    "A": 85,  // 从 80 提高到 85
    "B": 55
  }
}
```

### 调整评分权重

**更看重市值排名**：
```json
{
  "scoring_weights": {
    "market_cap_rank": 30,  // 从 20 提高到 30
    "social_score": 10      // 相应降低其他权重
  }
}
```

**更看重社交媒体**：
```json
{
  "scoring_weights": {
    "social_score": 25,     // 从 15 提高到 25
    "github_activity": 10   // 相应降低其他权重
  }
}
```

## 高级用法

### 1. 使用特定数据源

```bash
# 仅从 CMC 获取
node scripts/fetch.js --config ./config/channel-bd.json

# 编辑 config/channel-bd.json，临时禁用某些数据源
{
  "data_sources": {
    "cmc": { "enabled": true },
    "coingecko": { "enabled": false },
    "binance": { "enabled": false },
    "coincap": { "enabled": false }
  }
}
```

### 2. 查看日志

```bash
# 查看 24 小时内的获取日志
node scripts/logs.js --since 24h

# 查看 7 天内的发送日志
node scripts/logs.js --since 7d --type send

# 查看完整日志文件
cat logs/channel-bd.log | tail -100
```

### 3. 清理缓存

```bash
# 清理所有缓存和输出
node scripts/clean.js

# 或手动清理
rm -rf cache/* output/*
```

### 4. 自定义邮件模板

编辑 `templates/email_a.md`：

```markdown
Subject: Partnership Opportunity - {{ProjectName}}

Hi {{Name}},

I'm {{SenderName}} from {{CompanyName}}. 

{{Personalized}}

Best regards,
{{SenderName}}
```

### 5. 抑制名单管理

编辑 `config/suppression.txt`：

```
# 退订用户
unsubscribe@example.com

# 竞争对手
@competitor-domain.com

# 已联系过
contacted@project.io
```

## 故障排除

### 问题 1: API 限流

**错误**：`CMC API 错误：429 Too Many Requests`

**解决**：
```bash
# 1. 等待 60 秒后重试
# 2. 减少获取数量
# 编辑 config/channel-bd.json
{
  "data_sources": {
    "cmc": { "limit": 50 }  // 从 100 减少到 50
  }
}

# 3. 使用缓存
node scripts/fetch.js --config ./config/channel-bd.json --use-cache
```

### 问题 2: 邮件发送失败

**错误**：`SMTP authentication failed`

**解决**：
1. 检查 SMTP 凭证
2. 确认 SMTP 服务器允许第三方应用
3. 使用应用专用密码（如果启用 2FA）
4. 测试连接：
```bash
telnet smtp.example.com 587
```

### 问题 3: 筛选结果为空

**原因**：筛选条件太严格

**解决**：
```json
{
  "hard_filters": {
    "min_market_cap": 100000,  // 降低门槛
    "excluded_tags": []        // 清空排除标签
  }
}
```

### 问题 4: 部分数据源失败

**错误**：`⚠️ CoinGecko 数据源失败：429 Too Many Requests`

**解决**：
- 系统会自动跳过失败的数据源
- 查看 `cache/fetch_log.json` 了解详情
- 等待限流解除后重新运行

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

第一周：每天 30 封
第二周：每天 50 封
第三周：每天 100 封
第四周：每天 200 封

### 2. 定期清理缓存

```bash
# 每周清理一次
find cache -name "*.json" -mtime +7 -delete
```

### 3. 维护抑制名单

每次发送后，将 bounce 的邮箱加入抑制名单：

```bash
# 编辑 suppression.txt
bounce@example.com
```

### 4. 备份配置

```bash
cp config/channel-bd.json config/channel-bd.backup.json
cp config/.env config/.env.backup
```

### 5. 监控发送成功率

```bash
# 查看发送成功率
cat logs/send_log.json | jq 'group_by(.status) | .[] | {status: .[0].status, count: length}'
```

## 性能优化

### 1. 使用多数据源交叉验证

```json
{
  "data_sources": {
    "cmc": { "enabled": true },
    "coingecko": { "enabled": true },
    "binance": { "enabled": true },
    "coincap": { "enabled": true }
  }
}
```

优势：
- 提高数据可靠性
- 自动填补缺失字段
- 获得额外评分加成

### 2. 并发执行（未来版本）

```bash
# 同时抓取多个项目（计划功能）
node scripts/scrape.js --config ./config/channel-bd.json --concurrency 5
```

### 3. 增量更新

```bash
# 仅更新过去 24 小时的数据（计划功能）
node scripts/fetch.js --config ./config/channel-bd.json --incremental
```

## 输出示例

### filtered.json
```json
[
  {
    "id": "ethereum",
    "name": "Ethereum",
    "symbol": "ETH",
    "website": "https://ethereum.org",
    "market_cap": 280000000000,
    "cmc_rank": 2,
    "score": 95,
    "bucket": "A",
    "data_sources": ["cmc", "coingecko", "binance"],
    "cross_validated": true
  }
]
```

### contacts.json
```json
[
  {
    "contact_id": "contact-ethereum",
    "project_id": "ethereum",
    "email": "partnerships@ethereum.org",
    "telegram_handle": "ethereumproject",
    "confidence": "high",
    "needs_review": false
  }
]
```

### buckets.json
```json
{
  "A": [
    {"name": "Ethereum", "score": 95},
    {"name": "Solana", "score": 92},
    {"name": "Arbitrum", "score": 89}
  ],
  "B": [...],
  "C": [...]
}
```

## 下一步

1. **人工复核**: 检查 A 桶项目，确保质量
2. **发送 B 桶**: 确认 B 桶项目后发送
3. **跟踪回复**: 监控邮件回复率
4. **优化配置**: 根据回复率调整筛选条件
5. **定期运行**: 每周或每月运行一次，发现新项目

祝 BD 工作顺利！🚀
