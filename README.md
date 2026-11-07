# CodeMate AI — Your Intelligent Coding Companion

[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.162-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Backend Tests](https://img.shields.io/badge/Backend_Tests-44%2F44_Passing-brightgreen)](docs/reports/phase-7/PHASE7_TEST_REPORT.md)
[![Phase 7 Intelligence](https://img.shields.io/badge/Phase_7_Intelligence-9%2F9_Passing-brightgreen)](docs/reports/phase-7/PHASE7_TEST_REPORT.md)
[![Phase 6 SaaS Tests](https://img.shields.io/badge/Phase_6_SaaS_Tests-16%2F16_Passing-brightgreen)](docs/reports/phase-6/PHASE6_TEST_REPORT.md)
[![Phase 5 Security](https://img.shields.io/badge/Phase_5_Security-10%2F10_Passing-brightgreen)](docs/reports/phase-5/PHASE5_TEST_REPORT.md)
[![Phase 5 Reliability](https://img.shields.io/badge/Phase_5_Reliability-6%2F6_Passing-brightgreen)](docs/reports/phase-5/PHASE5_TEST_REPORT.md)

**CodeMate AI** is an intelligent Chrome extension and AI backend companion engineered to transform the student coding practice experience on competitive programming platforms such as CodeChef, LeetCode, and HackerRank.

By combining native web editor API integration, a hardened smart clipboard engine, reusable template management, and generative AI, CodeMate AI empowers students to practice efficiently without the friction of repetitive boilerplate typing or platform copy-paste restrictions.

---

## 🚀 Key Features

### Phase 7: Multi-File Project Intelligence, Spring Boot Understanding & AI-Powered Code Workflow (New)
- **🗂️ Safe Archive Import & Exclusion Manager (`/api/projects/import-zip`):**  
  Memory-safe ZIP ingestion pipeline equipped with Zip-Slip path traversal rejection, 100:1 bomb ratio guards, symlink neutralization, and automated exclusion of build artifacts (`target/`, `node_modules/`, `build/`) and `.env` files.
- **🔐 Deterministic Secret Scanning & Redaction (`SecretScanner`):**  
  Scans all ingested source files and redacts Gemini, OpenAI, Razorpay, AWS, GitHub credentials, private keys, and database URI passwords into structured placeholder tokens before context storage or transmission.
- **☕ Spring Boot Domain Intelligence & Anti-Pattern Detection (`SpringBootAnalyzer`):**  
  AST parser extracting Spring stereotypes (`@RestController`, `@Service`, `@Repository`, `@Entity`), route endpoints (`@GetMapping`, `@PostMapping`), and constructor dependency injection. Automatically detects architectural anti-patterns (`CONTROLLER_CALLS_REPOSITORY`, `ENTITY_LEAK_IN_API`).
- **🕸️ Directed Project Dependency Graph & Blast Radius (`ProjectGraph`):**  
  Maintains 8 typed semantic relationships (`IMPORTS`, `EXTENDS`, `IMPLEMENTS`, `INJECTS`, `CALLS`, `USES`, `MAPS_TO`, `TESTS`). Calculates change-impact blast radius (`impacted_callers`, `impacted_injection_points`, `impacted_tests`) when modifying symbols.
- **🧩 Hybrid Context Retrieval with Token Budget Compression (`ContextRetriever`):**  
  Retrieves exact symbol definitions and immediate callers, compresses ancillary context into interface signatures, and strictly enforces a 6,000-token budget. Zero raw whole-repo dumping to LLMs.
- **📝 Coordinated Multi-File Task Planner & Patch Engine (`TaskPlanner`, `PatchEngine`):**  
  Synthesizes multi-step plans (`INSPECT`, `MODIFY`, `CREATE`, `VERIFY`) and coordinated unified diffs across multiple files. Prevents accidental overwrites through SHA-256 pre-condition hash checks and provides a 1-click atomic rollback ledger.
- **🩺 Diagnostic Error Parser & Targeted Repair Workflow (`RepairWorkflow`):**  
  Parses multi-line Maven/compiler error logs, categorizes errors (`MISSING_SYMBOL`), and synthesizes targeted minimal repairs (e.g., auto-importing missing packages) bounded by a 3-attempt safety limit.
- **🖥️ Extension Project Workspace Interface (`ProjectWorkspace.tsx`):**  
  Interactive sidepanel tab featuring Project Explorer with file tree, Architecture breakdown with endpoint lists, Agent Task Planner with unified diff review, and 1-Click Diagnostic Repair.

### Phase 6: Authentication, Device Registration, Sessions, Subscriptions & Razorpay
- **🔐 Multi-Tier Identity & Security Engine (`/api/auth`):**  
  Enterprise authentication infrastructure with Argon2id password hashing (`time_cost=3`, `memory_cost=64MB`), 15-minute JWT access tokens (`HS256`), rotating cryptographically random refresh tokens stored as SHA-256 digests, and strict password strength validation.
- **📱 Layer 1 — Hardware-Independent Device Registration (`/api/devices`):**  
  Privacy-preserving device management using installation-generated UUIDs (`codemate_device_id`). Enforces plan-based device limits (Free: 1, Pro: 3, Premium: 5) with structured `DEVICE_LIMIT_REACHED` error models and one-click remote device revocation without invasive hardware/canvas fingerprinting.
- **💻 Layer 2 — Concurrent Session Governance (`/api/sessions`):**  
  Active session tracking enforcing concurrent login limits (Free: 1, Pro: 2, Premium: 5). Emits structured `SESSION_LIMIT_REACHED` alerts and supports selective session termination and "Sign Out All Other Sessions".
- **🛡️ Layer 3 — Replay Attack & Suspicious Activity Detection:**  
  Automatic detection of refresh token reuse. Any presentation of a previously rotated or revoked token instantly revokes **all** active sessions across all devices for that account and logs a critical event in `SecurityLog`.
- **👑 Server-Side Subscription & Entitlement Service:**  
  Centralized server-side entitlement guards (`require_feature_entitlement`, `enforce_daily_quota`) protecting all AI generation, optimization, fix, explanation, and analysis endpoints. Zero trust in client-supplied status; authoritative state resolved directly from PostgreSQL/SQLite.
- **💳 Razorpay Payment Gateway & Server-Enforced Pricing (`/api/payments`):**  
  End-to-end checkout pipeline for Pro (₹499/mo) and Premium (₹999/mo) subscriptions. Server calculates amounts in paise (client-supplied prices rejected), HMAC-SHA256 signature verification, raw-body webhook signature checks, and deduplicated idempotent webhook processing.
- **🖥️ In-Extension Account & Billing Dashboard (`AccountView.tsx`):**  
  Dedicated React 18 management view featuring Profile, Active Devices, Live Sessions, Subscription Plans with feature comparisons, and comprehensive Payment Transaction History.

### Phase 5: Production Foundation, Security Hardening & Safe Automation
- **🛡️ Safe Auto-Pilot 8-Stage State Workflow (`SafeAutoPilot.tsx`):**  
  Replaces unverified one-click overwrites with an explicit, educational, state-driven workflow: `IDLE` → `EXTRACTING` → `GENERATING` → `REVIEW_SOLUTION` → `APPLIED_TO_EDITOR` → `DIAGNOSING_FIX` → `REVIEW_PATCH` → `COOLDOWN`. Requires explicit student approval before replacing code in the editor.
- **🚫 Zero Platform Cheating / Academic Integrity Compliance:**  
  Strictly prohibits automated contest submissions, auto-run loops, proctoring evasion, or stealth disguise techniques. Code replacement retains original student code snapshots and native Ace `UndoManager` stack (`Ctrl+Z`).
- **🩺 Diagnostic Error Patching & Diff Engine (`POST /api/solution/fix`):**  
  Diagnoses compiler errors, runtime exceptions, and test case failures, categorizing bugs (`COMPILATION_ERROR`, `LOGICAL_ERROR`, etc.) and generating minimal, clean diff patches without executing untrusted code on the server.
- **🔒 Enterprise Security & Message Bridge Hardening:**  
  Enforces origin allowlisting in the background worker, cryptographically secure UUID nonces (`crypto.randomUUID()`) in the DOM event bridge, defensive HTTP security headers (`nosniff`, `DENY`, `strict-origin`), and strict production CORS.
- **📊 Technical Observability & Tracing:**  
  End-to-end request tracing via correlation IDs (`X-Request-ID`), structured logging without sensitive body/token leakage, and container readiness probes (`GET /api/ready`).
- **🔐 Versioned Storage & Data Privacy (`StorageService.ts`):**  
  Versioned schema validation (`version: 1`), local student activity history (ring buffer of 25), and a complete local data purge utility (`clearAllLocalData`) honoring student privacy rights.

### Phase 4: AI Frontend Integration (Complete & Enhanced)
- **✨ Interactive AI Practice Workspace (`AIActions.tsx`):**  
  Dedicated, tabbed developer workspace for **Solution Generation**, **Algorithmic Analysis**, **Plain-Language Explanations**, and **Code Optimization**.
- **⚡ 1-Click Auto Solve & Expandable Pill Launcher (`floating-launcher.ts`):**  
  Modern glassmorphic floating pill widget anchored safely above CodeChef footer controls (`bottom: 85px; right: 24px;`). Expands on hover with dual actions: `[ ⚡ 1-Click Solve ]` to automatically read editor starter code, query the AI, and replace code in the Ace Editor; and `[ 🤖 CodeMate ]` to open the full companion side panel.
- **🧩 Starter Code Completion Engine:**  
  Detects pre-populated platform function/class signatures (e.g. `class Solution { public: Node* createBST(vector<int> &nums) }`) and generates the completed implementation preserving signatures instead of emitting conflicting `main()` functions.
- **🎓 Natural Student Competitive Programming Style:**  
  Generates idiomatic competitive programming code using `using namespace std;`, `typedef long long ll;`, and natural, logical variable names (`low, high, mid, ans, res, cnt`) with human variance.
- **⚡ Direct One-Click Code Replacement (`SolutionPreview.tsx`):**  
  Primary `[ ⚡ Replace in Editor ]` action alongside `[ Copy ]` button, inserting code directly into CodeChef's Ace Editor with full `UndoManager` stack preservation (`Ctrl+Z`).
- **🔍 Deep Problem Statement & Section Extractor (`PageDetector`):**  
  Automatically extracts problem statements, input/output formats, constraints, and sample test cases directly from CodeChef practice DOMs, with a built-in manual statement fallback drawer.
- **🛠️ In-Extension Code Optimization with Editor Fetching:**  
  Pulls active student code directly from CodeChef's Ace Editor via `ExtensionMessagingService.getEditorCode()`, eliminates quadratic/bottleneck loops, and displays complexity deltas ($O(N) \rightarrow O(1)$).
- **🌐 Real-Time Backend Connection & Provider Switcher:**  
  Live health status pill (🟢 Online / 🔴 Offline) and an in-extension Settings drawer supporting seamless switching between offline Mock practice and live Google Gemini AI.

### Phase 3: AI Backend & Multi-Provider LLM Integration
- **🧠 Provider-Agnostic LLM Architecture:**  
  Pluggable AI layer with support for **Google Gemini** (Gemini 2.0 / 2.5 / 3.8 via `google-genai` Interactions API), **OpenAI** (GPT-4o / GPT-4o-mini REST), and a high-fidelity **Deterministic Mock Provider** (`mock`) for zero-cost offline testing.
- **🔍 Algorithmic Problem Comprehension & Student Explainer:**  
  Decomposes competitive programming statements, identifies optimal algorithm families (DP, Greedy, Graphs, Two Pointers), calculates constraint-based Big-O time budgets, and provides plain-English walkthroughs with real-world analogies.
- **⚡ Multi-Language Solution Generator (C++, Python, Java, C, JS, Go):**  
  Generates complete, runnable, and syntactically clean competitive code equipped with platform-optimized fast I/O idioms (e.g. `ios_base::sync_with_stdio(false); cin.tie(NULL);` for C++, `sys.stdin.readline` for Python, `BufferedReader` for Java).
- **📊 Asymptotic Big-O Complexity Analyzer:**  
  Computes normalized Big-O time and auxiliary space complexity ($O(N)$, $O(N \log N)$, $O(1)$) with mathematical proofs, edge-case analysis, and input vs. auxiliary memory segregation.

### Phase 2: Smart Clipboard & Hardened Editor Engine
- **📋 Smart Clipboard Management (`readText()` / `writeText()`):**  
  Direct, user-initiated clipboard access bypassing platform keystroke listeners. Includes empty/whitespace guards, Unicode/indentation preservation, and heuristic syntax language detection (C++, Python, Java, JS).
- **📑 Reusable Code Snippets & Templates:**  
  Instant access to standard competitive programming templates (C++ Fast I/O, C++ Basic, Python 3, Java Solution). Users can create, save, copy, insert, and delete custom snippets backed by `chrome.storage.local`.
- **🛡️ Safe Insertion Modes & Confirmation Modal:**  
  Two distinct insertion behaviors: **Insert at Cursor** (default, preserving surroundings) and **Replace All** (with an explicit confirmation dialog warning students before destructive code overwrites).
- **🔒 Hardened Ace v1.42.0 Adapter:**  
  Verified against CodeChef `#submit-ide-v2.env.editor` with post-insertion content verification, full undo/redo preservation, and read-only state guards.

### Phase 1: Extension Foundation & Core Architecture
- **⚡ Verified Native Ace Editor Integration:**  
  Directly interfaces with CodeChef's production **Ace Editor (v1.42.0)** at `#submit-ide-v2.env.editor`. Operates independent of client-side paste blockers.
- **🛡️ Full Undo / Redo Stack Preservation:**  
  All programmatic insertions register discrete delta operations within Ace's built-in `UndoManager` (`Ctrl+Z` / `Ctrl+Y`).
- **✨ Non-Intrusive Floating Action Launcher:**  
  A circular launcher button (`#codemate-floating-launcher`) injected into verified practice problem pages at `bottom: 24px; right: 24px`.
- **📱 Dual-Surface Developer Interface:**  
  - **Extension Popup** (`popup.html`): High-density 380×600px dropdown for quick clipboard operations and code inspection.
  - **Chromium Side Panel** (`sidepanel.html`): Dedicated 420×850px docked side-by-side workspace next to the editor.

---

## 🏛️ Architecture & Communication Flow

```
+---------------------------------------------------------------------------------------------------+
|                                CodeMate AI Full-Stack Architecture                                |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [EXTENSION FRONTEND: React 18 + TypeScript in Chromium Side Panel / Popup]                       |
|  ├── AIActions Workspace (Generate, Analyze, Explain, Optimize)                                  |
|  ├── Deep DOM Problem Extractor (#problem-statement, constraints, samples)                        |
|  ├── Solution Preview & Code Copying via ClipboardManager                                         |
|  └── CodeMateApiClient (src/services/api.ts)                                                      |
|         │                                                                                         |
|         ├───────────────────────────────────┐                                                     |
|         │ chrome.tabs.sendMessage()         │ HTTP/1.1 REST (JSON)                                |
|         ▼                                   ▼                                                     |
|  [CONTENT SCRIPT (Isolated)]         [AI BACKEND: FastAPI + Uvicorn @ 127.0.0.1:8000]             |
|  │ - DOM scraper                     │ - Rate limiter & prompt injection sanitizer                |
|  │ - Floating launcher               │ - GET  /api/health & GET /api/ai/status                    |
|  │ - Nonce-tagged CustomEvent        │ - POST /api/problem/analyze                                |
|  ▼                                   │ - POST /api/problem/explain                                |
|  [MAIN WORLD: content-main.js]       │ - POST /api/solution/generate                              |
|  │ - Executes in page V8 heap        │ - POST /api/solution/optimize                              |
|  │ - Interacts with window.ace       │                                                            |
|  │ - Reads student code (GET_VALUE)  ├── Provider Manager:                                        |
|  ▼                                   │   ├── MockAIProvider (Deterministic offline engine)        |
|  [CODECHEF ACE EDITOR v1.42.0]       │   ├── GeminiProvider (google-genai SDK Interactions API)   |
|  #submit-ide-v2.env.editor           │   └── OpenAIProvider (GPT-4o / Compatible REST)            |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 🛠️ Technology Stack

| Layer | Component | Technology | Description |
|---|---|---|---|
| **AI Backend** | Framework | [FastAPI 0.162](https://fastapi.tiangolo.com/) | High-performance async Python REST service |
| **Database** | ORM / Migration | [SQLAlchemy 2.0 Async](https://www.sqlalchemy.org/) + [Alembic](https://alembic.sqlalchemy.org/) | Async persistence with PostgreSQL (Prod) and SQLite (Dev) |
| **Authentication** | Cryptography | [Argon2id](https://pypi.org/project/argon2-cffi/) + [PyJWT](https://pyjwt.readthedocs.io/) | High-entropy password hashing & rotating JWT tokens |
| **Payment Gateway** | Billing | [Razorpay](https://razorpay.com/) | Server-enforced pricing, HMAC SHA-256 verification & webhooks |
| **AI Backend** | Runtime | [Python 3.11+](https://www.python.org/) | Async runtime with Pydantic v2 data models |
| **AI Backend** | AI SDK | [google-genai 2.34](https://aistudio.google.com/docs/get-started) | Official Google GenAI SDK with Interactions API |
| **AI Backend** | ASGI Server | [Uvicorn 0.54](https://www.uvicorn.org/) | Production ASGI server with uvloop support |
| **Extension UI** | Framework | [React 18.3](https://react.dev/) | Declarative component UI with AuthContext & AccountView |
| **Extension UI** | Language | [TypeScript 5.7](https://www.typescriptlang.org/) | Strict mode typing across all extension modules |
| **Extension UI** | Styling | [Tailwind CSS 3.4](https://tailwindcss.com/) | Responsive, dark-themed developer aesthetics |
| **Extension UI** | Bundler | [Vite 6.0](https://vitejs.dev/) | Multi-target build compiling IIFE and ES modules |
| **Browser** | Platform | Chrome Manifest V3 | Service worker & Chromium side panel architecture |
| **Testing** | Test Runners | Pytest 9.2 + Node.js Runner | 34 backend pytest tests + 16 Phase 6 SaaS integration tests |

---

## 📦 Getting Started

### 1. Prerequisites
- **Node.js** 18.0+ and **npm**
- **Python** 3.11+ (Python 3.14 recommended)
- **Google Chrome** (v114+ for Side Panel support)

### 2. Backend Setup & Run

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (includes DB, JWT, and Razorpay config)
cp .env.example .env

# Apply database migrations
alembic upgrade head

# Start the FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The server starts at `http://127.0.0.1:8000`:
- **API Health:** `http://127.0.0.1:8000/api/health`
- **Ready Probe:** `http://127.0.0.1:8000/api/ready`
- **Interactive Swagger UI:** `http://127.0.0.1:8000/docs`

### 3. Build the Chrome Extension

```bash
# In the repository root:
npm install
npm run build
```

This compiles:
1. `popup.html` and `sidepanel.html` into `dist/`.
2. `background.js` (service worker) into `dist/`.
3. `content.js` (with deep statement extractor) and `content-main.js` into `dist/`.

### 4. Load the Extension into Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **"Developer mode"** in the top-right corner.
3. Click **"Load unpacked"** and select the **`dist/`** directory.
4. Open any CodeChef practice problem (e.g. [`START01`](https://www.codechef.com/problems/START01)).
5. Open the **Side Panel** to access the AI Practice Workspace!

---

## 🧪 Testing & Verification

CodeMate AI features comprehensive test coverage across backend and frontend:

```bash
# 1. Run 34 Python Backend Unit & Integration Tests (Async DB, Auth, Sessions, Payments)
pytest backend/app/tests -v

# 2. Run Phase 6 SaaS Integration Tests (Argon2id, Device Limits, Token Replay, Razorpay Webhooks)
node scripts/test-phase6-auth-subscription.cjs

# 3. Run Phase 5 Security & Defensive Posture Tests
node scripts/test-phase5-security.cjs

# 4. Run Phase 5 Adaptive Reliability Engine Tests
node scripts/test-phase5-reliability.cjs
```

### Complete Test Coverage Matrix:
- **Phase 6 SaaS & Payment Suite (16/16 Passing — 100%):**
  - **TC-01 to TC-03:** Password strength, Argon2id hashing, duplicate registration prevention — **PASS**
  - **TC-04 to TC-07:** JWT issuance, token rotation, and Layer 3 replay attack termination — **PASS**
  - **TC-08 to TC-09:** Layer 1 device limits (`DEVICE_LIMIT_REACHED`) & 403 entitlement guards — **PASS**
  - **TC-10 to TC-14:** Razorpay server-pricing, HMAC SHA-256 verification, idempotent webhooks — **PASS**
  - **TC-15 to TC-16:** Layer 2 concurrent active session limits (`SESSION_LIMIT_REACHED`) — **PASS**
- **Phase 6 Backend Pytest Suite (34/34 Passing — 100%):** Auth, devices, sessions, entitlements, payments, error diagnostics, and language normalization.
- **Phase 5 Security Suite (10/10 Passing — 100%):** Defensive headers, correlation IDs, prompt injection, rate limits.
- **Phase 5 Reliability Suite (6/6 Passing — 100%):** Idempotency keys, language normalization, bounded jitter, Retry-After.

---

## 📚 Project Documentation & Phase Reports

All engineering specifications, feasibility findings, and phase reports are organized in [`docs/reports/`](docs/reports/):

### Phase 0 — Feasibility & Editor Reverse-Engineering
- [Phase 0 Research Report](docs/reports/phase-0/PHASE0_RESEARCH_REPORT.md)
- [Phase 0 Test Results](docs/reports/phase-0/PHASE0_TEST_RESULTS.md)
- [Phase 0 Architecture](docs/reports/phase-0/PHASE0_ARCHITECTURE.md)

### Phase 1 — Chrome Extension Foundation
- [Phase 1 Implementation Report](docs/reports/phase-1/PHASE1_IMPLEMENTATION_REPORT.md)
- [Phase 1 Test Report](docs/reports/phase-1/PHASE1_TEST_REPORT.md)
- [Phase 1 Next Steps & Roadmap](docs/reports/phase-1/PHASE1_NEXT_STEPS.md)

### Phase 2 — Smart Clipboard & Reliable Editor Integration
- [Phase 2 Implementation Report](docs/reports/phase-2/PHASE2_IMPLEMENTATION_REPORT.md)
- [Phase 2 Clipboard Architecture](docs/reports/phase-2/PHASE2_CLIPBOARD_ARCHITECTURE.md)
- [Phase 2 Test Report](docs/reports/phase-2/PHASE2_TEST_REPORT.md)
- [Phase 2 Test Results Data](docs/reports/phase-2/phase2_test_results.json)

### Phase 3 — AI Backend & LLM Integration
- [Phase 3 Implementation Report](docs/reports/phase-3/PHASE3_IMPLEMENTATION_REPORT.md)
- [Phase 3 Test Report](docs/reports/phase-3/PHASE3_TEST_REPORT.md)
- [Phase 3 API Documentation](docs/reports/phase-3/PHASE3_API_DOCUMENTATION.md)
- [Phase 3 Test Results Data](docs/reports/phase-3/phase3_test_results.json)

### Phase 4 — AI Frontend Integration
- [Phase 4 Implementation Report](docs/reports/phase-4/PHASE4_IMPLEMENTATION_REPORT.md) — Comprehensive technical implementation report for AI frontend integration.
- [Phase 4 Test Report](docs/reports/phase-4/PHASE4_TEST_REPORT.md) — 16-test validation matrix and live extraction test results.
- [Phase 4 API Integration Reference](docs/reports/phase-4/PHASE4_API_INTEGRATION.md) — Complete endpoint mapping and frontend DTO specifications.
- [Phase 4 Test Results Data](docs/reports/phase-4/phase4_test_results.json) — Structured JSON test execution results.
- [Phase 4 Next Steps & Roadmap](docs/reports/phase-4/PHASE4_NEXT_STEPS.md) — Plan for Phase 5 production hardening.

### Phase 5 — Production Foundation, Security Hardening & Safe Automation (Completed)
- [Phase 5 Security Audit](docs/reports/phase-5/PHASE5_SECURITY_AUDIT.md) — Full repository security audit, trust boundaries, vulnerability ranking, and remediations.
- [Phase 5 Implementation Report](docs/reports/phase-5/PHASE5_IMPLEMENTATION_REPORT.md) — Technical delivery report for security hardening, state machine, and error diagnostics.
- [Phase 5 Test Report](docs/reports/phase-5/PHASE5_TEST_REPORT.md) — 52-test execution report (26 backend + 10 security + 16 frontend) with 100% pass rate.
- [Phase 5 Data Privacy & Retention Policy](docs/reports/phase-5/PHASE5_DATA_PRIVACY.md) — Documented student privacy architecture, zero-leakage policies, and local data purge.
- [Phase 5 Production Deployment Guide](docs/reports/phase-5/PHASE5_DEPLOYMENT_GUIDE.md) — Caddy/Nginx reverse proxy, Docker, Compose, and Chrome Web Store publishing guide.
- [Phase 5 Safe Auto-Pilot Architecture](docs/reports/phase-5/PHASE5_SAFE_AUTOPILOT_ARCHITECTURE.md) — State-driven workflow, diff viewer, cooldowns, and academic integrity guards.
- [Phase 5 Next Steps & Roadmap](docs/reports/phase-5/PHASE5_NEXT_STEPS.md) — Blueprint for Phase 6 authentication, device registration, and Razorpay.

### Phase 6 — Authentication, Device Registration, Sessions, Subscriptions & Razorpay (Completed)
- [Phase 6 Architecture Audit](PHASE6_ARCHITECTURE_AUDIT.md) — Pre-implementation audit of persistence, security trust boundaries, and payment contracts.
- [Phase 6 Implementation Report](docs/reports/phase-6/PHASE6_IMPLEMENTATION_REPORT.md) — Technical delivery report for auth, devices, sessions, entitlements, and Razorpay.
- [Phase 6 Authentication API Specification](docs/reports/phase-6/PHASE6_AUTHENTICATION_API.md) — Detailed endpoint documentation, schemas, and status codes.
- [Phase 6 Device & Session Architecture](docs/reports/phase-6/PHASE6_DEVICE_SESSION_ARCHITECTURE.md) — Layer 1 (Device limits), Layer 2 (Session limits), and Layer 3 (Replay detection).
- [Phase 6 Subscription Plans & Entitlements](docs/reports/phase-6/PHASE6_SUBSCRIPTION_ENTITLEMENTS.md) — Tier matrix, server-side entitlement guards, and daily request quotas.
- [Phase 6 Razorpay Payment Integration](docs/reports/phase-6/PHASE6_RAZORPAY_INTEGRATION.md) — Order creation, HMAC SHA-256 verification, and idempotent webhooks.
- [Phase 6 Security & Threat Modeling Report](docs/reports/phase-6/PHASE6_SECURITY_REPORT.md) — Threat analysis, Argon2id parameters, and privacy-preserving UUIDs.
- [Phase 6 Test Execution Report](docs/reports/phase-6/PHASE6_TEST_REPORT.md) — 66-test verification matrix with 100% pass rate across pytest and Node.js.
- [Phase 6 Environment Setup & Deployment](docs/reports/phase-6/PHASE6_ENVIRONMENT_SETUP.md) — Environment variables, Alembic migrations, and Razorpay sandbox configuration.
- [Phase 6 Next Steps & Roadmap](docs/reports/phase-6/PHASE6_NEXT_STEPS.md) — Architecture readiness and plan for Phase 7 Multi-File Project Intelligence.

### Phase 7 — Multi-File Project Intelligence, Spring Boot Understanding & AI Workflow (Completed)
- [Phase 7 Pre-Implementation Audit](PHASE7_ARCHITECTURE_AUDIT.md) — Architecture baseline audit, gap analysis, and module design.
- [Phase 7 Implementation Report](docs/reports/phase-7/PHASE7_IMPLEMENTATION_REPORT.md) — Comprehensive technical delivery report for project intelligence and agents.
- [Phase 7 Project Import Design](docs/reports/phase-7/PHASE7_PROJECT_IMPORT_DESIGN.md) — In-memory ZIP extraction, Zip-Slip, bomb ratio guards, and exclusion manager.
- [Phase 7 Project Indexing Architecture](docs/reports/phase-7/PHASE7_PROJECT_INDEXING_ARCHITECTURE.md) — Incremental SHA-256 hashing, AST parsing, and symbol persistence.
- [Phase 7 Project Dependency Graph](docs/reports/phase-7/PHASE7_PROJECT_GRAPH_DESIGN.md) — Directed graph with 8 edge relationships and change-impact blast radius.
- [Phase 7 Spring Boot Intelligence](docs/reports/phase-7/PHASE7_SPRING_BOOT_INTELLIGENCE.md) — Stereotype layers, route discovery, and architectural anti-pattern detection.
- [Phase 7 Vector Database & Retrieval Decision](docs/reports/phase-7/PHASE7_RETRIEVAL_AND_VECTOR_DATABASE_DECISION.md) — Rationale for deterministic AST + Graph retrieval vs. pure vector search.
- [Phase 7 Context Retrieval & Compression](docs/reports/phase-7/PHASE7_CONTEXT_RETRIEVAL_DESIGN.md) — 6,000-token budget allocation, caller context, and secret redaction.
- [Phase 7 Multi-File Agent Design](docs/reports/phase-7/PHASE7_MULTI_FILE_AGENT_DESIGN.md) — Task planning (`INSPECT`, `MODIFY`, `CREATE`, `VERIFY`) and risk assessment.
- [Phase 7 Patch System Documentation](docs/reports/phase-7/PHASE7_PATCH_SYSTEM_DOCUMENTATION.md) — Unified diffs, concurrency protection, and atomic rollback ledger.
- [Phase 7 Workflow Documentation](docs/reports/phase-7/PHASE7_WORKFLOW_DOCUMENTATION.md) — Diagnostic compiler error parsing and targeted repair synthesis.
- [Phase 7 Project API Documentation](docs/reports/phase-7/PHASE7_PROJECT_API_DOCUMENTATION.md) — Detailed reference for `/api/projects` REST endpoints.
- [Phase 7 Security & Privacy Report](docs/reports/phase-7/PHASE7_SECURITY_AND_PRIVACY_REPORT.md) — Threat model, redaction validation, and safety invariants.
- [Phase 7 Subscription & Quota Enforcement](docs/reports/phase-7/PHASE7_SUBSCRIPTION_AND_QUOTA_REPORT.md) — Free (3 files) and Pro (50 files) project quotas.
- [Phase 7 Test Execution Report](docs/reports/phase-7/PHASE7_TEST_REPORT.md) — 44 backend pytest tests + 16 SaaS tests with 100% pass rate.
- [Phase 7 Environment Setup](docs/reports/phase-7/PHASE7_ENVIRONMENT_SETUP.md) — Local development, dependencies, and testing guide.
- [Phase 7 Next Steps & Roadmap](docs/reports/phase-7/PHASE7_NEXT_STEPS.md) — Blueprint for Phase 8 companion daemon, LSP SCIP, and automated test loops.

---

## 🗺️ Roadmap

- [x] **Phase 0:** Technical Research & Feasibility Validation (Completed)
- [x] **Phase 1:** Chrome Extension Foundation & Ace Editor Integration (Completed)
- [x] **Phase 2:** Smart Clipboard Engine & Reliable Editor Integration (Completed)
- [x] **Phase 3:** AI Backend & Multi-Provider LLM Integration (Completed)
- [x] **Phase 4:** AI Frontend Integration, Workspace UI & Starter Code Completion (Completed)
- [x] **Phase 5:** Production Foundation, Security Hardening & Safe Automation (Completed)
- [x] **Phase 6:** Authentication, Device Registration, Session Management, Subscriptions and Razorpay (Completed)
- [x] **Phase 7:** Multi-File Project Intelligence, Project Indexing and Spring Boot AI Understanding (Completed)

---

## 📄 License

MIT License. Designed and developed for educational practice and developer productivity.
