import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from './components/auth/SessionProvider'
import LayoutWrapper from './components/layout/LayoutWrapper'
import { PreferencesProvider } from './components/providers/PreferencesProvider'
import { PreferencesApplier } from './components/preferences/PreferencesApplier'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kin Workspace CMS - Create Calm. Work Better.',
  description: 'Content Management System for Kin Workspace - Intentionally designed workspace tools that enhance focus, clarity, and calm.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-soft-white text-slate-gray`}>
        <SessionProvider>
          <PreferencesProvider>
            <PreferencesApplier />
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </PreferencesProvider>
        </SessionProvider>
      </body>
    </html>
  )
}