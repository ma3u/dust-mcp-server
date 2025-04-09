# Decision Record: Authentication and Authorization Mechanisms

## Date

2025-04-09

## Context

The MCP server requires robust authentication and authorization mechanisms to ensure secure access to health data and Dust agents. This document outlines the design of these security mechanisms.

## Authentication and Authorization Design

### Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Client Applications                        │
│                                                                 │
│  ┌───────────────────┐                 ┌───────────────────┐    │
│  │   Claude Desktop  │                 │    Web Browsers   │    │
│  └─────────┬─────────┘                 └─────────┬─────────┘    │
└─────────────┼─────────────────────────────────────┼─────────────┘
              │                                     │
              │ Credentials                         │ Credentials
              │                                     │
┌─────────────┼─────────────────────────────────────┼─────────────┐
│             │             Auth Layer               │             │
│             │                                     │             │
│  ┌──────────▼──────────┐            ┌─────────────▼───────────┐ │
│  │                     │            │                         │ │
│  │  API Key Validator  │            │   JWT Authentication    │ │
│  │                     │            │                         │ │
│  └──────────┬──────────┘            └─────────────┬───────────┘ │
│             │                                     │             │
│  ┌──────────▼──────────┐            ┌─────────────▼───────────┐ │
│  │                     │            │                         │ │
│  │   Rate Limiting     │            │   Session Management    │ │
│  │                     │            │                         │ │
│  └──────────┬──────────┘            └─────────────┬───────────┘ │
└─────────────┼─────────────────────────────────────┼─────────────┘
              │                                     │
              ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Authorization Layer                          │
│                                                                 │
│  ┌─────────────────────┐      ┌───────────────────────────────┐ │
│  │                     │      │                               │ │
│  │   Role-Based ACL    │      │     Resource Permissions      │ │
│  │                     │      │                               │ │
│  └─────────┬───────────┘      └───────────────┬───────────────┘ │
│            │                                  │                │ │
│            └──────────────┬──────────────────┘                │ │
│                           │                                   │ │
│  ┌─────────────────────────────────────────────────────────┐  │ │
│  │                                                         │  │ │
│  │               Permission Enforcement                    │  │ │
│  │                                                         │  │ │
│  └─────────────────────────────────────────────────────────┘  │ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Protected Resources                          │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │                 │  │                 │  │                 │  │
│  │  Dust Agents    │  │  Health Data    │  │  User Settings  │  │
│  │                 │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Methods

### 1. API Key Authentication

API key authentication is used primarily for server-to-server communication, particularly for accessing the Dust API.

#### Implementation Details

```typescript
interface ApiKeyConfig {
  key: string;
  owner: string;
  scopes: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

class ApiKeyAuthenticator {
  private apiKeys: Map<string, ApiKeyConfig>;
  
  constructor() {
    this.apiKeys = new Map();
    // Load API keys from secure storage
  }
  
  async validateApiKey(key: string, requiredScope: string): Promise<boolean> {
    if (!this.apiKeys.has(key)) {
      return false;
    }
    
    const keyConfig = this.apiKeys.get(key)!;
    
    // Check expiration
    if (keyConfig.expiresAt && keyConfig.expiresAt < new Date()) {
      return false;
    }
    
    // Check scope
    if (!keyConfig.scopes.includes(requiredScope) && 
        !keyConfig.scopes.includes('*')) {
      return false;
    }
    
    // Update last used timestamp
    keyConfig.lastUsed = new Date();
    
    return true;
  }
  
  // Additional methods for key management
}
```

#### Security Considerations

- API keys are stored securely using environment variables
- Keys are hashed in persistent storage
- Regular key rotation is enforced
- Keys have limited scopes and expiration dates
- Rate limiting is applied to prevent abuse

### 2. JWT Authentication

JWT (JSON Web Token) authentication is used for user authentication, particularly for web-based access.

#### Implementation Details

