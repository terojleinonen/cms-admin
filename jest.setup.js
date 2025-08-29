import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Enhanced polyfills for Next.js 15 Web APIs
import { TextEncoder, TextDecoder } from 'util';

// Set up global polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Enhanced Request polyfill - avoid conflicts with NextRequest
if (!global.Request) {
  global.Request = class Request {
    constructor(input, init = {}) {
      // Use Object.defineProperty to avoid conflicts with NextRequest
      Object.defineProperty(this, 'url', {
        value: typeof input === 'string' ? input : input.url,
        writable: false,
        configurable: true
      });
      
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
      this.body = init.body;
      this.cache = init.cache || 'default';
      this.credentials = init.credentials || 'same-origin';
      this.destination = init.destination || '';
      this.integrity = init.integrity || '';
      this.keepalive = init.keepalive || false;
      this.mode = init.mode || 'cors';
      this.redirect = init.redirect || 'follow';
      this.referrer = init.referrer || 'about:client';
      this.referrerPolicy = init.referrerPolicy || '';
      this.signal = init.signal || null;
    }
    
    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body,
        cache: this.cache,
        credentials: this.credentials,
        destination: this.destination,
        integrity: this.integrity,
        keepalive: this.keepalive,
        mode: this.mode,
        redirect: this.redirect,
        referrer: this.referrer,
        referrerPolicy: this.referrerPolicy,
        signal: this.signal,
      });
    }
    
    async json() {
      return JSON.parse(this.body || '{}');
    }
    
    async text() {
      return this.body || '';
    }
    
    async formData() {
      return new FormData();
    }
    
    async arrayBuffer() {
      return new ArrayBuffer(0);
    }
  };
}

// Enhanced Response polyfill
global.Response = global.Response || class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Headers(init.headers);
    this.ok = this.status >= 200 && this.status < 300;
    this.redirected = init.redirected || false;
    this.type = init.type || 'default';
    this.url = init.url || '';
  }
  
  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body || {};
  }
  
  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body || '');
  }
  
  async formData() {
    return new FormData();
  }
  
  async arrayBuffer() {
    return new ArrayBuffer(0);
  }
  
  clone() {
    return new Response(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      redirected: this.redirected,
      type: this.type,
      url: this.url,
    });
  }
  
  static json(data, init = {}) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  }
  
  static redirect(url, status = 302) {
    return new Response(null, {
      status,
      headers: { Location: url },
    });
  }
};

// Enhanced Headers polyfill
global.Headers = global.Headers || class Headers {
  constructor(init = {}) {
    this._headers = new Map();
    if (init) {
      if (init instanceof Headers) {
        for (const [key, value] of init.entries()) {
          this.set(key, value);
        }
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value));
      } else {
        Object.entries(init).forEach(([key, value]) => {
          this.set(key, value);
        });
      }
    }
  }
  
  set(name, value) {
    this._headers.set(name.toLowerCase(), String(value));
  }
  
  get(name) {
    return this._headers.get(name.toLowerCase()) || null;
  }
  
  has(name) {
    return this._headers.has(name.toLowerCase());
  }
  
  delete(name) {
    this._headers.delete(name.toLowerCase());
  }
  
  append(name, value) {
    const existing = this.get(name);
    if (existing) {
      this.set(name, `${existing}, ${value}`);
    } else {
      this.set(name, value);
    }
  }
  
  entries() {
    return this._headers.entries();
  }
  
  keys() {
    return this._headers.keys();
  }
  
  values() {
    return this._headers.values();
  }
  
  forEach(callback, thisArg) {
    this._headers.forEach((value, key) => {
      callback.call(thisArg, value, key, this);
    });
  }
  
  [Symbol.iterator]() {
    return this.entries();
  }
};

