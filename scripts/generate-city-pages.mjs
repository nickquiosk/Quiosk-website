import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, 'data', 'locations.json');
const PRIMARY_ROOT = path.join(ROOT, 'avondwinkel');
const LEGACY_ROOT = path.join(ROOT, 'locaties', 'steden');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');

const SITE_URL = 'https://www.quiosk.nl';

const DEFAULT_PRODUCTS = [
  { name: 'Coca-Cola', image: '../../images/producten/Coca-Cola.jpeg' },
  { name: 'Coca-Cola Zero', image: '../../images/producten/Coca-Cola%20Zero.jpeg' },
  { name: 'Fanta', image: '../../images/producten/Fanta.jpeg' },
  { name: 'Red Bull Regular', image: '../../images/producten/Red%20Bull%20Regular.jpeg' },
  { name: 'Snickers', image: '../../images/producten/Snickers.jpeg' },
  { name: 'Doritos Nacho Cheese', image: '../../images/producten/Doritos%20Nacho%20Cheese.jpeg' },
  { name: 'Twix White', image: '../../images/producten/Twix%20White.jpeg' },
  { name: 'M&M', image: '../../images/producten/M%26M.jpeg' },
  { name: 'Kinder Bueno White', image: '../../images/producten/Kinder%20Bueno.jpeg' },
  { name: 'Spa', image: '../../images/producten/Powerade%20Acquarius.jpeg' },
  { name: "Lay's Paprika", image: "../../images/producten/Lay's%20Paprika.jpeg" },
  { name: 'Monster', image: '../../images/instagram-feed/Quiosk_Monster-combi.png' }
];

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'stad';

const escapeHtml = (value) =>
  String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const normalize = (value) => String(value || '').trim();

