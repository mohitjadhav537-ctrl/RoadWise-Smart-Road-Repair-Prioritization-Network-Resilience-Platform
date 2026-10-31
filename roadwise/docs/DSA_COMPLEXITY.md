# RoadWise — DSA Algorithm Complexity Analysis

## Algorithm Reference Table

| Algorithm | Location | Time Complexity | Space Complexity | Use Case |
|-----------|----------|-----------------|------------------|----------|
| Dijkstra's Shortest Path | C++ engine | O((V+E) log V) | O(V+E) | Shortest route between intersections |
| BFS Reachability | C++ engine | O(V+E) | O(V) | Accessibility analysis post-closure |
| DFS Connected Components | C++ engine | O(V+E) | O(V) | Network disconnection detection |
| Tarjan's Bridge Finding | C++ engine | O(V+E) | O(V) | Critical road / bridge identification |
| Priority Scoring | C++ engine | O(E log E) | O(E) | Repair job ranking by composite score |
| 0/1 Knapsack (DP) | C++ engine | O(n × W) | O(n × W) | Optimal budget allocation |
| Greedy Baseline | C++ engine | O(n log n) | O(n) | Fast budget allocation heuristic |

> **V** = number of intersections (nodes), **E** = number of road segments (edges), **n** = number of repair candidates, **W** = discretized budget (total_budget / cost_unit)

---

## 1. Dijkstra's Shortest Path

### Implementation
Standard Dijkstra using a **min-heap priority queue** (`std::priority_queue` with `std::greater`). The graph is stored as an adjacency list (`std::vector<std::vector<Edge>>`). Edge weights are segment lengths in meters.

### Complexity Analysis
- **Time:** O((V + E) log V) — each node is settled once; the priority queue processes at most E edge relaxations, each costing O(log V).
- **Space:** O(V + E) — adjacency list storage plus O(V) for the distance array and visited set.

### Assumptions & Limitations
- **Undirected graph:** All road segments are treated as bidirectional. One-way streets are not modeled in this demo.
- **Static weights:** Edge weights are segment lengths. Traffic-weighted shortest paths are not computed (no real-time traffic feed).
- **No turn costs:** The algorithm does not penalize turns at intersections.
- **Dense graphs:** For very dense urban networks (E >> V), bidirectional Dijkstra or A* would be more efficient.

### When Appropriate
Use for computing shortest evacuation routes to hospitals/fire stations during the road closure simulation. Not suitable for real-time navigation where traffic matters.

---

## 2. BFS Reachability

### Implementation
Standard Breadth-First Search from a source node, visiting neighbors level by level. Used to determine which intersections remain reachable after a set of road segments is closed.

### Complexity Analysis
- **Time:** O(V + E) — each node and edge is visited at most once.
- **Space:** O(V) — for the visited array and the BFS queue.

### Assumptions & Limitations
- **Unweighted connectivity only:** BFS finds *whether* nodes are reachable, not *how quickly*.
- **Snapshot-based:** The closure simulation is a static snapshot — it does not model dynamic rerouting.
- **No traffic modeling:** A road marked `is_closed=true` is treated as completely removed from the graph.

### When Appropriate
Use to answer: "If SEG_003 (Sambhaji Bridge / J.M. Road Link) closes, which intersections lose access to Sassoon Hospital?" Runs on-demand for each simulated closure scenario.

---

## 3. DFS Connected Components

### Implementation
Iterative DFS (to avoid stack overflow on large graphs) that labels each node with a component ID. After removing closed segments, the number of components > 1 indicates network disconnection.

### Complexity Analysis
- **Time:** O(V + E)
- **Space:** O(V) — component labels array plus DFS stack.

### Assumptions & Limitations
- **Static graph:** Computed on the current network state at request time.
- **Binary edges:** Edges are either present or absent — no partial traversability.
- **Weakly connected only:** This is an undirected connectivity check. Strongly connected component analysis (for directed graphs) is not implemented.

### When Appropriate
Use as a pre-check before running budget optimization: if the network is already disconnected, bridge repair should be forced regardless of ROI ranking.

---

## 4. Tarjan's Bridge Finding Algorithm

### Implementation
Classic Tarjan's bridge-finding algorithm using discovery times (`disc[]`) and low values (`low[]`). An edge (u, v) is a bridge if `low[v] > disc[u]`, meaning there is no back-edge from v's subtree to u or any ancestor of u.

### Complexity Analysis
- **Time:** O(V + E) — single DFS pass.
- **Space:** O(V) — for `disc[]`, `low[]`, `parent[]`, and the DFS recursion stack.

### Assumptions & Limitations
- **Simple graph assumed:** Multi-edges (parallel roads) require special handling to avoid false bridge detection. The demo handles this by tracking the parent edge index, not just the parent node.
- **Undirected only:** Directed bridge analysis requires a different algorithm (not implemented).
- **Static topology:** Bridges are recomputed whenever the network topology changes (segment added/removed). Incremental updates are not supported.
- **Not articulation points:** This finds bridges (edges), not articulation points (nodes). Both are computed but articulation point display is a planned feature.

### When Appropriate
This is the most critical algorithm for the RoadWise use case. **Every segment flagged as a bridge receives a mandatory connectivity_importance bonus in the priority score**, ensuring bridge maintenance is never deprioritized by cost alone.

---

## 5. Priority Scoring

### Implementation
A **composite weighted scoring function** applied to each segment:

