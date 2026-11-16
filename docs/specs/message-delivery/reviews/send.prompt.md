# 评审材料：send（语义哈希 4d37ca376824b802）

## 待评审的设计图景

```text
入口由[会话交互](../conversation-ui/spec.md)提供当前账户、房间、草稿作用域与内容；权限由[房间与空间](../rooms-spaces/spec.md)提供，加密与身份边界见[账户与安全](../session-security/spec.md)。图中的取消只停止本地请求，不等于撤回服务端事件。

```text
用户对当前草稿发出发送意图（提交发送）
+-- 发送服务重新核对账户、房间、当前发送权限与草稿内容
    |-- 没有正文和可发送附件
    |   +-- 不创建消息、不清空引用或草稿；焦点保留编辑器 -> 编辑草稿
    |-- 身份、成员关系或权限不允许发送
    |   +-- 显示原因，原草稿完整保留；本次提交终止
    +-- 可以发送
        +-- 发送服务固定本次内容快照与事务身份，创建唯一的本地待发送项
            +-- 草稿服务把该快照交给待发送项，新输入进入下一份草稿 -> 准备发送

发送服务处理唯一的待发送项（准备发送）
|-- 当前离线
|   +-- 时间线显示“等待网络”，不是“已发送”
|       |-- 连接恢复 -> 按同一事务身份继续准备发送
|       +-- 用户取消 -> 停止该待发送项；内容仍可查看、复制或恢复到编辑器
|-- 附件准备上传或加密失败
|   +-- 待发送项显示失败原因，保留正文、引用与附件，不自动丢弃内容
|       |-- 用户重试 -> 按同一待发送项重新准备，不重建可见消息
|       +-- 用户取消 -> 停止该待发送项；内容仍可查看、复制或恢复到编辑器
+-- 附件与正文已按房间要求准备完成
    +-- 发送服务通过 Matrix SDK 向该房间提交事件 -> 等待确认

发送服务等待服务端与同步结果（等待确认）
|-- 服务端明确拒绝
|   +-- 同一待发送项显示原因，保留可恢复内容，不标记为送达
|       |-- 用户在原因解除后重试 -> 按同一事务身份重新提交，不创建第二条可见消息
|       +-- 用户取消 -> 停止该待发送项；本次发送终止，内容仍可恢复
|-- 超时或断线，服务端是否接受尚不确定
|   +-- 同一待发送项显示“发送结果待确认”，不是确定失败或确定成功
|       |-- 同步收到对应事件 -> 合并为同一条消息，显示服务端已接受；本次发送确认终止
|       |-- 恢复连接后仍需重试 -> 按同一事务身份重新提交，继续等待确认
|       +-- 用户取消继续尝试 -> 停止后续请求并说明已到服务端的事件不能由本地取消撤回
+-- 服务端返回事件标识，或同步先收到对应事件
    +-- 发送服务按事务与事件标识合并本地/远端回显，不重复展示
        +-- 时间线显示服务端已接受；不冒充其他设备送达或对方已读；本次发送确认终止

用户把已取消或失败待发送项恢复到编辑器
|-- 当前作用域草稿为空
|   +-- 恢复该项的正文、引用与可恢复附件，原待发送项停止重试 -> 编辑草稿
+-- 当前作用域已有新草稿
    +-- 不覆盖新输入，显示“保留现有草稿；可复制失败内容”
        +-- 用户复制内容或继续编辑现有草稿；本次自动恢复终止
```
```

## 待评审的嵌入语义

