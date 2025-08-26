# Test Performance Optimization System

This directory contains a comprehensive test performance optimization system that provides monitoring, caching, flakiness detection, and reporting capabilities for the CMS test suite.

## Features

### 🚀 Performance Monitoring
- Real-time test execution timing
- Memory usage tracking
- Performance benchmarking
- Slow test identification
- Historical performance data

### 📦 Test Result Caching
- Intelligent test result caching
- Incremental testing (skip unchanged tests)
- Dependency-based cache invalidation
- Significant time savings on repeated runs

### ⚠️ Flakiness Detection
- Automatic flaky test identification
- Failure pattern analysis
- Risk scoring and categorization
- Actionable recommendations for fixes

### 📊 Comprehensive Reporting
- HTML and JSON reports
- Performance trends over time
- Coverage integration
- Optimization recommendations

### ⚡ Parallel Processing Optimization
- Intelligent worker allocation
- Memory-optimized execution
- Test batching and scheduling

## Quick Start

### Run Optimized Tests
```bash
# Run all tests with optimization
npm run test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:components

# Fast mode (no coverage)
npm run test:fast

# Benchmark mode
npm run test:benchmark
```

### Performance Analysis
```bash
# Show current performance stats
npm run test:stats

# Analyze and generate optimization recommendations
npm run test:perf:analyze

# Run performance benchmark
npm run test:perf:benchmark

# Check for flaky tests
npm run test:perf:flaky

# View performance trends
npm run test:perf:trends
```

### Cache Management
```bash
# Clear test cache
npm run test:clear-cache

# View cache statistics
node scripts/test-performance-cli.js cache stats
```

## System Components

### 1. Performance Monitor (`test-performance-monitor.ts`)
Tracks test execution metrics including:
- Test duration and memory usage
- Performance benchmarks and trends
- Slow test identification
- Statistical analysis

### 2. Cache Manager (`test-cache-manager.ts`)
Implements intelligent test caching:
- File-based dependency tracking
- Incremental test execution
- Cache hit rate optimization
- Time savings calculation

### 3. Flakiness Detector (`flakiness-detector.ts`)
Identifies and analyzes flaky tests:
- Failure pattern recognition
- Risk scoring algorithms
- Trend analysis
- Fix recommendations

### 4. Test Reporter (`test-reporter.ts`)
Generates comprehensive reports:
- HTML and JSON formats
- Performance visualizations
- Trend analysis
- Actionable insights

### 5. Test Optimizer (`test-optimizer.ts`)
Analyzes and recommends optimizations:
- Performance bottleneck identification
- Parallelization opportunities
- Memory usage optimization
- Cache strategy improvements

## Configuration

The system is configured via `tests/performance/config.json`:

```json
{
  "performance": {
    "slowTestThreshold": 5000,
    "memoryThreshold": 52428800,
    "cacheMaxAge": 604800000
  },
  "flakiness": {
    "highRiskThreshold": 70,
    "mediumRiskThreshold": 30
  },
  "cache": {
    "enabled": true,
    "maxAge": 604800000,
    "maxEntries": 1000
  }
}
```

## Integration

### Jest Integration
The system integrates with Jest through:
- `jest-performance-setup.ts` - Automatic performance monitoring
- Enhanced Jest configuration with optimization settings
- Custom test runner with parallel processing

### CI/CD Integration
- Automated performance reporting
- Cache persistence across builds
- Performance regression detection
- Flakiness monitoring

## Reports and Data

### Generated Files
- `tests/performance/reports/latest.html` - Latest HTML report
- `tests/performance/reports/latest.json` - Latest JSON report
- `tests/performance/metrics.json` - Raw performance metrics
- `tests/performance/test-cache.json` - Test result cache
- `tests/performance/flaky-tests.json` - Flaky test data
- `tests/performance/trends.json` - Historical trend data

### Report Contents
- Test execution summary
- Performance metrics and trends
- Coverage analysis
- Flaky test identification
- Optimization recommendations
- Memory usage analysis

## Performance Optimizations

### Automatic Optimizations
1. **Parallel Execution**: Optimized worker allocation based on CPU cores
2. **Memory Management**: Intelligent memory limits and cleanup
3. **Test Caching**: Skip unchanged tests with dependency tracking
4. **Smart Batching**: Group related tests for efficient execution

### Manual Optimizations
1. **Slow Test Analysis**: Identify and optimize slow-running tests
2. **Flaky Test Fixes**: Address unreliable tests based on pattern analysis
3. **Memory Optimization**: Reduce memory usage in memory-intensive tests
4. **Cache Strategy**: Improve cache hit rates through better dependency tracking

## Best Practices

### Writing Performance-Friendly Tests
1. **Keep tests focused and small**
2. **Use proper setup/teardown for resource cleanup**
3. **Mock external dependencies**
4. **Avoid shared state between tests**
5. **Use database transactions for isolation**

### Monitoring Performance
1. **Run performance analysis regularly**
2. **Monitor trends over time**
3. **Address flaky tests promptly**
4. **Optimize slow tests based on recommendations**

### Cache Optimization
1. **Keep test dependencies minimal**
2. **Use stable test data**
3. **Avoid time-dependent test logic**
4. **Clean up properly in test hooks**

## Troubleshooting

### Common Issues

#### Low Cache Hit Rate
- Check dependency tracking accuracy
- Verify test stability and determinism
- Review cache invalidation logic

#### High Memory Usage
- Analyze memory-intensive tests
- Improve cleanup in test hooks
- Consider test data size reduction

#### Flaky Tests
- Review failure patterns in reports
- Implement recommended fixes
- Add proper wait conditions
- Improve test isolation

#### Slow Performance
- Identify bottlenecks using performance reports
- Optimize database operations
- Increase parallelization where safe
- Mock heavy dependencies

### Debug Commands
```bash
# Verbose test output
npm run test:verbose

# Performance benchmark with detailed output
npm run test:perf:benchmark -- --iterations 5

# Analyze specific flaky tests
npm run test:perf:flaky -- --threshold 50

# Clear all performance data and start fresh
npm run test:clear-cache
rm -rf tests/performance/reports/
rm -f tests/performance/*.json
```

## Contributing

When adding new performance features:
1. Follow the existing patterns and interfaces
2. Add comprehensive error handling
3. Include configuration options
4. Update documentation
5. Add tests for new functionality

## Performance Targets

### Current Targets
- **Unit Tests**: < 30 seconds total
- **Integration Tests**: < 2 minutes total
- **Component Tests**: < 1 minute total
- **Cache Hit Rate**: > 50%
- **Flaky Test Rate**: < 5%

### Optimization Goals
- **Total Test Time**: < 5 minutes for full suite
- **Cache Hit Rate**: > 70%
- **Memory Usage**: < 2GB peak
- **Parallel Efficiency**: > 75% CPU utilization

## Monitoring and Alerts

The system provides monitoring capabilities for:
- Performance regression detection
- Flaky test trend analysis
- Cache efficiency monitoring
- Memory usage tracking

Set up alerts based on:
- Test execution time increases > 20%
- Cache hit rate drops < 30%
- Flaky test count increases > 10%
- Memory usage exceeds 3GB