```
priority_score = (
    w_sev  × normalize(severity, 1, 10)       +  # 0.40 weight
    w_traf × normalize(traffic_importance, 1, 10) +  # 0.30 weight
    w_conn × normalize(connectivity_importance, 1, 10) +  # 0.20 weight
    w_crit × is_adjacent_to_critical_node      +  # 0.10 weight
) × bridge_multiplier × closure_penalty
```

Where:
- `bridge_multiplier = 1.5` if the segment is a Tarjan bridge, else `1.0`
- `closure_penalty = 2.0` if `is_closed = true` (closed roads jump the queue)
- Weights are configurable via admin settings (defaults shown above)

Segments are then **sorted descending** by priority_score: O(E log E).

### Complexity Analysis
- **Score computation:** O(E) — one pass over all segments.
- **Sorting:** O(E log E) — `std::sort` on the scored list.
- **Total:** O(E log E), dominated by sorting.

### Assumptions & Limitations
- **Subjective weights:** The default weights (40/30/20/10) were chosen heuristically. No empirical study supports them for this demo.
- **Linear normalization:** Severity is a 1–10 integer scale — normalization is linear. In practice, severity 9 vs 10 may have very different real-world consequences.
- **No temporal factors:** Age of damage, weather season, or upcoming events are not factored in.
- **Single-objective:** The score is a scalar. Multi-objective Pareto optimization is not implemented.

### When Appropriate
Use as the primary ranking mechanism for the daily/weekly repair list. Do not treat the absolute score value as meaningful — only the relative ordering matters.

---

## 6. 0/1 Knapsack (Dynamic Programming)

### Implementation
Classic bottom-up 0/1 knapsack DP. The budget is discretized into units of ₹10,000 (configurable). Each repair job is an item with:
- **Weight** = `repair_cost` (discretized)
- **Value** = `priority_score × expected_benefit_factor`

DP table: `dp[i][w]` = maximum total value achievable using the first `i` items with budget `w`.

### Complexity Analysis
- **Time:** O(n × W) — where n = number of repair candidates, W = budget / cost_unit
- **Space:** O(n × W) — DP table (can be optimized to O(W) with rolling array)

### Practical Scale
- Demo dataset: n ≤ 100 segments, budget ≤ ₹50L, cost_unit = ₹10,000 → W ≤ 500
- **Max table size:** 100 × 500 = 50,000 cells — trivially fast
- For a real city with n = 10,000 segments and W = 100,000 → 10⁹ cells — **not feasible**. For real deployments, heuristics or LP relaxation would be required.

### Assumptions & Limitations
- **Integer costs only:** Costs are rounded to the nearest ₹10,000 for discretization. Precision is lost.
- **Independent items:** The knapsack assumes selecting segment A does not affect the value of segment B. In reality, repairing an entire corridor is more valuable than isolated patches.
- **Single time period:** The DP optimizes a single budget allocation. Multi-period planning (annual rolling budget) is not modeled.
- **Pseudo-polynomial complexity:** O(n × W) is not truly polynomial — W can be very large for high-budget scenarios.

### What it Guarantees
The DP knapsack finds the **optimal solution for the discretized problem**. It guarantees the maximum total priority value within the budget, given the simplified assumptions above.

### What it Does NOT Guarantee
- It does not guarantee the selected segments form a connected repair corridor.
- It does not account for contractor scheduling or resource dependencies.
- Optimality is lost if the discretization unit is too coarse.

---

## 7. Greedy Baseline

### Implementation
Sort all repair candidates by `priority_score / repair_cost` (value density) in descending order. Greedily select items until the budget is exhausted.

### Complexity Analysis
- **Time:** O(n log n) — sorting by value density.
- **Space:** O(n) — sorted list only.

### Assumptions & Limitations
- **Provably suboptimal for 0/1 knapsack:** Greedy is optimal for the fractional knapsack but not 0/1. It can produce solutions significantly worse than DP when item sizes are large relative to the budget.
- **Fast:** For large n where DP is intractable, greedy provides a reasonable approximation quickly.
- **Approximation ratio:** No guaranteed approximation ratio for 0/1 knapsack greedy (worst case can be arbitrarily bad for pathological inputs).

### When Appropriate
Use as a **quick sanity check** and for comparison with the DP solution. If greedy and DP select the same segments (common when n is small), the result is confirmed optimal. If they diverge, display both to the planner.

---

## Comparative Summary

| Algorithm | Optimality | Speed | Scalability | Best Used For |
|-----------|:----------:|:-----:|:-----------:|---------------|
| Dijkstra | ✅ Optimal (static) | Fast | Good | Emergency routing |
| BFS | ✅ Complete | Very fast | Excellent | Closure impact check |
| DFS Components | ✅ Exact | Very fast | Excellent | Disconnection detection |
| Tarjan Bridge | ✅ Exact | Very fast | Excellent | Bridge identification |
| Priority Scoring | ⚠️ Heuristic | Fast | Excellent | Ranking all segments |
| DP Knapsack | ✅ Optimal (discretized) | Moderate | Limited (small n,W) | Budget optimization |
| Greedy | ❌ Suboptimal | Very fast | Excellent | Fast approximation |

---

## References

- Tarjan, R. E. (1974). *A note on finding the bridges of a graph.* Information Processing Letters, 2(6), 160–161.
- Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2009). *Introduction to Algorithms* (3rd ed.). MIT Press. Chapters 22 (BFS/DFS), 24 (Dijkstra), 16.2 (Greedy Knapsack), 15.4 (DP Knapsack).
- Kellerer, H., Pferschy, U., & Pisinger, D. (2004). *Knapsack Problems.* Springer.
