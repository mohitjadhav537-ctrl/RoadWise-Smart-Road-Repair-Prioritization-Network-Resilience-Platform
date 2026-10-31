# RoadWise — Smart Road Repair Prioritization & Network Resilience Platform

> **Government Notice:** All geospatial data and asset metrics presented in this application represent **municipal demonstration data** for the urban road grid of **Pune Municipal Corporation (PMC)**. It serves as an academic and engineering showcase of high-performance **C++20 Data Structures and Algorithms (DSA)** applied to municipal public works resilience.

---

## 1. Executive Summary

**RoadWise** is a high-performance, government-oriented road infrastructure planning and network resilience platform. It combines real **C++20 graph algorithms and dynamic programming optimization** with an accessible **React TypeScript** geospatial interface.

### Key Capabilities

- **DSA Graph Engine:** Authoritative in-memory road network weighted graph handling shortest paths, topological connectivity, and bridge detection.
- **Explainable Prioritization:** Transparent, multi-factor scoring combining verified damage severity, commuter volume, network centrality, and deterioration delay risk.
- **Budget-Constrained Optimization:** Solves the municipal repair allocation problem using **0/1 Knapsack Dynamic Programming** compared directly against a greedy priority-per-cost heuristic.
- **Resilience & Road Closure Simulation:** Simulates emergency road cut-offs and flood inundations using **BFS/DFS** and identifies isolated zones and alternative routes via **Dijkstra's algorithm**.
- **Role-Based Access Control (RBAC):** Backend-enforced authorization across 6 municipal roles with tamper-evident audit logging and official RFC 4180 CSV export.

---

## 2. System Architecture

