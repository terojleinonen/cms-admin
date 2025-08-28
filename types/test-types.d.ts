// Mock types for testing

import { PrismaClient } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';

export type MockPrisma = DeepMockProxy<PrismaClient>;

// Mock bcrypt types
export interface MockBcrypt {
  hash: jest.MockedFunction<typeof import('bcryptjs').hash>;
  compare: jest.MockedFunction<typeof import('bcryptjs').compare>;
}

// Test data types
export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: import('@prisma/client').UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  inventoryQuantity: number;
  weight?: number;
  dimensions?: any;
  status: import('@prisma/client').ProductStatus;
  featured: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  categories: any[];
}

export interface TestCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: import('@prisma/client').PageStatus;
  template: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
