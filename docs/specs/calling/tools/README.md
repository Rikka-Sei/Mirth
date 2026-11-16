# 本域验证工具

本目录是 core-spec 模板审计器的自包含副本；共享语义提取/编译/评审工具仍在技能目录，不复制到本目录。

从仓库根目录运行：

```sh
python3 docs/specs/calling/tools/test_audit_spec.py
python3 docs/specs/calling/tools/audit_spec.py
python3 docs/specs/calling/tools/barriers.py
```

2026-11-16 实际结果：负例自测 28 项通过；结构审计 PASS；屏障输出 `[SKIP] manifest 未声明任何屏障`。空屏障不是产品通过，不存在虚构的实现/测试锚点。message-delivery 初次审计提示缺外部输入矩阵，已补图中可达输入并另行复查。

状态保持 Draft。审计只证明结构；图的路径、语义与标签由独立审阅核对，未实现契约仍是未闭环事项。

本域尚未建立有限事件机械语义；缺少 G7/G8 的真实协议与实现证据，不升级 authoritative。
