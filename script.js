const initHeaderCta = () => {
  const navList = document.querySelector('.site-nav ul');
  if (!navList || navList.querySelector('.nav-cta-item')) return;

  const item = document.createElement('li');
  item.className = 'nav-cta-item';
  item.innerHTML =
    '<a class="nav-cta-link btn btn-primary" href="word-partner.html" data-nav>Word partner</a>';
  navList.appendChild(item);
};

const setActiveNav = () => {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.getAttribute('href') === path) link.classList.add('active');
  });
};

const initMobileNav = () => {
  document.documentElement.classList.add('js');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  const closeNav = () => {
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 920) closeNav();
  });
};

const initHeaderScroll = () => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let lastY = window.scrollY;
  const delta = 8;
  const showAtTop = 72;

  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      const navOpen = document.querySelector('.site-nav.is-open');
      header.classList.toggle('header-compact', y > 20);

      if (navOpen || y <= showAtTop) {
        header.classList.remove('header-hidden');
        lastY = y;
        return;
      }

      if (y > lastY + delta) {
        header.classList.add('header-hidden');
      } else if (y < lastY - delta) {
        header.classList.remove('header-hidden');
      }

      lastY = y;
    },
    { passive: true }
  );
};

const initBackToTop = () => {
  if (document.querySelector('[data-back-to-top]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-to-top';
  button.setAttribute('data-back-to-top', 'true');
  button.setAttribute('aria-label', 'Terug naar boven');
  button.setAttribute('title', 'Terug naar boven');
  button.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.appendChild(button);

  const updateVisibility = () => {
    const show = window.scrollY > 260;
    button.classList.toggle('is-visible', show);
  };

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();
};

const initCalculator = () => {
  const form = document.querySelector('[data-calc-form]');
  const result = document.querySelector('[data-calc-result]');
  if (!form || !result) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const visitors = Number(form.visitors.value || 0);
    const conversion = Number(form.conversion.value || 0) / 100;
    const avgSpend = Number(form.avgSpend.value || 0);
    const revShare = Number(form.revShare.value || 0) / 100;

    const monthlySales = visitors * 30 * conversion;
    const monthlyTurnover = monthlySales * avgSpend;
    const partnerRevenue = monthlyTurnover * revShare;

    result.innerHTML = `
      <strong>Indicatie per maand</strong><br>
      Geschatte transacties: <strong>${Math.round(monthlySales).toLocaleString('nl-NL')}</strong><br>
      Geschatte omzet: <strong>€ ${Math.round(monthlyTurnover).toLocaleString('nl-NL')}</strong><br>
      Jouw revenue share: <strong>€ ${Math.round(partnerRevenue).toLocaleString('nl-NL')}</strong><br>
      <small>Dit is een indicatie. Werkelijke prestaties hangen af van locatie, doelgroep en assortiment.</small>
    `;
  });
};

