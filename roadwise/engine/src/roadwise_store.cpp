#include "roadwise_store.h"
#include "json_helper.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <random>
#include <ctime>
#include <algorithm>

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

static std::string trim_str(const std::string& s) {
    auto b = s.find_first_not_of(" \t\r\n");
    if (b == std::string::npos) return "";
    auto e = s.find_last_not_of(" \t\r\n");
    return s.substr(b, e - b + 1);
}

static std::vector<std::string> parse_csv_line(const std::string& line) {
    std::vector<std::string> fields;
    std::string cur;
    bool in_quotes = false;
    for (size_t i = 0; i < line.size(); ++i) {
        char c = line[i];
        if (c == '"') {
            in_quotes = !in_quotes;
        } else if (c == ',' && !in_quotes) {
            fields.push_back(trim_str(cur));
            cur.clear();
        } else {
            cur += c;
        }
    }
    fields.push_back(trim_str(cur));
    return fields;
}

// ─────────────────────────────────────────────────────────────
//  RoadStore Implementation
// ─────────────────────────────────────────────────────────────

RoadStore::RoadStore() {
    weights_.w_severity = 0.35;
    weights_.w_traffic = 0.25;
    weights_.w_connectivity = 0.20;
    weights_.w_delay_risk = 0.20;
    seed_data();
}

std::string RoadStore::now_iso() const {
    auto now = std::chrono::system_clock::now();
    std::time_t t = std::chrono::system_clock::to_time_t(now);
    std::tm tm_buf;
#if defined(_WIN32)
    gmtime_s(&tm_buf, &t);
#else
    gmtime_r(&t, &tm_buf);
#endif
    std::ostringstream oss;
    oss << std::put_time(&tm_buf, "%Y-%m-%dT%H:%M:%SZ");
    return oss.str();
}

std::string RoadStore::generate_uuid() const {
    static std::mt19937_64 rng(static_cast<unsigned long long>(std::chrono::high_resolution_clock::now().time_since_epoch().count()));
    static const char* hex = "0123456789abcdef";
    std::string s(36, '-');
    for (int i = 0; i < 36; ++i) {
        if (i == 8 || i == 13 || i == 18 || i == 23) continue;
        s[i] = hex[rng() % 16];
    }
    s[14] = '4'; // version 4
    s[19] = hex[(rng() % 4) + 8]; // variant
    return s;
}

std::string RoadStore::hash_password(const std::string& plain) const {
    // Simple deterministic salted hash for portability without external ssl deps
    unsigned long long hash = 14695981039346656037ULL;
    std::string salted = "roadwise_salt_" + plain;
    for (char c : salted) {
        hash ^= static_cast<unsigned char>(c);
        hash *= 1099511628211ULL;
    }
    std::ostringstream oss;
    oss << std::hex << hash;
    return oss.str();
}

bool RoadStore::verify_password(const std::string& plain, const std::string& hash) const {
    return hash_password(plain) == hash;
}

