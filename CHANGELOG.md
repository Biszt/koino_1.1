# Változásnapló

A koino főbb változásai időrendben, legújabb elöl. A dátumok a `main` branch
commit-jeiből származnak. Ez nem szemantikus verziózás — a projekt egyetlen,
folyamatosan fejlődő ágon (`main`) halad.

A formátum lazán követi a [Keep a Changelog](https://keepachangelog.com/hu/)
szellemét (magyarul, a projekt stílusához igazítva).

---

## 2026-08-01 — Élesítés és finomítás

- **Egyezmény törölhető:** törlés-javaslat engedélyezése egyezményre; a
  javaslat szülő-/tárhelytípus enum kiegészítése az Egyezménnyel.
- **Szövegszerkesztő:** a beillesztett szöveg formázásának megőrzése
  (paste-sanitizálás), sticky eszköztár, korlátlan szélességű modálok.
- **Éles/fejlesztői környezet szétválasztása:** külön `docker-compose.prod.yml`
  stack (koino-backend-prod a 8080-on, saját mongo- és uploads-kötet, `.env.prod`
  titkok), a kód a képbe égetve.
- E-mail opcionális utólagos szerkesztése a beállításokban.

## 2026-07-31

- Módosítási javaslat: kategória + típus választás, ikon-egységesítés,
  fejléc-elválasztók, opcionális e-mail.
- Részvételi szerep (passzív/aktív) bevezetése; a felmenő-kényszer megszüntetése.

## 2026-07-30 — Éles bevetésre felkészítés

- Meghívó-rendszer, adatvédelmi lépések, hosting- és kártya-javítások.
- Árva feltöltött fájlok megszüntetése: halasztott feltöltés + törlés/csere
  takarítás.

## 2026-07-23

- Főoldal vissza/előre történet-kezelő (entitás + rendezés + térkép állapot).
- Térkép ág-szűrés a backendre helyezve; önkéntes fiók-törlés; alsó sáv
  entitás-számok; adatvédelmi nyilatkozat.
- Egyezmény-javaslat + javaslat-típus domain-szabályok + kategória-egyesítés.
- Alkategória + leírás-szerkesztő + hierarchikus kategória-választó.
- Menü: csoportosítás, Világtérkép, görgetés-javítás; testvér-ugrás gombok.

## 2026-07-22

- Rendezés funkció: lapos pakli-rendezés + skálázható ág-szűrés.
- Dokumentáció: a név története + bemutató kívülállóknak.

## 2026-07-19–20

- **Értesítési rendszer** lezárása + governance-lyuk befoltozása.
- **Térkép nézet:** kétszintű LOD, mellék-ikonok, sima zoom, kattintás-javítás.
- **Síkidom nézet** 1. lépése (statikus ablak) — utána felfüggesztve.
- **Tudatpontok nézet** és **Keresés** (fő menü + ág-szűrt kártya-menük).
- eember beállítások: profil-módosítás + jelszóváltás.
- Ikon-egységesítés (kategória 🧩, tartózkodás ➖).
- Kis adósságok: üres-pakli állapot, `szavazasiHatarido` cron, árva
  értesítés-takarítás.

## 2026-07-18 — Adatvédelmi audit

- Szavazat-láthatóság szűkítése (az egyéni szavazat nem nyilvános; csak az
  összesített eredmény az).
- E-mail priváttá tétele.
- Küszöb-hiba javítás: a kategória/tartalomtípus javaslatok saját küszöbe
  érvényesül.

---

> A teljes, részletes történet a git-logban van:
> `git log --oneline`. A régebbi (2026-07-18 előtti) commitok is ott
> követhetők.