const initRefundForm = () => {
  const form = document.querySelector('[data-refund-form]');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const location = String(formData.get('location') || '').trim();
    const datetime = String(formData.get('datetime') || '').trim();
    const amount = String(formData.get('amount') || '').trim();
    const transactionId = String(formData.get('transaction_id') || '').trim();
    const issue = String(formData.get('issue') || '').trim();

    const subject = `Terugbetalingsaanvraag - ${location || 'Quiosk locatie'}`;
    const body = [
      'Nieuwe terugbetalingsaanvraag via website',
      '',
      `Naam: ${name}`,
      `E-mail: ${email}`,
      `Telefoon: ${phone || '-'}`,
      `Locatie: ${location}`,
      `Datum/tijd aankoop: ${datetime || '-'}`,
      `Bedrag: ${amount || '-'}`,
      `Transactie-ID: ${transactionId}`,
      '',
      'Omschrijving probleem:',
      issue
    ].join('\n');

    window.location.href = `mailto:info@quiosk.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
};

const kioskData = [
  {
    id: 1,
    name: 'Quiosk - Sportcampus Zuid',
    city: 'Rotterdam',
    postcode: '3083',
    address: 'Sportlaan 14, Rotterdam',
    products: ['Drinks', 'Snacks', 'Gezond'],
    isOpen: true,
    environment: 'Outdoor',
    contactless: true,
    coords: { lat: 51.8762, lng: 4.4864 }
  },
  {
    id: 2,
    name: 'Quiosk - Station Plaza',
    city: 'Utrecht',
    postcode: '3511',
    address: 'Stationsplein 3, Utrecht',
    products: ['Drinks', 'Snacks'],
    isOpen: true,
    environment: 'Indoor',
    contactless: true,
    coords: { lat: 52.0907, lng: 5.1109 }
  },
  {
    id: 3,
    name: 'Quiosk - Campus Noord',
    city: 'Groningen',
    postcode: '9712',
    address: 'Kadelaan 22, Groningen',
    products: ['Drinks', 'Gezond'],
    isOpen: false,
    environment: 'Indoor',
    contactless: true,
    coords: { lat: 53.2194, lng: 6.5665 }
  }
];

const normalizeLocationFromApi = (item, index) => {
  const title = item.title || item.name || `Quiosk locatie ${index + 1}`;
  const address = item.address || '';
  const city = item.city || '';
  const postcode = item.postcode || '';
  const lat = Number(item?.coords?.lat);
  const lng = Number(item?.coords?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  return {
    id: Number(item.id || index + 1),
    name: title,
    city,
    postcode,
    address,
    products: Array.isArray(item.products) && item.products.length ? item.products : ['Drinks', 'Snacks'],
    isOpen: item.isOpen !== false,
    environment: item.environment === 'Outdoor' ? 'Outdoor' : 'Indoor',
    contactless: item.contactless !== false,
    coords: hasCoords ? { lat, lng } : null
  };
};

const resolveStaticPath = (relativePath) => {
  const clean = String(relativePath || '').replace(/^\/+/, '');
  if (!clean) return '/';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const pathName = typeof window !== 'undefined' ? window.location.pathname : '';
  const isGitHubPages = /\.github\.io$/i.test(host);
  if (!isGitHubPages) return `/${clean}`;

  const firstSegment = pathName.split('/').filter(Boolean)[0] || '';
  if (!firstSegment || firstSegment.endsWith('.html')) return `/${clean}`;
  return `/${firstSegment}/${clean}`;
};

const fetchDynamicLocations = async () => {
  const configuredApiUrl =
    typeof window !== 'undefined' ? (window.QUIOSK_LOCATIONS_API_URL || '').trim() : '';
  const apiUrl = configuredApiUrl || '/api/locations';
  const normalizePayload = (payload) => {
    if (!payload) return null;
    const rawLocations = Array.isArray(payload) ? payload : payload.locations;
    if (!Array.isArray(rawLocations)) return null;
    const mapped = rawLocations
      .map((item, index) => normalizeLocationFromApi(item, index))
      .filter((location) => location.coords);
    return mapped.length ? mapped : null;
  };

  const fetchJson = async (url) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  try {
    const apiPayload = await fetchJson(apiUrl);
    const fromApi = normalizePayload(apiPayload);
    if (fromApi?.length) return fromApi;

    const staticPayload = await fetchJson(resolveStaticPath('data/locations.json'));
    const fromStatic = normalizePayload(staticPayload);
    if (fromStatic?.length) return fromStatic;

    return null;
  } catch (_) {
    return null;
  }
};

const FINDER_LOCATIONS_CACHE_KEY = 'quioskFinderLocationsCacheV1';
const FINDER_LOCATIONS_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

const readJsonCache = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

const writeJsonCache = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // Ignore storage failures (private mode/quota).
  }
};

const readFinderLocationsCache = () => {
  const cached = readJsonCache(FINDER_LOCATIONS_CACHE_KEY);
  if (!cached || !Array.isArray(cached.locations)) return null;
  return cached;
};

const writeFinderLocationsCache = (locations, source = 'unknown') => {
  if (!Array.isArray(locations) || !locations.length) return;
  writeJsonCache(FINDER_LOCATIONS_CACHE_KEY, {
    source,
    createdAt: Date.now(),
    locations
  });
};

const isFinderLocationsCacheFresh = (cached) => {
  if (!cached?.createdAt) return false;
  return Date.now() - Number(cached.createdAt) < FINDER_LOCATIONS_CACHE_TTL_MS;
};

const splitAddressParts = (address) =>
  String(address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const getStreetForMapsQuery = (location) => {
  const parts = splitAddressParts(location?.address);
  if (parts.length) return parts[0];
  return String(location?.address || '').trim();
};

const getCityForMapsQuery = (location) => {
  const explicitCity = String(location?.city || '').trim();
  if (explicitCity) return explicitCity;

  const parts = splitAddressParts(location?.address);
  if (!parts.length) return '';

  for (const part of parts) {
    const match = part.match(/\b\d{4}\s*[A-Za-z]{2}\s+(.+)$/);
    if (match?.[1]) return match[1].trim();
  }

  if (parts.length >= 2) {
    const tail = parts[parts.length - 1];
    const street = parts[0];
    if (tail && tail.toLowerCase() !== street.toLowerCase() && !/\d/.test(tail)) return tail;
  }

  return '';
};

const dedupeQueryParts = (parts) => {
  const seen = new Set();
  return parts.filter((part) => {
    const key = String(part || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getQuioskMapsQuery = (location) => {
  const street = getStreetForMapsQuery(location);
  const city = getCityForMapsQuery(location);
  const queryParts = dedupeQueryParts(['Quiosk', street, city]);
  const query = queryParts.join(' ').trim();
  return query || String(location?.address || location?.name || 'Quiosk').trim();
};

const getDirectionsUrl = (location) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getQuioskMapsQuery(location))}`;

const getVisitUrl = (location) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getQuioskMapsQuery(location))}`;

const initFinder = () => {
  const root = document.querySelector('[data-finder]');
  if (!root) return;

  const searchInput = root.querySelector('[data-search]');
  const searchSubmitBtn = root.querySelector('[data-search-submit]');
  const finderCountEl = root.querySelector('[data-finder-count]');
  const noLocationEl = root.querySelector('[data-finder-no-location]');
  const openTipModalBtn = root.querySelector('[data-open-tip-modal]');
  const tipModal = root.querySelector('[data-finder-tip-modal]');
  const closeTipModalBtn = root.querySelector('[data-close-tip-modal]');
  const tipForm = root.querySelector('[data-finder-tip-form]');
  const tipPlaceInput = root.querySelector('[data-tip-place]');
  const finderParams = new URLSearchParams(window.location.search);
  const urlQuery = finderParams.get('q') || '';
  const urlRadius = finderParams.get('radius') || '';
  const mapDebug = finderParams.get('mapdebug') === '1';
  const initialQuery = urlQuery.trim();
  const radiusSelect = root.querySelector('[data-radius]');
  const list = root.querySelector('[data-results]');
  const map = root.querySelector('[data-map]');
  const alphabetRoot = root.querySelector('[data-locations-accordion]');
  if (!list || !map) return;
  const defaultCenter = { lat: 52.1326, lng: 5.2913 };
  let sourceData = [...kioskData];
  let allLocations = [...kioskData];
  let mapInstance = null;
  let infoWindow = null;
  let markers = [];
  let markersById = new Map();
  let activeMarker = null;
  let finderStatusMessage = '';
  let hasUserSearched = Boolean(initialQuery);
  const geocodeCache = new Map();
  let geocodePendingKey = '';

  const toRad = (value) => (value * Math.PI) / 180;
  const normalizeLoose = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const formatDutchPostcode = (value) => {
    const raw = normalizeLoose(value).toUpperCase();
    const match = raw.match(/^(\d{4})([A-Z]{2})$/);
    if (!match) return String(value || '').trim();
    return `${match[1]} ${match[2]}`;
  };
  const formatPlaceLabel = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
  const distanceInKm = (a, b) => {
    if (!a || !b) return Infinity;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return 6371 * c;
  };

  const locationMatchesQuery = (kiosk, queryText) => {
    if (!queryText) return true;
    const plainQuery = String(queryText).toLowerCase().trim();
    const looseQuery = normalizeLoose(queryText);
    const rawHaystack = [kiosk.city, kiosk.postcode, kiosk.name, kiosk.address]
      .join(' ')
      .toLowerCase();
    if (rawHaystack.includes(plainQuery)) return true;
    return normalizeLoose(rawHaystack).includes(looseQuery);
  };

  const locationMatchesPlace = (kiosk, queryText) => {
    const query = normalizeLoose(queryText);
    if (!query) return false;

    const cityRaw = String(kiosk.city || '').trim();
    const city = normalizeLoose(cityRaw);
    const postcode = normalizeLoose(kiosk.postcode);

    if (postcode && postcode === query) return true;
    if (city && (city === query || city.startsWith(query) || query.startsWith(city))) return true;

    const name = normalizeLoose(
      String(kiosk.name || kiosk.title || '')
        .replace(/^quiosk\s*/i, '')
        .trim()
    );
    if (name && (name === query || name.startsWith(query) || query.startsWith(name))) return true;

    return false;
  };

  const hasGoogleMaps = () => Boolean(window.google && window.google.maps);

  const geocodeQueryPoint = (queryText) => {
    const key = String(queryText || '').trim().toLowerCase();
    if (!key || !hasGoogleMaps()) return;
    if (geocodeCache.has(key) || geocodePendingKey === key) return;

    geocodePendingKey = key;
    const geocoder = new window.google.maps.Geocoder();
    const formattedQuery = formatDutchPostcode(queryText) || queryText;
    geocoder.geocode(
      {
        address: `${formattedQuery}, Nederland`,
        region: 'nl'
      },
      (results, status) => {
        geocodePendingKey = '';
        if (status === 'OK' && Array.isArray(results) && results[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          geocodeCache.set(key, {
            lat: typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat),
            lng: typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng)
          });
        } else {
          geocodeCache.set(key, null);
        }
        render();
      }
    );
  };

  const formatKeyHint = (key) => {
    if (!key) return 'geen key';
    if (key.length < 12) return key;
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  const showMapError = (message) => {
    map.innerHTML = `<div class="card"><p>${message}</p></div>`;
  };

  const showMapDebug = (message) => {
    if (!mapDebug) return;
    const box = document.createElement('div');
    box.className = 'card';
    box.style.marginTop = '10px';
    box.innerHTML = `<p><strong>Map debug</strong><br>${message}</p>`;
    map.appendChild(box);
  };

  const createMap = () => {
    if (!hasGoogleMaps() || mapInstance) return;
    mapInstance = new window.google.maps.Map(map, {
      center: defaultCenter,
      zoom: 7,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      },
      cameraControl: true,
      cameraControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      }
    });
    infoWindow = new window.google.maps.InfoWindow();
    infoWindow.addListener('closeclick', () => {
      if (activeMarker) {
        activeMarker.setIcon(getMarkerIcon(false));
        activeMarker.setZIndex(undefined);
        activeMarker = null;
      }
    });
  };

  const getMapsApiKey = async () => {
    const inlineKey = (window.QUIOSK_GOOGLE_MAPS_KEY || '').trim();
    if (inlineKey && !inlineKey.includes('VUL_HIER')) return inlineKey;

    try {
      const response = await fetch('/api/config', { headers: { Accept: 'application/json' } });
      if (!response.ok) return '';
      const payload = await response.json();
      return String(payload?.googleMapsApiKey || '').trim();
    } catch (_) {
      return '';
    }
  };

  const loadGoogleMaps = async () => {
    if (hasGoogleMaps()) return true;

    const apiKey = await getMapsApiKey();
    showMapDebug(`Key bron gecontroleerd. Gebruik key: <code>${formatKeyHint(apiKey)}</code>`);
    if (!apiKey) {
      showMapError(
        '<strong>Google Maps API-key ontbreekt.</strong><br>Voeg je key toe in <code>quiosk-zoeken.html</code> of via <code>.env</code>.'
      );
      return false;
    }

    window.gm_authFailure = () => {
      showMapDebug('gm_authFailure: Google wijst deze key af voor Maps JavaScript API (auth/restricties/billing).');
      showMapError('Google Maps authenticatie mislukt. Controleer API-key, billing en referrer restricties.');
    };

    const existingLoader = document.querySelector('script[data-google-maps-loader="true"]');
    if (existingLoader) {
      showMapDebug('Bestaande Google Maps loader gevonden, wacht op window.google.maps...');
      for (let i = 0; i < 100; i += 1) {
        if (hasGoogleMaps()) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
      showMapDebug('Timeout bij bestaand loader-script: window.google.maps bleef leeg.');
      showMapError('Google Maps laden duurt te lang. Herlaad de pagina of controleer de key-instellingen.');
      return false;
    }

    const loaded = await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = 'true';
      script.onload = () => {
        showMapDebug('Google Maps script onload event ontvangen.');
        resolve(hasGoogleMaps());
      };
      script.onerror = () => {
        showMapDebug('Google Maps script onerror event ontvangen.');
        resolve(false);
      };
      document.head.appendChild(script);
    });

    if (!loaded) {
      showMapDebug('Script geladen maar Maps object niet bruikbaar.');
      showMapError('Google Maps kon niet geladen worden. Controleer API-key en domeinrestricties.');
    }
    return loaded;
  };

  const clearMarkers = () => {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
    markersById = new Map();
    activeMarker = null;
  };

  const getMarkerIcon = (isActive = false) => {
    const size = isActive ? 44 : 38;
    const iconUrl = resolveStaticPath('Favicon.png?v=4');
    return {
      url: iconUrl,
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size / 2)
    };
  };

  const setActiveMarker = (marker) => {
    if (!marker) return;
    if (activeMarker && activeMarker !== marker) {
      activeMarker.setIcon(getMarkerIcon(false));
      activeMarker.setZIndex(undefined);
    }
    activeMarker = marker;
    activeMarker.setIcon(getMarkerIcon(true));
    activeMarker.setZIndex(999);
  };

  const renderMap = (filtered) => {
    if (!mapInstance || !hasGoogleMaps()) return;

    clearMarkers();

    if (!filtered.length) {
      mapInstance.setCenter(defaultCenter);
      mapInstance.setZoom(7);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();

    filtered.forEach((k) => {
      if (!k.coords) return;
      const marker = new window.google.maps.Marker({
        position: k.coords,
        map: mapInstance,
        title: k.name,
        icon: getMarkerIcon(false)
      });
      marker.__locationId = k.id;

      marker.addListener('click', () => {
        if (!infoWindow) return;
        setActiveMarker(marker);
        infoWindow.setContent(
          `<div class="quiosk-map-card"><h4>${k.name}</h4><p>${k.address}</p><div class="quiosk-map-card-actions"><a class="btn btn-ghost" href="${getDirectionsUrl(k)}" target="_blank" rel="noopener noreferrer">Navigeer</a><a class="btn btn-ghost" href="${getVisitUrl(k)}" target="_blank" rel="noopener noreferrer">Bekijk locatie</a></div></div>`
        );
        infoWindow.open({ anchor: marker, map: mapInstance });
      });

      markers.push(marker);
      markersById.set(k.id, marker);
      bounds.extend(k.coords);
    });

    if (markers.length === 1) {
      mapInstance.setCenter(filtered[0].coords);
      mapInstance.setZoom(14);
    } else if (markers.length > 1) {
      mapInstance.fitBounds(bounds);
    }
  };

  const bindMapFocusButtons = (filtered) => {
    const focusButtons = list.querySelectorAll('[data-focus-id]');
    focusButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const id = Number(button.dataset.focusId);
        const location = filtered.find((k) => k.id === id);
        if (!location || !location.coords || !mapInstance) return;
        map.scrollIntoView({ behavior: 'smooth', block: 'start' });
        mapInstance.setCenter(location.coords);
        mapInstance.setZoom(15);
        const marker = markersById.get(id);
        if (marker && window.google?.maps?.event) {
          window.google.maps.event.trigger(marker, 'click');
        }
      });
    });
  };

  const getStreetFromAddress = (address) => {
    const raw = String(address || '').trim();
    if (!raw) return '';
    return raw.split(',')[0].trim();
  };

  const getCityFromAddress = (address) => {
    const raw = String(address || '').trim();
    if (!raw) return '';
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return '';

    // Try to extract city from Dutch postcode segment like "4003 AZ Tiel".
    for (const part of parts) {
      const match = part.match(/\b\d{4}\s*[A-Za-z]{2}\s+(.+)$/);
      if (match?.[1]) return match[1].trim();
    }

    // Fallback: last meaningful segment before country label.
    const filtered = parts.filter((part) => !/^(nederland|netherlands|belgie|belgium)$/i.test(part));
    return filtered.length ? filtered[filtered.length - 1] : '';
  };

  const getCityFromName = (location) => {
    const rawName = String(location?.name || location?.title || '').trim();
    if (!rawName) return '';
    const withoutPrefix = rawName.replace(/^quiosk\s*/i, '').replace(/\bb\.?v\.?$/i, '').trim();
    if (!withoutPrefix) return '';
    return withoutPrefix;
  };

  const getLocationCity = (location) => {
    const explicitCity = String(location?.city || '').trim();
    if (explicitCity) return explicitCity;
    const cityFromName = getCityFromName(location);
    if (cityFromName) return cityFromName;
    return '';
  };

  const getAlphabetSourceText = (location) => {
    const city = getLocationCity(location);
    if (city) return city;
    return '';
  };

  const focusLocationOnMap = (locationId) => {
    const id = Number(locationId);
    if (!Number.isFinite(id)) return;
    const location = allLocations.find((item) => Number(item.id) === id);
    if (!location) return;

    const city = getLocationCity(location);
    if (searchInput) searchInput.value = city || '';
    render();

    map.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const marker = markersById.get(id);
    if (marker && mapInstance && window.google?.maps?.event) {
      mapInstance.setCenter(location.coords);
      mapInstance.setZoom(15);
      window.google.maps.event.trigger(marker, 'click');
      return;
    }

    if (mapInstance && location.coords) {
      mapInstance.setCenter(location.coords);
      mapInstance.setZoom(15);
    }
  };

  const renderAlphabetAccordion = (locations) => {
    if (!alphabetRoot) return;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const grouped = new Map(alphabet.map((letter) => [letter, []]));

    (Array.isArray(locations) ? locations : []).forEach((location) => {
      if (!location?.coords) return;
      const sourceText = getAlphabetSourceText(location);
      if (!sourceText) return;
      const first = sourceText.charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(first) ? first : '#';
      if (!grouped.has(letter)) grouped.set(letter, []);
      grouped.get(letter).push(location);
    });

    grouped.forEach((rows) => {
      rows.sort((a, b) => {
        const cityCmp = String(a.city || '').localeCompare(String(b.city || ''), 'nl-NL');
        if (cityCmp !== 0) return cityCmp;
        return String(a.name || '').localeCompare(String(b.name || ''), 'nl-NL');
      });
    });

    const letters = [...alphabet, ...(grouped.has('#') ? ['#'] : [])];
    alphabetRoot.innerHTML = letters
      .map((letter) => {
        const locationsForLetter = grouped.get(letter) || [];
        const isEmpty = locationsForLetter.length === 0;
        const content = isEmpty
          ? '<div class="alpha-item-body"><p>Geen locaties</p></div>'
          : `<div class="alpha-item-body"><div class="alpha-city-list">${locationsForLetter
              .map(
                (location) => {
                  const city = getLocationCity(location);
                  const cityLabel = city || (location.name || location.title || 'Onbekende plaats');
                  return `<a class="alpha-city-link" href="#finder-map" data-alpha-location-id="${location.id}">Quiosk ${cityLabel} - ${getStreetFromAddress(location.address)}</a>`;
                }
              )
              .join('')}</div></div>`;

        return `<details class="alpha-item${isEmpty ? ' is-empty' : ''}"><summary><span>${letter}</span><span>${locationsForLetter.length}</span></summary>${content}</details>`;
      })
      .join('');

    const locationLinks = alphabetRoot.querySelectorAll('[data-alpha-location-id]');
    locationLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        focusLocationOnMap(link.dataset.alphaLocationId);
      });
    });
  };

  const render = () => {
    const inputValue = searchInput ? (searchInput.value || '').trim() : '';
    const queryText = (inputValue || initialQuery).trim();
    const q = queryText.toLowerCase();
    const radiusKm = Number(radiusSelect?.value || 0);
    const hasGeocodeResult = q ? geocodeCache.has(q) : false;
    const geocodePoint = q && hasGeocodeResult ? geocodeCache.get(q) : null;
    const geocodeIsPending = q ? geocodePendingKey === q && !hasGeocodeResult : false;

    if (q) geocodeQueryPoint(queryText);

    const qMatches = q
      ? allLocations.filter((location) => locationMatchesQuery(location, q) && location.coords)
      : [];
    const matchesCenter =
      qMatches.length > 0
        ? {
            lat: qMatches.reduce((sum, location) => sum + location.coords.lat, 0) / qMatches.length,
            lng: qMatches.reduce((sum, location) => sum + location.coords.lng, 0) / qMatches.length
          }
        : null;

    const referencePoint = geocodePoint || matchesCenter;

    const filtered = sourceData.filter((kiosk) => {
      const textMatch = locationMatchesQuery(kiosk, q);

      if (radiusKm > 0) {
        if (!referencePoint) return false;
        if (!kiosk.coords) return false;
        return distanceInKm(referencePoint, kiosk.coords) <= radiusKm;
      }

      if (q) {
        if (geocodePoint) return true;
        return textMatch;
      }
      return true;
    });

    if (q && geocodePoint) {
      filtered.sort((a, b) => {
        const da = distanceInKm(geocodePoint, a.coords);
        const db = distanceInKm(geocodePoint, b.coords);
        return da - db;
      });
    }

    if (finderCountEl) {
      finderCountEl.textContent = String(filtered.length);
    }

    if (noLocationEl) {
      const hasQuioskInSearchedPlace = q
        ? allLocations.some((location) => locationMatchesPlace(location, queryText))
        : true;
      const showNoLocationMessage =
        hasUserSearched &&
        Boolean(q) &&
        !geocodeIsPending &&
        hasGeocodeResult &&
        !!geocodePoint &&
        !hasQuioskInSearchedPlace;
      noLocationEl.hidden = !showNoLocationMessage;
      if (showNoLocationMessage) {
        const safePlace = formatPlaceLabel(queryText || 'deze plaats');
        noLocationEl.innerHTML = `In ${safePlace} is nog geen Quiosk. <button type="button" class="finder-tip-btn" data-open-tip-modal>Stuur ons jouw tip</button>.`;
        noLocationEl.querySelector('[data-open-tip-modal]')?.addEventListener('click', openTipModal);
      }
    }

    list.innerHTML = filtered
      .map(
        (k) => `
          <article class="card reveal">
            <h3><button class="finder-location-title" type="button" data-focus-id="${k.id}">${k.name}</button></h3>
            <p>${k.address}</p>
            <div class="cta-row finder-cta-row">
              <button class="btn btn-ghost" type="button" data-focus-id="${k.id}">Toon op kaart</button>
              <a class="btn btn-ghost" href="${getDirectionsUrl(k)}" target="_blank" rel="noopener noreferrer">Navigeer</a>
              <a class="btn btn-ghost" href="${getVisitUrl(k)}" target="_blank" rel="noopener noreferrer">Bekijk locatie</a>
            </div>
          </article>`
      )
      .join('');

    if (!filtered.length) {
      if (geocodeIsPending && q) {
        list.innerHTML = '<article class="card"><p>Zoeken op plaats of postcode...</p></article>';
      } else if (q && radiusKm > 0 && hasGeocodeResult && !geocodePoint && !qMatches.length) {
        list.innerHTML =
          '<article class="card"><p>Plaats of postcode niet gevonden. Controleer de spelling of kies <strong>Alle afstanden</strong>.</p></article>';
      } else if (!sourceData.length && finderStatusMessage) {
        list.innerHTML = `<article class="card"><p><strong>${finderStatusMessage}</strong><br>Importeer eerst locaties via de backend-import en refresh daarna deze pagina.</p></article>`;
      } else {
        list.innerHTML = '<p>Geen Quiosks gevonden met deze filters.</p>';
      }
    }
    bindMapFocusButtons(filtered);
    renderMap(filtered);
  };

  if (searchInput && initialQuery) {
    searchInput.value = initialQuery;
  }
  if (radiusSelect && urlRadius) {
    const allowed = new Set(['0', '5', '10', '25', '50', '100']);
    if (allowed.has(String(urlRadius))) {
      radiusSelect.value = String(urlRadius);
    }
  }
  if (noLocationEl) noLocationEl.hidden = true;

  const runSearch = () => {
    hasUserSearched = true;
    render();
  };

  if (searchSubmitBtn) {
    searchSubmitBtn.addEventListener('click', runSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('input', render);
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSearch();
      }
    });
  }

  if (radiusSelect) {
    radiusSelect.addEventListener('input', render);
  }

  const closeTipModal = () => {
    if (!tipModal) return;
    tipModal.classList.remove('is-open');
    tipModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const openTipModal = () => {
    if (!tipModal) return;
    if (tipPlaceInput && searchInput) {
      tipPlaceInput.value = (searchInput.value || '').trim();
    }
    tipModal.classList.add('is-open');
    tipModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  if (openTipModalBtn) openTipModalBtn.addEventListener('click', openTipModal);
  if (closeTipModalBtn) closeTipModalBtn.addEventListener('click', closeTipModal);
  if (tipModal) {
    tipModal.addEventListener('click', (event) => {
      if (event.target === tipModal) closeTipModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && tipModal?.classList.contains('is-open')) {
      closeTipModal();
    }
  });

  if (tipForm) {
    tipForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(tipForm);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const place = String(formData.get('place') || '').trim();
      const tip = String(formData.get('tip') || '').trim();
      const currentSearch = (searchInput?.value || '').trim();

      const subject = `Tip nieuwe Quiosk locatie - ${place || currentSearch || 'Onbekend'}`;
      const body = [
        `Naam: ${name}`,
        `E-mail: ${email}`,
        `Plaats/postcode: ${place || currentSearch || '-'}`,
        '',
        'Tip:',
        tip
      ].join('\n');

      window.location.href = `mailto:info@quiosk.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      closeTipModal();
      tipForm.reset();
    });
  }
  const applyInitialQueryFilter = (locations) => {
    return locations;
  };

  const renderWithSource = (locations) => {
    allLocations = Array.isArray(locations) ? locations : [];
    renderAlphabetAccordion(locations);
    sourceData = applyInitialQueryFilter(locations);
    render();
  };

  (async () => {
    const loaded = await loadGoogleMaps();
    if (loaded) createMap();

    const cached = readFinderLocationsCache();
    const hasFreshCachedLocations = cached?.locations?.length && isFinderLocationsCacheFresh(cached);

    if (hasFreshCachedLocations) {
      renderWithSource(cached.locations);
    }

    const dynamicLocations = await fetchDynamicLocations();
    if (dynamicLocations && dynamicLocations.length) {
      finderStatusMessage = '';
      writeFinderLocationsCache(dynamicLocations, 'api');
      renderWithSource(dynamicLocations);
      return;
    }

    if (!hasFreshCachedLocations) {
      finderStatusMessage = 'Nog geen locaties beschikbaar in de database';
      renderAlphabetAccordion([]);
      sourceData = [];
      render();
    }
  })();
};

