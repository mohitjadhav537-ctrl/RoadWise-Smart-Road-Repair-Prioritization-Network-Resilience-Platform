#include "roadwise_graph.h"
#include "roadwise_store.h"
#include "http_server.h"
#include "cli_app.h"
#include "json_helper.h"
#include <iostream>
#include <string>
#include <sstream>

#if defined(_WIN32)
#include <io.h>
#define isatty _isatty
#define fileno _fileno
#else
#include <unistd.h>
#endif

// ─────────────────────────────────────────────────────────────
//  JSON serializers
// ─────────────────────────────────────────────────────────────

// Helper: build a flat JSON object string from a list of pre-built field strings
static std::string build_obj(std::vector<std::string> fields) {
    std::string out = "{";
    bool first = true;
    for (auto& f : fields) { if (!first) out += ","; first = false; out += f; }
    out += "}";
    return out;
}

static std::string segment_to_json(const RoadSegment& s) {
    using namespace json;
    return build_obj({
        str_field("id", s.id),
        str_field("name", s.name),
        str_field("from_node", s.from_node),
        str_field("to_node", s.to_node),
        num_field("length_m", s.length_m),
        str_field("surface_type", s.surface_type),
        str_field("condition", s.condition),
        int_field("severity", s.severity),
        num_field("traffic_importance", s.traffic_importance),
        num_field("connectivity_importance", s.connectivity_importance),
        bool_field("is_closed", s.is_closed),
        num_field("repair_cost", s.repair_cost),
        int_field("repair_duration_days", s.repair_duration_days)
    });
}

static std::string intersection_to_json(const Intersection& n) {
    using namespace json;
    return build_obj({
        str_field("id", n.id),
        str_field("name", n.name),
        num_field("lat", n.lat),
        num_field("lng", n.lng),
        bool_field("is_critical", n.is_critical),
        str_field("critical_type", n.critical_type)
    });
}

static std::string repair_job_to_json(const RepairJob& j) {
    using namespace json;
    return build_obj({
        str_field("segment_id", j.segment_id),
        num_field("priority_score", j.priority_score),
        int_field("severity", j.severity),
        num_field("traffic_importance", j.traffic_importance),
        num_field("connectivity_importance", j.connectivity_importance),
        num_field("delay_risk", j.delay_risk),
        num_field("repair_cost", j.repair_cost),
        int_field("repair_duration_days", j.repair_duration_days),
        bool_field("is_safety_critical", j.is_safety_critical)
    });
}

static std::string path_result_to_json(const ShortestPathResult& r) {
    using namespace json;
    // segments array
    std::vector<std::string> seg_items;
    for (auto& s : r.path) seg_items.push_back("\"" + escape(s) + "\"");
    std::vector<std::string> node_items;
    for (auto& n : r.node_path) node_items.push_back("\"" + escape(n) + "\"");

    return build_obj({
        bool_field("is_reachable", r.is_reachable),
        num_field("total_distance", r.total_distance),
        str_field("message", r.message),
        raw_field("path", Builder::array(seg_items)),
        raw_field("node_path", Builder::array(node_items))
    });
}

static std::string bridge_to_json(const CriticalEdge& b) {
    using namespace json;
    return build_obj({
        str_field("segment_id", b.segment_id),
        str_field("from_node", b.from_node),
        str_field("to_node", b.to_node),
        str_field("reason", b.reason)
    });
}

static std::string budget_plan_to_json(const BudgetPlan& p) {
    using namespace json;
    std::vector<std::string> sel, rej;
    for (auto& j : p.selected_jobs) sel.push_back(repair_job_to_json(j));
    for (auto& j : p.rejected_jobs) rej.push_back(repair_job_to_json(j));
    return build_obj({
        raw_field("selected_jobs", Builder::array(sel)),
        raw_field("rejected_jobs", Builder::array(rej)),
        num_field("total_cost", p.total_cost),
        num_field("remaining_budget", p.remaining_budget),
        num_field("total_score", p.total_score)
    });
}

