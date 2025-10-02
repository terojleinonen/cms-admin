// Simulate the login flow to identify where undefined URLs occur
import dotenv from 'dotenv'
dotenv.config()

console.log('=== LOGIN FLOW SIMULATION ===')

// Step 1: Check environment variables (as they would be in Next.js)
console.log('1. Environment Variables:')
console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('   AUTH_SECRET:', process.env.AUTH_SECRET ? 'SET' : 'UNDEFINED')

// Step 2: Simulate NextAuth URL construction
console.log('\n2. NextAuth URL Construction:')
const baseUrl = process.env.NEXTAUTH_URL

if (!baseUrl) {
  console.error('   ❌ NEXTAUTH_URL is not set!')
} else if (baseUrl === 'undefined') {
  console.error('   ❌ NEXTAUTH_URL is literally "undefined"!')
} else {
  console.log('   ✅ NEXTAUTH_URL is valid:', baseUrl)
  
  // Test various NextAuth endpoints
  const endpoints = [
    '/api/auth/signin',
    '/api/auth/callback/credentials',
    '/api/auth/session',
    '/api/auth/csrf'
  ]
  
  endpoints.forEach(endpoint => {
    try {
      const url = new URL(endpoint, baseUrl)
      console.log(`   ✅ ${endpoint}: ${url.toString()}`)
    } catch (error) {
      console.error(`   ❌ ${endpoint}: ${error.message}`)
    }
  })
}

// Step 3: Simulate login form submission
console.log('\n3. Login Form Submission Simulation:')
const loginData = {
  email: 'admin@example.com',
  password: 'password123'
}

console.log('   Login data:', loginData)

// Step 4: Simulate what happens when signIn is called
console.log('\n4. SignIn Function Simulation:')
console.log('   Provider: credentials')
console.log('   Redirect: false')
console.log('   Expected callback URL construction...')

if (baseUrl) {
  try {
    // This is what NextAuth might do internally
    const signinUrl = new URL('/api/auth/signin/credentials', baseUrl)
    console.log('   ✅ SignIn URL:', signinUrl.toString())
    
    const callbackUrl = new URL('/api/auth/callback/credentials', baseUrl)
    console.log('   ✅ Callback URL:', callbackUrl.toString())
    
  } catch (error) {
    console.error('   ❌ URL construction failed:', error.message)
  }
}

// Step 5: Check for potential issues
console.log('\n5. Potential Issues Check:')

// Check if any variables might be getting overwritten
const potentialIssues = []

if (typeof process.env.NEXTAUTH_URL !== 'string') {
  potentialIssues.push('NEXTAUTH_URL is not a string')
}

if (process.env.NEXTAUTH_URL === 'undefined') {
  potentialIssues.push('NEXTAUTH_URL is literally "undefined"')
}

if (!process.env.NEXTAUTH_URL) {
  potentialIssues.push('NEXTAUTH_URL is falsy')
}

if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('http')) {
  potentialIssues.push('NEXTAUTH_URL does not start with http')
}

if (potentialIssues.length > 0) {
  console.log('   ❌ Issues found:')
  potentialIssues.forEach(issue => console.log(`      - ${issue}`))
} else {
  console.log('   ✅ No obvious issues detected')
}

// Step 6: Test URL parsing edge cases
console.log('\n6. URL Parsing Edge Cases:')

const testCases = [
  { name: 'Valid URL', base: 'http://localhost:3001', path: '/test' },
  { name: 'Undefined base', base: undefined, path: '/test' },
  { name: 'String "undefined" base', base: 'undefined', path: '/test' },
  { name: 'Empty string base', base: '', path: '/test' },
  { name: 'Null base', base: null, path: '/test' }
]

testCases.forEach(({ name, base, path }) => {
  try {
    const url = new URL(path, base)
    console.log(`   ✅ ${name}: ${url.toString()}`)
  } catch (error) {
    console.log(`   ❌ ${name}: ${error.message}`)
    if (error.message.includes('cannot be parsed as a URL')) {
      console.log(`      🚨 This matches our error pattern!`)
    }
  }
})

console.log('\n=== SIMULATION COMPLETE ===')