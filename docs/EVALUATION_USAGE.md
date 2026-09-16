# RAG evaluation: reproduction and limits

Run commands from the repository root. The offline inspection needs only Python
3; it does not run retrieval, OCR, generation, or RAGAS.

## Offline fixture and historical-report inspection

The old `data/uploads_test/sample_contract.txt` example is absent from this
checkout. Use the existing public demo `backend/uploads/demo_contract.txt`.
This text fixture cannot measure OCR accuracy.

```bash
python3 -B - <<'PY'
import json
from pathlib import Path

fixture = Path('backend/uploads/demo_contract.txt')
text = fixture.read_text(encoding='utf-8')
assert text.strip(), 'Demo fixture is empty'
print(f'Fixture available: {fixture} ({len(text)} characters)')
reports = sorted(Path('evaluation_results').glob('evaluation_*.json'))
assert reports, 'No historical reports found'
for path in reports:
    report = json.loads(path.read_text(encoding='utf-8'))
    perf = report['performance_metrics']
    enabled = report['metadata']['config']['include_ragas']
    print(path.name, f"queries={perf['successful_queries']}/{perf['total_questions']}",
          f"error_rate={perf['error_rate']}",
          'RAGAS disabled: scores unmeasured' if not enabled
          else 'RAGAS requested: inspect logs before interpreting scores')
PY
```

This reads saved data, not fresh evaluation results. Both committed October 2025
reports have `include_ragas: false`. One records 9/9 queries and approximately
15.5 seconds average query response time; the other records zero questions and
`error_rate: 1.0`. Their original document is absent. The demo is a new smoke-test
input, not a replacement that recreates the old benchmark.

## Optional live generation smoke test — dependencies and API access required

The command below has **not** been validated end to end in the dependency-free
environment used for the September 2026 documentation review. Before running:

- Prepare an isolated Python environment with the pipeline dependencies:
  NumPy, python-dotenv, LangChain/core/community/Groq integrations, document
  loaders (including Pillow and pytesseract imports), and the chosen embedding
  and vector-store stack. Existing requirements files are starting points, not
  a freshly verified lockfile. Activating a venv alone does not install them.
- Supply `GROQ_API_KEY` privately and confirm access to `GROQ_MODEL_NAME`
  (source default `llama-3.3-70b-versatile`). The pipeline loads dotenv files;
  never print or commit credentials.
- Provide real embedding dependencies/model assets; initialization may download
  missing model assets. HuggingFace defaults to
  `sentence-transformers/all-MiniLM-L6-v2` via `EMBEDDING_MODEL`; Chroma may use
  its own default embedding function. Record the path selected in run logs.
  Fake-embedding fallback is not semantic retrieval evidence.
- Use a disposable checkout/runtime directory. Besides vector data, the
  pipeline writes relative embedding caches. Keep new reports separate from
  historical artifacts; set a process time limit and API spending limit.

Only the public demo text and these three questions are intended inputs.
Questions and retrieved context go to Groq. Do not substitute client documents.
`use_ragas=False` disables the RAGAS judge, **not** remote generation. This
example does not request an OpenAI judge call.

```bash
python3 -B - <<'PY'
from pathlib import Path
from tempfile import TemporaryDirectory
from rag.evaluation.rag_evaluator import ContractQAEvaluator

document = Path('backend/uploads/demo_contract.txt').resolve(strict=True)
questions = [
    'What are the payment terms?',
    'Who owns the code developed under this agreement?',
    'How much written notice is required for termination?',
]
with TemporaryDirectory(prefix='rag-evaluation-') as temp:
    evaluator = ContractQAEvaluator(vector_db_path=str(Path(temp) / 'chroma'))
    result = evaluator.evaluate_rag_pipeline(
        str(document), test_questions=questions, use_ragas=False)
    evaluator.print_evaluation_summary(result)
    evaluator.save_evaluation_report(result, 'evaluation-smoke-report.json')
    if (result.total_questions != len(questions)
            or result.successful_queries != len(questions)
            or result.error_rate != 0):
        raise SystemExit('Generation smoke failed; inspect report and logs')
print('Queries completed; answer correctness remains to be reviewed')
PY
```

Manual reference answers: **30% upfront / 70% on completion**, **TechCorp Inc.
owns the code**, and **30 days written notice**. The aggregate report does not
retain per-question answers or contexts. Query completion cannot verify these
answers; quality evaluation needs a reviewed per-question record and labels.

## Interpret the actual schema

`save_evaluation_report(result, output_path)` writes `evaluation_results` and
recent `evaluation_history`. Automated historical files instead place metric
groups at the top level and add `metadata`.

| Field | Meaning and limitation |
| --- | --- |
| `successful_queries` | Calls returning without an exception, even if an answer is empty or incorrect. |
| `avg_response_time` | Mean timed query calls, excluding ingestion; not an end-to-end deployment benchmark. |
| `ragas_metrics`, `overall_score` | Default zeros can mean disabled, unavailable, or failed evaluation, not measured zero quality. `answer_similarity` is not populated by the current evaluation path. |
| `answer_completeness` | Capped heuristic from answer word count and context count, not correctness against a reference. |
| `context_utilization` | Fraction of distinct context words present in the answer, not retrieval precision or faithfulness. |
| `legal_terminology_usage` | Occurrence of a small legal-word list, not legal accuracy. |

The schema does not distinguish every disabled/failed RAGAS state; retain config
and logs. Generated reference answers are placeholders; custom questions get
empty references. Enabling RAGAS alone does not create a validated benchmark.
OCR needs image/text ground truth, retrieval needs relevance labels, and answer
quality needs reviewed answers and context. The existing reports do not
establish these independently or demonstrate production readiness.

## Entry-point limitations

- Prefer the direct call above: `quick_evaluate()` currently forwards unsupported
  `num_questions` to `evaluate_rag_pipeline()`.
- The automated runner records `num_questions` but passes `test_questions=None`,
  so that setting does not limit its question list.
- Automated `success: true` means the wrapper saved a report. Initialization
  failure can still yield zero questions and `error_rate: 1.0`; inspect metrics.
- `python3 -B tests/test_section_references.py` runs existing regression tests,
  but missing dependencies skip them. Exit zero with skips is not retrieval proof.

Before a later quality run, specify the labeled dataset, dependency environment,
embedding/generation versions, judge provider/budget, and per-question evidence
to retain. Do not infer quality improvement from this documentation repair or
compare different fixtures as one benchmark.
