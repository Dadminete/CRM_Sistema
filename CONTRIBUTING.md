# Contributing to Sistema de Gestión v3.0

Thank you for your interest in contributing! This document provides guidelines and best practices for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what is best for the project
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ (recommended 20+)
- npm 9+
- PostgreSQL database (Neon recommended)
- Git

### Initial Setup

1. **Fork the repository**

   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Sistema_de_Gestion_v3.0.git
   cd Sistema_de_Gestion_v3.0
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run migrations**
   Execute SQL files in `migrations/` folder in your database

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/feature-name`: New features
- `fix/bug-name`: Bug fixes
- `refactor/area-name`: Code refactoring
- `test/test-name`: Adding or updating tests

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Making Changes

1. Write your code
2. Write or update tests
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Format code: `npm run format`
6. Commit your changes (see [Commit Guidelines](#commit-guidelines))

## Code Standards

### TypeScript Guidelines

1. **Use TypeScript strict mode**
   - All files must be `.ts` or `.tsx`
   - No `any` types (use `unknown` if necessary)
   - Explicit return types for functions
   - Proper type exports/imports

2. **Naming Conventions**

   ```typescript
   // Files: kebab-case
   user - profile.tsx;
   api - auth.ts;

   // Components: PascalCase
   UserProfile;
   DataTable;

   // Functions: camelCase
   getUserById();
   fetchData();

   // Constants: UPPER_SNAKE_CASE
   const MAX_RETRY_ATTEMPTS = 3;
   const DEFAULT_PAGE_SIZE = 10;

   // Interfaces/Types: PascalCase
   interface UserProfile {}
   type ApiResponse<T> = {};
   ```

3. **Function Guidelines**
   - Max complexity: 10
   - Max lines: 50 per function
   - Single responsibility principle
   - Descriptive names

4. **Component Guidelines**
   - Max lines: 300 per component
   - Extract logic to custom hooks
   - Memoize expensive computations
   - Use `React.memo()` for expensive renders

### File Organization

```typescript
// 1. React/Next.js imports
import { useState } from "react";
import { useRouter } from "next/navigation";

// 2. External libraries
import { z } from "zod";
import { toast } from "sonner";

// 3. Internal imports (absolute paths)
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";

// 4. Types
import type { User } from "@/types/user";

// 5. Component/function definition
export function MyComponent() {
  // ...
}
```

### API Route Guidelines

```typescript
// src/app/api/example/route.ts
import { NextRequest } from "next/server";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { mySchema } from "@/lib/db/schema";

// GET endpoint
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // 1. Parse and validate query params
      // 2. Check permissions
      // 3. Query database
      // 4. Return response
      return successResponse({ data: [] });
    } catch (error) {
      console.error("Error:", error);
      return errorResponse("Internal error", 500);
    }
  },
  { requiredPermission: "resource:read" },
);
```

### Database Queries

```typescript
// ✅ Good: Use Drizzle ORM
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

// ❌ Bad: Raw SQL (use only when necessary)
const result = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `perf`: Performance improvements
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD changes

### Examples

```bash
feat(auth): add password reset functionality

Implement secure password reset with crypto tokens.
Tokens expire after 1 hour and are single-use.

Closes #123

---

fix(api): resolve pagination issue in users endpoint

The offset calculation was incorrect for pages > 1.
Updated to use (page - 1) * limit.

Fixes #456

---

test(auth): add unit tests for JWT functions

Added 13 tests covering:
- Password hashing
- Token generation and verification
- Session management

---

docs(readme): update installation instructions

Added environment variable documentation and
database migration steps.
```

## Pull Request Process

### Before Submitting

1. **Update your branch**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout your-branch
   git rebase develop
   ```

2. **Run quality checks**

   ```bash
   npm run lint           # No errors
   npm run format:check   # All files formatted
   npm test               # All tests pass
   npm run build          # Builds successfully
   ```

3. **Update documentation**
   - Update README.md if needed
   - Add JSDoc comments to new functions
   - Update CHANGELOG.md

### Submitting a Pull Request

1. **Push your branch**

   ```bash
   git push origin your-branch
   ```

2. **Create PR on GitHub**
   - Base: `develop` (not `main`)
   - Provide clear title and description
   - Link related issues
   - Add screenshots/GIFs for UI changes

3. **PR Description Template**

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing

   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed

   ## Checklist

   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings
   - [ ] Tests pass locally

   ## Related Issues

   Closes #issue_number

   ## Screenshots (if applicable)
   ```

4. **Respond to feedback**
   - Address review comments promptly
   - Push updates to the same branch
   - Resolve conversations when addressed

### PR Review Criteria

Reviewers will check:

- ✅ Code quality and readability
- ✅ Test coverage
- ✅ Performance implications
- ✅ Security considerations
- ✅ Breaking changes documented
- ✅ Documentation updated
- ✅ Follows project conventions

## Testing Guidelines

### Writing Tests

1. **Unit Tests** (`src/tests/lib/`)

   ```typescript
   import { describe, it, expect } from "vitest";
   import { myFunction } from "@/lib/my-module";

   describe("myFunction", () => {
     it("should handle valid input", () => {
       const result = myFunction("valid");
       expect(result).toBe("expected");
     });

     it("should handle edge cases", () => {
       expect(myFunction("")).toBe("");
       expect(myFunction(null)).toBe(null);
     });
   });
   ```

2. **Integration Tests** (`src/tests/integration/`)
   ```typescript
   describe("API Integration", () => {
     it("should complete authentication flow", async () => {
       // Test multiple components working together
     });
   });
   ```

### Test Coverage Goals

- **Minimum**: 70% overall coverage
- **Critical paths**: 90%+ coverage (auth, payments, data modification)
- **New features**: Must include tests

### Running Tests

```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # Coverage report
npm run test:ui       # Interactive UI
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues and PRs first

Thank you for contributing! 🎉

---

**Last Updated**: February 2026
