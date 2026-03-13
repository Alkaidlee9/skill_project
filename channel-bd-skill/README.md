# Channel BD - 加密货币项目渠道拓展自动化

Channel BD 是一个自动化的加密货币项目挖掘、筛选、资料收集和批量联系系统。它从多个数据源获取项目信息，按硬条件和偏好评分筛选，自动收集联系方式，并支持批量邮件发送。

## 快速开始

### 1. 初始化配置

```bash
cd channel-bd-skill
node scripts/init.js
```

### 2. 配置环境变量

```bash
cp config/.env.example config/.env
vim config/.env
```

必填 API Keys：
- CMC: https://coinmarketcap.com/api/
- CoinGecko: https://www.coingecko.com/api
- Binance: https://www.binance.com/en/my/settings/api-management

### 3. 配置筛选条件

```bash
cp config/channel-bd.example.json config/channel-bd.json
vim config/channel-bd.json
```

推荐首次配置：
```json
{
  "hard_filters": {
    "min_market_cap": 1000000,
    "max_market_cap": 100000000,
    "excluded_tags": ["meme", "nft"],
    "has_website": true,
    "has_twitter": true
  },
  "email": {
    "dry_run": true
  }
}
```

### 4. 运行完整流程

```bash
node scripts/run.js --config ./config/channel-bd.json
```

### 5. 查看结果

```bash
cat cache/buckets.json | jq '. | keys[] as $k | "\($k): \(.[$k] | length)"'
```

## 文档导航

- 📘 **[SKILL.md](./SKILL.md)** - 完整技能文档（技术规范）
- 📗 **[GUIDE.md](./GUIDE.md)** - 详细使用指南（工作流示例）
- 📙 **[QUICKREF.md](./QUICKREF.md)** - 快速参考卡（命令速查）
- 📕 **[USAGE.md](./USAGE.md)** - **使用说明（新手必读）**
- 📔 **[config/README.md](./config/README.md)** - 配置说明

## 核心功能

| Step | 功能 | 脚本 | 输出 |
|------|------|------|------|
| 1 | 项目池获取 | fetch.js | projects.json |
| 2 | 筛选评分分桶 | filter.js | filtered.json, buckets.json |
| 3 | 资料补全 | scrape.js | scraped.json |
| 4 | 联系方式抽取 | extract.js | contacts.json |
| 5 | 导出表单 | export.js | projects.csv, contacts.csv |
| 6 | 批量发送 | send.js | send_log.json |
| - | 批量运行 | run.js | 完整流程 |
| - | 查看日志 | logs.js | 日志摘要 |

## 常用命令

```bash
# 完整流程
node scripts/run.js --config ./config/channel-bd.json

# 分步执行
node scripts/fetch.js --config ./config/channel-bd.json
node scripts/filter.js --config ./config/channel-bd.json
node scripts/scrape.js --config ./config/channel-bd.json
node scripts/extract.js --config ./config/channel-bd.json
node scripts/export.js --config ./config/channel-bd.json
node scripts/send.js --bucket A --config ./config/channel-bd.json

# 查看日志
node scripts/logs.js --since 24h

# 清理缓存
node scripts/clean.js
```

## 数据源与交叉验证

| 数据源 | API Key | 优势 | 用途 |
|--------|---------|------|------|
| CMC | 必需 | 市值排名权威 | 主要数据源 |
| CoinGecko | 必需 | 数据全面 | 交叉验证 |
| Binance | 必需 | 交易数据实时 | 流动性验证 |
| CoinCap | 无需 | 免费开放 | 补充数据 |

**交叉验证优势**：
- ✅ 自动合并多个数据源数据
- ✅ 优先选择可靠来源
- ✅ 填补缺失字段
- ✅ 额外评分加成

## 分桶逻辑

| 桶 | 分数 | 处理方式 |
|----|------|---------|
| A | ≥80 | 自动发送，优先联系 |
| B | 50-79 | 生成草稿，人工确认 |
| C | <50 | 暂缓，放入观察池 |

## 数据源与交叉验证

### 支持的数据源

| 数据源 | API Key | 优势 | 用途 |
|--------|---------|------|------|
| **CMC** | 必需 | 市值排名权威、标签丰富 | 主要数据源 |
| **CoinGecko** | 必需 | 数据全面、更新快 | 交叉验证 |
| **Binance** | 必需 | 交易数据实时 | 流动性验证 |
| **CoinCap** | 无需 | 免费开放、覆盖广 | 补充数据 |

