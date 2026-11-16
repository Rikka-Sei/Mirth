# send 独立只读评审

- 日期：2026-11-16。
- 规格：`docs/specs/message-delivery/spec.md`，Draft 0.1，D01–D03。
- 材料：`reviews/send.prompt.md`。本次有限复核的图/语义/标签组合哈希：`4d37ca376824b802`，与主会话刷新通知及当前材料标注一致；未运行哈希重算或评审门，不冒充机器校验结果。
- 本会话可见模型标识：`openai-codex/gpt-6.1-sol`（环境公开值，不推测其他部署名称）。
- 范围：设计图、完整 send 迁移表、全部 LABEL、错误/需求/验收，以及 Demo 的发送入口、数据模型、渲染消费者和现有测试源码。只新增本报告及主会话另行要求的 [send.g9.findings.md](send.g9.findings.md)，不修改 spec、产品或其他评审留档。后者仅限定局部 G9，不覆盖本报告的 G8 产品验收阻断。
- 差异说明：只读执行的 `git diff -- docs/specs/message-delivery src/model.ts src/main.ts tests/model.test.ts` 和对应目录的 `git diff --cached` 均无输出。本报告审查任务指定的当前文件与材料，不据此声称这些文件没有未跟踪改动，也不把继承的未实现事项说成本次拆分新增回归。
- 未运行任何检查、测试、构建、格式化、语义编译、快照更新、`--record` 或 `--check`。以下“静态一致”均为源码与文本核对，不是运行通过。

## 1. 结论、纠正原因与两类阻断的区别

**结论：保持 Draft；不能作为 authoritative、strict pass 或产品完成的依据。**

**纠正记录：** 原哈希 `b3a90a6813de72ec` 的报告错误地用 REQ-003 的一般取消规则，为图中不存在的 `Preparing → Stopped`、`Awaiting → Stopped` 直接 Cancel 业务边补依据。图在准备段只画等待网络/准备失败后取消，在确认段只画明确拒绝/结果未知后取消。原先对这两边的 G0/G7/G9 无冲突判断撤销；旧版 18/72 只是表格算术成立，不代表 18 条边都是合法设计投影。主会话保持已确认图不动，将两格收缩为唯一效果 `[Unreachable]`，并将 REQ-003 限于图上四个入口。本次只有限复核这些变更及其计数、终点见证和结论，不为过门补图或补事件。

**范围补充：** 已阅读当前头部、REQ-001、REQ-003 与 D03：本域只处理普通新消息（含回复、线程与附件）；编辑/反应/撤回/置顶归会话交互域关系服务，不进入普通发送队列。这是边界核对，不是对该域 SDK 实现作出验收。

1. **G9 内部模型审查：** 修正后 16 条业务迁移与图上动作一致；9 个状态仍可达，16 业务/74 非业务占位成立。两格图外业务边已删除，本次有限复核未发现残留内部阻断。这里没有以“缺少事务/内容实体”另立模型内部阻断，因为该边界已经明示。
2. **G8 产品审查：** 真实发送、同步/回显、取消及恢复未实现，存在下文两项 P1 验收阻断。Demo 的“仅本地”结果准确，但不能满足真实发送规格。
3. **G4/G7/G9 机械验收：** 本轮没有运行。既有结构审计记录、保存的快照或此处人工表格都不能代替实际运行与新鲜留档。
4. 本报告保留真实的 `BLOCKING:` 行。共享 `spec_review.py` 的 `cmd_check` 按正文中该前缀查找阻断，不区分 G8/G9；直接把本报告 record 后不应期待评审门全绿。不能删除 G8 阻断再把本次完整审查说成通过。

## 2. 16/74 的静态核算及可达性

模型有 9 个 `Phase`、10 个 `Ev`，`transition` 显式列出 90 格，无兜底分支。“不可达”仅指模型指定 `[Unreachable]`，不证明所有真实网络输入都不可能发生。

| event | 业务格 | `[Unreachable]` 格 | 有业务迁移的来源状态 |
|---|---:|---:|---|
| Submit | 1 | 8 | Editing |
| Offline | 1 | 8 | Preparing |
| PrepareOk | 1 | 8 | Preparing |
| PrepareFail | 1 | 8 | Preparing |
| Retry | 3 | 6 | PreparationFailed、OutcomePending、Rejected |
| Cancel | 4 | 5 | WaitingNetwork、PreparationFailed、OutcomePending、Rejected |
| Timeout | 1 | 8 | Awaiting |
| ServerReject | 1 | 8 | Awaiting |
| AcceptedEvent | 2 | 7 | Awaiting、OutcomePending |
| ConnectionRestored | 1 | 8 | WaitingNetwork |
| **合计** | **16** | **74** | **90 格** |

