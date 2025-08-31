#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

function formatBytes(bytes) {
  return Math.round(bytes / 1024 / 1024) + 'MB';
}

function getMemoryUsage() {
  const used = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  
  return {
    heap: formatBytes(used.heapUsed),
    heapTotal: formatBytes(used.heapTotal),
    external: formatBytes(used.external),
    systemFree: formatBytes(free),
    systemTotal: formatBytes(total),
    systemUsed: formatBytes(total - free),
  };
}

function runMemoryOptimizedTests() {
  console.log('🧠 Starting Memory-Optimized Test Runner...\n');
  
  const initialMemory = getMemoryUsage();
  console.log('Initial Memory Usage:');
  console.log(`  Heap: ${initialMemory.heap} / ${initialMemory.heapTotal}`);
  console.log(`  System: ${initialMemory.systemUsed} / ${initialMemory.systemTotal}\n`);
  
  const jestArgs = [
    '--config', 'jest.config.memory-optimized.js',
    '--passWithNoTests',
    '--detectOpenHandles',
    '--forceExit',
    '--logHeapUsage',
    '--runInBand',
    '--maxWorkers=1',
    '--no-coverage',
    '--silent',
  ];
  
  console.log(`Command: npx jest ${jestArgs.join(' ')}\n`);
  
  const jest = spawn('npx', ['jest', ...jestArgs], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=2048', // Limit Node.js heap
    },
  });
  
  // Monitor memory usage during test execution
  const memoryInterval = setInterval(() => {
    const currentMemory = getMemoryUsage();
    console.log(`\n📊 Memory: Heap ${currentMemory.heap}, System ${currentMemory.systemUsed}`);
  }, 10000); // Every 10 seconds
  
  jest.on('close', (code) => {
    clearInterval(memoryInterval);
    
    const finalMemory = getMemoryUsage();
    console.log('\n📈 Final Memory Usage:');
    console.log(`  Heap: ${finalMemory.heap} / ${finalMemory.heapTotal}`);
    console.log(`  System: ${finalMemory.systemUsed} / ${finalMemory.systemTotal}`);
    
    if (code === 0) {
      console.log('\n✅ Memory-optimized tests completed successfully');
    } else {
      console.log(`\n❌ Tests failed with exit code ${code}`);
    }
    
    process.exit(code);
  });
  
  jest.on('error', (error) => {
    clearInterval(memoryInterval);
    console.error(`\n💥 Failed to start Jest: ${error.message}`);
    process.exit(1);
  });
}

// Handle process cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(1);
});

runMemoryOptimizedTests();