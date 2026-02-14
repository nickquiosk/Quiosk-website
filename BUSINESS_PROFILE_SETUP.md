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
- De finder probeert eerst `GET /api/locations`.
- Als dat niet lukt, valt hij terug op de lokale `kioskData` in `script.js`.
