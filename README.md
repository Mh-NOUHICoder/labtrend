# LabTrend AI: Interoperable Renal Risk Agent 🏥

**LabTrend AI** is a clinical-grade, Agent-to-Agent (A2A) compatible healthcare module built for interoperable medical ecosystems. Initially designed as a standalone AI, it has been transformed into a fully headless, FHIR-compliant Intelligence Agent capable of collaborating with other medical AI agents (e.g., Primary Care Agents, Care Coordinators) to predict and escalate early renal risk in diabetic patients.

Built with **Next.js (App Router)**, **TypeScript**, and a Multi-Provider LLM Fallback Engine (Groq, Gemini, OpenAI).

---

## 🚀 The A2A Workflow (Prompt Opinion Hackathon)

This project strictly follows interoperability standards, shifting the focus from a traditional UI to an automated, multi-agent clinical workflow.

1. **A2A Entry Point (`/api/a2a`)**: A unified, intent-based routing system (`analyze_renal_risk`) that strictly accepts and returns deterministic JSON over the `LabTrendAgent` schema.
2. **FHIR Adapter Layer (`src/lib/fhir.ts`)**: Native capacity to parse standard HL7 FHIR `Observation` bundles, extracting historical eGFR, Creatinine, and HbA1c metrics automatically.
3. **Multi-Agent Simulation (`/api/simulate`)**: The ultimate hackathon demo endpoint. It triggers a seamless, 3-node agentic handshake:
   - `PrimaryCareAgent` → Dispatches simulated FHIR data.
   - `LabTrendAgent` → Performs time-series reasoning and dictates a risk boundary.
   - `CareCoordinatorAgent` → Implements a rule-based decision engine to formulate automated referral or monitoring paths.

---

## ✨ Key Features & System Resiliency

LabTrend integrates a highly fault-tolerant intelligence router:
- **Strict A2A (0.3.0) Compliance**: Uses `message/send` JSON-RPC for native integration with Prompt Opinion and other agentic platforms.
- **Auto-Fallback Routing**: Intelligently switches between `llama-3.3-70b-versatile` (Groq), `gemini-2.5-flash` (Google), and `gpt-4o-mini` (OpenAI) to ensure zero downtime.
- **Multilingual Support**: Automatically detects input language and generates clinical summaries and recommendations in the user's native tongue, while preserving English for deterministic technical keys.
- **FHIR File Extraction**: Scans embedded text from uploaded documents (PDFs, Logs) seamlessly alongside raw FHIR metadata.
- **Fail-Safe Demo Mode**: If network conditions or API quotas fail during a live presentation, the system gracefully injects structured mock clinical analytics silently, guaranteeing an uninterrupted workflow demonstration.
- **Strict JSON Adherence**: Zero markdown hallucination. The payload boundaries strictly adhere to the defined inter-agent data agreement.

---

## 📂 Architecture

```text
labtrend/
├── src/
│   ├── app/
│   │   ├── .well-known/
│   │   │   └── agent-card.json/route.ts  # 🌐 Production A2A Manifest (v0.3.0)
│   │   ├── api/
│   │   │   ├── a2a/           # Core Agent-to-Agent Intent Router (JSON-RPC)
│   │   │   ├── analyze/       # Multilingual Multi-LLM Processing Pipeline
│   │   │   ├── health/        # Real-time System Status Check
│   │   │   └── simulate/      # 🌟 HACKATHON DEMO: Multi-Agent Workflow Emulator
│   │   └── dashboard/         # Visual representation Sandbox
│   └── lib/                   
│       ├── fhir.ts            # Time-Series Normalizing FHIR Bundle Parser
│       └── trend.ts           # Arithmetic Medical logic
├── .env.local                 # Multi-Provider API Keys
└── README.md                  
```

---

## ⚡ Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create an `.env.local` file in the root directory and add your AI keys (Only one is strictly required, others serve as failover):
   ```env
   GROQ_API_KEY=your_key
   GEMINI_API_KEY=your_key
   OPENAI_API_KEY=your_key
   ```

3. **Run the Clinical Engine:**
   ```bash
   npm run dev
   ```

4. **Experience the A2A Sandbox:**
   To view the core hacker-track logic, bypass the UI and execute the agentic array manually:  
   Open your browser and navigate to: **[http://localhost:3000/api/simulate](http://localhost:3000/api/simulate)**
