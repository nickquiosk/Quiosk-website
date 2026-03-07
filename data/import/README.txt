Plaats hier het importbestand voor locaties (Excel).

Huidig ondersteund bestand:
- `Machines Import.xlsx`

Import uitvoeren (alleen lokaal):

1. Start de server:
   `npm run dev`

2. Run import:
   `curl -X POST "http://localhost:8000/api/import-machines" \
     -H "Content-Type: application/json" \
     -H "X-Import-Token: quiosk-import-2026" \
     -d '{"filename":"Machines Import.xlsx"}'`

Resultaat:
- Locaties worden opgeslagen in `data/locations.json`
- Coördinaten worden hergebruikt uit bestaande data
- Als nodig wordt geocode gebruikt (alleen als `GOOGLE_GEOCODING_API_KEY` is ingesteld)
