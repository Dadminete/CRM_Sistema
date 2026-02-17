# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | :white_check_mark: |
| < 3.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to your security team or project maintainer.

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information (as much as you can provide) to help us better understand the nature and scope of the possible issue:

- Type of issue (e.g., SQL injection, XSS, authentication bypass, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Measures Implemented

### Authentication & Authorization

- ✅ JWT-based authentication with configurable expiration
- ✅ bcrypt password hashing (10 salt rounds)
- ✅ Role-based access control (RBAC) with granular permissions
- ✅ Session tracking with IP and User-Agent
- ✅ Secure password reset with one-time tokens (1-hour expiration)

### Input Validation & Sanitization

- ✅ Zod schema validation on all API endpoints
- ✅ SQL injection prevention via Drizzle ORM parameterized queries
- ✅ XSS protection via React's automatic escaping
- ✅ CSRF protection via Next.js built-in middleware

### Rate Limiting

- ✅ Login endpoints: 5 attempts per 15 minutes
- ✅ Auth endpoints: 10 attempts per 15 minutes
- ✅ General API: 100 requests per 15 minutes
- ✅ Password reset: 3 attempts per hour

### Data Protection

- ✅ Environment variables for sensitive data
- ✅ Secure headers configuration
- ✅ HTTPS enforced in production
- ✅ Connection pooling with Neon Serverless
- ✅ Audit logging for all critical operations

### Monitoring & Auditing

- ✅ Comprehensive audit trail (bitacora table)
- ✅ Login/logout tracking
- ✅ Failed authentication attempt logging
- ✅ Data change tracking (before/after states)
- ✅ IP address and User-Agent logging

## Security Best Practices for Deployment

### Environment Variables

**Required:**

```env
DATABASE_URL="postgresql://..."          # Use strong credentials
JWT_SECRET="<min-32-characters>"         # MUST be changed in production
JWT_EXPIRES_IN="30d"
NEXT_PUBLIC_APP_URL="https://..."        # Use HTTPS in production
```

### Database Security

- Use strong PostgreSQL passwords
- Enable SSL/TLS for database connections
- Restrict database access to application IPs only
- Regular backups with encryption
- Keep PostgreSQL updated

### Application Security

- Keep dependencies updated (`npm audit`)
- Enable HTTPS (handled by Vercel/hosting)
- Set secure CSP headers
- Regular security audits
- Monitor audit logs for suspicious activity

### Server Hardening

- Disable unnecessary services
- Configure firewall rules
- Use fail2ban or similar for brute-force protection
- Regular system updates
- Monitor server logs

## Known Limitations

1. **Email Integration**: Password reset currently returns debug tokens in development. Email integration pending (nodemailer setup required).

2. **PDF Exports**: Installation failed during implementation. Consider alternative libraries (html2pdf, puppeteer).

3. **Session Management**: Sessions stored in database but not automatically cleaned up. Consider implementing a cleanup job.

## Security Checklist for Production

- [ ] Change `JWT_SECRET` to a strong random value (min 32 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Review and adjust rate limits based on traffic
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Review all environment variables
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Test authentication flows
- [ ] Verify CORS configuration
- [ ] Review audit logs regularly
- [ ] Set up log retention policies
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Implement email notifications for critical events

## Vulnerability Disclosure Timeline

- **Day 0**: Vulnerability reported
- **Day 1**: Acknowledge receipt and begin investigation
- **Day 7**: Provide initial assessment
- **Day 30**: Security patch released (target)
- **Day 45**: Public disclosure (if patch available)

## Contact

For security concerns, please contact the repository maintainers through private channels.

---

**Last Updated**: February 2026
