import re

# Read the original app.js
with open("static/app.js", "r", encoding="utf-8") as f:
    orig = f.read()

# Find the end of renderDashboard / sessionTableHtml
# In orig, renderPrepare starts with '// View 2: Prepare' or 'function renderPrepare('
idx_prepare = orig.find("// View 2: Prepare")
if idx_prepare == -1:
    idx_prepare = orig.find("function renderPrepare()")

before_prepare = orig[:idx_prepare]
from_prepare = orig[idx_prepare:]

# We need everything from `renderPrepare` up to `// View 6: Privacy & Settings`
idx_privacy = from_prepare.find("// View 6: Privacy")
if idx_privacy == -1:
    idx_privacy = from_prepare.find("function renderPrivacy()")

core_interview_code = from_prepare[:idx_privacy]

# From after renderPrivacy up to end: find `loadHistory`
idx_load_history = from_prepare.find("async function loadHistory()")
if idx_load_history == -1:
    idx_load_history = from_prepare.find("function loadHistory()")

auth_and_events = from_prepare[idx_load_history:]

print(f"Original length: {len(orig)}")
print(f"Core interview code length: {len(core_interview_code)}")
print(f"Auth and events length: {len(auth_and_events)}")