```
                          ┌────────────────────────────────────────────────────────┐
                          │         React 18 + TypeScript Web Interface            │
                          │  Leaflet Map  •  Recharts Dashboards  •  Tailwind CSS  │
                          └───────────────────────────┬────────────────────────────┘
                                                      │ HTTP / JSON (Port 8000 / 5173)
                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             Unified C++20 Platform Architecture                                  │
│                                                                                                  │
│  ┌───────────────────────────────┐  ┌────────────────────────────────┐  ┌─────────────────────┐  │
│  │    Native REST API Server     │  │     Interactive Terminal       │  │  Automated GTest    │  │
│  │   Winsock2 HTTP / CORS 1.1    │  │       ANSI Console CLI         │  │     Suite (25/25)   │  │
│  └───────────────┬───────────────┘  └───────────────┬────────────────┘  └──────────┬──────────┘  │
│                  │                                  │                              │             │
│                  ▼                                  ▼                              │             │
│  ┌───────────────────────────────────────────────────────────────────┐             │             │
│  │                       RoadStore Domain Model                      │             │             │
│  │    User Accounts (RBAC)  •  Damage Reports  •  Work Orders        │             │             │
│  │    Audit Logs Ledger     •  Configurable Priority Weights         │             │             │
│  └──────────────────────────────────┬────────────────────────────────┘             │             │
│                                     │                                              │             │
│                                     ▼                                              ▼             │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           RoadGraph C++20 DSA Engine                                       │  │
│  │  • Adjacency List Multi-Graph          • Tarjan's Bridge Detection                         │  │
│  │  • Min-Heap Dijkstra Shortest Path     • 0/1 Knapsack Dynamic Programming Table            │  │
│  │  • BFS Reachability & DFS Components   • Deterministic Priority Queue Ranking              │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Structures & Algorithms (DSA) Implementation

The platform operates on a single authoritative in-memory weighted graph ($G = (V, E)$), implemented using standard STL containers (`std::unordered_map`, `std::vector`, `std::priority_queue`, `std::set`).

| Algorithm | Engine Function | Time Complexity | Space Complexity | Real-World Municipal Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Dijkstra's Algorithm** | `dijkstra()` | $O((V + E) \log V)$ | $O(V)$ | Evaluates minimum-travel routes while dynamically routing around closed or impassable road segments. |
| **BFS (Breadth-First)** | `is_reachable()` | $O(V + E)$ | $O(V)$ | Checks reachability between emergency service hubs and municipal zones. |
| **DFS (Depth-First)** | `connected_components()` | $O(V + E)$ | $O(V)$ | Identifies isolated subgraphs and cut-off residential regions following simulated closures. |
| **Tarjan's Bridge Detection** | `find_critical_bridges()` | $O(V + E)$ | $O(V)$ | Discovers edges whose single failure fragments the network into disconnected components. |
| **0/1 Knapsack DP** | `optimize_budget()` | $O(N \cdot B)$ | $O(B)$ | Computes the mathematically optimal subset of road repairs that maximizes total societal benefit under a fixed rupee budget. |
| **Greedy Heuristic** | `optimize_budget_greedy()`| $O(N \log N)$ | $O(N)$ | Baseline comparison model sorting candidate repairs strictly by priority-to-cost ratio. |
| **Priority Queue** | `compute_priorities()` | $O(N \log N)$ | $O(N)$ | Ranks eligible road maintenance jobs with deterministic tie-breaking. |

### Mathematical Formulation for Priority Scoring

$$\text{PriorityScore} = w_S \times \text{Severity} + w_T \times \text{Traffic} + w_C \times \text{Connectivity} + w_D \times \text{DelayRisk}$$

- **Safety Override:** Any defect with verified severity $\ge 8.0$ is flagged as **Safety-Critical (Mandatory Review)** and cannot be deprioritized by budget constraints alone.

### Measured C++ Benchmarks

On an x86_64 CPU compiled under `-O3`:
- **500 Shortest Path Dijkstra Runs:** 1.60 ms total (**0.003 ms / run**)
- **100 Tarjan Bridge Analyses:** 1.51 ms total (**0.015 ms / run**)
- **100 Knapsack DP Budget Allocations:** 0.59 ms total (**0.005 ms / run**)

---

## 4. Role-Based Access Control (RBAC)

The system enforces six government operational roles:

| Role | Username | Default Password | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `password123` | User provisioning, role assignment, system settings, weight configurations |
| **Field Inspector** | `inspector1` | `password123` | Create damage reports, record GPS locations and defect severity ratings |
| **Road Engineer** | `engineer1` | `password123` | Defect verification, pavement condition assessment, treatment specifications |
| **Maintenance Planner** | `planner1` | `password123` | Priority calculation, 0/1 knapsack budget scenarios, road closure simulations |
| **Approving Officer** | `approver1` | `password123` | Review and sign off work orders, sanction municipal capital funds |
| **Public Auditor** | `auditor1` | `password123` | Read-only inspection of tamper-evident audit logs and official CSV exports |

*Note: For testing, passwords `admin123` and `pass123` are also accepted.*

---

## 5. Quick Start & Execution

### Prerequisites

- Windows 10/11 with MSYS2 / MinGW-w64 (`g++` supporting C++20)
- Node.js 18+ and npm

### One-Click Launchers (Root Directory)

- **`start_server.bat`**: Launches the unified C++ REST server on port 8000 and opens the browser.
- **`start_cli.bat`**: Launches the interactive ANSI terminal console.
- **`run_tests.bat`**: Runs all 25 C++ unit tests.
- **`build_all.bat`**: Compiles both the C++ engine and the React production bundle.

### Manual Launch via Terminal

#### 1. Run C++ REST API Server
```powershell
cd "d:\dsa cp\roadwise\engine"
C:\msys64\usr\bin\bash.exe -c "./build/roadwise_engine.exe --server 8000"
```
The server will start on `http://localhost:8000/`. It handles all REST endpoints under `/api/v1` and serves the built React web application at the root (`/`).

