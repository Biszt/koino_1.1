# koino — a P2P program

*Ez a mappa a **Fázis 2** koinója: a készüléken futó, aláírt eseményekre épülő,
központi szerver nélküli program.*

## Mi ez, és mi nem

- **Ez:** az új koino, ami a **D22** döntés szerint az első kiadástól P2P
  („a központi server részét most nem kell fejleszteni").
- **Nem ez:** a `../backend` + `../frontend`. Az a **prototípus**, ami tanított — ma is fut
  (koino.hu), és **változatlanul marad**. Nem alakítjuk át, nem költöztetjük: az éles
  rendszer a repó gyökeréből épül, és működnie kell.

## Mit örökölünk a prototípusból (D22)

| Öröklődik | Nem öröklődik |
|---|---|
| a **domain-logika**: küszöbök, medián, bizonyossági mutató, javaslat-életciklus | a központi szerver, a REST-végpontok |
| a **felület**: kártyák, pakli, szövegszerkesztő, síkidom/struktúra nézet | a MongoDB adatmodell |
| a **fogalmak**: e-ember, tudatpont, tartalom, javaslat, egyezmény | **az adat** — a D24 szerint új regisztráció lesz |

## Hol tartunk

**Szakasz 1 — A HELYI KOINO** *(egy készülék, hálózat nélkül)*: kulcspár a készüléken,
minden művelet aláírt esemény, helyi tár, és az állapot az eseményekből számított
determinisztikus eredmény.

A teljes terv és a döntések: [`../docs/fejlesztesi_terv_fazis2.md`](../docs/fejlesztesi_terv_fazis2.md)
· az adatmodell rétegei: [`../docs/adat_osztalyozas.md`](../docs/adat_osztalyozas.md)

## Futtatás

```bash
node koino/fejlesztoiSzerver.js
```

Ezután: <http://localhost:4000>

*(Miért kell szerver egy szerver nélküli programhoz? Mert a böngésző az ES-modulokat
`file://` alól nem tölti be, és a WebCrypto is csak biztonságos környezetben — `localhost`
vagy `https` — működik. Ez a kiszolgáló **csak fájlokat ad ki**: nincs adatbázisa, nincs
API-ja, és semmit nem tud a koinóról.)*
