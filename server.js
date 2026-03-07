import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.disable('x-powered-by');

const PORT = Number(process.env.PORT || 8000);
const { ALLOWED_ORIGINS, DATA_FILE } = process.env;
const IMPORT_TOKEN = process.env.IMPORT_TOKEN || 'quiosk-import-2026';
const GOOGLE_GEOCODING_API_KEY_RAW =
  process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
const execFileAsync = promisify(execFile);

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
const GOOGLE_GEOCODING_API_KEY = normalizeText(GOOGLE_GEOCODING_API_KEY_RAW);
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
app.use(express.json({ limit: '1mb' }));

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

const decodeXmlEntities = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalizeKeyToken = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();

const columnNameToIndex = (columnName) => {
  let n = 0;
  for (const ch of columnName) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const normalizePostcode = (value) => {
  const compact = normalizeText(value).replace(/\s+/g, '').toUpperCase();
  if (/^\d{4}[A-Z]{2}$/.test(compact)) return `${compact.slice(0, 4)} ${compact.slice(4)}`;
  return normalizeText(value).toUpperCase();
};

const buildAddressFromMachineRow = (row) => {
  const street = normalizeText(row.Straatnaam);
  const house = normalizeText(row.Huisnummer);
  const addition = normalizeText(row.Huisnummertoevoeging);
  const housePart = [house, addition].filter(Boolean).join(' ').trim();
  return [street, housePart].filter(Boolean).join(' ').trim();
};

const buildGeocodeAddressFromMachineRow = (row) => {
  const streetLine = buildAddressFromMachineRow(row);
  const postcode = normalizePostcode(row.Postcode);
  const city = normalizeText(row.Plaatsnaam);
  const countryCode = normalizeText(row.CountryCode).toUpperCase() || 'NL';
  return [streetLine, [postcode, city].filter(Boolean).join(' '), countryCode]
    .filter(Boolean)
    .join(', ');
};

const parseXlsxRows = async (filePath) => {
  const [{ stdout: sharedStringsXml }, { stdout: sheetXml }] = await Promise.all([
    execFileAsync('unzip', ['-p', filePath, 'xl/sharedStrings.xml'], {
      maxBuffer: 20 * 1024 * 1024
    }),
    execFileAsync('unzip', ['-p', filePath, 'xl/worksheets/sheet1.xml'], {
      maxBuffer: 20 * 1024 * 1024
    })
  ]);

  const sharedStrings = [...sharedStringsXml.matchAll(/<si[\s\S]*?<\/si>/g)].map((match) => {
    const parts = [...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]);
    return decodeXmlEntities(parts.join(''));
  });

  const rows = [];
  for (const rowMatch of sheetXml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1]);
    const rowBody = rowMatch[2];
    const cells = [...rowBody.matchAll(/<c[^>]*r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)]
      .map((cellMatch) => {
        const col = cellMatch[1];
        const attrs = cellMatch[2];
        const inner = cellMatch[3];
        const valueMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (!valueMatch) return null;
        const raw = valueMatch[1];
        const isSharedString = /t="s"/.test(attrs);
        const value = isSharedString ? sharedStrings[Number(raw)] || '' : raw;
        return { index: columnNameToIndex(col), value: decodeXmlEntities(value) };
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);

    rows.push({ rowNumber, cells });
  }

  if (!rows.length) return [];
  const headerRow = rows[0];
  const headersByIndex = new Map(
    headerRow.cells.map((cell) => [cell.index, normalizeText(cell.value)])
  );

  return rows.slice(1).map((row) => {
    const output = {};
    row.cells.forEach((cell) => {
      const header = headersByIndex.get(cell.index);
      if (!header) return;
      output[header] = normalizeText(cell.value);
    });
    return output;
  });
};

const buildMatchKeys = ({ city = '', postcode = '', street = '', house = '' }) => {
  const k1 = [
    normalizeKeyToken(postcode),
    normalizeKeyToken(city),
    normalizeKeyToken(street),
    normalizeKeyToken(house)
  ].join('|');
  const k2 = [normalizeKeyToken(postcode), normalizeKeyToken(city)].join('|');
  return [k1, k2];
};

const extractAddressBits = (address = '') => {
  const raw = normalizeText(address);
  if (!raw) return { street: '', house: '', postcode: '', city: '' };
  const [streetHouse = '', postCity = ''] = raw.split(',').map((p) => normalizeText(p));
  const streetHouseMatch = streetHouse.match(/^(.*?)(\d+[A-Za-z\-\/\s]*)$/);
  const postCityMatch = postCity.match(/^(\d{4}\s?[A-Za-z]{2})\s+(.+)$/);
  return {
    street: normalizeText(streetHouseMatch?.[1] || streetHouse),
    house: normalizeText(streetHouseMatch?.[2] || ''),
    postcode: normalizePostcode(postCityMatch?.[1] || ''),
    city: normalizeText(postCityMatch?.[2] || '')
  };
};