```haskell
module Semantics where

data Phase = Editing | Preparing | WaitingNetwork | PreparationFailed
  | Awaiting | OutcomePending | Rejected | Accepted | Stopped
  deriving (Eq, Ord, Show, Read, Enum, Bounded)
data Ev = Submit | Offline | PrepareOk | PrepareFail | Retry | Cancel
  | Timeout | ServerReject | AcceptedEvent | ConnectionRestored
  deriving (Eq, Ord, Show, Read, Enum, Bounded)
data Effect = QueueCreated | DraftAdvanced | SnapshotRecoverable
  | WaitingForNetwork | PayloadReady | RetryableFailure | CancelledLocally
  | OutcomeUnknown | ServerAccepted | EchoMerged | Unreachable
  deriving (Eq, Ord, Show, Read)
data Detail = NoDetail deriving (Eq, Ord, Show, Read)
data MS = MS { msState :: Phase, hasQueue :: Bool } deriving (Eq, Ord, Show, Read)
data Edge = Edge { eFrom :: MS, eEvent :: Ev, eTo :: MS, eEffects :: [Effect] }
  deriving (Eq, Show)
data PropName = TerminalIsClosed | AcceptanceReachable | CancellationReachable
  deriving (Eq, Ord, Show, Read)

states :: [Phase]
states = [minBound .. maxBound]
terminalStates :: [Phase]
terminalStates = [Accepted, Stopped]
events :: [Ev]
events = [minBound .. maxBound]
initialState :: Phase
initialState = Editing

transition :: Phase -> Ev -> (Phase, [Effect])
transition Editing Submit = (Preparing, [QueueCreated, DraftAdvanced, SnapshotRecoverable])
transition Editing Offline = (Editing, [Unreachable])
transition Editing PrepareOk = (Editing, [Unreachable])
transition Editing PrepareFail = (Editing, [Unreachable])
transition Editing Retry = (Editing, [Unreachable])
transition Editing Cancel = (Editing, [Unreachable])
transition Editing Timeout = (Editing, [Unreachable])
transition Editing ServerReject = (Editing, [Unreachable])
transition Editing AcceptedEvent = (Editing, [Unreachable])
transition Editing ConnectionRestored = (Editing, [Unreachable])
transition Preparing Submit = (Preparing, [Unreachable])
transition Preparing Offline = (WaitingNetwork, [WaitingForNetwork, SnapshotRecoverable])
transition Preparing PrepareOk = (Awaiting, [PayloadReady])
transition Preparing PrepareFail = (PreparationFailed, [RetryableFailure, SnapshotRecoverable])
transition Preparing Retry = (Preparing, [Unreachable])
transition Preparing Cancel = (Preparing, [Unreachable])
transition Preparing Timeout = (Preparing, [Unreachable])
transition Preparing ServerReject = (Preparing, [Unreachable])
transition Preparing AcceptedEvent = (Preparing, [Unreachable])
transition Preparing ConnectionRestored = (Preparing, [Unreachable])
transition WaitingNetwork Submit = (WaitingNetwork, [Unreachable])
transition WaitingNetwork Offline = (WaitingNetwork, [Unreachable])
transition WaitingNetwork PrepareOk = (WaitingNetwork, [Unreachable])
transition WaitingNetwork PrepareFail = (WaitingNetwork, [Unreachable])
transition WaitingNetwork Retry = (WaitingNetwork, [Unreachable])
transition WaitingNetwork Cancel = (Stopped, [CancelledLocally, SnapshotRecoverable])
transition WaitingNetwork Timeout = (WaitingNetwork, [Unreachable])
transition WaitingNetwork ServerReject = (WaitingNetwork, [Unreachable])
transition WaitingNetwork AcceptedEvent = (WaitingNetwork, [Unreachable])
transition WaitingNetwork ConnectionRestored = (Preparing, [])
transition PreparationFailed Submit = (PreparationFailed, [Unreachable])
transition PreparationFailed Offline = (PreparationFailed, [Unreachable])
transition PreparationFailed PrepareOk = (PreparationFailed, [Unreachable])
transition PreparationFailed PrepareFail = (PreparationFailed, [Unreachable])
transition PreparationFailed Retry = (Preparing, [SnapshotRecoverable])
transition PreparationFailed Cancel = (Stopped, [CancelledLocally, SnapshotRecoverable])
transition PreparationFailed Timeout = (PreparationFailed, [Unreachable])
transition PreparationFailed ServerReject = (PreparationFailed, [Unreachable])
transition PreparationFailed AcceptedEvent = (PreparationFailed, [Unreachable])
transition PreparationFailed ConnectionRestored = (PreparationFailed, [Unreachable])
transition Awaiting Submit = (Awaiting, [Unreachable])
transition Awaiting Offline = (Awaiting, [Unreachable])
transition Awaiting PrepareOk = (Awaiting, [Unreachable])
transition Awaiting PrepareFail = (Awaiting, [Unreachable])
transition Awaiting Retry = (Awaiting, [Unreachable])
transition Awaiting Cancel = (Awaiting, [Unreachable])
transition Awaiting Timeout = (OutcomePending, [OutcomeUnknown, SnapshotRecoverable])
transition Awaiting ServerReject = (Rejected, [RetryableFailure, SnapshotRecoverable])
transition Awaiting AcceptedEvent = (Accepted, [ServerAccepted, EchoMerged])
transition Awaiting ConnectionRestored = (Awaiting, [Unreachable])
transition OutcomePending Submit = (OutcomePending, [Unreachable])
transition OutcomePending Offline = (OutcomePending, [Unreachable])
transition OutcomePending PrepareOk = (OutcomePending, [Unreachable])
transition OutcomePending PrepareFail = (OutcomePending, [Unreachable])
transition OutcomePending Retry = (Awaiting, [SnapshotRecoverable])
transition OutcomePending Cancel = (Stopped, [CancelledLocally, OutcomeUnknown, SnapshotRecoverable])
transition OutcomePending Timeout = (OutcomePending, [Unreachable])
transition OutcomePending ServerReject = (OutcomePending, [Unreachable])
transition OutcomePending AcceptedEvent = (Accepted, [ServerAccepted, EchoMerged])
transition OutcomePending ConnectionRestored = (OutcomePending, [Unreachable])
transition Rejected Submit = (Rejected, [Unreachable])
transition Rejected Offline = (Rejected, [Unreachable])
transition Rejected PrepareOk = (Rejected, [Unreachable])
transition Rejected PrepareFail = (Rejected, [Unreachable])
transition Rejected Retry = (Awaiting, [SnapshotRecoverable])
transition Rejected Cancel = (Stopped, [CancelledLocally, SnapshotRecoverable])
transition Rejected Timeout = (Rejected, [Unreachable])
transition Rejected ServerReject = (Rejected, [Unreachable])
transition Rejected AcceptedEvent = (Rejected, [Unreachable])
transition Rejected ConnectionRestored = (Rejected, [Unreachable])
transition Accepted Submit = (Accepted, [Unreachable])
transition Accepted Offline = (Accepted, [Unreachable])
transition Accepted PrepareOk = (Accepted, [Unreachable])
transition Accepted PrepareFail = (Accepted, [Unreachable])
transition Accepted Retry = (Accepted, [Unreachable])
transition Accepted Cancel = (Accepted, [Unreachable])
transition Accepted Timeout = (Accepted, [Unreachable])
transition Accepted ServerReject = (Accepted, [Unreachable])
transition Accepted AcceptedEvent = (Accepted, [Unreachable])
transition Accepted ConnectionRestored = (Accepted, [Unreachable])
transition Stopped Submit = (Stopped, [Unreachable])
transition Stopped Offline = (Stopped, [Unreachable])
transition Stopped PrepareOk = (Stopped, [Unreachable])
transition Stopped PrepareFail = (Stopped, [Unreachable])
transition Stopped Retry = (Stopped, [Unreachable])
transition Stopped Cancel = (Stopped, [Unreachable])
transition Stopped Timeout = (Stopped, [Unreachable])
transition Stopped ServerReject = (Stopped, [Unreachable])
transition Stopped AcceptedEvent = (Stopped, [Unreachable])
transition Stopped ConnectionRestored = (Stopped, [Unreachable])

stepWith :: (Phase -> Ev -> (Phase, [Effect])) -> MS -> Ev -> (MS, [Effect])
stepWith trans original event =
  let (next, effects) = trans (msState original) event
  in if effects == [Unreachable]
     then (original, effects)
     else (MS next (next `notElem` [Editing, Accepted, Stopped]), effects)

edges :: [Edge]
edges =
  [ Edge from event to effects
  | state <- states, event <- events
  , let from = MS state (state `notElem` [Editing, Accepted, Stopped])
        (to, effects) = stepWith transition from event
  ]

reachable :: [Phase]
reachable = explore [initialState] []
  where
    explore [] seen = seen
    explore (state:rest) seen
      | state `elem` seen = explore rest seen
      | otherwise = explore (rest ++
          [msState (eTo edge) | edge <- edges, msState (eFrom edge) == state,
           eEffects edge /= [Unreachable]]) (state:seen)

propertyResults :: [(PropName, Int)]
propertyResults =
  [ (TerminalIsClosed, length [edge | edge <- edges,
       msState (eFrom edge) `elem` terminalStates, eEffects edge /= [Unreachable]])
  , (AcceptanceReachable, if Accepted `elem` reachable then 0 else 1)
  , (CancellationReachable, if Stopped `elem` reachable then 0 else 1)
  ]
traceExempt :: Ev -> Phase -> Phase -> [Effect] -> [Effect] -> Bool
traceExempt _ _ _ _ _ = False
marks :: MS -> [Detail]
marks _ = []
```

