# Biztonsági irányelvek

A koino a közösség bizalmára épül, ezért a biztonsági hibákat komolyan vesszük.

## Biztonsági hiba bejelentése

Ha biztonsági sebezhetőséget találsz, **kérjük, ne nyiss róla nyilvános
issue-t**, és ne oszd meg addig, amíg javítás nem született. Ehelyett jelezd
privátban a projekt karbantartójának.

A bejelentésben — ha teheted — írd le:

- mi a sebezhetőség és hol (fájl, végpont, komponens),
- hogyan reprodukálható (lépések),
- mi a lehetséges hatása.

Igyekszünk a lehető leghamarabb visszajelezni és javítani.

## Támogatott verzió

Aktívan a `main` branch éles változata (a [koino.hu](https://koino.hu)-n futó
kód) van támogatva. Régebbi állapotokra nem adunk ki javítást.

## Érzékeny adatok

- A titkokat (`backend/.env`, `backend/.env.prod`) **soha** ne kommitold be —
  ezek a `.gitignore`-ban vannak. Minta: `backend/.env.prod.example`.
- Az egyéni szavazat nem nyilvános adat (csak az összesített eredmény az), az
  e-mail privát — ezt az adatvédelmi audit rögzítette. Kérjük, tartsd tiszteletben
  ezeket az invariánsokat a fejlesztés során.

Adatkezelési részletek: [`docs/adatkezeles.md`](docs/adatkezeles.md) és
[`docs/adatvedelmi_nyilatkozat.md`](docs/adatvedelmi_nyilatkozat.md).