const parseNumber = (value) => {
  const raw = normalize(value);
  if (!raw) return null;
  const parsed = Number(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseStreetParts = (streetRaw) => {
  const street = String(streetRaw || '').trim();
  if (!street) return { streetName: '', houseNumber: '' };
  const match = street.match(/^(.*?)[,\s]+(\d[\w\-\/]*)$/);
  if (!match) return { streetName: street, houseNumber: '' };
  return {
    streetName: String(match[1] || '').trim(),
    houseNumber: String(match[2] || '').trim()
  };
};

const buildLocationSlug = (location) => {
  const city = slugify(location.city || location.name || 'locatie');
  const address = slugify(location.address || '');
  const id = Number(location.id || 0);
  return [city, address, id].filter(Boolean).join('-');
};

const buildLocationName = (location, city) => {
  const explicit = normalize(location.name || location.title);
  if (explicit) return explicit;
  const { streetName } = parseStreetParts(location.address);
  return streetName ? `Quiosk ${city} ${streetName}` : `Quiosk ${city}`;
};

const pickCityCenter = (items) => {
  const coords = items
    .map((item) => ({ lat: parseNumber(item?.lat ?? item?.coords?.lat), lng: parseNumber(item?.lng ?? item?.coords?.lng) }))
    .filter((coord) => coord.lat !== null && coord.lng !== null);

  if (!coords.length) return { lat: 52.1326, lng: 5.2913, zoom: 8 };

  const sum = coords.reduce((acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }), { lat: 0, lng: 0 });

  return {
    lat: Number((sum.lat / coords.length).toFixed(6)),
    lng: Number((sum.lng / coords.length).toFixed(6)),
    zoom: coords.length > 1 ? 12 : 14
  };
};

const toCityLocation = (item, city) => {
  const slug = buildLocationSlug(item);
  const name = buildLocationName(item, city);
  const address = normalize(item.address);
  const postcode = normalize(item.postcode);
  const fullAddress = postcode ? `${address}, ${postcode} ${city}` : `${address}, ${city}`;

  return {
    slug,
    name,
    address: fullAddress,
    lat: parseNumber(item?.coords?.lat),
    lng: parseNumber(item?.coords?.lng),
    url: `../../locaties/${slug}.html`
  };
};

const buildCityPage = (city, citySlug, locations) => {
  const count = locations.length;
  const title = `Quiosk ${city} | Avondwinkel 24/7 in ${city}`;
  const description = `Zoek je een avondwinkel of nachtwinkel in ${city}? Ontdek alle Quiosk locaties in ${city}. 24/7 open, contactloos betalen en direct navigeren.`;
  const canonical = `${SITE_URL}/avondwinkel/${citySlug}/`;
  const mapCenter = pickCityCenter(locations);

  const itemList = locations.map((loc, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: loc.name,
    url: `${SITE_URL}${loc.url.replace('../..', '')}`
  }));

  const itemListJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Quiosk locaties in ${city}`,
    numberOfItems: count,
    itemListElement: itemList
  })
    .replace(/</g, '\\u003c')
    .replace(/-->/g, '--\\>');

  const cityJson = JSON.stringify(locations, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/-->/g, '--\\>');

  const locationsHtml = locations
    .map(
      (location) => `          <a class="card reveal finder-location-card location-page-nearby-item" href="${location.url}" aria-label="Bekijk locatiepagina van ${escapeHtml(location.name)}"><div class="finder-location-media"><img class="finder-location-icon" src="../../Favicon.png" alt="" aria-hidden="true" /><div class="finder-location-text"><h3 class="finder-location-name">${escapeHtml(location.name)}</h3><p class="finder-location-address">${escapeHtml(location.address)}</p></div></div></a>`
    )
    .join('\n');

  const productsHtml = DEFAULT_PRODUCTS.map(
    (product) => `          <article class="city-product-tile"><img src="${product.image}" alt="${escapeHtml(product.name)} bij Quiosk ${escapeHtml(city)}" loading="lazy" decoding="async" /></article>`
  ).join('\n');

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:locale" content="nl_NL" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Quiosk" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="Bekijk alle Quiosk locaties in ${escapeHtml(city)} en navigeer direct naar de dichtstbijzijnde locatie." />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="https://www.quiosk.nl/images/home/quiok-3.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="Bekijk alle Quiosk locaties in ${escapeHtml(city)} en navigeer direct naar de dichtstbijzijnde locatie." />
  <meta name="twitter:image" content="https://www.quiosk.nl/images/home/quiok-3.jpg" />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","@id":"https://www.quiosk.nl/#organization","name":"Quiosk B.V.","url":"https://www.quiosk.nl/","logo":"https://www.quiosk.nl/logo-quiosk.png","email":"info@quiosk.nl","telephone":"+31-30-7370809","sameAs":["https://www.instagram.com/quiosknl/","https://www.linkedin.com/company/quiosk-b.v./","https://www.facebook.com/QuioskNL/"]}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://www.quiosk.nl/"},{"@type":"ListItem","position":2,"name":"Quiosk zoeken","item":"https://www.quiosk.nl/quiosk-zoeken.html"},{"@type":"ListItem","position":3,"name":"Avondwinkel" ,"item":"https://www.quiosk.nl/avondwinkel/"},{"@type":"ListItem","position":4,"name":"${escapeHtml(city)}","item":"${canonical}"}]}</script>
  <script type="application/ld+json">${itemListJson}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Is Quiosk in ${escapeHtml(city)} 24/7 open?","acceptedAnswer":{"@type":"Answer","text":"Ja. Quiosk locaties in ${escapeHtml(city)} zijn 24/7 toegankelijk voor snacks, drinks en essentials."}},{"@type":"Question","name":"Kan ik contactloos betalen bij Quiosk ${escapeHtml(city)}?","acceptedAnswer":{"@type":"Answer","text":"Ja, alle locaties werken volledig contactloos met pinpas, telefoon of wearable."}},{"@type":"Question","name":"Waar vind ik Quiosk locaties in ${escapeHtml(city)}?","acceptedAnswer":{"@type":"Answer","text":"Op deze stadspagina zie je alle actuele Quiosk locaties in ${escapeHtml(city)} inclusief kaart en directe navigatielinks."}}]}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../styles.css" />
  <link rel="icon" type="image/png" href="../../Favicon.png?v=4" />
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrap">
      <a href="../../index.html" class="brand"><img src="../../logo-quiosk.png" alt="Quiosk logo" /></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Open menu"><span class="bar"></span><span class="bar"></span><span class="bar"></span></button>
      <nav class="site-nav" id="site-menu"><ul><li><a data-nav href="../../index.html">Home</a></li><li><a data-nav href="../../word-partner.html">Word partner</a></li><li><a data-nav href="../../voor-onze-fans.html">Voor onze fans</a></li><li><a data-nav href="../../quiosk-zoeken.html">Quiosk zoeken</a></li><li><a data-nav href="../../feedback-terugbetaling.html">Support</a></li><li class="nav-has-dropdown"><button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">Over ons</button><ul class="nav-dropdown" aria-label="Over ons submenu"><li><a data-nav href="../../over-ons.html">Ons verhaal</a></li><li><a data-nav href="../../blog.html">Blog</a></li><li><a data-nav href="../../persberichten.html">Persberichten</a></li><li><a data-nav href="../../beeldmateriaal.html">Beeldmateriaal</a></li></ul></li><li><a data-nav href="../../contact.html">Contact</a></li></ul></nav>
    </div>
  </header>

  <main>
    <section class="section city-split-top">
      <div class="container city-split-wrap">
        <article class="card city-split-content">
          <h1>24/7 Quiosk in ${escapeHtml(city)}</h1>
          <p>Op zoek naar een avondwinkel of nachtwinkel in ${escapeHtml(city)}? Ontdek alle Quiosk locaties in de stad en navigeer direct.</p>
          <p>Quiosk ${escapeHtml(city)} is het 24/7 alternatief voor gemak onderweg. Of je nu vroeg vertrekt, laat thuiskomt of tussendoor iets nodig hebt: bij Quiosk in ${escapeHtml(city)} haal je snel snacks, drinks en essentials. Alle locaties zijn contactloos en direct bereikbaar.</p>
          <div class="city-split-chips" aria-label="Kenmerken Quiosk ${escapeHtml(city)}">
            <span>24/7 open</span>
            <span>100% contactloos</span>
            <span>${count} ${count === 1 ? 'locatie' : 'locaties'}</span>
          </div>
          <div class="cta-row">
            <a href="../../quiosk-zoeken.html" class="btn btn-secondary">Quiosk zoeken in een andere stad</a>
          </div>
        </article>
        <div class="city-split-map card">
          <div id="${citySlug}-city-map" class="map" aria-label="Kaart met Quiosk locaties in ${escapeHtml(city)}"></div>
        </div>
      </div>
    </section>

    <section class="section city-locations-overlap" id="${citySlug}-locaties">
      <div class="container">
        <div class="section-head">
          <h2>Alle Quiosk locaties in ${escapeHtml(city)}</h2>
        </div>
        <div class="grid-3 location-page-nearby-grid">
${locationsHtml}
          <article class="card location-page-nearby-item city-tip-location-card" aria-label="Tip een nieuwe locatie in ${escapeHtml(city)}">
            <h3>Heb je nog een tip voor een goede locatie in ${escapeHtml(city)}?</h3>
            <button type="button" class="btn btn-primary" data-open-city-tip-modal>Laat het ons weten</button>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container grid-2">
        <article class="card">
          <h2>Waarom Quiosk in ${escapeHtml(city)}?</h2>
          <div class="city-benefit-cards">
            <article class="city-benefit-card"><img class="section-icon" src="../../icons/icon-24-7.svg" alt="" aria-hidden="true" /><h3>24/7 open</h3><p>Dag en nacht bereikbaar in ${escapeHtml(city)}.</p></article>
            <article class="city-benefit-card"><img class="section-icon" src="../../icons/icon-scan.svg" alt="" aria-hidden="true" /><h3>Contactloos betalen</h3><p>Snel afrekenen met pas, telefoon of creditcard.</p></article>
            <article class="city-benefit-card"><img class="section-icon" src="../../icons/icon-can.svg" alt="" aria-hidden="true" /><h3>Bekende merken</h3><p>Populaire snacks en drankjes op één plek.</p></article>
            <article class="city-benefit-card"><img class="section-icon" src="../../icons/icon-finder.svg" alt="" aria-hidden="true" /><h3>Snel gevonden</h3><p>Direct navigeren naar de juiste Quiosk.</p></article>
          </div>
        </article>
        <article class="card">
          <h2>Veelgestelde vragen ${escapeHtml(city)}</h2>
          <div class="faq-accordion" aria-label="FAQ Quiosk ${escapeHtml(city)}">
            <details class="faq-item"><summary>Kan ik ook met creditcard betalen?</summary><p>Ja. Je kunt bij Quiosk contactloos betalen met pinpas, telefoon, wearable en creditcard.</p></details>
            <details class="faq-item"><summary>Wat doe ik als een product vastzit in de automaat?</summary><p>Meld dit direct via de <a class="faq-inline-link" href="../../feedback-terugbetaling.html">supportpagina</a>. Vermeld locatie, datum en tijd, dan lossen we het zo snel mogelijk op.</p></details>
            <details class="faq-item"><summary>Hoe vraag ik geld terug als betaling wel is afgeschreven?</summary><p>Gebruik het <a class="faq-inline-link" href="https://forms.monday.com/forms/1eea79d8bf2de6def86aa5c7a37c3224?r=use1" target="_blank" rel="noopener noreferrer">terugbetalingsformulier</a> of ga naar <a class="faq-inline-link" href="../../feedback-terugbetaling.html">support</a>. Na controle storten we het bedrag terug op je rekening.</p></details>
            <details class="faq-item"><summary>Hoe snel wordt een lege automaat weer bijgevuld?</summary><p>Onze automaten worden actief gemonitord. Bij leegstand plannen we zo snel mogelijk een bijvulling in.</p></details>
            <details class="faq-item"><summary>Kan ik een nieuwe locatie in ${escapeHtml(city)} tippen?</summary><p>Ja. Stuur je <a class="faq-inline-link" href="#" data-open-city-tip-modal>locatie-tip</a> via contact of via support, dan bekijken we de mogelijkheden.</p></details>
          </div>
        </article>
      </div>
    </section>

    <div class="finder-tip-modal" data-city-tip-modal aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="city-tip-title">
      <div class="finder-tip-dialog">
        <button class="finder-tip-close" type="button" aria-label="Sluit tipformulier" data-close-city-tip-modal>&times;</button>
        <h3 id="city-tip-title">Tip een nieuwe Quiosk locatie</h3>
        <p>Ken je een goede plek voor een Quiosk? Stuur je tip door naar ons team.</p>
        <form class="finder-tip-form" data-city-tip-form>
          <label>Naam
            <input type="text" name="name" required />
          </label>
          <label>E-mail
            <input type="email" name="email" required />
          </label>
          <label>Plaats of postcode
            <input type="text" name="place" data-city-tip-place value="${escapeHtml(city)}" />
          </label>
          <label>Jouw tip
            <textarea name="tip" rows="4" required placeholder="Bijv. druk tankstation, laadplein of carwash..."></textarea>
          </label>
          <button type="submit" class="btn btn-primary">Verstuur tip</button>
        </form>
      </div>
    </div>

    <section class="section city-products-section">
      <div class="container card">
        <div class="section-head">
          <h2>Standaard assortiment</h2>
          <p>Een greep uit producten die je vaak vindt bij Quiosk in ${escapeHtml(city)}.</p>
        </div>
        <div class="location-page-products city-products-grid city-products-mosaic" data-city-product-mosaic>
${productsHtml}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container banner banner-single">
        <div class="banner-content banner-content-center">
          <div class="banner-title-row"><img class="section-icon section-icon-inverse" src="../../icons/icon-service.svg" alt="" /><h2>Probleem met je aankoop in ${escapeHtml(city)}?</h2></div>
          <p>Vraag direct je terugbetaling aan of neem contact op met support.</p>
          <div class="cta-row cta-row-center">
            <a href="https://forms.monday.com/forms/1eea79d8bf2de6def86aa5c7a37c3224?r=use1" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Direct geld terugvragen</a>
            <a href="../../feedback-terugbetaling.html" class="btn btn-ghost">Naar support</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer"><div class="footer-inner"><div class="footer-brand"><img class="footer-logo" src="../../logo-quiosk.png" alt="Quiosk logo" /></div><nav class="footer-links" aria-label="Footer navigatie"><a href="../../index.html">Home</a><a href="../../word-partner.html">Word partner</a><a href="../../voor-onze-fans.html">Voor onze fans</a><a href="../../quiosk-zoeken.html">Quiosk zoeken</a><a href="../../feedback-terugbetaling.html">Support</a><a href="../../over-ons.html">Over ons</a><a href="../../contact.html">Contact</a></nav><div class="footer-cta"><a href="../../word-partner.html" class="btn btn-primary">Word partner</a><a href="../../quiosk-zoeken.html" class="btn btn-secondary">Zoek een locatie</a></div><p class="footer-copy">&copy; 2026 Quiosk</p></div></footer>

  <script>
    const cityLocations = ${cityJson};

    const initCityMap = () => {
      const mapEl = document.getElementById('${citySlug}-city-map');
      if (!mapEl || !window.google?.maps) return;

      const map = new google.maps.Map(mapEl, {
        center: { lat: ${mapCenter.lat}, lng: ${mapCenter.lng} },
        zoom: ${mapCenter.zoom},
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP },
        cameraControl: true,
        cameraControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP }
      });

      const bounds = new google.maps.LatLngBounds();
      const info = new google.maps.InfoWindow();
      const icon = {
        url: '../../Favicon.png?v=4',
        scaledSize: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 18)
      };

      cityLocations
        .filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng))
        .forEach((location) => {
          const marker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map,
            title: location.name,
            icon
          });

          marker.addListener('click', () => {
            info.setContent(
              '<div class="quiosk-map-card">' +
                '<div class="quiosk-map-card-head">' +
                  '<img class="quiosk-map-card-icon" src="../../Favicon.png?v=4" alt="" aria-hidden="true" />' +
                  '<h4>' + location.name + '</h4>' +
                  '<button class="quiosk-map-card-close" type="button" onclick="window.closeCityInfoWindow && window.closeCityInfoWindow()" aria-label="Sluit kaartje">×</button>' +
                '</div>' +
                '<p>' + location.address + '</p>' +
                '<div class="quiosk-map-card-actions"><a class="btn btn-ghost" href="' + location.url + '">Bekijk locatie</a></div>' +
              '</div>'
            );
            info.open({ anchor: marker, map });
          });

          bounds.extend({ lat: location.lat, lng: location.lng });
        });

      window.closeCityInfoWindow = () => info.close();

      if (!bounds.isEmpty() && cityLocations.length > 1) {
        map.fitBounds(bounds, { top: 34, right: 34, bottom: 34, left: 34 });
      }
    };

    const initCityProductMosaic = () => {
      const wrap = document.querySelector('[data-city-product-mosaic]');
      if (!wrap) return;
      const tiles = Array.from(wrap.querySelectorAll('.city-product-tile'));
      if (!tiles.length) return;

      const shuffled = [...tiles].sort(() => Math.random() - 0.5);
      shuffled.forEach((tile) => {
        tile.classList.remove('is-featured', 'is-featured-a', 'is-featured-b');
        wrap.appendChild(tile);
      });
    };

    const initCityTipModal = () => {
      const tipModal = document.querySelector('[data-city-tip-modal]');
      const openButtons = Array.from(document.querySelectorAll('[data-open-city-tip-modal]'));
      const closeBtn = document.querySelector('[data-close-city-tip-modal]');
      const tipForm = document.querySelector('[data-city-tip-form]');
      const tipPlaceInput = document.querySelector('[data-city-tip-place]');
      if (!tipModal) return;

      const close = () => {
        tipModal.classList.remove('is-open');
        tipModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      };

      const open = () => {
        if (tipPlaceInput && !String(tipPlaceInput.value || '').trim()) tipPlaceInput.value = '${escapeHtml(city)}';
        tipModal.classList.add('is-open');
        tipModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      };

      openButtons.forEach((openBtn) => {
        openBtn.addEventListener('click', (event) => {
          event.preventDefault();
          open();
        });
      });

      if (closeBtn) closeBtn.addEventListener('click', close);
      tipModal.addEventListener('click', (event) => {
        if (event.target === tipModal) close();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && tipModal.classList.contains('is-open')) close();
      });

      if (tipForm) {
        tipForm.addEventListener('submit', (event) => {
          event.preventDefault();
          const formData = new FormData(tipForm);
          const name = String(formData.get('name') || '').trim();
          const email = String(formData.get('email') || '').trim();
          const place = String(formData.get('place') || '${escapeHtml(city)}').trim();
          const tip = String(formData.get('tip') || '').trim();

          const subject = 'Tip nieuwe Quiosk locatie - ' + (place || '${escapeHtml(city)}');
          const body = [
            'Naam: ' + name,
            'E-mail: ' + email,
            'Plaats/postcode: ' + (place || '-'),
            '',
            'Tip:',
            tip
          ].join('\\n');

          window.location.href = 'mailto:info@quiosk.nl?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
          close();
          tipForm.reset();
          if (tipPlaceInput) tipPlaceInput.value = '${escapeHtml(city)}';
        });
      }
    };

    window.QUIOSK_GOOGLE_MAPS_KEY = 'AIzaSyB9SVkW2jpokXe8rUaWZW-UgRjLeb8gM7E';
    window.addEventListener('load', initCityMap);
    window.addEventListener('load', initCityProductMosaic);
    window.addEventListener('load', initCityTipModal);
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB9SVkW2jpokXe8rUaWZW-UgRjLeb8gM7E"></script>
  <script src="../../script.js"></script>
</body>
</html>`;
};