// FormData polyfill
global.FormData = global.FormData || class FormData {
  constructor() {
    this._data = new Map();
  }
  
  append(name, value, filename) {
    if (!this._data.has(name)) {
      this._data.set(name, []);
    }
    this._data.get(name).push({ value, filename });
  }
  
  delete(name) {
    this._data.delete(name);
  }
  
  get(name) {
    const values = this._data.get(name);
    return values ? values[0].value : null;
  }
  
  getAll(name) {
    const values = this._data.get(name);
    return values ? values.map(v => v.value) : [];
  }
  
  has(name) {
    return this._data.has(name);
  }
  
  set(name, value, filename) {
    this._data.set(name, [{ value, filename }]);
  }
  
  entries() {
    const entries = [];
    for (const [name, values] of this._data) {
      for (const { value } of values) {
        entries.push([name, value]);
      }
    }
    return entries[Symbol.iterator]();
  }
  
  keys() {
    return this._data.keys();
  }
  
  values() {
    const values = [];
    for (const [, valueList] of this._data) {
      for (const { value } of valueList) {
        values.push(value);
      }
    }
    return values[Symbol.iterator]();
  }
  
  forEach(callback, thisArg) {
    for (const [name, value] of this.entries()) {
      callback.call(thisArg, value, name, this);
    }
  }
};

// URL and URLSearchParams polyfills
global.URL = global.URL || class URL {
  constructor(url, base) {
    if (base) {
      this.href = new URL(base).href + '/' + url;
    } else {
      this.href = url;
    }
    
    const parts = this.href.split('://');
    this.protocol = parts[0] + ':';
    
    const remaining = parts[1] || '';
    const pathStart = remaining.indexOf('/');
    const queryStart = remaining.indexOf('?');
    const hashStart = remaining.indexOf('#');
    
    if (pathStart !== -1) {
      this.host = remaining.substring(0, pathStart);
      this.pathname = remaining.substring(pathStart, queryStart !== -1 ? queryStart : hashStart !== -1 ? hashStart : undefined);
    } else {
      this.host = remaining;
      this.pathname = '/';
    }
    
    this.hostname = this.host.split(':')[0];
    this.port = this.host.split(':')[1] || '';
    
    if (queryStart !== -1) {
      this.search = remaining.substring(queryStart, hashStart !== -1 ? hashStart : undefined);
      this.searchParams = new URLSearchParams(this.search);
    } else {
      this.search = '';
      this.searchParams = new URLSearchParams();
    }
    
    if (hashStart !== -1) {
      this.hash = remaining.substring(hashStart);
    } else {
      this.hash = '';
    }
    
    this.origin = `${this.protocol}//${this.host}`;
  }
};

global.URLSearchParams = global.URLSearchParams || class URLSearchParams {
  constructor(init = '') {
    this._params = new Map();
    
    if (typeof init === 'string') {
      const search = init.startsWith('?') ? init.slice(1) : init;
      if (search) {
        search.split('&').forEach(pair => {
          const [key, value = ''] = pair.split('=');
          this.append(decodeURIComponent(key), decodeURIComponent(value));
        });
      }
    }
  }
  
  append(name, value) {
    if (!this._params.has(name)) {
      this._params.set(name, []);
    }
    this._params.get(name).push(String(value));
  }
  
  delete(name) {
    this._params.delete(name);
  }
  
  get(name) {
    const values = this._params.get(name);
    return values ? values[0] : null;
  }
  
  getAll(name) {
    return this._params.get(name) || [];
  }
  
  has(name) {
    return this._params.has(name);
  }
  
  set(name, value) {
    this._params.set(name, [String(value)]);
  }
  
  entries() {
    const entries = [];
    for (const [name, values] of this._params) {
      for (const value of values) {
        entries.push([name, value]);
      }
    }
    return entries[Symbol.iterator]();
  }
  
  keys() {
    return Array.from(this._params.keys())[Symbol.iterator]();
  }
  
  values() {
    const values = [];
    for (const valueList of this._params.values()) {
      values.push(...valueList);
    }
    return values[Symbol.iterator]();
  }
  
  forEach(callback, thisArg) {
    for (const [name, value] of this.entries()) {
      callback.call(thisArg, value, name, this);
    }
  }
  
  toString() {
    const pairs = [];
    for (const [name, value] of this.entries()) {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
    }
    return pairs.join('&');
  }
};

// Fetch polyfill
global.fetch = global.fetch || jest.fn().mockResolvedValue(
  new Response(JSON.stringify({}), { status: 200 })
);

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.location methods - simplified approach
global.mockLocationReload = jest.fn();
global.mockLocationReplace = jest.fn();
global.mockLocationAssign = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/test-path',
}));

