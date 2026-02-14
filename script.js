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

  try {
    const response = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.locations)) return null;
    const mapped = payload.locations
      .map((item, index) => normalizeLocationFromApi(item, index))
      .filter((location) => location.coords);
    return mapped.length ? mapped : null;
  } catch (_) {
    return null;
  }
};

const normalizeCsvCell = (value) => String(value || '').trim();

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
      if (row.some((cell) => normalizeCsvCell(cell))) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((cell) => normalizeCsvCell(cell))) rows.push(row);
  return rows;
};

const normalizeCsvHeader = (value) =>
  normalizeCsvCell(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const pickCsvField = (row, headerMap, aliases) => {
  for (const alias of aliases) {
    const index = headerMap.get(alias);
    if (index !== undefined && row[index] !== undefined) return normalizeCsvCell(row[index]);
  }
  return '';
};

const fetchCsvLocationsFallback = async () => {
  try {
    const response = await fetch('/data/import/latest.csv', { headers: { Accept: 'text/csv,text/plain' } });
    if (!response.ok) return null;
    const csvText = await response.text();
    const rows = parseCsvRows(csvText);
    if (!rows.length) return null;

    const headers = rows[0].map((header) => normalizeCsvHeader(header));
    const headerMap = new Map();
    headers.forEach((header, index) => {
      if (!headerMap.has(header)) headerMap.set(header, index);
    });

    const parsed = rows
      .slice(1)
      .map((row, index) => {
        const status = pickCsvField(row, headerMap, ['status']).toLowerCase();
        if (status && !status.includes('gepubliceerd') && !status.includes('published')) return null;

        const name = pickCsvField(row, headerMap, ['bedrijfsnaam', 'businessname', 'name']) || `Quiosk locatie ${index + 1}`;
        const address = pickCsvField(row, headerMap, ['adresregel1', 'address1', 'address', 'street']);
        const city =
          pickCsvField(row, headerMap, ['buurt', 'city', 'locality', 'town']) ||
          (() => {
            const postcode = pickCsvField(row, headerMap, ['postcode', 'postalcode']);
            const m = postcode.match(/^\d{4}\s*[A-Za-z]{2}\s+(.+)$/);
            return m ? m[1].trim() : '';
          })();
        const postcode = pickCsvField(row, headerMap, ['postcode', 'postalcode', 'zipcode']);
        const categories = pickCsvField(row, headerMap, ['meercategorieen', 'categories']);

        return {
          id: index + 1,
          name,
          city,
          postcode,
          address,
          products: categories
            ? categories.split(/[|,;/]/).map((part) => part.trim()).filter(Boolean)
            : ['Drinks', 'Snacks'],
          isOpen: true,
          environment: 'Outdoor',
          contactless: true,
          coords: null
        };
      })
      .filter(Boolean)
      .filter((location) => location.address || location.postcode);

    return parsed.length ? parsed : null;
  } catch (_) {
    return null;
  }
};

const geocodeLocationsInBrowser = async (locations, onBatchUpdate) => {
  if (!window.google?.maps?.Geocoder || !Array.isArray(locations) || !locations.length) return locations;

  const geocoder = new window.google.maps.Geocoder();
  let updatedCount = 0;
  const resolved = [...locations];

  for (let i = 0; i < resolved.length; i += 1) {
    const item = resolved[i];
    if (item.coords) continue;

    const query = [item.address, item.postcode, item.city, 'Nederland'].filter(Boolean).join(', ');
    if (!query) continue;

    await new Promise((resolve) => {
      geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const point = results[0].geometry.location;
          resolved[i] = {
            ...item,
            coords: { lat: point.lat(), lng: point.lng() }
          };
          updatedCount += 1;
          if (updatedCount % 8 === 0 && typeof onBatchUpdate === 'function') {
            onBatchUpdate(resolved);
          }
        }
        // Spread requests to avoid OVER_QUERY_LIMIT spikes.
        window.setTimeout(resolve, 80);
      });
    });
  }

  if (typeof onBatchUpdate === 'function') onBatchUpdate(resolved);
  return resolved;
};

const getDirectionsUrl = (location) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address || location.name)}`;

const getVisitUrl = (location) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address || location.name)}`;