## 待评审的标签

```
state Editing = 已通过发送检查的草稿
state Preparing = 准备唯一待发送项
state WaitingNetwork = 等待网络恢复
state PreparationFailed = 准备失败且保留内容
state Awaiting = 等待服务端确认
state OutcomePending = 发送结果待确认
state Rejected = 服务端明确拒绝
state Accepted = 服务端已接受
state Stopped = 本次本地尝试已停止
event Submit = 固定快照并将后续输入交给新草稿
event Offline = 当前离线，保留待发送项
event PrepareOk = 正文与附件已准备并提交
event PrepareFail = 准备失败且内容可恢复
event Retry = 以同一事务身份重试
event Cancel = 停止本次后续尝试且保留内容
event Timeout = 提交后超时或断线，结果未知，不能判为失败
event ServerReject = 服务端明确拒绝且内容可恢复
event AcceptedEvent = 返回事件标识或同步确认，合并回显
event ConnectionRestored = 网络恢复后继续准备原待发送项
detail NoDetail = 无附加构型标记
```

## 评审清单

1. 这台机器是预言机：它判定观察是否合法，还是在规定实现必须调用的函数？后者记阻断。
2. 每个 state/event 的中文标签是否与该名字在语义中的角色一致（不误导）？
3. 每条 note 陈述的性质是否被嵌入语义支持（给出反例即不成立）？
4. 是否有语义中存在的关键行为未被标注、或被标注了语义不存在的行为？
5. 图上每条可达路径的后继是否与语义一致？逐事件核对标签和每条可达迁移（含失败观察）；冲突写 BLOCKING。
6. 标签是否与 spec 正文行为条款冲突？无设计图时明确记为迁移债务，不得声称 G0 已通过。

## 输出格式

- 逐条结论（引用标签名与语义依据）；
- 存在必须修复的问题时，每条以 `BLOCKING: <问题>` 单起一行；
- 无阻断问题时不必写 BLOCKING 行。