const buildOverviewPage = () => `<!doctype html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Avondwinkel steden | Quiosk locaties per stad</title>
  <meta name="description" content="Bekijk alle steden met Quiosk locaties. Zoek jouw avondwinkel in de buurt en ga direct naar de juiste stadspagina." />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="https://www.quiosk.nl/avondwinkel/" />
  <meta property="og:locale" content="nl_NL" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Quiosk" />
  <meta property="og:title" content="Avondwinkel steden | Quiosk locaties per stad" />
  <meta property="og:description" content="Bekijk alle steden met Quiosk locaties en ga direct door naar de juiste stadspagina." />
  <meta property="og:url" content="https://www.quiosk.nl/avondwinkel/" />
  <meta property="og:image" content="https://www.quiosk.nl/images/home/quiok-3.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Avondwinkel steden | Quiosk locaties per stad" />
  <meta name="twitter:description" content="Bekijk alle steden met Quiosk locaties en ga direct door naar de juiste stadspagina." />
  <meta name="twitter:image" content="https://www.quiosk.nl/images/home/quiok-3.jpg" />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://www.quiosk.nl/"},{"@type":"ListItem","position":2,"name":"Quiosk zoeken","item":"https://www.quiosk.nl/quiosk-zoeken.html"},{"@type":"ListItem","position":3,"name":"Avondwinkel steden","item":"https://www.quiosk.nl/avondwinkel/"}]}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../styles.css" />
  <link rel="icon" type="image/png" href="../Favicon.png?v=4" />
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrap">
      <a href="../index.html" class="brand"><img src="../logo-quiosk.png" alt="Quiosk logo" /></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Open menu"><span class="bar"></span><span class="bar"></span><span class="bar"></span></button>
      <nav class="site-nav" id="site-menu"><ul><li><a data-nav href="../index.html">Home</a></li><li><a data-nav href="../word-partner.html">Word partner</a></li><li><a data-nav href="../voor-onze-fans.html">Voor onze fans</a></li><li><a data-nav href="../quiosk-zoeken.html">Quiosk zoeken</a></li><li><a data-nav href="../feedback-terugbetaling.html">Support</a></li><li class="nav-has-dropdown"><button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">Over ons</button><ul class="nav-dropdown" aria-label="Over ons submenu"><li><a data-nav href="../over-ons.html">Ons verhaal</a></li><li><a data-nav href="../blog.html">Blog</a></li><li><a data-nav href="../persberichten.html">Persberichten</a></li><li><a data-nav href="../beeldmateriaal.html">Beeldmateriaal</a></li></ul></li><li><a data-nav href="../contact.html">Contact</a></li></ul></nav>
    </div>
  </header>

  <main>
    <section class="page-hero over-hero city-overview-hero">
      <div class="container">
        <h1>Avondwinkel per stad</h1>
        <p class="section-lead">Bekijk alle steden met Quiosk locaties in Nederland en vind snel een 24/7 avondwinkel voor snacks, dranken en gemaksproducten.</p>
        <div class="cta-row cta-row-center">
          <a href="../quiosk-zoeken.html" class="btn btn-primary">Terug naar Quiosk zoeken</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container card city-overview-card">
        <div class="section-head">
          <h2>Alle steden met Quiosk locaties</h2>
          <p><strong data-city-count>0</strong> steden gevonden</p>
        </div>
        <nav class="alpha-jump-nav" aria-label="Ga direct naar letter" data-city-alpha-jump>
          <span class="city-overview-loading">Alfabet wordt geladen...</span>
        </nav>
        <div class="alpha-accordion" data-city-alpha-list>
          <p class="city-overview-loading">Steden worden geladen...</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer"><div class="footer-inner"><div class="footer-brand"><img class="footer-logo" src="../logo-quiosk.png" alt="Quiosk logo" /></div><nav class="footer-links" aria-label="Footer navigatie"><a href="../index.html">Home</a><a href="../word-partner.html">Word partner</a><a href="../voor-onze-fans.html">Voor onze fans</a><a href="../quiosk-zoeken.html">Quiosk zoeken</a><a href="../feedback-terugbetaling.html">Support</a><a href="../over-ons.html">Over ons</a><a href="../contact.html">Contact</a></nav><div class="footer-cta"><a href="../word-partner.html" class="btn btn-primary">Word partner</a><a href="../quiosk-zoeken.html" class="btn btn-secondary">Zoek een locatie</a></div><p class="footer-copy">&copy; 2026 Quiosk</p></div></footer>

  <script>
    (() => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const cityCountEl = document.querySelector('[data-city-count]');
      const alphaEl = document.querySelector('[data-city-alpha-list]');
      const alphaJumpEl = document.querySelector('[data-city-alpha-jump]');

      const normalize = (value) => String(value || '').trim();
      const slugify = (value) => normalize(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'stad';

      const firstLetter = (city) => {
        const c = normalize(city).charAt(0).toUpperCase();
        return /[A-Z]/.test(c) ? c : '#';
      };

      const buildCityLink = (city) => \`./\${slugify(city)}/\`;

      const render = (cities) => {
        cityCountEl.textContent = String(cities.length);

        const byLetter = new Map(letters.map((l) => [l, []]));
        cities.forEach((city) => {
          const key = firstLetter(city);
          if (!byLetter.has(key)) return;
          byLetter.get(key).push(city);
        });

        if (alphaJumpEl) {
          alphaJumpEl.innerHTML = letters.map((letter) => {
            const hasCities = (byLetter.get(letter) || []).length > 0;
            if (!hasCities) {
              return \`<span class="alpha-jump-link is-disabled" aria-disabled="true">\${letter}</span>\`;
            }
            return \`<a class="alpha-jump-link" href="#alpha-\${letter}">\${letter}</a>\`;
          }).join('');
        }

        alphaEl.innerHTML = letters.map((letter) => {
          const items = byLetter.get(letter) || [];
          const links = items.map((city) => \`<a class="alpha-city-link" href="\${buildCityLink(city)}">\${city}</a>\`).join('');
          if (!items.length) return '';
          return \`<article class="alpha-item" id="alpha-\${letter}"><h3 class="alpha-item-title">\${letter}</h3><div class="alpha-item-body"><div class="alpha-city-list">\${links}</div></div></article>\`;
        }).join('');
      };

      if (alphaJumpEl) {
        alphaJumpEl.addEventListener('click', (event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const link = target.closest('a.alpha-jump-link');
          if (!link) return;
          const href = link.getAttribute('href') || '';
          if (!href.startsWith('#')) return;
          const section = document.querySelector(href);
          if (!section) return;
          event.preventDefault();
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

      fetch('../data/locations.json', { cache: 'no-store' })
        .then((res) => res.ok ? res.json() : [])
        .then((rows) => {
          const unique = new Set();
          rows.forEach((row) => {
            const city = normalize(row && row.city);
            if (city) unique.add(city);
          });
          const cities = Array.from(unique).sort((a, b) => a.localeCompare(b, 'nl-NL', { sensitivity: 'base' }));
          render(cities);
        })
        .catch(() => {
          if (alphaJumpEl) alphaJumpEl.innerHTML = '<p class="city-overview-loading">Alfabet kon niet geladen worden.</p>';
          alphaEl.innerHTML = '<p class="city-overview-loading">Steden konden niet geladen worden. Gebruik Quiosk zoeken.</p>';
          cityCountEl.textContent = '0';
        });
    })();
  </script>
  <script src="../script.js"></script>
</body>
</html>`;

