import os
import re

FRONTEND_SRC = r"c:\VS-Code_C_drive\Projects\FrontWing\frontend\src"

# Patterns to flag:
# 1. ALL_CAPS_WITH_UNDERSCORE (at least 2 segments like FOO_BAR, 3+ chars each or total 6+)
SNAKE_CAPS = re.compile(r'\b[A-Z][A-Z0-9]+_[A-Z0-9_]+\b')

# 2. Internal provider/model names in JSX text or strings
INTERNAL_TERMS = re.compile(r'(gemini|groq|gpt-oss|AI_ENGINEER)', re.IGNORECASE)

IGNORE_FILES = []

def check_file(filepath):
    rel_path = os.path.relpath(filepath, FRONTEND_SRC)
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    issues = []
    for i, line in enumerate(lines, 1):
        # Ignore import statements, console.log, comments
        stripped = line.strip()
        if stripped.startswith('import ') or stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
            continue
        if 'console.log' in stripped or 'console.error' in stripped or 'console.warn' in stripped:
            continue
        # Also ignore test files
        if 'test' in filepath or '__tests__' in filepath:
            continue

        # Check for internal terms
        term_matches = INTERNAL_TERMS.findall(line)
        if term_matches:
            # check if it's variable name or internal data field like trace.llm_provider
            issues.append((i, "INTERNAL_TERM", f"Matches: {term_matches} in `{stripped}`"))

        # Check for snake_caps in text / jsx content
        # Only flag if appears in a string or JSX text
        # e.g., >...FOO_BAR...< or "FOO_BAR" or 'FOO_BAR'
        text_matches = re.findall(r'(?:>([^<]*\b[A-Z][A-Z0-9]+_[A-Z0-9_]+\b[^<]*)|["\']([^"\']*\b[A-Z][A-Z0-9]+_[A-Z0-9_]+\b[^"\']*))', line)
        for m1, m2 in text_matches:
            content = m1 or m2
            # filter out common CSS/variable patterns or constants
            # e.g., STINT_COLORS, COMPOUND_COLORS, SVG constants, ACTION types if internal
            if any(k in content for k in ['STINT_', 'COMPOUND_', 'STATUS_', 'ROLE_', 'ENV_', 'VITE_', 'KEY_']):
                continue
            # Also filter out variable identifiers or styles
            snake_words = SNAKE_CAPS.findall(content)
            valid_words = [w for w in snake_words if not w.startswith('SVG_') and not w.startswith('VAR_') and not w.startswith('RGB_')]
            if valid_words:
                issues.append((i, "SNAKE_CAPS", f"Found {valid_words} in `{stripped}`"))

    return rel_path, issues

total_issues = 0
for root, dirs, files in os.walk(FRONTEND_SRC):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            rel_path, issues = check_file(os.path.join(root, file))
            if issues:
                print(f"=== {rel_path} ({len(issues)} issues) ===")
                for line_no, kind, desc in issues:
                    print(f"  L{line_no} [{kind}]: {desc[:140]}")
                total_issues += len(issues)

print(f"\nTotal potential issues found: {total_issues}")
