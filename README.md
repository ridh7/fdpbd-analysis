# FD-PBD Thermal Analysis Tool

Full-stack application for Frequency-Domain Photothermal Beam Deflection (FD-PBD) thermal property analysis.

## Architecture

```
                         FD-PBD Analysis Tool
    =====================================================================

    FRONTEND (React + TypeScript)              BACKEND (FastAPI + Python)
    ─────────────────────────────              ─────────────────────────────

    Browser (localhost:5173)                   Server (localhost:8000)
    ┌─────────────────────────┐               ┌──────────────────────────┐
    │  App.tsx                │               │  main.py                 │
    │  ├── useReducer (form)  │               │  ├── CORS middleware     │
    │  ├── useReducer (anal.) │               │  └── router registration │
    │  └── useState (fitCfg)  │               │                          │
    │                         │               │  routers/analysis.py     │
    │  Components             │               │  ├── POST /fdpbd/analyze │
    │  ├── ForwardModelForm   │  multipart    │  ├── POST /analyze_aniso │
    │  │   ├── TabBar         │  form-data    │  ├── POST /analyze_trans │
    │  │   ├── PresetRadio    │──────────────>│  ├── POST /fit_aniso     │
    │  │   ├── ParamInput     │  (JSON params │  └── POST /fit_transverse│
    │  │   ├── AccordionSect. │   + .txt file)│                          │
    │  │   └── FileUpload     │               │       │                  │
    │  │                      │               │       ▼                  │
    │  ├── ResultsPanel       │  JSON         │  core/ (physics engine)  │
    │  │   ├── InOutPhasePlot │<──────────────│  (called directly from   │
    │  │   ├── RatioPlot      │  (analysis    │   router — no service    │
    │  │   └── FittingProgress│   result)     │   layer needed)          │
    │  │                      │               │                          │
    │  └── AppHeader          │               │                          │
    │      └── ThemeToggle    │               │                          │
    │                         │               │                          │
    │  State Management       │               │                          │
    │  ├── formReducer.ts     │               │  ├── isotropic/          │
    │  └── analysisReducer.ts │               │  │   ├── thermal_model.py│
    │                         │               │  │   ├── fitting.py      │
    │  API Layer              │               │  │   └── analysis.py     │
    │  ├── client.ts (base)   │  SSE stream   │  ├── anisotropic/        │
    │  ├── analysis.ts        │<─ ─ ─ ─ ─ ─ ─ │  │   └── analysis.py     │
    │  └── fitting.ts --------│  (progress    │  ├── transverse/         │
    │      (async generator)  │   events)     │  │   └── analysis.py     │
    │                         │               │  └── shared/             │
    │  Validation             │               │      ├── data_processing │
    │  ├── schemas/ (Zod)     │               │      ├── integration.py  │
    │  └── constants/         │               │      ├── fitting.py      │
    │      ├── params.ts      │               │      └── fitting_de.py   │
    │      └── theme.ts       │               │                          │
    │                         │               │  models/ (Pydantic)      │
    │  Hooks                  │               │  ├── isotropic.py        │
    │  ├── useTheme.ts        │               │  ├── anisotropic.py      │
    │  ├── useAnalysis.ts     │               │  ├── transverse_iso.py   │
    │  └── useFitting.ts      │               │  └── fitting.py          │
    └─────────────────────────┘               └──────────────────────────┘

    DATA FLOW (Forward Model)
    ─────────────────────────
    User fills form → Zod validates → multipart POST (params JSON + .txt file)
    → FastAPI parses form → Pydantic validates → file read into memory (bytes)
    → router calls core/*/analysis.py directly → physics pipeline runs in-memory
    → returns *Result model → FastAPI serializes to JSON
    → frontend Zod-validates response → ResultsPanel renders Plotly charts

    DATA FLOW (DE Fitting)
    ──────────────────────
    User clicks "Run Fit" → multipart POST → FastAPI returns StreamingResponse
    → _run_fit_sse spawns thread (asyncio.to_thread) → DE optimizer runs
    → each generation fires callback → asyncio.Queue → SSE event yielded
    → frontend fitting.ts async generator parses SSE → FittingProgress updates
    → final result SSE event → ResultsPanel renders fitted curves

    VALIDATION BOUNDARY
    ───────────────────
    Frontend (Zod)                    Backend (Pydantic)
    ├── Form input validation         ├── Request param validation
    ├── Response shape validation     ├── Type coercion & defaults
    └── Type-safe at compile time     └── Runtime type enforcement
    Both sides validate independently — neither trusts the other.
```

## Prerequisites

- Python 3.10+
- Node.js 20+
- pnpm

## Quick Start

```bash
make setup   # Install all dependencies
make dev     # Start both servers (API on :8000, UI on :5173)
make test    # Run all tests
make lint    # Lint and type-check everything
```

## Tech Stack

- **Frontend:** Vite + React + TypeScript, Tailwind CSS, Zod, Plotly.js
- **Backend:** FastAPI, Pydantic v2, NumPy, SciPy
- **Testing:** Vitest + React Testing Library (frontend), pytest (backend)
