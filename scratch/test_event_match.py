import fastf1, re

def check_event_match(session, gp_name):
    ev = session.event
    ev_text = f"{ev['EventName']} {ev['Location']} {ev['Country']}".lower()
    clean_q = re.sub(r'\b(grand prix|gp|race)\b', '', gp_name, flags=re.IGNORECASE).strip().lower()
    if 'imola' in clean_q or 'emilia' in clean_q or 'romagna' in clean_q:
        return 'imola' in ev_text or 'emilia' in ev_text or 'romagna' in ev_text
    if 'austria' in clean_q or 'spielberg' in clean_q:
        return ('austria' in ev_text or 'spielberg' in ev_text) and 'australia' not in ev_text
    if 'australia' in clean_q or 'melbourne' in clean_q:
        return 'australia' in ev_text or 'melbourne' in ev_text
    tokens = [t for t in clean_q.split() if len(t) >= 4]
    return any(t in ev_text for t in tokens)

s26_bel = fastf1.get_session(2026, 'Emilia Romagna GP', 'R')
print('2026 Emilia Romagna (should be False):', check_event_match(s26_bel, 'Emilia Romagna GP'))

s25_emi = fastf1.get_session(2025, 'Emilia Romagna GP', 'R')
print('2025 Emilia Romagna (should be True):', check_event_match(s25_emi, 'Emilia Romagna GP'))

s26_aus = fastf1.get_session(2026, 'Austrian GP', 'R')
print('2026 Austrian GP (should be True):', check_event_match(s26_aus, 'Austrian GP'))
print('2026 Austrian GP Event Name:', s26_aus.event['EventName'])