### 交叉验证逻辑

系统自动对多数据源数据进行交叉验证：

1. **数据可靠性优先级**: CMC/CoinGecko > CoinCap > Binance
2. **数据合并**: 自动合并多个数据源的市值、交易量等信息
3. **验证标记**: `cross_validated: true` 表示多数据源验证
4. **评分加成**: 多数据源验证的项目获得额外分数

```json
// 输出示例
{
  "name": "Ethereum",
  "symbol": "ETH",
  "market_cap": 280000000000,
  "cmc_rank": 2,
  "cross_validated": true,
  "data_sources": ["cmc", "coingecko", "binance", "coincap"],
  "score": 95,
  "bucket": "A"
}
```

## Prompt 规范

### 与 AI Agent 交互的标准格式

当使用 Channel BD Skill 时，请使用以下 Prompt 结构：

#### 1. 任务启动格式

```
/channel-bd <action> [options]

示例:
/channel-bd init                          # 初始化配置
/channel-bd fetch --source cmc --limit 100
/channel-bd filter --config ./config/channel-bd.json
/channel-bd run --full                    # 完整流程
```

#### 2. 配置收集 Prompt

当用户输入模糊需求时，Agent 应主动询问：

```
请提供以下筛选条件：

【硬条件】（必须满足，否则排除）
- 市值范围：$___M - $___M
- 必须有的标签：defi / infrastructure / layer1 / ...
- 必须排除的标签：meme / nft / ...
- 最小上线天数：___天
- 必须有官网/推特/TG：是/否

【评分偏好】（影响排序，非硬性）
- 最看重的因素：市值排名 / 社媒活跃 / GitHub 活跃 / 团队透明度 / 合作伙伴
- 目标桶位：只要 A 桶 / A+B 桶 / 全部

【输出配置】
- 输出目标：Google Sheets / Airtable / CSV
- 是否发送邮件：是（A 桶/B 桶） / 否（仅导出）
```

#### 3. 配置结构化输出

Agent 应将用户回答转换为 JSON 配置：

```json
{
  "action": "filter",
  "hard_filters": {
    "min_market_cap": 1000000,
    "max_market_cap": 100000000,
    "required_tags": ["defi"],
    "excluded_tags": ["meme", "nft"],
    "min_age_days": 30,
    "has_website": true,
    "has_twitter": true
  },
  "scoring_weights": {
    "market_cap_rank": 25,
    "social_score": 20,
    "github_activity": 15,
    "team_transparency": 15,
    "partnerships": 15,
    "documentation": 10
  },
  "bucket_thresholds": {
    "A": 80,
    "B": 50,
    "C": 0
  },
  "output": {
    "primary": "google_sheets",
    "send_email": true,
    "email_bucket": "A"
  }
}
```

#### 4. 执行确认 Prompt

在执行关键操作前，Agent 应确认：

```
【执行确认】

将执行以下操作：
1. 从 CMC 获取 100 个项目
2. 按硬条件过滤（预计保留 60-70 个）
3. 评分分桶（预计 A 桶 15 个，B 桶 25 个，C 桶 20 个）
4. 导出到 Google Sheets
5. 向 A 桶项目发送邮件（共 15 封）

⚠️  当前为干跑模式 (DRY_RUN=true)，不会实际发送邮件

是否继续？ [Y/n]
```

#### 5. 结果汇报 Prompt

执行完成后，Agent 应输出结构化结果：

```
✅ Channel BD 执行完成

【统计摘要】
┌─────────────┬────────┐
│ 阶段        │ 数量   │
├─────────────┼────────┤
│ 获取项目    │ 100    │
│ 通过筛选    │ 62     │
│ A 桶 (优先)  │ 15     │
│ B 桶 (草稿)  │ 27     │
│ C 桶 (暂缓)  │ 20     │
│ 被拒绝      │ 38     │
└─────────────┴────────┘

【A 桶前 5 名】
1. Arbitrum (ARB) - 89 分 - $1.2B
2. Optimism (OP) - 87 分 - $980M
3. Polygon (MATIC) - 85 分 - $850M
4. Avalanche (AVAX) - 83 分 - $720M
5. Cosmos (ATOM) - 81 分 - $650M

【输出位置】
- Google Sheets: https://docs.google.com/spreadsheets/d/xxx
- 邮件发送：15 封已发送（A 桶）
- 日志文件：logs/channel-bd.log

【下一步建议】
- 复核 B 桶项目：node scripts/export.js --bucket B --review
- 发送 B 桶邮件：node scripts/send.js --bucket B --confirm
```

