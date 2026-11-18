import re

# Read original app.js
with open("static/app.js", "r", encoding="utf-8") as f:
    orig = f.read()

# Locate core interview engine (from currentConsents / ensureMedia up to computeCmaTrajectory)
idx_ensure = orig.find("function permissionCard(name, title, desc) {")
idx_compute_cma = orig.find("function computeCmaTrajectory(questions, checkin = {}) {")

if idx_ensure == -1 or idx_compute_cma == -1:
    raise ValueError(f"Could not locate markers: idx_ensure={idx_ensure}, idx_compute_cma={idx_compute_cma}")

core_interview_engine = orig[idx_ensure:idx_compute_cma]

# Locate cma trajectory code
idx_report = orig.find("async function renderReport() {")
cma_trajectory_code = orig[idx_compute_cma:idx_report]

# Locate auth & lifecycle code (from loadHistory onwards)
idx_load_history = orig.find("async function loadHistory() {")
auth_lifecycle_code = orig[idx_load_history:]

print(f"Core engine length: {len(core_interview_engine)}")
print(f"CMA trajectory length: {len(cma_trajectory_code)}")
print(f"Auth & lifecycle length: {len(auth_lifecycle_code)}")
