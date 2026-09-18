import re

ORDINAL_WORD_MAP = {
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
    'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
    'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15,
    'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18, 'nineteenth': 19, 'twentieth': 20,
    'twenty-first': 21, 'twenty-second': 22, 'twenty-third': 23, 'twenty-fourth': 24, 'twenty-fifth': 25,
    'thirtieth': 30
}

def parse_target_pit_lap(question: str, actual_pit_lap: int = 20) -> int:
    q_lower = question.lower()
    
    # 1. Strict relative check: 'N laps earlier/before/sooner' or 'N laps later/after'
    rel_earlier = re.search(r'(\d+)\s+laps?\s+(?:earlier|before|sooner)', q_lower) or re.search(r'(?:earlier|sooner)\s+by\s+(\d+)\s+laps?', q_lower)
    rel_later = re.search(r'(\d+)\s+laps?\s+(?:later|after)', q_lower) or re.search(r'(?:later)\s+by\s+(\d+)\s+laps?', q_lower)
    
    if rel_earlier:
        offset = int(rel_earlier.group(1))
        return max(1, actual_pit_lap - offset)
    if rel_later:
        offset = int(rel_later.group(1))
        return actual_pit_lap + offset
        
    # 2. Ordinal digits with suffix: e.g. '2nd', '2nd lap', 'on 2nd lap only', 'the 15th lap'
    ord_digit = re.search(r'\b(\d+)(?:st|nd|rd|th)\b', q_lower)
    if ord_digit:
        return int(ord_digit.group(1))
        
    # 3. Ordinal words: e.g. 'second lap', 'on the third lap'
    ord_word_pattern = r'\b(' + '|'.join(ORDINAL_WORD_MAP.keys()) + r')\b'
    ord_word = re.search(ord_word_pattern, q_lower)
    if ord_word:
        return ORDINAL_WORD_MAP[ord_word.group(1)]
        
    # 4. Standard explicit lap: e.g. 'lap 18', 'on lap 24', 'box on lap 30', 'pitted 25'
    abs_match = re.search(r'\b(?:lap|box\s+(?:on|at)?|pitted\s+(?:on|at)?|on\s+lap)\s*(\d+)\b', q_lower)
    if abs_match:
        return int(abs_match.group(1))
        
    # 5. 'on 18', 'at 25'
    prep_match = re.search(r'\b(?:on|at)\s+(\d+)\b', q_lower)
    if prep_match:
        return int(prep_match.group(1))
        
    # 6. Isolated 1-2 digit number
    num_match = re.search(r'\b(\d{1,2})\b', q_lower)
    if num_match:
        return int(num_match.group(1))
        
    return max(1, actual_pit_lap - 4)

test_queries = [
    ('what if he pitted 5 laps earlier?', 20, 15),
    ('what if he pitted on 2nd lap only?', 20, 2),
    ('what if he pitted on the second lap?', 20, 2),
    ('what if he pitted on 1st lap?', 20, 1),
    ('what if he pitted on the 3rd lap?', 20, 3),
    ('what if he pitted on lap 30?', 20, 30),
    ('what if he pitted 3 laps later?', 20, 23),
    ('what if he boxed on lap 18?', 20, 18),
    ('what if he pitted earlier by 4 laps?', 20, 16),
]

all_passed = True
for q, act, expected in test_queries:
    res = parse_target_pit_lap(q, act)
    ok = (res == expected)
    if not ok: all_passed = False
    print(f'[{ "PASS" if ok else "FAIL" }] "{q}" -> parsed: {res} (expected: {expected})')

print('All passed:', all_passed)
