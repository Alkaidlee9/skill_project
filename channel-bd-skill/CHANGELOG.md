# Changelog

## [1.0.0] - 2024-03-12

### ✨ 新增功能

#### 核心脚本
- **fetch.js** - 从 CMC/CoinGecko/Binance/CoinCap 获取项目列表
- **filter.js** - 硬条件筛选 + 评分 + 分桶 (A/B/C)
- **scrape.js** - 抓取官网、Twitter、GitHub、Docs 资料
- **extract.js** - 抽取邮箱、Telegram、联系表单
- **export.js** - 导出到 CSV/Google Sheets/Airtable
- **send.js** - 批量发送邮件（支持频控和重试）
- **run.js** - 批量运行完整流程
- **logs.js** - 查看执行日志
- **init.js** - 初始化配置和目录结构

#### CLI 工具
- **bin/channel-bd.js** - 命令行接口
  - `channel-bd init` - 初始化
  - `channel-bd fetch` - 获取项目
  - `channel-bd filter` - 筛选评分
  - `channel-bd scrape` - 资料补全
  - `channel-bd extract` - 抽取联系方式
  - `channel-bd export` - 导出表单
  - `channel-bd send` - 发送邮件
  - `channel-bd run` - 完整流程
  - `channel-bd logs` - 查看日志
  - `channel-bd clean` - 清理缓存

#### 配置文件
- **config/channel-bd.json** - 主配置
- **config/channel-bd.example.json** - 配置模板
- **config/.env.example** - 环境变量模板
- **config/schema.json** - JSON Schema 验证
- **config/suppression.example.txt** - 抑制名单模板
- **config/README.md** - 配置说明文档

#### 邮件模板
- **templates/email_a.md** - A 桶模板（高优先级）
- **templates/email_b.md** - B 桶模板（一般优先级）

#### 文档
- **README.md** - 快速开始指南
- **SKILL.md** - 完整技能文档（技术规范）
- **GUIDE.md** - 详细使用指南（工作流示例）
- **QUICKREF.md** - 快速参考卡（命令速查）
- **scripts/README.md** - 脚本说明
- **config/README.md** - 配置说明
- **CHANGELOG.md** - 变更日志（本文件）

### 🔧 技术特性

#### 数据源集成
- ✅ CoinMarketCap (CMC) API
- ✅ CoinGecko API
- ✅ Binance API
- ✅ CoinCap API
- ✅ 多数据源交叉验证
- ✅ 自动合并数据
- ✅ 数据源优先级

#### 筛选与评分
- ✅ 硬条件过滤（市值/FDV/标签/上线天数等）
- ✅ 多维度评分（10 个评分维度）
- ✅ 自动分桶（A/B/C）
- ✅ 可解释的评分输出
- ✅ 交叉验证加成

#### 资料收集
- ✅ 官网信息抓取
- ✅ 社交媒体链接提取
- ✅ 联系方式抽取（邮箱/TG/表单）
- ✅ 置信度评分
- ✅ 证据链接保留

#### 输出与导出
- ✅ CSV 导出
- ✅ Google Sheets 集成（需安装库）
- ✅ Airtable 集成（需安装库）
- ✅ 项目表 + 联系人表

#### 邮件发送
- ✅ SMTP 集成
- ✅ 干跑模式（测试）
- ✅ 频控管理（每小时/每天/每域名）
- ✅ 失败重试
- ✅ 抑制名单
- ✅ 发送日志

#### 容错与日志
- ✅ 数据源失败自动跳过
- ✅ 详细错误信息
- ✅ 执行日志记录
- ✅ 缓存管理
- ✅ 日志轮转

### 📦 项目结构

```
channel-bd-skill/
├── bin/              # CLI 入口
├── config/           # 配置文件
├── scripts/          # 核心脚本
├── templates/        # 邮件模板
├── cache/            # 缓存目录
├── output/           # 输出目录
├── logs/             # 日志目录
└── docs/             # 文档
```

### 🎯 核心优势

1. **多数据源交叉验证**
   - 自动合并多个 API 数据
   - 优先选择可靠来源
   - 填补缺失字段

2. **智能筛选评分**
   - 10 个评分维度
   - 可解释的评分输出
   - 自动分桶排序

3. **模块化设计**
   - 8 个独立脚本
   - 可单独运行
   - 可组合使用

4. **完善的文档**
   - 快速开始指南
   - 详细使用手册
   - 快速参考卡
   - 配置说明

5. **安全合规**
   - 环境变量注入
   - 抑制名单管理
   - 频控管理
   - 发送日志可追溯

### 🚀 快速开始

```bash
# 1. 初始化
node scripts/init.js

# 2. 配置 API Keys
cp config/.env.example config/.env
vim config/.env

# 3. 配置筛选条件
cp config/channel-bd.example.json config/channel-bd.json
vim config/channel-bd.json

# 4. 运行完整流程
node scripts/run.js --config ./config/channel-bd.json

# 5. 查看结果
cat cache/buckets.json | jq '. | keys[] as $k | "\($k): \(.[$k] | length)"'
```

### 📊 性能基准

| 项目数量 | 运行时间 | 内存占用 |
|---------|---------|---------|
| 100     | ~30s    | ~50MB   |
| 500     | ~2min   | ~100MB  |
| 1000    | ~5min   | ~200MB  |

### 🔮 未来计划

- [ ] 网页抓取（Puppeteer/Playwright）
- [ ] AI 个性化邮件生成
- [ ] 自动回复跟踪
- [ ] Google Sheets 实时同步
- [ ] 并发执行优化
- [ ] 增量更新
- [ ] Web UI 界面
- [ ] REST API 接口

### 📝 注意事项

1. **首次运行**请使用 `dry_run: true` 测试
2. **新邮件账号**需要暖发（从每天 30 封开始）
3. **定期清理**缓存目录（每周）
4. **维护抑制名单**，尊重退订请求
5. **不要提交**API Keys 到版本控制

### 🙏 致谢

感谢以下数据源提供的免费 API：
- CoinMarketCap
- CoinGecko
- Binance
- CoinCap

---

**License**: MIT  
**Version**: 1.0.0  
**Release Date**: 2024-03-12
