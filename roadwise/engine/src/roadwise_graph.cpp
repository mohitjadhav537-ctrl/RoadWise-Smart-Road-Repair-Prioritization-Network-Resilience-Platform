#include "roadwise_graph.h"
#include <algorithm>
#include <limits>
#include <queue>
#include <unordered_set>
#include <functional>
#include <cmath>

// ─────────────────────────────────────────────────────────────
//  Internal helpers
// ─────────────────────────────────────────────────────────────

static constexpr double INF = std::numeric_limits<double>::infinity();

// ─────────────────────────────────────────────────────────────
//  Construction
// ─────────────────────────────────────────────────────────────

void RoadGraph::add_intersection(const Intersection& node) {
    intersections_[node.id] = node;
    // ensure node exists in adj even if no edges
    if (adj_.find(node.id) == adj_.end())
        adj_[node.id] = {};
}

void RoadGraph::add_segment(const RoadSegment& seg) {
    segments_[seg.id] = seg;
    // Make sure both endpoints are in adj
    if (adj_.find(seg.from_node) == adj_.end()) adj_[seg.from_node] = {};
    if (adj_.find(seg.to_node)   == adj_.end()) adj_[seg.to_node]   = {};
    rebuild_adj();
}

void RoadGraph::remove_segment(const std::string& seg_id) {
    segments_.erase(seg_id);
    rebuild_adj();
}

void RoadGraph::close_segment(const std::string& seg_id) {
    auto it = segments_.find(seg_id);
    if (it != segments_.end()) {
        it->second.is_closed = true;
        rebuild_adj();
    }
}

void RoadGraph::open_segment(const std::string& seg_id) {
    auto it = segments_.find(seg_id);
    if (it != segments_.end()) {
        it->second.is_closed = false;
        rebuild_adj();
    }
}

void RoadGraph::clear() {
    segments_.clear();
    intersections_.clear();
    adj_.clear();
}

// ─────────────────────────────────────────────────────────────
//  Rebuild adjacency list
// ─────────────────────────────────────────────────────────────

void RoadGraph::rebuild_adj() {
    // Preserve node entries (including isolated intersections)
    // Clear edges only
    for (auto& [id, vec] : adj_) vec.clear();

    for (auto& [id, seg] : segments_) {
        if (seg.is_closed) continue;
        double w = seg.length_m > 0 ? seg.length_m : 1.0;
        // Ensure endpoints exist in adj
        if (adj_.find(seg.from_node) == adj_.end()) adj_[seg.from_node] = {};
        if (adj_.find(seg.to_node)   == adj_.end()) adj_[seg.to_node]   = {};
        // Bidirectional
        adj_[seg.from_node].emplace_back(seg.to_node,   seg.id, w);
        adj_[seg.to_node  ].emplace_back(seg.from_node, seg.id, w);
    }
}

// ─────────────────────────────────────────────────────────────
//  Accessors
// ─────────────────────────────────────────────────────────────

std::optional<RoadSegment> RoadGraph::get_segment(const std::string& id) const {
    auto it = segments_.find(id);
    if (it == segments_.end()) return std::nullopt;
    return it->second;
}

std::optional<Intersection> RoadGraph::get_intersection(const std::string& id) const {
    auto it = intersections_.find(id);
    if (it == intersections_.end()) return std::nullopt;
    return it->second;
}

std::vector<RoadSegment> RoadGraph::get_all_segments() const {
    std::vector<RoadSegment> result;
    result.reserve(segments_.size());
    for (auto& [id, seg] : segments_) result.push_back(seg);
    return result;
}

std::vector<Intersection> RoadGraph::get_all_intersections() const {
    std::vector<Intersection> result;
    result.reserve(intersections_.size());
    for (auto& [id, node] : intersections_) result.push_back(node);
    return result;
}

int RoadGraph::segment_count()      const { return (int)segments_.size(); }
int RoadGraph::intersection_count() const { return (int)intersections_.size(); }

// ─────────────────────────────────────────────────────────────
//  Dijkstra
// ─────────────────────────────────────────────────────────────

