# Permission System Performance Tests

This directory contains comprehensive performance and load testing for the production-ready RBAC system.

## Test Structure

### Core Performance Tests

1. **permission-system-performance.test.ts**
   - Basic permission check performance
   - Cache performance validation
   - Memory usage testing
   - Role hierarchy performance
   - Route permission performance
   - Array filtering performance

2. **cache-performance.test.ts**
   - Cache hit rate optimization
   - Memory efficiency testing
   - Cache invalidation performance
   - TTL handling performance
   - Concurrent cache operations
   - Cache efficiency metrics

3. **concurrent-user-performance.test.ts**
   - Multi-user concurrent access
   - Mixed permission operations
   - Cache contention handling
   - Error handling under concurrency
   - Resource contention testing

4. **load-testing.test.ts**
   - Sustained load testing
   - Traffic spike handling
   - Memory efficiency under load
   - Performance degradation monitoring
   - Recovery testing

### Utilities

- **performance-test-runner.ts**: Automated test runner with reporting
- **performance-monitor.ts**: Real-time performance monitoring utilities

## Running Performance Tests

### Individual Test Files
```bash
# Run specific performance test
npm run test:performance -- permission-system-performance

# Run with verbose output
npm run test:performance -- --verbose cache-performance

# Run all performance tests
npm run test:performance
```

### Using the Test Runner
```bash
# Run all performance tests with comprehensive reporting
npx tsx __tests__/performance/performance-test-runner.ts
```

## Performance Thresholds

The tests validate against these performance thresholds:

### Response Time Thresholds
- Single permission check: < 1ms
- Batch permission checks: < 0.5ms average
- Cache hits: < 0.1ms
- Route permission checks: < 2ms
- Array filtering: < 0.1ms per item

### Throughput Thresholds
- Basic operations: > 1000 ops/sec
- Cached operations: > 5000 ops/sec
- Concurrent operations: > 500 ops/sec
- Load testing: > 100 RPS sustained

### Memory Thresholds
- Memory growth: < 10MB per 1000 operations
- Cache size: < 5000 entries
- Memory leaks: < 50MB increase over test duration

### Error Rate Thresholds
- Normal operations: < 1%
- High load: < 5%
- Concurrent operations: < 2%

## Test Scenarios

### Load Testing Scenarios

1. **Moderate Load (100 RPS)**
   - Simulates normal application usage
   - Tests sustained performance
   - Validates cache effectiveness

2. **High Load (500+ RPS)**
   - Tests system limits
   - Validates performance under stress
   - Checks error handling

3. **Spike Testing**
   - Sudden traffic increases
   - Recovery testing
   - Resource exhaustion handling

4. **Sustained Load**
   - Long-running performance validation
   - Memory leak detection
   - Performance degradation monitoring

### Concurrency Testing Scenarios

1. **Multi-User Access**
   - Different users accessing simultaneously
   - Mixed permission types
   - Cache contention

2. **Mixed Operations**
   - Read/write operation mixing
   - Cache invalidation during reads
   - Error handling in concurrent context

3. **Resource Contention**
   - Multiple users accessing same resources
   - Cache thrashing scenarios
   - Lock contention testing

## Monitoring and Reporting

### Real-time Monitoring
The performance monitor provides:
- Operations per second
- Average response time
- Error rates
- Memory usage
- Cache hit rates

### Performance Reports
Generated reports include:
- Test execution summary
- Performance metrics
- Threshold compliance
- Trend analysis
- Recommendations

### Metrics Collection
- Response time percentiles (P50, P95, P99)
- Throughput measurements
- Error rate tracking
- Memory usage patterns
- Cache efficiency metrics

## Integration with CI/CD

### Performance Regression Detection
```bash
# Run performance tests in CI
npm run test:performance:ci

# Compare with baseline
npm run test:performance:compare
```

### Automated Alerts
Performance tests can trigger alerts when:
- Response times exceed thresholds
- Throughput drops below minimum
- Error rates increase significantly
- Memory usage grows unexpectedly

## Best Practices

### Test Design
1. Use realistic data volumes
2. Test with representative user distributions
3. Include error scenarios
4. Validate cleanup and resource management

### Performance Optimization
1. Monitor cache hit rates
2. Optimize database queries
3. Implement proper connection pooling
4. Use appropriate caching strategies

### Monitoring in Production
1. Set up performance monitoring
2. Define alerting thresholds
3. Regular performance reviews
4. Capacity planning based on test results

## Troubleshooting

### Common Issues

1. **High Response Times**
   - Check cache configuration
   - Validate database performance
   - Review query optimization

2. **Low Throughput**
   - Increase cache TTL
   - Optimize permission logic
   - Check resource contention

3. **Memory Leaks**
   - Review cache cleanup
   - Check event listener cleanup
   - Validate object references

4. **High Error Rates**
   - Check timeout configurations
   - Validate error handling
   - Review resource limits

### Performance Tuning

1. **Cache Optimization**
   - Adjust TTL values
   - Implement cache warming
   - Monitor hit rates

2. **Database Optimization**
   - Add appropriate indexes
   - Optimize queries
   - Use connection pooling

3. **Application Optimization**
   - Minimize permission checks
   - Batch operations where possible
   - Implement efficient algorithms

## Environment Configuration

### Test Environment Variables
```bash
# Performance test configuration
PERFORMANCE_TEST_DURATION=10000
PERFORMANCE_TEST_TARGET_RPS=200
PERFORMANCE_TEST_WARMUP_TIME=2000

# Cache configuration for testing
PERMISSION_CACHE_TTL=300000
REDIS_URL=redis://localhost:6379

# Monitoring configuration
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_REPORT_INTERVAL=5000
```

### Hardware Requirements
- Minimum 4GB RAM
- Multi-core CPU recommended
- SSD storage for better I/O performance
- Network bandwidth for distributed testing

## Future Enhancements

1. **Distributed Load Testing**
   - Multi-node test execution
   - Geographic distribution simulation
   - Network latency testing

2. **Advanced Monitoring**
   - Real-time dashboards
   - Predictive analytics
   - Automated optimization

3. **Chaos Engineering**
   - Failure injection testing
   - Recovery time measurement
   - Resilience validation

4. **Machine Learning**
   - Performance prediction
   - Anomaly detection
   - Optimization recommendations