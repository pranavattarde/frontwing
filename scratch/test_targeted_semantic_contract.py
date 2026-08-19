import urllib.request
import json
import time

API_URL = "http://localhost:5000/engineer/query"

targeted_queries = [
    ("A", "Who won Monaco?"),
    ("B", "Who won Monaco in 2024?"),
    ("C", "Who won Monaco in 2026?"),
    ("D", "Which driver came home in third at Monaco?"),
    ("E", "Where did Charles Leclerc finish at the Monaco race?"),
    ("F", "Tell me the podium from the British Grand Prix."),
    ("G", "Who was classified fifth in Japan?"),
    ("H", "What was Hamilton's fastest lap at Monza?"),
    ("I", "Compare Verstappen and Norris at Silverstone."),
    ("J", "How many points did the race winner score?")
]

print("==========================================================================")
print("TARGETED SEMANTIC CONTRACT & AUTHORITATIVE BOUNDARY TESTS (A - J)")
print("==========================================================================\n")

results = []

for tag, q in targeted_queries:
    payload = json.dumps({"question": q}).encode('utf-8')
    req = urllib.request.Request(API_URL, data=payload, headers={'Content-Type': 'application/json'})
    
    start_time = time.time()
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            elapsed = time.time() - start_time
            
            trace = data.get("intelligence_trace") or {}
            nlp_contract = trace.get("semantic_contract") or data.get("semantic_contract") or {}
            entities = nlp_contract.get("entities") or trace.get("entities") or {}
            
            norm_q = nlp_contract.get("normalized_query") or q
            provider = trace.get("llm_provider", "Gemini/Groq")
            req_metric = nlp_contract.get("requested_metric") or "unknown"
            intent = nlp_contract.get("intent") or trace.get("intent", "race_result")
            tools = trace.get("executed_tools") or data.get("tools_used") or data.get("tools") or []
            
            params_sent = trace.get("timelines", {}).get("parameters_sent", {})
            session_res = params_sent.get("race_results_tool", {}).get("session_id") or trace.get("resolved_session") or "Resolved via SessionResolver"
            
            evidence_dict = data.get("evidence") or {}
            evidence_retrieved = "YES" if len(evidence_dict) > 0 or data.get("investigation_report") else "NO"
            
            report = data.get("investigation_report") or {}
            if isinstance(report, dict):
                final_answer = report.get("Executive Summary") or data.get("final_answer")
            else:
                final_answer = data.get("final_answer") or str(report)
                
            log_output = f"""================ TARGETED TEST [{tag}] ================
Raw Query: {q}
Semantic Contract: {json.dumps(nlp_contract)}
Planner Intent: {intent}
Requested Metric: {req_metric}
Entities (Season): {entities.get('season')} (GP: {entities.get('grand_prix')})
Execution Plan Tools: {tools}
Resolved Session: {session_res}
Evidence Retrieved: {evidence_retrieved}
Final Answer: {final_answer}
Latency: {elapsed:.2f}s
======================================================
"""
            print(log_output, flush=True)
            results.append({
                "tag": tag,
                "query": q,
                "contract": nlp_contract,
                "intent": intent,
                "requested_metric": req_metric,
                "season": entities.get('season'),
                "gp": entities.get('grand_prix'),
                "tools": tools,
                "session": session_res,
                "evidence": evidence_retrieved,
                "answer": final_answer,
                "latency_s": round(elapsed, 2)
            })
    except Exception as e:
        log_output = f"""================ TARGETED TEST [{tag}] ================
Raw Query: {q}
ERROR: {e}
======================================================
"""
        print(log_output, flush=True)
        results.append({"tag": tag, "query": q, "error": str(e)})
    
    time.sleep(1)

with open("scratch/targeted_test_results.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nTargeted tests complete. Results saved to scratch/targeted_test_results.json.", flush=True)
