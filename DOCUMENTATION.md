# Documentation Guide

This guide explains how to contribute to and maintain the code documentation for AtmoSwing Web Viewer.

## Overview

The project uses **JSDoc** to document JavaScript and JSX code. Documentation is automatically generated from JSDoc comments in the source code and deployed to GitHub Pages.

## Documentation Tools

### Available Commands

```bash
# Generate all documentation
npm run docs

# Generate JSDoc HTML format
npm run docs:jsdoc

# Generate and serve documentation locally (requires Python)
npm run docs:serve
```

## Writing JSDoc Comments

### Module Documentation

Every file should start with a module-level comment:

```javascript
/**
 * @module path/to/module
 * @description Brief description of what this module does.
 *
 * More detailed explanation if needed.
 */
```

### Function Documentation

Document all exported functions:

```javascript
/**
 * Brief one-line description.
 *
 * More detailed explanation of what the function does,
 * including algorithm details, side effects, etc.
 *
 * @param {string} paramName - Description of parameter
 * @param {Object} options - Options object
 * @param {boolean} [options.optional=true] - Optional parameter with default
 * @returns {Promise<Array>} Description of return value
 * @throws {Error} When something goes wrong
 * @example
 * // Example usage
 * const result = await myFunction('test', { optional: false });
 */
export async function myFunction(paramName, options = {}) {
  // ...
}
```

### React Component Documentation

For React components:

```javascript
/**
 * Component description.
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Title to display
 * @param {React.ReactNode} props.children - Child elements
 * @param {Function} [props.onClose] - Optional close handler
 * @returns {React.ReactElement}
 * @example
 * <MyComponent title="Hello">
 *   <p>Content</p>
 * </MyComponent>
 */
export function MyComponent({ title, children, onClose }) {
  // ...
}
```

### React Hooks Documentation

For custom hooks:

```javascript
/**
 * Custom hook for managing some state.
 *
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async fetch function
 * @param {Array} deps - Dependency array
 * @returns {Object} Hook state
 * @returns {*} returns.data - The data
 * @returns {boolean} returns.loading - Loading state
 * @returns {Function} returns.refresh - Refresh function
 * @example
 * const { data, loading, refresh } = useMyHook('key', fetchData, [deps]);
 */
export function useMyHook(key, fetchFn, deps) {
  // ...
}
```

### Type Definitions

Use JSDoc for type hints:

```javascript
/**
 * @typedef {Object} ForecastEntity
 * @property {number|string} id - Entity identifier
 * @property {string} name - Entity name
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * Processes forecast entities.
 * @param {Array<ForecastEntity>} entities - Array of entities
 * @returns {Map<string, ForecastEntity>}
 */
export function processEntities(entities) {
  // ...
}
```

## Documentation Structure

The generated documentation is organized into sections:

- **API Services** (`api-services.md`) - API client functions
- **Contexts** (`contexts.md`) - React contexts
- **Hooks** (`hooks.md`) - Custom React hooks
- **Map Hooks** (`map-hooks.md`) - Map-specific hooks
- **Utils** (`utils.md`) - Utility functions
- **Components** (`components.md`) - React components

## Automatic Documentation Generation

### GitHub Actions Workflow

The `.github/workflows/docs.yml` workflow automatically:

1. **Triggers on**:
   - Push to `main` or `dev` branches
   - Pull requests to `main`
   - Manual workflow dispatch
   - Changes to source files or documentation config

2. **Actions performed**:
   - Generates documentation using `npm run docs`
   - Uploads documentation as build artifacts
   - Deploys to GitHub Pages (on main/master branch only)

## Local Documentation Development

### Generate Documentation Locally

```bash
npm run docs
```

This creates a `docs/` directory with markdown files.

### Preview Documentation

If you have Python installed:

```bash
npm run docs:serve
```

Then open http://localhost:8080 in your browser.

Alternatively, use any static file server:

```bash
# Using Node.js http-server
npx http-server docs -p 8080

# Using Python 3
cd docs && python -m http.server 8080
```

## Best Practices

### 1. Document Public APIs

All exported functions, classes, and components should have JSDoc comments.

### 2. Keep Descriptions Clear

- First line: Brief summary (one sentence)
- Following paragraphs: Detailed explanation
- Use present tense ("Returns data" not "Will return data")

### 3. Document Parameters Thoroughly

- Include type information
- Describe what the parameter represents
- Note if optional and provide defaults
- Explain acceptable values or ranges

### 4. Provide Examples

Include code examples for complex functions:

```javascript
/**
 * @example
 * const result = await fetchData('region', '2023-01-01');
 * console.log(result.entities);
 */
```

### 5. Document Return Values

Be specific about return types and structure:

```javascript
/**
 * @returns {Promise<Object>} Response object
 * @returns {Array} returns.entities - List of entities
 * @returns {number} returns.count - Total count
 */
```

### 6. Note Side Effects

Document any side effects:

```javascript
/**
 * Updates the global configuration object.
 * @param {Object} config - New configuration
 */
```

### 7. Link Related Functions

Use `@see` to reference related functions:

```javascript
/**
 * @see normalizeEntitiesResponse
 * @see getEntities
 */
```

## Maintenance

### Updating Documentation

Documentation is regenerated automatically on every push to main branches. To manually trigger:

1. Go to **Actions** tab in GitHub
2. Select **Generate Documentation** workflow
3. Click **Run workflow**

### Reviewing Documentation

When reviewing pull requests:

1. Check that new/modified functions have JSDoc comments
2. Verify examples are accurate
3. Ensure type annotations are correct
4. Review generated documentation artifacts

## Resources

- [JSDoc Official Documentation](https://jsdoc.app/)
- [JSDoc Cheat Sheet](https://devhints.io/jsdoc)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