ShortestPathResult RoadGraph::dijkstra(const std::string& from_node,
                                        const std::string& to_node) const {
    ShortestPathResult result;
    result.is_reachable = false;

    if (adj_.find(from_node) == adj_.end()) {
        result.message = "Source node not found: " + from_node;
        return result;
    }
    if (adj_.find(to_node) == adj_.end()) {
        result.message = "Destination node not found: " + to_node;
        return result;
    }
    if (from_node == to_node) {
        result.is_reachable    = true;
        result.total_distance  = 0.0;
        result.node_path       = {from_node};
        result.message         = "Source and destination are the same";
        return result;
    }

    // dist map
    std::unordered_map<std::string, double> dist;
    std::unordered_map<std::string, std::string> prev_node;
    std::unordered_map<std::string, std::string> prev_seg;

    for (auto& [id, _] : adj_) dist[id] = INF;
    dist[from_node] = 0.0;

    // min-heap: (dist, node)
    using PQEntry = std::pair<double, std::string>;
    std::priority_queue<PQEntry, std::vector<PQEntry>, std::greater<PQEntry>> pq;
    pq.push({0.0, from_node});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue; // stale entry
        if (u == to_node) break;

        auto it = adj_.find(u);
        if (it == adj_.end()) continue;
        for (auto& [v, seg_id, w] : it->second) {
            double nd = dist[u] + w;
            if (nd < dist[v]) {
                dist[v]      = nd;
                prev_node[v] = u;
                prev_seg[v]  = seg_id;
                pq.push({nd, v});
            }
        }
    }

    if (dist.at(to_node) == INF) {
        result.message = "No path from " + from_node + " to " + to_node;
        return result;
    }

    // Reconstruct path
    result.is_reachable   = true;
    result.total_distance = dist.at(to_node);
    result.message        = "Path found";

    std::vector<std::string> node_path_rev;
    std::vector<std::string> seg_path_rev;
    std::string cur = to_node;
    while (cur != from_node) {
        node_path_rev.push_back(cur);
        seg_path_rev.push_back(prev_seg.at(cur));
        cur = prev_node.at(cur);
    }
    node_path_rev.push_back(from_node);

    std::reverse(node_path_rev.begin(), node_path_rev.end());
    std::reverse(seg_path_rev.begin(),  seg_path_rev.end());

    result.node_path = node_path_rev;
    result.path      = seg_path_rev;
    return result;
}

// ─────────────────────────────────────────────────────────────
//  BFS
// ─────────────────────────────────────────────────────────────

std::vector<std::string> RoadGraph::bfs(const std::string& start_node) const {
    std::vector<std::string> visited_order;
    if (adj_.find(start_node) == adj_.end()) return visited_order;

    std::unordered_map<std::string, bool> visited;
    std::queue<std::string> q;
    visited[start_node] = true;
    q.push(start_node);

    while (!q.empty()) {
        std::string u = q.front(); q.pop();
        visited_order.push_back(u);
        auto it = adj_.find(u);
        if (it == adj_.end()) continue;
        for (auto& [v, seg_id, w] : it->second) {
            if (!visited[v]) {
                visited[v] = true;
                q.push(v);
            }
        }
    }
    return visited_order;
}

// ─────────────────────────────────────────────────────────────
//  DFS helpers
// ─────────────────────────────────────────────────────────────

void RoadGraph::dfs_visit(const std::string& node,
                           std::unordered_map<std::string,bool>& visited,
                           std::vector<std::string>& component) const {
    visited[node] = true;
    component.push_back(node);
    auto it = adj_.find(node);
    if (it == adj_.end()) return;
    for (auto& [v, seg_id, w] : it->second) {
        if (!visited[v]) dfs_visit(v, visited, component);
    }
}

std::vector<std::vector<std::string>> RoadGraph::dfs_components() const {
    std::unordered_map<std::string,bool> visited;
    std::vector<std::vector<std::string>> components;

    for (auto& [node, _] : adj_) {
        if (!visited[node]) {
            std::vector<std::string> comp;
            dfs_visit(node, visited, comp);
            if (!comp.empty()) components.push_back(comp);
        }
    }
    return components;
}

