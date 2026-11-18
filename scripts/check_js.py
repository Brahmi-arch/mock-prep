import re

with open('static/app.js', encoding='utf-8') as f:
    code = f.read()

# Tokenize brackets while skipping template strings and strings
in_template = False
in_str = False
str_char = None
escape = False
stack = []
pairs = {')': '(', ']': '[', '}': '{'}

for i, ch in enumerate(code):
    if escape:
        escape = False
        continue
    if ch == '\\\\':
        escape = True
        continue
    if not in_str and not in_template:
        if ch in ('"', "'"):
            in_str = True
            str_char = ch
        elif ch == '`':
            in_template = True
        elif ch in '([{':
            stack.append((ch, i))
        elif ch in ')]}':
            if not stack:
                print(f"Unmatched {ch} at char {i}")
                exit(1)
            last, pos = stack.pop()
            if last != pairs[ch]:
                print(f"Mismatched {last} at {pos} with {ch} at {i}")
                exit(1)
    elif in_str:
        if ch == str_char:
            in_str = False
    elif in_template:
        if ch == '`':
            in_template = False

if stack:
    print(f"Unclosed {stack[-1][0]} at char {stack[-1][1]}")
    exit(1)

print("JS bracket syntax is balanced!")
