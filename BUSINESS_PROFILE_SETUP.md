# Google Business Profile Koppeling

## 1) Dependencies installeren
```bash
cd "/Users/nickdeleeuw/Documents/Nieuwe website"
npm install
```

## 2) Environment configureren
1. Maak een `.env` bestand op basis van `.env.example`.
2. Vul minimaal in:
   - `IMPORT_TOKEN`
   - `DATA_FILE` (mag op default blijven: `data/locations.json`)
   - `ALLOWED_ORIGINS` (voor CORS)
3. Alleen nodig voor live koppeling met Google Business Profile:
   - `GBP_CLIENT_ID`
   - `GBP_CLIENT_SECRET`
   - `GBP_REFRESH_TOKEN`
4. Optioneel:
   - `GBP_ACCOUNT_ID` (als je meerdere accounts hebt)
   - `PORT` (standaard `8000`)

## 3) Lokale database gebruiken (aanrader voor controle)
De finder leest eerst `data/locations.json`. Als daar locaties in staan, worden die direct gebruikt.

Template ophalen:
```bash
curl http://localhost:8000/api/import-template
```

CSV importeren:
```bash
curl -X POST "http://localhost:8000/api/import-locations" \
  -H "x-import-token: JOUW_IMPORT_TOKEN" \
  -H "Content-Type: text/csv" \
  --data-binary @jouw-locaties.csv
```

JSON importeren:
```bash
curl -X POST "http://localhost:8000/api/import-locations" \
  -H "x-import-token: JOUW_IMPORT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"locations":[{"title":"Quiosk - Station Plaza","city":"Utrecht","postcode":"3511","address":"Stationsplein 1","lat":52.0907,"lng":5.1109,"isOpen":true,"environment":"Indoor","contactless":true,"products":["Drinks","Snacks"]}]}'
```

## 4) Google Business Profile als fallback (optioneel)
Als de lokale database leeg is, gebruikt de API automatisch Google Business Profile (als env vars zijn ingevuld).

## 5) OAuth scopes (Google Cloud)
Voor de refresh token moet je minimaal toegang hebben tot Business Profile data.
Gebruik in je OAuth-consent flow scopes die Business Profile lezen toestaan.

## 6) Server starten
```bash
npm run dev
```

Open daarna:
- `http://localhost:8000/kiosk-finder.html`

## 7) Test de API direct
Open:
- `http://localhost:8000/api/locations`

Als dit JSON met `locations` teruggeeft, is de koppeling actief.

## Werking in de frontend
- De finder probeert eerst `GET /api/locations` (of een externe URL als `window.QUIOSK_LOCATIONS_API_URL` is gezet in `kiosk-finder.html`).
- Als dat niet lukt, valt hij terug op de lokale `kioskData` in `script.js`.

## Gebruik met GitHub Pages (aanrader voor live sync)
Omdat GitHub Pages statisch is, moet je de API apart hosten (bijv. Render/Railway/Cloud Run):

1. Deploy deze repo als Node service met start command:
```bash
npm run dev
```
of production:
```bash
node server.js
```

2. Zet de env vars op je host:
- `IMPORT_TOKEN`
- `DATA_FILE=data/locations.json`
- `ALLOWED_ORIGINS=https://nickquiosk.github.io`
- (optioneel fallback) `GBP_CLIENT_ID`, `GBP_CLIENT_SECRET`, `GBP_REFRESH_TOKEN`, `GBP_ACCOUNT_ID`

3. Zet in `kiosk-finder.html`:
```html
window.QUIOSK_LOCATIONS_API_URL = "https://<jouw-backend-domein>/api/locations";
```

4. Controleer health endpoint:
`https://<jouw-backend-domein>/api/health`