bool RoadGraph::is_reachable(const std::string& from_node, const std::string& to_node) const {
    if (adj_.find(from_node) == adj_.end() || adj_.find(to_node) == adj_.end())
        return false;
    auto visited = bfs(from_node);
    for (auto& n : visited) if (n == to_node) return true;
    return false;
}

// ─────────────────────────────────────────────────────────────
//  Bridge finding (Tarjan's algorithm)
// ─────────────────────────────────────────────────────────────

void RoadGraph::bridge_dfs(const std::string& u,
                             const std::string& parent_seg,
                             std::unordered_map<std::string,int>& disc,
                             std::unordered_map<std::string,int>& low,
                             int& timer,
                             std::vector<CriticalEdge>& bridges) const {
    disc[u] = low[u] = timer++;
    auto it = adj_.find(u);
    if (it == adj_.end()) return;

    for (auto& [v, seg_id, w] : it->second) {
        if (disc.find(v) == disc.end() || disc.at(v) == -1) {
            // Tree edge
            bridge_dfs(v, seg_id, disc, low, timer, bridges);
            low[u] = std::min(low[u], low[v]);
            if (low[v] > disc[u]) {
                // seg_id is a bridge
                auto seg_it = segments_.find(seg_id);
                if (seg_it != segments_.end()) {
                    bridges.push_back({
                        seg_id,
                        seg_it->second.from_node,
                        seg_it->second.to_node,
                        "Bridge - removal disconnects the network"
                    });
                } else {
                    bridges.push_back({seg_id, u, v,
                        "Bridge - removal disconnects the network"});
                }
            }
        } else if (seg_id != parent_seg) {
            // Back edge (use segment id to avoid re-traversing same undirected edge)
            low[u] = std::min(low[u], disc.at(v));
        }
    }
}

std::vector<CriticalEdge> RoadGraph::find_bridges() const {
    std::unordered_map<std::string,int> disc, low;
    for (auto& [n, _] : adj_) disc[n] = -1;
    int timer = 0;
    std::vector<CriticalEdge> bridges;

    for (auto& [n, _] : adj_) {
        if (disc[n] == -1) {
            bridge_dfs(n, "", disc, low, timer, bridges);
        }
    }
    return bridges;
}

// ─────────────────────────────────────────────────────────────
//  Repair priorities
// ─────────────────────────────────────────────────────────────

std::vector<RepairJob> RoadGraph::compute_repair_priorities(const PriorityWeights& weights) const {
    std::vector<RepairJob> jobs;
    for (auto& [id, seg] : segments_) {
        if (seg.severity <= 0) continue;
        // Delay risk: segments that are bridges or high traffic bear higher delay risk
        // Simple heuristic: delay_risk = (severity/10.0 * 0.5 + traffic_importance * 0.5)
        double delay_risk = (seg.severity / 10.0) * 0.5 + seg.traffic_importance * 0.5;

        double score = weights.w_severity     * (seg.severity / 10.0)
                     + weights.w_traffic      * seg.traffic_importance
                     + weights.w_connectivity * seg.connectivity_importance
                     + weights.w_delay_risk   * delay_risk;

        RepairJob job;
        job.segment_id              = seg.id;
        job.priority_score          = score;
        job.severity                = seg.severity;
        job.traffic_importance      = seg.traffic_importance;
        job.connectivity_importance = seg.connectivity_importance;
        job.delay_risk              = delay_risk;
        job.repair_cost             = seg.repair_cost;
        job.repair_duration_days    = seg.repair_duration_days;
        job.is_safety_critical      = (seg.severity >= 8);
        jobs.push_back(job);
    }

    // Sort descending by score, tie-break by segment_id ascending
    std::sort(jobs.begin(), jobs.end(), [](const RepairJob& a, const RepairJob& b) {
        if (std::abs(a.priority_score - b.priority_score) > 1e-12)
            return a.priority_score > b.priority_score;
        return a.segment_id < b.segment_id;
    });
    return jobs;
}