const initHeroSlider = () => {
  const slider = document.querySelector('[data-hero-slider]');
  if (!slider) return;

  const slides = slider.querySelectorAll('.hero-slide');
  const prev = slider.querySelector('.hero-arrow-prev');
  const next = slider.querySelector('.hero-arrow-next');
  const titleEl = document.querySelector('[data-hero-title]');
  const subtitleEl = document.querySelector('[data-hero-subtitle]');
  const ctaPrimary = document.querySelector('[data-hero-cta-primary]');
  const ctaSecondary = document.querySelector('[data-hero-cta-secondary]');
  if (!slides.length || !prev || !next) return;

  const heroContent = [
    {
      title: 'Slimme vending in Nederland, altijd dichtbij en altijd open.',
      subtitle:
        'Voor partners betekent dit extra omzet zonder investering. Voor onze fans betekent dit 24/7 snacks, drinks en essentials op locaties waar je toch al bent.',
      primaryLabel: 'Voor onze fans',
      primaryHref: 'voor-onze-fans.html',
      secondaryLabel: 'Word partner',
      secondaryHref: 'word-partner.html'
    },
    {
      title: '24/7 snacks en drinks onderweg, zonder gedoe.',
      subtitle:
        'Vind een Quiosk bij tankstations, wasstraten, laadpleinen en andere drukbezochte locaties in Nederland.',
      primaryLabel: 'Vind een Quiosk',
      primaryHref: 'quiosk-zoeken.html',
      secondaryLabel: 'Support bij aankoop',
      secondaryHref: 'feedback-terugbetaling.html'
    },
    {
      title: 'Verdien mee met een Quiosk op jouw locatie.',
      subtitle:
        'Wij investeren, plaatsen en beheren de vending machine. Jij stelt de locatie beschikbaar en deelt mee in de omzet.',
      primaryLabel: 'Plan gratis locatiecheck',
      primaryHref: 'word-partner.html#lead',
      secondaryLabel: 'Bel direct',
      secondaryHref: 'tel:0307370809'
    }
  ];

  slider.classList.add('is-js');
  let index = 0;
  let timer;

  const show = (i) => {
    slides.forEach((slide, idx) => {
      slide.classList.toggle('is-active', idx === i);
    });
    index = i;

    if (titleEl && subtitleEl && ctaPrimary && ctaSecondary && heroContent[i]) {
      const content = heroContent[i];
      titleEl.textContent = content.title;
      subtitleEl.textContent = content.subtitle;
      ctaPrimary.textContent = content.primaryLabel;
      ctaPrimary.setAttribute('href', content.primaryHref);
      ctaSecondary.textContent = content.secondaryLabel;
      ctaSecondary.setAttribute('href', content.secondaryHref);
    }
  };

  const start = () => {
    clearInterval(timer);
    timer = setInterval(() => {
      show((index + 1) % slides.length);
    }, 6500);
  };

  prev.addEventListener('click', () => {
    show((index - 1 + slides.length) % slides.length);
    start();
  });

  next.addEventListener('click', () => {
    show((index + 1) % slides.length);
    start();
  });

  show(0);
  start();
};

