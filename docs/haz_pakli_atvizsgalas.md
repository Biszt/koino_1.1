# A HÁZ ÁTVIZSGÁLÁSA — a pakli-nézet a felületen, a kérelemből (2026-10-10)

*Az alappillérek után (a VÉGLEGES SOR ①–⑧ kész, terepen kipróbálva — 72–73. mérés) az első „ház”: a felület pakli-nézete.
Csaba: „legyen a ház”. Ez a lap összegyűjti, mi van ma, mit tudott a prototípus, mit ad hozzá a kérelem (D92), és melyik
kérdés Csabáé.*

## 1. Ami ma van

- **A felület** (Szakasz 5, 2026-09-06–13): a helyi kapu (`felulet` parancs, 127.0.0.1, jelszóval), a kérdezhető pakli
  (`/api/pakli` — `js/allapot/pakli.js`: rendezés + kurzor + darab, a 9. szabály szerint egy oldalnyi kártya), az örökölt
  kártyák, a modálok magja, a belépő tér, a szövegszerkesztő, a fájl-réteg. ⚠️ A lap pakli-nézete (`felulet/js/pakliNezet.js`)
  **ideiglenes lista** — a fejléce maga mondja: *„amikor a `Pakli.js` is átjön, ez a fájl eltűnik”*.
- **A szigorú (b) óta** (D97) egy készülék csak a vállalt szeleteit tartja, a többiről a születéseket (a szülő vagy a
  gyökér-darab bejelentéseként), és amit a kérelem hozott (az átmeneti tárba). A pakli ma a helyi állapotból számol, és a
  nem tartott entitásoknál a bemondott össz-pontot használja (`osszpontok.json`, D92/5) — de **semmi nem kéri el**, ami
  hiányzik: a felület csak azt mutatja, ami véletlenül már megvan.
- **A kérelem** (D92, ⑤): a nézet-független alapkérdések — *fejlécek* (X gyerekei össz-pont szerint, legfeljebb 50, a legjobb
  ág legfeljebb 4 szintig, mintákkal ellenőrizve), *szelet*, *törzs* — közvetlenül (`kerelem … <cím>`) vagy FÜGGŐ
  kérelemként (cím nélkül: a G adja a tartókat, a kopogtató témákon jelentkezünk, az őrjárat a következő körben kéri; a
  válasz az átmeneti tárba megy).

## 2. A prototípus pakli-nézete — „láncos-testvéres”

A prototípus `Pakli.js`-e (59 KB) és a `pakliService.js`: egy KIVÁLASZTOTT entitás köré épül —
- **felmenők**: a szülő-lánc a gyökérig (a kártyák fölötte);
- **leszármazottak — a „bogárlogika”**: a kiválasztottól lefelé mindig a LEGERŐSEBB gyerek (a kártyák alatta);
- **testvérek**: a kiválasztott testvérei (a `‹ N / N ›` kacsacsőrök, oldalra lépegetés — `TestverJelzo.js`,
  `testverRendezes.js`);
- és egy külön, lapos **„Rendezés” nézet** (`/api/pakli/rendezett`: idő / saját pont / ágazati pont szerint).

⭐ **A kérelem épp erre készült (D92/6):** a *fejlécek(X, n, d)* a kiválasztott gyerekeit adja össz-pont szerint (a testvér-
sor és a bogár első lépése), a legjobb ágat d szintig (a bogár), a *fejlécek(szülő)* a kiválasztott testvéreit, és a
felmenők a szülő-mutatókon át lépésenként kérdezhetők. A prototípus 100-as testvér-korlátja helyett a kérelemé (50) — ⭐
egy oldalnyi, nem az egész (9. szabály).

## 3. Ami hiányzik

1. **A hierarchikus pakli-lekérdezés** a helyi tudásból: felmenők (a szülő-láncon), a kiválasztott, a bogár (az
   össz-pont szerint, `osszPont.js` — egy forrás), a testvérek (korlátosan) — kártyánként megjelölve, honnan tudjuk
   (tartom · csak láttam · bemondott össz-pont · ellenőrzött · hiányzik).
