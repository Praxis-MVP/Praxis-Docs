const fs = require('fs');
const path = require('path');
const Markdoc = require('@markdoc/markdoc');
const matter = require('gray-matter');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const TEMPLATE_PATH = path.join(__dirname, '..', 'template.html');

// Clean and recreate dist directory
function cleanDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Read template
const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

// Custom Markdoc config for common tags
const config = {
  tags: {
    callout: {
      render: 'div',
      attributes: {
        type: { type: String, default: 'note' }
      },
      transform(node, config) {
        const attributes = node.transformAttributes(config);
        const children = node.transformChildren(config);
        return new Markdoc.Tag('div', { class: `callout callout-${attributes.type}` }, children);
      }
    }
  },
  nodes: {
    fence: {
      render: 'pre',
      attributes: {
        language: { type: String }
      },
      transform(node, config) {
        const language = node.attributes.language || '';
        const content = node.children[0]?.attributes?.content || '';
        return new Markdoc.Tag(
          'pre',
          { class: 'code-block', 'data-language': language },
          [new Markdoc.Tag('code', { class: `language-${language}` }, [content])]
        );
      }
    }
  }
};

// Build navigation from docs
function buildNavigation(docsDir, basePath = '') {
  const items = [];
  const entries = fs.readdirSync(docsDir, { withFileTypes: true });

  // Sort: directories first, then files
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

    const fullPath = path.join(docsDir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      const children = buildNavigation(fullPath, relativePath);
      if (children.length > 0) {
        items.push({
          title: formatTitle(entry.name),
          children
        });
      }
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const { data } = matter(content);
      const slug = entry.name.replace('.md', '.html');
      const href = basePath ? `${basePath.replace(/\\/g, '/')}/${slug}` : slug;

      items.push({
        title: data.title || formatTitle(entry.name.replace('.md', '')),
        href,
        order: data.order || 999
      });
    }
  }

  // Sort by order, then by title
  return items.sort((a, b) => {
    if (a.children && !b.children) return -1;
    if (!a.children && b.children) return 1;
    const orderDiff = (a.order || 999) - (b.order || 999);
    if (orderDiff !== 0) return orderDiff;
    return a.title.localeCompare(b.title);
  });
}

function formatTitle(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/^\d+\s*/, '') // Remove leading numbers
    .replace(/\b\w/g, c => c.toUpperCase());
}

function renderNavigation(items, currentPath = '') {
  let html = '<ul class="nav-list">';
  for (const item of items) {
    if (item.children) {
      html += `<li class="nav-section"><span class="nav-section-title">${item.title}</span>`;
      html += renderNavigation(item.children, currentPath);
      html += '</li>';
    } else {
      const isActive = item.href === currentPath ? ' class="active"' : '';
      // Use absolute paths from root
      html += `<li${isActive}><a href="/${item.href}">${item.title}</a></li>`;
    }
  }
  html += '</ul>';
  return html;
}

// Process a single markdown file
function processFile(filePath, relativePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: markdownContent } = matter(content);

  // Parse and transform with Markdoc
  const ast = Markdoc.parse(markdownContent);
  const transformed = Markdoc.transform(ast, config);
  const html = Markdoc.renderers.html(transformed);

  // Build navigation
  const navigation = buildNavigation(DOCS_DIR);
  const outputPath = relativePath.replace('.md', '.html');
  const navHtml = renderNavigation(navigation, outputPath);

  // Apply template
  const title = frontmatter.title || formatTitle(path.basename(filePath, '.md'));
  const description = frontmatter.description || '';

  const finalHtml = template
    .replace('{{title}}', title)
    .replace('{{description}}', description)
    .replace('{{navigation}}', navHtml)
    .replace('{{content}}', html);

  // Write output
  const outputFilePath = path.join(DIST_DIR, outputPath);
  const outputDir = path.dirname(outputFilePath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, finalHtml);
  console.log(`Built: ${outputPath}`);
}

// Process all markdown files
function processAllFiles(dir = DOCS_DIR, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      processAllFiles(fullPath, relativePath);
    } else if (entry.name.endsWith('.md')) {
      processFile(fullPath, relativePath);
    }
  }
}

// Copy static assets
function copyAssets() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  const distAssetsDir = path.join(DIST_DIR, 'assets');

  if (fs.existsSync(assetsDir)) {
    if (!fs.existsSync(distAssetsDir)) {
      fs.mkdirSync(distAssetsDir, { recursive: true });
    }

    const copyRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    copyRecursive(assetsDir, distAssetsDir);
    console.log('Copied assets');
  }
}

// Main build
function build() {
  console.log('Building documentation...\n');
  cleanDist();
  processAllFiles();
  copyAssets();
  console.log('\nBuild complete!');
}

// Watch mode
if (process.argv.includes('--watch')) {
  const chokidar = require('chokidar');

  build();

  console.log('\nWatching for changes...');

  chokidar.watch([DOCS_DIR, TEMPLATE_PATH], {
    ignoreInitial: true
  }).on('all', (event, filePath) => {
    console.log(`\n${event}: ${filePath}`);
    build();
  });
} else {
  build();
}
