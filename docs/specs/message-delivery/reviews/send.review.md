name: send
hash: 4d37ca376824b802
model: openai-codex/gpt-6.1-sol
date: 2026-11-16
---
# send 局部 G9 评审：图、语义与标签

- 日期：2026-11-16。
- 对象：`../spec.md` Draft 0.1 的 §1.0、`SEMANTICS:send` 与 `LABEL:send`；材料为 `send.prompt.md`。
- 当前有限复核的组合哈希：`4d37ca376824b802`，与主会话刷新通知及当前 `send.prompt.md` 标注一致。本轮未运行哈希重算、语义编译、渲染、测试或 `record/check`，最终新鲜性由主会话机械校验。
- 本会话可见模型标识：`openai-codex/gpt-6.1-sol`（环境公开值）。
- **限定结论：局部 G9 静态评审未发现图/标签/迁移效果的内部阻断；这不是十门全绿，也不是产品完成。**
- 完整 G0–G9 审查、实现证据、命令状态与产品未实现阻断见 [send.findings.md](send.findings.md)，其中 B8-01/B8-02 仍为未闭环 P1。真实 Matrix 发送、同步回显、取消及恢复未实现，G8 不通过；本报告不改变该结论。

## 1. 纠正记录、有限复核范围与预言机角色

原哈希 `b3a90a6813de72ec` 的本报告错误地以 REQ-003 一般规则为 Preparing/Awaiting 直接 Cancel 两条图外业务边补依据，原 G0/G7/G9 无冲突判断撤销。§1.0 只画等待网络、准备失败、明确拒绝及结果未知四处取消，规则不能代替缺失的图上动作。主会话未改确认图，而是将两格改为唯一效果 `[Unreachable]` 并收窄 REQ-003；本次核对当前 spec、刷新材料与已生成快照，确认两格不再是业务边，其他 16 条业务边不变。本报告的无残留内部阻断结论只适用于修正后哈希。

同时核对头部、REQ-001 与 D03：仅普通新消息（含回复/线程/附件）进入本域队列；编辑/反应/撤回/置顶由会话域关系服务持有。本次不审查该域 SDK 实现，也不把普通新消息的 Cancel 误作远端撤回。

本模型只投影已通过提交校验后的一次本地尝试。`QueueCreated`、`SnapshotRecoverable`、`EchoMerged` 等是观察枚举，不是实现必须调用的函数；模型没有 IO、main 或调用顺序协议，不把 AI 放进确定性执行路径。

`MS` 的 Bool 表示尝试是否活动，不表示内容存在。没有账户/房间/事务/事件/快照实体，不能证明 txidentity/content、真实去重、旧账户隔离或恢复完整性。§3.2 已明示这些边界，不把缺少实体另算内部矛盾，也不反过来把局部模型作为完整设计图或实现证据。

## 2. 状态、可达性与 16/74 计数

| state 与 LABEL | 从 Editing 出发的一条可达序列 |
|---|---|
| Editing：已通过发送检查的草稿 | 空序列 |
| Preparing：准备唯一待发送项 | Submit |
| WaitingNetwork：等待网络恢复 | Submit → Offline |
| PreparationFailed：准备失败且保留内容 | Submit → PrepareFail |
| Awaiting：等待服务端确认 | Submit → PrepareOk |
| OutcomePending：发送结果待确认 | Submit → PrepareOk → Timeout |
| Rejected：服务端明确拒绝 | Submit → PrepareOk → ServerReject |
| Accepted：服务端已接受 | Submit → PrepareOk → AcceptedEvent |
| Stopped：本次本地尝试已停止 | Submit → Offline → Cancel |

9 个状态仍均有标签、均可达。旧见证 Submit → Cancel 现命中占位，撤销；停止见证增加 Offline，接受见证不变。`detail NoDetail` 存在但 `marks _ = []`，没有附加构型事实；没有 note 宣称额外性质。

| event | 业务迁移数 | 非业务占位数 |
|---|---:|---:|
| Submit | 1 | 8 |
| Offline | 1 | 8 |
| PrepareOk | 1 | 8 |
| PrepareFail | 1 | 8 |
| Retry | 3 | 6 |
| Cancel | 4 | 5 |
| Timeout | 1 | 8 |
| ServerReject | 1 | 8 |
| AcceptedEvent | 2 | 7 |
| ConnectionRestored | 1 | 8 |
| **合计** | **16** | **74** |

