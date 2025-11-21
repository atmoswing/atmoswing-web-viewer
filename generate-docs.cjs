/**
 * Documentation Generator Script
 *
 * This script generates comprehensive markdown documentation from JSDoc comments
 * in the codebase. It creates a structured documentation site in the docs/ directory.
 */

const fs = require('fs');
const path = require('path');
const jsdoc2md = require('jsdoc-to-markdown');
const { glob } = require('glob');
const { marked } = require('marked');

const DOCS_DIR = path.join(__dirname, 'docs');
const SRC_DIR = path.join(__dirname, 'src');

// Documentation structure
const sections = [
  { name: 'API Services', pattern: 'src/services/**/*.js', output: 'api-services.md' },
  { name: 'Contexts', pattern: 'src/contexts/**/*.{js,jsx}', output: 'contexts.md' },
  { name: 'Hooks', pattern: 'src/hooks/**/*.js', output: 'hooks.md' },
  { name: 'Map Hooks', pattern: 'src/components/map/hooks/**/*.js', output: 'map-hooks.md' },
  { name: 'Utils', pattern: 'src/utils/**/*.js', output: 'utils.md' },
  { name: 'Map Utils', pattern: 'src/components/map/utils/**/*.js', output: 'map-utils.md' },
  { name: 'Components', pattern: 'src/components/**/*.{js,jsx}', output: 'components.md' },
];

/**
 * Generate HTML page from markdown content
 */
function generateHtmlFromMarkdown(markdownContent, title) {
  const htmlBody = marked(markdownContent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - AtmoSwing Web Viewer Documentation</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: #f6f8fa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header-content {
            max-width: 980px;
            margin: 0 auto;
            padding: 0 45px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            margin: 0;
            font-size: 1.5em;
        }
        .header a {
            color: white;
            text-decoration: none;
            padding: 8px 16px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            transition: background 0.2s;
        }
        .header a:hover {
            background: rgba(255,255,255,0.3);
        }
        .container {
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
        }
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
        }
        .markdown-body pre {
            background-color: #f6f8fa;
            border-radius: 6px;
        }
        .markdown-body code {
            background-color: #f6f8fa;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .markdown-body pre code {
            background-color: transparent;
            padding: 0;
        }
        footer {
            text-align: center;
            padding: 20px;
            color: #586069;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>📚 AtmoSwing Web Viewer Docs</h1>
            <a href="index.html">← Back to Home</a>
        </div>
    </div>

    <div class="container">
        <div class="markdown-body">
            ${htmlBody}
        </div>
    </div>

    <footer>
        <p>Generated automatically from JSDoc comments | <a href="https://github.com/atmoswing/atmoswing-web-viewer">AtmoSwing Web Viewer</a></p>
    </footer>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
</body>
</html>`;
}

/**
 * Ensure docs directory exists
 */
function ensureDocsDir() {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
}

/**
 * Generate documentation for a section
 */
async function generateSectionDocs(section) {
  console.log(`Generating documentation for: ${section.name}`);

  try {
    const files = glob.sync(section.pattern, { absolute: true });

    if (files.length === 0) {
      console.log(`  No files found for pattern: ${section.pattern}`);
      return;
    }

    console.log(`  Found ${files.length} files`);

    const markdown = await jsdoc2md.render({
      files: files,
      'heading-depth': 2,
      'example-lang': 'javascript',
      'no-cache': true
    });

    const header = `# ${section.name}\n\n`;
    const fileList = `## Files\n\n${files.map(f => `- ${path.relative(process.cwd(), f)}`).join('\n')}\n\n---\n\n`;
    const content = header + fileList + (markdown || `_No JSDoc documentation found in these files._\n\nTo add documentation, use JSDoc comments like:\n\n\`\`\`javascript\n/**\n * Function description.\n * @param {string} param - Parameter description\n * @returns {Object} Return value description\n */\n\`\`\``);

    const outputPath = path.join(DOCS_DIR, section.output);
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`  ✓ Generated: ${section.output}`);

    // Also generate HTML version
    const htmlContent = generateHtmlFromMarkdown(content, section.name);
    const htmlPath = path.join(DOCS_DIR, section.output.replace('.md', '.html'));
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log(`  ✓ Generated: ${section.output.replace('.md', '.html')}`);
  } catch (error) {
    console.error(`  ✗ Error generating ${section.name}:`, error.message);
  }
}