const initInstaSlider = () => {
  const roots = document.querySelectorAll('[data-insta-slider]');
  if (!roots.length) return;

  roots.forEach((root) => {
    const track = root.querySelector('.insta-track');
    const prev = root.querySelector('.insta-arrow-prev');
    const next = root.querySelector('.insta-arrow-next');
    const initialPages = root.querySelectorAll('.insta-page');
    if (!track || !initialPages.length || !prev || !next) return;

    const allCards = Array.from(track.querySelectorAll('.insta-card'));
    if (!allCards.length) return;

    for (let i = allCards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    let index = 0;
    let maxIndex = 0;
    let lastPerPage = null;
    let revealTimers = [];
    let revealToken = 0;
    let hasEnteredViewport = false;
    let isInViewport = false;

    const getCardsPerPage = () => {
      if (window.innerWidth <= 680) return 4;
      return 12;
    };

    const buildPages = () => {
      const perPage = getCardsPerPage();
      if (perPage === lastPerPage && track.children.length) return;
      lastPerPage = perPage;

      track.innerHTML = '';
      for (let i = 0; i < allCards.length; i += perPage) {
        const page = document.createElement('div');
        page.className = 'insta-page';
        allCards.slice(i, i + perPage).forEach((card) => page.appendChild(card));
        track.appendChild(page);
      }

      maxIndex = Math.max(0, track.children.length - 1);
      if (index > maxIndex) index = maxIndex;
    };

    const clearRevealTimers = () => {
      revealTimers.forEach((timer) => window.clearTimeout(timer));
      revealTimers = [];
    };

    const showCurrentPageInstant = () => {
      const pages = Array.from(track.querySelectorAll('.insta-page'));
      const currentPage = pages[index];
      if (!currentPage) return;
      clearRevealTimers();
      const cards = Array.from(currentPage.querySelectorAll('.insta-card'));
      cards.forEach((card) => {
        card.classList.remove('is-pending');
        card.classList.add('is-visible');
      });
    };

    const revealCurrentPage = () => {
      const pages = Array.from(track.querySelectorAll('.insta-page'));
      const currentPage = pages[index];
      if (!currentPage) return;

      revealToken += 1;
      const localToken = revealToken;
      clearRevealTimers();

      const cards = Array.from(currentPage.querySelectorAll('.insta-card'));
      cards.forEach((card) => {
        card.classList.remove('is-visible');
        card.classList.add('is-pending');
      });

      const order = [...cards];
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      order.forEach((card, revealIndex) => {
        const timer = window.setTimeout(() => {
          if (localToken !== revealToken) return;
          card.classList.remove('is-pending');
          card.classList.add('is-visible');
        }, 85 * revealIndex + 30);
        revealTimers.push(timer);
      });
    };

    const update = () => {
      buildPages();
      track.style.transform = `translateX(-${index * 100}%)`;
      prev.disabled = index <= 0;
      next.disabled = index >= maxIndex;
      if (!hasEnteredViewport || !isInViewport) {
        showCurrentPageInstant();
      } else {
        revealCurrentPage();
      }
    };

    prev.addEventListener('click', () => {
      if (index > 0) {
        index -= 1;
        update();
      }
    });

    next.addEventListener('click', () => {
      if (index < maxIndex) {
        index += 1;
        update();
      }
    });

    let resizeTimer;
    window.addEventListener(
      'resize',
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(update, 120);
      },
      { passive: true }
    );

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          isInViewport = entry.isIntersecting;
          if (entry.isIntersecting && !hasEnteredViewport) {
            hasEnteredViewport = true;
            revealCurrentPage();
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(root);
    } else {
      hasEnteredViewport = true;
      isInViewport = true;
    }

    update();
  });
};

