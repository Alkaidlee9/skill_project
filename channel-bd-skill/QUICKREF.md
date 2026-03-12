# Channel BD 快速参考

## 目录结构

```
channel-bd-skill/
├── 📄 SKILL.md                  # 完整技能文档
├── 📄 README.md                 # 使用说明
├── 📄 GUIDE.md                  # 详细使用指南
├── 📄 package.json              # 项目配置
├── 📁 bin/
│   └── channel-bd.js            # CLI 入口
├── 📁 config/
│   ├── channel-bd.json          # 主配置
│   ├── channel-bd.example.json  # 配置模板
│   ├── .env                     # 环境变量
│   ├── .env.example             # 环境变量模板
│   ├── schema.json              # JSON Schema
│   ├── suppression.txt          # 抑制名单
│   └── README.md                # 配置说明
├── 📁 scripts/
│   ├── init.js                  # 初始化
│   ├── fetch.js                 # 获取项目池
│   ├── filter.js                # 筛选评分
│   ├── scrape.js                # 资料补全
│   ├── extract.js               # 联系方式抽取
│   ├── export.js                # 导出表单
│   ├── send.js                  # 批量发送
│   ├── run.js                  # 批量运行
│   ├── logs.js                 # 查看日志
│   └── README.md               # 脚本说明
├── 📁 templates/
│   ├── email_a.md              # A 桶模板
│   └── email_b.md              # B 桶模板
├── 📁 cache/                   # 缓存目录（自动生成）
│   ├── projects.json           # 原始项目
│   ├── filtered.json           # 筛选后
│   ├── buckets.json            # 分桶结果
│   ├── scraped.json            # 资料补全
│   ├── contacts.json           # 联系方式
│   └── fetch_log.json          # 获取日志
├── 📁 output/                  # 输出目录（自动生成）
│   ├── projects.csv            # 项目 CSV
│   └── contacts.csv            # 联系人 CSV
└── 📁 logs/                    # 日志目录（自动生成）
    └── channel-bd.log          # 运行日志
```

## 核心命令速查

```bash
# 初始化
channel-bd init

# 运行
channel-bd fetch     # 获取项目池
channel-bd filter    # 筛选评分
channel-bd scrape    # 资料补全
channel-bd extract   # 抽取联系方式
channel-bd export    # 导出表单
channel-bd send      # 发送邮件
channel-bd run       # 完整流程
channel-bd logs      # 查看日志
channel-bd clean     # 清理缓存

# 常用组合
channel-bd run --stage filter     # 仅筛选
channel-bd send --bucket A        # 发送 A 桶
channel-bd logs --since 24h       # 查看 24h 日志
```

## 配置速查

### 必填配置 (config/.env)
```bash
export CMC_API_KEY="your_key"
export COINGECKO_API_KEY="your_key"
export BINANCE_API_KEY="your_key"
```

### 核心配置 (config/channel-bd.json)
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

## 数据流程

```
┌─────────────┐
│ 数据源 APIs  │
│ CMC         │
│ CoinGecko   │
│ Binance     │
│ CoinCap     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ fetch.js    │ → cache/projects.json
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ filter.js   │ → cache/filtered.json
│             │ → cache/buckets.json
│             │ → cache/rejected.json
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ scrape.js   │ → cache/scraped.json
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ extract.js  │ → cache/contacts.json
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ export.js   │ → output/projects.csv
│             │ → output/contacts.csv
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ send.js     │ → logs/send_log.json
└─────────────┘
```

## 分桶逻辑

| 桶位 | 分数 | 处理方式 | 发送策略 |
|------|------|---------|---------|
| A    | ≥80  | 优先联系 | 自动发送 |
| B    | 50-79| 草稿确认 | 人工确认后发送 |
| C    | <50  | 暂缓观察 | 不发送 |

