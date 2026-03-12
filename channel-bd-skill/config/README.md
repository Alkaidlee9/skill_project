# Channel BD 配置说明

## 配置文件结构

```
config/
├── channel-bd.json          # 主配置文件
├── channel-bd.example.json  # 配置模板
├── .env                     # 环境变量（敏感信息）
├── .env.example             # 环境变量模板
├── schema.json              # JSON Schema 验证
├── suppression.txt          # 抑制名单
└── suppression.example.txt  # 抑制名单模板
```

## 快速开始

### 1. 复制配置模板

```bash
cp config/channel-bd.example.json config/channel-bd.json
cp config/.env.example config/.env
```

### 2. 编辑环境变量

编辑 `config/.env`，填入你的 API 密钥：

```bash
# 数据源 API（建议全部配置以启用交叉验证）
export CMC_API_KEY="your_cmc_api_key"
export COINGECKO_API_KEY="your_coingecko_api_key"
export BINANCE_API_KEY="your_binance_api_key"

# Google Sheets 输出（可选）
export GOOGLE_SHEET_ID="your_sheet_id"

# SMTP 邮件配置（可选）
export SMTP_HOST="smtp.example.com"
export SMTP_USER="your_email@example.com"
export SMTP_PASSWORD="your_password"
```

### 3. 编辑主配置

编辑 `config/channel-bd.json`，调整筛选条件：

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
  }
}
```

## 配置项详解

### 数据源配置 (data_sources)

```json
{
  "cmc": {
    "enabled": true,           // 是否启用
    "api_key": "${CMC_API_KEY}", // 支持环境变量
    "limit": 100,              // 获取数量
    "category": "defi"         // 分类过滤（可选）
  },
  "coingecko": {
    "enabled": true,
    "api_key": "${COINGECKO_API_KEY}",
    "per_page": 100
  },
  "binance": {
    "enabled": true,
    "api_key": "${BINANCE_API_KEY}"
  },
  "coincap": {
    "enabled": true,           // CoinCap 无需 API Key
    "limit": 100
  }
}
```

**建议**: 配置所有数据源以启用交叉验证功能，提高数据可靠性。

### 硬条件筛选 (hard_filters)

不满足条件的项目会被直接排除：

```json
{
  "min_market_cap": 1000000,      // 最小市值 (USD)
  "max_market_cap": 100000000,    // 最大市值 (USD)
  "min_fdv": 5000000,             // 最小完全稀释估值 (USD)
  "max_fdv": 500000000,           // 最大 FDV (USD)
  "required_tags": ["defi"],      // 必须包含的标签
  "excluded_tags": ["meme", "nft"], // 必须排除的标签
  "min_age_days": 30,             // 最小上线天数
  "has_website": true,            // 必须有官网
  "has_twitter": true,            // 必须有 Twitter
  "has_telegram": false,          // 必须有 Telegram
  "has_docs": false,              // 必须有文档
  "min_twitter_followers": 1000,  // 最小 Twitter 粉丝数
  "min_github_stars": 50,         // 最小 GitHub stars
  "countries_excluded": []        // 排除的国家/地区
}
```

### 评分权重 (scoring_weights)

影响项目的综合分数（总分 100）：

```json
{
  "market_cap_rank": 20,      // 市值排名分
  "social_score": 15,         // 社交媒体活跃度
  "github_activity": 15,      // GitHub 活跃度
  "team_transparency": 10,    // 团队透明度
  "partnerships": 10,         // 合作伙伴质量
  "recent_milestones": 10,    // 近期里程碑
  "website_quality": 10,      // 官网质量
  "documentation": 10,        // 文档完整性
  "community_engagement": 5,  // 社区互动
  "tokenomics": 5,            // 代币经济学
  "data_validation": 10,      // 数据验证分（交叉验证）
  "multi_source_bonus": 15    // 多数据源加成
}
```

### 分桶阈值 (bucket_thresholds)

```json
{
  "A": 80,   // ≥80 分 → A 桶（优先联系）
  "B": 50,   // 50-79 分 → B 桶（草稿，人工确认）
  "C": 0     // <50 分 → C 桶（暂缓）
}
```

### 输出配置 (output)

```json
{
  "primary": "csv",            // 主要输出格式：google_sheets / airtable / csv
  "backup": "csv",             // 备用输出格式
  "csv": {
    "projects_file": "./output/projects.csv",
    "contacts_file": "./output/contacts.csv"
  },
  "google_sheets": {
    "spreadsheet_id": "${GOOGLE_SHEET_ID}",
    "projects_sheet": "Projects",
    "contacts_sheet": "Contacts"
  },
  "airtable": {
    "base_id": "${AIRTABLE_BASE_ID}",
    "api_key": "${AIRTABLE_API_KEY}"
  }
}
```

### 邮件配置 (email)

```json
{
  "provider": "smtp",          // 邮件服务商：smtp / gmail / outlook
  "dry_run": true,             // 干跑模式（不实际发送）
  "smtp": {
    "host": "${SMTP_HOST}",
    "port": 587,
    "secure": false,
    "user": "${SMTP_USER}",
    "password": "${SMTP_PASSWORD}",
    "from": "${SMTP_FROM}",
    "from_name": "Partnerships Team"
  },
  "rate_limit": {
    "per_hour": 50,            // 每小时最多发送
    "per_day": 200,            // 每天最多发送
    "per_domain": 10           // 每个域名最多发送
  },
  "retry": {
    "max_attempts": 3,         // 失败重试次数
    "backoff_ms": 5000         // 重试间隔 (ms)
  },
  "templates": {
    "A_bucket": "./templates/email_a.md",
    "B_bucket": "./templates/email_b.md"
  },
  "personalization": {
    "enabled": true,           // 是否启用个性化
    "max_sentences": 2,        // 最多个性化句子数
    "require_evidence": true   // 必须有证据才能写入
  }
}
```

### 日志配置 (logs)

```json
{
  "file": "./logs/channel-bd.log",
  "level": "info",             // 日志级别：debug / info / warn / error
  "rotation": "daily",         // 日志轮转：daily / weekly / monthly
  "retention_days": 30,        // 日志保留天数
  "save_fetch_log": true,      // 保存获取日志
  "save_failed_sources": true  // 保存失败数据源记录
}
```

### 缓存配置 (cache)

```json
{
  "enabled": true,
  "dir": "./cache",
  "ttl_hours": 24              // 缓存有效期 (小时)
}
```

## 环境变量列表

```bash
# 数据源 API
CMC_API_KEY              # CoinMarketCap API Key
COINGECKO_API_KEY        # CoinGecko API Key
BINANCE_API_KEY          # Binance API Key