两格修正为 `transition Preparing Cancel = (Preparing, [Unreachable])`、`transition Awaiting Cancel = (Awaiting, [Unreachable])`，没有混入取消/恢复效果，也不是合法自环。其他事件计数不变。所有 16 条业务边的来源状态仍可达：

| state 及 LABEL | 从 initialState 出发的见证事件序列 |
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

旧见证 Submit → Cancel 现命中占位，撤销。Stopped 也可由 Submit → PrepareFail → Cancel 或两条提交后失败/未知路径到达；接受及停止的存在可达性未因删除两边消失。计数仅适用于每阶段规范活动位构型，不是任意 `MS Phase Bool` 组合或多发送项系统的穷举。

### 占位格的消费方

已阅读固定驱动的实际消费位置，而不只看模型生成边：

- `Driver/Render.hs` 的 `meaningfulEdges` 过滤包含 `Unreachable` 的边；非自环的 `WaitingNetwork → Preparing` 即使 effects 为空也会保留。
- `Driver/Snapshot.hs` 的 `reachableEdges` 同样过滤该占位，不把当前 74 格写成业务迁移。本次读取主会话重生成的 `snapshots/send.snap`，其中列出 16 条业务边，已无 Preparing/Awaiting 的直接 Cancel；这是读取文件，不是本 reviewer 重算或运行快照一致性门。
- `Driver/Trace.hs` 的 `checkScan` 在期望效果含 `Unreachable` 时输出 `FAIL ... unreachable`，不会默默当作成功 no-op。
- `traceExempt` 恒为 False，没有把不一致输入豁免为合法行为的路径。

以上是工具消费者的静态确认。产品没有接入这套事件分派，不能据此证明产品会正确消费协议回调。

## 3. 逐事件核对：全部 16 条业务迁移

表中的效果是必须成立的抽象观察，不是必须按顺序调用的函数。核对依据为 spec §1.0、§3.1–3.2、REQ-001–003、§5 与相应迁移声明。

