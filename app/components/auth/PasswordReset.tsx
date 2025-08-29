'use client'

/**
 * Password Reset Component
 * Handles password reset request and completion with enhanced security
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

interface PasswordResetFormData {
  email: string
}

interface PasswordResetCompletionData {
  newPassword: string
  confirmPassword: string
}

export default function PasswordReset() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [step, setStep] = useState<'request' | 'complete' | 'success'>(token ? 'complete' : 'request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [requestData, setRequestData] = useState<PasswordResetFormData>({
    email: ''
  })
  
  const [completionData, setCompletionData] = useState<PasswordResetCompletionData>({
    newPassword: '',
    confirmPassword: ''
  })

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reset email')
      }

      // In development, show the token for testing
      if (result.resetToken) {
        console.log('Reset token (dev only):', result.resetToken)
        router.push(`/auth/password-reset?token=${result.resetToken}`)
      } else {
        setStep('success')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCompletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (completionData.newPassword !== completionData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/password-reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: completionData.newPassword,
          confirmPassword: completionData.confirmPassword
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password')
      }

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[@$!%*?&]/.test(password)
    ]
    
    strength = checks.filter(Boolean).length
    
    if (strength <= 2) return { level: 'weak', color: 'red', text: 'Weak' }
    if (strength <= 3) return { level: 'medium', color: 'yellow', text: 'Medium' }
    if (strength <= 4) return { level: 'good', color: 'blue', text: 'Good' }
    return { level: 'strong', color: 'green', text: 'Strong' }
  }

  const passwordStrength = getPasswordStrength(completionData.newPassword)

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Password Reset Complete
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
          </div>
          
          <div>
            <button
              onClick={() => router.push('/auth/login')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'request' ? 'Reset your password' : 'Set new password'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'request' 
              ? 'Enter your email address and we\'ll send you a link to reset your password.'
              : 'Enter your new password below.'
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {step === 'request' ? (
          <form className="mt-8 space-y-6" onSubmit={handleRequestSubmit}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={requestData.email}
                  onChange={(e) => setRequestData({ ...requestData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="text-indigo-600 hover:text-indigo-500 text-sm"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleCompletionSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="new-password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Enter new password"
                    value={completionData.newPassword}
                    onChange={(e) => setCompletionData({ ...completionData, newPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                
                {completionData.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full bg-${passwordStrength.color}-500`}
                          style={{ width: `${(passwordStrength.level === 'weak' ? 20 : passwordStrength.level === 'medium' ? 40 : passwordStrength.level === 'good' ? 60 : passwordStrength.level === 'strong' ? 80 : 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium text-${passwordStrength.color}-600`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm new password"
                    value={completionData.confirmPassword}
                    onChange={(e) => setCompletionData({ ...completionData, confirmPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                
                {completionData.confirmPassword && completionData.newPassword !== completionData.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <span className={completionData.newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}>
                    ✓ At least 8 characters
                  </span>
                </li>
                <li className="flex items-center">
                  <span className={/[a-z]/.test(completionData.newPassword) ? 'text-green-600' : 'text-gray-400'}>
                    ✓ One lowercase letter
                  </span>
                </li>
                <li className="flex items-center">
                  <span className={/[A-Z]/.test(completionData.newPassword) ? 'text-green-600' : 'text-gray-400'}>
                    ✓ One uppercase letter
                  </span>
                </li>
                <li className="flex items-center">
                  <span className={/\d/.test(completionData.newPassword) ? 'text-green-600' : 'text-gray-400'}>
                    ✓ One number
                  </span>
                </li>
                <li className="flex items-center">
                  <span className={/[@$!%*?&]/.test(completionData.newPassword) ? 'text-green-600' : 'text-gray-400'}>
                    ✓ One special character (@$!%*?&)
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || completionData.newPassword !== completionData.confirmPassword}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}