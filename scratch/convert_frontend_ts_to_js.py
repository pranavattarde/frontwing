import re
import os
import glob

def strip_ts(content: str, filename: str) -> str:
    # 1. Remove import type statements or type specifiers in imports
    content = re.sub(r'import\s+type\s+[^;]+;', '', content)
    content = re.sub(r',\s*type\s+[A-Za-z0-9_]+', '', content)
    content = re.sub(r'{\s*type\s+([A-Za-z0-9_]+)', r'{\1', content)

    # 2. Remove interface definitions
    content = re.sub(r'(?:export\s+)?interface\s+[A-Za-z0-9_]+(?:\s*<[^>]+>)?(?:\s+extends\s+[^{]+)?\s*\{[^}]*\}', '', content, flags=re.DOTALL)
    
    # 3. Remove type alias definitions
    content = re.sub(r'(?:export\s+)?type\s+[A-Za-z0-9_]+(?:\s*<[^>]+>)?\s*=\s*[^;]+;', '', content, flags=re.DOTALL)

    # 4. Remove generic type annotations from React components like React.FC<Props> or useState<Type>(val)
    content = re.sub(r':\s*React\.FC(?:<[^>]+>)?', '', content)
    content = re.sub(r'useState<[^>]+>\(', 'useState(', content)
    content = re.sub(r'useRef<[^>]+>\(', 'useRef(', content)
    content = re.sub(r'useCallback<[^>]+>\(', 'useCallback(', content)
    content = re.sub(r'useMemo<[^>]+>\(', 'useMemo(', content)
    content = re.sub(r'createRef<[^>]+>\(', 'createRef(', content)
    content = re.sub(r'React\.ElementRef<[^>]+>', 'any', content)
    content = re.sub(r'React\.ComponentPropsWithoutRef<[^>]+>', 'any', content)

    # 5. Remove `as SomeType` type assertions
    content = re.sub(r'\s+as\s+[A-Za-z0-9_\[\]<>,.\s]+(?=[;,)\]}\n])', '', content)

    # 6. Clean parameter type annotations like (props: ComponentProps) -> (props) or (e: React.MouseEvent) -> (e)
    # We match : [A-Za-z0-9_<> | & [\]]+ before = or , or ) in parameter lists
    # Be careful not to alter ternary operators a ? b : c
    
    return content

print("Frontend TS strip helper ready.")
