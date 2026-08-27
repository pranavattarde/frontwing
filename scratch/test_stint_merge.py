def adjust_stints_for_simulated_stop(
    original_stints: list,
    simulated_pit_lap: int,
    target_compound: str = None,
    total_laps: int = 71
) -> list:
    if not original_stints:
        comp = target_compound or "HARD"
        return [
            {"compound": "MEDIUM", "start_lap": 1, "end_lap": simulated_pit_lap},
            {"compound": comp.upper(), "start_lap": simulated_pit_lap + 1, "end_lap": total_laps}
        ]

    # Step 1: Merge consecutive stints that share the same compound or are micro-stints (<= 2 laps)
    merged_stints = []
    for s in original_stints:
        s_dict = dict(s)
        s_dict["compound"] = str(s_dict["compound"]).upper()
        if not merged_stints:
            merged_stints.append(s_dict)
        else:
            prev = merged_stints[-1]
            if prev["compound"] == s_dict["compound"] or (s_dict.get("end_lap", 0) - s_dict.get("start_lap", 0) + 1 <= 2 and len(merged_stints) > 1):
                prev["end_lap"] = s_dict["end_lap"]
            else:
                merged_stints.append(s_dict)

    stints = [dict(s) for s in merged_stints]

    if len(stints) == 1:
        comp = target_compound or "HARD"
        old_end = stints[0]["end_lap"] or total_laps
        stints[0]["end_lap"] = simulated_pit_lap
        stints.append({
            "compound": comp.upper(),
            "start_lap": simulated_pit_lap + 1,
            "end_lap": old_end
        })
    else:
        stints[0]["end_lap"] = simulated_pit_lap
        stints[1]["start_lap"] = simulated_pit_lap + 1
        if target_compound:
            stints[1]["compound"] = target_compound.upper()

        # Shift subsequent stints if any
        for i in range(1, len(stints) - 1):
            stint_len = stints[i]["end_lap"] - stints[i]["start_lap"] + 1
            stints[i]["end_lap"] = stints[i]["start_lap"] + stint_len - 1
            stints[i+1]["start_lap"] = stints[i]["end_lap"] + 1

        stints[-1]["end_lap"] = total_laps

    # Filter out collapsed stints
    valid_stints = [s for s in stints if s["start_lap"] <= s["end_lap"]]

    # Re-index start/end laps sequentially
    current_lap = 1
    for s in valid_stints:
        s["start_lap"] = current_lap
        if s == valid_stints[-1]:
            s["end_lap"] = total_laps
        current_lap = s["end_lap"] + 1

    return valid_stints

# Test with Qatar 2024 stints
qatar_stints = [
    {'compound': 'MEDIUM', 'start_lap': 1, 'end_lap': 35, 'stint_number': 1},
    {'compound': 'HARD', 'start_lap': 36, 'end_lap': 36, 'stint_number': 2},
    {'compound': 'HARD', 'start_lap': 37, 'end_lap': 37, 'stint_number': 3},
    {'compound': 'HARD', 'start_lap': 38, 'end_lap': 57, 'stint_number': 4}
]
res_qatar = adjust_stints_for_simulated_stop(qatar_stints, 33, "HARD", 55)
print("Qatar (Pit Lap 33):", res_qatar)

# Test with Austria 2-stop
sainz_stints = [
    {"compound": "MEDIUM", "start_lap": 1, "end_lap": 22, "stint_number": 1},
    {"compound": "HARD", "start_lap": 23, "end_lap": 47, "stint_number": 2},
    {"compound": "MEDIUM", "start_lap": 48, "end_lap": 71, "stint_number": 3}
]
res_sainz = adjust_stints_for_simulated_stop(sainz_stints, 19, "HARD", 71)
print("Sainz (Pit Lap 19):", res_sainz)
