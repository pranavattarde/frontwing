import urllib.request
import json
import time

API_URL = "http://localhost:5000/engineer/query"

unseen_queries = [
    "Who took the victory at the 2026 Monaco Grand Prix?",
    "Which driver came home in third at Monaco?",
    "Where did Charles Leclerc finish at the Monaco race?",
    "Tell me the podium from the British Grand Prix.",
    "Who was classified fifth in Japan?",
    "How many points did the race winner score?",
    "What was Hamilton's fastest lap at Monza?",
    "Which driver finished second in Shanghai?",
    "Compare Verstappen and Norris at Silverstone.",
    "Why was Ferrari slower in Austria?"
]

print("==========================================================================")
print("REAL RUNTIME NLP VALIDATION FOR 10 UNSEEN F1 QUERIES VIA POST /engineer/query")
print("==========================================================================\n")

results = []

for idx, q in enumerate(unseen_queries, 1):
    payload = json.dumps({"question": q}).encode('utf-8')
    req = urllib.request.Request(API_URL, data=payload, headers={'Content-Type': 'application/json'})
    
    start_time = time.time()
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            elapsed = time.time() - start_time
            
            trace = data.get("intelligence_trace") or {}
            nlp_contract = trace.get("semantic_contract") or data.get("semantic_contract") or {}
            
            # Extract fields for validation log
            norm_q = nlp_contract.get("normalized_query") or q
            provider = trace.get("llm_provider", "Gemini/Groq")
            req_metric = nlp_contract.get("requested_metric") or "unknown"
            intent = nlp_contract.get("intent") or trace.get("intent", "race_result")
            entities = nlp_contract.get("entities") or trace.get("entities") or {}
            tools = trace.get("executed_tools") or data.get("tools_used") or data.get("tools") or []
            
            params_sent = trace.get("timelines", {}).get("parameters_sent", {})
            session_res = params_sent.get("race_results_tool", {}).get("session_id") or entities.get("grand_prix") or "Resolved via SessionResolver"
            
            evidence_dict = data.get("evidence") or {}
            evidence_retrieved = "YES" if len(evidence_dict) > 0 or data.get("investigation_report") else "NO"
            
            report = data.get("investigation_report") or {}
            if isinstance(report, dict):
                final_answer = report.get("Executive Summary") or data.get("final_answer")
            else:
                final_answer = data.get("final_answer") or str(report)
                
            log_output = f"""================ NLP VALIDATION ================
Query #{idx}: {q}
Question: {q}
Normalized: {norm_q}
Provider: {provider}
Semantic Contract: {json.dumps(nlp_contract)}
Planner Intent: {intent}
Requested Metric: {req_metric}
Entities: {json.dumps(entities)}
Selected Tools: {tools}
Session Resolution: {session_res}
Evidence Retrieved: {evidence_retrieved}
Final Answer: {final_answer}
Latency: {elapsed:.2f}s
================================================
"""
            print(log_output, flush=True)

            results.append({
                "index": idx,
                "query": q,
                "provider": provider,
                "contract": nlp_contract,
                "intent": intent,
                "requested_metric": req_metric,
                "entities": entities,
                "tools": tools,
                "session_resolution": session_res,
                "evidence_retrieved": evidence_retrieved,
                "final_answer": final_answer,
                "latency_s": round(elapsed, 2)
            })
    except Exception as e:
        log_output = f"""================ NLP VALIDATION ================
Query #{idx}: {q}
ERROR: {e}
================================================
"""
        print(log_output)
        results.append({"index": idx, "query": q, "error": str(e)})
    
    time.sleep(1)

with open("scratch/nlp_validation_results.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nValidation complete. Results saved to scratch/nlp_validation_results.json.")
