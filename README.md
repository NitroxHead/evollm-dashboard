# EvoLLM Dashboard

Real-time monitoring and exploration dashboard for LLM-driven code evolution frameworks.

Built for [OpenEvolve](https://github.com/codelion/openevolve) and [ShinkaEvolve](https://github.com/NitroxHead/ShinkaEvolve), with a plugin system for custom adapters.

![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue)
![React 18](https://img.shields.io/badge/react-18-61dafb)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

## Features

- **Multi-framework support** — auto-discovers OpenEvolve checkpoints and ShinkaEvolve databases; extensible via entry-point plugins
- **Live experiment tracking** — file-system watching (watchdog) and SQLite polling for real-time updates over WebSocket
- **Program browser** — paginated, filterable table with code viewer (Monaco), diff viewer, and per-program metrics
- **Genealogy tree** — interactive lineage visualization with golden-path highlighting from initial seed to best program
- **Island topology** — island state overview, migration event timeline, and per-island score histories
- **Fitness analytics** — best/mean score curves, score distributions, improvement rates, programs-per-minute
- **LLM analytics** — cost tracking, model usage breakdown, posterior evolution over time, patch-type distribution
- **Embedding explorer** — 2D/3D scatter plots of program embeddings with cosine similarity heatmap
- **Conversation history** — LLM prompt/response pairs with code diffs and improvement deltas
- **Experiment comparison** — side-by-side metrics for multiple runs
- **Dark theme** — full dark UI with framework-specific color badges

## Quick Start

```bash
# Clone
git clone https://github.com/NitroxHead/evollm-dashboard.git
cd evollm-dashboard

# Install backend
pip install -e .

# Install frontend
cd frontend && npm install && cd ..

# Run (two terminals)
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8001
cd frontend && npx vite
```

Open http://localhost:5173. The dashboard scans its own directory for experiments on startup and every 30 seconds.

## Project Structure

```
evollm-dashboard/
├── backend/
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── config.py            # Scan intervals, thresholds, ports
│   ├── adapters/
│   │   ├── base.py          # FrameworkAdapter ABC
│   │   ├── shinka_adapter.py
│   │   ├── openevolve_adapter.py
│   │   └── registry.py      # Plugin registry + entry-point loader
│   ├── models/
│   │   ├── unified.py       # Pydantic models (programs, experiments, metrics)
│   │   └── api.py           # Response schemas
│   ├── services/
│   │   ├── experiment_manager.py
│   │   └── change_detection.py
│   └── api/                  # REST + WebSocket endpoints
├── frontend/
│   └── src/
│       ├── pages/            # 12 route pages
│       ├── components/       # Visualizations, layout, programs
│       ├── hooks/            # React Query + WebSocket hooks
│       ├── stores/           # Zustand stores
│       └── lib/              # API client, utilities
└── configs/projects/         # Built-in framework configs
```

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | FastAPI, uvicorn, Pydantic, watchdog |
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Visualizations | Recharts, D3.js, Monaco Editor |
| State | Zustand, TanStack React Query |
| Transport | REST + WebSocket |

## Plugin System

Custom framework adapters can be installed as Python packages using the `evollm.projects` entry point group.

```toml
# pyproject.toml of your adapter package
[project.entry-points."evollm.projects"]
my_framework = "my_package.config"
```

Your config module exports a `PROJECT_CONFIG` dict:

```python
PROJECT_CONFIG = {
    "name": "my_framework",
    "adapter_class": MyAdapter,        # subclass of FrameworkAdapter
    "detect": detect_fn,               # (path: str) -> bool
    "glob_patterns": ["**/data.json"],  # discovery patterns
    "resolve_experiment_path": resolve_fn,  # match -> experiment root
    "display_name": "My Framework",
    "badge_color": "#f59e0b",
    "badge_bg": "rgba(245, 158, 11, 0.15)",
    "change_detection": "poll",        # "poll" or "watchdog"
}
```

Install with `pip install -e ./my-adapter` and the dashboard auto-discovers it on startup.

## API

All endpoints are under `/api`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Status and experiment count |
| `GET /api/frameworks` | Registered framework metadata |
| `GET /api/experiments` | List all experiments |
| `GET /api/experiments/{id}` | Experiment details |
| `GET /api/experiments/{id}/programs` | Paginated program list |
| `GET /api/experiments/{id}/programs/{pid}` | Single program |
| `GET /api/experiments/{id}/search?q=` | Code search |
| `GET /api/experiments/{id}/metrics` | Aggregated metrics |
| `GET /api/experiments/{id}/islands` | Island states + migrations |
| `GET /api/experiments/{id}/lineage` | Genealogy tree |
| `GET /api/experiments/{id}/conversations` | LLM conversations |
| `GET /api/experiments/{id}/analytics` | Cost and model analytics |
| `WS /ws/{id}` | Real-time updates |

## Configuration

Key settings in `backend/config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `SCAN_INTERVAL` | 30s | How often to re-scan for experiments |
| `STATUS_RUNNING_THRESHOLD` | 60s | Modified < 60s ago = running |
| `STATUS_PAUSED_THRESHOLD` | 600s | Modified < 10min ago = paused |
| `SQLITE_POLL_INTERVAL` | 2s | SQLite change detection polling |
| `DEFAULT_PAGE_SIZE` | 50 | Default pagination size |

The backend port defaults to 8001 (set via `DASHBOARD_PORT` env var). The frontend Vite dev server proxies `/api` and `/ws` to the backend.

## License

MIT
