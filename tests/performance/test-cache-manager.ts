/**
 * Test Cache Manager
 * Implements test result caching and incremental testing to speed up test execution
 */

import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export interface TestCacheEntry {
  testPath: string
  testName: string
  fileHash: string
  dependencyHashes: string[]
  result: 'passed' | 'failed' | 'skipped'
  duration: number
  timestamp: number
  coverage?: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
}

export interface CacheStats {
  totalTests: number
  cachedTests: number
  cacheHitRate: number
  timeSaved: number
  lastCleanup: number
}

export class TestCacheManager {
  private static instance: TestCacheManager
  private cache: Map<string, TestCacheEntry> = new Map()
  private readonly cacheFile = path.join(process.cwd(), 'tests/performance/test-cache.json')
  private readonly cacheStatsFile = path.join(process.cwd(), 'tests/performance/cache-stats.json')
  private readonly maxCacheAge = 7 * 24 * 60 * 60 * 1000 // 7 days
  private stats: CacheStats = {
    totalTests: 0,
    cachedTests: 0,
    cacheHitRate: 0,
    timeSaved: 0,
    lastCleanup: Date.now(),
  }

  private constructor() {
    this.loadCache()
  }

  static getInstance(): TestCacheManager {
    if (!TestCacheManager.instance) {
      TestCacheManager.instance = new TestCacheManager()
    }
    return TestCacheManager.instance
  }