| # | event 与完整 LABEL | 来源 → 后继 | effects（原顺序） | 图、标签与效果的核对 |
|---:|---|---|---|---|
| 1 | Submit：固定快照并将后续输入交给新草稿 | Editing → Preparing | QueueCreated, DraftAdvanced, SnapshotRecoverable | 与图中通过校验后的快照接管、唯一待发送项、新输入新草稿一致。空内容/无权限不属于这个已通过检查的 Editing 输入域，不能据此认为校验失败也会入队。快照实际内容不由本模型证明。 |
| 2 | Offline：当前离线，保留待发送项 | Preparing → WaitingNetwork | WaitingForNetwork, SnapshotRecoverable | 对应传输提交前离线，显示等待网络并保留项；没有 ServerAccepted、RetryableFailure 或 OutcomeUnknown。与 §5 的提交前边界一致。 |
| 3 | PrepareOk：正文与附件已准备并提交 | Preparing → Awaiting | PayloadReady | PayloadReady 表示准备结果，Awaiting 后继表示该步已提交、进入等待确认；不能将 PayloadReady 单独误读为服务端接受。标签“提交”与目标状态合看一致，无 ServerAccepted。准备及提交的真实 SDK 调用不在此证明。 |
| 4 | PrepareFail：准备失败且内容可恢复 | Preparing → PreparationFailed | RetryableFailure, SnapshotRecoverable | 对应上传/加密等准备失败，原因可见、内容可恢复；不进入结果未知或已接受。 |
| 5 | Retry：以同一事务身份重试 | PreparationFailed → Preparing | SnapshotRecoverable | 重新准备原待发送项，不产生 QueueCreated 或 DraftAdvanced，与准备失败的重试后继一致。保持真实事务/快照身份仅为正文契约，本模型无实体证据。 |
| 6 | Retry：以同一事务身份重试 | OutcomePending → Awaiting | SnapshotRecoverable | 对应连接恢复后仍需重试的重新提交，继续等待确认，不新建可见项、不声称成功。连接条件与事务身份未编码为可检查数据，不能由本边证明重试 guard 或身份复用实现。 |
| 7 | Retry：以同一事务身份重试 | Rejected → Awaiting | SnapshotRecoverable | 对应原因解除后重新提交原事务；不是重新接管草稿，也不重新创建消息。原因解除条件与身份事实仍依赖适配与实现核验。 |
| 8 | Cancel：停止本次后续尝试且保留内容 | WaitingNetwork → Stopped | CancelledLocally, SnapshotRecoverable | 图明确列出等待网络时取消；停止原项、保留可恢复内容，不是发送成功。 |
| 9 | Cancel：停止本次后续尝试且保留内容 | PreparationFailed → Stopped | CancelledLocally, SnapshotRecoverable | 图明确列出准备失败后取消；失败快照仍可恢复。实际恢复由域外入口负责。 |
| 10 | Cancel：停止本次后续尝试且保留内容 | OutcomePending → Stopped | CancelledLocally, OutcomeUnknown, SnapshotRecoverable | 图明确列出结果未知后取消继续尝试；保留远端未知，不把本地停止解释为远端撤回。 |
| 11 | Cancel：停止本次后续尝试且保留内容 | Rejected → Stopped | CancelledLocally, SnapshotRecoverable | 图明确列出拒绝后取消；拒绝事实已知，不追加 OutcomeUnknown，内容仍可恢复。 |
| 12 | Timeout：提交后超时或断线，结果未知，不能判为失败 | Awaiting → OutcomePending | OutcomeUnknown, SnapshotRecoverable | 已提交后超时/断线，不带 RetryableFailure 或 ServerAccepted，与提交前 Offline 分开。 |
| 13 | ServerReject：服务端明确拒绝且内容可恢复 | Awaiting → Rejected | RetryableFailure, SnapshotRecoverable | 明确拒绝与通用网络错误分开，不标记已接受。 |
| 14 | AcceptedEvent：返回事件标识或同步确认，合并回显 | Awaiting → Accepted | ServerAccepted, EchoMerged | 正常响应或同步先到走同一接受终点并合并回显；不承诺已读或其他设备送达。真实去重不由枚举证明。 |
| 15 | AcceptedEvent：返回事件标识或同步确认，合并回显 | OutcomePending → Accepted | ServerAccepted, EchoMerged | 未知结果收到对应确认，与上一接受边的后继及效果一致，不新建消息。 |
| 16 | ConnectionRestored：网络恢复后继续准备原待发送项 | WaitingNetwork → Preparing | [] | 状态变化表示继续准备；没有 QueueCreated/DraftAdvanced，不为非空效果发明步骤。原项实际身份仍属模型边界。 |

### 事件标签与状态标签的补充判断

- 10 个 event 标签互不相同，9 个 state 都有标签；没有同名异义的第二套状态定义。
- Cancel 当前只有上述四条业务边，均逐一对应图上取消入口；仅 OutcomePending 追加 OutcomeUnknown。Preparing Cancel 与 Awaiting Cancel 的唯一效果现为 `[Unreachable]`，不在业务表内，不能继续援引 REQ-003 为它们补依据。
- Retry 的三条边共享标签并保留恢复能力，后继区别来自准备是否已经完成；不能为了统一后继而把所有失败都送回 Preparing，也不能因 effects 未出现虚构的 TxIdentityPreserved 就否定已声明的抽象边界。
- PrepareFail 与 ServerReject 的中文标签不同，且分别对应准备失败/明确拒绝；虽然 effects 相同，后继不同有阶段依据，没有使用同一失败标签隐藏两种任意后继。
- `detail NoDetail` 有定义，但 `marks _ = []`，未产生虚假的附加构型事实；没有 note 声称模型证明了事务身份、内容恢复或真实协议发送。
- `hasQueue` 在 Accepted/Stopped 为 False 表示尝试不再活动。§3.2 明说它不表示快照是否仍存在，因此不能把本地停止解读为删除可恢复内容。

## 4. 设计图上失败后继是否唯一

以对象、阶段和已知事实共同识别失败，不把用户随后的不同选择误判为一次失败的歧义。

