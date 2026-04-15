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

## ✨ System Resiliency & AI Engine

LabTrend integrates a highly fault-tolerant intelligence router:
- **Auto-Fallback Routing**: Intelligently switches between `llama-3.3-70b-versatile` (Groq), `gemini-2.5-flash` (Google), and `gpt-4o-mini` (OpenAI) to ensure zero downtime.
- **Fail-Safe Demo Mode**: If network conditions or API quotas fail during a live presentation, the system gracefully injects structured mock clinical analytics silently, guaranteeing an uninterrupted workflow demonstration.
- **Strict JSON Adherence**: Zero markdown hallucination. The payload boundaries strictly adhere to the defined inter-agent data agreement.

---

## 📂 Architecture

```text
labtrend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── a2a/           # Core Agent-to-Agent Intent Router
│   │   │   ├── analyze/       # Multi-LLM Processing Pipeline
│   │   │   └── simulate/      # 🌟 HACKATHON DEMO: Multi-Agent Workflow Emulator
│   │   └── dashboard/         # Visual representation Sandbox
│   └── lib/                   
│       ├── fhir.ts            # FHIR Bundle Parser
│       ├── agent-meta.ts      # Agent Discovery Manifest
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
