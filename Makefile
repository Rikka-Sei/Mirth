PYTHON ?= python3
SKILLS_ARGS ?=
SKILLS_INSTALLER := scripts/builder/skills/install.py

# 默认安装 obra/superpowers 和 Rikka-Sei/.Rikki 到 .claude/skills/；位置参数可覆盖来源。
# --copy -a claude-code -y -s "*"：项目级、仅 Claude Code、全部 skill。
# 安装脚本暂存根目录 lock，回写 configs/locks/skills-lock.json，
# 并按 JSON 返回的实际目录名更新 .claude/skills/.gitignore，保留无关条目。
# --exclude 接受原始 skill 名或实际目录名（如 nLsyntax / nlsyntax）。
# 示例：make skills SKILLS_ARGS="--dry-run"；可重复传入 --exclude SKILL。
.PHONY: skills
skills:
	$(PYTHON) $(SKILLS_INSTALLER) $(SKILLS_ARGS)
