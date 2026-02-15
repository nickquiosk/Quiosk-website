const initHeaderCta = () => {
  const navList = document.querySelector('.site-nav ul');
  if (!navList || navList.querySelector('.nav-cta-item')) return;

  const item = document.createElement('li');
  item.className = 'nav-cta-item';
  item.innerHTML =
    '<a class="nav-cta-link btn btn-primary" href="partners.html" data-nav>Word partner</a>';
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

    const staticPayload = await fetchJson('/data/locations.json');
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

const getDirectionsUrl = (location) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address || location.name)}`;

const getVisitUrl = (location) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address || location.name)}`;

const initFinder = () => {
  const root = document.querySelector('[data-finder]');
  if (!root) return;

  const searchInput = root.querySelector('[data-search]');
  const urlQuery = new URLSearchParams(window.location.search).get('q') || '';
  const initialQuery = urlQuery.trim();
  const filterInputs = root.querySelectorAll('[data-filter]');
  const list = root.querySelector('[data-results]');
  const map = root.querySelector('[data-map]');
  if (!list || !map) return;
  const defaultCenter = { lat: 52.1326, lng: 5.2913 };
  let sourceData = [...kioskData];
  let mapInstance = null;
  let infoWindow = null;
  let markers = [];
  let finderStatusMessage = '';

  const locationMatchesQuery = (kiosk, queryText) => {
    if (!queryText) return true;
    return [kiosk.city, kiosk.postcode, kiosk.name, kiosk.address]
      .join(' ')
      .toLowerCase()
      .includes(queryText);
  };

  const hasGoogleMaps = () => Boolean(window.google && window.google.maps);

  const showMapError = (message) => {
    map.innerHTML = `<div class="card"><p>${message}</p></div>`;
  };

  const createMap = () => {
    if (!hasGoogleMaps() || mapInstance) return;
    mapInstance = new window.google.maps.Map(map, {
      center: defaultCenter,
      zoom: 7,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
    infoWindow = new window.google.maps.InfoWindow();
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
    if (!apiKey) {
      showMapError(
        '<strong>Google Maps API-key ontbreekt.</strong><br>Voeg je key toe in <code>quiosk-zoeken.html</code> of via <code>.env</code>.'
      );
      return false;
    }

    window.gm_authFailure = () => {
      showMapError('Google Maps authenticatie mislukt. Controleer API-key, billing en referrer restricties.');
    };

    const existingLoader = document.querySelector('script[data-google-maps-loader="true"]');
    if (existingLoader) {
      for (let i = 0; i < 100; i += 1) {
        if (hasGoogleMaps()) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
      showMapError('Google Maps laden duurt te lang. Herlaad de pagina of controleer de key-instellingen.');
      return false;
    }

    const loaded = await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = 'true';
      script.onload = () => resolve(hasGoogleMaps());
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

    if (!loaded) {
      showMapError('Google Maps kon niet geladen worden. Controleer API-key en domeinrestricties.');
    }
    return loaded;
  };

  const clearMarkers = () => {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
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
        title: k.name
      });

      marker.addListener('click', () => {
        if (!infoWindow) return;
        infoWindow.setContent(
          `<strong>${k.name}</strong><br>${k.address}<br><div class="cta-row"><a class="btn btn-ghost" href="${getDirectionsUrl(k)}" target="_blank" rel="noopener noreferrer">Navigeer</a><a class="btn btn-ghost" href="${getVisitUrl(k)}" target="_blank" rel="noopener noreferrer">Bezoek locatie</a></div>`
        );
        infoWindow.open({ anchor: marker, map: mapInstance });
      });

      markers.push(marker);
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
        mapInstance.setCenter(location.coords);
        mapInstance.setZoom(15);
      });
    });
  };

  const render = () => {
    const inputValue = searchInput ? (searchInput.value || '').trim() : '';
    const q = (inputValue || initialQuery).toLowerCase().trim();
    const activeFilters = [...filterInputs].filter((el) => el.checked).map((el) => el.value);

    const filtered = sourceData.filter((kiosk) => {
      const textMatch = locationMatchesQuery(kiosk, q);
      if (!textMatch) return false;

      const checks = {
        open: kiosk.isOpen,
        drinks: kiosk.products.includes('Drinks'),
        snacks: kiosk.products.includes('Snacks'),
        gezond: kiosk.products.includes('Gezond'),
        indoor: kiosk.environment === 'Indoor',
        outdoor: kiosk.environment === 'Outdoor',
        contactloos: kiosk.contactless
      };

      return activeFilters.every((f) => checks[f]);
    });

    list.innerHTML = filtered
      .map(
        (k) => `
          <article class="card reveal">
            <h3>${k.name}</h3>
            <p>${k.address}</p>
            <p><strong>${k.isOpen ? 'Nu open' : 'Nu gesloten'}</strong> · ${k.environment} · Contactloos</p>
            <div class="cta-row">
              <button class="btn btn-ghost" type="button" data-focus-id="${k.id}">Toon op kaart</button>
              <a class="btn btn-ghost" href="${getDirectionsUrl(k)}" target="_blank" rel="noopener noreferrer">Navigeer</a>
              <a class="btn btn-ghost" href="${getVisitUrl(k)}" target="_blank" rel="noopener noreferrer">Bezoek locatie</a>
            </div>
          </article>`
      )
      .join('');

    if (!filtered.length) {
      if (!sourceData.length && finderStatusMessage) {
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

  [searchInput, ...filterInputs].filter(Boolean).forEach((el) => el.addEventListener('input', render));
  const applyInitialQueryFilter = (locations) => {
    if (!initialQuery) return locations;
    const onlyRelevant = locations.filter((location) =>
      locationMatchesQuery(location, initialQuery.toLowerCase())
    );
    return onlyRelevant.length ? onlyRelevant : locations;
  };

  const renderWithSource = (locations) => {
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
  if (!slides.length || !prev || !next) return;

  slider.classList.add('is-js');
  let index = 0;
  let timer;

  const show = (i) => {
    slides.forEach((slide, idx) => {
      slide.classList.toggle('is-active', idx === i);
    });
    index = i;
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

    const update = () => {
      buildPages();
      track.style.transform = `translateX(-${index * 100}%)`;
      prev.disabled = index <= 0;
      next.disabled = index >= maxIndex;
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

    update();
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
            <button class="product-info-btn" type="button" aria-label="Meer info over ${name}" data-product-open>i</button>
          </article>
        `;
      })
      .join('');

    let index = 0;
    const cards = Array.from(grid.querySelectorAll('.product-card'));

    const getPerView = () => {
      const width = window.innerWidth;
      if (width <= 480) return 1;
      if (width <= 680) return 2;
      if (width <= 920) return 3;
      return 4;
    };

    const update = () => {
      const perView = getPerView();
      const maxIndex = Math.max(0, cards.length - perView);
      if (maxIndex === 0) {
        index = 0;
      } else {
        if (index > maxIndex) index = 0;
        if (index < 0) index = maxIndex;
      }

      const firstCard = cards[0];
      if (!firstCard) return;
      const gap = parseFloat(getComputedStyle(grid).gap || '0');
      const step = firstCard.getBoundingClientRect().width + gap;
      grid.style.transform = `translateX(-${index * step}px)`;
    };

    prevBtn.addEventListener('click', () => {
      index -= 1;
      update();
    });

    nextBtn.addEventListener('click', () => {
      index += 1;
      update();
    });

    window.addEventListener('resize', update, { passive: true });
    update();
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


initHeaderCta();
setActiveNav();
initMobileNav();
initHeaderScroll();
initCalculator();
initFinder();
initHeroSlider();
initInstaSlider();
initPartnersHeroBalance();
initImageLightbox();
initFaqAccordion();
initNewsModal();
initProductModal();
initDynamicProductImages();
initSpotlight();