**16 业务/74 占位成立**：90 格显式定义无 catch-all，16 条业务边的来源均可达。Preparing Cancel 与 Awaiting Cancel 现在分别返回原阶段及唯一效果 `[Unreachable]`，业务数减 2、占位数加 2；其他事件计数不变。这个数字仅针对每阶段规范活动位构型，不是任意 `MS Phase Bool` 组合、多项队列或完整真实网络输入域的穷举。

已静态检查消费方：`Driver/Render.hs:meaningfulEdges` 与 `Driver/Snapshot.hs:reachableEdges` 排除 Unreachable；`Driver/Trace.hs:checkScan` 命中占位输出 FAIL，而不是成功 no-op。`stepWith` 对占位返回原构型不使其成为业务自环；`traceExempt` 恒 False。`ConnectionRestored` 的空效果边因状态改变仍会渲染。未执行上述工具。

## 3. 每个事件的全部业务迁移、LABEL 与 effects

### Submit（1 条）

LABEL：**固定快照并将后续输入交给新草稿**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| Editing → Preparing | QueueCreated, DraftAdvanced, SnapshotRecoverable | 与图中有效草稿接管、唯一待发送项及新输入新草稿一致。空内容/权限拒绝在模型入口前，不消费该边；实际内容交接不由枚举证明。 |

### Offline（1 条）

LABEL：**当前离线，保留待发送项**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| Preparing → WaitingNetwork | WaitingForNetwork, SnapshotRecoverable | 提交前离线，等待网络而非成功、确定失败或已提交未知；原项仍可恢复。 |

### PrepareOk（1 条）

LABEL：**正文与附件已准备并提交**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| Preparing → Awaiting | PayloadReady | PayloadReady 与 Awaiting 后继合起来表示已准备并进入提交后的等待确认；无 ServerAccepted，不提前声称服务端接受。标签不是必须调用某函数的规定。 |

### PrepareFail（1 条）

LABEL：**准备失败且内容可恢复**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| Preparing → PreparationFailed | RetryableFailure, SnapshotRecoverable | 对应准备/上传/加密失败，进入准备失败状态并保留恢复能力；不冒充已提交未知或服务端接受。 |

### Retry（3 条）

LABEL：**以同一事务身份重试**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| PreparationFailed → Preparing | SnapshotRecoverable | 准备尚未完成，重新准备原待发送项；无 QueueCreated/DraftAdvanced。 |
| OutcomePending → Awaiting | SnapshotRecoverable | 图上连接恢复后仍需重试时重新提交原项、继续等待确认；不直接判成功。 |
| Rejected → Awaiting | SnapshotRecoverable | 图上拒绝原因解除后重新提交原项；不重新接管草稿、不创建第二条可见消息。 |

三条边都保持恢复能力，后继因准备状态不同而不同；并非同一前提的失败任意分叉。真实事务身份、连接恢复和原因解除 guard 未被编码为数据，属于 §3.2 明示抽象边界，不能据此宣称已被机械证明。

### Cancel（4 条）

LABEL：**停止本次后续尝试且保留内容**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| WaitingNetwork → Stopped | CancelledLocally, SnapshotRecoverable | 图上等待网络时取消，停止原项并保留内容。 |
| PreparationFailed → Stopped | CancelledLocally, SnapshotRecoverable | 图上准备失败后取消，失败快照仍可恢复。 |
| OutcomePending → Stopped | CancelledLocally, OutcomeUnknown, SnapshotRecoverable | 图上未知结果后取消继续尝试；远端未知事实不因本地停止消失。 |
| Rejected → Stopped | CancelledLocally, SnapshotRecoverable | 图上明确拒绝后取消，拒绝事实已知，不追加未知。 |

四条业务边都只有 Stopped 后继、均保留内容，仅 OutcomePending 额外带 OutcomeUnknown；没有 redact/撤回效果。Stopped 的活动位 False 不表示删除快照。

有限复核的两格：`transition Preparing Cancel = (Preparing, [Unreachable])`、`transition Awaiting Cancel = (Awaiting, [Unreachable])`。两格均只含占位效果，不附带 CancelledLocally/SnapshotRecoverable，不再进入业务渲染或快照。当前生成状态图及 send.snap 也没有这两条直接取消业务边。不能再用一般需求规则为图外动作补依据。

### Timeout（1 条）

LABEL：**提交后超时或断线，结果未知，不能判为失败**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| Awaiting → OutcomePending | OutcomeUnknown, SnapshotRecoverable | 提交后超时/断线走未知，既非 RetryableFailure 也非 ServerAccepted。与提交前 Offline 严格分开。 |

### ServerReject（1 条）