```typescript
interface JwtConfig {
  secret: string;
  issuer: string;
  audience: string;
  expiresIn: string; // e.g., '1h', '7d'
  refreshExpiresIn: string; // e.g., '30d'
}

interface JwtPayload {
  sub: string; // subject (user ID)
  iss: string; // issuer
  aud: string; // audience
  iat: number; // issued at
  exp: number; // expiration time
  roles: string[];
  permissions: string[];
}

class JwtAuthenticator {
  private config: JwtConfig;
  
  constructor(config: JwtConfig) {
    this.config = config;
  }
  
  generateToken(userId: string, roles: string[], permissions: string[]): string {
    const payload: JwtPayload = {
      sub: userId,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + parseInt(this.config.expiresIn),
      roles,
      permissions
    };
    
    // Sign the token
    return jwt.sign(payload, this.config.secret);
  }
  
  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.config.secret) as JwtPayload;
    } catch (error) {
      return null;
    }
  }
  
  // Additional methods for token management
}
```

#### Security Considerations

- JWT secrets are stored securely and rotated regularly
- Tokens have short expiration times
- Refresh token rotation for extended sessions
- Tokens include only necessary claims
- Token revocation mechanism for logout/security incidents

### 3. Session Management

Session management is used to track user sessions and enforce security policies.

#### Implementation Details

```typescript
interface Session {
  id: string;
  userId: string;
  created: Date;
  lastActive: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isValid: boolean;
}

class SessionManager {
  private sessions: Map<string, Session>;
  private sessionTTL: number; // in milliseconds
  
  constructor(sessionTTL: number = 3600000) { // Default: 1 hour
    this.sessions = new Map();
    this.sessionTTL = sessionTTL;
    
    // Set up periodic cleanup of expired sessions
    setInterval(() => this.cleanupExpiredSessions(), 300000); // Every 5 minutes
  }
  
  createSession(userId: string, ipAddress: string, userAgent: string): Session {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    
    const session: Session = {
      id: sessionId,
      userId,
      created: now,
      lastActive: now,
      expiresAt: new Date(now.getTime() + this.sessionTTL),
      ipAddress,
      userAgent,
      isValid: true
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  validateSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) {
      return false;
    }
    
    const session = this.sessions.get(sessionId)!;
    
    if (!session.isValid || new Date() > session.expiresAt) {
      return false;
    }
    
    // Update last active timestamp
    session.lastActive = new Date();
    
    // Extend expiration
    session.expiresAt = new Date(Date.now() + this.sessionTTL);
    
    return true;
  }
  
  invalidateSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) {
      return false;
    }
    
    const session = this.sessions.get(sessionId)!;
    session.isValid = false;
    
    return true;
  }
  
  private cleanupExpiredSessions(): void {
    const now = new Date();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.isValid || session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
```

#### Security Considerations

- Sessions have limited lifetime
- Automatic cleanup of expired sessions
- IP address and user agent validation
- Session invalidation on logout
- Concurrent session limits (optional)

## Authorization Mechanisms

### 1. Role-Based Access Control (RBAC)

RBAC is used to manage permissions based on user roles.

#### Implementation Details

```typescript
interface Role {
  name: string;
  description: string;
  permissions: Set<string>;
}

interface UserRoles {
  userId: string;
  roles: Set<string>;
}

class RoleManager {
  private roles: Map<string, Role>;
  private userRoles: Map<string, UserRoles>;
  
  constructor() {
    this.roles = new Map();
    this.userRoles = new Map();
    
    // Initialize with default roles
    this.initializeDefaultRoles();
  }
  
  private initializeDefaultRoles(): void {
    // Admin role
    this.roles.set('admin', {
      name: 'admin',
      description: 'Administrator with full access',
      permissions: new Set([
        'user:read', 'user:write',
        'agent:read', 'agent:write',
        'health_data:read', 'health_data:write',
        'settings:read', 'settings:write'
      ])
    });
    
    // User role
    this.roles.set('user', {
      name: 'user',
      description: 'Standard user',
      permissions: new Set([
        'user:read',
        'agent:read',
        'health_data:read', 'health_data:write',
        'settings:read', 'settings:write'
      ])
    });
    
    // Guest role
    this.roles.set('guest', {
      name: 'guest',
      description: 'Guest user with limited access',
      permissions: new Set([
        'agent:read'
      ])
    });
  }
  
  hasPermission(userId: string, permission: string): boolean {
    if (!this.userRoles.has(userId)) {
      return false;
    }
    
    const userRoleNames = this.userRoles.get(userId)!.roles;
    
    for (const roleName of userRoleNames) {
      if (!this.roles.has(roleName)) {
        continue;
      }
      
      const role = this.roles.get(roleName)!;
      
      if (role.permissions.has(permission) || role.permissions.has('*')) {
        return true;
      }
    }
    
    return false;
  }
  
  // Additional methods for role management
}
```