const buildLegacyRedirectPage = (targetPath) => `<!doctype html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,follow" />
  <link rel="canonical" href="${SITE_URL}${targetPath}" />
  <meta http-equiv="refresh" content="0; url=${targetPath}" />
  <title>Doorsturen...</title>
  <script>window.location.replace('${targetPath}');</script>
</head>
<body>
  <p>Doorsturen naar <a href="${targetPath}">${targetPath}</a>...</p>
</body>
</html>`;

const updateSitemap = async (citySlugs) => {
  let xml = await fs.readFile(SITEMAP_FILE, 'utf8');

  xml = xml
    .replace(/\s*<url>\s*<loc>https:\/\/www\.quiosk\.nl\/locaties\/steden\/(?:[^<]*)<\/loc>[\s\S]*?<\/url>\s*/g, '\n')
    .replace(/\s*<url>\s*<loc>https:\/\/www\.quiosk\.nl\/avondwinkel\/(?:[^<]*)<\/loc>[\s\S]*?<\/url>\s*/g, '\n');

  const today = new Date().toISOString().slice(0, 10);
  const cityUrls = [
    `${SITE_URL}/avondwinkel/`,
    ...citySlugs.map((slug) => `${SITE_URL}/avondwinkel/${slug}/`)
  ];

  const additions = cityUrls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${url.endsWith('/avondwinkel/') ? '0.8' : '0.7'}</priority>\n  </url>`)
    .join('\n');

  xml = xml.replace('</urlset>', `${additions}\n</urlset>`);
  await fs.writeFile(SITEMAP_FILE, xml, 'utf8');
};

const main = async () => {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const rows = JSON.parse(raw);

  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('Geen locaties gevonden in data/locations.json');
  }

  const byCity = new Map();
  for (const row of rows) {
    const city = normalize(row?.city);
    const lat = parseNumber(row?.coords?.lat);
    const lng = parseNumber(row?.coords?.lng);
    if (!city || lat === null || lng === null) continue;
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city).push(row);
  }

  const cities = Array.from(byCity.keys()).sort((a, b) => a.localeCompare(b, 'nl-NL', { sensitivity: 'base' }));

  await fs.rm(PRIMARY_ROOT, { recursive: true, force: true });
  await fs.rm(LEGACY_ROOT, { recursive: true, force: true });
  await fs.mkdir(PRIMARY_ROOT, { recursive: true });
  await fs.mkdir(LEGACY_ROOT, { recursive: true });

  await fs.writeFile(path.join(PRIMARY_ROOT, 'index.html'), buildOverviewPage(), 'utf8');
  await fs.writeFile(path.join(LEGACY_ROOT, 'index.html'), buildLegacyRedirectPage('/avondwinkel/'), 'utf8');

  const citySlugs = [];

  for (const city of cities) {
    const citySlug = slugify(city);
    citySlugs.push(citySlug);

    const locations = byCity
      .get(city)
      .map((item) => toCityLocation(item, city))
      .sort((a, b) => a.name.localeCompare(b.name, 'nl-NL', { sensitivity: 'base' }));

    const primaryDir = path.join(PRIMARY_ROOT, citySlug);
    const legacyDir = path.join(LEGACY_ROOT, citySlug);
    await fs.mkdir(primaryDir, { recursive: true });
    await fs.mkdir(legacyDir, { recursive: true });

    await fs.writeFile(path.join(primaryDir, 'index.html'), buildCityPage(city, citySlug, locations), 'utf8');
    await fs.writeFile(path.join(legacyDir, 'index.html'), buildLegacyRedirectPage(`/avondwinkel/${citySlug}/`), 'utf8');

    for (const location of locations) {
      const legacyLocationDir = path.join(legacyDir, location.slug);
      await fs.mkdir(legacyLocationDir, { recursive: true });
      await fs.writeFile(
        path.join(legacyLocationDir, 'index.html'),
        buildLegacyRedirectPage(`/locaties/${location.slug}.html`),
        'utf8'
      );
    }
  }

  await updateSitemap(citySlugs);

  console.log(`Generated ${cities.length} city pages in /avondwinkel and redirects in /locaties/steden`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
