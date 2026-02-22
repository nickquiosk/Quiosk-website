import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, 'data', 'locations.json');
const OUTPUT_DIR = path.join(ROOT, 'locaties');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');

const DEFAULT_PRODUCTS = [
  { name: 'Coca-Cola', image: '../images/producten/Coca-Cola.jpeg' },
  { name: 'Coca-Cola Zero', image: '../images/producten/Coca-Cola Zero.jpeg' },
  { name: 'Fanta', image: '../images/producten/Fanta.jpeg' },
  { name: 'Red Bull Regular', image: '../images/producten/Red Bull Regular.jpeg' },
  { name: 'Snickers', image: '../images/producten/Snickers.jpeg' },
  { name: 'Doritos Nacho Cheese', image: '../images/producten/Doritos Nacho Cheese.jpeg' },
  { name: 'Twix White', image: '../images/producten/Twix White.jpeg' },
  { name: 'M&M', image: '../images/producten/M&M.jpeg' },
  { name: 'Kinder Bueno White', image: '../images/producten/Kinder Bueno.jpeg' },
  { name: 'Spa', image: '../images/producten/Powerade Acquarius.jpeg' },
  { name: "Lay's Paprika", image: "../images/producten/Lay's Paprika.jpeg" },
  { name: 'Monster', image: '../images/instagram-feed/Quiosk_Monster-combi.png' }
];

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const escapeHtml = (value) =>
  String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildSlug = (location) =>
  [slugify(location.city || location.name || 'locatie'), slugify(location.address || ''), Number(location.id || 0)]
    .filter(Boolean)
    .join('-');

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

const buildLocationPage = (location) => {
  const city = String(location.city || '').trim() || 'Locatie';
  const street = String(location.address || '').trim();
  const { streetName, houseNumber } = parseStreetParts(street);
  const postcode = String(location.postcode || '').trim();
  const wijkOfGebied = city;
  const partnerLocatie = `Quiosk locatie in ${city}`;
  const addressFull = [street, [postcode, city].filter(Boolean).join(' '), 'Nederland'].filter(Boolean).join(', ');
  const name = `Quiosk ${city}`;
  const description = `Bekijk Quiosk ${city}: adres, kaart, navigatie en standaard assortiment op deze locatiepagina.`;
  const canonical = `https://www.quiosk.nl/locaties/${buildSlug(location)}.html`;
  const mapQuery = encodeURIComponent(`${street}, ${postcode} ${city}, Nederland`);
  const navQuery = encodeURIComponent(`${name} ${street} ${postcode} ${city}`);
  const lat = Number(location?.coords?.lat || 52.1326);
  const lng = Number(location?.coords?.lng || 5.2913);

  const productsHtml = DEFAULT_PRODUCTS.map(
    (product) => `
            <article class="location-page-product">
              <img src="${encodeURI(product.image)}" alt="${escapeHtml(product.name)} bij ${escapeHtml(name)}" loading="lazy" decoding="async" />
              <span>${escapeHtml(product.name)}</span>
            </article>`
  ).join('');

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(name)} | Quiosk locatie</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:locale" content="nl_NL" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Quiosk" />
  <meta property="og:title" content="${escapeHtml(name)} | Quiosk locatie" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="https://www.quiosk.nl/images/home/quiok-3.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(name)} | Quiosk locatie" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="https://www.quiosk.nl/images/home/quiok-3.jpg" />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"${escapeHtml(name)}","url":"${canonical}","address":{"@type":"PostalAddress","streetAddress":"${escapeHtml(street)}","postalCode":"${escapeHtml(postcode)}","addressLocality":"${escapeHtml(city)}","addressCountry":"NL"},"geo":{"@type":"GeoCoordinates","latitude":${lat},"longitude":${lng}}}</script>
  <link rel="stylesheet" href="../styles.css" />
  <link rel="icon" type="image/png" href="../Favicon.png?v=4" />