#### Security Considerations

- Principle of least privilege
- Role hierarchy for permission inheritance
- Regular review of role assignments
- Audit logging for role changes
- Separation of duties for sensitive operations

### 2. Resource-Based Permissions

Resource-based permissions control access to specific resources.

#### Implementation Details

```typescript
interface ResourcePermission {
  resourceType: string;
  resourceId: string;
  userId: string;
  actions: Set<string>;
}

class ResourcePermissionManager {
  private permissions: ResourcePermission[];
  
  constructor() {
    this.permissions = [];
    // Load permissions from storage
  }
  
  hasPermission(userId: string, resourceType: string, resourceId: string, action: string): boolean {
    // Check for matching permission
    return this.permissions.some(permission => 
      permission.userId === userId &&
      permission.resourceType === resourceType &&
      permission.resourceId === resourceId &&
      permission.actions.has(action)
    );
  }
  
  grantPermission(userId: string, resourceType: string, resourceId: string, action: string): void {
    // Find existing permission or create new one
    let permission = this.permissions.find(p => 
      p.userId === userId &&
      p.resourceType === resourceType &&
      p.resourceId === resourceId
    );
    
    if (!permission) {
      permission = {
        resourceType,
        resourceId,
        userId,
        actions: new Set()
      };
      this.permissions.push(permission);
    }
    
    // Add the action
    permission.actions.add(action);
  }
  
  revokePermission(userId: string, resourceType: string, resourceId: string, action: string): boolean {
    const permission = this.permissions.find(p => 
      p.userId === userId &&
      p.resourceType === resourceType &&
      p.resourceId === resourceId
    );
    
    if (!permission) {
      return false;
    }
    
    return permission.actions.delete(action);
  }
  
  // Additional methods for permission management
}
```

#### Security Considerations

- Fine-grained access control
- Resource ownership model
- Permission inheritance for hierarchical resources
- Default deny for unspecified permissions
- Regular permission audits

### 3. Permission Enforcement

Permission enforcement ensures that authorization checks are consistently applied.

#### Implementation Details

```typescript
interface AuthContext {
  userId: string;
  roles: string[];
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
}

class PermissionEnforcer {
  private roleManager: RoleManager;
  private resourcePermissionManager: ResourcePermissionManager;
  
  constructor(
    roleManager: RoleManager,
    resourcePermissionManager: ResourcePermissionManager
  ) {
    this.roleManager = roleManager;
    this.resourcePermissionManager = resourcePermissionManager;
  }
  
  async enforcePermission(
    context: AuthContext,
    permission: string,
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    // First check role-based permissions
    const hasRolePermission = this.roleManager.hasPermission(
      context.userId,
      permission
    );
    
    if (hasRolePermission) {
      return true;
    }
    
    // If resource is specified, check resource-based permissions
    if (resourceType && resourceId) {
      return this.resourcePermissionManager.hasPermission(
        context.userId,
        resourceType,
        resourceId,
        permission
      );
    }
    
    return false;
  }
  
  // Middleware for Express.js
  createAuthMiddleware(permission: string, resourceType?: string): RequestHandler {
    return async (req, res, next) => {
      // Extract auth context from request
      const context: AuthContext = {
        userId: req.user?.id,
        roles: req.user?.roles || [],
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || ''
      };
      
      // Get resource ID from request if applicable
      const resourceId = resourceType ? req.params.id : undefined;
      
      // Check permission
      const hasPermission = await this.enforcePermission(
        context,
        permission,
        resourceType,
        resourceId
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          error: {
            code: 'forbidden',
            message: 'You do not have permission to access this resource'
          }
        });
      }
      
      next();
    };
  }
}
```

