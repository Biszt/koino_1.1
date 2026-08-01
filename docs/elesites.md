# Élesítés (koino.hu) — kézikönyv

Ez a dokumentum írja le, hogyan fut a **koino.hu (éles)** a **fejlesztői** környezet
mellett, ugyanazon a gépen, egymástól teljesen függetlenül.

## A lényeg egy mondatban

**Egy kódbázis (a git repo), két környezet.** A fejlesztői a `localhost:3000`-en fut,
és itt kódolsz tovább; az éles a `8080`-as porton fut (ide jön a koino.hu), és csak
akkor változik, amikor **szándékosan** újraépíted (deploy). A kettő **külön
adatbázist és külön feltöltés-mappát** használ — a fejlesztés nem érinti a valódi
közösségi adatokat.

| | Fejlesztői | Éles (koino.hu) |
|---|---|---|
| Compose-fájl | `docker-compose.dev.yml` | `docker-compose.prod.yml` |
| Elérés | `http://localhost:3000` | `8080` → Cloudflare Tunnel / IP → koino.hu |
| Backend konténer | `koino-backend` | `koino-backend-prod` |
| Adatbázis konténer | `koino-mongodb-dev` (27018) | `koino-mongodb-prod` (nincs kifelé nyitva) |
| Adatbázis-kötet | `mongodb-data` | `mongodb-data-prod` |
| Feltöltések | `backend/uploads` | `backend/uploads-prod` |
| Titkok | `backend/.env` | `backend/.env.prod` (gitből kizárva) |
| Kód frissülése | azonnal (nodemon) | csak deploykor (`--build`) |

## Parancsok

### Éles indítása / új verzió kirakása (deploy)
Ezt futtatod, amikor a fejlesztői oldalon elkészültél valamivel, commitoltad, és ki
akarod tenni élesbe:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
A `--build` újraépíti a képet a jelenlegi kódból, a `-d` a háttérben futtatja.

### Éles leállítása (az adatok megmaradnak)
```bash
docker-compose -f docker-compose.prod.yml down
```

### Éles naplók megnézése
```bash
docker logs -f koino-backend-prod
```

### Fejlesztői indítása (a szokásos)
```bash
docker-compose -f docker-compose.dev.yml up
```

> ⚠️ **SOHA ne tedd az élesre a `-v` kapcsolót** (`down -v`)! Az törölné az éles
> adatbázis-kötetet, azaz a **valódi közösségi adatokat**. A `down` (v nélkül) csak
> a konténereket állítja le, az adat megmarad.

## Első éles indítás — ellenőrzőlista

1. `backend/.env.prod` létezik és ki van töltve (JWT_SECRET egyedi, `MEGHIVAS_KOTELEZO=true`).
2. `docker-compose -f docker-compose.prod.yml up -d --build`
3. `docker logs -f koino-backend-prod` → „MongoDB kapcsolat sikeres" + „Szerver fut a 3000-es porton".
4. Böngészőben: `http://localhost:8080` — betölt a koino.
5. Cloudflare Tunnel / IP: a koino.hu a gép **8080**-as portjára mutasson.
6. Regisztrálj egy első e-embert (meghívóval, mert `MEGHIVAS_KOTELEZO=true`).

## Éles adatbázis mentése (biztonsági mentés)

Érdemes időnként lementeni a valódi adatokat:
```bash
docker exec koino-mongodb-prod mongodump --db koino --archive > koino-prod-$(date +%Y%m%d).archive
```
Visszatöltés (VIGYÁZAT, felülír):
```bash
docker exec -i koino-mongodb-prod mongorestore --archive --drop < koino-prod-YYYYMMDD.archive
```

## Ha megjön a külön szerver-gép

A jövőben, amikor a koino.hu külön (otthoni) gépen fut:
1. A repo klónozása az új gépre (`git clone ...`).
2. `cp backend/.env.prod.example backend/.env.prod`, majd ki­tölteni (új JWT_SECRET!).
3. `docker-compose -f docker-compose.prod.yml up -d --build`.
4. A Cloudflare Tunnelt / port-átirányítást az új gép 8080-as portjára állítani.

A `docker-compose.prod.yml` és a `Dockerfile.prod` **változatlanul átvihető** — semmit
nem kell újraírni.

## Cloudflare Tunnel (koino.hu → 8080) — külön lépés

A tunnel a Cloudflare-oldali beállítás (dashboard + `cloudflared`), nem része ennek a
kódbázisnak. A cél: a `koino.hu` a futó gép **8080**-as portjára (`http://localhost:8080`)
irányuljon. Ha még nincs beállítva, ez teendő az élesítés előtt, hogy a domain elérje
az éles konténert.
