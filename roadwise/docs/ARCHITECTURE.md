# RoadWise — System Architecture

## 1. System Overview

RoadWise is structured as a three-tier application: a high-performance C++20 computation engine, a Python FastAPI REST backend, and a React TypeScript frontend. The tiers communicate via well-defined JSON contracts.

```mermaid
flowchart TD
    USER["👤 User (Browser)"]
    FE["Frontend\nReact + TypeScript + Leaflet\nlocalhost:5173"]
    API["Backend API\nPython FastAPI\nlocalhost:8000"]
    DB[("Database\nPostgreSQL + PostGIS\nor SQLite (dev)")]
    ENGINE["C++ Computation Engine\nroadwise_engine binary"]
    REPORTS["Report Generator\nreportlab PDF / CSV"]

    USER -- "HTTPS / REST JSON" --> FE
    FE -- "REST API calls\n/api/v1/..." --> API
    API -- "SQLAlchemy ORM" --> DB
    API -- "subprocess / JSON stdin-stdout" --> ENGINE
    API -- "python reportlab" --> REPORTS
    ENGINE -- "JSON result" --> API
    REPORTS -- "file download" --> USER
```

---

## 2. Component Interaction Diagram

```mermaid
flowchart LR
    subgraph Frontend
        MAP["Map View\n(Leaflet)"]
        DASH["Priority\nDashboard"]
        FORMS["Report & Work\nOrder Forms"]
        BUDGET["Budget\nOptimizer UI"]
    end

    subgraph Backend ["Backend (FastAPI)"]
        AUTH["Auth Router\n/auth"]
        GRAPH["Graph Router\n/segments /intersections"]
        REPORT_RT["Reports Router\n/damage-reports"]
        PRIO["Priority Router\n/priority"]
        OPT["Optimizer Router\n/budget"]
        SIM["Simulation Router\n/simulate"]
        WO["Work Orders\n/work-orders"]
        EXP["Export Router\n/export"]
    end

    subgraph Engine ["C++ Engine"]
        DIJKSTRA["Dijkstra"]
        TARJAN["Tarjan Bridge"]
        KNAPSACK["DP Knapsack"]
        BFS_C["BFS/DFS\nComponents"]
        SCORING["Priority\nScoring"]
    end

    MAP --> GRAPH
    DASH --> PRIO
    FORMS --> REPORT_RT
    BUDGET --> OPT

    PRIO --> SCORING
    OPT --> KNAPSACK
    SIM --> BFS_C
    SIM --> DIJKSTRA
    GRAPH --> TARJAN
```

---

## 3. Database Schema Overview

### Core Tables

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `users` | id, username, role, hashed_password | System users with role assignment |
| `intersections` | id, name, lat, lng, is_critical, critical_type | Road network nodes |
| `road_segments` | id, name, classification, from_node, to_node, length_m, condition, severity, is_closed, repair_cost | Road network edges |
| `damage_reports` | id, segment_id, reported_by, damage_type, severity, status, verified_by | Damage submissions |
| `work_orders` | id, segment_id, raised_by, assigned_to, status, approved_by, started_at, completed_at | Repair work orders |
| `budget_runs` | id, run_by, budget_cap_inr, algorithm, total_cost, segments_selected, created_at | Saved optimization runs |
| `audit_log` | id, user_id, action, entity_type, entity_id, timestamp, details | Full audit trail |

### Relationships

```mermaid
erDiagram
    USERS {
        int id PK
        string username
        string role
        string hashed_password
    }
    INTERSECTIONS {
        string id PK
        string name
        float lat
        float lng
        bool is_critical
        string critical_type
    }
    ROAD_SEGMENTS {
        string id PK
        string name
        string classification
        string from_node_id FK
        string to_node_id FK
        int length_m
        string condition
        int severity
        bool is_closed
        int repair_cost
        int repair_duration_days
    }
    DAMAGE_REPORTS {
        int id PK
        string segment_id FK
        int reported_by FK
        string damage_type
        int severity
        string status
        int verified_by FK
    }
    WORK_ORDERS {
        int id PK
        string segment_id FK
        int raised_by FK
        int assigned_to FK
        string status
        int approved_by FK
    }
    BUDGET_RUNS {
        int id PK
        int run_by FK
        int budget_cap_inr
        string algorithm
        json segments_selected
    }

    INTERSECTIONS ||--o{ ROAD_SEGMENTS : "from_node"
    INTERSECTIONS ||--o{ ROAD_SEGMENTS : "to_node"
    ROAD_SEGMENTS ||--o{ DAMAGE_REPORTS : "reports"
    ROAD_SEGMENTS ||--o{ WORK_ORDERS : "orders"
    USERS ||--o{ DAMAGE_REPORTS : "reports"
    USERS ||--o{ WORK_ORDERS : "raises"
    USERS ||--o{ BUDGET_RUNS : "runs"
```

---

## 4. C++ Engine Integration Flow

