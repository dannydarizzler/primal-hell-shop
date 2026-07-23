# Primal Hell Shop — Setup-Anleitung

## 1. Lokal testen (Sandbox)

```bash
npm install
cp .env.example .env
```

Dann in `.env` deine **Sandbox**-Werte aus dem PayPal Developer Dashboard eintragen:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV=sandbox`

Server starten:
```bash
npm start
```

Seite öffnen: http://localhost:3000

**Zum Testen zahlen:** Im Sandbox-Modus zahlst du nicht mit echtem Geld, sondern mit einem
PayPal-Test-Käuferkonto. Das findest du im Developer Dashboard unter
"Testing Tools" → "Sandbox accounts" (dort gibt's automatisch ein Test-Käuferkonto
mit Test-E-Mail/Passwort).

## 2. Auf GitHub bringen

```bash
git init
git add .
git commit -m "Initial commit: Primal Hell Shop"
```

Dann ein neues Repo auf GitHub erstellen und pushen (die `.env` wird durch `.gitignore`
automatisch NICHT mitgeschickt — Secrets bleiben lokal).

## 3. Auf Railway deployen

1. Neues Projekt auf Railway → "Deploy from GitHub repo" → dieses Repo auswählen
2. Unter **Variables** die Umgebungsvariablen eintragen (genau wie in `.env`, aber diesmal
   direkt im Railway-Dashboard, nie im Code):
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_ENV` (`sandbox` zum Testen, später `live`)
   - `BOT_SYNC_SECRET` (ein selbst ausgedachtes, langes Zufalls-Passwort — brauchst du,
     damit dein Discord-Bot später sicher Käufe abholen kann)
3. Ein **Volume** anlegen und z.B. auf `/data` mounten, dann zusätzlich die Variable
   `DB_PATH=/data/shop.db` setzen — sonst geht die Datenbank bei jedem Redeploy verloren
   (genau wie bei deinem Bot mit dem Giveaway-System)
4. Railway deployed automatisch. Du bekommst eine URL wie `primal-hell-shop.up.railway.app`

## 4. Von Sandbox auf Live umstellen (wenn's losgehen soll)

1. Im PayPal Developer Dashboard oben auf **"Live"** umschalten (statt Sandbox)
2. Dort unter "Apps & Credentials" eine **neue App im Live-Modus** anlegen (eigene Live-Client-ID/Secret)
3. In Railway die Variablen austauschen: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (Live-Werte),
   `PAYPAL_ENV=live`
4. Erst mit einem eigenen Kleinbetrag (z.B. Starter-Paket) selbst testen, bevor du den Link
   im Discord verteilst

## 5. Wie der Discord-Bot die Coins abholt

Der Shop speichert jeden abgeschlossenen Kauf in seiner eigenen Datenbank
(Tabelle `purchases`) und bietet zwei geschützte Endpunkte für den Bot:

- `GET /api/bot/pending-purchases` — Liste aller abgeschlossenen, noch nicht verarbeiteten Käufe
- `POST /api/bot/mark-processed/:id` — markiert einen Kauf als "vom Bot verarbeitet"

Beide Endpunkte erwarten den Header `x-bot-secret: <dein BOT_SYNC_SECRET>`.

Der Bot müsste also z.B. alle 30–60 Sekunden diese Route abfragen, für jeden neuen Eintrag
die Coins der `discord_id` gutschreiben (z.B. in seiner eigenen SQLite/Giveaway-DB) und ihn
danach als verarbeitet markieren. Das ist ein separater Schritt — sag Bescheid, wenn du
willst, dass ich das direkt in deinen bestehenden `bot.py` einbaue.

## Was als Nächstes ansteht

- [ ] PayPal Sandbox-Test lokal durchführen (kompletter Testkauf)
- [ ] Domain (optional) oder erstmal mit der kostenlosen Railway-Subdomain starten
- [ ] Bot-Anbindung für automatische Coin-Gutschrift bauen
- [ ] Auf Live umstellen, wenn alles funktioniert