LABEL：**服务端明确拒绝且内容可恢复**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| Awaiting → Rejected | RetryableFailure, SnapshotRecoverable | 只有明确拒绝事实走 Rejected；不把通用网络错误猜成拒绝、不标记接受。 |

PrepareFail 与 ServerReject 标签不同、阶段不同；effects 相同不使两者成为同一失败前提。

### AcceptedEvent（2 条）

LABEL：**返回事件标识或同步确认，合并回显**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| Awaiting → Accepted | ServerAccepted, EchoMerged | 正常响应或同步先到，合并为同一消息并结束本地确认；无对方已读/其他设备送达承诺。 |
| OutcomePending → Accepted | ServerAccepted, EchoMerged | 未知结果收到对应确认，走相同终点与效果，不另建消息。 |

真实事务/事件关联及去重尚非本模型可证明事实。

### ConnectionRestored（1 条）

LABEL：**网络恢复后继续准备原待发送项**。

| 来源 → 后继 | effects | 核对 |
|---|---|---|
| WaitingNetwork → Preparing | [] | 尚未提交项回准备阶段；状态变化本身可观察，空效果不等于 no-op。没有重复 QueueCreated 或 DraftAdvanced；“原项”的真实身份仍属外部契约。 |

## 4. 图上同一种失败的后继

| 对象、阶段与已知失败 | 唯一直接结果/后继 |
|---|---|
| 提交前空内容 | 不入队，保留引用/草稿，回编辑 |
| 提交前身份/成员/权限拒绝 | 原草稿保留，显示原因，本次提交终止 |
| 准备阶段离线 | WaitingNetwork |
| 上传/加密等准备失败 | PreparationFailed |
| 提交后服务端明确拒绝 | Rejected |
| 提交后超时/断线且接受不明 | OutcomePending |
| 图上四个入口的本地取消 | Stopped；仅 OutcomePending 来源另保留 OutcomeUnknown |
| 恢复时原作用域已有新草稿 | 不覆盖，只提供复制，自动恢复终止 |

在同一对象、阶段和已知事实下没有两个竞争的直接失败后继。失败后的重试/取消/确认是不同后续事件，不是失败本身的不确定转移。

## 5. 终点、域外消费者和不补事件的边界

- Accepted、Stopped 没有业务出边；终点上的 AcceptedEvent 等为占位，不代表系统可丢弃远端事件。
- §3.1 回显合并与 §3.4 明定后续同步由事件视图消费；§5/§7 明定本地停止后已接受事件仍可显示。重复同步、终点晚到确认及恢复不在本次自动机重复补业务事件。
- 取消不是撤回。尚未确认时本地停止后仍可能出现服务端事件，必须由域外事件视图接收并维持正确账户/作用域。
- 内容恢复由恢复入口向草稿服务交付原作用域快照，空草稿接收、非空不覆盖。不是为了全格而增加 Stopped → Editing。
- 当前产品尚无这些协议/恢复消费者；目标责任清楚不等于实现存在。完整报告 B8-01/B8-02 保留该产品验收阻断。

## 6. G0/G7/G9 有限复核与最终裁决

| 门 | 修正后的局部判断 |
|---|---|
| G0 | 图保持不动；四个取消入口有明确动作节点。删除两条图外业务边后，不能再以 REQ-003 一般规则补图。旧版接受两条图外边的判断已撤销。 |
| G7 | 两格仅为 `[Unreachable]`，不再生成业务边；当前 RENDERED/send.snap 均显示四条 Cancel、合计 16 业务边，其他 12 边不变。9 状态仍可达，停止见证改为 Submit → Offline → Cancel。仍是 legacy/unverified，不是 strict pass。 |
| G9 | 当前哈希 4d37ca376824b802 的四条 Cancel 与图、LABEL、收窄 REQ-003 一致，16/74 计数与有效终点见证对应。本次有限复核未发现残留内部阻断；未运行正式哈希/record/check 门。 |

三条性质只涉及终点业务闭合、存在接受路径、存在停止路径，不保证所有执行最终完成，也不证明资源、性能、恢复窗口或真实身份稳定。16/74 仅是本局部定义的静态计数，不能当完整网络输入域已闭合；effects 名字不能充当内容/去重证据。读取主会话重生成快照及其 PASS 文本不是 reviewer 本轮运行结果。

**局部 G9 裁决：旧版图外两边已删除，本次修正后无残留图/语义/标签阻断；主会话仍须校验哈希与正式评审留档。完整验收裁决不变：Draft，G8 产品未实现，完整报告 B8-01/B8-02 均保留；不得据此宣布全十门通过、authoritative 或 strict pass。**
