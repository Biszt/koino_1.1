# Frontend — koino

Vanilla HTML / CSS / JavaScript, **build nélkül**, natív ES-modulokból. Nincs
React/Vue és nincs csomagoló — komponens-**osztályok** vannak, minden komponens
egy JS-fájl + egy CSS-fájl. A frontendet a backend szolgálja ki statikusan
(fejlesztésben: http://localhost:3000).

> Nagyobb kép: [`../docs/architektura.md`](../docs/architektura.md).

## Belépési pont

- `index.html` — betölti a `js/main.js`-t.
- `js/main.js` — elindítja az alkalmazást; a fő nézeteket a
  `js/components/foOldal.js` szervezi.

## Mappák

| Mappa | Gondolat |
|-------|----------|
| `js/main.js` | Alkalmazás-indító |
| `js/components/` | Komponens-osztályok (lásd lentebb) |
| `html/` | Komponens-sablonok (pl. `html/components/modals/`) |
| `css/` | Stílusok; a `css/main.css` importálja a `css/components/`-et |

### Fontosabb komponensek

- `components/kartya/` — entitás-**kártyák** (GondolatKartya, JavaslatKartya,
  EgyezmenyKartya…). A `Pakli.js` listázza őket („pakli" = kártyák listás
  megjelenítése).
- `components/szovegSzerkeszto/` — blokk-alapú szerkesztő: `blokkok/`
  (SzovegBlokk, KepBlokk, FajlBlokk, LinkBlokk, EntitasHivatkozasBlokk),
  `eszkoztar/`, BlokkLista, OldalNavigacio.
- `components/modals/` — Modal alaposztály + specifikus modálok (pl.
  JavaslatModal). A hozzájuk tartozó HTML a `html/components/modals/` alatt.
- `components/foOldal.js` — a fő nézetek összefogása.
- `components/FoOldalTortenetKezelo.js` — böngésző vissza/előre kezelése.
- Auth-komponensek: `BejelentkezesForm.js`, `RegisztracioForm.js`,
  `MeghivoKodForm.js`.

## Backend-kapcsolat

A frontend `fetch`-csel hívja a `/api/...` végpontokat (JSON). A védett
végpontokhoz a bejelentkezéskor kapott **JWT-t** küldi. A végpontok listája a
backend `routes/` mappájában és a [`../docs/teszt.md`](../docs/teszt.md)-ben van.

## Konvenciók

- Minden név magyarul, camelCase-ben; osztályfájlok PascalCase-zel.
- Minden fájl első sora elérési-út komment.
- Egy komponens = egy JS + egy CSS.
- Részletek: [`../docs/fejlesztoi_utmutato.md`](../docs/fejlesztoi_utmutato.md).