#### 2. Run React Frontend in Hot-Reload Development Mode
```powershell
cd "d:\dsa cp\roadwise\frontend"
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### 3. Run the Interactive C++ Terminal Console
```powershell
cd "d:\dsa cp\roadwise\engine"
C:\msys64\usr\bin\bash.exe -c "./build/roadwise_engine.exe --cli"
```

#### 4. Run Automated C++ Test Suite
```powershell
cd "d:\dsa cp\roadwise\engine"
C:\msys64\usr\bin\bash.exe -c "./build/roadwise_tests.exe"
```
Output:
```
[==========] Running 25 tests.
[  PASSED  ] 25 tests.
```

---

## 6. REST API Reference

All API routes are served natively by the C++ Winsock HTTP server on port 8000:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health check and version metadata |
| `POST` | `/api/v1/auth/login` | Authenticate user and issue session token |
| `GET` | `/api/v1/auth/me` | Fetch active user credentials and role |
| `GET` | `/api/v1/dashboard/kpis` | Aggregate road network KPIs |
| `GET` | `/api/v1/dashboard/charts` | Chart series data for Recharts components |
| `GET` | `/api/v1/segments` | Paginated road segment catalog |
| `GET` | `/api/v1/segments/map-data` | Geospatial LineString coordinates for Leaflet |
| `GET` | `/api/v1/segments/export-csv` | Download complete road inventory CSV |
| `POST` | `/api/v1/segments/import-csv` | Upload and ingest validated segments CSV |
| `GET` | `/api/v1/damage-reports` | List field defect reports and review statuses |
| `POST` | `/api/v1/damage-reports` | Log a new field defect report |
| `GET` | `/api/v1/priorities` | Evaluated repair priorities ranked by score |
| `GET` | `/api/v1/priorities/weights-config` | Fetch configurable prioritization weights |
| `POST` | `/api/v1/priorities/weights-config` | Update weights and trigger recalculation |
| `POST` | `/api/v1/budget/optimize` | Run 0/1 Knapsack DP or Greedy optimization |
| `GET` | `/api/v1/budget/scenarios` | Retrieve historical budget allocations |
| `POST` | `/api/v1/closure/simulate` | Simulate road closure, BFS reachability & Dijkstra detour |
| `GET` | `/api/v1/work-orders` | List PWD work orders and contractor approvals |
| `POST` | `/api/v1/work-orders` | Draft a new proposed repair work order |
| `GET` | `/api/v1/audit/logs` | Immutable system audit log trail |
| `GET` | `/api/v1/reports/road-condition` | Download road condition report CSV |
| `GET` | `/api/v1/reports/priority-list` | Download prioritized repair list CSV |
| `GET` | `/api/v1/reports/work-orders` | Download work orders & expenditure CSV |
| `GET` | `/api/v1/reports/budget-scenarios` | Download budget optimization scenarios CSV |

---

## 7. Project Directory Structure

```
roadwise/
├── build_all.bat            # One-click full build script (C++ & React)
├── start_server.bat         # Launches C++ server and opens browser
├── start_cli.bat            # Launches interactive C++ terminal console
├── run_tests.bat            # Runs all 25 C++ unit tests
├── README.md                # Comprehensive documentation
├── data/                    # Authoritative synthetic dataset
│   └── sample/
│       ├── pune_intersections.csv      # 50 Pune nodes with GPS coordinates
│       └── pune_segments.csv           # 100 Pune road edges with damage metrics
├── engine/                  # Pure C++20 Platform Core
│   ├── CMakeLists.txt       # CMake build definition
│   ├── include/
│   │   ├── cli_app.h        # Interactive ANSI terminal console header
│   │   ├── http_server.h    # Native Winsock HTTP 1.1 REST server
│   │   ├── json_helper.h    # Zero-dependency header-only JSON parser
│   │   ├── roadwise_graph.h # Core graph data structures & DSA algorithms
│   │   └── roadwise_store.h # In-memory domain store, RBAC, and audit ledger
│   ├── src/
│   │   ├── cli_app.cpp      # Terminal menu & benchmark runners
│   │   ├── http_server.cpp  # REST router & static asset SPA server
│   │   ├── main.cpp         # Multi-mode entrypoint (--server, --cli)
│   │   ├── roadwise_graph.cpp
│   │   └── roadwise_store.cpp
│   └── tests/
│       └── test_graph.cpp   # 25 automated unit tests with GTest shim
└── frontend/                # React 18 + TypeScript Web Application
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.tsx          # Client-side routing & auth wrapper
        ├── main.tsx         # React DOM root
        ├── components/
        │   ├── layout/      # Sidebar, Header, Responsive Shell
        │   ├── map/         # Leaflet interactive road network explorer
        │   └── ui/          # Accessible UI primitives (Button, Card, Modal, Badge)
        ├── pages/           # 12 government-oriented platform modules
        ├── lib/api.ts       # Typed Axios client targeting port 8000
        └── types/index.ts   # Shared TypeScript interface models
```