// ─────────────────────────────────────────────────────────────
//  Budget optimization (0/1 knapsack + greedy fallback)
// ─────────────────────────────────────────────────────────────

BudgetPlan RoadGraph::optimize_budget(double budget, const PriorityWeights& weights) const {
    auto jobs = compute_repair_priorities(weights);

    BudgetPlan plan;
    plan.remaining_budget = budget;

    if (jobs.empty() || budget <= 0) return plan;

    // Filter out jobs with zero cost (always include them if cost==0 and budget allows)
    std::vector<RepairJob> free_jobs, paid_jobs;
    for (auto& j : jobs) {
        if (j.repair_cost <= 0) free_jobs.push_back(j);
        else paid_jobs.push_back(j);
    }

    // Always include free jobs
    for (auto& j : free_jobs) {
        plan.selected_jobs.push_back(j);
        plan.total_score += j.priority_score;
    }

    if (paid_jobs.empty()) {
        plan.total_cost       = 0;
        plan.remaining_budget = budget;
        return plan;
    }

    int n = (int)paid_jobs.size();

    if (n <= 50) {
        // ── 0/1 Knapsack with integer-quantized costs ──
        // Scale costs to integers (granularity = 100 units)
        constexpr double SCALE = 100.0;
        int W = (int)(budget * SCALE + 0.5);

        // Cap W to avoid huge memory: max 20000 cells per item
        // If W is too large, fall back to greedy
        bool use_dp = ((long long)n * W <= 10'000'000LL);

        if (use_dp) {
            // dp[w] = max score achievable with integer capacity w
            std::vector<double> dp(W + 1, 0.0);
            // Also track which items selected
            std::vector<std::vector<bool>> chosen(n, std::vector<bool>(W + 1, false));

            for (int i = 0; i < n; ++i) {
                int cost_i = (int)(paid_jobs[i].repair_cost * SCALE + 0.5);
                if (cost_i > W) continue; // too expensive
                double score_i = paid_jobs[i].priority_score;
                for (int w = W; w >= cost_i; --w) {
                    if (dp[w - cost_i] + score_i > dp[w]) {
                        dp[w] = dp[w - cost_i] + score_i;
                        chosen[i][w] = true;
                    }
                }
            }

            // Reconstruct
            int rem = W;
            for (int i = n - 1; i >= 0; --i) {
                int cost_i = (int)(paid_jobs[i].repair_cost * SCALE + 0.5);
                if (cost_i <= rem && chosen[i][rem]) {
                    plan.selected_jobs.push_back(paid_jobs[i]);
                    plan.total_cost += paid_jobs[i].repair_cost;
                    plan.total_score += paid_jobs[i].priority_score;
                    rem -= cost_i;
                } else {
                    plan.rejected_jobs.push_back(paid_jobs[i]);
                }
            }
        } else {
            // Greedy fallback (ratio score/cost)
            goto greedy;
        }
    } else {
        greedy:
        // Greedy: sort by score/cost ratio, pick until budget exhausted
        std::vector<RepairJob> sorted_jobs = paid_jobs;
        std::sort(sorted_jobs.begin(), sorted_jobs.end(), [](const RepairJob& a, const RepairJob& b) {
            double ra = (a.repair_cost > 0) ? a.priority_score / a.repair_cost : a.priority_score * 1e9;
            double rb = (b.repair_cost > 0) ? b.priority_score / b.repair_cost : b.priority_score * 1e9;
            if (std::abs(ra - rb) > 1e-15) return ra > rb;
            return a.segment_id < b.segment_id;
        });
        double remaining = budget;
        for (auto& job : sorted_jobs) {
            if (job.repair_cost <= remaining) {
                plan.selected_jobs.push_back(job);
                plan.total_cost  += job.repair_cost;
                plan.total_score += job.priority_score;
                remaining -= job.repair_cost;
            } else {
                plan.rejected_jobs.push_back(job);
            }
        }
    }

    plan.remaining_budget = budget - plan.total_cost;
    return plan;
}