## 评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 市值排名 | 20% | CMC 排名归一化 |
| 社交媒体 | 15% | Twitter 活跃度 |
| GitHub 活跃 | 15% | 代码提交频率 |
| 团队透明度 | 10% | 团队信息公开程度 |
| 合作伙伴 | 10% | 已知合作方质量 |
| 近期里程碑 | 10% | 最近项目进展 |
| 官网质量 | 10% | 官网完整度 |
| 文档完整性 | 10% | 文档详细程度 |
| 数据验证 | +10% | 多数据源交叉验证 |
| 多源加成 | +15% | 使用多个数据源 |

## 硬条件筛选

- ✅ 市值范围 (min/max_market_cap)
- ✅ FDV 范围 (min/max_fdv)
- ✅ 标签过滤 (required/excluded_tags)
- ✅ 上线天数 (min/max_age_days)
- ✅ 必须有官网 (has_website)
- ✅ 必须有 Twitter (has_twitter)
- ✅ 必须有 Telegram (has_telegram)
- ✅ 必须有文档 (has_docs)
- ✅ Twitter 粉丝数 (min_twitter_followers)
- ✅ GitHub Stars (min_github_stars)

## 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| CMC_API_KEY | CoinMarketCap API | ✅ |
| COINGECKO_API_KEY | CoinGecko API | ✅ |
| BINANCE_API_KEY | Binance API | ✅ |
| GOOGLE_SHEET_ID | Google Sheets ID | ❌ |
| SMTP_HOST | SMTP 服务器 | ❌ |
| SMTP_USER | SMTP 用户名 | ❌ |
| SMTP_PASSWORD | SMTP 密码 | ❌ |
| CHANNEL_BD_DRY_RUN | 干跑模式 | ❌ |
| CHANNEL_BD_LOG_LEVEL | 日志级别 | ❌ |

## 输出文件

### cache/projects.json
原始项目数据，包含所有字段

### cache/filtered.json
通过筛选的项目，包含评分和分桶

### cache/buckets.json
分桶结果，按 A/B/C 分类

### cache/contacts.json
联系方式，包含置信度评分

### output/projects.csv
CSV 格式的项目列表

### output/contacts.csv
CSV 格式的联系人列表

## 常见问题速查

| 问题 | 解决 |
|------|------|
| API 限流 | 降低 limit，等待 60 秒 |
| 筛选为空 | 放宽 hard_filters |
| 发送失败 | 检查 SMTP 配置 |
| 数据不一致 | 启用多数据源交叉验证 |
| 部分失败 | 查看 fetch_log.json |

## 推荐工作流

```bash
# Day 1: 筛选
channel-bd fetch
channel-bd filter

# Day 2: 补全
channel-bd scrape
channel-bd extract

# Day 3: 导出发送
channel-bd export
channel-bd send --bucket A
```

## 最佳实践

✅ 首次运行使用 dry_run 模式
✅ 配置所有数据源以启用交叉验证
✅ 定期清理缓存 (每周)
✅ 维护抑制名单
✅ 根据回复率调整配置
✅ 新账号暖发（从每天 30 封开始）
✅ 人工复核 A 桶项目
✅ 记录发送日志

## 性能基准

| 项目数量 | 运行时间 | 内存占用 |
|---------|---------|---------|
| 100     | ~30s    | ~50MB   |
| 500     | ~2min   | ~100MB  |
| 1000    | ~5min   | ~200MB  |

*实际性能取决于网络速度和 API 响应时间

## 安全提醒

⚠️ **不要提交敏感信息**
```bash
# .gitignore 已包含：
config/.env
config/gsa.json
logs/*.log
```

⚠️ **API Key 轮换**
- 定期更换 API Key
- 使用环境变量注入
- 不要硬编码在配置文件中

⚠️ **邮件合规**
- 遵守 CAN-SPAM 法案
- 提供退订选项
- 尊重抑制名单

---

**完整文档**: 查看 [SKILL.md](./SKILL.md) 和 [GUIDE.md](./GUIDE.md)
