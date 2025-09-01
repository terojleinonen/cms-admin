/**
 * Test Data Factories
 * 
 * Provides factory functions for creating test data objects
 * with realistic but safe test data (no hardcoded credentials)
 */

import { faker } from '@faker-js/faker';

// Set seed for consistent test data
faker.seed(12345);

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER' | 'MODERATOR';
  createdAt: Date;
  updatedAt: Date;
  emailVerified?: Date | null;
  image?: string | null;
}

export interface TestProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  categoryId: string;
  images: string[];
  inventory: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  createdAt: Date;
  updatedAt: Date;
}

export interface TestCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestOrder {
  id: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  total: number;
  items: TestOrderItem[];
  shippingAddress: TestAddress;
  billingAddress: TestAddress;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestOrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  orderId: string;
}

export interface TestAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface TestApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  userId: string;
  lastUsed?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Factory
 */
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'USER',
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  emailVerified: faker.date.past(),
  image: faker.image.avatar(),
  ...overrides,
});

export const createTestAdmin = (overrides: Partial<TestUser> = {}): TestUser =>
  createTestUser({ role: 'ADMIN', ...overrides });

/**
 * Product Factory
 */
export const createTestProduct = (overrides: Partial<TestProduct> = {}): TestProduct => ({
  id: faker.string.uuid(),
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price()),
  sku: faker.string.alphanumeric(8).toUpperCase(),
  categoryId: faker.string.uuid(),
  images: [faker.image.url(), faker.image.url()],
  inventory: faker.number.int({ min: 0, max: 100 }),
  status: 'ACTIVE',
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * Category Factory
 */
export const createTestCategory = (overrides: Partial<TestCategory> = {}): TestCategory => ({
  id: faker.string.uuid(),
  name: faker.commerce.department(),
  slug: faker.helpers.slugify(faker.commerce.department()).toLowerCase(),
  description: faker.lorem.sentence(),
  parentId: null,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * Address Factory
 */
export const createTestAddress = (overrides: Partial<TestAddress> = {}): TestAddress => ({
  street: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  zipCode: faker.location.zipCode(),
  country: faker.location.country(),
  ...overrides,
});

/**
 * Order Item Factory
 */
export const createTestOrderItem = (overrides: Partial<TestOrderItem> = {}): TestOrderItem => ({
  id: faker.string.uuid(),
  productId: faker.string.uuid(),
  quantity: faker.number.int({ min: 1, max: 5 }),
  price: parseFloat(faker.commerce.price()),
  orderId: faker.string.uuid(),
  ...overrides,
});

/**
 * Order Factory
 */
export const createTestOrder = (overrides: Partial<TestOrder> = {}): TestOrder => {
  const items = overrides.items || [createTestOrderItem(), createTestOrderItem()];
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    status: 'PENDING',
    total,
    items,
    shippingAddress: createTestAddress(),
    billingAddress: createTestAddress(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

/**
 * API Key Factory
 */
export const createTestApiKey = (overrides: Partial<TestApiKey> = {}): TestApiKey => ({
  id: faker.string.uuid(),
  name: faker.company.name() + ' API Key',
  key: 'test_' + faker.string.alphanumeric(32),
  permissions: ['read:products', 'write:products'],
  userId: faker.string.uuid(),
  lastUsed: faker.date.recent(),
  expiresAt: faker.date.future(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * Batch Factories
 */
export const createTestUsers = (count: number, overrides: Partial<TestUser> = {}): TestUser[] =>
  Array.from({ length: count }, () => createTestUser(overrides));

export const createTestProducts = (count: number, overrides: Partial<TestProduct> = {}): TestProduct[] =>
  Array.from({ length: count }, () => createTestProduct(overrides));

export const createTestCategories = (count: number, overrides: Partial<TestCategory> = {}): TestCategory[] =>
  Array.from({ length: count }, () => createTestCategory(overrides));

export const createTestOrders = (count: number, overrides: Partial<TestOrder> = {}): TestOrder[] =>
  Array.from({ length: count }, () => createTestOrder(overrides));

export const createTestApiKeys = (count: number, overrides: Partial<TestApiKey> = {}): TestApiKey[] =>
  Array.from({ length: count }, () => createTestApiKey(overrides));

/**
 * Database Seed Data
 */
export const createSeedData = () => ({
  users: [
    createTestAdmin({ email: 'admin@test.com', name: 'Test Admin' }),
    ...createTestUsers(5),
  ],
  categories: createTestCategories(3),
  products: createTestProducts(10),
  orders: createTestOrders(5),
  apiKeys: createTestApiKeys(3),
});

/**
 * Clean Test Data
 * Ensures no sensitive data is used in tests
 */
export const sanitizeTestData = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...data };
  
  // Remove any potential sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }
  
  return sanitized;
};

/**
 * Mock Response Factory
 */
export const createMockResponse = <T>(data: T, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  json: async () => data,
  text: async () => JSON.stringify(data),
  headers: new Headers({
    'Content-Type': 'application/json',
  }),
});

/**
 * Mock Request Factory
 */
export const createMockRequest = (
  method: string = 'GET',
  url: string = 'http://localhost:3001/api/test',
  body?: any,
  headers: Record<string, string> = {}
) => ({
  method,
  url,
  headers: new Headers({
    'Content-Type': 'application/json',
    ...headers,
  }),
  json: async () => body,
  text: async () => JSON.stringify(body),
});