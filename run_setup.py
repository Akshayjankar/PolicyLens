#!/usr/bin/env python3
"""Setup runner that bypasses shell encoding issues."""
import subprocess
import sys
import os

ROOT = "/Users/nseindia/Desktop/Akshay/Projects/PolicyLens"
BACKEND = os.path.join(ROOT, "backend")

def run(cmd, cwd=None, check=True):
    print(f"\n>>> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    print(f"Exit code: {result.returncode}")
    if check and result.returncode != 0:
        print("FAILED!")
        sys.exit(result.returncode)
    return result

# Step 1: Generate icons
print("=== Step 1: Generate PNG icons ===")
run(f"python3 {ROOT}/make_icons.py")

# Step 2: Download JS libraries
print("\n=== Step 2: Download JS libraries ===")
libs_dir = os.path.join(ROOT, "extension", "libs")
os.makedirs(libs_dir, exist_ok=True)
run(f'curl -L "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" -o {libs_dir}/html2canvas.min.js')
run(f'curl -L "https://cdnjs.cloudflare.com/ajax/libs/diff_match_patch/20121119/diff_match_patch.js" -o {libs_dir}/diff-match-patch.js')

# Step 3: Check file sizes
print("\n=== Checking downloaded file sizes ===")
for fname in ["html2canvas.min.js", "diff-match-patch.js"]:
    fpath = os.path.join(libs_dir, fname)
    if os.path.exists(fpath):
        size = os.path.getsize(fpath)
        print(f"{fname}: {size} bytes ({'OK' if size > 10000 else 'TOO SMALL'})")
    else:
        print(f"{fname}: MISSING")

# Step 4: Install dependencies
print("\n=== Step 3: Install Python dependencies ===")
run(f"pip3 install -r {BACKEND}/requirements.txt")

# Step 5: Verify imports
print("\n=== Step 4: Verify imports ===")
result = run(f'python3 -c "from main import app; print(\'OK\')"', cwd=BACKEND, check=False)
if result.returncode != 0:
    print("Import check failed - will examine the error")

# Check icons
print("\n=== Verifying icons ===")
icons_dir = os.path.join(ROOT, "extension", "icons")
for icon in ["icon16.png", "icon48.png", "icon128.png"]:
    p = os.path.join(icons_dir, icon)
    if os.path.exists(p):
        print(f"{icon}: {os.path.getsize(p)} bytes OK")
    else:
        print(f"{icon}: MISSING")

print("\n=== Setup complete ===")
