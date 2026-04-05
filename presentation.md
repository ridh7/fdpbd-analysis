---
marp: true
theme: default
paginate: true
style: |
  section {
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }
  h1 {
    color: #1e3a5f;
  }
  h2 {
    color: #2c5f8a;
  }
  code {
    background: #f0f4f8;
    padding: 2px 6px;
    border-radius: 4px;
  }
  table {
    font-size: 0.85em;
  }
---

# Frequency-Domain Photothermal Beam Deflection (FD-PBD) Thermal Analysis Tool

A full-stack thermal property measurement system

---

## Background

- **FD-PBD** — a laser-based technique that measures how heat spreads through thin films by detecting periodic temperature fluctuations at different frequencies
- **Isotropic** — heat conducts equally in all directions
- **Anisotropic** — heat conducts differently along each axis
- **Transverse isotropic** — symmetric in-plane, different out-of-plane

<!--
Experimental setup:
- The sample (a thin film on a substrate) sits on a motorized XY stage that positions it precisely under the optics.
- A pump laser (modulated at a set frequency by the lock-in amplifier) heats a small spot on the sample surface.
- A probe laser passes through the air just above the surface. The heated air creates a temperature gradient that bends the probe beam — this is the "photothermal beam deflection."
- A photodetector (split-cell or position-sensitive) picks up the deflected probe beam and converts the deflection into a voltage signal.
- The lock-in amplifier extracts the amplitude and phase of that signal at the pump modulation frequency — filtering out all the noise. This gives us the in-phase and out-of-phase components of the deflection.
- A multimeter monitors the total probe beam power (V_sum) so we can normalize the signal and correct for laser drift.
- The software sweeps through a range of modulation frequencies and records amplitude + phase at each one. This frequency-dependent response is what the physics model fits against.

The three analysis modes:
- Isotropic: assumes the material conducts heat the same in every direction — like glass or most metals. Simplest model, only 2 unknowns to fit (thermal conductivity and thermo-optic coefficient), runs in seconds.
- Anisotropic: the material conducts heat differently depending on direction — like a layered crystal. Needs a full 3D thermal conductivity tensor, solves 6×6 eigenvalue problems per layer, and requires 2D numerical integration. ~100x slower than isotropic.
- Transverse isotropic: a middle ground — the material is symmetric within the plane but different through the thickness, like a stack of graphene sheets. This symmetry lets us collapse the 2D integral down to 1D using a Bessel function, making it ~10x faster than full anisotropic.
-->

---

## Motivation

- **TUITION WAIVER**

---

## Motivation (Real)

- **TUITION WAIVER**
- The existing workflow: LabVIEW + MATLAB
- Problems:
  - No single source of truth (inconsistency)
  - Hardcoded parameters
  - Two disconnected tools
- Solution: one cohesive application

---

## What Does It Do?

1. User uploads experimental data
2. Sets inputs
3. Backend runs a **physics forward model** and/or **curve fitting**
4. Results in the form of interactive plots and values

<!-- This slide gives the interviewer enough physics context without going deep -->

---

<!-- _class: small -->
<style scoped>
  table { font-size: 0.7em; }
</style>

## Tech Stack

| Layer          | Technology                                |
| -------------- | ----------------------------------------- |
| **Frontend**   | React 19 + TypeScript, Vite               |
| **Styling**    | Tailwind CSS v4                           |
| **Validation** | Zod (frontend), Pydantic v2 (backend)     |
| **State**      | `useReducer` + props                      |
| **Backend**    | FastAPI + Python                          |
| **Physics**    | NumPy + SciPy                             |
| **Streaming**  | Server-Sent Events (SSE)                  |
| **Testing**    | Vitest + RTL (frontend), pytest (backend) |
| **Tooling**    | Makefile, pnpm, Ruff, mypy, ESLint        |

<!--
Justifications vs alternatives:

- useReducer over Redux / Zustand / Jotai: 30+ form fields with presets, mode switching, and resets. useReducer centralizes all transitions in one function with discriminated union actions — fully type-safe, zero dependencies. Redux would be overkill for a single-page app with no shared global state across routes.

- FastAPI over Flask / Django: Native async support (needed for SSE streaming), auto-generated OpenAPI docs at /docs, and Pydantic integration for request/response validation. Flask would need extensions for all of these. Django is too heavy for an API-only backend.

- SSE over WebSockets: DE fitting only needs server-to-client streaming (progress updates). SSE is simpler — no connection upgrade, no ping/pong, works over standard HTTP, auto-reconnects. WebSockets would be needed if the client needed to send messages mid-fit (e.g., adjusting parameters live), but it doesn't.

- Vitest over Jest: Vitest shares Vite's config and transform pipeline — no separate Babel/ts-jest setup. Same API as Jest, so no learning curve.

- pnpm over npm / yarn: Strict dependency resolution (no phantom deps), faster installs via content-addressable storage, native workspace support.

- Ruff over flake8 + black + isort: Single tool replaces three. 10-100x faster (written in Rust). Same rules, one config section in pyproject.toml.

-->

---

## Architecture Overview

```
Browser (:5173)                          Server (:8000)
┌────────────────────┐                  ┌──────────────────────┐
│  React + TypeScript│   multipart      │  FastAPI             │
│                    │   form-data      │                      │
│  Form → Zod ───────┼─────────────────>│  Router → Pydantic   │
│                    │                  │    ↓                 │
│  Plotly charts  <──┼── JSON ──────────│  Core physics engine │
│                    │                  │  (NumPy + SciPy)     │
│  SSE consumer   <──┼── SSE stream ────│                      │
│  (async generator) │                  │  All data in-memory  │
└────────────────────┘                  └──────────────────────┘
```

