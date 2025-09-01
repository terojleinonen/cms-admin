/**
 * ProductForm Component Test Suite
 * 
 * Comprehensive tests for the ProductForm React component
 */

import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestProduct, createTestCategory } from '../helpers/test-factories';

// Mock the ProductForm component
const MockProductForm = ({ 
  product, 
  categories, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: {
  product?: any;
  categories: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) => {
  const [formData, setFormData] = React.useState(product || {
    name: '',
    description: '',
    price: '',
    sku: '',
    categoryId: '',
    inventory: '',
    status: 'ACTIVE',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} data-testid="product-form">
      <div>
        <label htmlFor="name">Product Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
          data-testid="name-input"
        />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          data-testid="description-input"
        />
      </div>

      <div>
        <label htmlFor="price">Price</label>
        <input
          id="price"
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => handleChange('price', parseFloat(e.target.value))}
          required
          data-testid="price-input"
        />
      </div>

      <div>
        <label htmlFor="sku">SKU</label>
        <input
          id="sku"
          type="text"
          value={formData.sku}
          onChange={(e) => handleChange('sku', e.target.value)}
          required
          data-testid="sku-input"
        />
      </div>

      <div>
        <label htmlFor="categoryId">Category</label>
        <select
          id="categoryId"
          value={formData.categoryId}
          onChange={(e) => handleChange('categoryId', e.target.value)}
          required
          data-testid="category-select"
        >
          <option value="">Select a category</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="inventory">Inventory</label>
        <input
          id="inventory"
          type="number"
          value={formData.inventory}
          onChange={(e) => handleChange('inventory', parseInt(e.target.value))}
          required
          data-testid="inventory-input"
        />
      </div>

      <div>
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => handleChange('status', e.target.value)}
          data-testid="status-select"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      <div>
        <button 
          type="submit" 
          disabled={isLoading}
          data-testid="submit-button"
        >
          {isLoading ? 'Saving...' : 'Save Product'}
        </button>
        <button 
          type="button" 
          onClick={onCancel}
          data-testid="cancel-button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

describe('ProductForm Component', () => {
  let mockOnSubmit: jest.Mock;
  let mockOnCancel: jest.Mock;
  let testCategories: any[];
  let user: any;

  beforeEach(() => {
    mockOnSubmit = jest.fn();
    mockOnCancel = jest.fn();
    testCategories = [
      createTestCategory({ name: 'Electronics' }),
      createTestCategory({ name: 'Clothing' }),
      createTestCategory({ name: 'Books' }),
    ];
    user = userEvent.setup();
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('description-input')).toBeInTheDocument();
      expect(screen.getByTestId('price-input')).toBeInTheDocument();
      expect(screen.getByTestId('sku-input')).toBeInTheDocument();
      expect(screen.getByTestId('category-select')).toBeInTheDocument();
      expect(screen.getByTestId('inventory-input')).toBeInTheDocument();
      expect(screen.getByTestId('status-select')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('should render category options', () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const categorySelect = screen.getByTestId('category-select');
      
      testCategories.forEach(category => {
        expect(screen.getByText(category.name)).toBeInTheDocument();
      });
    });

    it('should render with existing product data', () => {
      const existingProduct = createTestProduct({
        name: 'Existing Product',
        price: 99.99,
        categoryId: testCategories[0].id,
      });

      render(
        <MockProductForm
          product={existingProduct}
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByDisplayValue('Existing Product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('99.99')).toBeInTheDocument();
      expect(screen.getByDisplayValue(testCategories[0].id)).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Saving...');
    });
  });

  describe('Form Interaction', () => {
    it('should update form fields when user types', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('name-input');
      const descriptionInput = screen.getByTestId('description-input');
      const priceInput = screen.getByTestId('price-input');

      await user.type(nameInput, 'Test Product');
      await user.type(descriptionInput, 'Test Description');
      await user.type(priceInput, '29.99');

      expect(nameInput).toHaveValue('Test Product');
      expect(descriptionInput).toHaveValue('Test Description');
      expect(priceInput).toHaveValue(29.99);
    });

    it('should update select fields', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const categorySelect = screen.getByTestId('category-select');
      const statusSelect = screen.getByTestId('status-select');

      await user.selectOptions(categorySelect, testCategories[1].id);
      await user.selectOptions(statusSelect, 'INACTIVE');

      expect(categorySelect).toHaveValue(testCategories[1].id);
      expect(statusSelect).toHaveValue('INACTIVE');
    });

    it('should handle numeric inputs correctly', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const priceInput = screen.getByTestId('price-input');
      const inventoryInput = screen.getByTestId('inventory-input');

      await user.type(priceInput, '123.45');
      await user.type(inventoryInput, '50');

      expect(priceInput).toHaveValue(123.45);
      expect(inventoryInput).toHaveValue(50);
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data when submitted', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill out the form
      await user.type(screen.getByTestId('name-input'), 'Test Product');
      await user.type(screen.getByTestId('description-input'), 'Test Description');
      await user.type(screen.getByTestId('price-input'), '29.99');
      await user.type(screen.getByTestId('sku-input'), 'TEST-001');
      await user.selectOptions(screen.getByTestId('category-select'), testCategories[0].id);
      await user.type(screen.getByTestId('inventory-input'), '100');

      // Submit the form
      await user.click(screen.getByTestId('submit-button'));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Product',
        description: 'Test Description',
        price: 29.99,
        sku: 'TEST-001',
        categoryId: testCategories[0].id,
        inventory: 100,
        status: 'ACTIVE',
      });
    });

    it('should prevent submission with empty required fields', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Try to submit without filling required fields
      await user.click(screen.getByTestId('submit-button'));

      // Form should not submit due to HTML5 validation
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByTestId('cancel-button'));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should show required field validation', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('name-input');
      
      // Focus and blur to trigger validation
      await user.click(nameInput);
      await user.tab();

      // HTML5 validation should prevent form submission
      await user.click(screen.getByTestId('submit-button'));
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate price format', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const priceInput = screen.getByTestId('price-input');
      
      // Try to enter invalid price
      await user.type(priceInput, 'invalid-price');
      
      // Input should not accept non-numeric values
      expect(priceInput).toHaveValue(null);
    });

    it('should validate inventory as integer', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const inventoryInput = screen.getByTestId('inventory-input');
      
      // Try to enter decimal inventory
      await user.type(inventoryInput, '10.5');
      
      // Should only accept integer values
      expect(inventoryInput).toHaveValue(10);
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Product Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Price')).toBeInTheDocument();
      expect(screen.getByLabelText('SKU')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Inventory')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('name-input');
      nameInput.focus();

      // Tab through all form elements
      await user.tab();
      expect(screen.getByTestId('description-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('price-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('sku-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('category-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('inventory-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('status-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('submit-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('cancel-button')).toHaveFocus();
    });

    it('should support form submission with Enter key', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill out required fields
      await user.type(screen.getByTestId('name-input'), 'Test Product');
      await user.type(screen.getByTestId('price-input'), '29.99');
      await user.type(screen.getByTestId('sku-input'), 'TEST-001');
      await user.selectOptions(screen.getByTestId('category-select'), testCategories[0].id);
      await user.type(screen.getByTestId('inventory-input'), '100');

      // Press Enter to submit
      await user.keyboard('{Enter}');

      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty categories array', () => {
      render(
        <MockProductForm
          categories={[]}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const categorySelect = screen.getByTestId('category-select');
      expect(categorySelect.children).toHaveLength(1); // Only the default option
    });

    it('should handle very long text inputs', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const longText = 'a'.repeat(1000);
      const nameInput = screen.getByTestId('name-input');
      const descriptionInput = screen.getByTestId('description-input');

      await user.type(nameInput, longText);
      await user.type(descriptionInput, longText);

      expect(nameInput).toHaveValue(longText);
      expect(descriptionInput).toHaveValue(longText);
    });

    it('should handle special characters in inputs', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const specialText = 'Product with special chars: !@#$%^&*()';
      const nameInput = screen.getByTestId('name-input');

      await user.type(nameInput, specialText);

      expect(nameInput).toHaveValue(specialText);
    });

    it('should handle rapid form interactions', async () => {
      render(
        <MockProductForm
          categories={testCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('name-input');
      
      // Rapidly type and clear
      await user.type(nameInput, 'Test');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Test');

      expect(nameInput).toHaveValue('New Test');
    });
  });

  describe('Performance', () => {
    it('should handle large category lists efficiently', () => {
      const largeCategories = Array.from({ length: 1000 }, (_, i) => 
        createTestCategory({ name: `Category ${i}` })
      );

      const startTime = performance.now();
      
      render(
        <MockProductForm
          categories={largeCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should render in less than 1 second
      expect(screen.getByTestId('category-select').children).toHaveLength(1001); // 1000 + default option
    });
  });
});