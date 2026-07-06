# Enhanced Error Handling Guide

## Overview

This guide explains the comprehensive error handling system implemented in the Contract Advisor RAG application. The system provides user-friendly error messages, actionable recovery options, and robust error tracking.

## Architecture

### Core Components

1. **EnhancedErrorDisplay** - Advanced error display component with animations and actions
2. **ErrorHandlerService** - Context-based error management service
3. **ErrorBoundary** - React error boundary for catching component errors
4. **Specialized Error Creators** - Helper functions for common error scenarios

### Key Features

- **User-Friendly Messages**: Non-technical explanations for all error types
- **Actionable Recovery**: Specific actions users can take to resolve issues
- **Severity Levels**: Low, Medium, High, Critical with appropriate visual treatment
- **Error Categories**: Network, Upload, Processing, Validation, Session, Permission, System, User Input
- **Auto-Resolution**: Low-severity errors auto-dismiss after timeout
- **Technical Details**: Optional technical information for advanced users
- **Error Copy**: One-click error detail copying for support tickets
- **Error History**: Track and manage multiple errors simultaneously

## Usage

### Basic Error Handling

```typescript
import { useErrorHandler } from '../services/ErrorHandlerService';

const MyComponent = () => {
  const { addError, showSuccess, showWarning, showInfo } = useErrorHandler();

  const handleAction = async () => {
    try {
      await riskyOperation();
      showSuccess('Operation completed successfully!');
    } catch (error) {
      addError(createNetworkError('Failed to connect to server'));
    }
  };

  return <button onClick={handleAction}>Execute Action</button>;
};
```

### Error Provider Setup

```typescript
// Wrap your application with ErrorHandlerProvider
import { ErrorHandlerProvider } from '../services/ErrorHandlerService';

function App() {
  return (
    <ErrorHandlerProvider maxErrors={5}>
      <YourAppComponents />
    </ErrorHandlerProvider>
  );
}
```

### Custom Error Creation

```typescript
import { UserFriendlyError, ErrorCategory, ErrorSeverity } from '../services/ErrorHandlerService';

const customError: Partial<UserFriendlyError> = {
  title: 'Custom Error',
  message: 'Technical error details',
  userMessage: 'Simple explanation for users',
  category: 'system',
  severity: 'medium',
  actionable: true,
  autoResolve: false,
  actions: [
    {
      label: 'Fix Issue',
      action: () => resolveIssue(),
      type: 'primary'
    }
  ]
};

addError(customError);
```

## Error Categories

### Network Errors
- Connection timeouts
- Server unavailable
- Rate limiting
- HTTP status codes (4xx, 5xx)

### Upload Errors
- File size limits
- Invalid file types
- Corrupted files
- Upload interruptions

### Processing Errors
- Document parsing failures
- AI processing errors
- Memory limits exceeded
- Timeout during analysis

### Validation Errors
- Missing required fields
- Invalid input formats
- Constraint violations

### Session Errors
- Session expiration
- Authentication failures
- Permission denied

### System Errors
- Component rendering errors
- Application crashes
- Configuration issues

## Error Severity Levels

### Low (Blue)
- Informational messages
- Non-critical warnings
- Auto-dismiss after 8 seconds
- Minimal visual impact

### Medium (Yellow)
- Actionable warnings
- Partial functionality loss
- Requires user attention
- No auto-dismiss

### High (Orange)
- Serious issues
- Major functionality impacted
- Immediate attention required
- Clear recovery actions

### Critical (Red)
- System failures
- Complete functionality loss
- Urgent attention required
- Multiple recovery options

## Built-in Error Creators

```typescript
// Network errors
addError(createNetworkError('Connection timeout'));

// Upload errors
addError(createUploadError('document.pdf', 'File too large'));

// Validation errors
addError(createValidationError('email', 'Invalid email format'));

// Session errors
addError(createSessionError());

// Processing errors
addError(createProcessingError('PDF parsing stage'));
```

## Error Actions

Errors can include actionable buttons for recovery:

```typescript
const errorWithActions = {
  title: 'Upload Failed',
  userMessage: 'File upload was interrupted',
  actions: [
    {
      label: 'Retry Upload',
      action: () => retryUpload(),
      type: 'primary',
      icon: <ArrowPathIcon />
    },
    {
      label: 'Choose Different File',
      action: () => openFileSelector(),
      type: 'secondary'
    }
  ]
};
```

## Error Display Features

### Visual Elements
- Color-coded severity indicators
- Category-specific icons
- Progress bars for critical errors
- Smooth animations and transitions

