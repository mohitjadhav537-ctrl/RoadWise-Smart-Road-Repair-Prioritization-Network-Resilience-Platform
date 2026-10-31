cmake_minimum_required(VERSION 3.15)
project(roadwise_engine VERSION 1.0.0 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Engine library
add_library(roadwise_lib STATIC
    src/roadwise_graph.cpp
)
target_include_directories(roadwise_lib PUBLIC include)

# CLI executable
add_executable(roadwise_engine src/main.cpp)
target_link_libraries(roadwise_engine roadwise_lib)

# Google Test
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

enable_testing()
add_executable(roadwise_tests tests/test_graph.cpp)
target_link_libraries(roadwise_tests roadwise_lib GTest::gtest_main)
include(GoogleTest)
gtest_discover_tests(roadwise_tests)
