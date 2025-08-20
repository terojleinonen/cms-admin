import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Workflow Management - Kin Workspace CMS',
  description: 'Manage content workflows and approval processes',
}

export default function WorkflowPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">Workflow Management</h1>
        <p className="text-slate-gray font-inter">Manage content workflows and approval processes</p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
          Content Workflow
        </h3>
        <p className="text-slate-gray font-inter">
          Workflow management features will be available here. This includes content approval 
          processes, review stages, and publishing workflows.
        </p>
      </div>
    </div>
  )
}