"""Run explicitly selected shell functions in temporary, non-Android sandboxes."""
import re
import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def shell_executable():
    git = shutil.which("git")
    if git:
        bundled = Path(git).resolve().parents[1] / "bin/bash.exe"
        if bundled.is_file():
            return str(bundled)
    shell = shutil.which("bash")
    if not shell:
        raise RuntimeError("Bash is required for shell regression tests")
    return shell


def functions_from(filename, names):
    source = (ROOT / filename).read_text(encoding="utf-8")
    functions = []
    for name in names:
        match = re.search(rf"^{re.escape(name)}\(\) \{{\n.*?^\}}$", source, re.MULTILINE | re.DOTALL)
        if not match:
            raise AssertionError(f"Missing isolated function: {filename}:{name}")
        functions.append(match.group(0))
    return "\n\n".join(functions)


def run_shell(source, *, timeout=15):
    with tempfile.TemporaryDirectory(prefix="supercharger-shell-") as folder:
        root = Path(folder)
        script = root / "test.sh"
        script.write_bytes(source.encode("utf-8"))
        return subprocess.run(
            [shell_executable(), str(script)], cwd=root, capture_output=True,
            text=True, timeout=timeout,
        )
