# Channel BD - 加密货币项目渠道拓展自动化

Channel BD 是一个自动化的加密货币项目挖掘、筛选、资料收集和批量联系系统。它从多个数据源获取项目信息，按硬条件和偏好评分筛选，自动收集联系方式，并支持批量邮件发送。

## 核心功能

### Step 0: 输入规范化
- **交互式表单**: 通过对话收集用户参数
- **配置持久化**: 保存配置供下次复用
- **标准结构化**: 将口语化标准拆解为"硬条件 + 排序偏好"

### Step 1: 项目池获取
- 从 CMC/CoinGecko API 获取项目列表
- 输出：项目名、链接、市值、FDV、标签
- 同名/多符号/假官网去重与校验

### Step 2: 筛选 + 评分 + 分桶
- **硬过滤**: 不满足条件直接丢弃
- **打分排序**: 可解释输出（为什么高分）
- **分桶**: A(立即联系) / B(可联系) / C(暂缓)

### Step 3: 资料补全
- 自动抓取官网、X、Docs、GitHub
- 提取简介、里程碑、合作方
- 保留证据链接（可一键复查）

### Step 4: 联系方式抽取
- 邮箱、Telegram、联系表单 URL
- 格式校验（域名/MX 检查）
- 区分 TG_Official vs TG_BD_Contact

### Step 5: TG 对应人名 + 职位
- 交叉验证（官网 Team/Contact、TG bio、X/LinkedIn）
- ConfidenceScorer: 按证据强弱打分
- 低置信度标记"Needs review"

### Step 6: 输出表单
- Google Sheets / Airtable / CSV
- 状态字段：已复核、已联系、证据链接
- Projects 表 + Contacts 表

### Step 7: 邮件生成
- 模板变量替换：{{ProjectName}} {{Name}} {{Role}}
- 个性化开场（仅使用有证据字段）
- 缺证据不写，严禁瞎编

### Step 8: 批量发送
- 队列管理：A 桶自动发，B 桶草稿，C 桶不发
- 频控、失败重试、退订/抑制名单
- 发送日志（可追溯）

## 使用方式

```bash
# 初始化配置（首次使用）
channel-bd init

# 运行完整流程
channel-bd run --config ./config/channel-bd.json

# 仅执行筛选（不发送）
channel-bd run --stage filter --config ./config/channel-bd.json

# 仅发送邮件（使用已有表单）
channel-bd send --sheet <sheet_id> --bucket A

# 查看发送日志
channel-bd logs --since 24h
```

## 配置示例

```json
{
  "data_sources": {
    "cmc": {
      "enabled": true,
      "api_key": "${CMC_API_KEY}",
      "limit": 100,
      "category": "defi"
    },
    "coingecko": {
      "enabled": true,
      "api_key": "${COINGECKO_API_KEY}"
    }
  },
  "hard_filters": {
    "min_market_cap": 1000000,
    "max_market_cap": 100000000,
    "min_fdv": 5000000,
    "required_tags": ["defi", "infrastructure"],
    "excluded_tags": ["meme", "nft"],
    "min_age_days": 30,
    "has_website": true,
    "has_twitter": true
  },
  "scoring_weights": {
    "market_cap_rank": 20,
    "social_score": 15,
    "github_activity": 15,
    "team_transparency": 10,
    "partnerships": 10,
    "recent_milestones": 10,
    "website_quality": 10,
    "documentation": 10
  },
  "bucket_thresholds": {
    "A": 80,
    "B": 50,
    "C": 0
  },
  "output": {
    "primary": "google_sheets",
    "backup": "csv",
    "google_sheets": {
      "spreadsheet_id": "${GOOGLE_SHEET_ID}",
      "projects_sheet": "Projects",
      "contacts_sheet": "Contacts"
    },
    "airtable": {
      "base_id": "${AIRTABLE_BASE_ID}",
      "api_key": "${AIRTABLE_API_KEY}"
    }
  },
  "email": {
    "provider": "smtp",
    "smtp": {
      "host": "smtp.example.com",
      "port": 587,
      "user": "${SMTP_USER}",
      "password": "${SMTP_PASSWORD}",
      "from": "partnerships@example.com"
    },
    "rate_limit": {
      "per_hour": 50,
      "per_day": 200
    },
    "templates": {
      "A_bucket": "./templates/email_a.md",
      "B_bucket": "./templates/email_b.md"
    }
  },
  "suppression_list": "./config/suppression.txt",
  "logs": "./logs/channel-bd.log"
}
```

## 硬条件筛选规则

```typescript
interface HardFilters {
  min_market_cap?: number;      // 最小市值 (USD)
  max_market_cap?: number;      // 最大市值 (USD)
  min_fdv?: number;             // 最小 FDV (USD)
  max_fdv?: number;             // 最大 FDV (USD)
  required_tags?: string[];     // 必须包含的标签
  excluded_tags?: string[];     // 必须排除的标签
  min_age_days?: number;        // 最小上线天数
  max_age_days?: number;        // 最大上线天数
  has_website?: boolean;        // 必须有官网
  has_twitter?: boolean;        // 必须有 Twitter
  has_telegram?: boolean;       // 必须有 Telegram
  has_docs?: boolean;           // 必须有文档
  min_twitter_followers?: number;
  max_twitter_followers?: number;
  min_github_stars?: number;
  countries_excluded?: string[]; // 排除的国家/地区
}
```

## 评分权重配置

```typescript
interface ScoringWeights {
  market_cap_rank: number;      // 市值排名分 (0-100 归一化)
  social_score: number;         // 社交媒体活跃度
  github_activity: number;      // GitHub 活跃度
  team_transparency: number;    // 团队透明度
  partnerships: number;         // 合作伙伴质量
  recent_milestones: number;    // 近期里程碑
  website_quality: number;      // 官网质量
  documentation: number;        // 文档完整性
  community_engagement: number; // 社区互动
  tokenomics: number;           // 代币经济学
}
```

