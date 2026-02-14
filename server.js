import 'dotenv/config';
import express from 'express';
import path from 'path';
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
  ALLOWED_ORIGINS
} = process.env;

const hasGbpEnv = () => Boolean(GBP_CLIENT_ID && GBP_CLIENT_SECRET && GBP_REFRESH_TOKEN);
const allowedOrigins = (ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

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

app.get('/api/locations', async (_req, res) => {
  try {
    if (!hasGbpEnv()) {
      res.status(503).json({
        error: 'Business Profile API is not configured',
        requiredEnv: ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN']
      });
      return;
    }

    const locations = await getBusinessProfileLocations();
    res.json({ source: 'google-business-profile', count: locations.length, locations });
  } catch (error) {
    res.status(502).json({
      error: 'Failed to load locations from Google Business Profile',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Optional endpoint to inject Maps key into the frontend if needed later.
app.get('/api/config', (_req, res) => {
  res.json({ googleMapsApiKey: GOOGLE_MAPS_API_KEY || '' });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    sourceConfigured: hasGbpEnv(),
    timestamp: new Date().toISOString()
  });
});

app.use(express.static(__dirname));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Quiosk site running on http://localhost:${PORT}`);
});