const initInstaLightbox = () => {
  const roots = document.querySelectorAll('[data-insta-slider]');
  const modal = document.querySelector('[data-insta-modal]');
  const modalImg = document.querySelector('[data-insta-modal-image]');
  const closeBtn = document.querySelector('[data-insta-modal-close]');
  if (!roots.length || !modal || !modalImg || !closeBtn) return;

  const close = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modalImg.removeAttribute('src');
    modalImg.alt = '';
    modalImg.hidden = true;
    document.body.style.overflow = '';
  };

  const openImage = (src, alt) => {
    modalImg.src = src;
    modalImg.alt = alt || 'Instagram foto';
    modalImg.hidden = false;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  roots.forEach((root) => {
    root.addEventListener('click', (event) => {
      const card = event.target.closest('.insta-card');
      if (!card) return;
      event.preventDefault();

      const image = card.querySelector('img');
      if (image?.src) {
        openImage(image.src, image.alt);
      }
    });
  });

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
};

const initPartnersHeroBalance = () => {
  const grid = document.querySelector('.partners-hero-grid');
  if (!grid) return;

  const textCol = grid.querySelector(':scope > .reveal');
  const mediaCol = grid.querySelector('.partners-hero-media');
  if (!textCol || !mediaCol) return;

  const syncHeights = () => {
    if (window.innerWidth <= 920) {
      mediaCol.style.height = '';
      return;
    }
    const textHeight = textCol.offsetHeight;
    const target = Math.min(textHeight, 320);
    mediaCol.style.height = `${target}px`;
  };

  syncHeights();
  window.addEventListener('resize', syncHeights, { passive: true });
  window.addEventListener('load', syncHeights, { passive: true });
};

