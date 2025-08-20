import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Backup & Recovery - Kin Workspace CMS',
  description: 'Manage data backups and recovery options',
}

export default function BackupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">Backup & Recovery</h1>
        <p className="text-slate-gray font-inter">Manage data backups and recovery options</p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
          Data Backup
        </h3>
        <p className="text-slate-gray font-inter">
          Backup and recovery features will be available here. This includes automated backups, 
          manual backup creation, and data restoration options.
        </p>
      </div>
    </div>
  )
}