## 分桶逻辑

| 桶 | 分数范围 | 处理方式 |
|----|---------|---------|
| A | ≥80 分 | 自动发送，优先联系 |
| B | 50-79 分 | 生成草稿，人工确认 |
| C | <50 分 | 暂缓，放入观察池 |

## 置信度评分（TG 联系人）

```typescript
enum ConfidenceLevel {
  HIGH = "high",      // 官网明确 + 多来源一致
  MEDIUM = "medium",  // 单一可靠来源
  LOW = "low"         // 推测/不确定
}

interface ContactConfidence {
  name: string | null;
  role: string | null;
  confidence: ConfidenceLevel;
  evidence: {
    source: string;
    url: string;
    excerpt: string;
  }[];
  needs_review: boolean;
}
```

## 邮件模板变量

```markdown
# 模板变量
{{ProjectName}}     - 项目名称
{{Name}}            - 联系人姓名
{{Role}}            - 联系人职位
{{ProjectURL}}      - 项目官网
{{Personalized}}    - 个性化开场（来自事实字段）
{{SenderName}}      - 发送人姓名
{{SenderRole}}      - 发送人职位
{{CompanyName}}     - 发送公司

# 个性化字段（必须有证据）
{{RecentMilestone}} - 近期里程碑
{{Partnership}}     - 已知合作方
{{Tag}}             - 项目标签
{{TwitterHandle}}   - Twitter 账号
```

## 输出表单结构

### Projects 表
| 字段 | 类型 | 说明 |
|-----|------|-----|
| project_id | string | 唯一标识 |
| name | string | 项目名称 |
| symbol | string | 代币符号 |
| website | string | 官网 URL |
| market_cap | number | 市值 (USD) |
| fdv | number | 完全稀释估值 |
| tags | string[] | 标签列表 |
| score | number | 综合评分 |
| bucket | string | A/B/C 分桶 |
| twitter_url | string | Twitter 链接 |
| telegram_url | string | Telegram 链接 |
| github_url | string | GitHub 链接 |
| docs_url | string | 文档链接 |
| description | string | 项目简介 |
| milestones | string | 里程碑摘要 |
| partnerships | string | 合作方摘要 |
| status | string | pending/reviewed/contacted |
| evidence_links | string[] | 证据链接列表 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### Contacts 表
| 字段 | 类型 | 说明 |
|-----|------|-----|
| contact_id | string | 唯一标识 |
| project_id | string | 关联项目 |
| name | string | 联系人姓名 |
| role | string | 职位 |
| email | string | 邮箱地址 |
| telegram_handle | string | TG 账号 |
| telegram_type | string | official/bd_contact |
| contact_form_url | string | 联系表单 URL |
| confidence | string | high/medium/low |
| needs_review | boolean | 是否需要人工确认 |
| evidence_links | string[] | 证据链接 |
| status | string | pending/verified/invalid |
| created_at | timestamp | 创建时间 |

## 频控与日志

```json
{
  "rate_limit": {
    "per_hour": 50,
    "per_day": 200,
    "per_domain": 10
  },
  "retry": {
    "max_attempts": 3,
    "backoff_ms": 5000
  },
  "suppression": {
    "unsubscribe_list": "./config/unsubscribe.txt",
    "bounced_list": "./config/bounced.txt",
    "contacted_list": "./config/contacted.txt"
  }
}
```

## 环境变量

```bash
# 数据源 API
export CMC_API_KEY="your_cmc_key"
export COINGECKO_API_KEY="your_coingecko_key"

# 输出配置
export GOOGLE_SHEET_ID="your_sheet_id"
export GOOGLE_SERVICE_ACCOUNT_KEY="./config/gsa.json"
export AIRTABLE_BASE_ID="your_base_id"
export AIRTABLE_API_KEY="your_airtable_key"

# 邮件配置
export SMTP_HOST="smtp.example.com"
export SMTP_PORT=587
export SMTP_USER="your_smtp_user"
export SMTP_PASSWORD="your_smtp_password"
export SMTP_FROM="partnerships@example.com"

# 可选配置
export CHANNEL_BD_LOG_LEVEL="info"
export CHANNEL_BD_DRY_RUN="false"
```

## 安全与合规

1. **API 密钥管理**: 所有密钥通过环境变量注入，禁止硬编码
2. **退订机制**: 维护抑制名单，尊重退订请求
3. **频控**: 遵守邮件服务商限制，避免被封
4. **日志审计**: 所有发送行为可追溯
5. **数据保留**: 定期清理敏感数据

## 扩展开发

### 添加新数据源
```typescript
interface DataSource {
  name: string;
  fetchProjects(): Promise<Project[]>;
  validate(project: Project): boolean;
}
```

### 添加新评分维度
```typescript
interface Scorer {
  name: string;
  score(project: Project): number;
  explain(project: Project): string;
}
```

### 添加新输出格式
```typescript
interface OutputAdapter {
  name: string;
  write(projects: Project[], contacts: Contact[]): Promise<void>;
}
```

## 故障排除

| 问题 | 可能原因 | 解决方案 |
|-----|---------|---------|
| API 限流 | 请求过于频繁 | 降低 limit，增加缓存 |
| 邮件发送失败 | 认证错误 | 检查 SMTP 凭证 |
| 网页抓取失败 | 反爬机制 | 使用官方 API 或降低频率 |
| 数据不一致 | 多数据源冲突 | 配置优先级，手动复核 |

## License

MIT
