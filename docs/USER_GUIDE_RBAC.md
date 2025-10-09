# User Guide: Role-Based Features

## Overview

The Kin Workspace CMS uses a role-based access control (RBAC) system to ensure users can only access features and data appropriate to their role. This guide explains how the system works from a user perspective and what to expect based on your assigned role.

## Understanding Your Role

### Role Types

**Admin**
- Full system access and control
- Can manage all users, products, orders, and system settings
- Access to security monitoring and audit logs
- Can create and modify roles and permissions

**Editor**
- Content management capabilities
- Can create, edit, and delete products, categories, and pages
- Can view and manage orders
- Can manage media files
- Cannot access user management or system settings

**Viewer**
- Read-only access to most content
- Can view products, categories, pages, and orders
- Can only edit their own profile
- Cannot create, modify, or delete content

### Checking Your Role

1. **In the Header**: Your role is displayed next to your name in the top navigation
2. **In Profile Settings**: Visit your profile page to see detailed role information
3. **Navigation Menu**: Available menu items reflect your role permissions

## Role-Based Interface Features

### Navigation Menu

The sidebar navigation automatically adjusts based on your role:

**Admin Users See:**
- Dashboard
- Products (full management)
- Categories (full management)
- Orders (full management)
- Users (management interface)
- Analytics (all reports)
- Settings (system configuration)
- Security (monitoring and logs)

**Editor Users See:**
- Dashboard
- Products (full management)
- Categories (full management)
- Orders (view and update)
- Analytics (limited reports)
- Media (file management)

**Viewer Users See:**
- Dashboard (limited)
- Products (view only)
- Categories (view only)
- Orders (view only)
- Profile (own profile only)

### Action Buttons and Controls

The interface automatically hides or disables actions you cannot perform:

- **Create buttons** only appear if you can create that type of content
- **Edit buttons** only appear for items you can modify
- **Delete buttons** only appear for items you can remove
- **Bulk actions** are filtered based on your permissions

### Search and Filtering

Search results are automatically filtered based on your permissions:
- You only see items you have permission to view
- Advanced filters may be limited based on your role
- Export options are available only if you can access the underlying data

## Working with Different Roles

### As an Admin

**User Management:**
- Access the Users section to manage all system users
- Assign and modify user roles
- View user activity and audit logs
- Manage user permissions and access

**System Configuration:**
- Configure system settings and preferences
- Manage security policies and monitoring
- Access audit logs and security reports
- Configure integrations and API settings

**Full Content Control:**
- Create, edit, and delete all content types
- Manage product catalogs and inventory
- Process and manage all orders
- Access all analytics and reporting features

### As an Editor

**Content Management:**
- Create and manage product listings
- Organize categories and product hierarchies
- Upload and manage media files
- Create and edit marketing pages

**Order Processing:**
- View all customer orders
- Update order status and tracking
- Process refunds and exchanges
- Generate order reports

**Limited Analytics:**
- View sales and product performance reports
- Access customer analytics (limited)
- Generate content performance reports

### As a Viewer

**Information Access:**
- Browse all products and categories
- View order information and status
- Access basic analytics and reports
- View system announcements

**Profile Management:**
- Update your own profile information
- Change password and security settings
- Manage notification preferences
- View your activity history

## Common User Scenarios

### Scenario 1: Accessing Restricted Content

**What happens:** You click on a feature or page you don't have access to

**System response:**
- Redirects to an "Access Denied" page
- Shows a clear message explaining the restriction
- Provides contact information for requesting access
- Logs the access attempt for security monitoring

### Scenario 2: Role Change

**What happens:** An admin changes your role

**System response:**
- Changes take effect immediately (no logout required)
- Navigation menu updates automatically
- New permissions are available instantly
- You receive a notification about the role change

### Scenario 3: Attempting Unauthorized Actions

**What happens:** You try to perform an action beyond your permissions

**System response:**
- Action is blocked before processing
- Clear error message explains the restriction
- Suggests alternative actions you can perform
- Incident is logged for security review

## Notifications and Alerts

### Permission-Based Notifications

You receive notifications relevant to your role:

**Admin Notifications:**
- Security alerts and system issues
- User management updates
- System performance alerts
- Audit log summaries

**Editor Notifications:**
- Content approval requests
- Inventory alerts
- Order processing updates
- Content performance reports

**Viewer Notifications:**
- System announcements
- Account-related updates
- Relevant content updates

### Managing Notification Preferences

1. Go to your Profile settings
2. Select "Notification Preferences"
3. Choose which types of notifications to receive
4. Set delivery preferences (email, in-app, etc.)

## Getting Help

### If You Need Additional Access

1. **Contact Your Administrator:**
   - Use the "Request Access" link on restricted pages
   - Send a message through the internal messaging system
   - Email your system administrator directly

2. **Provide Context:**
   - Explain what you're trying to accomplish
   - Specify which features or data you need access to
   - Include business justification for the request

### If Something Isn't Working

1. **Check Your Role:**
   - Verify your current role in your profile
   - Ensure you should have access to the feature
   - Check if your role was recently changed

2. **Clear Your Browser:**
   - Refresh the page
   - Clear browser cache and cookies
   - Try logging out and back in

3. **Report Issues:**
   - Use the "Report Issue" feature in the help menu
   - Include screenshots and error messages
   - Describe what you were trying to do

## Security Best Practices

### Protecting Your Account

1. **Strong Passwords:**
   - Use unique, complex passwords
   - Enable two-factor authentication if available
   - Change passwords regularly

2. **Safe Browsing:**
   - Always log out when finished
   - Don't share your login credentials
   - Report suspicious activity immediately

3. **Data Handling:**
   - Only access data you need for your work
   - Don't share sensitive information inappropriately
   - Follow company data handling policies

### Recognizing Security Issues

**Watch for:**
- Unexpected permission changes
- Unusual system behavior
- Suspicious login notifications
- Unfamiliar user activity

**Report immediately:**
- Any suspected security breaches
- Unauthorized access attempts
- System vulnerabilities you discover
- Suspicious user behavior

## Frequently Asked Questions

### General Questions

**Q: How do I know what I can and cannot do?**
A: The interface automatically adjusts to show only features you can access. If you can see it, you can use it.

**Q: Can I request additional permissions?**
A: Yes, contact your administrator with a business justification for the additional access you need.

**Q: Why can't I see certain menu items?**
A: Menu items are filtered based on your role. If you don't see something, you likely don't have permission to access it.

### Technical Questions

**Q: Do I need to log out when my role changes?**
A: No, role changes take effect immediately without requiring a logout.

**Q: Why do some pages load slowly?**
A: The system performs permission checks which may add slight delays. This ensures security and data protection.

**Q: Can I bookmark pages I have access to?**
A: Yes, but if your permissions change, bookmarked pages may become inaccessible.

### Troubleshooting

**Q: I'm getting "Access Denied" errors for pages I should be able to access.**
A: Try refreshing the page or clearing your browser cache. If the issue persists, contact your administrator.

**Q: Some buttons or features disappeared.**
A: This usually indicates a role change. Check your current role in your profile or contact your administrator.

**Q: I can't find a feature I used before.**
A: Features may be reorganized or your permissions may have changed. Use the search function or contact support.

## Contact Information

- **System Administrator:** [Contact details]
- **Technical Support:** [Contact details]
- **Security Issues:** [Contact details]
- **General Help:** Use the in-app help system or help@kinworkspace.com

---

*This guide is updated regularly. Last updated: [Date]*