| 前提与失败 | 唯一直接业务结果/后继 | 后续选择及一致性 |
|---|---|---|
| 提交检查：无正文及可发送附件 | 不创建项，原草稿/引用不变，返回编辑 | 位于局部模型入口之前，无 Submit 业务边消费这种无效草稿。 |
| 提交检查：身份/成员/权限拒绝 | 显示原因，原草稿保留，本次提交终止 | 安全/房间域裁决原条件；没有偷偷进入 Preparing 的分支。 |
| 待发送项未交给传输层且离线 | WaitingNetwork | 恢复连接回 Preparing，取消到 Stopped；两者为后续不同事件。 |
| 上传/加密等准备失败 | PreparationFailed | Retry 回 Preparing，Cancel 到 Stopped。 |
| 已提交且明确被服务端拒绝 | Rejected | Retry 回 Awaiting，Cancel 到 Stopped。与准备失败阶段不同，不强行合并。 |
| 已提交后超时/断线，接受事实不明 | OutcomePending | 对应确认到 Accepted；必要重试到 Awaiting；取消到 Stopped 并仍保留未知事实。 |
| 图上等待网络/准备失败/明确拒绝/结果未知后本地取消 | Stopped | 当前四条业务 Cancel 都只到 Stopped；仅 OutcomePending 来源另保留 OutcomeUnknown，不产生远端撤回。Preparing/Awaiting 直接 Cancel 为非业务占位。 |
| 恢复时当前作用域已有新草稿 | 保留新草稿，仅提供复制，自动恢复终止 | 草稿服务消费，不将新输入交给已终止尝试，也不扩充 send 自动机。 |

**静态判断：按图上实际画出的失败分类，同一对象、同一阶段、同一已知事实没有两个竞争的直接失败后继。** 提交前 Offline 与提交后 Timeout 不是同一种输入事实；将两者合并为确定失败会违背图和 REQ-002。

### 终点、晚到结果与域外消费

- Accepted、Stopped 的各 10 个 event 格均为非业务占位，表示这次本地自动机结束，不表示协议事件从系统中消失。
- §3.1 回显合并、§3.4 的“后续同步仍由事件视图消费”、§5 本地停止及 §7 晚到远端事件共同指定了域外消费者。取消不是 redact；不应为晚到确认或重复同步给已终止自动机补一轮 AcceptedEvent/Cancel 等业务自循环。
- 恢复失败内容由恢复入口向草稿服务提交原作用域快照；空草稿接收、非空不覆盖。该责任不由 Stopped → Editing 之类的新边承担。
- 这些是目标责任分配，**不是已有实现链路**。当前代码只有本地消息渲染消费者，见 G8 阻断。

## 5. 模型能证明和不能证明什么

### 能由本次静态阅读确认的局部性质

- 90 格显式定义，业务格和非业务占位可区分。
- 所有阶段可达；业务边中存在到 Accepted、Stopped 的路径。
- 终止状态无业务出边；三条 `propertyResults` 分别检查终点闭合、存在接受路径、存在取消路径。
- LABEL 与本报告列出的每条业务边在该抽象粒度下相容。

### 不能据此外推的内容

- `MS` 只有阶段与活动位，没有账户、房间、事务 ID、事件 ID、内容、引用或附件实体，因而不能证明 txidentity/content、跨账户隔离、恢复数据完整性、去重或单项同时提交数。
- QueueCreated、SnapshotRecoverable、EchoMerged 等名字只是效果枚举；名称存在不证明实现已经创建、保留或合并任何数据。
- 可达性是存在一条成功路径，不是所有重试最终成功，也不保证网络恢复、取消响应时间或无无限重试。
- “原因解除后重试”“恢复连接后重试”等前提没有具体观测字段，不提供实际 SDK guard 的机械证明。
- 当前 74 个占位只说明模型选择拒绝哪些输入组合，不证明 SDK/操作系统永远不会给出这些组合，尤其不能用作真实产品输入路由的丢弃规则。删除两条图外边只修正局部投影，不构成完整协议输入闭合证明。
- 校验拒绝、容量拒绝、终止后恢复、重复同步与终点晚到展示没有因此被全图机械证明。前两者在模型入口外，后几者有图上域外责任；队列预算另属未确认提案。
- 现有文本快照显示三个性质为 PASS，仅说明已有文件写了这些结果；本轮未重新计算，且即使重新通过也不等于 G8。

以上局限在 §3.2、D03 与 open issue 中已明示，**不把“局部旧代模型无法证明 txidentity/content”再包装为新的 G9 内部缺陷**。但这些限制必须保留在验收结论中，不能反向当成真实协议正确的依据。

## 6. G0–G9 分级

“静态通过”只覆盖本次已阅读的范围；“未验证”不等于失败重现，也不等于 PASS。

