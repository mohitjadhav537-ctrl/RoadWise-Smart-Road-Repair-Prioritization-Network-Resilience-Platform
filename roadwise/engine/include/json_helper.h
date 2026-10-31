#pragma once
#include <string>
#include <unordered_map>
#include <vector>
#include <sstream>
#include <stdexcept>
#include <algorithm>
#include <memory>

// ─────────────────────────────────────────────────────────────
//  Minimal hand-written JSON helper
//  Supports the specific formats used by roadwise_engine CLI.
// ─────────────────────────────────────────────────────────────

namespace json {

// ── Trim whitespace ──────────────────────────────────────────
inline std::string trim(const std::string& s) {
    size_t b = s.find_first_not_of(" \t\n\r");
    if (b == std::string::npos) return "";
    size_t e = s.find_last_not_of(" \t\n\r");
    return s.substr(b, e - b + 1);
}

// ── Unescape a JSON string literal (content between quotes) ──
inline std::string unescape(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    for (size_t i = 0; i < s.size(); ++i) {
        if (s[i] == '\\' && i + 1 < s.size()) {
            char c = s[++i];
            switch (c) {
                case '"':  out += '"';  break;
                case '\\': out += '\\'; break;
                case '/':  out += '/';  break;
                case 'n':  out += '\n'; break;
                case 'r':  out += '\r'; break;
                case 't':  out += '\t'; break;
                default:   out += c;   break;
            }
        } else {
            out += s[i];
        }
    }
    return out;
}

// ── Escape a string for JSON output ──────────────────────────
inline std::string escape(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 4);
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n";  break;
            case '\r': out += "\\r";  break;
            case '\t': out += "\\t";  break;
            default:   out += c;      break;
        }
    }
    return out;
}

// ── Skip whitespace at position pos ──────────────────────────
inline void skip_ws(const std::string& s, size_t& pos) {
    while (pos < s.size() && (s[pos]==' '||s[pos]=='\t'||s[pos]=='\n'||s[pos]=='\r'))
        ++pos;
}

// ── Parse a quoted string, advancing pos past closing quote ──
inline std::string parse_string(const std::string& s, size_t& pos) {
    if (pos >= s.size() || s[pos] != '"')
        throw std::runtime_error("Expected '\"' at pos " + std::to_string(pos));
    ++pos; // skip opening quote
    std::string result;
    while (pos < s.size() && s[pos] != '"') {
        if (s[pos] == '\\' && pos + 1 < s.size()) {
            char c = s[++pos];
            switch (c) {
                case '"':  result += '"';  break;
                case '\\': result += '\\'; break;
                case '/':  result += '/';  break;
                case 'n':  result += '\n'; break;
                case 'r':  result += '\r'; break;
                case 't':  result += '\t'; break;
                default:   result += c;   break;
            }
        } else {
            result += s[pos];
        }
        ++pos;
    }
    if (pos >= s.size()) throw std::runtime_error("Unterminated string");
    ++pos; // skip closing quote
    return result;
}

// ── Forward declarations ──────────────────────────────────────
struct Value;
using Object = std::unordered_map<std::string, Value>;
using Array  = std::vector<Value>;

struct Value {
    enum class Type { Null, Bool, Number, String, Object_, Array_ };
    Type        type   = Type::Null;
    bool        b      = false;
    double      n      = 0.0;
    std::string s;
    std::shared_ptr<Object> obj;
    std::shared_ptr<Array>  arr;

    bool is_null()   const { return type == Type::Null; }
    bool is_bool()   const { return type == Type::Bool; }
    bool is_number() const { return type == Type::Number; }
    bool is_string() const { return type == Type::String; }
    bool is_object() const { return type == Type::Object_; }
    bool is_array()  const { return type == Type::Array_; }

    double      as_number() const { return n; }
    bool        as_bool()   const { return b; }
    std::string as_string() const { return s; }
    const Object& as_object() const { return *obj; }
    const Array&  as_array()  const { return *arr; }

    // Helper: get field from object, empty Value if missing
    Value get(const std::string& key) const {
        if (!is_object()) return {};
        auto it = obj->find(key);
        if (it == obj->end()) return {};
        return it->second;
    }
};

// ── Parse a JSON value ────────────────────────────────────────
inline Value parse_value(const std::string& s, size_t& pos);

inline Value parse_object(const std::string& s, size_t& pos) {
    Value v;
    v.type = Value::Type::Object_;
    v.obj  = std::make_shared<Object>();
    ++pos; // skip '{'
    skip_ws(s, pos);
    if (pos < s.size() && s[pos] == '}') { ++pos; return v; }
    while (pos < s.size()) {
        skip_ws(s, pos);
        std::string key = parse_string(s, pos);
        skip_ws(s, pos);
        if (pos >= s.size() || s[pos] != ':')
            throw std::runtime_error("Expected ':' in object");
        ++pos;
        skip_ws(s, pos);
        (*v.obj)[key] = parse_value(s, pos);
        skip_ws(s, pos);
        if (pos < s.size() && s[pos] == ',') { ++pos; continue; }
        if (pos < s.size() && s[pos] == '}') { ++pos; break; }
        throw std::runtime_error("Expected ',' or '}' in object");
    }
    return v;
}

