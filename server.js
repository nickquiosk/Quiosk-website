import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 8000);
const {
  GBP_CLIENT_ID,
  GBP_CLIENT_SECRET,
  GBP_REFRESH_TOKEN,
  GBP_ACCOUNT_ID,
  GOOGLE_MAPS_API_KEY,
  ALLOWED_ORIGINS,
  IMPORT_TOKEN,
  DATA_FILE
} = process.env;

const hasGbpEnv = () => Boolean(GBP_CLIENT_ID && GBP_CLIENT_SECRET && GBP_REFRESH_TOKEN);
const dataFilePath = DATA_FILE ? path.resolve(__dirname, DATA_FILE) : path.join(__dirname, 'data', 'locations.json');
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Import-Token');
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
const normalizeKey = (value) => normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');

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
  const raw = normalizeText(value).replace(',', '.');
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
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
      const title = pickField(row, headerMap, ['title', 'name', 'locationname', 'businessname']);
      const address1 = pickField(row, headerMap, ['address', 'address1', 'street', 'addressline1']);
      const address2 = pickField(row, headerMap, ['address2', 'addressline2']);
      const city = pickField(row, headerMap, ['city', 'locality', 'town']);
      const postcode = pickField(row, headerMap, ['postcode', 'postalcode', 'zipcode']);
      const lat = pickField(row, headerMap, ['lat', 'latitude']);
      const lng = pickField(row, headerMap, ['lng', 'lon', 'longitude']);
      const openStatus = pickField(row, headerMap, ['isopen', 'open', 'openstatus', 'status']);
      const environment = pickField(row, headerMap, ['environment', 'type']);
      const contactless = pickField(row, headerMap, ['contactless']);
      const products = pickField(row, headerMap, ['products', 'assortment']);

      const address = [address1, address2].filter(Boolean).join(', ');

      return normalizeLocationRecord(
        {
          title,
          name: title,
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
    .filter((location) => location.coords);
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

const getAccessToken = async () => {
  const body = new URLSearchParams({
    client_id: GBP_CLIENT_ID || '',
    client_secret: GBP_CLIENT_SECRET || '',
    refresh_token: GBP_REFRESH_TOKEN || '',
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth token request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error('No access token returned by Google OAuth');
  return data.access_token;
};

const getPrimaryAccountName = async (accessToken) => {
  if (GBP_ACCOUNT_ID) return `accounts/${GBP_ACCOUNT_ID}`;

  const response = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to list Business Profile accounts (${response.status}): ${text}`);
  }

  const data = await response.json();
  const firstAccount = data?.accounts?.[0];
  if (!firstAccount?.name) throw new Error('No Business Profile accounts found for this user');
  return firstAccount.name;
};

const locationToClientShape = (location, index) => {
  const address = location.storefrontAddress || {};
  const addressLines = Array.isArray(address.addressLines) ? address.addressLines : [];
  const addressText = [addressLines.join(' '), address.locality, address.postalCode]
    .filter(Boolean)
    .join(', ');

  const lat = Number(location?.latlng?.latitude);
  const lng = Number(location?.latlng?.longitude);

  return {
    id: index + 1,
    title: location.title || 'Quiosk locatie',
    name: location.name,
    city: address.locality || '',
    postcode: address.postalCode || '',
    address: addressText,
    coords: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    isOpen: location.openInfo?.status !== 'CLOSED_PERMANENTLY',
    environment: 'Indoor',
    contactless: true,
    products: ['Drinks', 'Snacks']
  };
};

const getBusinessProfileLocations = async () => {
  const accessToken = await getAccessToken();
  const accountName = await getPrimaryAccountName(accessToken);
  const all = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({
      readMask: 'title,storefrontAddress,latlng,openInfo',
      pageSize: '100'
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Unable to fetch locations (${response.status}): ${text}`);
    }

    const data = await response.json();
    if (Array.isArray(data.locations)) all.push(...data.locations);
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return all.map(locationToClientShape).filter((location) => location.coords);
};

const requireImportToken = (req, res) => {
  if (!IMPORT_TOKEN) {
    res.status(503).json({
      error: 'Import token is not configured',
      requiredEnv: ['IMPORT_TOKEN']
    });
    return false;
  }

  const providedToken =
    normalizeText(req.headers['x-import-token']) || normalizeText(req.query.token);

  if (!providedToken || providedToken !== IMPORT_TOKEN) {
    res.status(401).json({ error: 'Unauthorized import request' });
    return false;
  }

  return true;
};

app.get('/api/locations', async (_req, res) => {
  try {
    const manualLocations = await readManualLocations();
    if (manualLocations.length) {
      res.json({ source: 'manual-database', count: manualLocations.length, locations: manualLocations });
      return;
    }

    if (!hasGbpEnv()) {
      res.status(503).json({
        error: 'No manual locations found and Business Profile API is not configured',
        requiredEnv: ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN']
      });
      return;
    }

    const locations = await getBusinessProfileLocations();
    res.json({ source: 'google-business-profile', count: locations.length, locations });
  } catch (error) {
    res.status(502).json({
      error: 'Failed to load locations',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/import-locations', async (req, res) => {
  try {
    if (!requireImportToken(req, res)) return;

    let importedLocations = [];

    if (req.is('application/json')) {
      const payloadLocations = Array.isArray(req.body?.locations) ? req.body.locations : [];
      importedLocations = payloadLocations
        .map((record, index) => normalizeLocationRecord(record, index))
        .filter((location) => location.coords);
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

    const locationsWithIds = importedLocations.map((location, index) => ({
      ...location,
      id: index + 1
    }));

    await writeManualLocations(locationsWithIds);

    res.json({
      ok: true,
      source: 'manual-database',
      imported: locationsWithIds.length,
      file: path.relative(__dirname, dataFilePath)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to import locations',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/import-template', (_req, res) => {
  res.type('text/csv').send([
    'title,address,city,postcode,latitude,longitude,is_open,environment,contactless,products',
    'Quiosk - Voorbeeld,"Stationsplein 1",Utrecht,3511,52.0907,5.1109,true,Indoor,true,"Drinks|Snacks"'
  ].join('\n'));
});

// Optional endpoint to inject Maps key into the frontend if needed later.
app.get('/api/config', (_req, res) => {
  res.json({ googleMapsApiKey: GOOGLE_MAPS_API_KEY || '' });
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
    sourceConfigured: hasGbpEnv(),
    manualCount,
    timestamp: new Date().toISOString()
  });
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
