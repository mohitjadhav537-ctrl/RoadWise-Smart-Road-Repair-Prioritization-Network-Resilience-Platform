#pragma once
#include "roadwise_graph.h"
#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include <chrono>
#include <mutex>
#include <optional>

// ─────────────────────────────────────────────────────────────
//  Store Records
// ─────────────────────────────────────────────────────────────

struct UserRecord {
    std::string id;
    std::string username;
    std::string email;
    std::string password_hash;
    std::string role; // admin, inspector, engineer, planner, approver, auditor
    bool        is_active = true;
    std::string created_at;
    std::string last_login;
};

struct DamageReportRecord {
    std::string id;
    std::string segment_id;
    std::string defect_category; // pothole, crack, deformation, drainage, erosion, other
    int         severity = 5;    // 1-10
    std::string inspection_date;
    double      lat = 0.0;
    double      lng = 0.0;
    std::string description;
    std::string reporter_id;
    std::string reporter_name;
    std::string verification_status = "reported"; // reported, under_review, verified, prioritized, scheduled, in_progress, completed, closed, rejected
    std::string engineer_comments;
    std::string estimated_repair_requirements;
    std::string created_at;
    std::string updated_at;
};

struct WorkOrderRecord {
    std::string id;
    std::string segment_id;
    std::vector<std::string> damage_report_ids;
    std::string treatment_description;
    double      estimated_cost = 0.0;
    double      actual_cost = 0.0;
    std::string assigned_crew;
    std::string planned_start;
    std::string planned_end;
    std::string actual_start;
    std::string actual_end;
    std::string status = "proposed"; // proposed, approved, rejected, in_progress, completed, cancelled
    std::string approval_status = "pending"; // pending, approved, rejected
    std::string approved_by;
    std::string approved_at;
    std::string progress_notes;
    std::string created_by;
    std::string created_at;
    std::string updated_at;
};

struct AuditLogRecord {
    std::string id;
    std::string user_id;
    std::string username;
    std::string action;
    std::string entity_type;
    std::string entity_id;
    std::string timestamp;
    std::string details;
};

struct BudgetScenarioRecord {
    std::string id;
    std::string name;
    double      total_budget = 0.0;
    double      total_cost = 0.0;
    double      remaining_budget = 0.0;
    double      total_score = 0.0;
    std::string algorithm_used;
    std::vector<RepairJob> selected_jobs;
    std::vector<RepairJob> rejected_jobs;
    std::string run_by;
    std::string run_at;
};

// ─────────────────────────────────────────────────────────────
//  RoadStore Class
// ─────────────────────────────────────────────────────────────

class RoadStore {
public:
    RoadStore();

    // Initialization & Seeding
    void seed_data(bool force = false);
    void load_from_csv(const std::string& intersections_csv, const std::string& segments_csv);

    // Authentication & Users
    std::optional<std::pair<std::string, UserRecord>> login(const std::string& username, const std::string& password);
    std::optional<UserRecord> verify_token(const std::string& token);
    std::vector<UserRecord> list_users() const;
    std::optional<UserRecord> get_user_by_id(const std::string& id) const;
    UserRecord create_user(const std::string& username, const std::string& email, const std::string& password, const std::string& role);
    bool update_user(const std::string& id, const std::string& email, const std::string& role, std::optional<bool> is_active, const std::string& new_password = "");

    // Graph & Road Segments
    RoadGraph& graph() { return graph_; }
    const RoadGraph& graph() const { return graph_; }

    std::vector<RoadSegment> list_segments(
        const std::string& search = "",
        std::optional<int> severity_min = std::nullopt,
        std::optional<int> severity_max = std::nullopt,
        const std::string& condition = "",
        const std::string& status = "",
        std::optional<bool> is_closed = std::nullopt
    ) const;
    std::optional<RoadSegment> get_segment(const std::string& id) const;
    bool create_segment(const RoadSegment& seg);
    bool update_segment(const RoadSegment& seg);
    bool delete_segment(const std::string& id);

    // CSV Import / Export
    std::string export_segments_csv() const;
    std::pair<int, int> import_segments_csv(const std::string& csv_content);

    // Intersections
    std::vector<Intersection> list_intersections(std::optional<bool> critical_only = std::nullopt) const;
    std::optional<Intersection> get_intersection(const std::string& id) const;

    // Damage Reports
    std::vector<DamageReportRecord> list_damage_reports(
        const std::string& segment_id = "",
        const std::string& status = "",
        std::optional<int> severity_min = std::nullopt,
        const std::string& defect_category = ""
    ) const;
    std::optional<DamageReportRecord> get_damage_report(const std::string& id) const;
    DamageReportRecord create_damage_report(const DamageReportRecord& report);
    bool update_damage_report_status(const std::string& id, const std::string& status, const std::string& comments);
    bool verify_damage_report(const std::string& id, bool is_verified, const std::string& comments, std::optional<int> updated_severity);

    // Work Orders
    std::vector<WorkOrderRecord> list_work_orders(
        const std::string& status = "",
        const std::string& segment_id = "",
        const std::string& approval_status = ""
    ) const;
    std::optional<WorkOrderRecord> get_work_order(const std::string& id) const;
    WorkOrderRecord create_work_order(const WorkOrderRecord& wo);
    bool update_work_order(const WorkOrderRecord& wo);
    bool decide_work_order(const std::string& id, const std::string& action, const std::string& approver_id, const std::string& notes);

    // Prioritization & Optimization
    PriorityWeights get_weights() const { return weights_; }
    void set_weights(const PriorityWeights& w) { weights_ = w; }
    std::vector<RepairJob> compute_priorities() const;
    BudgetScenarioRecord optimize_budget(double budget, const std::string& algorithm, const std::string& scenario_name, const std::string& user_id);
    std::vector<BudgetScenarioRecord> list_budget_scenarios() const;
    std::optional<BudgetScenarioRecord> get_budget_scenario(const std::string& id) const;

    // Simulation
    ClosureSimResult simulate_closure(const std::vector<std::string>& closed_segs, const std::string& from_node, const std::string& to_node);

    // Audit Log
    void log_action(const std::string& user_id, const std::string& username, const std::string& action, const std::string& entity_type, const std::string& entity_id, const std::string& details);
    std::vector<AuditLogRecord> list_audit_logs(const std::string& entity_type = "", const std::string& action = "", int limit = 100) const;

    // Reports Generation
    std::string generate_road_condition_csv() const;
    std::string generate_priority_list_csv() const;
    std::string generate_work_orders_csv() const;
    std::string generate_budget_scenarios_csv() const;

    // Analytics & Dashboard KPIs
    std::string get_kpis_json() const;
    std::string get_charts_json() const;
    std::string get_map_data_json() const;

private:
    mutable std::recursive_mutex mutex_;
    RoadGraph graph_;
    PriorityWeights weights_;

    std::unordered_map<std::string, UserRecord> users_;
    std::unordered_map<std::string, std::string> sessions_; // token -> user_id
    std::unordered_map<std::string, DamageReportRecord> damage_reports_;
    std::unordered_map<std::string, WorkOrderRecord> work_orders_;
    std::unordered_map<std::string, BudgetScenarioRecord> budget_scenarios_;
    std::vector<AuditLogRecord> audit_logs_;

    std::string now_iso() const;
    std::string generate_uuid() const;
    std::string hash_password(const std::string& plain) const;
    bool verify_password(const std::string& plain, const std::string& hash) const;
};
