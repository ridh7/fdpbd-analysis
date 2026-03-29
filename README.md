# FD-PBD Thermal Analysis Tool

Full-stack application for Frequency-Domain Photothermal Beam Deflection (FD-PBD) thermal property analysis.

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