</head>
<body>
  <header class="site-header"><div class="container nav-wrap"><a href="../index.html" class="brand"><img src="../logo-quiosk.png" alt="Quiosk logo" /></a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Open menu"><span class="bar"></span><span class="bar"></span><span class="bar"></span></button><nav class="site-nav" id="site-menu"><ul><li><a data-nav href="../index.html">Home</a></li><li><a data-nav href="../word-partner.html">Word partner</a></li><li><a data-nav href="../voor-onze-fans.html">Voor onze fans</a></li><li><a data-nav href="../quiosk-zoeken.html">Quiosk zoeken</a></li><li><a data-nav href="../feedback-terugbetaling.html">Support</a></li><li class="nav-has-dropdown"><button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">Over ons</button><ul class="nav-dropdown" aria-label="Over ons submenu"><li><a data-nav href="../over-ons.html">Ons verhaal</a></li><li><a data-nav href="../blog.html">Blog</a></li><li><a data-nav href="../persberichten.html">Persberichten</a></li><li><a data-nav href="../beeldmateriaal.html">Beeldmateriaal</a></li></ul></li><li><a data-nav href="../contact.html">Contact</a></li></ul></nav></div></header>

  <main>
    <section class="section location-page-map-hero">
      <div class="location-page-map-canvas">
        <iframe
          title="Google Maps ${escapeHtml(name)}"
          src="https://www.google.com/maps?q=${mapQuery}&output=embed"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>
      <div class="location-page-overlay-wrap">
        <article class="card location-page-overlay">
          <h1>24/7 Quiosk in ${escapeHtml(city)} – Altijd open voor jouw gemak</h1>
          <p class="location-page-address"><a href="https://www.google.com/maps/dir/?api=1&destination=${navQuery}" target="_blank" rel="noopener noreferrer">${escapeHtml(street)}, ${escapeHtml(postcode)} ${escapeHtml(city)}</a></p>
          <div class="location-page-actions">
            <a class="btn btn-primary" href="https://www.google.com/maps/dir/?api=1&destination=${navQuery}" target="_blank" rel="noopener noreferrer">Navigeer</a>
            <a class="btn btn-secondary" href="../quiosk-zoeken.html?q=${encodeURIComponent(city)}&radius=25">Terug naar Quiosk zoeken</a>
          </div>
          <p class="location-page-subtitle">Op zoek naar een avondwinkel of nachtwinkel in ${escapeHtml(city)}?</p>
          <div class="location-seo-placeholder location-seo-placeholder-inline">
            <p>Quiosk ${escapeHtml(city)} is een moderne 24/7 self service kiosk waar je dag en nacht terechtkunt voor snacks, dranken en gemaksproducten.</p>
            <p>Onze locatie in ${escapeHtml(wijkOfGebied)} is volledig onbemand en altijd toegankelijk. Of je nu vroeg op pad bent, laat thuiskomt of tussendoor iets nodig hebt: Quiosk in ${escapeHtml(city)} is er wanneer het jou uitkomt.</p>
            <h3>Quiosk ${escapeHtml(city)} – Locatiegegevens</h3>
            <ul>
              <li>Adres: ${escapeHtml(streetName || street)}${houseNumber ? ` ${escapeHtml(houseNumber)}` : ''}, ${escapeHtml(postcode)} ${escapeHtml(city)}</li>
              <li>Openingstijden: 24/7 geopend</li>
              <li>Gelegen bij: ${escapeHtml(partnerLocatie)}</li>
            </ul>
            <h3>Wat vind je bij Quiosk ${escapeHtml(city)}?</h3>
            <p>Quiosk ${escapeHtml(city)} is meer dan een avondwinkel. Het is een compacte, slimme gemakswinkel waar je snel en zelfstandig je aankopen doet.</p>
          </div>
          <div class="location-page-products">
${productsHtml}
          </div>
        </article>
      </div>
    </section>
  </main>

  <footer class="site-footer"><div class="footer-inner"><div class="footer-brand"><img class="footer-logo" src="../logo-quiosk.png" alt="Quiosk logo" /></div><nav class="footer-links" aria-label="Footer navigatie"><a href="../index.html">Home</a><a href="../word-partner.html">Word partner</a><a href="../voor-onze-fans.html">Voor onze fans</a><a href="../quiosk-zoeken.html">Quiosk zoeken</a><a href="../feedback-terugbetaling.html">Support</a><a href="../over-ons.html">Over ons</a><a href="../contact.html">Contact</a></nav><div class="footer-cta"><a href="../word-partner.html" class="btn btn-primary">Word partner</a><a href="../quiosk-zoeken.html" class="btn btn-secondary">Zoek een locatie</a></div><p class="footer-copy">&copy; 2026 Quiosk</p></div></footer>
  <script src="../script.js"></script>
</body>
</html>`;
};

const updateSitemap = async (slugs) => {
  let xml = await fs.readFile(SITEMAP_FILE, 'utf8');
  xml = xml.replace(/\s*<url>\s*<loc>https:\/\/www\.quiosk\.nl\/locaties\/[^<]+<\/loc>[\s\S]*?<\/url>\s*/g, '\n');

  const today = new Date().toISOString().slice(0, 10);
  const locationUrls = slugs
    .map(
      (slug) => `  <url>
    <loc>https://www.quiosk.nl/locaties/${slug}.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('\n');

  xml = xml.replace('</urlset>', `${locationUrls}\n</urlset>`);
  await fs.writeFile(SITEMAP_FILE, xml, 'utf8');
};

const main = async () => {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const locations = JSON.parse(raw);
  if (!Array.isArray(locations) || !locations.length) {
    throw new Error('Geen locaties gevonden in data/locations.json');
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const slugs = [];
  for (const location of locations) {
    const slug = buildSlug(location);
    const html = buildLocationPage(location);
    const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
    await fs.writeFile(filePath, html, 'utf8');
    slugs.push(slug);
  }

  await updateSitemap(slugs);
  console.log(`Generated ${slugs.length} location pages in /locaties and updated sitemap.xml`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
