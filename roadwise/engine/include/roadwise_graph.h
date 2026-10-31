#pragma once
#include <vector>
#include <unordered_map>
#include <string>
#include <optional>
#include <limits>
#include <queue>
#include <set>
#include <functional>
#include <algorithm>
#include <stdexcept>
#include <sstream>
#include <tuple>

// ─────────────────────────────────────────────────────────────
//  Data structures
// ─────────────────────────────────────────────────────────────

struct RoadSegment {
    std::string id;
    std::string name;
    std::string from_node;
    std::string to_node;
    double      length_m              = 0.0;
    std::string surface_type;
    std::string condition;
    int         severity              = 0;   // 1-10
    double      traffic_importance    = 0.0; // 0-1
    double      connectivity_importance = 0.0; // 0-1
    bool        is_closed             = false;
    double      repair_cost           = 0.0;
    int         repair_duration_days  = 0;
};

struct Intersection {
    std::string id;
    std::string name;
    double      lat           = 0.0;
    double      lng           = 0.0;
    bool        is_critical   = false;
    std::string critical_type; // "hospital","school","fire_station","transit"
};

struct ShortestPathResult {
    std::vector<std::string> path;       // segment ids
    std::vector<std::string> node_path;  // node ids
    double      total_distance = 0.0;
    bool        is_reachable   = false;
    std::string message;
};

struct RepairJob {
    std::string segment_id;
    double      priority_score         = 0.0;
    int         severity               = 0;
    double      traffic_importance     = 0.0;
    double      connectivity_importance = 0.0;
    double      delay_risk             = 0.0;
    double      repair_cost            = 0.0;
    int         repair_duration_days   = 0;
    bool        is_safety_critical     = false;
};

struct BudgetPlan {
    std::vector<RepairJob> selected_jobs;
    std::vector<RepairJob> rejected_jobs;
    double total_cost       = 0.0;
    double remaining_budget = 0.0;
    double total_score      = 0.0;
};

struct PriorityWeights {
    double w_severity     = 0.35;
    double w_traffic      = 0.25;
    double w_connectivity = 0.20;
    double w_delay_risk   = 0.20;
};

struct ClosureSimResult {
    std::vector<std::string>                  closed_segments;
    std::vector<std::string>                  disconnected_nodes;
    std::vector<std::pair<std::string,std::string>> affected_paths;
    std::unordered_map<std::string,double>    alternative_distances;
};

struct CriticalEdge {
    std::string segment_id;
    std::string from_node;
    std::string to_node;
    std::string reason;
};

// ─────────────────────────────────────────────────────────────
//  RoadGraph
// ─────────────────────────────────────────────────────────────

class RoadGraph {
public:
    // Construction
    void add_intersection(const Intersection& node);
    void add_segment(const RoadSegment& seg);
    void remove_segment(const std::string& seg_id);
    void close_segment(const std::string& seg_id);
    void open_segment(const std::string& seg_id);
    void clear();

    // Accessors
    std::optional<RoadSegment>   get_segment(const std::string& id) const;
    std::optional<Intersection>  get_intersection(const std::string& id) const;
    std::vector<RoadSegment>     get_all_segments() const;
    std::vector<Intersection>    get_all_intersections() const;
    int segment_count() const;
    int intersection_count() const;

    // Algorithms
    ShortestPathResult               dijkstra(const std::string& from_node, const std::string& to_node) const;
    std::vector<std::string>         bfs(const std::string& start_node) const;
    std::vector<std::vector<std::string>> dfs_components() const;
    bool                             is_reachable(const std::string& from_node, const std::string& to_node) const;
    std::vector<CriticalEdge>        find_bridges() const;
    std::vector<RepairJob>           compute_repair_priorities(const PriorityWeights& weights) const;
    BudgetPlan                       optimize_budget(double budget, const PriorityWeights& weights) const;
    ClosureSimResult                 simulate_closure(const std::vector<std::string>& seg_ids,
                                                       const std::string& from_node,
                                                       const std::string& to_node) const;

private:
    std::unordered_map<std::string, RoadSegment>   segments_;
    std::unordered_map<std::string, Intersection>  intersections_;
    // adj_: node_id -> vector of (neighbor_node_id, segment_id, weight)
    std::unordered_map<std::string,
        std::vector<std::tuple<std::string,std::string,double>>> adj_;

    void rebuild_adj();
    void dfs_visit(const std::string& node,
                   std::unordered_map<std::string,bool>& visited,
                   std::vector<std::string>& component) const;
    void bridge_dfs(const std::string& u,
                    const std::string& parent_seg,
                    std::unordered_map<std::string,int>& disc,
                    std::unordered_map<std::string,int>& low,
                    int& timer,
                    std::vector<CriticalEdge>& bridges) const;
};
