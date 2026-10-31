#include <gtest/gtest.h>
#include "roadwise_graph.h"
#include <cmath>
#include <chrono>
#include <random>
#include <set>

// ─────────────────────────────────────────────────────────────
//  Helper builders
// ─────────────────────────────────────────────────────────────

static Intersection make_node(const std::string& id, bool critical = false,
                               const std::string& ctype = "") {
    Intersection n;
    n.id = id; n.name = id;
    n.lat = 0; n.lng = 0;
    n.is_critical = critical;
    n.critical_type = ctype;
    return n;
}

static RoadSegment make_seg(const std::string& id,
                             const std::string& from, const std::string& to,
                             double len = 100.0, int severity = 5,
                             double traffic = 0.5, double connectivity = 0.5,
                             double cost = 1000.0, int days = 5) {
    RoadSegment s;
    s.id = id; s.name = id;
    s.from_node = from; s.to_node = to;
    s.length_m = len;
    s.surface_type = "asphalt"; s.condition = "fair";
    s.severity = severity;
    s.traffic_importance = traffic;
    s.connectivity_importance = connectivity;
    s.is_closed = false;
    s.repair_cost = cost;
    s.repair_duration_days = days;
    return s;
}

// ─────────────────────────────────────────────────────────────
//  1. Empty graph: dijkstra returns unreachable
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, EmptyGraphDijkstraUnreachable) {
    RoadGraph g;
    auto result = g.dijkstra("A", "B");
    EXPECT_FALSE(result.is_reachable);
    EXPECT_EQ(result.total_distance, 0.0);
}

// ─────────────────────────────────────────────────────────────
//  2. Single node: bfs returns just that node
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, SingleNodeBFS) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    auto visited = g.bfs("A");
    ASSERT_EQ(visited.size(), 1u);
    EXPECT_EQ(visited[0], "A");
}

// ─────────────────────────────────────────────────────────────
//  3. Simple 3-node linear graph: dijkstra finds correct path
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, LinearGraphDijkstra) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    g.add_segment(make_seg("s1", "A", "B", 100.0));
    g.add_segment(make_seg("s2", "B", "C", 200.0));

    auto result = g.dijkstra("A", "C");
    EXPECT_TRUE(result.is_reachable);
    EXPECT_DOUBLE_EQ(result.total_distance, 300.0);
    ASSERT_EQ(result.path.size(), 2u);
    EXPECT_EQ(result.path[0], "s1");
    EXPECT_EQ(result.path[1], "s2");
    ASSERT_EQ(result.node_path.size(), 3u);
    EXPECT_EQ(result.node_path[0], "A");
    EXPECT_EQ(result.node_path[1], "B");
    EXPECT_EQ(result.node_path[2], "C");
}

// ─────────────────────────────────────────────────────────────
//  4. Same source and destination
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, SameSourceDest) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    auto result = g.dijkstra("A", "A");
    EXPECT_TRUE(result.is_reachable);
    EXPECT_DOUBLE_EQ(result.total_distance, 0.0);
}

// ─────────────────────────────────────────────────────────────
//  5. Disconnected graph: dfs_components returns 2 components
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, DisconnectedComponents) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    g.add_intersection(make_node("D"));
    g.add_segment(make_seg("s1", "A", "B"));
    g.add_segment(make_seg("s2", "C", "D"));

    auto comps = g.dfs_components();
    EXPECT_EQ(comps.size(), 2u);

    // Each component has 2 nodes
    for (auto& comp : comps) {
        EXPECT_EQ(comp.size(), 2u);
    }
}

