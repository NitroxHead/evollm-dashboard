"""Dashboard configuration."""

import os
from pathlib import Path


# Base scan directory — the evollm-dashboard root
BASE_DIR = Path(__file__).resolve().parent.parent

# Project config directory
PROJECTS_DIR = BASE_DIR / "configs" / "projects"

# How often to re-scan for new experiments (seconds)
SCAN_INTERVAL = 30

# Status inference thresholds (seconds since last modification)
STATUS_RUNNING_THRESHOLD = 60       # modified <60s ago
STATUS_PAUSED_THRESHOLD = 600       # modified <10min ago
# >10min idle → completed

# WebSocket heartbeat interval
WS_HEARTBEAT_INTERVAL = 15

# SQLite polling interval for change detection (seconds)
SQLITE_POLL_INTERVAL = 2

# Filesystem watch debounce (seconds)
FS_DEBOUNCE = 1.0

# Pagination defaults
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 500

# API prefix
API_PREFIX = "/api"

# CORS origins
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

HOST = os.environ.get("DASHBOARD_HOST", "0.0.0.0")
PORT = int(os.environ.get("DASHBOARD_PORT", "8000"))
