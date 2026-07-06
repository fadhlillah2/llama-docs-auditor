# System Diagrams

Code-grounded diagrams for the High-Precision Contract Advisor RAG system.
**Source of truth is the source code** — every diagram below was traced from the files/lines cited under it, not from prose documentation. Where older docs disagree with the code, the code wins (see [Appendix: code vs docs discrepancies](#appendix-code-vs-docs-discrepancies)).

All diagrams are Mermaid and render natively on GitHub, GitLab, and VS Code (with the Mermaid extension).

**Convention:** if a PR changes any file cited under a diagram, update that diagram in the same PR.

**Reading order**

| Goal | Diagrams |
|---|---|
| First-time understanding | [1. Architecture](#1-architecture) → [2. Data model (ERD)](#2-data-model-erd) → [3. Sequences](#3-sequence-diagrams) |
| Production / debugging | [4. Activity flows](#4-activity--flow-diagrams) → [5. Deployment](#5-deployment) → [6. State machines](#6-state-machines) |

---

## 1. Architecture

Three-tier: Next.js frontend → Flask backend → LangChain RAG pipeline, with Groq as the only wired LLM provider.

```mermaid
flowchart LR
    Browser(["Browser"])

    subgraph FE["Frontend — Next.js :3000"]
        IDX["pages/index.tsx<br/>tabs: Upload · Documents · Analytics · Insights<br/>+ Chat always rendered"]
        UP["Upload.tsx"]
        CH["Chat.tsx"]
        DM["DocumentManager.tsx<br/>(localStorage only — no API calls)"]
        AD["DocumentAnalyticsDashboard.tsx"]
        API["services/api.ts — shared axios client<br/>timeout 300s · X-Session-ID header interceptor"]
    end

    subgraph BE["Backend — Flask :8081 (backend/)"]
        EP["REST endpoints — server.py<br/>/upload_file /ask_ai /status<br/>/document_analysis /analytics_data ..."]
        RL["RateLimiter (in-memory, hardcoded)<br/>upload 5/5min · query 30/min · general 100/min"]
        AU["BasicAuth — enforced in production only"]
        SM["SessionManager — session_manager.py<br/>in-memory dict + single RLock"]
    end

    subgraph RAGP["RAG pipeline — rag/"]
        RP["RAGPipeline — rag_pipeline.py"]
        LD["LoadDocuments — data_loader.py<br/>PDF · DOCX/DOC · TXT · images (OCR)"]
        CK["ChunkDocuments — chunk_documents.py<br/>1200 chars / 200 overlap"]
        EC["EmbeddingsCreator — embedding.py<br/>chromadb DefaultEmbeddingFunction (MiniLM-L6-v2, 384-dim)"]
        RT["Retriever — retriever.py<br/>ChromaDBEnhancedRetriever or SimpleRetriever"]
        VS["VectorStore — vector_store.py<br/>PersistentClient, pooled (max 5)"]
        CMOD["ChatModel — chat_model.py<br/>ChatGroq · temp 0.0 · timeout 300s · max_retries 2"]
        CC["ConversationChain — conversation_chain.py<br/>inline prompt template"]
    end

    subgraph ST["Persistent storage"]
        UPL[("data/uploads/")]
        CDB[("data/chroma_db/<br/>collection: contract_documents")]
        ECF[("cache/embeddings/*.json<br/>md5(text)-keyed")]
        FS[("backend/flask_session/")]
    end

    GROQ["Groq Cloud API<br/>llama-3.3-70b-versatile"]

    Browser --> IDX
    IDX --> UP
    IDX --> CH
    IDX --> DM
    IDX --> AD
    UP -->|"single file: raw fetch POST /upload_file"| EP
    UP -->|"multi/batch via ApiService"| API
    CH --> API
    AD --> API
    API --> EP
    EP --> RL
    EP --> AU
    EP --> SM
    EP --> UPL
    EP --> FS
    SM -->|"initialize_qa_chain() in background thread"| RP
    RP --> LD
    LD --> CK
    CK --> EC
    RP --> RT
    RT --> VS
    RP --> CMOD
    RP --> CC
    CC --> RT
    CMOD --> GROQ
    VS --> CDB
    EC --> ECF
```

**Traced from:** `frontend/src/pages/index.tsx:100-203`, `frontend/src/services/api.ts:4-31`, `frontend/src/components/Upload.tsx:512`, `backend/server.py` (routes 1015-2071, RateLimiter 524-601, BasicAuth 604-681), `backend/session_manager.py:52-59`, `rag/rag_pipeline.py:204-218`, `rag/chat_model.py:18-24`, `rag/vector_store.py:11-66`, `rag/embedding.py:54-71`.

Notes that surprise newcomers:

- `DocumentManager.tsx` (Documents tab) never calls the backend — it reads/writes `localStorage['uploadedDocuments']` only.
- The single-file upload path in `Upload.tsx` bypasses the shared axios client (raw `fetch`), so no `X-Session-ID` header is sent on that path.
- There is **no Ollama fallback in the wired application** — `grep -i ollama rag/*.py` returns nothing; Groq is the only LLM path. (The only Ollama code left in the repo is `backend/simple_server.py`, an orphaned standalone Flask app referenced by nothing else.)

---

## 2. Data model (ERD)

There is no relational database. "Entities" are the in-memory dataclasses, cache files, and ChromaDB records the system actually persists.

```mermaid
erDiagram
    UPLOADED_FILE ||--|| SESSION_DATA : "session_id = sha256(path+size+mtime+user)"
    FLASK_COOKIE_SESSION |o--o| SESSION_DATA : "rag_session_id"
    SESSION_DATA ||--o| QA_CHAIN : "None until background init completes"
    QA_CHAIN ||--|| RETRIEVER : "uses"
    UPLOADED_FILE ||--|{ DOCUMENT : "LoadDocuments — 1 per PDF page / whole file"
    DOCUMENT ||--|{ CHUNK : "RecursiveCharacterTextSplitter 1200/200"
    CHUNK ||--|| CHROMA_RECORD : "Chroma.from_documents"
    CHROMA_COLLECTION ||--|{ CHROMA_RECORD : "contains"
    SESSION_DATA ||--o{ CHAT_MESSAGE_FRONTEND : "localStorage conversationHistory (client-side)"

    SESSION_DATA {
        string session_id PK "sha256 hex"
        object qa_chain "Optional - None while processing"
        string file_path
        datetime created_at
        datetime last_accessed "expiry = 30 min after this"
        int query_count
        dict performance_stats "total_queries, avg_response_time, cache_hits, errors"
    }
    CHROMA_COLLECTION {
        string name "contract_documents - hardcoded, shared by ALL sessions"
        string hnsw_space "cosine"
        int hnsw_M "32"
        int max_elements "10000"
    }
    CHROMA_RECORD {
        string document "chunk text incl. [Document|Title|Page] header"
        dict metadata "source, page; OCR: ocr_confidence, image_quality_score, ..."
        vector embedding "384-dim"
    }
    EMBEDDING_CACHE_FILE {
        string filename PK "md5(text).json - content-addressed, global"
        floats embedding "384-dim"
        string text_preview "first 100 chars"
        int text_length "written by query path and test scripts only - see Key facts"
    }
    CHAT_MESSAGE_FRONTEND {
        string position "left_bubble | right_bubble"
        string message
        string timestamp
        string id
    }
    EVALUATION_RESULT {
        dict ragas_metrics "faithfulness, answer_relevancy, context_recall, context_precision, answer_similarity"
        dict performance_metrics "avg_response_time, total_questions, successful_queries, error_rate"
        dict custom_metrics "answer_completeness, context_utilization, legal_terminology_usage"
        float overall_score
        dict metadata "added by tests/evaluation/automated_evaluation.py"
    }
```

**Traced from:** `backend/session_manager.py:28-46,296-310`, `backend/server.py:719-726,1079`, `rag/vector_store.py:88-162`, `rag/embedding.py:25-52`, `rag/chunk_documents.py:46-56`, `frontend/src/types/api.ts:145-151`, `rag/evaluation/rag_evaluator.py:38-73`, `tests/evaluation/automated_evaluation.py:186-198`.

Key facts:

- **One shared ChromaDB collection** (`contract_documents`) for all sessions — there is no per-session vector isolation (`rag/retriever.py:488`).
- The embedding cache (`cache/embeddings/*.json`) is content-addressed and global, but **the production upload path never writes it**: `Chroma.from_documents` calls `EmbeddingsCreator.embed_documents`, which dispatches to the model's own `embed_documents`/`__call__` before ever reaching the cached branch (`rag/embedding.py:73-85`). Cache files are written only by query-time `embed_query_cached` (`rag/retriever.py:189-190`) and by test scripts (`tests/evaluation/test_rag_integration.py`).
- `SessionData` lives only in memory — a backend restart loses all sessions (uploaded files and ChromaDB records survive).
- **Schema mismatch (known bug):** the frontend sends `chat_history` as a JSON *string* of `{position, message}` objects; the backend passes it through unparsed, while `rag/conversation_chain.py:228-233`'s fallback path expects a *list* of `{type: 'human'|'ai', content}` (`frontend/src/components/Chat.tsx:239`, `backend/server.py:1774,1788`).

---

## 3. Sequence diagrams

### 3.1 Upload → background processing → ready

Upload returns **201 immediately**; the QA chain is built in a background thread. Clients discover readiness by polling `GET /status`.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant UP as Upload.tsx
    participant API as services/api.ts
    participant SRV as server.py
    participant SM as SessionManager
    participant BG as Background thread
    participant RAG as RAGPipeline

    U->>UP: drop/select file (client validates: extension, ≤16MB)
    UP->>SRV: POST /upload_file (multipart)
    SRV->>SRV: rate limit (5/5min) → allowed_file() → secure_filename() → save → validate_file_content()
    SRV->>SM: create_session(file_path, user_id)
    SM-->>SRV: session_id = sha256(path, size, mtime, user) — reuse branch exists but save() refreshes mtime, so re-uploads practically always get a NEW id
    SRV->>SRV: session['rag_session_id'] = session_id (server-side Flask-Session filesystem store — browser only gets an opaque cookie)
    SRV->>BG: threading.Thread(async_initialize).start()
    SRV-->>UP: 201 {status: success, processing_status: in_progress, session_id: first 8 chars only}
    Note over BG,RAG: initialize_qa_chain holds the single SessionManager RLock<br/>for the entire build — all other session operations<br/>(any /status, /ask_ai for ANY session) block until it finishes
    BG->>SM: initialize_qa_chain(session_id)
    SM->>RAG: RAGPipeline(file_path, vector_db_path).qa_chain()
    RAG-->>SM: qa_chain — or exception (session then stays "processing" forever)
    loop every 2s, max 60 attempts (multi-file path via pollProcessingStatus — single-file path does NOT poll)
        API->>SRV: GET /status
        SRV-->>API: {status: "processing" | "ready"}
    end
```

**Traced from:** `backend/server.py:1019-1138` (upload), `1086-1116` (async_initialize) + `1118-1122` (thread spawn), `1140-1174` (/status), `backend/session_manager.py:62-148,296-310`, `frontend/src/services/api.ts:277-317` (pollProcessingStatus), `frontend/src/components/Upload.tsx:426-596`.

### 3.2 Ask AI (query with chat history)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant CH as Chat.tsx
    participant API as services/api.ts
    participant SRV as server.py /ask_ai
    participant SM as SessionManager
    participant QA as qa_chain
    participant RET as Retriever
    participant G as Groq API

    U->>CH: type question (≤400 chars) + Enter
    CH->>API: askQuestion(prompt, JSON.stringify(chatMessages))
    API->>SRV: POST /ask_ai {prompt, chat_history} + X-Session-ID header (from localStorage)
    SRV->>SRV: rate limit (30/min) → validate_prompt() → sanitize_user_input()
    SRV->>SM: resolve session: Flask cookie → X-Session-ID header → most-recent active session
    alt no active session
        SRV-->>API: 400 {status: no_session}
    else qa_chain still None (processing)
        SRV-->>API: 202 {status: processing}
    else session gone
        SRV-->>API: 400 {status: session_expired}
    end
    SRV->>SRV: if question mentions "section"/"iv."/"article" → search_section_directly()
    SRV->>QA: invoke({question, chat_history})
    QA->>QA: _get_docs() override (chain-side context optimizer)
    QA->>RET: retriever.invoke → _get_relevant_documents(query)
    RET->>RET: query cache → ChromaDB similarity_search k=4 → SimpleRetriever hybrid fallback
    RET-->>QA: docs (truncated to first 3 if est. tokens > 70% of 6000 budget)
    QA->>G: chat completion — inline system prompt + stuffed context
    G-->>QA: answer
    QA-->>SRV: {answer, source_documents}
    SRV->>SRV: section match found earlier? overwrite answer with section extract
    SRV->>SM: update_session_stats(response_time)
    SRV-->>API: 200 {result, response_time, session_info, source_documents (200-char previews)}
    API-->>CH: append AI bubble
```

**Traced from:** `backend/server.py:1706-1843`, `frontend/src/components/Chat.tsx:176-313`, `frontend/src/services/api.ts:169-174`, `rag/conversation_chain.py:78-160`, `rag/retriever.py:533-580`.

---

## 4. Activity / flow diagrams

### 4.1 Pipeline construction — the fallback chain

The most important debugging map in the system: almost every stage has a silent fallback, so a "working" answer may have been produced by degraded components (e.g. `FakeEmbeddings`).

```mermaid
flowchart TD
    A["RAGPipeline.qa_chain() requested"] --> B["ChatModel.initialize_chat_model()<br/>raises ValueError if GROQ_API_KEY missing"]
    B --> C["pipeline()"]
    C --> D["_load_documents_with_retry<br/>3 attempts, fixed 1s sleep"]
    D -->|all attempts fail| Z
    D --> E["_chunk_documents_with_validation<br/>chunk_size 1200 / overlap 200, drop empty chunks"]
    E --> F["_initialize_embeddings_with_retry<br/>3 attempts, fixed 2s sleep"]
    F --> G{"chromadb DefaultEmbeddingFunction OK?"}
    G -->|no| G2["FakeEmbeddings(384)<br/>deterministic pseudo-vectors — answers become meaningless"]
    G -->|yes| H
    G2 --> H["Retriever.get_retriever()"]
    H --> I{"ChromaDB vector store created?"}
    I -->|yes| J["ChromaDBEnhancedRetriever<br/>(wraps SimpleRetriever as inner fallback)"]
    I -->|no| K["SimpleRetriever<br/>in-memory hybrid search, no persistence"]
    C -->|any exception| Z["_fallback_pipeline()<br/>reload docs (first 10 only) + FakeEmbeddings"]
    J --> L["ConversationChain.create_retrieval_qa_chain"]
    K --> L
    Z --> L
    L --> M{"OptimizedConversationalRetrievalChain OK?"}
    M -->|yes| P["qa_chain ready"]
    M -->|no| N{"standard ConversationalRetrievalChain OK?"}
    N -->|yes| P
    N -->|no| O["SimpleDirectQAChain<br/>manual prompt + llm.invoke, context[:4000]"]
    O --> P
```

**Traced from:** `rag/rag_pipeline.py:25-218`, `rag/embedding.py:54-71`, `rag/retriever.py:441-513`, `rag/conversation_chain.py:78-181,184-273` (chain fallback try/except lives in `from_llm`, lines 162-181).

### 4.2 Query-time retrieval flow

```mermaid
flowchart TD
    Q["query from chain _get_docs() → retriever.invoke"] --> C1{"in ChromaDBEnhancedRetriever._query_cache?"}
    C1 -->|yes| R1["return cached docs"]
    C1 -->|no| C2["vector_store_wrapper.similarity_search_with_stats(query, k=4)"]
    C2 -->|success| R2["return docs + cache them"]
    C2 -->|error / empty| S0["SimpleRetriever._get_relevant_documents<br/>checks its OWN cache first (key hybrid_query)"]
    S0 --> S["_hybrid_search"]
    S --> S1["_semantic_search top-15<br/>cosine vs cached embeddings"]
    S --> S2["_keyword_search top-10<br/>TF-IDF cosine"]
    S1 --> S3["combine: semantic 0.7 + keyword 0.3<br/>+0.1 bonus if in both"]
    S2 --> S3
    S3 --> S4["_apply_contract_boosting<br/>legal keywords / section markers / numbers"]
    S4 --> S5{"query has section reference<br/>AND results lack an exact section match?"}
    S5 -->|yes| S6["_exact_section_search —<br/>HARDCODED for IV.15 only:<br/>any other section reference finds nothing"]
    S5 -->|no| S7["return top 8 docs"]
    S6 --> S7
```

**Traced from:** `rag/retriever.py:106-419,533-580` (cache check 112-118, condition 160, hardcoded patterns 396-400).

---

## 5. Deployment

```mermaid
flowchart TB
    subgraph DEV["Development (actual current state)"]
        subgraph host["Developer machine (WSL2/Linux/macOS)"]
            B(["Browser"]) --> N["Next.js dev server :3000<br/>cd frontend && npm run dev"]
            B -->|"XHR direct to backend"| F
            N -.->|"CORS allowed: localhost:3000/3001"| F["Flask dev server 127.0.0.1:8081<br/>cd backend && python3 server.py<br/>(run-project.sh was DELETED in commit 44131fff)"]
            F --> D1[("data/uploads/")]
            F --> D2[("data/chroma_db/")]
            F --> D3[("cache/embeddings/")]
            F --> D4[("backend/flask_session/")]
            F --> D5[("logs/ — LOG_FILE env, default logs/backend/app.log")]
        end
        F -->|"HTTPS, timeout 300s"| GR["Groq API — api.groq.com<br/>llama-3.3-70b-versatile"]
        F -.->|"first run only: embedding model download"| HF["Model hub<br/>MiniLM-L6-v2 via chromadb DefaultEmbeddingFunction"]
    end

    subgraph PROD["Production (per config — no deploy scripts exist in repo)"]
        U2(["Users"]) --> NG["Reverse proxy / nginx<br/>(suggested by server.py print — no config in repo)"]
        NG --> F2["Flask 0.0.0.0:8081, debug=False<br/>ssl_context only if cert.pem+key.pem exist, else plain HTTP<br/>BasicAuth API keys ENFORCED (ENVIRONMENT=production)<br/>requires FLASK_SECRET_KEY (startup fails without it)"]
        F2 --> SU[("SECURE_UPLOAD_DIR<br/>default /var/lib/contract-advisor/uploads (chmod 750)")]
        F2 --> GR
    end
```

**Traced from:** `backend/server.py:607-620` (BasicAuth), `682-730` (CORS/upload dir), `819` (chmod 750), `2099-2118` (startup/SSL), `backend/server.py:31-366` (ConfigValidator — the *actual* config enforcement incl. FLASK_SECRET_KEY exit), `.env.example`, `git show 44131fff^:run-project.sh` (deleted file), `setup-project.sh:75-140`. Note: `backend/config.py`'s class hierarchy is **never imported by server.py** — it is a parallel, unwired config system.

Operational facts:

- **`run-project.sh` no longer exists** (deleted in commit `44131fff`); start services manually: backend first, then frontend.
- Dev CORS in `server.py` allows ports 3000 and 3001; `config.py`'s `get_cors_origins()` is a separate, unused implementation.
- In production without cert files, the server **starts on plain HTTP on 0.0.0.0** with only a printed warning.
- Rate limits are hardcoded in `server.py:529-533`; the `RATE_LIMIT_*` env vars are read only to print warnings, never applied.

---

## 6. State machines

### 6.1 Backend session lifecycle (`SessionManager`)

```mermaid
stateDiagram-v2
    [*] --> Created : POST /upload_file → create_session()
    Created --> Processing : Thread(async_initialize) started
    Processing --> Ready : initialize_qa_chain() sets qa_chain
    Processing --> Processing : init exception → qa_chain stays None (no error state, /status says processing forever)
    Ready --> Ready : /ask_ai — query_count++, last_accessed refreshed
    Created --> Expired : 30 min since last_accessed
    Processing --> Expired : 30 min since last_accessed
    Ready --> Expired : 30 min since last_accessed
    Expired --> [*] : lazy check on next access, or sweeper thread every 10 min → _cleanup_session()
```

**Traced from:** `backend/session_manager.py:62-165,280-354`, `backend/server.py:1086-1122,1140-1174`.

Debugging notes:

- Timeout values are the **hardcoded constructor defaults** (30 min / 10 min): the singleton is built as `SessionManager()` with no args (`session_manager.py:358`) — the `SESSION_TIMEOUT_MINUTES` env var only affects the Flask cookie config, not `SessionManager`.
- A failed initialization is indistinguishable from a slow one via the API. Check backend logs, not `/status`.
- Session-id reuse (`session_manager.py:70-75`) almost never triggers in practice: `session_id = sha256(path+size+mtime+user)`, but `upload_file()` calls `file.save()` **before** `create_session()` reads `os.stat()` — every upload refreshes mtime, so byte-identical re-uploads still get a new session.

### 6.2 Client-side upload stages (`Upload.tsx`)

```mermaid
stateDiagram-v2
    [*] --> uploading : useState default is uploading — there is NO idle state in the code
    uploading --> processing : fetch resolved — stage flips BEFORE response.ok is checked (progress jumps to 70)
    uploading --> error : network failure only (fetch itself rejects)
    processing --> error : !response.ok OR data.status !== success
    processing --> complete : data.status === success
    complete --> uploading : auto-reset after 2s (setUploadStage back to uploading)
    error --> uploading : next handleFileSubmit()
```

**Traced from:** `frontend/src/components/Upload.tsx:35` (`useState<'uploading' | 'processing' | 'complete' | 'error'>('uploading')`), `426-596` (handleFileSubmit), `517-523` (stage set to `processing` before `!response.ok` check), `567-572` (2s reset back to `'uploading'`).

The stage value is only meaningful while `isUploading` is true — outside an active upload the UI simply doesn't render it, which is why the missing `idle` state never shows up visually. A non-OK HTTP response surfaces as a `processing → error` transition, not `uploading → error`, because the stage flips unconditionally as soon as `fetch` resolves.

Note: the progress bar on the single-file path is **simulated** (`setInterval` +10 every 200ms capped at 60, `Upload.tsx:505-510`), and `EnhancedProgressIndicator` runs its own random-increment simulation decoupled from real network state.

---

## Appendix: code vs docs discrepancies

Found while tracing these diagrams (2026-07). The diagrams above follow the **code**. Update this table when items are fixed.

| # | Documented claim (CLAUDE.md / README) | What the code actually does | Evidence |
|---|---|---|---|
| 1 | Chunks: 800 chars / 100 overlap | 1200 chars / 200 overlap | `rag/rag_pipeline.py:108` |
| 2 | Retry with exponential backoff | Fixed sleeps: 1s (load), 2s (embeddings) | `rag/rag_pipeline.py:99,138` |
| 3 | Ollama fallback in `rag/chat_model.py` | No Ollama code exists in `rag/` at all | `grep -i ollama rag/*.py` → 0 hits |
| 4 | Embeddings via HuggingFace `sentence-transformers` | `chromadb` `DefaultEmbeddingFunction` (same MiniLM model, different wrapper); the `HuggingFaceEmbeddings` class in `embedding.py` is never called | `rag/embedding.py:60-65,156-199` |
| 5 | `craft_prompt.py` provides prompt templates | Never imported; the live prompt is inline in `conversation_chain.py:82-108` | grep: 0 external references |
| 6 | `./run-project.sh` starts all services | File deleted in commit `44131fff`; start backend & frontend manually | `git show 44131fff^:run-project.sh` |
| 7 | Batch upload feature (`/upload_batch`) | Broken: `get_config` is called but never imported (NameError), plus `create_session()` called with a mismatched signature; `BatchRAGPipeline` also calls several methods that don't exist | `backend/server.py:1601,1657`, `rag/rag_pipeline.py:296-315` |
| 8 | `chat_history`: `[{type: "human"\|"ai", content}]` | Frontend sends a JSON **string** of `{position, message}` objects; backend forwards it unparsed | `frontend/src/components/Chat.tsx:239`, `backend/server.py:1774` |
| 9 | Rate limits configurable via env | Hardcoded in `RateLimiter.__init__`; `RATE_LIMIT_*` env vars only produce startup warnings | `backend/server.py:529-533` |
| 10 | Session timeout configurable via `SESSION_TIMEOUT_MINUTES` | `SessionManager()` uses hardcoded 30-min default; env var affects only the Flask cookie config | `backend/session_manager.py:51,358` |
| 11 | Per-session document isolation (implied) | All sessions share one ChromaDB collection `contract_documents` | `rag/retriever.py:488` |
| 12 | — | `OptimizedConversationalRetrievalChain` is defined twice identically; the second definition silently wins | `rag/conversation_chain.py:134,276` |
| 13 | `backend/config.py` is the configuration system | `config.py`'s class hierarchy is never imported by `server.py`; the real config enforcement is `server.py`'s own `ConfigValidator` (lines 31-366) | repo-wide grep: no imports of `config` outside `config.py` |
| 14 | Embedding cache populated during document processing | Production uploads never write `cache/embeddings/*.json` — `embed_documents` dispatches to the model before reaching the cached branch; only query-time `embed_query_cached` and test scripts write cache files | `rag/embedding.py:73-85`, `rag/retriever.py:189-190` |
| 15 | Same file re-uploaded ⇒ session reused | `file.save()` refreshes mtime before `create_session()` hashes it, so re-uploads practically always create a new session | `backend/server.py:1055,1075`, `backend/session_manager.py:296-310` |
