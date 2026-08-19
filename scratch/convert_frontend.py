import os
import glob
import re

def convert_tsx_to_jsx(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Strip import type statements
    code = re.sub(r'import\s+type\s+[^;]+;\n?', '', code)
    code = re.sub(r'import\s*\{\s*type\s+[^}]+\}\s*from\s*[^;]+;\n?', '', code)

    # 2. Strip interface definitions
    code = re.sub(r'(?:export\s+)?interface\s+[A-Za-z0-9_]+(?:\s*<[^>]+>)?(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?\n\}\n?', '', code)

    # 3. Strip type alias definitions
    code = re.sub(r'(?:export\s+)?type\s+[A-Za-z0-9_]+(?:\s*<[^>]+>)?\s*=[\s\S]*?;\n?', '', code)

    # 4. Remove type annotations from function parameters & variables
    # e.g., (s: any) -> (s), (seconds: number): string -> (seconds)
    code = re.sub(r':\s*(?:string|number|boolean|any|void|unknown|never|React\.[A-Za-z0-9_<>]+\|?)+', '', code)
    code = re.sub(r':\s*Stint\[\]', '', code)
    code = re.sub(r':\s*ThreadMessage\[\]', '', code)
    code = re.sub(r':\s*BreadcrumbItem\[\]', '', code)
    code = re.sub(r':\s*AIStage', '', code)
    code = re.sub(r':\s*[A-Za-z0-9_]+Props', '', code)
    code = re.sub(r':\s*React\.FC(?:<[^>]+>)?', '', code)

    # 5. Remove `as any` or `as Type`
    code = re.sub(r'\s+as\s+[A-Za-z0-9_\[\]<>,.|]+', '', code)

    # 6. Remove generic type params in useState/useRef: useState<string>('val') -> useState('val')
    code = re.sub(r'useState<[^>]+>\(', 'useState(', code)
    code = re.sub(r'useRef<[^>]+>\(', 'useRef(', code)
    code = re.sub(r'useCallback<[^>]+>\(', 'useCallback(', code)
    code = re.sub(r'useMemo<[^>]+>\(', 'useMemo(', code)
    code = re.sub(r'createRef<[^>]+>\(', 'createRef(', code)
    
    # 7. Non-null assertions e.g. document.getElementById('root')! -> document.getElementById('root')
    code = re.sub(r'!\.render\(', '.render(', code)

    # Destination path
    jsx_path = filepath.rsplit('.', 1)[0] + '.jsx'
    with open(jsx_path, 'w', encoding='utf-8') as f:
        f.write(code)

    print(f"Converted {filepath} -> {jsx_path}")

frontend_dir = r'c:\VS-Code_C_drive\Projects\FrontWing\frontend\src'
for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith('.tsx'):
            full_path = os.path.join(root, file)
            convert_tsx_to_jsx(full_path)

print("Page & Component TSX conversion complete.")
