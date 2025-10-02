/**
 * Specialized Guards Usage Examples
 * Task 17: Examples demonstrating specialized guard components
 */

import React from 'react'
import { UserRole } from '@prisma/client'
import { 
  AdminOnly, 
  OwnerOrAdmin, 
  FeatureFlag,
  withFeatureFlag,
  withAdminOnly,
  withOwnerOrAdmin,
  useFeatureFlags
} from '../SpecializedGuards'

/**
 * AdminOnly Component Examples
 */
export function AdminOnlyExamples() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">AdminOnly Component Examples</h2>
      
      {/* Basic admin-only content */}
      <AdminOnly>
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-medium text-red-800">Admin Dashboard</h3>
          <p className="text-red-600">This content is only visible to administrators.</p>
        </div>
      </AdminOnly>

      {/* Admin-only with fallback */}
      <AdminOnly 
        fallback={
          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <p className="text-gray-600">You need admin privileges to access this section.</p>
          </div>
        }
      >
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-medium text-blue-800">System Settings</h3>
          <p className="text-blue-600">Configure system-wide settings here.</p>
        </div>
      </AdminOnly>

      {/* Admin-only with error message */}
      <AdminOnly 
        showError 
        errorMessage="Administrator access required to view system logs."
      >
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-medium text-green-800">System Logs</h3>
          <p className="text-green-600">View detailed system logs and audit trails.</p>
        </div>
      </AdminOnly>

      {/* Admin-only with callbacks */}
      <AdminOnly
        onAuthorized={() => console.log('Admin access granted')}
        onUnauthorized={(reason) => console.log('Admin access denied:', reason)}
      >
        <div className="p-4 bg-purple-50 border border-purple-200 rounded">
          <h3 className="font-medium text-purple-800">Security Center</h3>
          <p className="text-purple-600">Manage security settings and monitoring.</p>
        </div>
      </AdminOnly>
    </div>
  )
}

/**
 * OwnerOrAdmin Component Examples
 */
export function OwnerOrAdminExamples() {
  const currentUserId = 'user-123'
  const resourceOwnerId = 'user-456'

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">OwnerOrAdmin Component Examples</h2>
      
      {/* Basic owner-or-admin content */}
      <OwnerOrAdmin resourceOwnerId={currentUserId}>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-medium text-yellow-800">Edit Profile</h3>
          <p className="text-yellow-600">You can edit this profile because you own it or are an admin.</p>
        </div>
      </OwnerOrAdmin>

      {/* Owner-or-admin with fallback */}
      <OwnerOrAdmin 
        resourceOwnerId={resourceOwnerId}
        fallback={
          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <p className="text-gray-600">You can only edit your own content or need admin privileges.</p>
          </div>
        }
      >
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded">
          <h3 className="font-medium text-indigo-800">Edit Post</h3>
          <p className="text-indigo-600">Modify this post content.</p>
        </div>
      </OwnerOrAdmin>

      {/* Owner-or-admin with custom user ID */}
      <OwnerOrAdmin 
        resourceOwnerId="user-789"
        currentUserId="user-789"
        showError
        errorMessage="You can only manage your own resources."
      >
        <div className="p-4 bg-teal-50 border border-teal-200 rounded">
          <h3 className="font-medium text-teal-800">Manage Resources</h3>
          <p className="text-teal-600">Manage your personal resources.</p>
        </div>
      </OwnerOrAdmin>
    </div>
  )
}

/**
 * FeatureFlag Component Examples
 */