#### Security Considerations

- Consistent enforcement across all endpoints
- Defense in depth with multiple authorization layers
- Clear error messages without information leakage
- Audit logging for authorization decisions
- Regular security reviews

## Integration with MCP Server

### Authentication Middleware

```typescript
// Example Express.js middleware for JWT authentication
function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'unauthorized',
        message: 'Authentication required'
      }
    });
  }
  
  const token = authHeader.split(' ')[1];
  const jwtAuthenticator = new JwtAuthenticator(config.jwt);
  
  const payload = jwtAuthenticator.verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({
      error: {
        code: 'invalid_token',
        message: 'Invalid or expired token'
      }
    });
  }
  
  // Attach user info to request
  req.user = {
    id: payload.sub,
    roles: payload.roles,
    permissions: payload.permissions
  };
  
  next();
}
```

### MCP Tool Authorization

```typescript
// Example of authorization wrapper for MCP tools
function authorizedTool(
  name: string,
  description: string,
  paramSchema: any,
  handler: ToolHandler,
  requiredPermission: string
) {
  return async (params: any, context: any) => {
    // Check if user has required permission
    const permissionEnforcer = new PermissionEnforcer(
      roleManager,
      resourcePermissionManager
    );
    
    const authContext: AuthContext = {
      userId: context.userId,
      roles: context.roles || [],
      sessionId: context.sessionId,
      ipAddress: context.ipAddress || '',
      userAgent: context.userAgent || ''
    };
    
    const hasPermission = await permissionEnforcer.enforcePermission(
      authContext,
      requiredPermission
    );
    
    if (!hasPermission) {
      throw new Error('Permission denied');
    }
    
    // Call the original handler
    return handler(params, context);
  };
}

// Usage example
server.tool(
  "dust_agent_chat",
  "Chat with a Dust health agent",
  {
    agentId: z.string({
      description: "ID of the Dust agent to chat with"
    }),
    message: z.string({
      description: "Message to send to the agent"
    })
  },
  authorizedTool(
    async (params) => {
      // Tool implementation
    },
    'agent:read'
  )
);
```

## Security Best Practices

### 1. Credential Management

- Store secrets in environment variables
- Use a secure vault for production secrets
- Implement key rotation policies
- Never log credentials or tokens
- Use strong password hashing (Argon2id)

### 2. Transport Security

- Enforce HTTPS for all communications
- Implement proper TLS configuration
- Use secure cookies with appropriate flags
- Implement HSTS headers
- Configure CSP headers

### 3. Input Validation

- Validate all input parameters
- Use Zod schemas for validation
- Implement strict type checking
- Sanitize user input
- Prevent injection attacks

### 4. Audit and Monitoring

- Log all authentication attempts
- Track authorization decisions
- Monitor for suspicious activity
- Implement alerting for security events
- Regular security reviews

### 5. Rate Limiting and Abuse Prevention

- Implement request rate limiting
- Use progressive delays for failed attempts
- Monitor for brute force attempts
- Implement CAPTCHA for suspicious activity
- IP-based blocking for abuse

## Decision

Based on the authentication and authorization design, we will:

1. Implement API key authentication for server-to-server communication
2. Use JWT authentication for user sessions
3. Create a comprehensive RBAC system
4. Implement resource-based permissions for fine-grained control
5. Develop consistent permission enforcement across the application
6. Follow security best practices for credential management

## Consequences

- The authentication system provides multiple secure options
- Authorization is fine-grained and consistent
- Security is implemented as a cross-cutting concern
- The design supports both human and machine users
- Regular security maintenance will be required
- Performance impact of authorization checks must be monitored

## Open Questions

- How will we handle federated authentication in the future?
- What's the optimal approach for managing API key rotation?
- How should we implement multi-factor authentication?

## References

- [OWASP Authentication Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
