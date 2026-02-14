Plaats hier je CSV exportbestand voor bulk import.

Aanrader:
- Bestandsnaam: latest.csv

Daarna importeer je via:
- http://localhost:8000/import-locaties.html
- knop: "Importeer uit map"

Of via API:
POST /api/import-from-drop
Header: x-import-token: <IMPORT_TOKEN>
Body JSON: {"filename":"latest.csv"}
