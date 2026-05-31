import fs from 'fs';

const blogsRaw = fs.readFileSync('src/blogPosts.json', 'utf8');
const originalBlogs = JSON.parse(blogsRaw);

// We run the unique script's generation logic and then append.
// Because the unique script writes variables but didn't write to fs at the end of the script above, let's fix it.
