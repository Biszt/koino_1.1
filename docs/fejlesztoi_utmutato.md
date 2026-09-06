# Fejlesztői útmutató (hozzájárulás)

Ez a dokumentum azt írja le, **hogyan dolgozz** a koino kódján: milyen
konvenciókat követünk, hogyan adj hozzá új funkciót, és mi a munkafolyamat.
Ha még nem tetted, előbb olvasd el a [`README.md`](../README.md)-t, a
[`CLAUDE.md`](../CLAUDE.md)-t és az [`architektura.md`](architektura.md)-t.

## Tartalomjegyzék

- [Alapelvek](#alapelvek)
- [Kódolási konvenciók](#kódolási-konvenciók)
- [Naplózás és kommentelés](#naplózás-és-kommentelés)
- [Recept: új entitás / végpont hozzáadása](#recept-új-entitás--végpont-hozzáadása)
- [Recept: új frontend-komponens](#recept-új-frontend-komponens)
- [Munkafolyamat és git](#munkafolyamat-és-git)
- [Tesztelés](#tesztelés)
- [Zárójeles jegyzetek](#zárójeles-jegyzetek)

---

## Alapelvek

1. **Kis, alapos lépések.** Inkább sok apró, jól érthető változtatás, mint egy
   nagy ugrás. Minden lépést magyarul, érthetően magyarázunk el.
2. **Moduláris, tiszta kód** a backenden és a frontenden is: egy felelősség egy
   helyen.
3. **A domain nyelve szent.** A [`CLAUDE.md`](../CLAUDE.md) terminológiáját
   pontosan használjuk (e-ember, nem „felhasználó"; „érték javaslat" ≠
   „javaslat"; stb.).

## Kódolási konvenciók

Ezek **kötelezőek** — a kód egységessége ezen múlik:

1. **Minden név magyarul, camelCase-ben** — fájlok, változók, függvények,
   CSS-osztályok. Osztályfájlok PascalCase-zel (pl. `IdEllenorzoMezo.js`,
   `JavaslatKartya.js`).
2. **Minden fájl első sora komment az elérési úttal**, pl.:
   ```js
   // backend/services/javaslat/javaslatService.js
   ```
3. **Fájl/osztály tetején felelősség-leírás** — „Felelősség: …", „Használják: …".
4. **Logikai blokkok előtt szakasz-fejlécek**:
   ```js
   // ===== SZAVAZAT MENTÉSE =====
   ```
5. **Egy komponens = egy JS-fájl + egy CSS-fájl** (frontend).
6. Kövesd a **rétegzést**: a `controller` ne írjon közvetlen DB-query-t, az a
   `repository` dolga; az üzleti szabály a `service`-be tartozik.

## Naplózás és kommentelés

- A metódusok elején és végén `console.log` a releváns értékekkel:
  ```js
  console.log('szavazatLeadasa - KEZDÉS', { javaslatId, eemberId });
  // ... logika ...
  console.log('szavazatLeadasa - VÉGE', { eredmeny });
  ```
- **Bőséges magyar kommentek.** A kód tanuló fejlesztőnek is olvasható legyen.
- Ha valamit *azért* csinálsz, mert egy korábbi hiba tanulsága — írd le
  kommentben (a projektben több ilyen „miért így" komment van, ezek értékesek).

## Recept: új entitás / végpont hozzáadása

Kövesd a rétegeket **alulról felfelé**. Példa: új „valami" entitás.

1. **Model** — `backend/models/valami.js`: Mongoose séma (mezők, típusok,
   validáció, szükség szerint indexek).
2. **Repository** — `backend/repositories/valamiRepository.js`: az adatbázis-
   műveletek (`find`, `create`, `update`, `delete`). Csak Mongoose-hívások,
   üzleti logika nélkül.
3. **Service** — `backend/services/valamiService.js`: az üzleti szabályok
   (jogosultság, számítás, invariánsok). Ez hívja a repository-t.
4. **Controller** — `backend/controllers/valamiController.js`: kicsomagolja a
   `req`-et, hívja a service-t, formázza a `res`-t és a hibakódokat.
5. **Route** — `backend/routes/valamiRoutes.js`: az Express Router; a
   HTTP-metódus + útvonal a controller-metódushoz köt. Védett végpontnál tedd
   elé az `authMiddleware`-t.
6. **Regisztráció** — `backend/server.js`: importáld a route-ot, és add hozzá
   egy `app.use('/api/valami', valamiRoutes)` sorral.

> **Útvonal-sorrend fontos!** A specifikusabb, többszegmensű útvonalakat
> (`/:id/reszletek`) előbb kell definiálni, mint az általános `/:id`-t —
> különben az `:id` „elnyeli" őket. Ezt a `javaslatRoutes.js` szépen mutatja.

Ha a végpont teszteléshez érint egy útvonalat, kötelező mezőt vagy
érték-tartományt, **vezesd át a [`teszt.md`](teszt.md)-be** is.

## Recept: új frontend-komponens

1. Hozz létre egy `frontend/js/components/…/UjKomponens.js` osztályt (első sor:
   elérési-út komment; tetején felelősség-leírás).
2. A hozzá tartozó stílus: `frontend/css/components/ujKomponens.css`, és
   importáld a `css/main.css`-ből.
3. Ha HTML-sablon kell, tedd a `frontend/html/components/…` alá.
4. Kösd be oda, ahol használják (pl. a `foOldal.js` vagy egy szülő-komponens),
   és a backend-adatot `fetch`-csel a megfelelő `/api/...` végpontról kérd.

## Munkafolyamat és git

- A **`main`** branchre dolgozunk. A commit-üzenetek **magyarul**.
- A commit-üzenet mondja el **mit és miért** — a projekt eddigi üzenetei jó
  minták (pl. *„Küszöb-hiba javítás: kategória/gondolattípus javaslatok saját
  küszöbe érvényesül"*).
- Módosítás után a **dev környezetben** (http://localhost:3000) ellenőrizd a
  működést. Backend-módosítás után Windows alatt a nodemon nem mindig tölt újra
  → `docker restart koino-backend`.
- **Éles** (koino.hu) csak külön deploy-jal frissül:
  `docker-compose -f docker-compose.prod.yml up -d --build`. Éleset soha ne
  `down -v`-vel állíts le. Lásd [`elesites.md`](elesites.md).

## Tesztelés

Nincs automatizált teszt — a tesztelés **böngészős**. A referencia a
[`teszt.md`](teszt.md): ez tartalmazza a környezet-indítást, az útvonalakat, a
kötelező mezőket, érték-tartományokat és a teszt-forgatókönyveket.

- **Tesztelés előtt mindig nézd meg a [`teszt.md`](teszt.md)-t.**
- **Fejlesztés közben frissítsd**, ha egy útvonal, mező, érték-tartomány vagy
  forgatókönyv változik — hogy a referencia naprakész maradjon.

## Zárójeles jegyzetek

A munka közben felmerülő mellékes ötleteket a fejlesztő **zárójelben** írja le
— `[ ... ]` vagy `{ ... }`. Ezeket **nem valósítjuk meg azonnal**, de nem is
vesznek el:

1. Szó szerint felvezetjük a [`jegyzetek.md`](jegyzetek.md) naplóba (dátummal,
   felülre, 🆕 jellel).
2. Röviden visszaigazoljuk, és folytatjuk az aktuális feladatot.
3. Ha valódi feladattá válik, átvezetjük a
   [`fejlesztesi_terv.md`](fejlesztesi_terv.md)-be, és a naplóban ✅-re állítjuk.
