/**
 * Password Reset Page
 * Handles both password reset request and completion
 */

import { Suspense } from 'react'
import PasswordReset from '@/components/auth/PasswordReset'

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PasswordReset />
    </Suspense>
  )
}

export const metadata = {
  title: 'Password Reset - CMS Admin',
  description: 'Reset your password securely'
}