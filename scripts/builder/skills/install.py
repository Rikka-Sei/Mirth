#!/usr/bin/env python3
"""安装项目 skills，维护 configs/locks/skills-lock.json 和 Claude 忽略清单。

需要 Python 3 与提供 npx 的 Node.js。make skills SKILLS_ARGS="--dry-run"
仅显示计划；位置参数覆盖默认来源，--exclude 可重复，--agent 默认 claude-code。
不使用 --all，不全局安装。根目录已有 skills-lock.json 时拒绝覆盖；请先
将其迁移到 configs/locks/skills-lock.json。失败时保留已产生的 lock 与忽略项。
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[3]
STAGED = ROOT / "skills-lock.json"
LOCK = ROOT / "configs/locks/skills-lock.json"
IGNORE = ROOT / ".claude/skills/.gitignore"
DEFAULT_SOURCES = [
    "https://github.com/obra/superpowers",
    "https://github.com/Rikka-Sei/.Rikki",
]


def command(args: list[str]) -> list[str]:
    executable = shutil.which("npx")
    if executable is None:
        raise RuntimeError("找不到 npx；请进入 nix develop 或安装 Node.js")
    return [executable, "--yes", "skills@latest", *args]


def run_npx(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(command(args), cwd=ROOT, capture_output=True,
                          text=True, encoding="utf-8", errors="replace")


def save_lock() -> None:
    content = STAGED.read_bytes()
    data = json.loads(content)
    if not isinstance(data, dict) or not isinstance(data.get("skills"), dict):
        raise ValueError("skills-lock.json 缺少 skills 对象，保留根目录文件供恢复")
    LOCK.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=LOCK.parent, delete=False) as temporary:
        temporary.write(content)
        temporary_path = Path(temporary.name)
    try:
        os.replace(temporary_path, LOCK)
    finally:
        temporary_path.unlink(missing_ok=True)


def update_gitignore(installed: dict[str, Path], excludes: set[str]) -> None:
    lines = IGNORE.read_text(encoding="utf-8").splitlines() if IGNORE.exists() else []
    obsolete = excludes | {name for name, path in installed.items() if name != path.name}
    obsolete.update(path.name for name, path in installed.items() if name in excludes)
    blocked = {entry for name in obsolete for entry in (f"{name}/", f"/{name}/")}
    lines = [line for line in lines if line.strip() not in blocked]
    existing = {line.strip() for line in lines}
    for name in sorted({path.name for skill, path in installed.items() if skill not in excludes}):
        # 使用 CLI 返回的实际目录名，不能用 lock 中未经规范化的技能名。
        if not name or name in (".", "..") or any(c in name for c in "/\\\r\n*?![]# "):
            raise ValueError(f"无效的 skill 名称: {name!r}")
        if f"{name}/" not in existing and f"/{name}/" not in existing:
            lines.append(f"{name}/")
    if lines or IGNORE.exists():
        IGNORE.parent.mkdir(parents=True, exist_ok=True)
        IGNORE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_installed(payload: str, source: str, installed: dict[str, Path]) -> None:
    results = json.loads(payload)
    if not isinstance(results, list):
        raise ValueError(f"{source} 的 --json 输出不是数组")
    successful = [item for item in results if isinstance(item, dict)
                  and item.get("status") == "installed" and isinstance(item.get("name"), str)]
    for item in successful:
        if not isinstance(item.get("path"), str) or not item["path"]:
            raise ValueError(f"{source} 的安装结果缺少 path")
        path = Path(item["path"])
        installed[item["name"]] = path if path.is_absolute() else ROOT / path
    failed = [item for item in results if isinstance(item, dict) and item.get("status") == "failed"]
    if failed:
        raise RuntimeError(f"{source} 安装失败: {failed}")
    if not successful:
        raise RuntimeError(f"{source} 没有 status=installed 的条目")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", nargs="*", help="覆盖默认来源")
    parser.add_argument("--exclude", action="append", default=[], metavar="SKILL")
    parser.add_argument("--agent", default="claude-code")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    sources = args.sources or DEFAULT_SOURCES
    excludes = set(args.exclude)
    installs = [["add", source, "-a", args.agent, "-s", "*", "-y", "--copy", "--json"]
                for source in sources]
    if args.dry_run:
        for install in installs:
            print("npx --yes skills@latest " + " ".join(install))
        if excludes:
            print("npx --yes skills@latest remove " + " ".join(sorted(excludes)) + " -y -a " + args.agent)
        return 0

    installed: dict[str, Path] = {}
    removed: set[str] = set()
    # 独占创建：不覆盖用户的根目录 lock，也不与另一次安装并行写同一文件。
    with STAGED.open("xb") as staged:
        try:
            staged.write(LOCK.read_bytes() if LOCK.exists() else b'{"version":1,"skills":{}}\n')
        except BaseException:
            STAGED.unlink(missing_ok=True)
            raise
    succeeded = False
    try:
        for source, install in zip(sources, installs):
            print(f"[skills] 安装来源 {source}", flush=True)
            result = run_npx(install)
            if result.stderr:
                sys.stderr.write(result.stderr)
            if result.stdout:
                parse_installed(result.stdout, source, installed)
            if result.returncode != 0:
                raise RuntimeError(f"{source} 命令失败 ({result.returncode})")
            if not result.stdout:
                raise RuntimeError(f"{source} 没有 JSON 输出")
            save_lock()
        excludes = {name for name, path in installed.items()
                    if name in excludes or path.name in excludes}
        removable = sorted(excludes)
        if removable:
            result = run_npx(["remove", *removable, "-y", "-a", args.agent])
            data = json.loads(STAGED.read_text(encoding="utf-8"))
            removed = {name for name in removable if name not in data.get("skills", {})
                       and not installed[name].exists()
                       and not (ROOT / ".claude/skills" / installed[name].name).exists()}
            if removed != set(removable):
                sys.stderr.write(result.stdout + result.stderr)
                raise RuntimeError("排除项未从 lock 或技能目录中完整移除")
            if result.returncode:
                print("[skills] remove 退出异常，但 lock 与目录均已确认移除", file=sys.stderr)
        succeeded = True
        return 0
    finally:
        # 即使后一个来源失败，也保存先前成果；保存失败则留下根 lock 供恢复。
        save_lock()
        update_gitignore(installed, excludes if succeeded else removed)
        STAGED.unlink()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"[skills] {exc}", file=sys.stderr)
        raise SystemExit(1)