  /**
   * Generate hash for a file
   */
  private async getFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return crypto.createHash('md5').update(content).digest('hex')
    } catch (error) {
      return ''
    }
  }

  /**
   * Get dependency hashes for a test file
   */
  private async getDependencyHashes(testPath: string): Promise<string[]> {
    const hashes: string[] = []
    
    try {
      // Get hash of the test file itself
      hashes.push(await this.getFileHash(testPath))
      
      // Get hashes of commonly imported files
      const commonDeps = [
        'jest.config.js',
        'package.json',
        'tsconfig.json',
        'tests/setup.ts',
        'tests/setup-node.ts',
        'tests/jest-setup.ts',
      ]
      
      for (const dep of commonDeps) {
        const depPath = path.join(process.cwd(), dep)
        hashes.push(await this.getFileHash(depPath))
      }
      
      // Get hashes of source files that might be tested
      const sourceDir = path.join(process.cwd(), 'app')
      if (testPath.includes('components')) {
        const componentPath = testPath.replace('/tests/', '/app/').replace('/__tests__/', '/app/').replace('.test.', '.')
        hashes.push(await this.getFileHash(componentPath))
      }
      
    } catch (error) {
      // Ignore errors, return what we have
    }
    
    return hashes
  }

  /**
   * Generate cache key for a test
   */
  private getCacheKey(testPath: string, testName: string): string {
    return crypto.createHash('md5').update(`${testPath}:${testName}`).digest('hex')
  }

  /**
   * Check if test result is cached and valid
   */
  async isCached(testPath: string, testName: string): Promise<boolean> {
    const key = this.getCacheKey(testPath, testName)
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }
    
    // Check if cache is too old
    if (Date.now() - entry.timestamp > this.maxCacheAge) {
      this.cache.delete(key)
      return false
    }
    
    // Check if dependencies have changed
    const currentHashes = await this.getDependencyHashes(testPath)
    const hashesMatch = entry.dependencyHashes.length === currentHashes.length &&
      entry.dependencyHashes.every((hash, index) => hash === currentHashes[index])
    
    if (!hashesMatch) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Get cached test result
   */
  getCachedResult(testPath: string, testName: string): TestCacheEntry | null {
    const key = this.getCacheKey(testPath, testName)
    return this.cache.get(key) || null
  }

  /**
   * Cache test result
   */
  async cacheResult(entry: Omit<TestCacheEntry, 'dependencyHashes' | 'timestamp'>): Promise<void> {
    const key = this.getCacheKey(entry.testPath, entry.testName)
    const dependencyHashes = await this.getDependencyHashes(entry.testPath)
    
    const cacheEntry: TestCacheEntry = {
      ...entry,
      dependencyHashes,
      timestamp: Date.now(),
    }
    
    this.cache.set(key, cacheEntry)
    this.updateStats(false) // Not a cache hit, but a new cache entry
  }

  /**
   * Update cache statistics
   */
  private updateStats(cacheHit: boolean, timeSaved = 0): void {
    this.stats.totalTests++
    if (cacheHit) {
      this.stats.cachedTests++
      this.stats.timeSaved += timeSaved
    }
    this.stats.cacheHitRate = (this.stats.cachedTests / this.stats.totalTests) * 100
  }

  /**
   * Record cache hit
   */
  recordCacheHit(timeSaved: number): void {
    this.updateStats(true, timeSaved)
  }

  /**
   * Get tests that should be skipped based on cache
   */
  async getSkippableTests(testPaths: string[]): Promise<string[]> {
    const skippable: string[] = []
    
    for (const testPath of testPaths) {
      // For now, we'll implement a simple file-level caching
      // In a more advanced implementation, we could parse test files to get individual test names
      const testName = path.basename(testPath, '.test.ts')
      
      if (await this.isCached(testPath, testName)) {
        const cached = this.getCachedResult(testPath, testName)
        if (cached && cached.result === 'passed') {
          skippable.push(testPath)
        }
      }
    }
    
    return skippable
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Clean up old cache entries
   */
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.maxCacheAge) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    this.stats.lastCleanup = now
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old cache entries`)
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear()
    this.stats = {
      totalTests: 0,
      cachedTests: 0,
      cacheHitRate: 0,
      timeSaved: 0,
      lastCleanup: Date.now(),
    }
  }

  /**
   * Save cache to disk
   */
  async saveCache(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.cacheFile), { recursive: true })
      
      const cacheData = Array.from(this.cache.entries())
      await Promise.all([
        fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2)),
        fs.writeFile(this.cacheStatsFile, JSON.stringify(this.stats, null, 2)),
      ])
    } catch (error) {
      console.warn('Failed to save test cache:', error)
    }
  }

  /**
   * Load cache from disk
   */
  private async loadCache(): Promise<void> {
    try {
      const [cacheData, statsData] = await Promise.all([
        fs.readFile(this.cacheFile, 'utf-8').catch(() => '[]'),
        fs.readFile(this.cacheStatsFile, 'utf-8').catch(() => '{}'),
      ])

      const cacheEntries = JSON.parse(cacheData)
      this.cache = new Map(cacheEntries)
      
      const loadedStats = JSON.parse(statsData)
      this.stats = { ...this.stats, ...loadedStats }
      
      // Clean up old entries on load
      this.cleanup()
    } catch (error) {
      // Ignore errors, start with empty cache
    }
  }

  /**
   * Generate incremental test command
   */
  async generateIncrementalCommand(allTestPaths: string[]): Promise<{
    command: string[]
    skippedTests: string[]
    estimatedTimeSaving: number
  }> {
    const skippableTests = await this.getSkippableTests(allTestPaths)
    const testsToRun = allTestPaths.filter(path => !skippableTests.includes(path))
    
    // Estimate time saving based on cached test durations
    let estimatedTimeSaving = 0
    for (const skippedPath of skippableTests) {
      const testName = path.basename(skippedPath, '.test.ts')
      const cached = this.getCachedResult(skippedPath, testName)
      if (cached) {
        estimatedTimeSaving += cached.duration
      }
    }
    
    const command = testsToRun.length > 0 ? testsToRun : ['--passWithNoTests']
    
    return {
      command,
      skippedTests: skippableTests,
      estimatedTimeSaving,
    }
  }
}

// Global cache manager instance
export const testCacheManager = TestCacheManager.getInstance()