2. **A hiányzó rész elkérése**: ha a kiválasztott gyerekeiről vagy a testvéreiről nincs (friss) fejléc, egy függő kérelem
   (`fejlecek`), és ha a megnyitott kártya szövege hiányzik, `torzs` — az őrjárat hozza, a lap újrakérdez.
3. **Az örökölt `Pakli.js`** (és a `TestverJelzo`, a `testverRendezes`) átvétele a felületre — a mai ideiglenes lista helyett.
4. **Próbák**: a lekérdezés modul-próbái (szigorú (b) alatt is: ami nincs meg, azt kéri, és ami megjön, az látszik), és a
   bekötés parancssor-próbája (két készülék: az egyik „alap”, a lapon kért kártyák a másikból jönnek).

## 4. A kérdések — javaslattal (D-szintűek, Csabáéi)

**H1. Ki kérdez a hálózaton, amikor a lapon valami hiányzik?**

- **(A) ⭐ Az őrjárat, függő kérelemként — ezt javaslom.** A felület (a lap kiszolgálója) csak beírja a függő kérelmet
  (ugyanaz a `kerelmek.json`, amit a `kerelem` parancs használ), az őrjárat a következő körében elhozza (a G-ből tudja,
  kitől; kopogtatással a NAT mögül is), a válasz az átmeneti tárba megy, és a lap pár másodpercenként újrakérdez
  („betöltés…” jelzéssel). A felület így nem nyit hálózatot (egy kapu van — az őrjáraté), és a válasz akár percek múlva is
  jöhet (D76: a folytonosság élménye nem fontos).
- **(B) A felület maga kérdez** (saját kapuval) — gyorsabb, de két folyamat nyúlna a hálózathoz (port-ütközés), és a
  felület akkor is hálózatozna, ha az őrjárat nem fut.
- **(C) Nem kérdez senki** — a lap csak a helyi tudást mutatja (a szigorú (b) alatt egy új koinóban szinte semmit).

**H2. Mit mutasson a lap a nem tartott ágak össz-pontjáról?**

- **(A) ⭐ A számot, megjelölve, honnan jön — ezt javaslom:** „ellenőrizve” (a közvetlen fejléc-kérelem mintákkal
  ellenőrzött össz-pontja, D92/5) · „bemondás” (a továbbadott kérelemé — elágazás 56) · „pontjai ismeretlenek” (csak a
  születését láttuk). A rendezés a legjobb ismert szám szerint megy, a jelölés kimondja, mennyire bízhatunk benne (D19).
- **(B) Csak az ellenőrzöttet** — a bemondott ágak rendezetlenül a végére kerülnek.

**H3. Az örökölt `Pakli.js`.**

- **(A) ⭐ Átjön a prototípusból változatlanul (a `TestverJelzo` és a `testverRendezes` is), és a helyi kapu az ő
  kérés-alakját beszéli** — mint eddig a kártyáknál és a modáloknál (a felület-terv alapelve: *„a felület öröklődik, nem
  rögtönzünk újat”*). A mai ideiglenes lista eltűnik; a lapos nézet a prototípus „Rendezés” nézete lesz (`/api/pakli/rendezett`).
- **(B) A mai ideiglenes lista bővül** hierarchiával — kevesebb munka, de rögtönzés.

## 5. A javasolt építési sorrend (a döntések után)

① **A hierarchikus lekérdezés** a helyi tudásból (`pakli.js` bővítése: felmenők, bogár, testvérek, a jelölések), modul-
próbákkal → ② **a hiányzó rész elkérése** (a függő kérelem a lekérdezésből; a „betöltés” jelzés; a törzs a megnyitott
kártyára) → ③ **az örökölt `Pakli.js`** a felületen (a kapu a prototípus alakját beszéli: `/api/pakli?entitasId=`,
`/api/pakli/rendezett`) → ④ **a bekötés próbája** (két készülék, „alap” mód: a lap kártyái a másik készülékről jönnek).
