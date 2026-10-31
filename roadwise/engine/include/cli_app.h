#pragma once
#include "roadwise_store.h"

class CliApp {
public:
    explicit CliApp(RoadStore& store);
    void run();

private:
    RoadStore& store_;

    void print_banner();
    void show_menu();
    void view_network_overview();
    void inspect_segments();
    void run_dijkstra();
    void run_bridge_analysis();
    void run_closure_simulation();
    void run_repair_priorities();
    void run_budget_optimizer();
    void manage_work_orders();
    void inspect_damage_reports();
    void export_reports();
    void run_benchmarks();
};
