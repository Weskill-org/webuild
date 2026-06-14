import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate URL-friendly slug (matches src/utils/slugify.ts)
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const BASE_URL = 'https://webuild.weskill.org';

const staticPages = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: '/about', priority: '0.8', changefreq: 'monthly' },
  { path: '/careers', priority: '0.8', changefreq: 'monthly' },
  { path: '/partners', priority: '0.8', changefreq: 'monthly' },
  { path: '/contact', priority: '0.8', changefreq: 'monthly' },
  { path: '/features', priority: '0.8', changefreq: 'monthly' },
  { path: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
  { path: '/explore-projects', priority: '0.8', changefreq: 'daily' },
  { path: '/blog', priority: '0.9', changefreq: 'daily' },
  { path: '/login', priority: '0.7', changefreq: 'monthly' },
  { path: '/signup', priority: '0.7', changefreq: 'monthly' },
  { path: '/forgot-password', priority: '0.5', changefreq: 'monthly' },
  { path: '/reset-password', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'monthly' },
  { path: '/terms', priority: '0.3', changefreq: 'monthly' },
  { path: '/role-selection', priority: '0.5', changefreq: 'monthly' }
];

function generateSitemapXml() {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Add static pages
  for (const page of staticPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // 2. Add dynamic blog pages
  try {
    const blogPostsPath = path.join(__dirname, '../src/blogPosts.json');
    if (fs.existsSync(blogPostsPath)) {
      const blogPostsRaw = fs.readFileSync(blogPostsPath, 'utf8');
      const blogPosts = JSON.parse(blogPostsRaw);
      
      console.log(`Found ${blogPosts.length} blog posts. Generating URLs...`);
      for (const post of blogPosts) {
        if (post.title) {
          const slug = generateSlug(post.title);
          let lastmodDate = today;
          if (post.date) {
            try {
              const parsedDate = new Date(post.date);
              if (!isNaN(parsedDate.getTime())) {
                lastmodDate = parsedDate.toISOString().split('T')[0];
              }
            } catch (e) {
              // Ignore invalid dates and fallback to today
            }
          }

          xml += `  <url>\n`;
          xml += `    <loc>${BASE_URL}/blog/${slug}</loc>\n`;
          xml += `    <lastmod>${lastmodDate}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          xml += `  </url>\n`;
        }
      }
    } else {
      console.warn(`Warning: src/blogPosts.json not found at ${blogPostsPath}`);
    }
  } catch (error) {
    console.error('Error parsing blog posts:', error);
  }

  xml += `</urlset>\n`;
  return xml;
}

try {
  const xmlContent = generateSitemapXml();
  
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  const sidemapPath = path.join(publicDir, 'sidemap.xml');

  fs.writeFileSync(sitemapPath, xmlContent);
  console.log(`Successfully generated sitemap.xml at ${sitemapPath}`);

  fs.writeFileSync(sidemapPath, xmlContent);
  console.log(`Successfully generated sidemap.xml at ${sidemapPath}`);
} catch (error) {
  console.error('Failed to generate sitemaps:', error);
  process.exit(1);
}
