# Blogs toevoegen (makkelijk)

Gebruik voor elke nieuwe blog een eigen map:

- `blogs/<slug>/index.html`
- `blogs/<slug>/cover.jpg`

## Snel stappenplan

1. Kopieer de template map:
   - kopieer `blogs/_template/index.html` naar `blogs/<slug>/index.html`
2. Voeg cover toe:
   - plaats je afbeelding als `blogs/<slug>/cover.jpg`
3. Vul placeholders in `index.html`:
   - `[SLUG]`, `[TITEL BLOG]`, `[DATUM]`, `[CATEGORIE]`, `[ALINEA 1..3]`
4. Voeg het bericht toe in `blog.html` (kaart + timeline)
5. Voeg URL toe in `sitemap.xml`:
   - `https://www.quiosk.nl/blogs/<slug>/`

## Tip

Gebruik korte, SEO-vriendelijke slugs, bijvoorbeeld:
- `nieuwe-locatie-utrecht`
- `samenwerking-nieuwe-partner`