static std::string closure_result_to_json(const ClosureSimResult& r) {
    using namespace json;
    std::vector<std::string> closed, disconn, aff, alt_items;
    for (auto& s : r.closed_segments)      closed.push_back("\"" + escape(s) + "\"");
    for (auto& n : r.disconnected_nodes)   disconn.push_back("\"" + escape(n) + "\"");
    for (auto& [a, b] : r.affected_paths)  aff.push_back("[\"" + escape(a) + "\",\"" + escape(b) + "\"]");
    for (auto& [k, v] : r.alternative_distances) {
        alt_items.push_back("\"" + escape(k) + "\":" + std::to_string(v));
    }
    std::string alt_obj = "{";
    bool first = true;
    for (auto& item : alt_items) { if (!first) alt_obj += ","; first = false; alt_obj += item; }
    alt_obj += "}";

    return build_obj({
        raw_field("closed_segments", Builder::array(closed)),
        raw_field("disconnected_nodes", Builder::array(disconn)),
        raw_field("affected_paths", Builder::array(aff)),
        raw_field("alternative_distances", alt_obj)
    });
}

// ─────────────────────────────────────────────────────────────
//  JSON -> struct parsers
// ─────────────────────────────────────────────────────────────

static RoadSegment parse_segment(const json::Value& v) {
    RoadSegment s;
    s.id                     = v.get("id").is_string()   ? v.get("id").as_string()   : "";
    s.name                   = v.get("name").is_string() ? v.get("name").as_string() : "";
    s.from_node              = v.get("from_node").is_string() ? v.get("from_node").as_string() : "";
    s.to_node                = v.get("to_node").is_string()   ? v.get("to_node").as_string()   : "";
    s.length_m               = v.get("length_m").is_number()  ? v.get("length_m").as_number()  : 0.0;
    s.surface_type           = v.get("surface_type").is_string() ? v.get("surface_type").as_string() : "";
    s.condition              = v.get("condition").is_string()    ? v.get("condition").as_string()    : "";
    s.severity               = v.get("severity").is_number()     ? (int)v.get("severity").as_number() : 0;
    s.traffic_importance     = v.get("traffic_importance").is_number() ? v.get("traffic_importance").as_number() : 0.0;
    s.connectivity_importance= v.get("connectivity_importance").is_number() ? v.get("connectivity_importance").as_number() : 0.0;
    s.is_closed              = v.get("is_closed").is_bool() ? v.get("is_closed").as_bool() : false;
    s.repair_cost            = v.get("repair_cost").is_number() ? v.get("repair_cost").as_number() : 0.0;
    s.repair_duration_days   = v.get("repair_duration_days").is_number() ? (int)v.get("repair_duration_days").as_number() : 0;
    return s;
}

static Intersection parse_intersection(const json::Value& v) {
    Intersection n;
    n.id            = v.get("id").is_string()   ? v.get("id").as_string()   : "";
    n.name          = v.get("name").is_string() ? v.get("name").as_string() : "";
    n.lat           = v.get("lat").is_number()  ? v.get("lat").as_number()  : 0.0;
    n.lng           = v.get("lng").is_number()  ? v.get("lng").as_number()  : 0.0;
    n.is_critical   = v.get("is_critical").is_bool() ? v.get("is_critical").as_bool() : false;
    n.critical_type = v.get("critical_type").is_string() ? v.get("critical_type").as_string() : "";
    return n;
}

static PriorityWeights parse_weights(const json::Value& v) {
    PriorityWeights w;
    if (v.is_object()) {
        if (v.get("w_severity").is_number())     w.w_severity     = v.get("w_severity").as_number();
        if (v.get("w_traffic").is_number())       w.w_traffic      = v.get("w_traffic").as_number();
        if (v.get("w_connectivity").is_number())  w.w_connectivity = v.get("w_connectivity").as_number();
        if (v.get("w_delay_risk").is_number())    w.w_delay_risk   = v.get("w_delay_risk").as_number();
    }
    return w;
}

// ─────────────────────────────────────────────────────────────
//  Error / success helpers
// ─────────────────────────────────────────────────────────────

static std::string ok_response(const std::string& payload_field,
                                const std::string& payload_value) {
    using namespace json;
    return build_obj({
        "\"status\":\"ok\"",
        raw_field(payload_field, payload_value)
    });
}

static std::string error_response(const std::string& msg) {
    using namespace json;
    return build_obj({
        "\"status\":\"error\"",
        str_field("message", msg)
    });
}

// ─────────────────────────────────────────────────────────────
//  Main dispatch loop
// ─────────────────────────────────────────────────────────────