---

## Architecture Decisions

### Backend: Router → Core

- **Router** — HTTP concerns: parse multipart form, validate with Pydantic, read file into bytes, return response
- **Core** — pure physics: receives raw bytes + validated params, runs analysis in-memory, returns result dataclass
- No service layer — the router calls core functions directly. File data stays in memory as bytes (no temp files). The simplest architecture that fits the actual requirements.

<!--
Why no service layer?
- The service layer originally existed to manage temp file lifecycle (save → analyze → cleanup). Once we switched to in-memory processing (bytes → BytesIO → numpy), there was nothing left for it to do — each method was a one-line passthrough to the core function.
- Similarly, DI (Depends()) existed so tests could inject a service with a different data_dir. With no temp files and no data_dir, there's nothing to inject.
- Two layers (Router → Core) is the right level of complexity: the router handles HTTP, the core handles physics. Adding a middle layer that does nothing just adds indirection.
- The core functions are still independently testable — pass bytes + params, get a result dataclass back. No HTTP, no framework dependency.
-->

---

## Architecture Decisions

### SSE Streaming for Long-Running Fits

```
DE thread (sync, CPU-bound)
    ↓ callback fires each generation
    ↓ loop.call_soon_threadsafe(queue.put_nowait, event)
asyncio.Queue
    ↓ await queue.get()
async generator yields SSE events
    ↓
StreamingResponse → browser
    ↓
frontend async generator parses SSE → UI updates
```

<!--
The problem:
DE fitting is CPU-bound (pure math, runs for minutes). FastAPI is async (single-threaded event loop). If we run the fit directly in an async handler, it blocks the event loop — no other requests can be served, and we can't stream progress updates while it's running.

The solution — run the fit in a separate thread, bridge results back to the async world:

1. asyncio.to_thread(fit_func, ...) — offloads the CPU-bound DE optimizer to a thread pool so the event loop stays free.

2. The DE optimizer accepts an on_progress callback. Each generation (iteration), it calls on_progress(event) from inside the thread.

3. The callback can't directly put events into an asyncio.Queue because asyncio.Queue is NOT thread-safe. So it uses loop.call_soon_threadsafe(queue.put_nowait, event) — this schedules the put on the event loop's thread, avoiding race conditions.

4. On the async side, an async generator awaits queue.get() in a loop. Each time an event arrives, it formats it as an SSE string: "event: progress\ndata: {json}\n\n" and yields it.

5. FastAPI's StreamingResponse wraps this async generator — each yield sends a chunk of the HTTP response body to the browser.

6. On the frontend, fitting.ts reads the response body as a ReadableStream, parses the SSE protocol (splitting on double newlines), and yields parsed objects via its own async generator. The UI updates on each yield.

Why SSE and not WebSockets?
- Communication is one-way: server → client only (progress updates). The client never sends messages mid-fit.
- SSE works over plain HTTP — no connection upgrade, no ping/pong keepalive, automatic browser reconnection.
- Simpler to implement: just a StreamingResponse with text/event-stream content type.

Why not polling?
- Polling would mean the client sends repeated requests asking "are you done yet?" — wasteful, introduces latency between generations, and requires storing state server-side between requests.
- SSE pushes updates the instant they're available.

Key files:
- Backend: routers/analysis.py (_run_fit_sse — the async bridge), core/shared/fitting_de.py (DE optimizer with callback)
- Frontend: api/fitting.ts (async generator parsing SSE stream), hooks/useFitting.ts (AbortController lifecycle, state updates)
-->

---

## Architecture Decisions

### In-Memory File Processing

```python
# Router reads file once into bytes
content = await file.read()

# Core receives bytes directly — no temp files
def run_isotropic_analysis(params, file_content: bytes):
    v_out, v_in, _, v_sum, freq = load_data(file_content)
    # ... physics pipeline ...

# load_data wraps bytes in BytesIO for numpy
def load_data(content: bytes):
    data = np.loadtxt(BytesIO(content))
    # ... validation + return arrays ...
```

<!--
Why in-memory instead of temp files?
- Our data files are small (a few hundred rows, <500KB). Writing to disk and reading back adds unnecessary I/O for zero benefit.
- Eliminates an entire class of bugs: orphaned temp files on crash, cleanup race conditions, disk permission errors, missing directories.
- Removed the service layer, DI, and ~50 lines of temp file management code. The pipeline is now: upload → bytes → BytesIO → numpy. Simpler to understand, fewer things to break.
- np.loadtxt accepts any file-like object (not just file paths), so BytesIO(bytes) works as a drop-in replacement.
-->

---

## Future Work

- **Fit cancellation** — frontend can abort the SSE stream (AbortController), but the backend DE thread keeps running; need server-side cooperative cancellation
- **Deployment** — Dockerize both services, docker-compose for one-command startup
- **Database** — persist analysis results and parameters; lets researchers compare runs, track parameter history, and avoid recomputation
- **Testing coverage** — currently unit tests for core math and schemas; need API endpoint tests, component tests, and SSE streaming tests
- **Logging** — structured logging with request tracing; currently minimal `logger.error` in the SSE bridge only

---

## Demo
