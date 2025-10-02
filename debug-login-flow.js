// Debug script to trace the login flow
import dotenv from 'dotenv'
dotenv.config()

console.log('=== ENVIRONMENT CHECK ===')
console.log('AUTH_SECRET:', process.env.AUTH_SECRET ? 'SET' : 'UNDEFINED')
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'UNDEFINED')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'UNDEFINED')

console.log('\n=== URL CONSTRUCTION TESTS ===')

// Test 1: Direct URL construction with environment variable
try {
  const url1 = new URL('/api/auth/signin', process.env.NEXTAUTH_URL)
  console.log('✓ URL with env var:', url1.toString())
} catch (error) {
  console.error('✗ URL with env var:', error.message)
}

// Test 2: URL construction with undefined
try {
  const url2 = new URL('/api/auth/signin', undefined)
  console.log('✓ URL with undefined:', url2.toString())
} catch (error) {
  console.error('✗ URL with undefined:', error.message)
}

// Test 3: URL construction with string "undefined"
try {
  const url3 = new URL('/api/auth/signin', 'undefined')
  console.log('✓ URL with "undefined":', url3.toString())
} catch (error) {
  console.error('✗ URL with "undefined":', error.message)
}

console.log('\n=== NEXTAUTH CALLBACK URL SIMULATION ===')

// Simulate what NextAuth might be doing internally
const baseUrl = process.env.NEXTAUTH_URL
console.log('Base URL from env:', baseUrl)

if (baseUrl) {
  try {
    const callbackUrl = new URL('/api/auth/callback/credentials', baseUrl)
    console.log('✓ Callback URL:', callbackUrl.toString())
  } catch (error) {
    console.error('✗ Callback URL construction failed:', error.message)
  }
}

console.log('\n=== CHECKING FOR UNDEFINED VALUES ===')

// Check if any environment variables are literally the string "undefined"
const envVars = ['AUTH_SECRET', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'DATABASE_URL']
envVars.forEach(varName => {
  const value = process.env[varName]
  console.log(`${varName}:`, {
    exists: value !== undefined,
    isString: typeof value === 'string',
    isUndefinedString: value === 'undefined',
    length: value ? value.length : 0,
    value: value || 'NOT SET'
  })
})