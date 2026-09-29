import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const referenceRoot = join(root, 'reference-images');
const manifestPath = join(referenceRoot, 'manifest.json');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};
const imageExtensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif']
]);

function sendJson(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 20 * 1024 * 1024) throw new Error('Image is too large (10 MB maximum)');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64) || 'other-room';
}

function cleanTitle(value, fallback) {
  return String(value || fallback || 'Reference image')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 120);
}

async function nextFilename(folder, prefix, extension) {
  let files = [];
  try { files = await readdir(folder); } catch {}
  const expression = new RegExp(`^${prefix}-(\\d+)\\.[a-z0-9]+$`, 'i');
  const highest = files.reduce((value, file) => {
    const match = file.match(expression);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(2, '0')}${extension}`;
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return { layoutIdea: null, layoutIdeas: [], references: [] };
  }
}

async function writeManifest(manifest) {
  await mkdir(referenceRoot, { recursive: true });
  const temporaryPath = `${manifestPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, manifestPath);
}

async function saveReferenceImage(req, res) {
  try {
    const body = await readJsonBody(req);
    const room = String(body.room || '').trim();
    const kind = body.kind === 'layout' ? 'layout' : 'reference';
    if (!room) return sendJson(res, 400, { ok: false, error: 'Select a room first' });

    const match = String(body.data || '').match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i);
    const extension = match && imageExtensions.get(match[1].toLowerCase());
    if (!match || !extension) return sendJson(res, 400, { ok: false, error: 'Use a JPG, PNG, WEBP or GIF image' });

    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
      return sendJson(res, 400, { ok: false, error: 'Image is empty or larger than 10 MB' });
    }

    const roomSlug = slugify(room);
    const folderName = kind === 'layout' ? `${roomSlug}/01-layout-plan` : `${roomSlug}/02-idea-image`;
    const prefix = kind === 'layout' ? `${roomSlug}-layout` : `${roomSlug}-reference`;
    const folder = join(referenceRoot, folderName);
    await mkdir(folder, { recursive: true });
    const filename = await nextFilename(folder, prefix, extension);
    const relativeFile = `${folderName}/${filename}`;
    await writeFile(join(folder, filename), buffer);

    const originalTitle = String(body.title || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    const item = { room, file: relativeFile, title: cleanTitle(originalTitle, kind === 'layout' ? `${room} layout plan` : `${room} reference`) };
    const manifest = await loadManifest();
    manifest.references = Array.isArray(manifest.references) ? manifest.references : [];
    manifest.layoutIdeas = Array.isArray(manifest.layoutIdeas) ? manifest.layoutIdeas : [];
    if (kind === 'layout') {
      manifest.layoutIdeas = manifest.layoutIdeas.filter(entry => String(entry.room || '').toLowerCase() !== room.toLowerCase());
      manifest.layoutIdeas.push(item);
    } else {
      manifest.references.push(item);
    }
    if (!('layoutIdea' in manifest)) manifest.layoutIdea = null;
    await writeManifest(manifest);
    sendJson(res, 201, { ok: true, kind, item });
  } catch (error) {
    console.error('Reference image upload failed:', error);
    sendJson(res, 400, { ok: false, error: error.message || 'Image could not be saved' });
  }
}

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/api/reference-images' && req.method === 'POST') {
    await saveReferenceImage(req, res);
    return;
  }

  try {
    const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = normalize(join(root, requested));
    if (!filePath.startsWith(root)) throw new Error('Invalid path');
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not found');
    res.writeHead(200, { 'content-type': mime[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(await readFile(filePath));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
