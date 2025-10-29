import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('should render with default props', () => {
    render(<Button>Click me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).not.toBeDisabled();
    expect(buttonElement).toHaveClass('bg-blue-600');
  });

  it('should render with a different variant', () => {
    render(<Button variant="secondary">Click me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toHaveClass('bg-gray-600');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeDisabled();
  });

  it('should be disabled when loading prop is true', () => {
    render(<Button loading>Click me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeDisabled();
  });

  it('should show a loading spinner when loading prop is true', () => {
    render(<Button loading>Click me</Button>);
    const spinnerElement = screen.getByRole('button', { name: /click me/i }).querySelector('svg');
    expect(spinnerElement).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick handler when disabled', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(buttonElement);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
