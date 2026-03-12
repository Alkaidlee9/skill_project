# Channel BD Scripts

## init.js
初始化配置和目录结构

```bash
node scripts/init.js
```

## fetch.js
从数据源获取项目列表

```bash
node scripts/fetch.js --config ./config/channel-bd.json
```

## filter.js
执行硬过滤和评分

```bash
node scripts/filter.js --input ./cache/projects.json --config ./config/channel-bd.json
```

## scrape.js
抓取官网和社媒信息

```bash
node scripts/scrape.js --input ./cache/filtered.json --config ./config/channel-bd.json
```

## extract.js
抽取联系方式

```bash
node scripts/extract.js --input ./cache/scraped.json --output ./cache/contacts.json
```

## export.js
导出到 Google Sheets/Airtable/CSV

```bash
node scripts/export.js --input ./cache/contacts.json --config ./config/channel-bd.json
```

## send.js
批量发送邮件

```bash
node scripts/send.js --bucket A --config ./config/channel-bd.json
```

## logs.js
查看发送日志

```bash
node scripts/logs.js --since 24h
```