#### 6. 错误处理 Prompt

```
❌ 执行出错

【错误信息】
CMC API 请求失败：429 Too Many Requests

【可能原因】
API 限流 - 每分钟请求数超限

【解决方案】
1. 等待 60 秒后重试
2. 减少 --limit 参数
3. 使用缓存：node scripts/fetch.js --use-cache

【已完成的进度】
✓ 初始化配置
✗ 获取项目池 (失败)
- 筛选评分 (未执行)
- 导出表单 (未执行)
```

### Agent 行为规范

| 场景 | 行为要求 |
|------|---------|
| 配置缺失 | 主动询问，提供默认值建议 |
| 模糊需求 | 拆解为硬条件 + 评分偏好 |
| 执行前 | 必须确认，显示预估结果 |
| 执行后 | 输出统计摘要 + 下一步建议 |
| 出错时 | 解释原因 + 提供解决方案 |
| 个性化邮件 | 仅使用有证据字段，缺证据不写 |
| 联系人信息 | 标注置信度，低置信度标记待复核 |

### 邮件生成 Prompt 模板

```
请为以下项目生成 BD 邮件：

项目：{{project.name}} ({{project.symbol}})
联系人：{{contact.name}} - {{contact.role}} (置信度：{{contact.confidence}})
桶位：{{project.bucket}}

可用个性化字段（必须有证据）：
- 近期里程碑：{{project.milestones}}
- 合作伙伴：{{project.partnerships}}
- 项目标签：{{project.tags}}
- Twitter: {{project.twitter_url}}

要求：
1. 仅使用上述有证据字段
2. 如果字段为空，跳过个性化内容
3. 语气专业但友好
4. 长度 100-150 字
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `node scripts/init.js` | 初始化配置 |
| `node scripts/run.js --full` | 运行完整流程 |
| `node scripts/fetch.js --source cmc` | 从 CMC 获取 |
| `node scripts/filter.js` | 筛选评分分桶 |
| `node scripts/scrape.js` | 抓取官网社媒 |
| `node scripts/extract.js` | 抽取联系方式 |
| `node scripts/export.js` | 导出表单 |
| `node scripts/send.js --bucket A` | 发送 A 桶邮件 |
| `node scripts/send.js --dry-run` | 干跑测试 |

## 配置项详解

### 硬条件筛选 (hard_filters)

```json
{
  "min_market_cap": 1000000,      // 最小市值 (USD)
  "max_market_cap": 100000000,    // 最大市值 (USD)
  "min_fdv": 5000000,             // 最小 FDV (USD)
  "max_fdv": 500000000,           // 最大 FDV (USD)
  "required_tags": ["defi"],      // 必须包含的标签
  "excluded_tags": ["meme", "nft"], // 必须排除的标签
  "min_age_days": 30,             // 最小上线天数
  "has_website": true,            // 必须有官网
  "has_twitter": true,            // 必须有 Twitter
  "has_telegram": false,          // 必须有 Telegram
  "has_docs": false,              // 必须有文档
  "min_twitter_followers": 1000,  // 最小推特粉丝
  "min_github_stars": 50,         // 最小 GitHub stars
  "countries_excluded": []        // 排除的国家
}
```

### 评分权重 (scoring_weights)

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

## 邮件模板

### A 桶模板（高优先级）

编辑 `templates/email_a.md`:
```markdown
Subject: 合作伙伴机会 - {{ProjectName}}

Hi {{Name}},

我是{{SenderName}}，{{CompanyName}}的{{SenderRole}}。
{{Personalized}}

期待合作！
```

### B 桶模板（一般优先级）

编辑 `templates/email_b.md`:
```markdown
Subject: 关于{{ProjectName}}的合作咨询

Hi {{Name}},

{{Personalized}}

请问您是对接商务合作的负责人吗？
```

## 抑制名单管理

编辑 `config/suppression.txt`:
```
# 不再联系的邮箱
unsubscribe@example.com
@competitor-domain.com

# 已联系过去重
already-contacted@project.io
```

## 环境变量快捷开关

```bash
# 干跑模式（不实际发送）
export CHANNEL_BD_DRY_RUN="true"

# 调整日志级别
export CHANNEL_BD_LOG_LEVEL="debug"