int main(int argc, char* argv[]) {
    int port = 8000;
    bool server_mode = false;
    bool cli_mode = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--server" || arg == "-s") {
            server_mode = true;
            if (i + 1 < argc && argv[i + 1][0] != '-') {
                try { port = std::stoi(argv[++i]); } catch (...) {}
            }
        } else if (arg == "--cli" || arg == "-c") {
            cli_mode = true;
        } else if (arg == "--help" || arg == "-h") {
            std::cout << "RoadWise Unified C++ Platform Engine & Server\n"
                      << "Usage:\n"
                      << "  roadwise_engine.exe --server [port]   Start native C++ REST API server (default 8000)\n"
                      << "  roadwise_engine.exe --cli             Start interactive terminal console\n"
                      << "  roadwise_engine.exe                   Start server if terminal, else JSON pipe mode\n";
            return 0;
        }
    }

    RoadStore store;

    if (cli_mode) {
        CliApp app(store);
        app.run();
        return 0;
    }

    if (server_mode) {
        HttpServer server(store, port, "frontend/dist");
        server.start();
        return 0;
    }

    if (argc == 1 && isatty(fileno(stdin))) {
        // When launched directly from double-click or terminal without arguments:
        std::cout << "Starting RoadWise Server on http://localhost:8000 (Pass --cli for console mode)...\n";
        HttpServer server(store, port, "frontend/dist");
        server.start();
        return 0;
    }

    RoadGraph& graph = store.graph();
    std::string line;

    std::cout << "{\"status\":\"ready\",\"message\":\"RoadWise Engine v1.0\"}" << std::endl;

    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        try {
            json::Value root = json::parse(line);
            if (!root.is_object()) {
                std::cout << error_response("Input must be a JSON object") << std::endl;
                continue;
            }

            std::string cmd = root.get("cmd").is_string() ? root.get("cmd").as_string() : "";

            // ── add_intersection ──────────────────────────────
            if (cmd == "add_intersection") {
                json::Value data = root.get("data");
                if (!data.is_object()) {
                    std::cout << error_response("Missing 'data' object") << std::endl;
                    continue;
                }
                Intersection node = parse_intersection(data);
                graph.add_intersection(node);
                std::cout << ok_response("node_id", "\"" + json::escape(node.id) + "\"") << std::endl;

            // ── add_segment ───────────────────────────────────
            } else if (cmd == "add_segment") {
                json::Value data = root.get("data");
                if (!data.is_object()) {
                    std::cout << error_response("Missing 'data' object") << std::endl;
                    continue;
                }
                RoadSegment seg = parse_segment(data);
                graph.add_segment(seg);
                std::cout << ok_response("segment_id", "\"" + json::escape(seg.id) + "\"") << std::endl;

            // ── remove_segment ────────────────────────────────
            } else if (cmd == "remove_segment") {
                std::string seg_id = root.get("id").is_string() ? root.get("id").as_string() : "";
                graph.remove_segment(seg_id);
                std::cout << ok_response("removed", "\"" + json::escape(seg_id) + "\"") << std::endl;

            // ── close_segment / open_segment ──────────────────
            } else if (cmd == "close_segment") {
                std::string seg_id = root.get("id").is_string() ? root.get("id").as_string() : "";
                graph.close_segment(seg_id);
                std::cout << ok_response("closed", "\"" + json::escape(seg_id) + "\"") << std::endl;

            } else if (cmd == "open_segment") {
                std::string seg_id = root.get("id").is_string() ? root.get("id").as_string() : "";
                graph.open_segment(seg_id);
                std::cout << ok_response("opened", "\"" + json::escape(seg_id) + "\"") << std::endl;

            // ── dijkstra ──────────────────────────────────────
            } else if (cmd == "dijkstra") {
                std::string from = root.get("from").is_string() ? root.get("from").as_string() : "";
                std::string to   = root.get("to").is_string()   ? root.get("to").as_string()   : "";
                ShortestPathResult result = graph.dijkstra(from, to);
                std::cout << ok_response("result", path_result_to_json(result)) << std::endl;

            // ── bfs ───────────────────────────────────────────
            } else if (cmd == "bfs") {
                std::string start = root.get("start").is_string() ? root.get("start").as_string() : "";
                auto visited = graph.bfs(start);
                std::vector<std::string> items;
                for (auto& n : visited) items.push_back("\"" + json::escape(n) + "\"");
                std::cout << ok_response("visited", json::Builder::array(items)) << std::endl;

            // ── components ────────────────────────────────────
            } else if (cmd == "components") {
                auto comps = graph.dfs_components();
                std::vector<std::string> comp_arrs;
                for (auto& comp : comps) {
                    std::vector<std::string> nodes;
                    for (auto& n : comp) nodes.push_back("\"" + json::escape(n) + "\"");
                    comp_arrs.push_back(json::Builder::array(nodes));
                }
                std::cout << ok_response("components", json::Builder::array(comp_arrs)) << std::endl;

            // ── bridges ───────────────────────────────────────
            } else if (cmd == "bridges") {
                auto bridges = graph.find_bridges();
                std::vector<std::string> items;
                for (auto& b : bridges) items.push_back(bridge_to_json(b));
                std::cout << ok_response("bridges", json::Builder::array(items)) << std::endl;

            // ── priorities ────────────────────────────────────
            } else if (cmd == "priorities") {
                PriorityWeights weights = parse_weights(root.get("weights"));
                auto jobs = graph.compute_repair_priorities(weights);
                std::vector<std::string> items;
                for (auto& j : jobs) items.push_back(repair_job_to_json(j));
                std::cout << ok_response("priorities", json::Builder::array(items)) << std::endl;

            // ── budget ────────────────────────────────────────
            } else if (cmd == "budget") {
                double budget = root.get("budget").is_number() ? root.get("budget").as_number() : 0.0;
                PriorityWeights weights = parse_weights(root.get("weights"));
                BudgetPlan plan = graph.optimize_budget(budget, weights);
                std::cout << ok_response("plan", budget_plan_to_json(plan)) << std::endl;

            // ── simulate_closure ──────────────────────────────
            } else if (cmd == "simulate_closure") {
                std::vector<std::string> seg_ids;
                if (root.get("segments").is_array()) {
                    for (auto& v : root.get("segments").as_array()) {
                        if (v.is_string()) seg_ids.push_back(v.as_string());
                    }
                }
                std::string from = root.get("from").is_string() ? root.get("from").as_string() : "";
                std::string to   = root.get("to").is_string()   ? root.get("to").as_string()   : "";
                auto result = graph.simulate_closure(seg_ids, from, to);
                std::cout << ok_response("result", closure_result_to_json(result)) << std::endl;

            // ── load_batch ────────────────────────────────────
            } else if (cmd == "load_batch") {
                int count_i = 0, count_s = 0;
                if (root.get("intersections").is_array()) {
                    for (auto& v : root.get("intersections").as_array()) {
                        if (v.is_object()) {
                            graph.add_intersection(parse_intersection(v));
                            ++count_i;
                        }
                    }
                }
                if (root.get("segments").is_array()) {
                    for (auto& v : root.get("segments").as_array()) {
                        if (v.is_object()) {
                            graph.add_segment(parse_segment(v));
                            ++count_s;
                        }
                    }
                }
                std::cout << build_obj({
                    "\"status\":\"ok\"",
                    json::int_field("intersections_added", count_i),
                    json::int_field("segments_added", count_s)
                }) << std::endl;

            // ── clear ─────────────────────────────────────────
            } else if (cmd == "clear") {
                graph.clear();
                std::cout << ok_response("message", "\"Graph cleared\"") << std::endl;

            // ── stats ─────────────────────────────────────────
            } else if (cmd == "stats") {
                std::cout << build_obj({
                    "\"status\":\"ok\"",
                    json::int_field("segments", graph.segment_count()),
                    json::int_field("intersections", graph.intersection_count())
                }) << std::endl;

            // ── is_reachable ──────────────────────────────────
            } else if (cmd == "is_reachable") {
                std::string from = root.get("from").is_string() ? root.get("from").as_string() : "";
                std::string to   = root.get("to").is_string()   ? root.get("to").as_string()   : "";
                bool reachable = graph.is_reachable(from, to);
                std::cout << ok_response("reachable", reachable ? "true" : "false") << std::endl;

            } else {
                std::cout << error_response("Unknown command: " + cmd) << std::endl;
            }
        } catch (const std::exception& ex) {
            std::cout << error_response(std::string("Exception: ") + ex.what()) << std::endl;
        } catch (...) {
            std::cout << error_response("Unknown error") << std::endl;
        }
    }
    return 0;
}
