import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.disable('x-powered-by');

const PORT = Number(process.env.PORT || 8000);
const { ALLOWED_ORIGINS, DATA_FILE } = process.env;

const dataFilePath = DATA_FILE
  ? path.resolve(__dirname, DATA_FILE)
  : path.join(__dirname, 'data', 'locations.json');

const mediaRootPaths = [
  path.join(__dirname, 'images'),
  path.join(__dirname, 'logos'),
  path.join(__dirname, 'downloads')
];

const allowedOrigins = (ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const normalizeText = (value) => String(value || '').trim();
const normalizeIp = (ip) => normalizeText(ip).split(',')[0].trim().toLowerCase();

const isLoopbackIp = (ip) => {
  const normalized = normalizeIp(ip);
  return (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '::ffff:127.0.0.1'
  );
};

const isLocalRequest = (req) => {
  const socketIp = normalizeIp(req?.socket?.remoteAddress);
  const reqIp = normalizeIp(req?.ip);
  return isLoopbackIp(socketIp) || isLoopbackIp(reqIp);
};

const ensureDataFile = async () => {
  const dir = path.dirname(dataFilePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(dataFilePath);
  } catch {
    await fs.writeFile(dataFilePath, '[]\n', 'utf8');
  }
};

const setCorsHeaders = (req, res) => {
  const requestOrigin = req.headers.origin;
  if (!requestOrigin) return;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
};

app.use((req, res, next) => {
  setCorsHeaders(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self' https: data: blob:",
      "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' https: 'unsafe-inline'",
      "img-src 'self' https: data: blob:",
      "font-src 'self' https: data:",
      "connect-src 'self' https:",
      "frame-src 'self' https:",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'"
    ].join('; ')
  );

  if (!isLocalRequest(req)) {
    const proto = normalizeText(req.headers['x-forwarded-proto']).toLowerCase();
    if (req.secure || proto.includes('https')) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

const parseNumber = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const n = Number(normalized.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const parseBoolean = (value, defaultValue = true) => {
  const v = normalizeText(value).toLowerCase();
  if (!v) return defaultValue;
  if (['1', 'true', 'yes', 'ja', 'open', 'active'].includes(v)) return true;
  if (['0', 'false', 'no', 'nee', 'closed', 'inactive'].includes(v)) return false;
  return defaultValue;
};

const parseProducts = (value) => {
  const raw = normalizeText(value);
  if (!raw) return ['Drinks', 'Snacks'];
  const parts = raw
    .split(/[|,;/]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : ['Drinks', 'Snacks'];
};

const normalizeLocationRecord = (record, index) => {
  const title = normalizeText(record.title) || normalizeText(record.name) || `Quiosk locatie ${index + 1}`;
  const lat = parseNumber(record.lat ?? record.latitude ?? record?.coords?.lat);
  const lng = parseNumber(record.lng ?? record.longitude ?? record?.coords?.lng);

  return {
    id: Number(record.id) || index + 1,
    title,
    name: normalizeText(record.name) || title,
    city: normalizeText(record.city),
    postcode: normalizeText(record.postcode),
    address: normalizeText(record.address),
    coords: lat !== null && lng !== null ? { lat, lng } : null,
    isOpen: parseBoolean(record.isOpen, true),
    environment: normalizeText(record.environment) || 'Indoor',
    contactless: parseBoolean(record.contactless, true),
    products: Array.isArray(record.products)
      ? record.products.map((p) => normalizeText(p)).filter(Boolean)
      : parseProducts(record.products)
  };
};

const readManualLocations = async () => {
  await ensureDataFile();
  const raw = await fs.readFile(dataFilePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeLocationRecord).filter((location) => location.coords);
};

const imageFilePattern = /\.(png|jpe?g|webp|avif|gif|svg)$/i;
const mediaFilePattern = /\.(png|jpe?g|webp|avif|gif|svg|eps|pdf|zip)$/i;

const toPublicUrl = (absolutePath) => {
  const relative = path
    .relative(__dirname, absolutePath)
    .split(path.sep)
    .map(encodeURIComponent)
    .join('/');
  return `/${relative}`;
};

const isWithinAllowedMediaRoots = (absolutePath) =>
  mediaRootPaths.some(
    (rootPath) => absolutePath.startsWith(`${rootPath}${path.sep}`) || absolutePath === rootPath
  );

const listMediaFiles = async (folder, mode = 'images') => {
  const folderInput = normalizeText(folder);
  if (!folderInput) return [];

  const resolved = path.resolve(__dirname, folderInput);
  if (!isWithinAllowedMediaRoots(resolved)) return [];

  let entries = [];
  try {
    entries = await fs.readdir(resolved, { withFileTypes: true });
  } catch {
    return [];
  }

  const pattern = mode === 'all' ? mediaFilePattern : imageFilePattern;

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => pattern.test(name))
    .sort((a, b) => a.localeCompare(b, 'nl', { numeric: true, sensitivity: 'base' }))
    .map((name) => {
      const ext = path.extname(name).replace('.', '').toLowerCase();
      const stem = name.replace(/\.[^.]+$/, '');
      const absolute = path.join(resolved, name);
      return {
        name,
        stem,
        ext,
        url: toPublicUrl(absolute)
      };
    });
};

app.get('/api/locations', async (_req, res) => {
  try {
    const manualLocations = await readManualLocations();
    res.json({ source: 'manual-database', count: manualLocations.length, locations: manualLocations });
  } catch (error) {
    res.status(502).json({
      error: 'Failed to load locations',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/product-images', async (_req, res) => {
  try {
    const files = await listMediaFiles('images/producten', 'images');
    const images = files.map((file) => file.url);
    res.json({ count: images.length, images });
  } catch {
    res.json({ count: 0, images: [] });
  }
});

app.get('/api/media-files', async (req, res) => {
  const folder = normalizeText(req.query.folder);
  const mode = normalizeText(req.query.mode).toLowerCase() === 'all' ? 'all' : 'images';
  const files = await listMediaFiles(folder, mode);
  res.json({ folder, count: files.length, files });
});

app.get('/api/config', (_req, res) => {
  res.json({ googleMapsApiKey: '' });
});

app.get('/api/health', async (_req, res) => {
  let manualCount = 0;
  try {
    manualCount = (await readManualLocations()).length;
  } catch {
    manualCount = 0;
  }

  res.json({
    ok: true,
    sourceConfigured: true,
    manualCount,
    timestamp: new Date().toISOString()
  });
});

app.get(['/import-locaties', '/import-locaties.html'], (_req, res) => {
  res.status(404).send('Not found');
});

app.use(express.static(__dirname));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

ensureDataFile()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Quiosk site running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize data storage', error);
    process.exit(1);
  });