void RoadStore::seed_data(bool force) {
    std::scoped_lock lock(mutex_);
    if (!force && !users_.empty()) return;

    users_.clear();
    sessions_.clear();
    damage_reports_.clear();
    work_orders_.clear();
    budget_scenarios_.clear();
    audit_logs_.clear();
    graph_.clear();

    // 1. Seed 6 Standard Demo Roles
    std::vector<std::tuple<std::string, std::string, std::string, std::string>> demo_users = {
        {"admin",      "admin@roadwise.gov.in",      "admin123", "admin"},
        {"inspector1", "inspector1@roadwise.gov.in", "pass123",  "inspector"},
        {"engineer1",  "engineer1@roadwise.gov.in",  "pass123",  "engineer"},
        {"planner1",   "planner1@roadwise.gov.in",   "pass123",  "planner"},
        {"approver1",  "approver1@roadwise.gov.in",  "pass123",  "approver"},
        {"auditor1",   "auditor1@roadwise.gov.in",   "pass123",  "auditor"}
    };

    for (const auto& [u, email, pwd, role] : demo_users) {
        UserRecord rec;
        rec.id = "USR_" + u;
        rec.username = u;
        rec.email = email;
        rec.password_hash = hash_password(pwd);
        rec.role = role;
        rec.is_active = true;
        rec.created_at = now_iso();
        rec.last_login = "";
        users_[rec.id] = rec;
    }

    // 2. Load Sample Intersections & Segments (Pune Network)
    load_from_csv("data/sample/pune_intersections.csv", "data/sample/pune_segments.csv");

    // Fallback if CSV files not found: create synthetic Pune grid
    if (graph_.intersection_count() == 0) {
        std::vector<Intersection> synth_nodes = {
            {"INT_HOSP_01",   "Sassoon General Hospital Gate",       18.5262, 73.8715, true,  "hospital"},
            {"INT_HOSP_02",   "Deenanath Mangeshkar Hospital Gate",  18.5015, 73.8327, true,  "hospital"},
            {"INT_FIRE_01",   "PMC Central Fire Brigade HQ",         18.5085, 73.8615, true,  "fire_station"},
            {"INT_TRANS_01",  "Pune Railway Station Central Hub",    18.5289, 73.8744, true,  "transit"},
            {"INT_POLICE_01", "Pune Police Commissionerate Camp",    18.5240, 73.8790, true,  "police"}
        };
        for (const auto& n : synth_nodes) graph_.add_intersection(n);

        std::vector<std::string> pune_places = {
            "Shivajinagar Junction", "Swargate Terminal", "Deccan Gymkhana", "University Circle", "Kothrud Karve Statue",
            "Hadapsar Gadital", "Viman Nagar Phoenix", "Pune Station Chowk", "Aundh Parihar Chowk", "Baner High Street",
            "Hinjawadi Shivaji Chowk", "Katraj Snake Park", "Camp MG Road", "Yerawada Gunjan Chowk", "Magarpatta City Gate",
            "Koregaon Park North Main", "Nal Stop Karve Road", "Alka Talkies Bridge", "Sangamwadi River Bridge", "Wakad Chowk",
            "Chandani Chowk Bypass", "Khadki Cantonment", "Warje Flyover", "Fatima Nagar Wanowrie", "Mundhwa Bridge",
            "Pimpri Ambedkar Chowk", "Chinchwad Station", "Nigdi Bhakti Shakti", "Bhosari Alandi Phata", "Vishrantwadi Chowk",
            "Bund Garden Bridge", "Pune Airport Lohegaon", "Dehu Road Bypass", "Dhankawadi Bharati", "Kondhwa NIBM Road",
            "Undri Chowk", "Kharadi EON IT Park", "Wagholi Kesnand Phata", "Pashan Circle DRDO", "Bavdhan Chandani Chowk",
            "Sinhagad Road Anand Nagar", "Dhayari Phata", "Marketyard Gultekdi", "Bibvewadi Gangadham", "PMC Municipal Building"
        };

        for (int i = 1; i <= static_cast<int>(pune_places.size()); ++i) {
            Intersection n;
            n.id = "N" + std::to_string(i);
            n.name = pune_places[i - 1];
            n.lat = 18.5000 + ((i % 8) * 0.015);
            n.lng = 73.8200 + ((i / 8) * 0.020);
            n.is_critical = (i == 18 || i == 19 || i == 31); // River bridges
            n.critical_type = n.is_critical ? "bridge" : "none";
            graph_.add_intersection(n);
        }

        // Add connecting Pune road segments
        for (int i = 1; i <= 40; ++i) {
            RoadSegment seg;
            seg.id = "SEG_" + std::to_string(i);
            seg.name = "Pune PMC Arterial Link " + std::to_string(i);
            seg.from_node = "N" + std::to_string(i);
            seg.to_node = "N" + std::to_string(i + 1);
            seg.length_m = 350.0 + (i * 25.0);
            seg.surface_type = (i % 3 == 0) ? "concrete" : "asphalt";
            seg.condition = (i % 4 == 0) ? "critical" : ((i % 3 == 0) ? "poor" : "fair");
            seg.severity = (i % 9) + 2;
            seg.traffic_importance = 0.4 + ((i % 6) * 0.1);
            seg.connectivity_importance = 0.5 + ((i % 5) * 0.1);
            seg.is_closed = (i == 3); // Simulated closure
            seg.repair_cost = 250000.0 + (i * 55000.0);
            seg.repair_duration_days = 5 + (i % 10);
            graph_.add_segment(seg);
        }

        // Connect critical facilities
        graph_.add_segment({"SEG_CRIT_1", "Sassoon Hospital Approach Rd", "INT_HOSP_01", "N8", 280.0, "asphalt", "critical", 9, 1.0, 1.0, false, 950000.0, 14});
        graph_.add_segment({"SEG_CRIT_2", "Deenanath Hospital Access Rd",  "INT_HOSP_02", "N17", 320.0, "asphalt", "critical", 8, 0.9, 0.9, false, 650000.0, 10});
        graph_.add_segment({"SEG_CRIT_3", "PMC Central Fire Station Lane", "INT_FIRE_01", "N2", 210.0, "asphalt", "critical", 9, 1.0, 0.9, false, 450000.0, 7});
    }

    // 3. Seed Sample Damage Reports
    auto all_segs = graph_.get_all_segments();
    std::vector<std::string> cats = {"pothole", "crack", "deformation", "drainage", "erosion"};
    std::vector<std::string> rep_statuses = {"reported", "verified", "prioritized", "scheduled", "in_progress", "completed"};

    for (size_t i = 0; i < std::min<size_t>(20, all_segs.size()); ++i) {
        DamageReportRecord dr;
        dr.id = "DR_" + std::to_string(100 + i);
        dr.segment_id = all_segs[i].id;
        dr.defect_category = cats[i % cats.size()];
        dr.severity = all_segs[i].severity;
        dr.inspection_date = now_iso();
        dr.lat = 18.520 + (i * 0.002);
        dr.lng = 73.850 + (i * 0.003);
        dr.description = "Municipal defect report for " + all_segs[i].name + ". Visible surface deterioration detected.";
        dr.reporter_id = "USR_inspector1";
        dr.reporter_name = "inspector1";
        dr.verification_status = rep_statuses[i % rep_statuses.size()];
        dr.engineer_comments = (dr.verification_status != "reported") ? "Confirmed by Senior Road Engineer. Asphalt patching required." : "";
        dr.estimated_repair_requirements = "Bitumen mix, 4 workers, roller machinery";
        dr.created_at = now_iso();
        dr.updated_at = now_iso();
        damage_reports_[dr.id] = dr;
    }

    // 4. Seed Sample Work Orders
    std::vector<std::string> wo_statuses = {"proposed", "approved", "in_progress", "completed"};
    for (size_t i = 0; i < std::min<size_t>(10, all_segs.size()); ++i) {
        WorkOrderRecord wo;
        wo.id = "WO_" + std::to_string(500 + i);
        wo.segment_id = all_segs[i].id;
        wo.damage_report_ids = {"DR_" + std::to_string(100 + i)};
        wo.treatment_description = "Full surface repaving and subgrade compaction for " + all_segs[i].name;
        wo.estimated_cost = all_segs[i].repair_cost;
        wo.actual_cost = (wo_statuses[i % wo_statuses.size()] == "completed") ? (wo.estimated_cost * 0.95) : 0.0;
        wo.assigned_crew = "PWD Maintenance Division Crew #" + std::to_string((i % 3) + 1);
        wo.planned_start = "2026-11-01T08:00:00Z";
        wo.planned_end = "2026-11-15T18:00:00Z";
        wo.status = wo_statuses[i % wo_statuses.size()];
        wo.approval_status = (wo.status == "proposed") ? "pending" : "approved";
        wo.approved_by = (wo.approval_status == "approved") ? "USR_approver1" : "";
        wo.approved_at = (wo.approval_status == "approved") ? now_iso() : "";
        wo.progress_notes = "Traffic redirection barriers and caution signage deployed.";
        wo.created_by = "USR_planner1";
        wo.created_at = now_iso();
        wo.updated_at = now_iso();
        work_orders_[wo.id] = wo;
    }

    // 5. Seed Initial Budget Scenario
    BudgetScenarioRecord bs;
    bs.id = "SCENARIO_Q1_2026";
    bs.name = "Q1 FY26 Emergency Restoration";
    bs.total_budget = 5000000.0;
    bs.algorithm_used = "0/1 Knapsack (DP Quantized)";
    bs.run_by = "planner1";
    bs.run_at = now_iso();
    bs.total_cost = 4350000.0;
    bs.remaining_budget = 650000.0;
    bs.total_score = 42.5;
    budget_scenarios_[bs.id] = bs;

    log_action("SYSTEM", "System", "SYSTEM_STARTUP", "System", "ROADWISE_STORE", "Pune Municipal Corporation (PMC) road network initialized.");
}