inline Value parse_array(const std::string& s, size_t& pos) {
    Value v;
    v.type = Value::Type::Array_;
    v.arr  = std::make_shared<Array>();
    ++pos; // skip '['
    skip_ws(s, pos);
    if (pos < s.size() && s[pos] == ']') { ++pos; return v; }
    while (pos < s.size()) {
        skip_ws(s, pos);
        v.arr->push_back(parse_value(s, pos));
        skip_ws(s, pos);
        if (pos < s.size() && s[pos] == ',') { ++pos; continue; }
        if (pos < s.size() && s[pos] == ']') { ++pos; break; }
        throw std::runtime_error("Expected ',' or ']' in array");
    }
    return v;
}

inline Value parse_value(const std::string& s, size_t& pos) {
    skip_ws(s, pos);
    if (pos >= s.size()) return {};
    char c = s[pos];
    if (c == '{') return parse_object(s, pos);
    if (c == '[') return parse_array(s, pos);
    if (c == '"') {
        Value v; v.type = Value::Type::String; v.s = parse_string(s, pos); return v;
    }
    if (c == 't') { // true
        pos += 4; Value v; v.type = Value::Type::Bool; v.b = true; return v;
    }
    if (c == 'f') { // false
        pos += 5; Value v; v.type = Value::Type::Bool; v.b = false; return v;
    }
    if (c == 'n') { // null
        pos += 4; return {};
    }
    // number
    size_t start = pos;
    if (s[pos] == '-') ++pos;
    while (pos < s.size() && (std::isdigit(s[pos]) || s[pos]=='.' || s[pos]=='e' || s[pos]=='E' || s[pos]=='+' || s[pos]=='-'))
        ++pos;
    Value v; v.type = Value::Type::Number;
    v.n = std::stod(s.substr(start, pos - start));
    return v;
}

inline Value parse(const std::string& input) {
    size_t pos = 0;
    return parse_value(input, pos);
}

// ── Simple flat map parse for backward-compat helper ─────────
inline std::unordered_map<std::string,std::string> parse_flat_object(const std::string& input) {
    std::unordered_map<std::string,std::string> result;
    Value v = parse(input);
    if (!v.is_object()) return result;
    for (auto& [k, val] : v.as_object()) {
        if (val.is_string())      result[k] = val.as_string();
        else if (val.is_number()) result[k] = std::to_string(val.as_number());
        else if (val.is_bool())   result[k] = val.as_bool() ? "true" : "false";
    }
    return result;
}

// ── JSON Builder ──────────────────────────────────────────────
class Builder {
public:
    Builder() : buf_("{}") {}

    // Start fresh object
    Builder& begin_object() { buf_ = "{"; first_ = true; return *this; }
    Builder& end_object()   { buf_ += "}"; return *this; }
    Builder& begin_array()  { buf_ = "["; first_ = true; return *this; }
    Builder& end_array()    { buf_ += "]"; return *this; }

    std::string build() const { return buf_; }

    // ── Static helpers to build whole JSON strings ────────────
    static std::string make_string(const std::string& v) {
        return "\"" + escape(v) + "\"";
    }
    static std::string make_number(double v) {
        std::ostringstream oss; oss << v; return oss.str();
    }
    static std::string make_bool(bool v) { return v ? "true" : "false"; }
    static std::string make_null() { return "null"; }

    static std::string object(const std::vector<std::pair<std::string,std::string>>& kv) {
        std::string s = "{";
        bool first = true;
        for (auto& [k, v] : kv) {
            if (!first) s += ",";
            first = false;
            s += "\"" + escape(k) + "\":" + v;
        }
        s += "}";
        return s;
    }

    static std::string array(const std::vector<std::string>& items) {
        std::string s = "[";
        bool first = true;
        for (auto& item : items) {
            if (!first) s += ",";
            first = false;
            s += item;
        }
        s += "]";
        return s;
    }

private:
    std::string buf_;
    bool first_ = true;
};

// ── Convenience: field builders ──────────────────────────────
inline std::string str_field(const std::string& key, const std::string& val) {
    return "\"" + escape(key) + "\":\"" + escape(val) + "\"";
}
inline std::string num_field(const std::string& key, double val) {
    std::ostringstream oss; oss << val;
    return "\"" + escape(key) + "\":" + oss.str();
}
inline std::string bool_field(const std::string& key, bool val) {
    return "\"" + escape(key) + "\":" + (val ? "true" : "false");
}
inline std::string int_field(const std::string& key, int val) {
    return "\"" + escape(key) + "\":" + std::to_string(val);
}
inline std::string raw_field(const std::string& key, const std::string& raw) {
    return "\"" + escape(key) + "\":" + raw;
}

} // namespace json