| 门 | 本轮等级/状态 | 证据与限制 |
|---|---|---|
| G0 设计图 | 修正后局部静态可接受，旧版错误判断已撤销 | 不改已确认图；删除 Preparing/Awaiting 直接取消两条图外业务边后，16 条业务边均有图上依据。四个取消入口与收窄后的 REQ-003 一致，不能用一般规则替图增边。入口前条件与域外恢复仍不能由局部模型代证。 |
| G1 精确/可追溯 | 部分满足，Draft 待补充 | REQ-001–003 各有唯一 ID、P0、角色与 Given/When/Then；REQ-001 明定普通新消息入口，REQ-003 明定四种可取消前提。尚无具体协议请求/响应/错误样例，不能当成熟接口验收。 |
| G2 异常/NFR | 部分满足；未完成产品验收 | §5/§7 明确离线、未知、拒绝、停止、恢复冲突和旧账户结果；§6 的队列 100 与日志预算属于 D03 提案，未批准/未实测。未给出的恢复窗口、性能、资源生命周期证据不能按量化 NFR 已全过。 |
| G3 内部一致 | 修正后局部静态可接受 | 十事件/16 业务边、REQ-003 四种入口与图相容；活动位不是内容存在位；同一失败没有竞争后继。普通新消息与会话关系动作队列边界已区分。 |
| G4 实测全绿 | 未满足产品验收；本轮未执行 | tools/README.md 的既有 28 负例/audit PASS/空屏障 SKIP 不能充当本次修正后实跑证据。主会话负责统一验证；本 reviewer 未复跑，manifest 的实现/测试/屏障锚点仍不能证明产品完成。 |
| G5 治理/元信息 | 静态可接受 | Draft、版本、受众、范围、治理、历史齐全；D03 记录删除两条图外边及引用会话域关系动作决策；协议核验 issue 仍 open。未执行提交或历史改写。 |
| G6 外部输入 | 图上静态覆盖；实现覆盖未满足 | §3.4 与 §5 对已画输入给出结果和消费者；当前 74 占位不能证明图外真实输入不可能到达。目标测试与 SDK 路由尚不存在。 |
| G7 内嵌语义 | 图外投影问题修正；仍 legacy/unverified，非 strict pass | 已读两格唯一效果 `[Unreachable]`、当前 RENDERED 和 send.snap：两条直接取消业务边均消失，余 16 边不变。9 状态仍可达，Stopped 见证改为 Submit → Offline → Cancel；没有把读取生成文件说成 reviewer 编译/重算通过。 |
| G8 spec↔实现 | **P1 BLOCKING，产品未实现** | 下文 B8-01、B8-02 保留。现有 Demo 的仅本地行为不代表真实普通新消息发送、四种入口取消或恢复已实现。 |
| G9 图/语义/LABEL 评审 | 修正后有限静态复核无残留内部阻断；正式门未执行 | 当前哈希 4d37ca376824b802；四条 Cancel 与图一致，计数 16/74，终点见证有效，其他 12 业务边及 LABEL 不变。原版以规则补图的结论撤销；G8 未闭环 BLOCKING 不能因局部 G9 可接受而删除。 |

## 7. 必须保留的产品验收阻断（与 G9 内部模型问题分开）

### B8-01 · P1 · REQ-001/002 的协议发送与结果处理未实现

BLOCKING: [G8/B8-01/P1] 真实 Matrix 提交、提交前等待网络、提交后结果未知、明确拒绝、稳定事务重试及响应/同步回显合并均未实现；不能将当前本地消息追加判为符合 REQ-001/002 或 AC-001/002。

- **规格位置：** `spec.md:27–52` 的准备/确认图；`spec.md:87–91` 的身份及模型边界；§4 REQ-001/002、§7、AC-001/002。
- **实现证据：** `src/main.ts:315–329` 的 `submitMessage` 仅调用 `sendLocalMessage` 并播报“未发送到服务器”；`src/model.ts:26–48` 只检查本地 room/draft、空内容和每房间本地消息数量，构造 `local-*` ID，追加数组并清本地草稿。没有账户/权限验证、SDK 提交、事务/事件关联或确认状态。`src/data.ts:21` 的消息状态只允许 `local`，`src/main.ts:171` 的消费分支只显示“仅本地”。`package.json` 没有 SDK 依赖。
- **现有测试证据：** `tests/model.test.ts` 三个测试分别是房间草稿归属、空白/纯附件本地发送、筛选；没有协议状态测试。本轮只读源码，没有执行它们。
- **触发与影响：** 对有效草稿执行发送，当前只能得到本地项，不能完成服务端接受或正确展示真实离线/未知/拒绝结果。不是 Demo 误报成功的回归，而是目标产品的必需链路尚不存在。
- **解除条件：** 实际接入 SDK 发送及同步结果消费，逐项核对 AC-001/002 的有效/拒绝/离线/未知/同步先到/重复结果与账户归属，补真实实现位置和执行证据；不以当前局部模型或既有 Demo 通过替代。