// ─────────────────────────────────────────────────────────────
//  Simulate closure
// ─────────────────────────────────────────────────────────────

ClosureSimResult RoadGraph::simulate_closure(const std::vector<std::string>& seg_ids,
                                              const std::string& from_node,
                                              const std::string& to_node) const {
    ClosureSimResult result;
    result.closed_segments = seg_ids;

    // Temporarily close segments
    // We work on a const graph, so we create a mutable copy of the segments state
    // and use a local lambda-based approach

    // Build a temporary "closed" set
    std::unordered_set<std::string> temp_closed(seg_ids.begin(), seg_ids.end());

    // Build a temporary adjacency list excluding temp-closed segments
    std::unordered_map<std::string,
        std::vector<std::tuple<std::string,std::string,double>>> temp_adj;

    for (auto& [n, _] : adj_) temp_adj[n] = {};

    for (auto& [id, seg] : segments_) {
        if (seg.is_closed) continue;
        if (temp_closed.count(seg.id)) continue;
        double w = seg.length_m > 0 ? seg.length_m : 1.0;
        temp_adj[seg.from_node].emplace_back(seg.to_node,   seg.id, w);
        temp_adj[seg.to_node  ].emplace_back(seg.from_node, seg.id, w);
    }

    // Dijkstra on temp_adj for from_node -> to_node
    auto temp_dijkstra = [&](const std::string& src, const std::string& dst) -> double {
        if (temp_adj.find(src) == temp_adj.end()) return INF;
        std::unordered_map<std::string,double> dist;
        for (auto& [n, _] : temp_adj) dist[n] = INF;
        dist[src] = 0.0;
        using PQE = std::pair<double,std::string>;
        std::priority_queue<PQE,std::vector<PQE>,std::greater<PQE>> pq;
        pq.push({0.0, src});
        while (!pq.empty()) {
            auto [d, u] = pq.top(); pq.pop();
            if (d > dist[u]) continue;
            if (u == dst) break;
            for (auto& [v, sid, w] : temp_adj[u]) {
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    pq.push({dist[v], v});
                }
            }
        }
        return dist.count(dst) ? dist.at(dst) : INF;
    };

    // Alternative distance for from_node -> to_node
    double alt = temp_dijkstra(from_node, to_node);
    if (alt < INF)
        result.alternative_distances[from_node + "->" + to_node] = alt;

    // BFS from from_node on temp_adj to find reachable nodes
    std::unordered_set<std::string> reachable;
    if (temp_adj.count(from_node)) {
        std::queue<std::string> q;
        reachable.insert(from_node);
        q.push(from_node);
        while (!q.empty()) {
            std::string u = q.front(); q.pop();
            for (auto& [v, sid, w] : temp_adj.at(u)) {
                if (!reachable.count(v)) {
                    reachable.insert(v);
                    q.push(v);
                }
            }
        }
    }

    // Find nodes that were reachable before but not after
    // "Before" = all nodes reachable from from_node in normal graph
    std::unordered_set<std::string> was_reachable;
    {
        std::queue<std::string> q;
        was_reachable.insert(from_node);
        q.push(from_node);
        while (!q.empty()) {
            std::string u = q.front(); q.pop();
            auto it2 = adj_.find(u);
            if (it2 == adj_.end()) continue;
            for (auto& [v, sid, w] : it2->second) {
                if (!was_reachable.count(v)) {
                    was_reachable.insert(v);
                    q.push(v);
                }
            }
        }
    }

    for (auto& n : was_reachable) {
        if (!reachable.count(n) && n != from_node) {
            result.disconnected_nodes.push_back(n);
        }
    }

    // Affected paths: pairs of critical nodes that lost connectivity
    for (auto& [id, inter] : intersections_) {
        if (inter.is_critical && was_reachable.count(id) && !reachable.count(id)) {
            result.affected_paths.push_back({from_node, id});
        }
    }

    return result;
}
