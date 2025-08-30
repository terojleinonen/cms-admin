# Test Performance Report
Generated: 2025-08-29T20:27:27.537Z

## Summary
- **Total Tests**: 4
- **Total Duration**: 1.80s
- **Average Duration**: 450.00ms
- **Performance Status**: ❌ Failed

## Thresholds
| Test Type | Threshold | Status |
|-----------|-----------|--------|
| Unit Tests | 1000ms | ❌ 1 violations |
| Integration Tests | 5000ms | ➖ No tests |
| Component Tests | 3000ms | ➖ No tests |
| E2E Tests | 10000ms | ➖ No tests |

## Performance Violations
- ❌ Performance Suite::performance test exceeded unit test threshold: 1500ms > 1000ms

## Warnings
- ⚠️ Performance Suite::performance test high memory usage: 312.00MB
- ⚠️ Integration Test Suite::test 1 high memory usage: 274.80MB
- ⚠️ Integration Test Suite::test 2 high memory usage: 274.80MB
- ⚠️ Integration Test Suite::test 3 high memory usage: 274.80MB

## Slowest Tests
| Test | Suite | Duration | Type |
|------|-------|----------|------|
| performance test | Performance Suite | 1500ms | unit |
| test 2 | Integration Test Suite | 200ms | unit |
| test 1 | Integration Test Suite | 100ms | unit |
| test 3 | Integration Test Suite | 0ms | unit |

## Optimization Recommendations
- Optimize 1 slow unit tests - consider mocking external dependencies
- Slowest unit tests: performance test
- 4 tests using excessive memory - check for memory leaks