const initImageLightbox = () => {
  const lightbox = document.querySelector('[data-image-lightbox]');
  const lightboxImg = document.querySelector('[data-image-lightbox-img]');
  const closeBtn = document.querySelector('[data-image-lightbox-close]');
  const triggers = document.querySelectorAll('.partner-photo-viewable');

  if (!lightbox || !lightboxImg || !closeBtn || !triggers.length) return;

  const close = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImg.removeAttribute('src');
    lightboxImg.removeAttribute('alt');
    document.body.style.overflow = '';
  };

  const open = (src, alt) => {
    lightboxImg.src = src;
    lightboxImg.alt = alt || 'Vergrote afbeelding';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  triggers.forEach((img) => {
    img.addEventListener('click', () => open(img.src, img.alt));
  });

  closeBtn.addEventListener('click', close);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) close();
  });
};

const initQuiosk360Viewer = async () => {
  const trigger = document.querySelector('[data-open-quiosk-360]');
  const modal = document.querySelector('[data-quiosk-360-modal]');
  const stage = document.querySelector('[data-quiosk-360-stage]');
  const image = document.querySelector('[data-quiosk-360-image]');
  const hint = document.querySelector('[data-quiosk-360-hint]');
  const closeBtn = document.querySelector('[data-quiosk-360-close]');
  const prevBtn = document.querySelector('[data-quiosk-360-prev]');
  const nextBtn = document.querySelector('[data-quiosk-360-next]');

  if (!trigger || !modal || !stage || !image || !hint || !closeBtn || !prevBtn || !nextBtn) return;

  const staticFallback = trigger.querySelector('img')?.getAttribute('src') || 'images/hero-partner.jpg';
  let frames = [];
  let frameIndex = 0;
  let isOpen = false;
  let isDragging = false;
  let lastClientX = 0;
  let dragBuffer = 0;
  const DRAG_THRESHOLD = 20;
  let touchActive = false;

  const normalizeFramePath = (value) => {
    const v = String(value || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    return resolveStaticPath(v.replace(/^\/+/, ''));
  };

  try {
    const response = await fetch(resolveStaticPath('images/quiosk-360/frames.json'), {
      headers: { Accept: 'application/json' }
    });
    if (response.ok) {
      const payload = await response.json();
      const list = Array.isArray(payload?.frames) ? payload.frames : [];
      frames = list.map(normalizeFramePath).filter(Boolean);
    }
  } catch (_) {
    frames = [];
  }

  const frameCount = frames.length;

  const setHint = (text) => {
    hint.textContent = text;
  };

  const renderFrame = () => {
    if (frameCount > 1) {
      const src = frames[frameIndex];
      if (src) image.src = src;
      image.alt = `Quiosk 360 frame ${frameIndex + 1} van ${frameCount}`;
      setHint('Gebruik pijltjes, sleep of swipe om rondom de Quiosk te kijken.');
      return;
    }

    image.src = normalizeFramePath(staticFallback);
    image.alt = 'Quiosk afbeelding';
    setHint('Upload 360 frames in images/quiosk-360/frames.json om deze viewer interactief te maken.');
  };

  const rotateBy = (delta) => {
    if (frameCount <= 1 || !delta) return;
    frameIndex = (frameIndex + delta + frameCount) % frameCount;
    renderFrame();
  };

  const open = () => {
    isOpen = true;
    frameIndex = 0;
    renderFrame();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    isOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const onDragStart = (event) => {
    if (!isOpen) return;
    if (event.target.closest('.quiosk-360-nav')) return;
    isDragging = true;
    dragBuffer = 0;
    lastClientX = event.clientX;
    stage.setPointerCapture?.(event.pointerId);
  };

  const onDragMove = (event) => {
    if (!isOpen || !isDragging || frameCount <= 1) return;
    const deltaX = event.clientX - lastClientX;
    lastClientX = event.clientX;
    dragBuffer += deltaX;

    while (Math.abs(dragBuffer) >= DRAG_THRESHOLD) {
      if (dragBuffer > 0) {
        rotateBy(-1);
        dragBuffer -= DRAG_THRESHOLD;
      } else {
        rotateBy(1);
        dragBuffer += DRAG_THRESHOLD;
      }
    }
  };

  const onDragEnd = (event) => {
    if (!isOpen) return;
    isDragging = false;
    dragBuffer = 0;
    stage.releasePointerCapture?.(event.pointerId);
  };

  const onTouchStart = (event) => {
    if (!isOpen || frameCount <= 1) return;
    if (event.target.closest('.quiosk-360-nav')) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    touchActive = true;
    dragBuffer = 0;
    lastClientX = touch.clientX;
  };

  const onTouchMove = (event) => {
    if (!isOpen || !touchActive || frameCount <= 1) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - lastClientX;
    lastClientX = touch.clientX;
    dragBuffer += deltaX;

    while (Math.abs(dragBuffer) >= DRAG_THRESHOLD) {
      if (dragBuffer > 0) {
        rotateBy(-1);
        dragBuffer -= DRAG_THRESHOLD;
      } else {
        rotateBy(1);
        dragBuffer += DRAG_THRESHOLD;
      }
    }
  };

  const onTouchEnd = () => {
    touchActive = false;
    dragBuffer = 0;
  };

  trigger.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    rotateBy(-1);
  });
  nextBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    rotateBy(1);
  });
  prevBtn.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  nextBtn.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  stage.addEventListener('pointerdown', onDragStart);
  stage.addEventListener('pointermove', onDragMove);
  stage.addEventListener('pointerup', onDragEnd);
  stage.addEventListener('pointercancel', onDragEnd);
  stage.addEventListener('touchstart', onTouchStart, { passive: true });
  stage.addEventListener('touchmove', onTouchMove, { passive: true });
  stage.addEventListener('touchend', onTouchEnd, { passive: true });
  stage.addEventListener('touchcancel', onTouchEnd, { passive: true });

  stage.addEventListener(
    'wheel',
    (event) => {
      if (!isOpen || frameCount <= 1) return;
      event.preventDefault();
      rotateBy(event.deltaY > 0 ? 1 : -1);
    },
    { passive: false }
  );

  document.addEventListener('keydown', (event) => {
    if (!isOpen) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowRight') rotateBy(1);
    if (event.key === 'ArrowLeft') rotateBy(-1);
  });
};

