# Locatiebeheer (zonder importmodule)

De importfunctionaliteit en importpagina zijn verwijderd.
Locaties worden nu direct gelezen uit:

- `data/locations.json`

## Lokale start

```bash
cd "/Users/nickdeleeuw/Documents/Nieuwe website"
npm install
npm run dev
```

Open daarna:

- `http://localhost:8000/api/locations`
- `http://localhost:8000/quiosk-zoeken.html`

## Locaties bijwerken

Werk `data/locations.json` bij en herstart de server (of refresh de pagina).

De finder en detailpagina's gebruiken deze database als bron.
