# CodeMate AI — Backend & LLM Integration Engine

FastAPI-powered asynchronous intelligence layer providing competitive programming problem comprehension, algorithm selection, multi-language code generation, Big-O complexity analysis, and code optimization for the **CodeMate AI** Chrome Extension.

---

## 🏗️ Architecture Overview

The backend is built around a **Provider-Agnostic LLM Layer** and a **Structured Pipeline**:

```
[Problem Request] ──> [Security & Rate Limiting]
                              │
                              ▼
                   [Constraint Analyzer] ──> Feasible Big-O Budget
                              │
                              ▼
                   [Algorithm Planner]   ──> Optimal Algorithmic Paradigm
                              │
                              ▼
                    [Prompt Engineering]
                              │
                              ▼
                  [Configured AI Provider] (Mock / Gemini / OpenAI)
                              │
                              ▼
                  [JSON Extraction & Parsing]
                              │
                              ▼
                [Response & Static Validation] ──> [Validated Response]
```

### Key Capabilities
1. **Provider Abstraction:** Clean `AIProvider` interface supporting Google Gemini, OpenAI/compatible endpoints, and an offline deterministic `MockAIProvider`.
2. **Pedagogical Explanation:** Breaks down problem statements into plain language, explains input/output structures, and provides step-by-step sample walkthroughs.
3. **Algorithm Planning:** Analyzes bounds (e.g. $N \le 10^5 \implies O(N \log N)$), compares brute-force with optimal approaches, and recommends appropriate data structures.
4. **Complete Code Generation:** Generates complete, compilable solutions in **C++**, **Python**, **Java**, **C**, **JavaScript**, and **Go**. No pseudocode, ellipses, or placeholder stubs.
5. **Rigorous Complexity Analysis:** Evaluates asymptotic time complexity and auxiliary space complexity with mathematical justifications.
6. **Code Optimization:** Refactors existing student code, eliminating I/O bottlenecks and algorithmic inefficiencies while calculating complexity deltas.

---

## 🛠️ Technology Stack

- **Runtime:** Python 3.11+ (Tested on Python 3.14)
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous, OpenAPI/Swagger automated docs)
- **Validation:** [Pydantic v2](https://docs.pydantic.dev/) + `pydantic-settings`
- **HTTP Client:** [httpx](https://www.python-httpx.org/) (Asynchronous HTTP requests)
- **Server:** [Uvicorn](https://www.uvicorn.org/) (ASGI high-performance server)
- **Testing:** [pytest](https://docs.pytest.org/) + `pytest-asyncio` + FastAPI TestClient

---

## 🚀 Quickstart & Installation

### 1. Create and Activate Virtual Environment
```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Linux / macOS
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy the example configuration:
```bash
cp .env.example .env
```
Edit `.env` as needed:
```ini
# To use offline simulation (no API keys required):
AI_PROVIDER=mock

# To use Google Gemini:
AI_PROVIDER=gemini
AI_MODEL=gemini-3.5-flash
AI_API_KEY=your_gemini_api_key_here

# To use OpenAI or compatible providers (Groq, Together, DeepSeek, LocalAI):
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=your_openai_api_key_here
```

### 4. Run the Development Server
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation will be available at:
- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Running Automated Tests

Run the full 21-test pytest suite:
```bash
pytest app/tests -v
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & service metadata |
| `GET` | `/api/ai/status` | Provider status & connectivity check |
| `POST` | `/api/problem/analyze` | Deep problem analysis, constraints, and algorithm recommendation |
| `POST` | `/api/problem/explain` | Student-friendly problem explanation & sample trace |
| `POST` | `/api/solution/generate` | Complete code generation with Big-O analysis |
| `POST` | `/api/solution/optimize` | Refactoring and performance optimization of existing code |

---

## 🔒 Security Architecture

- **Zero API Key Leakage:** API credentials reside strictly in the backend process; never sent to clients or browser extensions.
- **Prompt Injection Defense:** Neutralizes instruction override attempts embedded within untrusted problem statement text (`sanitize_untrusted_text()`).
- **Payload Limits:** Rejects payloads exceeding 1MB (`413 Payload Too Large`).
- **Rate Limiting:** Enforces sliding-window client request limits (`429 Too Many Requests`).
- **Safe Sandboxing:** Does not execute generated code directly on the server host.