### Interactive Elements
- Expandable technical details
- Copy error details to clipboard
- Action buttons for recovery
- Manual dismiss option

### Responsive Design
- Adapts to mobile screens
- Touch-friendly interactions
- Compact mode for multiple errors
- Fixed positioning for visibility

## Integration with Existing Components

### Upload Component
- File validation with clear error messages
- Progress tracking with error recovery
- Multiple file handling with individual error states

### Chat Component
- Network error handling
- Message sending failures
- Session timeout management

### Analytics Dashboard
- Data loading errors
- Chart rendering failures
- API request failures

## Testing

### Error Test Suite
Use the built-in error test suite to validate error handling:

```typescript
import ErrorTestSuite from '../components/ErrorTestSuite';

// Enable test mode in development
<ErrorTestSuite />
```

### Test Scenarios
- Network connectivity issues
- File upload failures
- Validation errors
- Processing timeouts
- Session expiration
- Permission denied
- System errors

## Best Practices

### Error Message Guidelines
1. **Be Clear and Specific**: Explain what happened in simple terms
2. **Provide Context**: Help users understand the impact
3. **Offer Solutions**: Give actionable recovery steps
4. **Avoid Technical Jargon**: Use user-friendly language
5. **Include Error Codes**: Help with support troubleshooting

### Error Action Guidelines
1. **Primary Action**: Most likely solution to the problem
2. **Secondary Actions**: Alternative recovery options
3. **Cancel/Dismiss**: Allow users to ignore if appropriate
4. **Help/Support**: Direct users to additional resources

### Categorization Guidelines
1. **Network**: Connectivity and API issues
2. **Upload**: File-related problems
3. **Processing**: Document analysis failures
4. **Validation**: Input and form errors
5. **Session**: Authentication and authorization
6. **System**: Application-level problems

## Configuration Options

### ErrorHandlerProvider Props
```typescript
<ErrorHandlerProvider
  maxErrors={5}           // Maximum concurrent errors
  enableToast={true}     // Enable toast-style notifications
>
  {/* Your app */}
</ErrorHandlerProvider>
```

### Error Display Props
```typescript
<EnhancedErrorDisplay
  error={error}
  onDismiss={() => {}}           // Handle manual dismiss
  onResolve={(errorId) => {}}    // Handle error resolution
  showTechnical={false}          // Show technical details
  compact={false}                // Compact display mode
  position="fixed"               // Positioning
  className="custom-styles"      // Additional CSS classes
/>
```

## Error Reporting (Production)

In production, errors are automatically logged with:
- Unique error IDs for tracking
- Technical details for debugging
- User context and browser information
- Timestamp and severity level

Integrate with your error tracking service:
```typescript
// In ErrorHandlerProvider.tsx
const logErrorToService = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
  // Send to Sentry, Bugsnag, etc.
  errorTrackingService.captureException(error, {
    errorId,
    componentStack: errorInfo.componentStack,
    userInfo: getUserContext()
  });
};
```

## Troubleshooting

### Common Issues

1. **Errors not appearing**: Check ErrorHandlerProvider wrapping
2. **Actions not working**: Verify action functions are properly bound
3. **Styling issues**: Ensure Tailwind CSS classes are applied
4. **Performance problems**: Limit maxErrors and enable auto-resolution

### Debug Mode

Enable detailed error logging in development:
```typescript
// In development, show technical details by default
const showTechnical = process.env.NODE_ENV === 'development';
```

## Migration Guide

### From Basic Error Handling
1. Wrap app with `ErrorHandlerProvider`
2. Replace `alert()` calls with `addError()`
3. Replace `console.error()` with proper error categorization
4. Add error boundaries for component error catching
5. Implement error-specific recovery actions

### From Previous Error System
1. Update error imports to use new error creators
2. Replace error display components with `EnhancedErrorDisplay`
3. Add error categorization and severity levels
4. Implement user-friendly error messages
5. Add actionable recovery options

## Future Enhancements

### Planned Features
- Error analytics and tracking dashboard
- Automated error reporting to external services
- Error prevention through input validation
- Custom error themes and branding
- Error localization support
- Offline error handling and retry logic

### Performance Optimizations
- Error debouncing and throttling
- Lazy loading of error components
- Error state persistence across sessions
- Optimized animations for mobile devices

---

This enhanced error handling system provides a robust foundation for managing errors in the Contract Advisor RAG application, ensuring users have clear guidance when issues occur and can easily recover from problems.