const initFinder = () => {
  const root = document.querySelector('[data-finder]');
  if (!root) return;

  const searchInput = root.querySelector('[data-search]');
  const filterInputs = root.querySelectorAll('[data-filter]');
  const list = root.querySelector('[data-results]');
  const map = root.querySelector('[data-map]');
  if (!list || !map) return;
  const defaultCenter = { lat: 52.1326, lng: 5.2913 };
  let sourceData = [...kioskData];
  let mapInstance = null;
  let infoWindow = null;
  let markers = [];

  const hasGoogleMaps = () => Boolean(window.google && window.google.maps);

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

  const loadGoogleMaps = () =>
    new Promise((resolve) => {
      if (hasGoogleMaps()) {
        resolve(true);
        return;
      }

      const apiKey = (window.QUIOSK_GOOGLE_MAPS_KEY || '').trim();
      if (!apiKey || apiKey.includes('VUL_HIER')) {
        map.innerHTML =
          '<div class="card"><p><strong>Google Maps API-key ontbreekt.</strong><br>Voeg je key toe in <code>kiosk-finder.html</code> bij <code>window.QUIOSK_GOOGLE_MAPS_KEY</code>.</p></div>';
        resolve(false);
        return;
      }

      if (document.querySelector('script[data-google-maps-loader="true"]')) {
        const waitForGoogle = () => {
          if (hasGoogleMaps()) {
            resolve(true);
            return;
          }
          window.setTimeout(waitForGoogle, 80);
        };
        waitForGoogle();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = 'true';
      script.onload = () => resolve(hasGoogleMaps());
      script.onerror = () => {
        map.innerHTML = '<div class="card"><p>Google Maps kon niet geladen worden. Controleer je API-key en domeinrestricties.</p></div>';
        resolve(false);
      };
      document.head.appendChild(script);
    });

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
    const q = searchInput ? (searchInput.value || '').toLowerCase().trim() : '';
    const activeFilters = [...filterInputs].filter((el) => el.checked).map((el) => el.value);

    const filtered = sourceData.filter((kiosk) => {
      const textMatch = [kiosk.city, kiosk.postcode, kiosk.name, kiosk.address].join(' ').toLowerCase().includes(q);
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
      list.innerHTML = '<p>Geen Quiosks gevonden met deze filters.</p>';
    }
    bindMapFocusButtons(filtered);
    renderMap(filtered);
  };

  [searchInput, ...filterInputs].filter(Boolean).forEach((el) => el.addEventListener('input', render));
  Promise.all([loadGoogleMaps(), fetchDynamicLocations(), fetchCsvLocationsFallback()]).then(
    async ([loaded, dynamicLocations, csvFallback]) => {
      if (dynamicLocations && dynamicLocations.length) {
        sourceData = dynamicLocations;
      } else if (csvFallback && csvFallback.length) {
        sourceData = csvFallback;
      }

      if (loaded) createMap();
      render();

      if (loaded && csvFallback && csvFallback.length && (!dynamicLocations || !dynamicLocations.length)) {
        const geocoded = await geocodeLocationsInBrowser(sourceData, (partial) => {
          sourceData = partial;
          render();
        });
        sourceData = geocoded;
        render();
      }
    }
  );
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
  const root = document.querySelector('[data-insta-slider]');
  if (!root) return;

  const track = root.querySelector('.insta-track');
  const pages = root.querySelectorAll('.insta-page');
  const prev = root.querySelector('.insta-arrow-prev');
  const next = root.querySelector('.insta-arrow-next');
  if (!track || !pages.length || !prev || !next) return;

  // Shuffle all feed cards on each page load so every refresh shows a new mix.
  const pageList = Array.from(pages);
  const cardsPerPage = pageList[0].children.length;
  const allCards = pageList.flatMap((page) => Array.from(page.children));

  for (let i = allCards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
  }

  pageList.forEach((page, pageIndex) => {
    page.innerHTML = '';
    const start = pageIndex * cardsPerPage;
    const end = start + cardsPerPage;
    allCards.slice(start, end).forEach((card) => page.appendChild(card));
  });

  let index = 0;
  const max = pages.length - 1;

  const update = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    prev.disabled = index <= 0;
    next.disabled = index >= max;
  };

  prev.addEventListener('click', () => {
    if (index > 0) {
      index -= 1;
      update();
    }
  });

  next.addEventListener('click', () => {
    if (index < max) {
      index += 1;
      update();
    }
  });

  update();
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
