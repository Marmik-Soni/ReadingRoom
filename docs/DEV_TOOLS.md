# Development Tools Configuration

This project is configured with Prettier, ESLint, and Husky for code quality and consistency.

## 🎨 Prettier

**Configuration**: `.prettierrc.json`

- Auto-formats code on save and commit
- Includes Tailwind CSS class sorting plugin
- Print width: 100 characters
- Uses semicolons, double quotes, and 2-space tabs

## 🔍 ESLint

**Configuration**: `eslint.config.mjs`

Enhanced rules include:

- **TypeScript**: Strict type checking, consistent type imports, unused variable warnings
- **React**: Hooks validation, self-closing components, JSX best practices
- **Code Quality**: Enforces const over let, arrow functions, template literals
- **Next.js**: Full Next.js best practices integration

## 🐺 Husky + Lint-Staged

**Pre-commit Hook**: Automatically runs on `git commit`

What runs on commit:

- ESLint auto-fix on all staged `.js/.jsx/.ts/.tsx` files
- Prettier formatting on all staged files
- Only processes files you're committing (super fast!)

## 📝 Available Scripts

```bash
pnpm dev              # Start development server
pnpm build            # Production build
pnpm lint             # Check for lint errors
pnpm lint:fix         # Auto-fix lint errors
pnpm format           # Format all files with Prettier
pnpm format:check     # Check if files are formatted
```

## 🚀 Usage

### Daily Development

1. Write code normally
2. Save files (Prettier formats automatically in most editors)
3. Commit changes - Husky will auto-lint and format

### Manual Formatting

```bash
pnpm format           # Format everything
pnpm lint:fix         # Fix all linting issues
```

## ⚙️ IDE Setup (Optional)

### VS Code

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 🎯 What's Enforced

- ✅ Consistent code formatting
- ✅ TypeScript best practices
- ✅ React/Next.js patterns
- ✅ No unused variables or imports
- ✅ Proper type imports
- ✅ Self-closing components
- ✅ Consistent quotes and semicolons
- ✅ Arrow function consistency
- ✅ Template literals over concatenation

All configured! Your code will stay clean and consistent automatically. 🎉
