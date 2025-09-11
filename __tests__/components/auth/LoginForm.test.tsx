import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';

// Mock next-auth and next/navigation
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockSignIn = signIn as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('LoginForm', () => {
  let mockRouterPush: jest.Mock;
  let mockRouterRefresh: jest.Mock;

  beforeEach(() => {
    mockRouterPush = jest.fn();
    mockRouterRefresh = jest.fn();
    mockUseRouter.mockReturnValue({
      push: mockRouterPush,
      refresh: mockRouterRefresh,
    });
    mockSignIn.mockClear();
  });

  it('should render the login form', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
  });

  it('should call the signIn function and redirect on successful login', async () => {
    mockSignIn.mockResolvedValue({
      ok: true,
      error: null,
      url: '/admin/dashboard',
    });

    render(<LoginForm callbackUrl="/admin/dashboard" />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'admin@kinworkspace.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'admin@kinworkspace.com',
        password: 'admin123',
        redirect: false,
      });
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/admin/dashboard');
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it('should display an error message on failed login', async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: 'CredentialsSignin',
      url: null,
    });

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'wrong@example.com',
        password: 'wrongpassword',
        redirect: false,
      });
    });

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