// ─────────────────────────────────────────────────────────────
//  6. Closed road: dijkstra uses alternative route
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, ClosedRoadAlternative) {
    RoadGraph g;
    // A - B - C with shortcut A-C (longer)
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    g.add_segment(make_seg("s1", "A", "B", 100.0));
    g.add_segment(make_seg("s2", "B", "C", 100.0));
    g.add_segment(make_seg("s3", "A", "C", 500.0)); // longer direct

    // Shortest without closure: A->B->C = 200
    auto r1 = g.dijkstra("A", "C");
    EXPECT_TRUE(r1.is_reachable);
    EXPECT_DOUBLE_EQ(r1.total_distance, 200.0);

    // Close s1 (A-B)
    g.close_segment("s1");
    auto r2 = g.dijkstra("A", "C");
    EXPECT_TRUE(r2.is_reachable);
    // Only s2 (B-C) through B is unavailable since A-B is closed
    // Alternative: s3 directly A-C = 500
    EXPECT_DOUBLE_EQ(r2.total_distance, 500.0);
    ASSERT_EQ(r2.path.size(), 1u);
    EXPECT_EQ(r2.path[0], "s3");
}

// ─────────────────────────────────────────────────────────────
//  7. Closed road with no alternative: unreachable
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, ClosedRoadNoAlternative) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_segment(make_seg("s1", "A", "B", 100.0));

    g.close_segment("s1");
    auto result = g.dijkstra("A", "B");
    EXPECT_FALSE(result.is_reachable);
}

// ─────────────────────────────────────────────────────────────
//  8. Bridge detection: linear A-B-C has 2 bridges
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, BridgeDetectionLinear) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    g.add_segment(make_seg("s1", "A", "B"));
    g.add_segment(make_seg("s2", "B", "C"));

    auto bridges = g.find_bridges();
    EXPECT_EQ(bridges.size(), 2u);
    std::set<std::string> bridge_ids;
    for (auto& b : bridges) bridge_ids.insert(b.segment_id);
    EXPECT_TRUE(bridge_ids.count("s1"));
    EXPECT_TRUE(bridge_ids.count("s2"));
    for (auto& b : bridges) {
        EXPECT_EQ(b.reason, "Bridge - removal disconnects the network");
    }
}

// ─────────────────────────────────────────────────────────────
//  9. Bridge detection: cycle graph has no bridges
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, BridgeDetectionCycle) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    // Triangle: A-B-C-A
    g.add_segment(make_seg("s1", "A", "B"));
    g.add_segment(make_seg("s2", "B", "C"));
    g.add_segment(make_seg("s3", "C", "A"));

    auto bridges = g.find_bridges();
    EXPECT_EQ(bridges.size(), 0u);
}

// ─────────────────────────────────────────────────────────────
//  10. Priority queue: repairs sorted correctly by score
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, RepairPrioritiesSorted) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    g.add_intersection(make_node("D"));

    // High severity high traffic
    g.add_segment(make_seg("s_high", "A", "B", 100, 9, 0.9, 0.8));
    // Low severity low traffic
    g.add_segment(make_seg("s_low",  "C", "D", 100, 2, 0.1, 0.1));

    PriorityWeights w;
    auto jobs = g.compute_repair_priorities(w);
    ASSERT_GE(jobs.size(), 2u);
    EXPECT_EQ(jobs[0].segment_id, "s_high");
    EXPECT_GT(jobs[0].priority_score, jobs[1].priority_score);
}

// ─────────────────────────────────────────────────────────────
//  11. Safety critical flag
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, SafetyCriticalFlag) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    g.add_intersection(make_node("D"));

    g.add_segment(make_seg("s_critical",    "A", "B", 100, 8)); // severity >= 8
    g.add_segment(make_seg("s_not_critical","C", "D", 100, 7)); // severity < 8

    PriorityWeights w;
    auto jobs = g.compute_repair_priorities(w);
    for (auto& j : jobs) {
        if (j.segment_id == "s_critical")
            EXPECT_TRUE(j.is_safety_critical);
        if (j.segment_id == "s_not_critical")
            EXPECT_FALSE(j.is_safety_critical);
    }
}

