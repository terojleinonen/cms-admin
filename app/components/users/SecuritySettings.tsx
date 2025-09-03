/**
 * SecuritySettings Component
 * Advanced security settings component for password and security management
 * Handles two-factor authentication setup, session management, and security recommendations
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { 
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  QrCodeIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { validatePasswordStrength } from '@/lib/user-validation-schemas'
import QRCode from 'qrcode'

interface SecuritySettingsProps {
  userId: string
  className?: string
}

interface SecurityInfo {
  twoFactorEnabled: boolean
  lastPasswordChange?: Date
  lastLoginAt?: Date
  activeSessions: Session[]
  recentActivity: AuditLog[]
  securityScore: number
}

interface Session {
  id: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  expiresAt: Date
}

interface AuditLog {
  id: string
  action: string
  createdAt: Date
  ipAddress?: string
  details?: Record<string, any>
}

interface PasswordStrength {
  score: number
  feedback: string[]
  isStrong: boolean
}

interface TwoFactorSetup {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

interface FormErrors {
  [key: string]: string[]
}

export default function SecuritySettings({ userId, className = '' }: SecuritySettingsProps) {
  const { data: session } = useSession()
  const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)

  // 2FA state
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null)
  const [twoFactorStep, setTwoFactorStep] = useState<'setup' | 'verify' | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)

  /**
   * Load security information from API
   */
  const loadSecurityInfo = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)

      const response = await fetch(`/api/users/${userId}/security`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load security settings')
      }

      setSecurityInfo(data.security)
    } catch (error) {
      console.error('Error loading security info:', error)
      setErrorMessage('Failed to load security settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  /**
   * Handle password change
   */
  const handlePasswordChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!passwordStrength?.isStrong) {
      setErrors({ newPassword: ['Password is not strong enough'] })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setErrors({ confirmNewPassword: ['Passwords do not match'] })
      return
    }

    try {
      setUpdating(true)
      setErrors({})
      setErrorMessage(null)

      const response = await fetch(`/api/users/${userId}/security`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          ...passwordForm
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 400 && data.error?.details) {
          setErrors(data.error.details)
          return
        }
        throw new Error(data.error?.message || 'Failed to change password')
      }

      setSuccessMessage('Password changed successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setPasswordStrength(null)
      
      // Reload security info
      await loadSecurityInfo()

    } catch (error) {
      console.error('Error changing password:', error)
      setErrorMessage('Failed to change password. Please try again.')
    } finally {
      setUpdating(false)
    }
  }, [userId, passwordForm, passwordStrength, loadSecurityInfo])

  /**
   * Handle 2FA setup initiation
   */
  const handleTwoFactorSetup = useCallback(async () => {
    try {
      setUpdating(true)
      setErrorMessage(null)

      const response = await fetch(`/api/users/${userId}/security`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup_2fa' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to setup 2FA')
      }

      setTwoFactorSetup(data)
      setTwoFactorStep('setup')

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(data.qrCodeUrl)
      setQrCodeDataUrl(qrDataUrl)

    } catch (error) {
      console.error('Error setting up 2FA:', error)
      setErrorMessage('Failed to setup 2FA. Please try again.')
    } finally {
      setUpdating(false)
    }
  }, [userId])

  /**
   * Handle 2FA verification
   */
  const handleTwoFactorVerification = useCallback(async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ verificationCode: ['Please enter a 6-digit code'] })
      return
    }

    try {
      setUpdating(true)
      setErrors({})
      setErrorMessage(null)

      const response = await fetch(`/api/users/${userId}/security`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_2fa',
          token: verificationCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 400) {
          setErrors({ verificationCode: [data.error?.message || 'Invalid verification code'] })
          return
        }
        throw new Error(data.error?.message || 'Failed to verify 2FA')
      }

      setSuccessMessage('Two-factor authentication enabled successfully')
      setTwoFactorStep(null)
      setTwoFactorSetup(null)
      setVerificationCode('')
      setQrCodeDataUrl(null)
      
      // Reload security info
      await loadSecurityInfo()

    } catch (error) {
      console.error('Error verifying 2FA:', error)
      setErrorMessage('Failed to verify 2FA. Please try again.')
    } finally {
      setUpdating(false)
    }
  }, [userId, verificationCode, loadSecurityInfo])

  /**
   * Handle 2FA disable
   */
  const handleTwoFactorDisable = useCallback(async () => {
    const currentPassword = prompt('Enter your current password to disable 2FA:')
    if (!currentPassword) return

    try {
      setUpdating(true)
      setErrorMessage(null)

      const response = await fetch(`/api/users/${userId}/security`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disable_2fa',
          currentPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to disable 2FA')
      }

      setSuccessMessage('Two-factor authentication disabled')
      await loadSecurityInfo()

    } catch (error) {
      console.error('Error disabling 2FA:', error)
      setErrorMessage('Failed to disable 2FA. Please try again.')
    } finally {
      setUpdating(false)
    }
  }, [userId, loadSecurityInfo])

  /**
   * Handle session termination
   */
  const handleSessionTermination = useCallback(async (sessionIds?: string[], terminateAll = false) => {
    try {
      setUpdating(true)
      setErrorMessage(null)

      const response = await fetch(`/api/users/${userId}/security`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'terminate_sessions',
          sessionIds: sessionIds || [],
          terminateAll
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to terminate sessions')
      }

      setSuccessMessage(terminateAll ? 'All sessions terminated successfully' : 'Session terminated successfully')
      await loadSecurityInfo()

    } catch (error) {
      console.error('Error terminating sessions:', error)
      setErrorMessage('Failed to terminate sessions. Please try again.')
    } finally {
      setUpdating(false)
    }
  }, [userId, loadSecurityInfo])

  /**
   * Handle password input change with strength validation
   */
  const handlePasswordInputChange = useCallback((field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
    
    if (field === 'newPassword') {
      const strength = validatePasswordStrength(value)
      setPasswordStrength(strength)
    }
  }, [])

  /**
   * Copy backup codes to clipboard
   */
  const copyBackupCodes = useCallback(async () => {
    if (!twoFactorSetup?.backupCodes) return

    try {
      await navigator.clipboard.writeText(twoFactorSetup.backupCodes.join('\n'))
      setSuccessMessage('Backup codes copied to clipboard')
    } catch (error) {
      console.error('Failed to copy backup codes:', error)
    }
  }, [twoFactorSetup])

  /**
   * Get security score color and label
   */
  const getSecurityScoreInfo = useCallback((score: number) => {
    if (score >= 90) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Excellent' }
    if (score >= 75) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good' }
    if (score >= 50) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair' }
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Poor' }
  }, [])

  /**
   * Get security recommendations
   */
  const getSecurityRecommendations = useCallback(() => {
    if (!securityInfo) return []

    const recommendations = []

    if (!securityInfo.twoFactorEnabled) {
      recommendations.push('Enable two-factor authentication for better security')
    }

    if (securityInfo.activeSessions.length > 5) {
      recommendations.push('You have many active sessions. Consider terminating unused ones.')
    }

    const lastLogin = securityInfo.lastLoginAt
    if (lastLogin && (Date.now() - new Date(lastLogin).getTime()) > 30 * 24 * 60 * 60 * 1000) {
      recommendations.push('Your last login was over 30 days ago. Regular activity helps maintain security.')
    }

    if (securityInfo.securityScore >= 90) {
      recommendations.push('Excellent security! Keep up the good work.')
    }

    return recommendations
  }, [securityInfo])

  /**
   * Parse user agent for display
   */
  const parseUserAgent = useCallback((userAgent?: string) => {
    if (!userAgent) return 'Unknown Device'

    if (userAgent.includes('iPhone')) return 'iPhone - Safari'
    if (userAgent.includes('Android')) return 'Android - Chrome'
    if (userAgent.includes('Windows')) return 'Windows - Chrome'
    if (userAgent.includes('Macintosh')) return 'Mac - Safari'
    if (userAgent.includes('Linux')) return 'Linux - Firefox'

    return 'Unknown Device'
  }, [])

  // Load security info on component mount
  useEffect(() => {
    loadSecurityInfo()
  }, [loadSecurityInfo])

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading security settings...</span>
      </div>
    )
  }

  if (!securityInfo) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load security settings</h3>
          <p className="mt-1 text-sm text-gray-500">
            {errorMessage || 'Unable to load your security settings.'}
          </p>
          <div className="mt-6">
            <Button onClick={loadSecurityInfo}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const scoreInfo = getSecurityScoreInfo(securityInfo.securityScore)
  const recommendations = getSecurityRecommendations()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center">
          <ShieldCheckIcon className="h-6 w-6 text-gray-400 mr-3" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
            <p className="text-sm text-gray-500">
              Manage your account security and privacy settings
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-md">
          <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Score */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Security Score</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${scoreInfo.bg} ${scoreInfo.color}`}>
              {securityInfo.securityScore}/100
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Security Level</span>
              <span className={scoreInfo.color}>{scoreInfo.label}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  securityInfo.securityScore >= 90 ? 'bg-green-500' :
                  securityInfo.securityScore >= 75 ? 'bg-blue-500' :
                  securityInfo.securityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${securityInfo.securityScore}%` }}
                aria-label={`Security score: ${securityInfo.securityScore}%`}
              />
            </div>
          </div>

          {recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Security Recommendations</h4>
              <ul className="space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Password & Authentication */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Password & Authentication</h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <FormField
              label="Current Password"
              name="currentPassword"
              error={errors.currentPassword}
              required
            >
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                  error={!!errors.currentPassword}
                  aria-label="Current Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                >
                  {showPasswords.current ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </FormField>

            <FormField
              label="New Password"
              name="newPassword"
              error={errors.newPassword}
              required
            >
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                  error={!!errors.newPassword}
                  aria-label="New Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                >
                  {showPasswords.new ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {passwordStrength && passwordForm.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Password Strength</span>
                    <span className={
                      passwordStrength.score >= 5 ? 'text-green-600' :
                      passwordStrength.score >= 3 ? 'text-yellow-600' : 'text-red-600'
                    }>
                      {passwordStrength.score >= 5 ? 'Strong' :
                       passwordStrength.score >= 3 ? 'Medium' : 'Weak'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        passwordStrength.score >= 5 ? 'bg-green-500' :
                        passwordStrength.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      aria-label={`Password strength: ${Math.round((passwordStrength.score / 6) * 100)}%`}
                    />
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="mt-1 text-xs text-gray-600">
                      {passwordStrength.feedback.map((feedback, index) => (
                        <li key={index}>• {feedback}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </FormField>

            <FormField
              label="Confirm New Password"
              name="confirmNewPassword"
              error={errors.confirmNewPassword}
              required
            >
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => handlePasswordInputChange('confirmNewPassword', e.target.value)}
                  error={!!errors.confirmNewPassword}
                  aria-label="Confirm New Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                >
                  {showPasswords.confirm ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </FormField>

            <Button
              type="submit"
              loading={updating}
              disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword}
            >
              Change Password
            </Button>
          </form>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
          </div>

          {twoFactorStep === 'setup' && twoFactorSetup ? (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Set Up Two-Factor Authentication</h4>
              
              <div className="text-sm text-gray-600">
                <p className="mb-2">Scan this QR code with your authenticator app:</p>
                {qrCodeDataUrl && (
                  <div className="flex justify-center mb-4">
                    <Image src={qrCodeDataUrl} alt="2FA QR Code" className="border rounded" width={200} height={200} />
                  </div>
                )}
                
                <p className="mb-2">Or enter this secret manually:</p>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                  {twoFactorSetup.secret}
                </code>
              </div>

              <div className="border-t pt-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Backup Codes</h5>
                <p className="text-xs text-gray-600 mb-2">
                  Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                </p>
                <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                  {twoFactorSetup.backupCodes.map((code, index) => (
                    <div key={index}>{code}</div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBackupCodes}
                  className="mt-2"
                >
                  <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                  Copy Codes
                </Button>
              </div>

              <FormField
                label="Verification Code"
                name="verificationCode"
                error={errors.verificationCode}
                helpText="Enter the 6-digit code from your authenticator app"
                required
              >
                <Input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  error={!!errors.verificationCode}
                  aria-label="Verification Code"
                />
              </FormField>

              <div className="flex space-x-3">
                <Button
                  onClick={handleTwoFactorVerification}
                  loading={updating}
                  disabled={verificationCode.length !== 6}
                >
                  Verify & Enable
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTwoFactorStep(null)
                    setTwoFactorSetup(null)
                    setVerificationCode('')
                    setQrCodeDataUrl(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">
                    Two-factor authentication is {securityInfo.twoFactorEnabled ? 'enabled' : 'disabled'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {securityInfo.twoFactorEnabled 
                      ? 'Your account is protected with 2FA'
                      : 'Add an extra layer of security to your account'
                    }
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  securityInfo.twoFactorEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              </div>

              {securityInfo.twoFactorEnabled ? (
                <Button
                  variant="outline"
                  onClick={handleTwoFactorDisable}
                  loading={updating}
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  onClick={handleTwoFactorSetup}
                  loading={updating}
                >
                  Enable 2FA
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Active Sessions - Enhanced */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ComputerDesktopIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Session Management</h3>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSessionTermination([], true)}
                loading={updating}
              >
                Logout All Devices
              </Button>
            </div>
          </div>

          {/* Session Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{securityInfo.activeSessions.length}</div>
              <div className="text-xs text-gray-500">Active Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {securityInfo.lastLoginAt ? new Date(securityInfo.lastLoginAt).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-xs text-gray-500">Last Login</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">{securityInfo.recentActivity.length}</div>
              <div className="text-xs text-gray-500">Recent Activity</div>
            </div>
          </div>

          <div className="space-y-3">
            {securityInfo.activeSessions.map((session, index) => (
              <div key={session.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <ComputerDesktopIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {parseUserAgent(session.userAgent)}
                    </span>
                    {index === 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <div>IP: {session.ipAddress || 'Unknown'}</div>
                    <div>Started: {new Date(session.createdAt).toLocaleDateString()}</div>
                    <div>Expires: {new Date(session.expiresAt).toLocaleDateString()}</div>
                  </div>
                </div>
                {index !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSessionTermination([session.id])}
                    loading={updating}
                  >
                    End Session
                  </Button>
                )}
              </div>
            ))}

            {securityInfo.activeSessions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No active sessions found
              </p>
            )}
          </div>

          {/* Suspicious Activity Alert */}
          {securityInfo.activeSessions.length > 3 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Multiple Active Sessions</p>
                  <p className="text-xs text-yellow-700">
                    You have {securityInfo.activeSessions.length} active sessions. Consider ending unused sessions for better security.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {updating && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <LoadingSpinner />
            <span className="text-gray-700">Updating security settings...</span>
          </div>
        </div>
      )}
    </div>
  )
}