The Python backend communicates with the C++ engine as a **subprocess** using JSON over stdin/stdout. This avoids binding complexity (no pybind11 required) while keeping the engine independently testable.

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant CPP as C++ Engine Binary

    Client->>API: POST /api/v1/priority/calculate
    API->>DB: SELECT segments WHERE active
    DB-->>API: List[SegmentRecord]
    API->>API: Serialize to EngineRequest JSON
    API->>CPP: subprocess stdin: JSON payload
    CPP->>CPP: Build graph adjacency list
    CPP->>CPP: Run Tarjan bridge detection
    CPP->>CPP: Compute priority scores
    CPP->>CPP: Sort by composite score
    CPP-->>API: stdout: JSON priority list
    API->>API: Deserialize & enrich with DB metadata
    API-->>Client: 200 OK: PriorityResponse
```

### Engine JSON Contract

**Request (stdin):**
```json
{
  "operation": "priority_score",
  "segments": [
    {
      "id": "SEG_001",
      "severity": 9,
      "traffic_importance": 10,
      "connectivity_importance": 9,
      "repair_cost": 1800000,
      "repair_duration_days": 21,
      "is_closed": false,
      "from_node": "INT_HOSP_01",
      "to_node": "N27"
    }
  ],
  "intersections": [
    {"id": "INT_HOSP_01", "is_critical": true, "critical_type": "hospital"},
    {"id": "N27", "is_critical": false}
  ]
}
```

**Response (stdout):**
```json
{
  "status": "ok",
  "results": [
    {
      "segment_id": "SEG_001",
      "priority_score": 94.7,
      "is_bridge": true,
      "rank": 1
    }
  ]
}
```

---

## 5. API Design Decisions

### RESTful Resource Naming
All resources are plural nouns: `/segments`, `/intersections`, `/damage-reports`, `/work-orders`. Actions that are not CRUD operations use sub-resources: `/priority/calculate`, `/budget/optimize`, `/simulate/closure`.

### Versioning
All endpoints are prefixed `/api/v1/` to allow future non-breaking evolution.

### Async First
The FastAPI app uses `async def` endpoints with `asyncpg` for all database operations. The C++ subprocess call is wrapped in `asyncio.create_subprocess_exec` to avoid blocking the event loop.

### Error Responses
All errors return a consistent `{"detail": "message", "code": "ERROR_CODE"}` envelope. 4xx errors are client-facing; 5xx errors log to structured stdout for monitoring.

---

## 6. Security Model

```mermaid
flowchart TD
    REQ["Incoming Request"]
    JWT_MW["JWT Middleware\n(verify token, extract user)"]
    RBAC["RBAC Guard\n(check role vs. endpoint permissions)"]
    HANDLER["Route Handler"]
    DB2["Database"]

    REQ --> JWT_MW
    JWT_MW -- "valid token" --> RBAC
    JWT_MW -- "invalid/expired" --> E401["401 Unauthorized"]
    RBAC -- "permitted" --> HANDLER
    RBAC -- "forbidden" --> E403["403 Forbidden"]
    HANDLER --> DB2
```

### Role Permission Matrix (summary)

| Endpoint Category | Admin | Inspector | Engineer | Planner | Approver | Auditor |
|-------------------|:-----:|:---------:|:--------:|:-------:|:--------:|:-------:|
| User management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Road network CRUD | ✅ | Read | ✅ | Read | Read | Read |
| Submit damage report | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Verify damage report | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Run priority engine | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Run budget optimizer | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Raise work order | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Approve work order | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Export reports | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Audit log read | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 7. Data Flow: Damage Report → Work Order

```mermaid
sequenceDiagram
    participant I as Inspector
    participant E as Engineer
    participant P as Planner
    participant A as Approver
    participant SYS as System

    I->>SYS: POST /damage-reports (submit report, severity=9)
    SYS-->>I: 201 Created (status: pending)

    E->>SYS: PATCH /damage-reports/{id}/verify
    SYS-->>E: 200 OK (status: verified)

    E->>SYS: POST /priority/calculate
    SYS-->>E: Priority list (SEG_001 rank=1)

    E->>SYS: POST /work-orders (segment=SEG_001)
    SYS-->>E: 201 Created (status: draft)

    P->>SYS: POST /budget/optimize (budget=5000000)
    SYS-->>P: Optimization result (SEG_001 included)

    P->>SYS: PATCH /work-orders/{id}/submit
    SYS-->>P: 200 OK (status: pending_approval)

    A->>SYS: PATCH /work-orders/{id}/approve
    SYS-->>A: 200 OK (status: approved)

    SYS->>SYS: Log to audit_log, notify assigned contractor
```

---

## 8. Deployment Architecture (Docker)

```mermaid
flowchart LR
    NGINX["nginx:alpine\nPort 3000\nServes React SPA\nProxies /api → backend"]
    FASTAPI["python:3.12-slim\nPort 8000\nFastAPI + Engine"]
    PG["postgis/postgis:16\nPort 5432"]
    VOLUME[("pgdata volume")]

    NGINX --> FASTAPI
    FASTAPI --> PG
    PG --> VOLUME
```