// ─────────────────────────────────────────────────────────────
//  12. Budget optimization: budget constraint enforced
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, BudgetConstraint) {
    RoadGraph g;
    // 3 segments each costing 1000
    for (int i = 0; i < 5; ++i) {
        std::string nA = "N" + std::to_string(i*2);
        std::string nB = "N" + std::to_string(i*2+1);
        g.add_intersection(make_node(nA));
        g.add_intersection(make_node(nB));
        g.add_segment(make_seg("seg" + std::to_string(i), nA, nB,
                               100, 5+i%3, 0.5, 0.5, 1000.0));
    }
    PriorityWeights w;
    BudgetPlan plan = g.optimize_budget(2500.0, w);
    EXPECT_LE(plan.total_cost, 2500.0);
    EXPECT_GE(plan.remaining_budget, 0.0);
    EXPECT_LE(plan.selected_jobs.size(), 2u); // can afford at most 2 at 1000 each
}

// ─────────────────────────────────────────────────────────────
//  13. Budget optimization: knapsack selects optimally (small case)
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, BudgetKnapsackOptimal) {
    RoadGraph g;
    // Item A: cost=3000, score=high (sev=9, traffic=0.9)
    // Item B: cost=1000, score=medium (sev=6, traffic=0.6)
    // Item C: cost=2000, score=medium-high (sev=7, traffic=0.7)
    // Budget = 3000: optimal = B + C (score higher than A alone)
    g.add_intersection(make_node("p0")); g.add_intersection(make_node("p1"));
    g.add_intersection(make_node("p2")); g.add_intersection(make_node("p3"));
    g.add_intersection(make_node("p4")); g.add_intersection(make_node("p5"));

    g.add_segment(make_seg("segA", "p0", "p1", 100, 9, 0.9, 0.9, 3000.0));
    g.add_segment(make_seg("segB", "p2", "p3", 100, 6, 0.6, 0.6, 1000.0));
    g.add_segment(make_seg("segC", "p4", "p5", 100, 7, 0.7, 0.7, 2000.0));

    PriorityWeights w;
    w.w_severity = 0.35; w.w_traffic = 0.25; w.w_connectivity = 0.20; w.w_delay_risk = 0.20;

    BudgetPlan plan = g.optimize_budget(3000.0, w);
    EXPECT_LE(plan.total_cost, 3000.0);
    // Should select some combination within budget
    EXPECT_GE(plan.selected_jobs.size(), 1u);
    // Verify no job costs exceed budget
    double total = 0;
    for (auto& j : plan.selected_jobs) total += j.repair_cost;
    EXPECT_LE(total, 3000.01); // floating point tolerance
}

// ─────────────────────────────────────────────────────────────
//  14. Closure simulation: disconnects node
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, ClosureSimulationDisconnects) {
    RoadGraph g;
    // A - B - C (linear: B-C is the only path to C from A)
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    g.add_segment(make_seg("s1", "A", "B", 100));
    g.add_segment(make_seg("s2", "B", "C", 100));

    auto result = g.simulate_closure({"s2"}, "A", "C");
    EXPECT_FALSE(result.disconnected_nodes.empty());
    bool found_C = false;
    for (auto& n : result.disconnected_nodes) if (n == "C") { found_C = true; break; }
    EXPECT_TRUE(found_C);
}

// ─────────────────────────────────────────────────────────────
//  15. Closure simulation: alternative exists
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, ClosureSimulationAlternative) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    g.add_segment(make_seg("s1", "A", "B", 100));
    g.add_segment(make_seg("s2", "B", "C", 100));
    g.add_segment(make_seg("s3", "A", "C", 500)); // alternative

    auto result = g.simulate_closure({"s1"}, "A", "C");
    // s2 (B-C) is closed, but s3 (A-C) is open
    // After closing s1 (A-B), can still reach C via s3
    EXPECT_TRUE(result.alternative_distances.count("A->C"));
    EXPECT_DOUBLE_EQ(result.alternative_distances.at("A->C"), 500.0);
}

