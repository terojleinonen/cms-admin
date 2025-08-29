// Setup Node.js test environment for API and integration tests

// Mock Next.js server components
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock Request and Response for Next.js API routes
import { Request, Response } from 'node-fetch';
global.Request = Request as any;
global.Response = Response as any;

// Mock NextRequest and NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => {
    return new Request(url, init);
  }),
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init?.headers,
        },
      });
    }),
    redirect: jest.fn().mockImplementation((url, status = 302) => {
      return new Response(null, {
        status,
        headers: { location: url },
      });
    }),
  },
}));

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  },
}));

// Setup environment variables for tests
const originalEnv = process.env;

beforeEach(() => {
  // Reset environment variables
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NEXTAUTH_SECRET: 'test-secret',
    NEXTAUTH_URL: 'http://localhost:3000',
  };
});

afterEach(() => {
  // Restore original environment
  process.env = originalEnv;
  jest.clearAllMocks();
});