# 指定配置文件
export CHANNEL_BD_CONFIG_PATH="./config/channel-bd.json"
```

## 日志配置

```json
{
  "logs": {
    "file": "./logs/channel-bd.log",
    "level": "info",
    "rotation": "daily",
    "retention_days": 30,
    "save_fetch_log": true,
    "save_failed_sources": true
  }
}
```

## 典型工作流

```bash
# 第 1 天：获取并筛选项目
node scripts/fetch.js --config ./config/channel-bd.json
node scripts/filter.js --config ./config/channel-bd.json

# 第 2 天：抓取资料并导出
node scripts/scrape.js --config ./config/channel-bd.json
node scripts/extract.js --config ./config/channel-bd.json
node scripts/export.js --config ./config/channel-bd.json

# 第 3 天：人工复核 B 桶，然后发送 A 桶
node scripts/send.js --bucket A --config ./config/channel-bd.json

# 后续：发送 B 桶（人工确认后）
node scripts/send.js --bucket B --confirm --config ./config/channel-bd.json
```

## 分桶逻辑

| 桶 | 分数范围 | 处理方式 |
|----|---------|---------|
| A | ≥80 分 | 自动发送，优先联系 |
| B | 50-79 分 | 生成草稿，人工确认 |
| C | <50 分 | 暂缓，放入观察池 |

## 置信度评分（TG 联系人）

| 等级 | 说明 | 处理方式 |
|------|------|---------|
| HIGH | 官网明确 + 多来源一致 | 自动填充 |
| MEDIUM | 单一可靠来源 | 标记待复核 |
| LOW | 推测/不确定 | 标记 Needs review |

## 注意事项

1. **首次运行**建议用 `--dry-run` 测试
2. **新域名**需要暖发，先从每天 20 封开始
3. **频控设置**遵守邮件服务商限制
4. **定期清理**缓存目录 `./cache`
5. **退订请求**及时加入抑制名单
6. **推荐配置**所有数据源以启用交叉验证功能
7. **部分失败**不影响运行，查看 `cache/fetch_log.json` 了解详情

## 故障排除

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| API 限流 | 请求过于频繁 | 降低 limit，增加缓存 |
| 邮件发送失败 | 认证错误 | 检查 SMTP 凭证 |
| 网页抓取失败 | 反爬机制 | 使用官方 API 或降低频率 |
| 数据不一致 | 多数据源冲突 | 自动交叉验证，手动复核 |
| 部分数据源失败 | API Key 无效/限流 | 自动跳过失败源，查看日志 |

## 容错与日志

### 数据源容错

系统会自动处理部分数据源失效的情况：

1. **独立执行**: 每个数据源独立 try-catch 包裹
2. **失败跳过**: 失败数据源自动跳过，不影响其他源
3. **错误日志**: 记录失败原因到 `cache/fetch_log.json`
4. **全部失败**: 仅当所有数据源都失败时才报错

```bash
# 示例输出
📊 从 CMC 获取项目...
✅ CMC: 100 个项目

📊 从 CoinGecko 获取项目...
⚠️  CoinGecko 数据源失败：429 Too Many Requests - 已跳过

📊 从 Binance API 获取项目...
✅ Binance API: 20 个项目

⚠️  共 1 个数据源失败:
  - coingecko: 429 Too Many Requests
✅ 成功数据源：cmc, binance
```

### 日志文件

| 日志文件 | 说明 |
|---------|------|
| `cache/fetch_log.json` | 获取记录（时间戳、耗时、数据源） |
| `cache/projects.json` | 原始项目数据 |
| `cache/filtered.json` | 筛选后项目 |
| `cache/rejected.json` | 被拒绝项目及原因 |
| `logs/channel-bd.log` | 完整运行日志 |

## 目录结构

```
channel-bd-skill/
├── SKILL.md                    # 完整技能文档
├── README.md                   # 使用说明（本文件）
├── config/
│   ├── channel-bd.example.json # 配置模板
│   ├── schema.json             # JSON Schema 验证
│   ├── suppression.example.txt # 退订名单模板
│   └── .env.example            # 环境变量模板
├── templates/
│   ├── email_a.md              # A 桶邮件模板
│   └── email_b.md              # B 桶邮件模板
└── scripts/
    ├── init.js                 # 初始化
    ├── fetch.js                # 获取项目池
    ├── filter.js               # 筛选评分
    ├── run.js                  # 批量运行
    ├── send.js                 # 发送邮件
    └── README.md               # 脚本说明
```

## License

MIT
