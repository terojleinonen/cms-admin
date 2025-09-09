import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '@/components/ui/Input';

describe('Input', () => {
  it('should render with default props', () => {
    render(<Input data-testid="input" />);
    const inputElement = screen.getByTestId('input');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveClass('w-full');
    expect(inputElement).toHaveClass('border-gray-300');
  });

  it('should render with error state', () => {
    render(<Input error data-testid="input" />);
    const inputElement = screen.getByTestId('input');
    expect(inputElement).toHaveClass('border-red-300');
  });

  it('should not have full width', () => {
    render(<Input fullWidth={false} data-testid="input" />);
    const inputElement = screen.getByTestId('input');
    expect(inputElement).not.toHaveClass('w-full');
  });

  it('should call onChange handler when typed in', async () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} data-testid="input" />);
    const inputElement = screen.getByTestId('input');
    await userEvent.type(inputElement, 'hello');
    expect(handleChange).toHaveBeenCalledTimes(5);
  });

  it('should apply custom className', () => {
    render(<Input className="custom-class" data-testid="input" />);
    const inputElement = screen.getByTestId('input');
    expect(inputElement).toHaveClass('custom-class');
  });
});
