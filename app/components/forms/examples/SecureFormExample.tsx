'use client'

/**
 * Secure Form Example
 * Demonstrates how to use the secure form components with comprehensive validation
 */

import React, { useState } from 'react'
import { z } from 'zod'
import { SecureForm, SecureField, SecureTextArea, SecureSubmitButton } from '../SecureForm'
import { useClientSecurity } from '../../providers/ClientSecurityProvider'

// Example validation schema
const userProfileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email is too long'),
  
  phone: z.string()
    .regex(/^[\+]?[\d\s\-\(\)]{10,}$/, 'Invalid phone number format')
    .optional(),
  
  bio: z.string()
    .max(1000, 'Bio must be less than 1000 characters')
    .optional(),
  
  website: z.string()
    .url('Invalid URL format')
    .optional(),
  
  age: z.number()
    .int('Age must be a whole number')
    .min(13, 'Must be at least 13 years old')
    .max(120, 'Invalid age')
    .optional(),
  
  newsletter: z.boolean().default(false),
  
  terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' })
  })
})

type UserProfileData = z.infer<typeof userProfileSchema>

export function SecureFormExample() {
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    message: string
    data?: any
  } | null>(null)
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isFormValid, setIsFormValid] = useState(false)
  
  const { reportSecurityViolation, securityStatus, securityScore } = useClientSecurity()

  // Handle form submission
  const handleSubmit = async (data: UserProfileData) => {
    try {
      console.log('Submitting secure form data:', data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSubmitResult({
        success: true,
        message: 'Profile updated successfully!',
        data
      })
    } catch (error) {
      setSubmitResult({
        success: false,
        message: error instanceof Error ? error.message : 'Submission failed'
      })
    }
  }

  // Handle validation changes
  const handleValidationChange = (isValid: boolean, errors: Record<string, string>) => {
    setIsFormValid(isValid)
    setValidationErrors(errors)
  }

  // Handle security violations
  const handleSecurityViolation = (violation: string, details: any) => {
    reportSecurityViolation(violation, details)
    console.warn('Form security violation:', violation, details)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Secure User Profile Form</h2>
        
        {/* Security Status Indicator */}
        <div className={`mb-4 p-3 rounded-lg ${
          securityStatus === 'secure' ? 'bg-green-50 border border-green-200' :
          securityStatus === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${
              securityStatus === 'secure' ? 'text-green-800' :
              securityStatus === 'warning' ? 'text-yellow-800' :
              'text-red-800'
            }`}>
              Security Status: {securityStatus.toUpperCase()} (Score: {securityScore}/100)
            </span>
          </div>
        </div>

        <SecureForm
          schema={userProfileSchema}
          onSubmit={handleSubmit}
          config={{
            sanitizeInputs: true,
            validateOnBlur: true,
            csrfProtection: true,
            preventDoubleSubmit: true,
            maxSubmissionRate: 3, // 3 submissions per minute
            autoSave: false
          }}
          className="space-y-6"
          onValidationChange={handleValidationChange}
          onSecurityViolation={handleSecurityViolation}
        >
          {/* Name Field */}
          <SecureField
            name="name"
            type="text"
            placeholder="Enter your full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoComplete="name"
            maxLength={100}
          >
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </span>
          </SecureField>

          {/* Email Field */}
          <SecureField
            name="email"
            type="email"
            placeholder="Enter your email address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoComplete="email"
            maxLength={255}
          >
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </span>
          </SecureField>

          {/* Phone Field */}
          <SecureField
            name="phone"
            type="tel"
            placeholder="Enter your phone number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="tel"
            maxLength={20}
          >
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </span>
          </SecureField>

          {/* Website Field */}
          <SecureField
            name="website"
            type="url"
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="url"
            maxLength={255}
          >
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </span>
          </SecureField>

          {/* Age Field */}
          <SecureField
            name="age"
            type="number"
            placeholder="Enter your age"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Age
            </span>
          </SecureField>

          {/* Bio Field */}
          <SecureTextArea
            name="bio"
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            maxLength={1000}
          >
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </span>
          </SecureTextArea>

          {/* Newsletter Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="newsletter"
              id="newsletter"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="newsletter" className="ml-2 block text-sm text-gray-700">
              Subscribe to newsletter
            </label>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="terms"
              id="terms"
              required
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
              I accept the <a href="/terms" className="text-blue-600 hover:underline">terms and conditions</a> *
            </label>
          </div>

          {/* Submit Button */}
          <SecureSubmitButton
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            loadingText="Updating Profile..."
          >
            Update Profile
          </SecureSubmitButton>
        </SecureForm>

        {/* Validation Status */}
        <div className="mt-4">
          <div className={`text-sm ${isFormValid ? 'text-green-600' : 'text-red-600'}`}>
            Form Status: {isFormValid ? 'Valid' : 'Invalid'}
          </div>
          
          {Object.keys(validationErrors).length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-medium text-red-600 mb-1">Validation Errors:</div>
              <ul className="text-sm text-red-600 list-disc list-inside">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field}>{field}: {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Submit Result */}
        {submitResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            submitResult.success 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="font-medium">
              {submitResult.success ? '✅ Success!' : '❌ Error!'}
            </div>
            <div className="text-sm mt-1">{submitResult.message}</div>
            {submitResult.data && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">
                  View submitted data
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(submitResult.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Security Information */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Security Features Enabled:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>✅ Input sanitization and validation</li>
            <li>✅ CSRF protection</li>
            <li>✅ XSS prevention</li>
            <li>✅ Rate limiting</li>
            <li>✅ Double-submit prevention</li>
            <li>✅ Bot detection (honeypot)</li>
            <li>✅ Suspicious activity monitoring</li>
            <li>✅ Content Security Policy</li>
          </ul>
        </div>
      </div>
    </div>
  )
}