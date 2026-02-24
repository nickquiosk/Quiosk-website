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
const {
  GOOGLE_MAPS_API_KEY,
  ALLOWED_ORIGINS,
  IMPORT_TOKEN,
  DATA_FILE,
  IMPORT_DROP_DIR
} = process.env;

const dataFilePath = DATA_FILE ? path.resolve(__dirname, DATA_FILE) : path.join(__dirname, 'data', 'locations.json');
const importDropDirPath = IMPORT_DROP_DIR
  ? path.resolve(__dirname, IMPORT_DROP_DIR)
  : path.join(__dirname, 'data', 'import');
const mediaRootPaths = [
  path.join(__dirname, 'images'),
  path.join(__dirname, 'logos'),
  path.join(__dirname, 'downloads')
];
const geocodeConcurrency = Math.max(1, Number(process.env.GEOCODE_CONCURRENCY || 6));
const allowedOrigins = (ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ensureDataFile = async () => {
  const dir = path.dirname(dataFilePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(dataFilePath);
  } catch {
    await fs.writeFile(dataFilePath, '[]\n', 'utf8');
  }
};

const ensureImportDropDir = async () => {
  await fs.mkdir(importDropDirPath, { recursive: true });
};

const setCorsHeaders = (req, res) => {
  const requestOrigin = req.headers.origin;
  if (!requestOrigin) return;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
};

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

const requireLocalOnly = (req, res) => {
  if (isLocalRequest(req)) return true;
  res.status(404).json({ error: 'Not found' });
  return false;
};

app.use((req, res, next) => {
  setCorsHeaders(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Import-Token');
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

app.use(express.json({ limit: '5mb' }));
app.use(
  express.text({
    type: ['text/csv', 'application/csv', 'text/plain', 'application/octet-stream'],
    limit: '5mb'
  })
);

const normalizeText = (value) => String(value || '').trim();
const normalizeKey = (value) =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

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

const parseNumber = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const raw = normalized.replace(',', '.');
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const imageFilePattern = /\.(png|jpe?g|webp|avif|gif|svg)$/i;
const mediaFilePattern = /\.(png|jpe?g|webp|avif|gif|svg|eps|pdf|zip)$/i;

const toPublicUrl = (absolutePath) => {
  const relative = path.relative(__dirname, absolutePath).split(path.sep).map(encodeURIComponent).join('/');
  return `/${relative}`;
};

const isWithinAllowedMediaRoots = (absolutePath) =>
  mediaRootPaths.some((rootPath) => absolutePath.startsWith(`${rootPath}${path.sep}`) || absolutePath === rootPath);

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

const buildLocationMatchKey = (location) => {
  const address = normalizeKey(location.address);
  const postcode = normalizeKey(location.postcode);
  const city = normalizeKey(location.city);
  const name = normalizeKey(location.name || location.title);
  return [address, postcode, city, name].join('|');
};

const geocodeAddress = async (location) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return { coords: null, error: 'MISSING_KEY' };
  }

  const query = [location.address, location.postcode, location.city, 'Nederland']
    .filter(Boolean)
    .join(', ');
  if (!query) return { coords: null, error: 'EMPTY_QUERY' };

  try {
    const params = new URLSearchParams({
      address: query,
      key: GOOGLE_MAPS_API_KEY
    });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    if (!response.ok) return { coords: null, error: `HTTP_${response.status}` };
    const data = await response.json();
    if (data?.status && data.status !== 'OK') {
      return { coords: null, error: data.status };
    }
    const first = data?.results?.[0]?.geometry?.location;
    if (!first) return { coords: null, error: 'NO_RESULTS' };
    const lat = Number(first.lat);
    const lng = Number(first.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { coords: null, error: 'INVALID_COORDS' };
    }
    return { coords: { lat, lng }, error: null };
  } catch {
    return { coords: null, error: 'FETCH_FAILED' };
  }
};

const parseCsvRows = (text) => {
  const input = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = input.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (ch === '"') {
      if (inQuotes && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((cell) => normalizeText(cell))) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((cell) => normalizeText(cell))) rows.push(row);

  return rows;
};

const pickField = (row, headerMap, aliases) => {
  for (const alias of aliases) {
    const index = headerMap.get(alias);
    if (index !== undefined && row[index] !== undefined) return normalizeText(row[index]);
  }
  return '';
};

const normalizeLocationRecord = (record, index) => {
  const title = normalizeText(record.title) || normalizeText(record.name) || `Quiosk locatie ${index + 1}`;
  const city = normalizeText(record.city);
  const postcode = normalizeText(record.postcode);
  const address = normalizeText(record.address);

  const lat = parseNumber(record.lat ?? record.latitude ?? record?.coords?.lat);
  const lng = parseNumber(record.lng ?? record.longitude ?? record?.coords?.lng);

  return {
    id: index + 1,
    title,
    name: normalizeText(record.name) || title,
    city,
    postcode,
    address,
    coords: lat !== null && lng !== null ? { lat, lng } : null,
    isOpen: parseBoolean(record.isOpen, true),
    environment: normalizeText(record.environment) || 'Indoor',
    contactless: parseBoolean(record.contactless, true),
    products: Array.isArray(record.products)
      ? record.products.map((p) => normalizeText(p)).filter(Boolean)
      : parseProducts(record.products)
  };
};

const csvToLocations = (csvText) => {
  const rows = parseCsvRows(csvText);
  if (!rows.length) return [];

  const headers = rows[0].map((h) => normalizeKey(h));
  const headerMap = new Map();
  headers.forEach((header, idx) => {
    if (!headerMap.has(header)) headerMap.set(header, idx);
  });

  return rows
    .slice(1)
    .map((row, idx) => {
      const status = pickField(row, headerMap, ['status', 'publicationstatus']);
      const normalizedStatus = normalizeText(status).toLowerCase();
      if (normalizedStatus && !normalizedStatus.includes('gepubliceerd') && !normalizedStatus.includes('published')) {
        return null;
      }

      const title = pickField(row, headerMap, ['title', 'name', 'locationname', 'businessname']);
      const dutchTitle = pickField(row, headerMap, ['bedrijfsnaam']);
      const finalTitle = title || dutchTitle;
      const address1 = pickField(row, headerMap, ['address', 'address1', 'street', 'addressline1']);
      const dutchAddress1 = pickField(row, headerMap, ['adresregel1']);
      const address2 = pickField(row, headerMap, ['address2', 'addressline2']);
      const city = pickField(row, headerMap, ['city', 'locality', 'town', 'buurt', 'plaats']);
      const postcode = pickField(row, headerMap, ['postcode', 'postalcode', 'zipcode']);
      const lat = pickField(row, headerMap, ['lat', 'latitude']);
      const lng = pickField(row, headerMap, ['lng', 'lon', 'longitude']);
      const openStatus = pickField(row, headerMap, ['isopen', 'open', 'openstatus', 'status']);
      const environment = pickField(row, headerMap, ['environment', 'type']);
      const contactless = pickField(row, headerMap, ['contactless', 'paymobilenfc']);
      const products = pickField(row, headerMap, ['products', 'assortment', 'meercategorieen']);

      const address = [address1 || dutchAddress1, address2].filter(Boolean).join(', ');

      return normalizeLocationRecord(
        {
          title: finalTitle,
          name: finalTitle,
          city,
          postcode,
          address,
          lat,
          lng,
          isOpen: openStatus,
          environment,
          contactless,
          products
        },
        idx
      );
    })
    .filter(Boolean);
};

const readManualLocations = async () => {
  await ensureDataFile();
  const raw = await fs.readFile(dataFilePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeLocationRecord).filter((location) => location.coords);
};

const writeManualLocations = async (locations) => {
  await ensureDataFile();
  await fs.writeFile(dataFilePath, `${JSON.stringify(locations, null, 2)}\n`, 'utf8');
};

const finalizeImportedLocations = async (importedLocations) => {
  let geocodedCount = 0;
  let reusedCount = 0;
  let skippedNoCoords = 0;
  const geocodeErrorCounts = {};
  const existingLocations = await readManualLocations();
  const existingCoordsByKey = new Map();
  existingLocations.forEach((location) => {
    if (!location?.coords) return;
    const key = buildLocationMatchKey(location);
    if (!existingCoordsByKey.has(key)) {
      existingCoordsByKey.set(key, location.coords);
    }
  });
  const resolvedByIndex = new Array(importedLocations.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= importedLocations.length) return;

      let resolved = importedLocations[index];
      if (!resolved.coords) {
        const existingCoords = existingCoordsByKey.get(buildLocationMatchKey(resolved));
        if (existingCoords) {
          resolved = { ...resolved, coords: existingCoords };
          reusedCount += 1;
        } else {
          const geocoded = await geocodeAddress(resolved);
          if (geocoded.coords) {
            resolved = { ...resolved, coords: geocoded.coords };
            geocodedCount += 1;
          } else if (geocoded.error) {
            geocodeErrorCounts[geocoded.error] = (geocodeErrorCounts[geocoded.error] || 0) + 1;
          }
        }
      }

      if (!resolved.coords) {
        skippedNoCoords += 1;
        continue;
      }

      resolvedByIndex[index] = resolved;
    }
  };

  const workerCount = Math.min(geocodeConcurrency, importedLocations.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const resolvedLocations = resolvedByIndex.filter(Boolean);

  const locationsWithIds = resolvedLocations.map((location, index) => ({
    ...location,
    id: index + 1
  }));

  await writeManualLocations(locationsWithIds);
  return { locationsWithIds, geocodedCount, reusedCount, skippedNoCoords, geocodeErrorCounts };
};

const requireImportToken = (req, res) => {
  if (!IMPORT_TOKEN) {
    res.status(503).json({
      error: 'Import token is not configured',
      requiredEnv: ['IMPORT_TOKEN']
    });
    return false;
  }

  const providedToken = normalizeText(req.headers['x-import-token']);

  if (!providedToken || providedToken !== IMPORT_TOKEN) {
    res.status(401).json({ error: 'Unauthorized import request' });
    return false;
  }

  return true;
};

const createRateLimiter = ({ windowMs, max }) => {
  const store = new Map();
  return (req, res, next) => {
    const key = normalizeIp(req?.socket?.remoteAddress) || 'unknown';
    const now = Date.now();
    const item = store.get(key);
    if (!item || now > item.expiresAt) {
      store.set(key, { count: 1, expiresAt: now + windowMs });
      next();
      return;
    }
    if (item.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((item.expiresAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    item.count += 1;
    next();
  };
};

const importRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });

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

app.post('/api/import-locations', importRateLimiter, async (req, res) => {
  try {
    if (!requireLocalOnly(req, res)) return;
    if (!requireImportToken(req, res)) return;

    let importedLocations = [];

    if (req.is('application/json')) {
      const payloadLocations = Array.isArray(req.body?.locations) ? req.body.locations : [];
      importedLocations = payloadLocations.map((record, index) => normalizeLocationRecord(record, index));
    } else {
      const csvText = typeof req.body === 'string' ? req.body : '';
      importedLocations = csvToLocations(csvText);
    }

    if (!importedLocations.length) {
      res.status(400).json({
        error: 'No valid locations found in import payload',
        hint: 'Provide CSV with headers for name/address/city/postcode/latitude/longitude or JSON { locations: [...] }'
      });
      return;
    }

    const { locationsWithIds, geocodedCount, reusedCount, skippedNoCoords, geocodeErrorCounts } =
      await finalizeImportedLocations(importedLocations);
    if (!locationsWithIds.length) {
      res.status(400).json({
        error: 'Import processed but no mappable locations found',
        detail: 'No coordinates were found or geocoded',
        skippedNoCoords,
        geocodeErrors: geocodeErrorCounts
      });
      return;
    }

    res.json({
      ok: true,
      source: 'manual-database',
      imported: locationsWithIds.length,
      geocodedCount,
      reusedCount,
      skippedNoCoords,
      geocodeErrors: geocodeErrorCounts,
      file: path.relative(__dirname, dataFilePath)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to import locations',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/import-from-drop', importRateLimiter, async (req, res) => {
  try {
    if (!requireLocalOnly(req, res)) return;
    if (!requireImportToken(req, res)) return;
    await ensureImportDropDir();

    const fileName = path.basename(normalizeText(req.body?.filename) || 'latest.csv');
    const sourcePath = path.join(importDropDirPath, fileName);
    const csvText = await fs.readFile(sourcePath, 'utf8');
    const importedLocations = csvToLocations(csvText);

    if (!importedLocations.length) {
      res.status(400).json({
        error: 'No valid locations found in drop file',
        file: path.relative(__dirname, sourcePath)
      });
      return;
    }

    const { locationsWithIds, geocodedCount, reusedCount, skippedNoCoords, geocodeErrorCounts } =
      await finalizeImportedLocations(importedLocations);
    if (!locationsWithIds.length) {
      res.status(400).json({
        error: 'Drop file processed but no mappable locations found',
        file: path.relative(__dirname, sourcePath),
        skippedNoCoords,
        geocodeErrors: geocodeErrorCounts
      });
      return;
    }

    res.json({
      ok: true,
      source: 'manual-database',
      imported: locationsWithIds.length,
      geocodedCount,
      reusedCount,
      skippedNoCoords,
      geocodeErrors: geocodeErrorCounts,
      fromFile: path.relative(__dirname, sourcePath),
      savedTo: path.relative(__dirname, dataFilePath)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to import from drop folder',
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

app.get('/api/import-template', (_req, res) => {
  if (!requireLocalOnly(_req, res)) return;
  res.type('text/csv').send([
    'title,address,city,postcode,latitude,longitude,is_open,environment,contactless,products',
    'Quiosk - Voorbeeld,"Stationsplein 1",Utrecht,3511,52.0907,5.1109,true,Indoor,true,"Drinks|Snacks"'
  ].join('\n'));
});

// Optional endpoint to inject Maps key into the frontend if needed later.
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

app.get('/import-locaties.html', (req, res) => {
  if (!requireLocalOnly(req, res)) return;
  res.sendFile(path.join(__dirname, 'import-locaties.html'));
});

app.get('/import-locaties', (req, res) => {
  if (!requireLocalOnly(req, res)) return;
  res.redirect(302, '/import-locaties.html');
});

app.use(express.static(__dirname));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

ensureDataFile()
  .then(() => {
    ensureImportDropDir().catch(() => {});
    app.listen(PORT, () => {
      console.log(`Quiosk site running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize data storage', error);
    process.exit(1);
  });
