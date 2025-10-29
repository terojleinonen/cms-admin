import React from 'react';
import { render, screen } from '@testing-library/react';
import Badge from '@/components/ui/Badge';

describe('Badge', () => {
  it('should render with default props', () => {
    render(<Badge>Default Badge</Badge>);
    const badgeElement = screen.getByText('Default Badge');
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement).toHaveClass('bg-gray-100 text-gray-800');
    expect(badgeElement).toHaveClass('px-2.5 py-0.5 text-sm');
  });

  it('should render with success variant', () => {
    render(<Badge variant="success">Success Badge</Badge>);
    const badgeElement = screen.getByText('Success Badge');
    expect(badgeElement).toHaveClass('bg-green-100 text-green-800');
  });

  it('should render with warning variant', () => {
    render(<Badge variant="warning">Warning Badge</Badge>);
    const badgeElement = screen.getByText('Warning Badge');
    expect(badgeElement).toHaveClass('bg-yellow-100 text-yellow-800');
  });

  it('should render with error variant', () => {
    render(<Badge variant="error">Error Badge</Badge>);
    const badgeElement = screen.getByText('Error Badge');
    expect(badgeElement).toHaveClass('bg-red-100 text-red-800');
  });

  it('should render with info variant', () => {
    render(<Badge variant="info">Info Badge</Badge>);
    const badgeElement = screen.getByText('Info Badge');
    expect(badgeElement).toHaveClass('bg-blue-100 text-blue-800');
  });

  it('should render with small size', () => {
    render(<Badge size="sm">Small Badge</Badge>);
    const badgeElement = screen.getByText('Small Badge');
    expect(badgeElement).toHaveClass('px-2 py-0.5 text-xs');
  });

  it('should render with large size', () => {
    render(<Badge size="lg">Large Badge</Badge>);
    const badgeElement = screen.getByText('Large Badge');
    expect(badgeElement).toHaveClass('px-3 py-1 text-base');
  });

  it('should apply custom className', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>);
    const badgeElement = screen.getByText('Custom Badge');
    expect(badgeElement).toHaveClass('custom-class');
  });
});
