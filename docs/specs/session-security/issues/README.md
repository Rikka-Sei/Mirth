# issues/ 使用规则

本目录登记尚未由 §9 决策闭环的问题与风险，是非规范性调查记录；行为提案见 [spec](../spec.md)。一个问题一个 `YYYY-MM-DD-<中文短slug>.md` 文件；状态原地流转 `open` → `resolved`/`wontfix`，关闭时填写 §9 决策 ID，不移入 history。与问题无关的变更不改 issue 状态。

## 文件骨架

```markdown
# <问题标题> — Issue
**状态:** open / resolved / wontfix
**发现日期:** YYYY-MM-DD
**最后更新:** YYYY-MM-DD
**来源:** 文档调查 / 代码审计 / 测试 / 用户反馈
**关联章节:** §x.y / REQ-xxx
**关联决策 ID:** 未归因 / Dxx
## 1. 现象
## 2. 证据链
## 3. 根因
## 4. 影响
## 5. 建议
## 6. 闭环记录
```

## 当前问题

- [认证、设备与密钥协议映射待核验](2026-11-16-安全协议映射待核验.md) — open
