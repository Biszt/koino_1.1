# Képesség-mérés — a Szakasz 1 tervezése előtt

*Mérve: 2026-08-26. Eszköz: [`kepessegProba.html`](kepessegProba.html) (eldobható mérőoldal).*

> **Miért mértünk tervezés előtt?** Mert négy tervezési döntés múlt rajta, és a projekt
> visszatérő tanulsága, hogy az ilyet nem saccoljuk meg.

## A mérés eredménye (Chrome 148 alapú böngésző, Windows, 8 mag)

### 1. Aláírás — a kulcs-réteg alapja (D15)

| Mit | Eredmény | Miért számít |
|---|---|---|
| **Ed25519 a WebCryptóban** | ✅ **TÁMOGATOTT natívan** | **nem kell külső kripto-könyvtár** |
| Aláírás | **0,031 ms** (~32 800/mp) | a mindennapi művelet ára gyakorlatilag nulla |
| Ellenőrzés | **0,058 ms** (~17 200/mp) | ez a fontos: minden esemény ellenőrzendő |
| **10 000 esemény ellenőrzése** | **0,58 mp** | a **D17 determinisztikus újraszámítása gyakorlatban is megy** |
| Nyilvános kulcs | **32 bájt** | a D21 „mindenki tárolja a saját lapját, ~1 KB" számítása **tartható** |
| Aláírás mérete | **64 bájt** | |
| SHA-256 (1 KB) | 0,005 ms | a Merkle-fához (Szakasz 4) bőven elég |
| *ECDSA P-256 (tartalék)* | *támogatott, de lassabb (0,12 ms) és nagyobb kulcs (65 bájt)* | **nem kell** |

### 2. Tárolás — a helyi tár

| Mit | Eredmény |
|---|---|
| IndexedDB | ✅ működik (írás + visszaolvasás) |
| Becsült kvóta | **2,48 GB** |
| Tartós tárolás (`persist`) | ⚠️ **nincs bekapcsolva** — kérni kell |

### 3. Hálózat — előretekintés a Szakasz 2-re

| Mit | Eredmény |
|---|---|
| WebRTC (`RTCPeerConnection`) | ✅ elérhető |
| Adatcsatorna (`DataChannel`) | ✅ létrehozható |
| WebSocket (jelzéshez) | ✅ elérhető |

## Amit ez a Szakasz 1 tervére jelent

1. **Nulla külső függőség a kriptográfiához.** Az Ed25519 natív — se npm-csomag, se
   ellátási-lánc kockázat, se letöltendő könyvtár. Egy P2P programnál, aminek a lényege,
   hogy **nem kell megbízni senkiben**, ez több, mint kényelem.
2. **A determinisztikus állapotszámítás (D17) reális.** Egy koino teljes története
   újraszámolható másodpercek alatt: 10 000 aláírt esemény ellenőrzése **fél másodperc**.
   *(A prototípus dev adatbázisában ~15 600 tudatpont-hozzárendelés van — nagyságrendileg
   ez az a méret, amiről beszélünk.)*
3. **A tár bőven elég** a tartalmi réteghez (2,5 GB).
4. ⚠️ **A kulcs elveszhet — és ez nem elméleti.** A böngésző alapból **kiürítheti** a tárat
   (a tartós tárolás nincs bekapcsolva). Ebből két kötelező elem következik a Szakasz 1-be:
   - `navigator.storage.persist()` kérése **rögtön a kulcs létrehozásakor**;
   - a kulcs **kimenthetősége** (és a D15 több-tanús helyreállítása így nem
     „ritka határeset", hanem a mindennapi működés része).

## Amit még meg kell mérni

- **MOBIL böngésző** (különösen iOS/Safari): az Ed25519-támogatás és a tárolási kvóta ott
  szűkebb lehet. A mérőoldal ugyanaz — csak el kell érni a telefonról.
- **Nagyobb adathalmaz**: a mérés 200 aláírással dolgozott; a valódi terhelés (több tízezer
  esemény betöltése IndexedDB-ből) külön mérendő, amikor már van mit betölteni.