const initFaqAccordion = () => {
  const items = document.querySelectorAll('.faq-accordion .faq-item');
  if (!items.length) return;

  items.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      items.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
};

const initNewsModal = () => {
  const modal = document.querySelector('[data-news-modal]');
  const modalImage = document.querySelector('[data-news-modal-image]');
  const modalDate = document.querySelector('[data-news-modal-date]');
  const modalTitle = document.querySelector('[data-news-modal-title]');
  const modalContent = document.querySelector('[data-news-modal-content]');
  const closeBtn = document.querySelector('[data-news-close]');
  const cards = document.querySelectorAll('[data-news-item]');
  if (!modal || !modalImage || !modalDate || !modalTitle || !modalContent || !closeBtn || !cards.length) return;

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const openModal = (card) => {
    const image = card.querySelector('.news-media img');
    const date = card.dataset.newsDate || '';
    const title = card.dataset.newsTitle || '';
    const content = (card.dataset.newsContent || '')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    if (image) {
      modalImage.src = image.src;
      modalImage.alt = image.alt || title;
    } else {
      modalImage.removeAttribute('src');
      modalImage.alt = '';
    }

    modalDate.textContent = date;
    modalTitle.textContent = title;
    modalContent.innerHTML = content.map((paragraph) => `<p>${paragraph}</p>`).join('');

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  cards.forEach((card) => {
    card.addEventListener('click', (event) => {
      const openButton = event.target.closest('[data-news-open]');
      if (openButton || event.currentTarget === event.target || event.target.closest('.news-media, h3, p, .news-date')) {
        openModal(card);
      }
    });
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
};

const initProductModal = () => {
  const modal = document.querySelector('[data-product-modal]');
  const titleEl = document.querySelector('[data-product-title]');
  const textEl = document.querySelector('[data-product-text]');
  const closeBtn = document.querySelector('[data-product-close]');
  if (!modal || !titleEl || !textEl || !closeBtn) return;

  const close = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const open = (card) => {
    titleEl.textContent = card.dataset.productName || 'Productinformatie';
    textEl.textContent = card.dataset.productDetail || '';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-open]');
    if (!button) return;
    event.stopPropagation();
    const card = button.closest('.product-card');
    if (!card) return;
    open(card);
  });

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
};

const initDynamicProductImages = async () => {
  const slider = document.querySelector('[data-product-slider]');
  const grid = document.querySelector('[data-product-grid]');
  const prevBtn = document.querySelector('[data-product-prev]');
  const nextBtn = document.querySelector('[data-product-next]');
  if (!slider || !grid || !prevBtn || !nextBtn) return;

  const fetchImagesFromProductApi = async () => {
    const response = await fetch('/api/product-images', { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.images) || !payload.images.length) return null;
    return payload.images;
  };

  const fetchImagesFromGitHub = async () => {
    const isGitHubPages = /\.github\.io$/i.test(window.location.hostname);
    if (!isGitHubPages) return null;

    const apiUrl = 'https://api.github.com/repos/nickquiosk/Quiosk-website/contents/images/producten';
    const response = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!Array.isArray(payload)) return null;

    const images = payload
      .filter((item) => item && item.type === 'file')
      .map((item) => item.download_url || '')
      .filter((url) => /\.(png|jpe?g|webp|avif)$/i.test(url));

    return images.length ? images : null;
  };

  const getProductNameFromSource = (source, fallbackIndex) => {
    try {
      const url = new URL(source, window.location.origin);
      const fileName = decodeURIComponent(url.pathname.split('/').pop() || '');
      const withoutExt = fileName.replace(/\.[a-z0-9]+$/i, '');
      const clean = withoutExt.replace(/[_-]+/g, ' ').trim();
      return clean || `Product ${fallbackIndex + 1}`;
    } catch {
      return `Product ${fallbackIndex + 1}`;
    }
  };

  try {
    const imagesFromApi = await fetchImagesFromProductApi().catch(() => null);
    const imagesFromGitHub = imagesFromApi ? null : await fetchImagesFromGitHub().catch(() => null);
    const sourceImages = imagesFromApi || imagesFromGitHub;

    if (!sourceImages || !sourceImages.length) {
      grid.innerHTML = '<article class="card"><p>Nog geen productfoto\'s gevonden in <code>images/producten</code>.</p></article>';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const images = [...sourceImages];
    for (let i = images.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }

    grid.innerHTML = images
      .map((source, index) => {
        const name = getProductNameFromSource(source, index);
        return `
          <article class="card product-card" data-product-name="${name}" data-product-detail="${name} is een populair product uit het actuele Quiosk-assortiment. Beschikbaarheid kan per locatie verschillen.">
            <div class="product-media"><img src="${source}" alt="${name}" loading="lazy" decoding="async" /></div>
            <h3>${name}</h3>
          </article>
        `;
      })
      .join('');

    const cardMarkup = Array.from(grid.querySelectorAll('.product-card')).map((card) => card.outerHTML);
    const totalOriginal = cardMarkup.length;
    let index = 0;
    let perView = 4;
    let loopEnabled = false;
    let autoTimer = null;
    let autoKickTimer = null;
    let resizeTimer = null;

    const getPerView = () => {
      const width = window.innerWidth;
      if (width <= 480) return 1;
      if (width <= 680) return 2;
      if (width <= 920) return 3;
      return 4;
    };

    const getMaxIndex = () => Math.max(0, totalOriginal - perView);

    const getStep = () => {
      const firstCard = grid.querySelector('.product-card');
      if (!firstCard) return 0;
      const gap = parseFloat(getComputedStyle(grid).gap || '0');
      return firstCard.getBoundingClientRect().width + gap;
    };

    const setTransform = (animate = true) => {
      if (!animate) grid.style.transition = 'none';
      const step = getStep();
      if (!step) {
        if (!animate) grid.style.transition = '';
        return;
      }
      grid.style.transform = `translateX(-${index * step}px)`;
      if (!animate) {
        // Force sync reflow so transition can be restored for subsequent moves.
        void grid.offsetWidth;
        grid.style.transition = '';
      }
    };

    const updateButtons = () => {
      const hasMoves = loopEnabled || getMaxIndex() > 0;
      prevBtn.disabled = !hasMoves;
      nextBtn.disabled = !hasMoves;
    };

    const rebuildTrack = () => {
      perView = getPerView();
      loopEnabled = totalOriginal > perView;

      if (loopEnabled) {
        const head = cardMarkup.slice(0, perView);
        const tail = cardMarkup.slice(-perView);
        grid.innerHTML = [...tail, ...cardMarkup, ...head].join('');
        index = perView;
      } else {
        grid.innerHTML = cardMarkup.join('');
        index = 0;
      }

      setTransform(false);
      updateButtons();
    };

    const normalizeLoopPosition = () => {
      if (!loopEnabled) return;
      const upperBound = perView + totalOriginal;
      if (index >= upperBound) {
        index = perView;
        setTransform(false);
      } else if (index < perView) {
        index = perView + totalOriginal - 1;
        setTransform(false);
      }
    };

    const move = (delta) => {
      if (!totalOriginal) return;

      if (loopEnabled) {
        index += delta;
      } else {
        const maxIndex = getMaxIndex();
        index = Math.max(0, Math.min(maxIndex, index + delta));
      }

      setTransform(true);
      updateButtons();
    };

    const canAutoMove = () => {
      if (!totalOriginal) return false;
      if (loopEnabled) return true;
      return getMaxIndex() > 0;
    };

    const stopAuto = () => {
      if (autoKickTimer) {
        window.clearTimeout(autoKickTimer);
        autoKickTimer = null;
      }
      if (!autoTimer) return;
      window.clearInterval(autoTimer);
      autoTimer = null;
    };

    const startAuto = () => {
      stopAuto();
      if (!canAutoMove()) return;
      autoKickTimer = window.setTimeout(() => {
        move(1);
      }, 120);
      autoTimer = window.setInterval(() => {
        move(1);
      }, 2800);
    };

    prevBtn.addEventListener('click', () => {
      move(-1);
      startAuto();
    });

    nextBtn.addEventListener('click', () => {
      move(1);
      startAuto();
    });

    grid.addEventListener('transitionend', (event) => {
      if (event.propertyName !== 'transform') return;
      normalizeLoopPosition();
    });

    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);
    slider.addEventListener('focusin', stopAuto);
    slider.addEventListener('focusout', startAuto);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAuto();
      else startAuto();
    });

    window.addEventListener(
      'resize',
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          rebuildTrack();
          startAuto();
        }, 120);
      },
      { passive: true }
    );

    rebuildTrack();
    startAuto();
  } catch (_) {
    grid.innerHTML =
      '<article class="card"><p>Productfoto\'s konden niet geladen worden. Herstart de server en doe een harde refresh.</p></article>';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }
};