### B8-02 · P1 · REQ-003 的停止、晚到展示与恢复未实现

BLOCKING: [G8/B8-02/P1] 产品没有待发送项的取消/恢复入口及对应消费者，无法验证停止后续请求、不撤回远端事件、晚到事件仍展示或恢复不覆盖新草稿；REQ-003 与 AC-003 尚未实现。

- **规格位置：** `spec.md:48`、`spec.md:54–58`、`spec.md:73`、§3.1“恢复入口”、REQ-003、§5 本地停止/恢复冲突、§7 晚到/恢复边界。
- **实现证据：** `src/model.ts` 的 `DemoState` 只有 rooms/drafts/localCounts，发送后只有本地消息；没有活动待发送项、请求生命周期或失败快照恢复操作。`src/main.ts:315–329` 成功后直接刷新本地视图，没有取消或恢复分派；`src/data.ts:10–21` 也没有发送中/停止/失败结果。`spec.md` §7 自身明确目标恢复入口与协议链路未接线。
- **现有测试证据：** `tests/model.test.ts` 未覆盖取消与同步竞态、原作用域恢复、非空草稿保护。没有本轮执行结果。
- **触发与影响：** 用户需要停止失败/未知发送或取回已交接内容时，现有产品没有本规格要求的操作及可观察结果；不能用 `Stopped` 在模型中可达证明产品已有取消。
- **解除条件：** 接入真实发送项停止及草稿恢复消费方；核对停止后的重试数为 0、晚到同步仍进入正确事件视图、空草稿恢复/非空只复制。无需给已终止的本次自动机额外补业务事件，也不要求新增专用 trace 协议。

**G9 内部模型问题清单：原版 Preparing/Awaiting 直接 Cancel 的图外投影问题现已通过删除两条业务边修正；本次有限复核未发现残留图/标签/effects 冲突。原先以一般规则补图的判断明确撤销。** 上述 G8 两项仍保持 open；这不构成完整规格或产品通过。

## 8. 实际操作、已有证据与后续裁决

首轮读取技能/质量门/规格/材料/实现/测试源码/工具消费者并执行只读 diff；本次有限复核读取更新后的 spec、prompt、快照及两份报告，仅更新两份 findings。没有重跑检查或重新审查产品实现。以下命令均不写成“本轮成功”：

| 检查 | 本轮实际状态 | 可引用的既有材料 |
|---|---|---|
| `python3 docs/specs/message-delivery/tools/test_audit_spec.py` | 未运行 | tools/README.md 记载 28 项通过；属于既有记录。 |
| `python3 docs/specs/message-delivery/tools/audit_spec.py` | 未运行 | tools/README.md 记载 PASS；仅结构审计。 |
| `python3 docs/specs/message-delivery/tools/barriers.py` | 未运行 | tools/README.md 记载空屏障 SKIP；manifest 确实为空。 |
| 共享语义/快照/渲染门 | 未运行 | 只读取已有 send.snap；不宣称重新求值通过。 |
| 评审哈希重算、`--record`、`--check` | 未运行 | 当前仅使用主会话刷新通知与 send.prompt.md 标注的 4d37ca376824b802；旧哈希不再作为本轮有效材料。 |
| Demo 测试、类型检查、构建、真实浏览器 | 未运行 | 本轮只读测试源码；主会话既有运行不能外推为协议发送通过。 |

整改/裁决顺序：先保持已确认图与事务/内容边界不被错误扩写；再完成 B8-01/B8-02 的真实实现与契约；由主会话运行相应验收并保留输出；最后根据新鲜图/语义/标签哈希决定 record/check 与状态升级。本报告不改 spec，不替用户批准 D03 数值，不把产品未实现隐藏在 G9 局部静态核对结论中。
