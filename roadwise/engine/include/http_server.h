#pragma once
#include "roadwise_store.h"
#include <string>
#include <unordered_map>
#include <functional>
#include <vector>

struct HttpRequest {
    std::string method;
    std::string path;
    std::string query_string;
    std::unordered_map<std::string, std::string> headers;
    std::unordered_map<std::string, std::string> query_params;
    std::string body;
    std::string auth_token;
};

struct HttpResponse {
    int status_code = 200;
    std::string content_type = "application/json";
    std::unordered_map<std::string, std::string> headers;
    std::string body;

    static HttpResponse json(int code, const std::string& body_json) {
        HttpResponse res;
        res.status_code = code;
        res.content_type = "application/json";
        res.body = body_json;
        return res;
    }
    static HttpResponse csv(const std::string& csv_content, const std::string& filename) {
        HttpResponse res;
        res.status_code = 200;
        res.content_type = "text/csv";
        res.headers["Content-Disposition"] = "attachment; filename=" + filename;
        res.body = csv_content;
        return res;
    }
    static HttpResponse text(int code, const std::string& text_content) {
        HttpResponse res;
        res.status_code = code;
        res.content_type = "text/plain";
        res.body = text_content;
        return res;
    }
};

class HttpServer {
public:
    HttpServer(RoadStore& store, int port = 8000, const std::string& static_dir = "");
    ~HttpServer();

    void start();
    void stop();

private:
    RoadStore& store_;
    int port_;
    std::string static_dir_;
    bool running_ = false;

    HttpResponse handle_request(const HttpRequest& req);
    HttpResponse dispatch_api(const HttpRequest& req);
    HttpResponse serve_static(const std::string& path);
};
