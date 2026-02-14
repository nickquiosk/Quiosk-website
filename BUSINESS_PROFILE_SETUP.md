# Google Business Profile Koppeling

## 1) Dependencies installeren
```bash
cd "/Users/nickdeleeuw/Documents/Nieuwe website"
npm install
```

## 2) Environment configureren
1. Maak een `.env` bestand op basis van `.env.example`.
2. Vul minimaal in:
   - `GBP_CLIENT_ID`
   - `GBP_CLIENT_SECRET`
   - `GBP_REFRESH_TOKEN`
3. Optioneel:
   - `GBP_ACCOUNT_ID` (als je meerdere accounts hebt)
   - `ALLOWED_ORIGINS` (comma-separated, voor CORS)
   - `PORT` (standaard `8000`)

## 3) OAuth scopes (Google Cloud)
Voor de refresh token moet je minimaal toegang hebben tot Business Profile data.
Gebruik in je OAuth-consent flow scopes die Business Profile lezen toestaan.

## 4) Server starten
```bash
npm run dev
```

Open daarna:
- `http://localhost:8000/kiosk-finder.html`

## 5) Test de API direct
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
- `GBP_CLIENT_ID`
- `GBP_CLIENT_SECRET`
- `GBP_REFRESH_TOKEN`
- `GBP_ACCOUNT_ID` (optioneel)
- `ALLOWED_ORIGINS=https://nickquiosk.github.io`

3. Zet in `kiosk-finder.html`:
```html
window.QUIOSK_LOCATIONS_API_URL = "https://<jouw-backend-domein>/api/locations";
```

4. Controleer health endpoint:
`https://<jouw-backend-domein>/api/health`