// Enhanced NextAuth mocking
const mockUseSession = jest.fn(() => ({
  data: {
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
    },
  },
  status: 'authenticated',
}));

jest.mock('next-auth/react', () => ({
  useSession: mockUseSession,
  SessionProvider: ({ children }) => children,
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// Make mockUseSession available globally for tests
global.mockUseSession = mockUseSession;

// Create comprehensive Prisma mock
const createMockPrismaModel = () => ({
  findMany: jest.fn().mockResolvedValue([]),
  findUnique: jest.fn().mockResolvedValue(null),
  findFirst: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mock-id', ...data })),
  update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mock-id', ...data })),
  upsert: jest.fn().mockImplementation(({ create, update }) => Promise.resolve({ id: 'mock-id', ...create, ...update })),
  delete: jest.fn().mockResolvedValue({ id: 'mock-id' }),
  deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  count: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue({}),
  groupBy: jest.fn().mockResolvedValue([]),
});

// Mock Prisma Client
const mockPrisma = {
  // Core models
  user: createMockPrismaModel(),
  product: createMockPrismaModel(),
  category: createMockPrismaModel(),
  media: createMockPrismaModel(),
  order: createMockPrismaModel(),
  orderItem: createMockPrismaModel(),
  
  // Additional models that might exist
  userPreferences: createMockPrismaModel(),
  auditLog: createMockPrismaModel(),
  backup: createMockPrismaModel(),
  session: createMockPrismaModel(),
  account: createMockPrismaModel(),
  verificationToken: createMockPrismaModel(),
  
  // Prisma client methods
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn().mockImplementation((callback) => {
    if (typeof callback === 'function') {
      return callback(mockPrisma);
    }
    return Promise.resolve([]);
  }),
  $executeRaw: jest.fn().mockResolvedValue(0),
  $queryRaw: jest.fn().mockResolvedValue([]),
  $executeRawUnsafe: jest.fn().mockResolvedValue(0),
  $queryRawUnsafe: jest.fn().mockResolvedValue([]),
};

// Mock the database module
jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

// Also mock direct Prisma client imports
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
  
  // Mock Prisma enums
  UserRole: {
    ADMIN: 'ADMIN',
    EDITOR: 'EDITOR',
    VIEWER: 'VIEWER',
  },
  
  ProductStatus: {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    ARCHIVED: 'ARCHIVED',
  },
  
  OrderStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
  },
  
  Theme: {
    SYSTEM: 'SYSTEM',
    LIGHT: 'LIGHT',
    DARK: 'DARK',
  },
  
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      constructor(message, code, clientVersion) {
        super(message);
        this.code = code;
        this.clientVersion = clientVersion;
        this.name = 'PrismaClientKnownRequestError';
      }
    },
    PrismaClientUnknownRequestError: class PrismaClientUnknownRequestError extends Error {
      constructor(message, clientVersion) {
        super(message);
        this.clientVersion = clientVersion;
        this.name = 'PrismaClientUnknownRequestError';
      }
    },
    PrismaClientValidationError: class PrismaClientValidationError extends Error {
      constructor(message, clientVersion) {
        super(message);
        this.clientVersion = clientVersion;
        this.name = 'PrismaClientValidationError';
      }
    },
  },
}));

// Mock NextAuth server-side functions
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
    },
  }),
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
    },
  }),
}));

// Mock common utility modules that might cause issues
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: '1', role: 'ADMIN' }),
  decode: jest.fn().mockReturnValue({ userId: '1', role: 'ADMIN' }),
}));

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('mock file content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ size: 1024 }),
  readdir: jest.fn().mockResolvedValue([]),
}));

// Mock fs (for compatibility with different import styles)
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue('mock file content'),
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024 }),
    readdir: jest.fn().mockResolvedValue([]),
    access: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/') || '/'),
  basename: jest.fn((p) => p.split('/').pop() || ''),
  extname: jest.fn((p) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
  resolve: jest.fn((...args) => '/' + args.join('/').replace(/\/+/g, '/')),
}));

// Global test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3001';

// Disable real database connections in tests
process.env.SKIP_ENV_VALIDATION = 'true';

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('Warning:')) {
    return;
  }
  originalWarn(...args);
};
