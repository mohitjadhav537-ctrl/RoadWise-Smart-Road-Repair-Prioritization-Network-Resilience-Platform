#pragma once
#include <iostream>
#include <vector>
#include <string>
#include <cmath>
#include <functional>

namespace testing {

inline int total_tests = 0;
inline int passed_tests = 0;
inline int failed_tests = 0;

struct TestCase {
    std::string suite;
    std::string name;
    std::function<void()> func;
};

inline std::vector<TestCase>& get_tests() {
    static std::vector<TestCase> tests;
    return tests;
}

inline bool register_test(const std::string& suite, const std::string& name, std::function<void()> func) {
    get_tests().push_back({suite, name, func});
    return true;
}

inline void record_failure(const std::string& file, int line, const std::string& expr) {
    std::cerr << "  FAILED: " << file << ":" << line << " (" << expr << ")\n";
    failed_tests++;
}

inline int run_all_tests() {
    std::cout << "[==========] Running " << get_tests().size() << " tests.\n";
    int current_failed = 0;
    for (const auto& test : get_tests()) {
        std::cout << "[ RUN      ] " << test.suite << "." << test.name << "\n";
        total_tests++;
        int prev_failures = failed_tests;
        try {
            test.func();
        } catch (const std::exception& e) {
            std::cerr << "  EXCEPTION: " << e.what() << "\n";
            failed_tests++;
        } catch (...) {
            std::cerr << "  UNKNOWN EXCEPTION\n";
            failed_tests++;
        }
        if (failed_tests == prev_failures) {
            std::cout << "[       OK ] " << test.suite << "." << test.name << "\n";
            passed_tests++;
        } else {
            std::cout << "[  FAILED  ] " << test.suite << "." << test.name << "\n";
            current_failed++;
        }
    }
    std::cout << "[==========] " << total_tests << " tests ran.\n";
    std::cout << "[  PASSED  ] " << passed_tests << " tests.\n";
    if (current_failed > 0) {
        std::cout << "[  FAILED  ] " << current_failed << " tests.\n";
        return 1;
    }
    return 0;
}

} // namespace testing

#define TEST(Suite, Name) \
    void Suite##_##Name##_Test(); \
    static bool Suite##_##Name##_registered = ::testing::register_test(#Suite, #Name, Suite##_##Name##_Test); \
    void Suite##_##Name##_Test()

#define EXPECT_TRUE(c) do { if (!(c)) ::testing::record_failure(__FILE__, __LINE__, #c); } while(0)
#define EXPECT_FALSE(c) do { if (c) ::testing::record_failure(__FILE__, __LINE__, "!(" #c ")"); } while(0)
#define EXPECT_EQ(a, b) do { if (!((a) == (b))) ::testing::record_failure(__FILE__, __LINE__, #a " == " #b); } while(0)
#define EXPECT_NE(a, b) do { if (!((a) != (b))) ::testing::record_failure(__FILE__, __LINE__, #a " != " #b); } while(0)
#define EXPECT_LT(a, b) do { if (!((a) < (b))) ::testing::record_failure(__FILE__, __LINE__, #a " < " #b); } while(0)
#define EXPECT_LE(a, b) do { if (!((a) <= (b))) ::testing::record_failure(__FILE__, __LINE__, #a " <= " #b); } while(0)
#define EXPECT_GT(a, b) do { if (!((a) > (b))) ::testing::record_failure(__FILE__, __LINE__, #a " > " #b); } while(0)
#define EXPECT_GE(a, b) do { if (!((a) >= (b))) ::testing::record_failure(__FILE__, __LINE__, #a " >= " #b); } while(0)
#define EXPECT_DOUBLE_EQ(a, b) do { if (std::abs((a) - (b)) > 1e-6) ::testing::record_failure(__FILE__, __LINE__, #a " =~= " #b); } while(0)
#define EXPECT_NEAR(a, b, eps) do { if (std::abs((a) - (b)) > (eps)) ::testing::record_failure(__FILE__, __LINE__, #a " near " #b); } while(0)

#define ASSERT_TRUE(c) do { if (!(c)) { ::testing::record_failure(__FILE__, __LINE__, #c); return; } } while(0)
#define ASSERT_FALSE(c) do { if (c) { ::testing::record_failure(__FILE__, __LINE__, "!(" #c ")"); return; } } while(0)
#define ASSERT_EQ(a, b) do { if (!((a) == (b))) { ::testing::record_failure(__FILE__, __LINE__, #a " == " #b); return; } } while(0)
#define ASSERT_NE(a, b) do { if (!((a) != (b))) { ::testing::record_failure(__FILE__, __LINE__, #a " != " #b); return; } } while(0)
#define ASSERT_GE(a, b) do { if (!((a) >= (b))) { ::testing::record_failure(__FILE__, __LINE__, #a " >= " #b); return; } } while(0)
#define ASSERT_LE(a, b) do { if (!((a) <= (b))) { ::testing::record_failure(__FILE__, __LINE__, #a " <= " #b); return; } } while(0)
#define ASSERT_GT(a, b) do { if (!((a) > (b))) { ::testing::record_failure(__FILE__, __LINE__, #a " > " #b); return; } } while(0)
#define ASSERT_LT(a, b) do { if (!((a) < (b))) { ::testing::record_failure(__FILE__, __LINE__, #a " < " #b); return; } } while(0)