const geocodeAddress = async (address) => {
  if (!GOOGLE_GEOCODING_API_KEY) return { coords: null, status: 'NO_API_KEY' };
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(GOOGLE_GEOCODING_API_KEY)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return { coords: null, status: `HTTP_${response.status}` };
    const payload = await response.json();
    if (payload.status !== 'OK') return { coords: null, status: payload.status || 'GEOCODE_ERROR' };
    const location = payload.results?.[0]?.geometry?.location;
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { coords: null, status: 'NO_COORDS' };
    return { coords: { lat, lng }, status: 'OK' };
  } catch {
    return { coords: null, status: 'NETWORK_ERROR' };
  }
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

app.post('/api/import-machines', async (req, res) => {
  if (!isLocalRequest(req)) {
    res.status(403).json({ error: 'Import only allowed from localhost' });
    return;
  }
  const token = normalizeText(req.get('X-Import-Token'));
  if (!token || token !== IMPORT_TOKEN) {
    res.status(401).json({ error: 'Invalid import token' });
    return;
  }

  const requestedFilename = normalizeText(req.body?.filename) || 'Machines Import.xlsx';
  const importPath = path.join(__dirname, 'data', 'import', requestedFilename);
  if (path.extname(importPath).toLowerCase() !== '.xlsx') {
    res.status(400).json({ error: 'Only .xlsx is supported for this endpoint' });
    return;
  }

  try {
    await fs.access(importPath);
  } catch {
    res.status(404).json({ error: 'Import file not found', file: `data/import/${requestedFilename}` });
    return;
  }

  try {
    const machineRows = await parseXlsxRows(importPath);
    const filteredRows = machineRows.filter(
      (row) =>
        normalizeText(row.MachineId) &&
        normalizeText(row.Plaatsnaam) &&
        normalizeText(row.Straatnaam)
    );

    await ensureDataFile();
    const existingRaw = JSON.parse(await fs.readFile(dataFilePath, 'utf8'));
    const existingRows = Array.isArray(existingRaw) ? existingRaw : [];

    const coordsByKey = new Map();
    for (const existing of existingRows) {
      const lat = parseNumber(existing?.coords?.lat ?? existing?.lat);
      const lng = parseNumber(existing?.coords?.lng ?? existing?.lng);
      if (lat === null || lng === null) continue;
      const bitsFromAddress = extractAddressBits(existing?.address);
      const city = normalizeText(existing?.city || bitsFromAddress.city);
      const postcode = normalizePostcode(existing?.postcode || bitsFromAddress.postcode);
      const street = bitsFromAddress.street;
      const house = bitsFromAddress.house;
      const keys = buildMatchKeys({ city, postcode, street, house });
      keys.forEach((key) => coordsByKey.set(key, { lat, lng }));
    }

    const geocodeErrors = {};
    let reusedCount = 0;
    let geocodedCount = 0;
    let skippedNoCoords = 0;
    const imported = [];

    for (const row of filteredRows) {
      const machineId = Number(row.MachineId);
      const city = normalizeText(row.Plaatsnaam);
      const postcode = normalizePostcode(row.Postcode);
      const street = normalizeText(row.Straatnaam);
      const house = [normalizeText(row.Huisnummer), normalizeText(row.Huisnummertoevoeging)]
        .filter(Boolean)
        .join(' ')
        .trim();
      const address = buildAddressFromMachineRow(row);
      const geocodeAddressLine = buildGeocodeAddressFromMachineRow(row);
      const name = normalizeText(row.Name) || `Quiosk ${city}`;
      const title = `Quiosk ${city}`;

      let coords =
        coordsByKey.get(buildMatchKeys({ city, postcode, street, house })[0]) ||
        coordsByKey.get(buildMatchKeys({ city, postcode, street, house })[1]) ||
        null;

      if (coords) {
        reusedCount += 1;
      } else {
        const geocode = await geocodeAddress(geocodeAddressLine);
        if (geocode.coords) {
          coords = geocode.coords;
          geocodedCount += 1;
        } else {
          skippedNoCoords += 1;
          const key = geocode.status || 'UNKNOWN';
          geocodeErrors[key] = (geocodeErrors[key] || 0) + 1;
          continue;
        }
      }

      imported.push(
        normalizeLocationRecord(
          {
            id: Number.isFinite(machineId) ? machineId : imported.length + 1,
            title,
            name,
            city,
            postcode,
            address,
            lat: coords.lat,
            lng: coords.lng,
            isOpen: true,
            environment: 'Outdoor',
            contactless: true,
            products: ['Drinks', 'Snacks']
          },
          imported.length
        )
      );
    }

    if (!imported.length) {
      res.status(422).json({
        error: 'Import processed but no mappable locations found',
        file: `data/import/${requestedFilename}`,
        skippedNoCoords,
        geocodeErrors
      });
      return;
    }

    await fs.writeFile(dataFilePath, `${JSON.stringify(imported, null, 2)}\n`, 'utf8');
    res.json({
      ok: true,
      source: 'machine-import-xlsx',
      fromFile: `data/import/${requestedFilename}`,
      imported: imported.length,
      reusedCount,
      geocodedCount,
      skippedNoCoords,
      geocodeErrors,
      savedTo: path.relative(__dirname, dataFilePath)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Import failed',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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
