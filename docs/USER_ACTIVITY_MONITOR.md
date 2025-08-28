# User Activity Monitor Component

The `UserActivityMonitor` component provides a comprehensive interface for viewing, filtering, and managing user activity logs and security events.

## Features

- **Real-time Activity Monitoring**: Displays user actions, login attempts, and security events
- **Advanced Filtering**: Filter by user, action type, severity, date range, and search terms
- **Statistics Dashboard**: Shows activity statistics, security alerts, and system metrics
- **Export Functionality**: Export audit logs in JSON or CSV format
- **Auto-refresh**: Automatically refreshes data every 30 seconds
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Usage

### Basic Usage

```tsx
import UserActivityMonitor from '@/app/components/admin/UserActivityMonitor'

export default function ActivityPage() {
  return <UserActivityMonitor />
}
```

### Filtered by User

```tsx
import UserActivityMonitor from '@/app/components/admin/UserActivityMonitor'

export default function UserActivityPage() {
  return <UserActivityMonitor userId="user-123" />
}
```

### With Time Range

```tsx
import UserActivityMonitor from '@/app/components/admin/UserActivityMonitor'

export default function RecentActivityPage() {
  const timeRange = {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    endDate: new Date()
  }

  return <UserActivityMonitor timeRange={timeRange} />
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | `undefined` | Filter logs for a specific user |
| `timeRange` | `{ startDate?: Date, endDate?: Date }` | `undefined` | Filter logs by date range |
| `className` | `string` | `''` | Additional CSS classes |

## API Endpoints

The component uses the following API endpoints:

### GET /api/admin/audit-logs

Fetches audit logs with filtering and pagination.

**Query Parameters:**
- `userId` - Filter by user ID
- `action` - Filter by action type
- `resource` - Filter by resource type
- `severity` - Filter by severity level
- `startDate` - Start date for filtering
- `endDate` - End date for filtering
- `search` - Search term
- `page` - Page number
- `limit` - Items per page

### GET /api/admin/audit-logs/stats

Fetches activity statistics and security alerts.

**Query Parameters:**
- `days` - Number of days to include in statistics (default: 30)

### POST /api/admin/audit-logs

Exports audit logs in JSON or CSV format.

**Request Body:**
```json
{
  "format": "json" | "csv",
  "userId": "string",
  "action": "string",
  "resource": "string",
  "startDate": "string",
  "endDate": "string"
}
```

## Features in Detail

### Statistics Cards

The component displays four key metrics:
- **Total Logs**: Total number of audit logs in the selected time period
- **Recent Activity**: Number of recent activity entries
- **Security Alerts**: Number of active security alerts
- **Critical Events**: Number of critical severity events

### Security Alerts

Security alerts are displayed prominently when detected:
- Failed login attempts
- Suspicious activity patterns
- Account lockouts
- Permission violations

### Filtering Options

- **Search**: Free-text search across user names, emails, actions, and details
- **Action Filter**: Filter by specific action types (login, logout, user updates, etc.)
- **Severity Filter**: Filter by severity level (low, medium, high, critical)
- **Date Range**: Custom date range filtering

### Export Functionality

Users can export audit logs in two formats:
- **JSON**: Structured data format for programmatic processing
- **CSV**: Spreadsheet-compatible format for analysis

### Real-time Updates

The component automatically refreshes data every 30 seconds to show the latest activity. Users can also manually refresh using the refresh button.

## Severity Levels

Audit logs are categorized by severity:

- **Low**: Normal user activities (login, profile updates)
- **Medium**: Administrative actions (user role changes, settings updates)
- **High**: Security-related actions (password changes, 2FA changes)
- **Critical**: Security violations (suspicious activity, account lockouts)

## Action Types

Common action types include:

### Authentication
- `auth.login` - User login
- `auth.logout` - User logout
- `auth.login_failed` - Failed login attempt
- `auth.password_changed` - Password change
- `auth.two_factor_enabled` - 2FA enabled
- `auth.two_factor_disabled` - 2FA disabled

### User Management
- `user.created` - User account created
- `user.updated` - User profile updated
- `user.deleted` - User account deleted
- `user.activated` - User account activated
- `user.deactivated` - User account deactivated
- `user.role_changed` - User role modified

### Security
- `security.suspicious_activity` - Suspicious behavior detected
- `security.account_locked` - Account locked due to security
- `security.permission_denied` - Access denied
- `security.data_export` - Data export performed

## Styling

The component uses Tailwind CSS classes and follows the application's design system. It includes:

- Responsive grid layouts
- Consistent color schemes
- Proper spacing and typography
- Accessibility features (ARIA labels, keyboard navigation)

## Accessibility

The component is built with accessibility in mind:

- Proper ARIA labels for screen readers
- Keyboard navigation support
- High contrast color schemes
- Semantic HTML structure
- Focus management for interactive elements

## Performance Considerations

- **Pagination**: Large datasets are paginated to improve performance
- **Debounced Search**: Search input is debounced to reduce API calls
- **Optimized Rendering**: Uses React best practices for efficient re-rendering
- **Lazy Loading**: Statistics are loaded separately from main data

## Error Handling

The component includes comprehensive error handling:

- Network error recovery
- Invalid data handling
- User-friendly error messages
- Graceful degradation when APIs are unavailable

## Testing

The component includes comprehensive test coverage:

- Unit tests for all functionality
- Integration tests for API interactions
- Accessibility testing
- Performance testing

Run tests with:
```bash
npm test -- UserActivityMonitor.test.tsx
```

## Security Considerations

- **Admin Only**: Component should only be accessible to admin users
- **Data Sanitization**: All displayed data is properly sanitized
- **Export Logging**: All export operations are logged for audit purposes
- **Rate Limiting**: API endpoints include rate limiting to prevent abuse