# 输出配置
GOOGLE_SHEET_ID          # Google Sheets ID
GOOGLE_SERVICE_ACCOUNT_KEY  # Google Service Account 密钥文件路径
AIRTABLE_BASE_ID         # Airtable Base ID
AIRTABLE_API_KEY         # Airtable API Key

# 邮件配置
SMTP_HOST                # SMTP 服务器
SMTP_PORT                # SMTP 端口
SMTP_USER                # SMTP 用户名
SMTP_PASSWORD            # SMTP 密码
SMTP_FROM                # 发件人邮箱

# 运行配置
CHANNEL_BD_LOG_LEVEL     # 日志级别 (info/debug/warn/error)
CHANNEL_BD_DRY_RUN       # 干跑模式 (true/false)
CHANNEL_BD_CONFIG_PATH   # 配置文件路径
```

## 抑制名单格式

编辑 `config/suppression.txt`：

```
# 退订用户
unsubscribe@example.com

# 屏蔽整个域名
@competitor-domain.com

# 已 bounce 的邮箱
bounced@example.org

# 已联系过的邮箱
already-contacted@project.io
```

## 配置验证

使用 JSON Schema 验证配置：

```bash
# 使用 node 验证
node -e "
const fs = require('fs');
const Ajv = require('ajv');
const ajv = new Ajv();
const schema = JSON.parse(fs.readFileSync('config/schema.json'));
const config = JSON.parse(fs.readFileSync('config/channel-bd.json'));
const validate = ajv.compile(schema);
const valid = validate(config);
if (!valid) console.error(validate.errors);
else console.log('✅ 配置验证通过');
"
```

## 配置最佳实践

### 1. 新账号暖发

```json
{
  "email": {
    "dry_run": false,
    "rate_limit": {
      "per_hour": 10,
      "per_day": 50,
      "per_domain": 5
    }
  }
}
```

### 2. 保守筛选（高质量）

```json
{
  "hard_filters": {
    "min_market_cap": 10000000,
    "max_market_cap": 500000000,
    "min_age_days": 90,
    "has_website": true,
    "has_twitter": true,
    "min_twitter_followers": 5000
  },
  "bucket_thresholds": {
    "A": 85,
    "B": 60,
    "C": 0
  }
}
```

### 3. 积极筛选（广撒网）

```json
{
  "hard_filters": {
    "min_market_cap": 500000,
    "max_market_cap": 200000000,
    "excluded_tags": ["meme"],
    "has_website": true
  },
  "bucket_thresholds": {
    "A": 75,
    "B": 45,
    "C": 0
  }
}
```

## 常见问题

### Q: 如何配置多个数据源？

A: 在 `data_sources` 中启用多个数据源：

```json
{
  "data_sources": {
    "cmc": { "enabled": true, "api_key": "${CMC_API_KEY}", "limit": 100 },
    "coingecko": { "enabled": true, "api_key": "${COINGECKO_API_KEY}" },
    "binance": { "enabled": true, "api_key": "${BINANCE_API_KEY}" },
    "coincap": { "enabled": true }
  }
}
```

### Q: 如何使用环境变量？

A: 在配置文件中使用 `${ENV_VAR}` 语法：

```json
{
  "data_sources": {
    "cmc": { "api_key": "${CMC_API_KEY}" }
  }
}
```

### Q: 如何跳过某个阶段？

A: 使用 `run.js` 的 `--stage` 参数：

```bash
# 仅运行到 filter 阶段
node scripts/run.js --config ./config/channel-bd.json --stage filter
```

### Q: 如何重置配置？

A: 删除配置文件并重新初始化：

```bash
rm config/channel-bd.json
node scripts/init.js
```

## 配置示例

完整配置示例请参考 `channel-bd.example.json`。