const initSpotlight = () => {
  const root = document.querySelector('[data-spotlight]');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll('[data-spotlight-tab]'));
  const dots = Array.from(root.querySelectorAll('[data-spotlight-dot]'));
  const panels = Array.from(root.querySelectorAll('[data-spotlight-panel]'));
  if (!tabs.length || !panels.length) return;

  const setActive = (targetId) => {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.target === targetId;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    dots.forEach((dot) => {
      dot.classList.toggle('is-active', dot.dataset.target === targetId);
      dot.setAttribute('aria-current', dot.dataset.target === targetId ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.id === targetId);
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActive(tab.dataset.target));
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => setActive(dot.dataset.target));
  });
};

const initOverTabs = () => {
  const root = document.querySelector('[data-over-tabs]');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll('[data-over-tab]'));
  const panels = Array.from(root.querySelectorAll('[data-over-panel]'));
  const toggles = Array.from(root.querySelectorAll('[data-over-toggle]'));
  if (!tabs.length || !panels.length || !toggles.length) return;
  const mobileQuery = window.matchMedia('(max-width: 920px)');

  const setDesktopActive = (targetId) => {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.target === targetId;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.id === targetId);
      panel.classList.remove('is-open');
    });
  };

  const setMobileOpen = (targetId) => {
    panels.forEach((panel) => {
      const isOpen = panel.id === targetId ? !panel.classList.contains('is-open') : false;
      panel.classList.toggle('is-open', isOpen);
      const toggle = panel.querySelector('[data-over-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', String(isOpen));
    });
  };

  const applyMode = () => {
    if (mobileQuery.matches) {
      root.classList.add('is-accordion');
      tabs.forEach((tab) => tab.setAttribute('aria-selected', 'false'));
      let hasOpen = false;
      panels.forEach((panel, idx) => {
        const shouldOpen = idx === 0;
        if (panel.classList.contains('is-open')) hasOpen = true;
        if (!hasOpen && shouldOpen) {
          panel.classList.add('is-open');
          const toggle = panel.querySelector('[data-over-toggle]');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
        } else if (!panel.classList.contains('is-open')) {
          const toggle = panel.querySelector('[data-over-toggle]');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
      });
      return;
    }

    root.classList.remove('is-accordion');
    const activeTab = tabs.find((tab) => tab.classList.contains('is-active')) || tabs[0];
    if (activeTab?.dataset.target) {
      setDesktopActive(activeTab.dataset.target);
    }
    panels.forEach((panel) => {
      panel.classList.remove('is-open');
      const toggle = panel.querySelector('[data-over-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (mobileQuery.matches) return;
      setDesktopActive(tab.dataset.target);
    });
  });

  toggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      if (!mobileQuery.matches) return;
      const panel = toggle.closest('[data-over-panel]');
      if (!panel?.id) return;
      setMobileOpen(panel.id);
    });
  });

  applyMode();
  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', applyMode);
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(applyMode);
  }
};

const initFactCounters = () => {
  const counters = Array.from(document.querySelectorAll('[data-count-to]'));
  if (!counters.length) return;

  const run = () => {
    counters.forEach((el) => {
      if (el.dataset.countDone === 'true') return;
      const target = Number(el.dataset.countTo || 0);
      const suffix = el.dataset.suffix || '';
      const duration = 1100;
      const start = performance.now();

      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        el.textContent = `${value.toLocaleString('nl-NL')}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(step);
          return;
        }
        el.dataset.countDone = 'true';
      };

      requestAnimationFrame(step);
    });
  };

  if (!('IntersectionObserver' in window)) {
    run();
    return;
  }

  const first = counters[0].closest('.over-stat-grid') || counters[0];
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run();
        obs.disconnect();
      });
    },
    { threshold: 0.35 }
  );

  observer.observe(first);
};

const initProcessLineAnimation = () => {
  const flows = document.querySelectorAll('[data-process-line]');
  if (!flows.length) return;

  const revealFlow = (flow) => {
    flow.classList.add('is-visible');
  };

  if (!('IntersectionObserver' in window)) {
    flows.forEach(revealFlow);
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealFlow(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.28 }
  );

  flows.forEach((flow) => observer.observe(flow));
};

const initFansMobileAccordion = () => {
  const cards = Array.from(document.querySelectorAll('.mobile-accordion-card'));
  if (!cards.length) return;

  const mobileQuery = window.matchMedia('(max-width: 680px)');
  const root = cards[0].closest('.grid-3');
  if (!root) return;

  const applyMode = () => {
    const isMobile = mobileQuery.matches;

    if (isMobile && !root.dataset.mobileAccordionInit) {
      cards.forEach((card, idx) => {
        card.classList.toggle('is-open', idx === 0);
        const button = card.querySelector('.mobile-accordion-toggle');
        if (button) button.setAttribute('aria-expanded', String(idx === 0));
      });
      root.dataset.mobileAccordionInit = 'true';
    }

    if (!isMobile) {
      cards.forEach((card) => {
        card.classList.add('is-open');
        const button = card.querySelector('.mobile-accordion-toggle');
        if (button) button.setAttribute('aria-expanded', 'true');
      });
      root.dataset.mobileAccordionInit = '';
    }
  };

  cards.forEach((card) => {
    const button = card.querySelector('.mobile-accordion-toggle');
    if (!button) return;

    button.addEventListener('click', () => {
      if (!mobileQuery.matches) return;
      const nextState = !card.classList.contains('is-open');
      card.classList.toggle('is-open', nextState);
      button.setAttribute('aria-expanded', String(nextState));
    });
  });

  applyMode();
  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', applyMode);
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(applyMode);
  }
};


initHeaderCta();
setActiveNav();
initMobileNav();
initHeaderScroll();
initBackToTop();
initCalculator();
initRefundForm();
initFinder();
initHeroSlider();
initInstaSlider();
initInstaLightbox();
initPartnersHeroBalance();
initImageLightbox();
initQuiosk360Viewer();
initFaqAccordion();
initNewsModal();
initProductModal();
initDynamicProductImages();
initSpotlight();
initOverTabs();
initFactCounters();
initProcessLineAnimation();
initFansMobileAccordion();
