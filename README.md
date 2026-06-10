# Praxis Docs

Documentation site built with [Markdoc](https://markdoc.dev) and deployed on GitHub Pages.

## For Documentation Writers

### Adding/Editing Documentation

1. All documentation lives in the `docs/` folder
2. Create or edit `.md` (Markdown) files
3. Commit and push to GitHub - the site rebuilds automatically

### Page Structure

Each page should start with frontmatter:

```yaml
---
title: Your Page Title
description: A brief description of the page
order: 1
---

# Your Page Title

Your content here...
```

- `title` - Appears in navigation and browser tab
- `description` - For SEO
- `order` - Controls navigation order (lower = higher)

### Creating Sections

Create folders in `docs/` to organize pages into sections:

```
docs/
  index.md           # Homepage
  getting-started.md # Top-level page
  guides/            # Section folder
    formatting.md
    images.md
```

## For Developers

### Local Development

```bash
# Install dependencies
npm install

# Build the site
npm run build

# Watch for changes
npm run dev

# Serve locally
npm run serve
```

### Deployment

The site automatically deploys to GitHub Pages when you push to `main`.

### Setup GitHub Pages

1. Go to repository Settings > Pages
2. Under "Build and deployment", select "GitHub Actions"
3. Push to main branch to trigger deployment

## Project Structure

```
├── docs/              # Markdown documentation files
├── scripts/
│   └── build.js       # Build script
├── template.html      # HTML template
├── dist/              # Built output (gitignored)
├── .github/
│   └── workflows/
│       └── deploy.yml # GitHub Actions workflow
└── package.json
```