export function FeatureFlagExamples() {
  const { featureConfig, isFeatureEnabled, updateFeatureConfig } = useFeatureFlags()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">FeatureFlag Component Examples</h2>
      
      {/* Basic feature flag with array */}
      <FeatureFlag 
        feature="advanced-analytics" 
        enabledFeatures={['advanced-analytics', 'beta-features']}
      >
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded">
          <h3 className="font-medium text-emerald-800">Advanced Analytics</h3>
          <p className="text-emerald-600">View detailed analytics and insights.</p>
        </div>
      </FeatureFlag>

      {/* Feature flag with config object */}
      <FeatureFlag 
        feature="beta-features" 
        featureConfig={{ 'beta-features': true }}
        fallback={
          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <p className="text-gray-600">Beta features are not enabled for your account.</p>
          </div>
        }
      >
        <div className="p-4 bg-pink-50 border border-pink-200 rounded">
          <h3 className="font-medium text-pink-800">Beta Features</h3>
          <p className="text-pink-600">Try out our latest experimental features.</p>
        </div>
      </FeatureFlag>

      {/* Feature flag with authentication requirement */}
      <FeatureFlag 
        feature="premium-features" 
        enabledFeatures={['premium-features']}
        requireAuthentication={true}
        minimumRole={UserRole.EDITOR}
      >
        <div className="p-4 bg-orange-50 border border-orange-200 rounded">
          <h3 className="font-medium text-orange-800">Premium Features</h3>
          <p className="text-orange-600">Access premium functionality with editor role or higher.</p>
        </div>
      </FeatureFlag>

      {/* Feature flag with error display */}
      <FeatureFlag 
        feature="experimental-ui" 
        enabledFeatures={[]}
        showError
        errorMessage="Experimental UI is not available in your current plan."
      >
        <div className="p-4 bg-violet-50 border border-violet-200 rounded">
          <h3 className="font-medium text-violet-800">Experimental UI</h3>
          <p className="text-violet-600">Try our new experimental user interface.</p>
        </div>
      </FeatureFlag>

      {/* Dynamic feature flag control */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded">
        <h3 className="font-medium text-slate-800">Feature Flag Controls</h3>
        <div className="mt-2 space-y-2">
          <div>
            <label className="text-sm text-slate-600">
              Debug Mode: {isFeatureEnabled('debug-mode') ? 'Enabled' : 'Disabled'}
            </label>
          </div>
          <button
            onClick={() => updateFeatureConfig({ 'debug-mode': !isFeatureEnabled('debug-mode') })}
            className="px-3 py-1 text-sm bg-slate-200 hover:bg-slate-300 rounded"
          >
            Toggle Debug Mode
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Higher-Order Component Examples
 */

// Component to be wrapped
const SampleComponent = ({ title, content }: { title: string; content: string }) => (
  <div className="p-4 bg-white border border-gray-200 rounded shadow">
    <h3 className="font-medium text-gray-800">{title}</h3>
    <p className="text-gray-600">{content}</p>
  </div>
)

// Admin-only wrapped component
const AdminOnlyComponent = withAdminOnly(SampleComponent, {
  fallback: <div className="text-red-500">Admin access required</div>
})

// Feature flag wrapped component
const BetaFeatureComponent = withFeatureFlag(SampleComponent, 'beta-features', {
  enabledFeatures: ['beta-features'],
  fallback: <div className="text-blue-500">Beta features not enabled</div>
})

// Owner-or-admin wrapped component
const UserProfileComponent = withOwnerOrAdmin(
  SampleComponent,
  (props: { title: string; content: string; userId?: string }) => props.userId || 'default-user',
  {
    fallback: <div className="text-yellow-500">Owner or admin access required</div>
  }
)

export function HigherOrderComponentExamples() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Higher-Order Component Examples</h2>
      
      <AdminOnlyComponent 
        title="Admin Dashboard" 
        content="This component is wrapped with admin-only access control." 
      />
      
      <BetaFeatureComponent 
        title="Beta Feature" 
        content="This component is wrapped with feature flag control." 
      />
      
      <UserProfileComponent 
        title="User Profile" 
        content="This component is wrapped with owner-or-admin access control."
        userId="current-user-id"
      />
    </div>
  )
}

/**
 * Real-world Usage Examples
 */
export function RealWorldExamples() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Real-World Usage Examples</h2>
      
      {/* Product management with owner-or-admin */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-3">Product Management</h3>
        <OwnerOrAdmin 
          resourceOwnerId="product-owner-123"
          fallback={
            <p className="text-gray-500 italic">
              You can only edit products you created or need admin privileges.
            </p>
          }
        >
          <div className="space-y-2">
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Edit Product
            </button>
            <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-2">
              Delete Product
            </button>
          </div>
        </OwnerOrAdmin>
      </div>

      {/* Admin-only system settings */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-3">System Administration</h3>
        <AdminOnly 
          showError
          errorMessage="System settings require administrator privileges."
        >
          <div className="grid grid-cols-2 gap-4">
            <button className="p-3 bg-gray-100 rounded hover:bg-gray-200">
              User Management
            </button>
            <button className="p-3 bg-gray-100 rounded hover:bg-gray-200">
              Security Settings
            </button>
            <button className="p-3 bg-gray-100 rounded hover:bg-gray-200">
              System Logs
            </button>
            <button className="p-3 bg-gray-100 rounded hover:bg-gray-200">
              Backup & Restore
            </button>
          </div>
        </AdminOnly>
      </div>

      {/* Feature-gated premium functionality */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-3">Premium Features</h3>
        <FeatureFlag 
          feature="premium-analytics"
          enabledFeatures={['premium-analytics']}
          requireAuthentication={true}
          minimumRole={UserRole.EDITOR}
          fallback={
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800">
                Premium analytics requires an Editor role or higher and a premium subscription.
              </p>
              <button className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                Upgrade Plan
              </button>
            </div>
          }
        >
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h4 className="font-medium text-green-800">Advanced Analytics Dashboard</h4>
            <p className="text-green-600 mt-1">
              Access detailed insights, custom reports, and advanced data visualization.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="p-2 bg-white rounded text-center">
                <div className="text-lg font-bold text-green-700">1,234</div>
                <div className="text-xs text-green-600">Total Users</div>
              </div>
              <div className="p-2 bg-white rounded text-center">
                <div className="text-lg font-bold text-green-700">$5,678</div>
                <div className="text-xs text-green-600">Revenue</div>
              </div>
              <div className="p-2 bg-white rounded text-center">
                <div className="text-lg font-bold text-green-700">89%</div>
                <div className="text-xs text-green-600">Conversion</div>
              </div>
            </div>
          </div>
        </FeatureFlag>
      </div>
    </div>
  )
}

/**
 * Complete example page showcasing all specialized guards
 */
export default function SpecializedGuardsShowcase() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Specialized Guard Components</h1>
        <p className="mt-2 text-gray-600">
          Examples of AdminOnly, OwnerOrAdmin, and FeatureFlag components in action
        </p>
      </div>
      
      <AdminOnlyExamples />
      <OwnerOrAdminExamples />
      <FeatureFlagExamples />
      <HigherOrderComponentExamples />
      <RealWorldExamples />
    </div>
  )
}