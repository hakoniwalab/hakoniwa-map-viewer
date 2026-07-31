#!/usr/bin/env python3
"""Component-owned operational entry point for hakoniwa-map-viewer."""

from __future__ import annotations

import argparse
import functools
import http.server
import pathlib
import subprocess
import sys
import threading
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
THREEJS_ROOT = ROOT / "thirdparty" / "hakoniwa-threejs-drone"
SHIBUYA_GLB = ROOT / "assets" / "models" / "13113_shibuya-ku_pref_2023_citygml_2_op.glb"

REQUIRED_FILES = (
    ROOT / "README.md",
    ROOT / ".gitmodules",
    ROOT / "src" / "client" / "index.html",
    ROOT / "src" / "client" / "src" / "ui.js",
    ROOT / "src" / "client" / "src" / "frame.js",
    ROOT / "images" / "drone.svg",
    THREEJS_ROOT / "tools" / "hako.py",
    THREEJS_ROOT / "src" / "public" / "drone_viewer.js",
    THREEJS_ROOT / "config" / "viewer-config-legacy.json",
)


def _display(path: pathlib.Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def _run_threejs(command: str) -> int:
    entry = THREEJS_ROOT / "tools" / "hako.py"
    if not entry.is_file():
        print(
            "ERROR: Three.js submodule is not initialized. "
            "Run: git submodule update --init --recursive",
            file=sys.stderr,
        )
        return 1
    completed = subprocess.run(
        [sys.executable, str(entry), command],
        cwd=THREEJS_ROOT,
        check=False,
    )
    return completed.returncode


def doctor() -> int:
    errors: list[str] = []

    if sys.version_info < (3, 9):
        errors.append(
            f"Python 3.9 or newer is required; found {sys.version.split()[0]}"
        )

    for path in REQUIRED_FILES:
        if not path.is_file():
            errors.append(f"missing required file: {_display(path)}")

    gitmodules = ROOT / ".gitmodules"
    if gitmodules.is_file():
        text = gitmodules.read_text(encoding="utf-8")
        expected = "thirdparty/hakoniwa-threejs-drone"
        if expected not in text:
            errors.append(f".gitmodules does not declare {expected}")

    if errors:
        for message in errors:
            print(f"ERROR: {message}", file=sys.stderr)
        print(
            "Remediation: git submodule update --init --recursive",
            file=sys.stderr,
        )
        return 1

    nested = _run_threejs("doctor")
    if nested != 0:
        print("ERROR: embedded Three.js viewer doctor failed", file=sys.stderr)
        return nested

    print(f"OK: Python {sys.version.split()[0]}")
    print("OK: map-viewer static integration files are present")
    print("OK: embedded hakoniwa-threejs-drone is operational")
    if SHIBUYA_GLB.is_file():
        print(f"INFO: optional PLATEAU asset found: {_display(SHIBUYA_GLB)}")
    else:
        print(
            "INFO: optional PLATEAU Shibuya GLB is not installed; "
            "the base viewer remains usable"
        )
    return 0


def test() -> int:
    own_tests = subprocess.run(
        [
            sys.executable,
            "-m",
            "unittest",
            "discover",
            "-s",
            "tools",
            "-p",
            "test_*.py",
        ],
        cwd=ROOT,
        check=False,
    )
    if own_tests.returncode != 0:
        return own_tests.returncode

    nested = _run_threejs("test")
    if nested != 0:
        print("ERROR: embedded Three.js viewer tests failed", file=sys.stderr)
        return nested

    print("OK: map-viewer and embedded Three.js contracts passed")
    return 0


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return


def smoke() -> int:
    if doctor() != 0:
        return 1

    nested = _run_threejs("smoke")
    if nested != 0:
        print("ERROR: embedded Three.js viewer smoke failed", file=sys.stderr)
        return nested

    handler = functools.partial(_QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    checks = (
        ("/src/client/index.html", "Hakoniwa Map + 3D Drone Viewer"),
        ("/src/client/src/ui.js", "createDroneViewer"),
        ("/src/client/src/frame.js", "rosToEnuFrame"),
        ("/images/drone.svg", "<svg"),
        (
            "/thirdparty/hakoniwa-threejs-drone/src/public/drone_viewer.js",
            "createDroneViewer",
        ),
        (
            "/thirdparty/hakoniwa-threejs-drone/config/viewer-config-legacy.json",
            '"stateInput"',
        ),
        (
            "/thirdparty/hakoniwa-threejs-drone/thirdparty/"
            "hakoniwa-pdu-javascript/src/PduManager.js",
            "PduManager",
        ),
    )

    base_url = f"http://127.0.0.1:{server.server_port}"
    try:
        for path, marker in checks:
            with urllib.request.urlopen(base_url + path, timeout=5) as response:
                body = response.read().decode("utf-8")
            if marker not in body:
                print(
                    f"ERROR: smoke marker {marker!r} not found in {path}",
                    file=sys.stderr,
                )
                return 1
            print(f"OK: GET {path}")
    except Exception as exc:  # noqa: BLE001 - CLI reports operational failures
        print(f"ERROR: integrated static-server smoke failed: {exc}", file=sys.stderr)
        return 1
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    print("OK: map-viewer integrated static-server smoke passed")
    print("NOTE: WebSocket state flow and browser rendering require an E2E runtime")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Operate and validate hakoniwa-map-viewer"
    )
    parser.add_argument("command", choices=("doctor", "test", "smoke"))
    args = parser.parse_args()

    if args.command == "doctor":
        return doctor()
    if args.command == "test":
        return test()
    return smoke()


if __name__ == "__main__":
    raise SystemExit(main())