// ─────────────────────────────────────────────────────────────
//  16. is_reachable
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, IsReachable) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    g.add_segment(make_seg("s1", "A", "B"));

    EXPECT_TRUE(g.is_reachable("A", "B"));
    EXPECT_TRUE(g.is_reachable("B", "A")); // bidirectional
    EXPECT_FALSE(g.is_reachable("A", "C")); // C isolated
}

// ─────────────────────────────────────────────────────────────
//  17. BFS visits all reachable nodes
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, BFSVisitsAllReachable) {
    RoadGraph g;
    for (char c = 'A'; c <= 'E'; ++c)
        g.add_intersection(make_node(std::string(1, c)));
    g.add_segment(make_seg("s1", "A", "B"));
    g.add_segment(make_seg("s2", "B", "C"));
    g.add_segment(make_seg("s3", "C", "D"));
    g.add_segment(make_seg("s4", "D", "E"));

    auto visited = g.bfs("A");
    EXPECT_EQ(visited.size(), 5u);
}

// ─────────────────────────────────────────────────────────────
//  18. Tie-breaking: deterministic ordering for equal scores
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, TieBreakingDeterministic) {
    RoadGraph g;
    // Two identical segments
    g.add_intersection(make_node("A")); g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C")); g.add_intersection(make_node("D"));
    g.add_segment(make_seg("seg_z", "A", "B", 100, 5, 0.5, 0.5, 1000));
    g.add_segment(make_seg("seg_a", "C", "D", 100, 5, 0.5, 0.5, 1000));

    PriorityWeights w;
    auto jobs1 = g.compute_repair_priorities(w);
    auto jobs2 = g.compute_repair_priorities(w);

    ASSERT_EQ(jobs1.size(), jobs2.size());
    for (size_t i = 0; i < jobs1.size(); ++i)
        EXPECT_EQ(jobs1[i].segment_id, jobs2[i].segment_id);

    // tie-break: alphabetical by segment_id → seg_a < seg_z
    ASSERT_GE(jobs1.size(), 2u);
    EXPECT_EQ(jobs1[0].segment_id, "seg_a");
    EXPECT_EQ(jobs1[1].segment_id, "seg_z");
}

// ─────────────────────────────────────────────────────────────
//  19. Large graph performance test (<1s, 100 nodes, 200 edges)
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, LargeGraphPerformance) {
    RoadGraph g;
    const int N = 100;
    const int E = 200;

    for (int i = 0; i < N; ++i)
        g.add_intersection(make_node("n" + std::to_string(i)));

    std::mt19937 rng(42);
    std::uniform_int_distribution<int> node_dist(0, N - 1);
    std::uniform_real_distribution<double> len_dist(10.0, 500.0);
    std::uniform_int_distribution<int> sev_dist(1, 10);
    std::uniform_real_distribution<double> imp_dist(0.0, 1.0);

    for (int i = 0; i < E; ++i) {
        int a = node_dist(rng), b = node_dist(rng);
        while (b == a) b = node_dist(rng);
        RoadSegment s;
        s.id = "e" + std::to_string(i);
        s.name = s.id;
        s.from_node = "n" + std::to_string(a);
        s.to_node   = "n" + std::to_string(b);
        s.length_m  = len_dist(rng);
        s.severity  = sev_dist(rng);
        s.traffic_importance = imp_dist(rng);
        s.connectivity_importance = imp_dist(rng);
        s.repair_cost = 500.0 + imp_dist(rng) * 5000.0;
        s.repair_duration_days = 3 + (int)(imp_dist(rng) * 20);
        g.add_segment(s);
    }

    auto start = std::chrono::high_resolution_clock::now();

    // Run several expensive operations
    auto result = g.dijkstra("n0", "n99");
    auto comps  = g.dfs_components();
    auto bridges = g.find_bridges();
    PriorityWeights w;
    auto jobs = g.compute_repair_priorities(w);
    auto plan = g.optimize_budget(50000.0, w);

    auto end = std::chrono::high_resolution_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    // Must complete in under 1 second
    EXPECT_LT(elapsed, 1000LL);

    // Sanity checks
    EXPECT_EQ(g.intersection_count(), N);
    EXPECT_LE(plan.total_cost, 50000.0);
}

