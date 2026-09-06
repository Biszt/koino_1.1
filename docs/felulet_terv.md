# A koino felülete a Fázis 2-ben

*Létrehozva: 2026. 08. 27. — Csaba kérésére, aki a Szakasz 1 fejlesztői nézetét látva
kimondta az alapelvet.*

---

## ALAPELV: a felület ÖRÖKLŐDIK, nem rögtönzünk újat

> „Nem szeretnék ideiglenes, rögtönzött frontendet, még a teszteléshez sem. Pontosan azt
> a felületet szeretném látni, mint a koino_1.1-ben. Természetesen azt megértem, hogy ha
> a fejlesztés még nem tart ott, de akkor még **nem is akarom tesztelni a kliens
> oldalt**." — Csaba

Ez a **D22** örökség-elvének gyakorlati alakja: a domain-logika és a **felület** átjön a
prototípusból, csak az alatta lévő réteg cserélődik (szerver helyett aláírt események).

**Következmények a munkamódszerre:**

| | |
|---|---|
| Amíg a modell nem stabil | **nincs kliens-oldali tesztelés** — a próbaoldalak (`koino/meres/*.html`) elegendők |
| A Szakasz 1 nézete | ⚠️ **fejlesztői eszköz**, és a lapon is ez áll rajta. Nem a koino képe, nem is lesz az |
| Amikor a felület elkészül | a **pakli, a kártyák, a fülek és a hamburger menük** a prototípusból jönnek át |

---

## A BELÉPŐ TÉR NÉZETE (Csaba, 2026-08-27)

A **D25** belépő tere kap egy saját nézetet — **ugyanazzal a stílussal és logikával, mint
a pakli**, de a kártyákon nem gondolatok, hanem **koinók** állnak.

> „A belépő tér is követné ugyanazt a stílust meg logikát, mint a pakli nézet, annyi
> különbséggel, hogy itt a kártyákon a **koinók** (közösségek saját adatbázissal) kapnak
> helyet." — Csaba

### Rendezés

- **Nem hierarchikus** (egyelőre) — sima **lista**;
- **e-ember-szám szerint**, fentről lefelé csökkenő sorrendben.

*(A D25 létszám-rangsora ez.)*

> ### ⚠️ ELAVULT LETT (2026-08-31) — a D25 módosítása miatt
>
> Itt eredetileg ez állt: *„az emberek valódiságát a **téri mag** igazolja — tehát a rangsor
> ellenőrizhető."* **Ez már nem igaz: nincs téri mag.** Csaba 2026-08-31-én úgy döntött, hogy
> **a tanúsítások nem jönnek át koinók között** — a belépő tér csak **böngészésre** közös —,
> mert különben egy laza koino **tanúsítás-gyárrá** válhatna. Ezzel a **tartós mag
> koino-helyi** lett.
>
> **Amit ez a nézetre jelent:** egy koino létszáma **abból a koinóból** ellenőrizhető, nem a
> térből. A téren átnézve a szám **a koino állítása**, amit onnan nem lehet igazolni.
> ⚠️ **Ezt a felületnek meg kell mondania** (D19: bejelent, nem bíráskodik) — különben a
> rangsor pontosan olyan hamisítható toplistává válna, amilyet a tanúsító-rangsornál
> elvetettünk.
>
> *Tisztázandó a Szakasz 5-ben: mit mutasson a kártya a létszám mellé, hogy a szám
> súlya látszódjon.*

### Két menü-szint

| Hol | Mit tartalmaz |
|---|---|
| **A kártyán** (hamburger) | az **adott koinóhoz** tartozó opciók — **és itt kap helyet a bejelentkezés is** |
| **Az alsó sávban** | a **térre** vonatkozó opciók |

Ez tükrözi a D25 szerkezetét: a koino a saját ügyeit intézi (belépés, szabályok), a tér
pedig az, ami közös (az azonosságod, a koinók listája, új koino indítása).

---

## Ami még nyitott

- **Mit jelent pontosan a „bejelentkezés" a kártya-menüben?** A D15 szerint nincs jelszó —
  a kulcs hitelesít. Valószínűleg **belépés az adott koinóba** (csatlakozás), nem
  jelszavas bejelentkezés. *Tisztázandó.*
- **Mik legyenek az alsó sáv (tér-szintű) opciói?** Jelöltek: új koino indítása, a saját
  azonosságod és kulcsod, keresés a koinók között, a tér ujjlenyomata.
- **Mikor emeljük át a pakli-felületet?** Javaslat: a **Szakasz 2 (kapcsolat) után**,
  amikor már több e-ember és valódi közösség van — addig a modell még változhat, és a
  felületet nem érdemes kétszer megírni.

---

## Napló

- **2026-08-27** — A dokumentum létrejött. Csaba kimondta az alapelvet (a felület
  öröklődik, nem rögtönzünk), és leírta a **belépő tér nézetét** (pakli-stílus, koino-
  kártyák, létszám szerinti lista, kártya-hamburger + alsó sáv). A Szakasz 1 nézete
  ezzel egyértelműen **fejlesztői eszközzé** minősült — a lapon is ez áll rajta.