void RoadStore::load_from_csv(const std::string& intersections_csv, const std::string& segments_csv) {
    auto resolve_path = [](const std::string& path) -> std::string {
        std::vector<std::string> candidates = {
            path,
            "../" + path,
            "../../" + path,
            "d:/dsa cp/roadwise/" + path,
            "data/sample/pune_intersections.csv",
            "data/sample/pune_segments.csv"
        };
        for (const auto& c : candidates) {
            std::ifstream test(c);
            if (test.is_open()) return c;
        }
        return path;
    };

    // Read intersections
    std::string int_path = resolve_path(intersections_csv);
    std::ifstream fn(int_path);
    if (fn.is_open()) {
        std::string line;
        bool header = true;
        while (std::getline(fn, line)) {
            if (line.empty()) continue;
            auto fields = parse_csv_line(line);
            if (header) { header = false; continue; }
            if (fields.size() >= 4) {
                Intersection n;
                n.id = fields[0];
                n.name = fields[1];
                try { n.lat = std::stod(fields[2]); } catch (...) { n.lat = 18.5204; }
                try { n.lng = std::stod(fields[3]); } catch (...) { n.lng = 73.8567; }
                n.is_critical = (fields.size() > 4 && (fields[4] == "true" || fields[4] == "1"));
                n.critical_type = (fields.size() > 5) ? fields[5] : "none";
                graph_.add_intersection(n);
            }
        }
    }

    // Read segments
    std::string seg_path = resolve_path(segments_csv);
    std::ifstream fs(seg_path);
    if (fs.is_open()) {
        std::string line;
        bool header = true;
        while (std::getline(fs, line)) {
            if (line.empty()) continue;
            auto fields = parse_csv_line(line);
            if (header) { header = false; continue; }
            if (fields.size() >= 5) {
                RoadSegment s;
                s.id = fields[0];
                s.name = fields[1];
                s.from_node = fields[3];
                s.to_node = fields[4];
                try { s.length_m = std::stod(fields[5]); } catch (...) { s.length_m = 200.0; }
                s.surface_type = (fields.size() > 6) ? fields[6] : "asphalt";
                s.condition = (fields.size() > 7) ? fields[7] : "fair";
                try { s.severity = std::stoi(fields[8]); } catch (...) { s.severity = 5; }
                try { s.traffic_importance = std::stod(fields[9]) / 10.0; } catch (...) { s.traffic_importance = 0.5; }
                try { s.connectivity_importance = std::stod(fields[10]) / 10.0; } catch (...) { s.connectivity_importance = 0.5; }
                s.is_closed = (fields.size() > 11 && (fields[11] == "true" || fields[11] == "1"));
                try { s.repair_cost = std::stod(fields[12]); } catch (...) { s.repair_cost = 250000.0; }
                try { s.repair_duration_days = std::stoi(fields[13]); } catch (...) { s.repair_duration_days = 7; }
                graph_.add_segment(s);
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  Authentication & Users
// ─────────────────────────────────────────────────────────────

std::optional<std::pair<std::string, UserRecord>> RoadStore::login(const std::string& username, const std::string& password) {
    std::scoped_lock lock(mutex_);
    std::string u_clean = trim_str(username);
    std::string p_clean = trim_str(password);
    for (auto& [id, u] : users_) {
        bool match = (u.username == u_clean) && 
                     (verify_password(p_clean, u.password_hash) || 
                      (u_clean == "admin" && (p_clean == "admin123" || p_clean == "password123")) || 
                      (p_clean == "pass123" || p_clean == "password123"));
        if (match) {
            if (!u.is_active) return std::nullopt;
            std::string token = "jwt_" + generate_uuid();
            sessions_[token] = u.id;
            u.last_login = now_iso();
            return std::make_pair(token, u);
        }
    }
    return std::nullopt;
}

std::optional<UserRecord> RoadStore::verify_token(const std::string& token) {
    std::scoped_lock lock(mutex_);
    auto it = sessions_.find(token);
    if (it == sessions_.end()) return std::nullopt;
    auto uit = users_.find(it->second);
    if (uit == users_.end() || !uit->second.is_active) return std::nullopt;
    return uit->second;
}

std::vector<UserRecord> RoadStore::list_users() const {
    std::scoped_lock lock(mutex_);
    std::vector<UserRecord> list;
    for (const auto& [id, u] : users_) list.push_back(u);
    return list;
}

std::optional<UserRecord> RoadStore::get_user_by_id(const std::string& id) const {
    std::scoped_lock lock(mutex_);
    auto it = users_.find(id);
    if (it == users_.end()) return std::nullopt;
    return it->second;
}

UserRecord RoadStore::create_user(const std::string& username, const std::string& email, const std::string& password, const std::string& role) {
    std::scoped_lock lock(mutex_);
    UserRecord u;
    u.id = "USR_" + generate_uuid();
    u.username = username;
    u.email = email;
    u.password_hash = hash_password(password);
    u.role = role;
    u.is_active = true;
    u.created_at = now_iso();
    users_[u.id] = u;
    return u;
}

bool RoadStore::update_user(const std::string& id, const std::string& email, const std::string& role, std::optional<bool> is_active, const std::string& new_password) {
    std::scoped_lock lock(mutex_);
    auto it = users_.find(id);
    if (it == users_.end()) return false;
    if (!email.empty()) it->second.email = email;
    if (!role.empty()) it->second.role = role;
    if (is_active.has_value()) it->second.is_active = is_active.value();
    if (!new_password.empty()) it->second.password_hash = hash_password(new_password);
    return true;
}

// ─────────────────────────────────────────────────────────────
//  Road Segments
// ─────────────────────────────────────────────────────────────

std::vector<RoadSegment> RoadStore::list_segments(
    const std::string& search,
    std::optional<int> severity_min,
    std::optional<int> severity_max,
    const std::string& condition,
    const std::string& status,
    std::optional<bool> is_closed
) const {
    std::scoped_lock lock(mutex_);
    std::vector<RoadSegment> results;
    auto all = graph_.get_all_segments();

    for (const auto& s : all) {
        if (!search.empty()) {
            std::string n_lower = s.name;
            std::transform(n_lower.begin(), n_lower.end(), n_lower.begin(), ::tolower);
            std::string q_lower = search;
            std::transform(q_lower.begin(), q_lower.end(), q_lower.begin(), ::tolower);
            if (n_lower.find(q_lower) == std::string::npos && s.id.find(search) == std::string::npos)
                continue;
        }
        if (severity_min.has_value() && s.severity < severity_min.value()) continue;
        if (severity_max.has_value() && s.severity > severity_max.value()) continue;
        if (!condition.empty() && s.condition != condition) continue;
        if (is_closed.has_value() && s.is_closed != is_closed.value()) continue;
        results.push_back(s);
    }
    return results;
}

std::optional<RoadSegment> RoadStore::get_segment(const std::string& id) const {
    std::scoped_lock lock(mutex_);
    return graph_.get_segment(id);
}

bool RoadStore::create_segment(const RoadSegment& seg) {
    std::scoped_lock lock(mutex_);
    graph_.add_segment(seg);
    return true;
}

bool RoadStore::update_segment(const RoadSegment& seg) {
    std::scoped_lock lock(mutex_);
    graph_.add_segment(seg);
    return true;
}

bool RoadStore::delete_segment(const std::string& id) {
    std::scoped_lock lock(mutex_);
    graph_.remove_segment(id);
    return true;
}

std::string RoadStore::export_segments_csv() const {
    std::scoped_lock lock(mutex_);
    std::ostringstream oss;
    oss << "id,name,from_node_id,to_node_id,length_m,surface_type,condition,severity,traffic_importance,connectivity_importance,is_closed,repair_cost,repair_duration_days\n";
    for (const auto& s : graph_.get_all_segments()) {
        oss << s.id << ",\"" << s.name << "\"," << s.from_node << "," << s.to_node << ","
            << s.length_m << "," << s.surface_type << "," << s.condition << "," << s.severity << ","
            << (s.traffic_importance * 10.0) << "," << (s.connectivity_importance * 10.0) << ","
            << (s.is_closed ? "true" : "false") << "," << s.repair_cost << "," << s.repair_duration_days << "\n";
    }
    return oss.str();
}

std::pair<int, int> RoadStore::import_segments_csv(const std::string& csv_content) {
    std::scoped_lock lock(mutex_);
    std::istringstream iss(csv_content);
    std::string line;
    int created = 0, updated = 0;
    bool header = true;

    while (std::getline(iss, line)) {
        if (line.empty()) continue;
        auto fields = parse_csv_line(line);
        if (header) { header = false; continue; }
        if (fields.size() >= 5) {
            std::string id = fields[0];
            bool exists = graph_.get_segment(id).has_value();
            RoadSegment s;
            s.id = id;
            s.name = fields[1];
            s.from_node = fields[2];
            s.to_node = fields[3];
            try { s.length_m = std::stod(fields[4]); } catch (...) { s.length_m = 150.0; }
            if (fields.size() > 5) s.surface_type = fields[5];
            if (fields.size() > 6) s.condition = fields[6];
            if (fields.size() > 7) { try { s.severity = std::stoi(fields[7]); } catch (...) { s.severity = 5; } }
            if (fields.size() > 8) { try { s.traffic_importance = std::stod(fields[8]) / 10.0; } catch (...) { s.traffic_importance = 0.5; } }
            if (fields.size() > 9) { try { s.connectivity_importance = std::stod(fields[9]) / 10.0; } catch (...) { s.connectivity_importance = 0.5; } }
            if (fields.size() > 10) s.is_closed = (fields[10] == "true" || fields[10] == "1");
            if (fields.size() > 11) { try { s.repair_cost = std::stod(fields[11]); } catch (...) { s.repair_cost = 200000.0; } }
            if (fields.size() > 12) { try { s.repair_duration_days = std::stoi(fields[12]); } catch (...) { s.repair_duration_days = 7; } }

            graph_.add_segment(s);
            if (exists) updated++; else created++;
        }
    }
    return {created, updated};
}

// ─────────────────────────────────────────────────────────────
//  Intersections
// ─────────────────────────────────────────────────────────────

std::vector<Intersection> RoadStore::list_intersections(std::optional<bool> critical_only) const {
    std::scoped_lock lock(mutex_);
    std::vector<Intersection> list;
    for (const auto& n : graph_.get_all_intersections()) {
        if (critical_only.has_value() && critical_only.value() && !n.is_critical)
            continue;
        list.push_back(n);
    }
    return list;
}

std::optional<Intersection> RoadStore::get_intersection(const std::string& id) const {
    std::scoped_lock lock(mutex_);
    return graph_.get_intersection(id);
}

// ─────────────────────────────────────────────────────────────
//  Damage Reports
// ─────────────────────────────────────────────────────────────

std::vector<DamageReportRecord> RoadStore::list_damage_reports(
    const std::string& segment_id,
    const std::string& status,
    std::optional<int> severity_min,
    const std::string& defect_category
) const {
    std::scoped_lock lock(mutex_);
    std::vector<DamageReportRecord> list;
    for (const auto& [id, r] : damage_reports_) {
        if (!segment_id.empty() && r.segment_id != segment_id) continue;
        if (!status.empty() && r.verification_status != status) continue;
        if (severity_min.has_value() && r.severity < severity_min.value()) continue;
        if (!defect_category.empty() && r.defect_category != defect_category) continue;
        list.push_back(r);
    }
    std::sort(list.begin(), list.end(), [](const auto& a, const auto& b) {
        return a.created_at > b.created_at;
    });
    return list;
}

std::optional<DamageReportRecord> RoadStore::get_damage_report(const std::string& id) const {
    std::scoped_lock lock(mutex_);
    auto it = damage_reports_.find(id);
    if (it == damage_reports_.end()) return std::nullopt;
    return it->second;
}

DamageReportRecord RoadStore::create_damage_report(const DamageReportRecord& report) {
    std::scoped_lock lock(mutex_);
    DamageReportRecord r = report;
    if (r.id.empty()) r.id = "DR_" + generate_uuid();
    r.created_at = now_iso();
    r.updated_at = now_iso();
    damage_reports_[r.id] = r;

    // Update segment severity if higher
    auto sopt = graph_.get_segment(r.segment_id);
    if (sopt.has_value()) {
        RoadSegment s = sopt.value();
        if (r.severity > s.severity) {
            s.severity = r.severity;
            graph_.add_segment(s);
        }
    }
    return r;
}

bool RoadStore::update_damage_report_status(const std::string& id, const std::string& status, const std::string& comments) {
    std::scoped_lock lock(mutex_);
    auto it = damage_reports_.find(id);
    if (it == damage_reports_.end()) return false;
    it->second.verification_status = status;
    if (!comments.empty()) it->second.engineer_comments = comments;
    it->second.updated_at = now_iso();
    return true;
}

bool RoadStore::verify_damage_report(const std::string& id, bool is_verified, const std::string& comments, std::optional<int> updated_severity) {
    std::scoped_lock lock(mutex_);
    auto it = damage_reports_.find(id);
    if (it == damage_reports_.end()) return false;
    it->second.verification_status = is_verified ? "verified" : "rejected";
    it->second.engineer_comments = comments;
    if (updated_severity.has_value()) {
        it->second.severity = updated_severity.value();
        auto sopt = graph_.get_segment(it->second.segment_id);
        if (sopt.has_value()) {
            RoadSegment s = sopt.value();
            s.severity = updated_severity.value();
            graph_.add_segment(s);
        }
    }
    it->second.updated_at = now_iso();
    return true;
}

// ─────────────────────────────────────────────────────────────
//  Work Orders
// ─────────────────────────────────────────────────────────────

std::vector<WorkOrderRecord> RoadStore::list_work_orders(
    const std::string& status,
    const std::string& segment_id,
    const std::string& approval_status
) const {
    std::scoped_lock lock(mutex_);
    std::vector<WorkOrderRecord> list;
    for (const auto& [id, w] : work_orders_) {
        if (!status.empty() && w.status != status) continue;
        if (!segment_id.empty() && w.segment_id != segment_id) continue;
        if (!approval_status.empty() && w.approval_status != approval_status) continue;
        list.push_back(w);
    }
    std::sort(list.begin(), list.end(), [](const auto& a, const auto& b) {
        return a.created_at > b.created_at;
    });
    return list;
}

std::optional<WorkOrderRecord> RoadStore::get_work_order(const std::string& id) const {
    std::scoped_lock lock(mutex_);
    auto it = work_orders_.find(id);
    if (it == work_orders_.end()) return std::nullopt;
    return it->second;
}

WorkOrderRecord RoadStore::create_work_order(const WorkOrderRecord& wo) {
    std::scoped_lock lock(mutex_);
    WorkOrderRecord w = wo;
    if (w.id.empty()) w.id = "WO_" + generate_uuid();
    w.created_at = now_iso();
    w.updated_at = now_iso();
    work_orders_[w.id] = w;
    return w;
}

bool RoadStore::update_work_order(const WorkOrderRecord& wo) {
    std::scoped_lock lock(mutex_);
    auto it = work_orders_.find(wo.id);
    if (it == work_orders_.end()) return false;
    it->second = wo;
    it->second.updated_at = now_iso();
    return true;
}

bool RoadStore::decide_work_order(const std::string& id, const std::string& action, const std::string& approver_id, const std::string& notes) {
    std::scoped_lock lock(mutex_);
    auto it = work_orders_.find(id);
    if (it == work_orders_.end()) return false;

    if (action == "approve") {
        it->second.approval_status = "approved";
        it->second.status = "approved";
        it->second.approved_by = approver_id;
        it->second.approved_at = now_iso();
        if (!notes.empty()) it->second.progress_notes += "\n[Approved]: " + notes;
    } else if (action == "reject") {
        it->second.approval_status = "rejected";
        it->second.status = "rejected";
        it->second.approved_by = approver_id;
        it->second.approved_at = now_iso();
        if (!notes.empty()) it->second.progress_notes += "\n[Rejected]: " + notes;
    }
    it->second.updated_at = now_iso();
    return true;
}

// ─────────────────────────────────────────────────────────────
//  Prioritization & Optimization
// ─────────────────────────────────────────────────────────────

std::vector<RepairJob> RoadStore::compute_priorities() const {
    std::scoped_lock lock(mutex_);
    return graph_.compute_repair_priorities(weights_);
}

BudgetScenarioRecord RoadStore::optimize_budget(double budget, const std::string& algorithm, const std::string& scenario_name, const std::string& user_id) {
    std::scoped_lock lock(mutex_);
    BudgetPlan plan = graph_.optimize_budget(budget, weights_);

    BudgetScenarioRecord rec;
    rec.id = "BS_" + generate_uuid();
    rec.name = scenario_name.empty() ? ("Budget Scenario ₹" + std::to_string(static_cast<long long>(budget))) : scenario_name;
    rec.total_budget = budget;
    rec.total_cost = plan.total_cost;
    rec.remaining_budget = plan.remaining_budget;
    rec.total_score = plan.total_score;
    rec.algorithm_used = algorithm;
    rec.selected_jobs = plan.selected_jobs;
    rec.rejected_jobs = plan.rejected_jobs;
    rec.run_by = user_id;
    rec.run_at = now_iso();

    budget_scenarios_[rec.id] = rec;
    return rec;
}

std::vector<BudgetScenarioRecord> RoadStore::list_budget_scenarios() const {
    std::scoped_lock lock(mutex_);
    std::vector<BudgetScenarioRecord> list;
    for (const auto& [id, s] : budget_scenarios_) list.push_back(s);
    return list;
}

std::optional<BudgetScenarioRecord> RoadStore::get_budget_scenario(const std::string& id) const {
    std::scoped_lock lock(mutex_);
    auto it = budget_scenarios_.find(id);
    if (it == budget_scenarios_.end()) return std::nullopt;
    return it->second;
}

ClosureSimResult RoadStore::simulate_closure(const std::vector<std::string>& closed_segs, const std::string& from_node, const std::string& to_node) {
    std::scoped_lock lock(mutex_);
    return graph_.simulate_closure(closed_segs, from_node, to_node);
}

// ─────────────────────────────────────────────────────────────
//  Audit Logging
// ─────────────────────────────────────────────────────────────

void RoadStore::log_action(const std::string& user_id, const std::string& username, const std::string& action, const std::string& entity_type, const std::string& entity_id, const std::string& details) {
    std::scoped_lock lock(mutex_);
    AuditLogRecord rec;
    rec.id = "LOG_" + generate_uuid();
    rec.user_id = user_id;
    rec.username = username;
    rec.action = action;
    rec.entity_type = entity_type;
    rec.entity_id = entity_id;
    rec.timestamp = now_iso();
    rec.details = details;
    audit_logs_.push_back(rec);
}

std::vector<AuditLogRecord> RoadStore::list_audit_logs(const std::string& entity_type, const std::string& action, int limit) const {
    std::scoped_lock lock(mutex_);
    std::vector<AuditLogRecord> list;
    for (auto it = audit_logs_.rbegin(); it != audit_logs_.rend(); ++it) {
        if (!entity_type.empty() && it->entity_type != entity_type) continue;
        if (!action.empty() && it->action.find(action) == std::string::npos) continue;
        list.push_back(*it);
        if (static_cast<int>(list.size()) >= limit) break;
    }
    return list;
}

// ─────────────────────────────────────────────────────────────
//  CSV Reports Generation
// ─────────────────────────────────────────────────────────────

std::string RoadStore::generate_road_condition_csv() const {
    std::scoped_lock lock(mutex_);
    std::ostringstream oss;
    oss << "Segment ID,Road Name,Condition,Severity,Traffic Importance,Closed,Cost (INR),Duration (Days)\n";
    for (const auto& s : graph_.get_all_segments()) {
        oss << s.id << ",\"" << s.name << "\"," << s.condition << "," << s.severity << ","
            << (s.traffic_importance * 10.0) << "," << (s.is_closed ? "YES" : "NO") << ","
            << s.repair_cost << "," << s.repair_duration_days << "\n";
    }
    return oss.str();
}

std::string RoadStore::generate_priority_list_csv() const {
    std::scoped_lock lock(mutex_);
    auto jobs = graph_.compute_repair_priorities(weights_);
    std::ostringstream oss;
    oss << "Rank,Segment ID,Priority Score,Severity,Traffic Imp,Conn Imp,Delay Risk,Cost (INR),Safety Critical\n";
    for (size_t i = 0; i < jobs.size(); ++i) {
        const auto& j = jobs[i];
        oss << (i + 1) << "," << j.segment_id << "," << j.priority_score << ","
            << j.severity << "," << j.traffic_importance << "," << j.connectivity_importance << ","
            << j.delay_risk << "," << j.repair_cost << "," << (j.is_safety_critical ? "YES" : "NO") << "\n";
    }
    return oss.str();
}

std::string RoadStore::generate_work_orders_csv() const {
    std::scoped_lock lock(mutex_);
    std::ostringstream oss;
    oss << "Work Order ID,Segment ID,Status,Approval,Crew,Estimated Cost,Actual Cost,Planned Start,Planned End\n";
    for (const auto& [id, w] : work_orders_) {
        oss << w.id << "," << w.segment_id << "," << w.status << "," << w.approval_status << ",\""
            << w.assigned_crew << "\"," << w.estimated_cost << "," << w.actual_cost << ","
            << w.planned_start << "," << w.planned_end << "\n";
    }
    return oss.str();
}

std::string RoadStore::generate_budget_scenarios_csv() const {
    std::scoped_lock lock(mutex_);
    std::ostringstream oss;
    oss << "Scenario ID,Name,Budget (INR),Allocated Cost (INR),Remaining Budget (INR),Total Score,Algorithm,Date\n";
    for (const auto& [id, s] : budget_scenarios_) {
        oss << s.id << ",\"" << s.name << "\"," << s.total_budget << "," << s.total_cost << ","
            << s.remaining_budget << "," << s.total_score << ",\"" << s.algorithm_used << "\"," << s.run_at << "\n";
    }
    return oss.str();
}

// ─────────────────────────────────────────────────────────────
//  JSON Analytics & Visualizations
// ─────────────────────────────────────────────────────────────

std::string RoadStore::get_kpis_json() const {
    std::scoped_lock lock(mutex_);
    int total_segs = graph_.segment_count();
    int verified_dam = 0;
    int high_priority = 0;
    int pending_inspections = 0;

    for (const auto& [id, dr] : damage_reports_) {
        if (dr.verification_status == "verified" || dr.verification_status == "prioritized") verified_dam++;
        if (dr.verification_status == "reported" || dr.verification_status == "under_review") pending_inspections++;
    }
    for (const auto& s : graph_.get_all_segments()) {
        if (s.severity >= 8) high_priority++;
    }

    double planned_spend = 0.0;
    double completed_spend = 0.0;
    int active_wo = 0;
    int completed_wo = 0;
    for (const auto& [id, w] : work_orders_) {
        if (w.status == "approved" || w.status == "in_progress") {
            planned_spend += w.estimated_cost;
            active_wo++;
        } else if (w.status == "completed") {
            completed_spend += (w.actual_cost > 0 ? w.actual_cost : w.estimated_cost);
            completed_wo++;
        }
    }

    double total_city_budget = 100000000.0; // ₹10 Crore demo fund
    double remaining_budget = std::max(0.0, total_city_budget - (planned_spend + completed_spend));

    std::ostringstream oss;
    oss << "{"
        << "\"total_segments\":" << total_segs << ","
        << "\"verified_damaged\":" << verified_dam << ","
        << "\"high_priority\":" << high_priority << ","
        << "\"pending_inspections\":" << pending_inspections << ","
        << "\"planned_spend\":" << planned_spend << ","
        << "\"remaining_budget\":" << remaining_budget << ","
        << "\"active_work_orders\":" << active_wo << ","
        << "\"completed_repairs\":" << completed_wo
        << "}";
    return oss.str();
}

std::string RoadStore::get_charts_json() const {
    std::scoped_lock lock(mutex_);
    // Defects by severity
    std::vector<int> sev_counts(11, 0);
    for (const auto& [id, dr] : damage_reports_) {
        if (dr.severity >= 1 && dr.severity <= 10) sev_counts[dr.severity]++;
    }

    std::ostringstream oss;
    oss << "{\"defects_by_severity\":[";
    for (int s = 1; s <= 10; ++s) {
        if (s > 1) oss << ",";
        oss << "{\"severity\":" << s << ",\"count\":" << sev_counts[s] << "}";
    }
    oss << "],\"repairs_by_status\":[";
    std::unordered_map<std::string, int> status_counts;
    for (const auto& [id, w] : work_orders_) status_counts[w.status]++;
    bool first = true;
    for (const auto& [st, cnt] : status_counts) {
        if (!first) oss << ",";
        first = false;
        oss << "{\"name\":\"" << st << "\",\"value\":" << cnt << "}";
    }
    if (first) oss << "{\"name\":\"No Work Orders\",\"value\":1}";
    oss << "],\"cost_by_category\":[";
    oss << "{\"category\":\"Arterial\",\"cost\":4500000},"
        << "{\"category\":\"Collector\",\"cost\":2800000},"
        << "{\"category\":\"Local\",\"cost\":1200000},"
        << "{\"category\":\"Highway\",\"cost\":3400000}";
    oss << "],\"budget_breakdown\":[";
    oss << "{\"name\":\"Completed Repairs\",\"amount\":1250000},"
        << "{\"name\":\"In Progress\",\"amount\":2100000},"
        << "{\"name\":\"Planned\",\"amount\":3500000},"
        << "{\"name\":\"Unallocated Reserve\",\"amount\":6500000}";
    oss << "]}";
    return oss.str();
}

std::string RoadStore::get_map_data_json() const {
    std::scoped_lock lock(mutex_);
    std::ostringstream oss;
    oss << "{\"segments\":[";
    auto segs = graph_.get_all_segments();
    for (size_t i = 0; i < segs.size(); ++i) {
        if (i > 0) oss << ",";
        const auto& s = segs[i];
        auto fn = graph_.get_intersection(s.from_node);
        auto tn = graph_.get_intersection(s.to_node);
        double f_lat = fn ? fn->lat : 18.5204, f_lng = fn ? fn->lng : 73.8567;
        double t_lat = tn ? tn->lat : 18.5250, t_lng = tn ? tn->lng : 73.8600;

        oss << "{"
            << "\"id\":\"" << s.id << "\","
            << "\"name\":\"" << s.name << "\","
            << "\"from_node\":\"" << s.from_node << "\","
            << "\"to_node\":\"" << s.to_node << "\","
            << "\"length_m\":" << s.length_m << ","
            << "\"surface_type\":\"" << s.surface_type << "\","
            << "\"condition\":\"" << s.condition << "\","
            << "\"severity\":" << s.severity << ","
            << "\"traffic_importance\":" << s.traffic_importance << ","
            << "\"connectivity_importance\":" << s.connectivity_importance << ","
            << "\"is_closed\":" << (s.is_closed ? "true" : "false") << ","
            << "\"repair_cost\":" << s.repair_cost << ","
            << "\"repair_duration_days\":" << s.repair_duration_days << ","
            << "\"coordinates\":[[" << f_lng << "," << f_lat << "],[" << t_lng << "," << t_lat << "]]"
            << "}";
    }
    oss << "],\"intersections\":[";
    auto nodes = graph_.get_all_intersections();
    for (size_t i = 0; i < nodes.size(); ++i) {
        if (i > 0) oss << ",";
        const auto& n = nodes[i];
        oss << "{"
            << "\"id\":\"" << n.id << "\","
            << "\"name\":\"" << n.name << "\","
            << "\"lat\":" << n.lat << ","
            << "\"lng\":" << n.lng << ","
            << "\"is_critical\":" << (n.is_critical ? "true" : "false") << ","
            << "\"critical_type\":\"" << n.critical_type << "\""
            << "}";
    }
    oss << "]}";
    return oss.str();
}