/**
 * Generate index.html for GitHub Pages
 */
function generateIndexHtml() {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AtmoSwing Web Viewer - Documentation</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: #f6f8fa;
        }
        .container {
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
        }
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
        }
        .header {
            text-align: center;
            padding: 40px 0 20px;
        }
        .header h1 {
            font-size: 3em;
            margin: 0;
            color: #24292e;
        }
        .header p {
            font-size: 1.2em;
            color: #586069;
            margin: 10px 0 0;
        }
        .nav-sections {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .nav-card {
            background: #f6f8fa;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            padding: 20px;
            text-decoration: none;
            color: #24292e;
            transition: all 0.2s ease;
        }
        .nav-card:hover {
            border-color: #0969da;
            box-shadow: 0 3px 8px rgba(0,0,0,0.12);
            transform: translateY(-2px);
        }
        .nav-card h3 {
            margin: 0 0 10px 0;
            color: #0969da;
            font-size: 1.2em;
        }
        .nav-card p {
            margin: 0;
            color: #586069;
            font-size: 0.9em;
        }
        .features {
            margin: 40px 0;
        }
        .features ul {
            list-style: none;
            padding: 0;
        }
        .features li {
            padding: 10px 0;
            border-bottom: 1px solid #e1e4e8;
        }
        .features li:last-child {
            border-bottom: none;
        }
        .features strong {
            color: #0969da;
        }
        .tech-stack {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 20px 0;
        }
        .tech-badge {
            background: #ddf4ff;
            color: #0969da;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
        }
        footer {
            text-align: center;
            padding: 20px;
            color: #586069;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 AtmoSwing Web Viewer</h1>
        <p>API Documentation</p>
    </div>

    <div class="container">
        <div class="markdown-body">
            <p>This documentation is automatically generated from JSDoc comments in the source code.</p>

            <h2>📚 Documentation Sections</h2>
            <div class="nav-sections">
${sections.map(s => {
  const filename = s.output.replace('.md', '.html');
  return `                <a href="${filename}" class="nav-card">
                    <h3>${s.name}</h3>
                    <p>Documentation for ${s.name.toLowerCase()}</p>
                </a>`;
}).join('\n')}
            </div>

            <h2>🚀 Project Overview</h2>
            <p>AtmoSwing Web Viewer is a React-based web application for visualizing atmospheric forecasts.
            It provides interactive maps, time series charts, and analog date analysis tools.</p>

            <div class="features">
                <h3>Key Features</h3>
                <ul>
                    <li><strong>Interactive Map Visualization</strong>: OpenLayers-based map with WMTS layers and forecast points</li>
                    <li><strong>Forecast Analysis</strong>: View analog dates, distributions, and time series</li>
                    <li><strong>Multiple Workspaces</strong>: Support for different forecast regions and configurations</li>
                    <li><strong>Runtime Configuration</strong>: Dynamic configuration without rebuilding</li>
                </ul>
            </div>

            <h3>Technology Stack</h3>
            <div class="tech-stack">
                <span class="tech-badge">React 19</span>
                <span class="tech-badge">OpenLayers 10</span>
                <span class="tech-badge">Material-UI (MUI)</span>
                <span class="tech-badge">D3.js</span>
                <span class="tech-badge">Vite</span>
                <span class="tech-badge">i18next</span>
            </div>

            <h3>Architecture</h3>
            <p>The application follows a modern React architecture:</p>
            <ul>
                <li><strong>Contexts</strong>: Manage global state (config, forecasts, selections)</li>
                <li><strong>Hooks</strong>: Encapsulate reusable logic (caching, API requests, map interactions)</li>
                <li><strong>Services</strong>: Handle API communication with the backend</li>
                <li><strong>Utils</strong>: Provide utility functions for data processing and formatting</li>
                <li><strong>Components</strong>: UI building blocks organized by feature</li>
            </ul>

            <h3>Getting Started</h3>
            <p>See the main <a href="https://github.com/atmoswing/atmoswing-web-viewer">README.md</a> for development instructions.</p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #586069; font-size: 0.9em;">
                <em>Last updated: ${new Date().toISOString()}</em><br>
                <em>Generated by: npm run docs</em>
            </p>
        </div>
    </div>

    <footer>
        <p>Generated automatically from JSDoc comments | AtmoSwing Web Viewer &copy; 2025</p>
    </footer>
</body>
</html>`;

  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), htmlContent, 'utf8');
  console.log('✓ Generated: index.html');
}

/**
 * Generate Jekyll config for GitHub Pages
 */
function generateJekyllConfig() {
  const config = `title: AtmoSwing Web Viewer Documentation
description: API Documentation for AtmoSwing Web Viewer
theme: jekyll-theme-cayman
markdown: kramdown
kramdown:
  input: GFM
  syntax_highlighter: rouge
`;

  fs.writeFileSync(path.join(DOCS_DIR, '_config.yml'), config, 'utf8');
  console.log('✓ Generated: _config.yml');
}

/**
 * Generate index page (README.md)
 */
function generateIndex() {
  const content = `# AtmoSwing Web Viewer - API Documentation

This documentation is automatically generated from JSDoc comments in the source code.

## 📚 Documentation Sections

${sections.map(s => `- [${s.name}](${s.output})`).join('\n')}

## 🚀 Project Overview

AtmoSwing Web Viewer is a React-based web application for visualizing atmospheric forecasts.
It provides interactive maps, time series charts, and analog date analysis tools.

### Key Features

- **Interactive Map Visualization**: OpenLayers-based map with WMTS layers and forecast points
- **Forecast Analysis**: View analog dates, distributions, and time series
- **Multiple Workspaces**: Support for different forecast regions and configurations
- **Runtime Configuration**: Dynamic configuration without rebuilding

### Technology Stack

- **React 19** with hooks and context
- **OpenLayers 10** for interactive mapping
- **Material-UI (MUI)** for UI components
- **D3.js** for data visualization and charts
- **Vite** for fast development and building
- **i18next** for internationalization

### Architecture

The application follows a modern React architecture:

- **Contexts**: Manage global state (config, forecasts, selections)
- **Hooks**: Encapsulate reusable logic (caching, API requests, map interactions)
- **Services**: Handle API communication with the backend
- **Utils**: Provide utility functions for data processing and formatting
- **Components**: UI building blocks organized by feature

### Getting Started

See the main [README.md](../README.md) for development instructions.

For information about contributing to the documentation, see [DOCUMENTATION.md](../DOCUMENTATION.md).

## 📝 Documentation Guide

All public APIs should be documented using JSDoc comments. Example:

\`\`\`javascript
/**
 * Fetches forecast data for a specific region and date.
 *
 * @param {string} region - The region identifier
 * @param {string} date - ISO date string
 * @returns {Promise<Object>} Forecast data object
 * @example
 * const data = await getForecast('alps', '2023-01-15');
 */
export async function getForecast(region, date) {
  // implementation
}
\`\`\`

---

*Last updated: ${new Date().toISOString()}*
*Generated by: \`npm run docs\`*
`;

  fs.writeFileSync(path.join(DOCS_DIR, 'README.md'), content, 'utf8');
  console.log('✓ Generated: README.md (index)');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting documentation generation...\n');

  ensureDocsDir();

  for (const section of sections) {
    await generateSectionDocs(section);
  }

  generateIndex();
  generateIndexHtml();
  generateJekyllConfig();

  console.log('\n✅ Documentation generation complete!');
  console.log(`📁 Output directory: ${DOCS_DIR}`);
  console.log('\n💡 To view the documentation:');
  console.log('   - Open docs/index.html in your browser');
  console.log('   - Or run: npm run docs:serve');
  console.log('   - GitHub Pages: https://atmoswing.org/atmoswing-web-viewer/');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