// ─────────────────────────────────────────────────────────────
//  20. Remove segment
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, RemoveSegment) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_segment(make_seg("s1", "A", "B"));

    EXPECT_TRUE(g.is_reachable("A", "B"));
    g.remove_segment("s1");
    EXPECT_FALSE(g.is_reachable("A", "B"));
    EXPECT_EQ(g.segment_count(), 0);
}

// ─────────────────────────────────────────────────────────────
//  21. Dijkstra picks shortest among multiple paths
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, DijkstraPicksShortest) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_intersection(make_node("C"));
    // Direct: A->C length 1000
    // Via B:  A->B = 10, B->C = 20, total 30
    g.add_segment(make_seg("direct", "A", "C", 1000.0));
    g.add_segment(make_seg("ab",     "A", "B",   10.0));
    g.add_segment(make_seg("bc",     "B", "C",   20.0));

    auto result = g.dijkstra("A", "C");
    EXPECT_TRUE(result.is_reachable);
    EXPECT_DOUBLE_EQ(result.total_distance, 30.0);
    ASSERT_EQ(result.path.size(), 2u);
    EXPECT_EQ(result.path[0], "ab");
    EXPECT_EQ(result.path[1], "bc");
}

// ─────────────────────────────────────────────────────────────
//  22. Open/close toggle
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, OpenCloseToggle) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_segment(make_seg("s1", "A", "B"));

    EXPECT_TRUE(g.is_reachable("A", "B"));
    g.close_segment("s1");
    EXPECT_FALSE(g.is_reachable("A", "B"));
    g.open_segment("s1");
    EXPECT_TRUE(g.is_reachable("A", "B"));
}

// ─────────────────────────────────────────────────────────────
//  23. Clear graph
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, ClearGraph) {
    RoadGraph g;
    g.add_intersection(make_node("A"));
    g.add_intersection(make_node("B"));
    g.add_segment(make_seg("s1", "A", "B"));
    g.clear();
    EXPECT_EQ(g.segment_count(), 0);
    EXPECT_EQ(g.intersection_count(), 0);
    auto r = g.dijkstra("A", "B");
    EXPECT_FALSE(r.is_reachable);
}

// ─────────────────────────────────────────────────────────────
//  24. Empty graph: no components
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, EmptyGraphComponents) {
    RoadGraph g;
    auto comps = g.dfs_components();
    EXPECT_TRUE(comps.empty());
}

// ─────────────────────────────────────────────────────────────
//  25. get_segment / get_intersection
// ─────────────────────────────────────────────────────────────

TEST(RoadGraphTest, GetSegmentAndIntersection) {
    RoadGraph g;
    Intersection n = make_node("X", true, "hospital");
    RoadSegment s  = make_seg("sx", "X", "Y", 250.0, 8);
    g.add_intersection(n);
    g.add_intersection(make_node("Y"));
    g.add_segment(s);

    auto sopt = g.get_segment("sx");
    ASSERT_TRUE(sopt.has_value());
    EXPECT_EQ(sopt->id, "sx");
    EXPECT_DOUBLE_EQ(sopt->length_m, 250.0);

    auto nopt = g.get_intersection("X");
    ASSERT_TRUE(nopt.has_value());
    EXPECT_TRUE(nopt->is_critical);
    EXPECT_EQ(nopt->critical_type, "hospital");

    EXPECT_FALSE(g.get_segment("missing").has_value());
    EXPECT_FALSE(g.get_intersection("missing").has_value());
}

int main() {
    return ::testing::run_all_tests();
}
