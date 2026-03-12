# Channel BD Scripts

## 脚本说明

### init.js - 初始化配置
创建必要的目录和配置文件

```bash
node scripts/init.js
```

### fetch.js - 获取项目池
从 CMC/CoinGecko/Binance/CoinCap 获取项目列表

```bash
node scripts/fetch.js --config ./config/channel-bd.json
```

**输出**: `cache/projects.json`

### filter.js - 筛选评分分桶
执行硬过滤条件，计算综合分数，分配到 A/B/C 桶

```bash
node scripts/filter.js --config ./config/channel-bd.json
```

**输出**: 
- `cache/filtered.json` - 通过筛选的项目
- `cache/buckets.json` - 分桶结果
- `cache/rejected.json` - 被拒绝的项目及原因

### scrape.js - 资料补全
抓取官网、Twitter、GitHub、Docs 等信息

```bash
node scripts/scrape.js --config ./config/channel-bd.json
```

**输出**: `cache/scraped.json`

### extract.js - 联系方式抽取
提取邮箱、Telegram、联系表单 URL

```bash
node scripts/extract.js --config ./config/channel-bd.json
```

**输出**: `cache/contacts.json`

### export.js - 导出表单
导出到 CSV/Google Sheets/Airtable

```bash
node scripts/export.js --config ./config/channel-bd.json
```

**输出**: 
- `output/projects.csv`
- `output/contacts.csv`

### send.js - 批量发送邮件
向指定桶位的项目发送邮件

```bash
# 发送 A 桶邮件
node scripts/send.js --bucket A --config ./config/channel-bd.json

# 干跑测试（不实际发送）
node scripts/send.js --bucket A --dry-run --config ./config/channel-bd.json
```

### run.js - 批量运行
按顺序执行完整流程

```bash
# 运行完整流程
node scripts/run.js --config ./config/channel-bd.json

# 仅执行到筛选阶段
node scripts/run.js --config ./config/channel-bd.json --stage filter

# 仅执行特定阶段
node scripts/run.js --config ./config/channel-bd.json --stage scrape
```

**支持的阶段**: fetch → filter → scrape → extract → export

---

## 典型工作流

```bash
# 方式 1: 完整流程（一键运行）
node scripts/run.js --config ./config/channel-bd.json

# 方式 2: 分步执行（推荐用于调试）
node scripts/fetch.js --config ./config/channel-bd.json   # 1. 获取项目池
node scripts/filter.js --config ./config/channel-bd.json  # 2. 筛选评分
node scripts/scrape.js --config ./config/channel-bd.json  # 3. 资料补全
node scripts/extract.js --config ./config/channel-bd.json # 4. 抽取联系方式
node scripts/export.js --config ./config/channel-bd.json  # 5. 导出表单
node scripts/send.js --bucket A --config ./config/channel-bd.json  # 6. 发送邮件
```

## 环境变量配置

在 `config/.env` 中配置：

```bash
# 数据源 API
export CMC_API_KEY="your_cmc_key"
export COINGECKO_API_KEY="your_coingecko_key"
export BINANCE_API_KEY="your_binance_key"

# 可选配置
export CHANNEL_BD_DRY_RUN="true"  # 干跑模式
export CHANNEL_BD_LOG_LEVEL="info"
```
