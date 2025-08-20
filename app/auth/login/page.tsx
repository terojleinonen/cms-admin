/**
 * Login page
 * Provides user authentication interface
 */

import { Suspense } from 'react'
import LoginForm from '../../components/auth/LoginForm'

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string
    error?: string
    message?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        {params.message && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
            {params.message}
          </div>
        )}
        <LoginForm 
          callbackUrl={params.callbackUrl} 
          error={params.error}
        />
      </div>
    </Suspense>
  )
}

export const metadata = {
  title: 'Sign In - Kin Workspace CMS',
  description: 'Sign in to the Kin Workspace Content Management System',
}