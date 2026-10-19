# A UDP-s több forrás — átvizsgálás (2026-10-19)

> Csaba (2026-10-19): *„A terep 🅱️ … ezt hagyjuk ki. Az ipv6 miért kell? a többi mehet.”* — a tagsági lánc korlátja
> (D113) után a UDP-s több forrás (D68 / 6.), aztán a kopogás saját üteme. A D69/2-kor (2026-09-26) Csaba vállalta a
> mostani árat: *„elfogadom ezt az árat, ameddig az udp-és több forrás meg nem épűl.”*

## 1. A kérdés

A D68 (2026-09-14) Csaba ötletéből jött: ha ugyanazt a fájlt több társ is tartja, egyszerre több forrásból jöhet — és
ettől a rossz vonallal sem kell sokáig küzdeni. A 29. mérés szerint megéri, ha a forrás feltöltése a szűk keresztmetszet
(otthon tipikusan az): három forrás ×2,0 a valódi kóddal (29/b), aszimmetrikus vonalon ×1,7; ha a saját letöltésünk a
szűk, semmit nem hoz. Megépült — a TCP-n. A D69/2 óta (nincs TCP a készülékek között) egy fájl a résen, a randevún jön,
mindig egyetlen társtól. Ez a munka a UDP-n adja vissza.

## 2. Ami áll (a kódból)

- ⭐ **A fájl-hozatal szállítás-független, és tud közös munkán dolgozni:** a `vonal.js` `fajlHozatala` a kapcsolatot
  kapja (1. szabály), és ha a hívó ad egy `munka`-t (munkamegosztást), N ág ugyanannak a fájlnak különböző szeleteit
  hozza. A munkamegosztás (`fajlAtvitel.js` `ujMunkamegosztas`) munkalopó (a szabad szeletet az kéri, aki ráér), az első
  szelet sorosan jön (az mondja meg a méretet), a bukott ág szelete visszakerül a közösbe, és a lezárás joga egyszer adódik
  ki (a többi ág megvárja az eredményét). A részleges fájl szeletenként egy fájl (`reszleges/<lenyomat>/<eltolas>`).
- **A tervezők próbával, élő hívó nélkül** (a `koino.js` ki is mondja): `atvitelTerv` (fájlonként legfeljebb 3 forrás —
  `FORRASONKENT_EGY_FAJLRA` —, összesen 3 kapcsolat, társanként egy — Csaba 2026-09-13-i 3. döntése), `turelemForrasokbol`
  (D68/2: a feladás 5–30 mp a források számából — egy forrásnál kitartunk, sokkal nem), és a rossz szelet helyi tanulsága
  (`romlottJegyzes`, `valaszthatoForrasok`, `romlottFelejtes` — a 29/c, Csaba jóváhagyásával: ha a lezárás elbukik, kik
  adtak szeletet, és a következő körben mást választunk; ha nem marad más, felejtünk).
- **A mai élő út:** az őrjárat munkája egy társsal: csere → `fajlRandevu` (a társnál meglévő hiányzók, egymás után,
  legfeljebb `KERELEM_KORLAT`) → `fajlUdpResen` → `fajlHozatala` — **`munka` NÉLKÜL**: minden hívás a lemezen lévő
  szeletekből saját munkamegosztást nyit. A vonal feladási ideje a fix alap (`FELADAS_ALAP`, 30 mp) — a türelem nem a
  forrásokból jön. ⚠️ A kapu munkái **párhuzamosak** (egy kör minden célt egyszerre hív, társanként egy munka).
- **A birtoklás jegyzete** (`fajlJegyzekTarolo` — `birtoklasBeolvasztasa`: „ennél a társnál megvan ez a fájl”) a társat
  **címkével** (hoszt:port) jegyzi — a TCP-kor alakja. A UDP-n a mobil NAT portja foglalatonként más, tehát egy társ
  több címke alatt szóródik szét; a raj és a kötés a tábla-aláírót használja.

## 3. ⛔ Lelet: két egyidejű munka ugyanazt a fájlt egymástól függetlenül hozza

Ha egy hiányzó fájl két társnál is megvan, és a kör mindkettőt eléri, a két randevú **külön munkamegosztással** dolgozik:
minden szelet kétszer jön (kétszeres forgalom — és a két tartó kiszolgálási keretéből is kétszer), sebességben semmit nem
nyerünk, és a lezárásért versenyeznek. A szelet-fájl írása nem atomi (`writeFile`): az egyik ág lezárása olvashat egy
szeletet, amit a másik épp újraír — ilyenkor a lenyomat nem egyezik, a lezárás „romlott”-at mond, és **eldobja a
részleges fájlt** (egy becsületes letöltést, hamis gyanúval).

✅ **A 79. mérés** (`resSebessegMeres.js`, a (D) sor — a valódi kód a UDP-utánzaton, 512 KB, két forrás, a forrás a szűk):
közös munkával ×1,6 (4/4 szelet); közös munka NÉLKÜL — a mai élő út — mind az ötször **16 szelet a 8 helyett és ×1,0**, a
második ág négyszer bukásnak könyvelte a lezárást („hiányzó szelet” — a másik ág közben lezárta és eldobta a részleges
mappát), egyszer kivétellel szállt el (ENOENT egy szelet olvasásakor). Romlott lezárást öt futás nem hozott. A 29/b haszna
a mai kóddal is áll: a forrás a szűk ×1,6 / ×2,0 (2 / 3 forrás), a saját letöltés a szűk ×1,0, aszimmetrikus vonalon
×1,5–2,0.

⭐ A közös munkamegosztás ezt magától zárja ki: egy eltolást egyszerre egy ág kér, a lezárást egy ág végzi.

## 4. A javaslat

- **T1 — ⭐ KÖZÖS MUNKA LENYOMATONKÉNT, a folyamaton belül** (a hiba javítása és a több forrás alapja): egy jegyzék
  (`lenyomat → { munka, ágak, adók }`), amit minden fájl-hozatal megkap — a randevú, a kérelem törzse (a felderítésé is);
  az első ág nyitja (a lemez szeleteiből), az utolsó kilépő zárja; a már meglévő fájlt (amit közben egy másik ág lezárt) nem
  kéri újra. Ettől a több forrás **magától** megvan, amikor egyszerre több tartóval dolgozunk, és egy munkánál a mai
  viselkedés marad. A folyamatok közti (egy kézi `kerelem torzs` egy futó őrjárat mellett) versenyt nem zárja ki — ritka,
  és a lezárás ott is ellenőriz.
- **T2 — a források gyűjtése** (⏸️ **Csabáé**):
  - (A) passzív — csak akikkel a kör amúgy is dolgozik (a kötések, a raj-kör, a kopogtatók): a több forrás akkor jön, ha a
    tartók épp egy körbe esnek; új forgalom nincs.
  - (B) ⭐ aktív, korlátosan — ezt javaslom: ha egy hiányzó fájl több szeletes, és több tartója ismert (a jegyzetből), az
    őrjárat a körben még nem szereplő tartói közül legfeljebb kettőt a kör céljai közé vesz (fájlonként együtt legfeljebb 3
    forrás — `FORRASONKENT_EGY_FAJLRA`); a legritkább fájl előbb (`ritkasagSzerint`). Ez adja vissza, amit a TCP-kor
    tudott: ott a terv maga választotta a forrásokat. Ára: tartónként egy kopogás és egy csere (~1,3–1,7 KB „nincs
    újdonság”) — egy több szeletes fájl (≥ 128 KB) mellett elhanyagolható, és a teher a tartók között oszlik meg (a
    kiszolgálási keretük — D109 — negyedét egy társ viheti).
  - (C) csak a kérelem törzsénél (a felderítés, a lap) — ott a tartó-tipp (D111) és a raj már ad célokat.
- **T3 — a rossz szelet a UDP-n** (a 29/c, Csaba 2026-09-15-i jóváhagyása): a közös jegyzék tudja, kik adtak szeletet; ha a
  lezárás romlott, mind feljegyződnek ehhez a fájlhoz (`romlottJegyzes`), a randevú tőlük nem kéri, ha van más forrás
  (`valaszthatoForrasok`), és ha nem marad, felejt; a megjött fájl jegyzete törlődik.
- **T4 — a türelem a forrásokból** (D68/2): a fájl kapcsolatának feladási ideje a fájl ismert tartóinak számából
  (`turelemForrasokbol`) — a vonal ma is paraméterként kapja (`feladasIdo`), csak senki nem adja.
- **T5 — a jegyzet kulcsa a tábla-aláíró** (a hoszt:port helyett; a cím mellette, a kopogáshoz): enélkül a T2–T4 a mobil
  NAT-on egy társat több forrásnak számolna. A régi címkés tételek elévülnek.
- ⏸️ **Csaba 3. döntése (2026-09-13): „3 egyidejű átvitel irányonként, társanként legfeljebb egy”** — a UDP-n a társanként
  egy magától teljesül (egy társsal egy munka), az összesen 3 nem: a párhuzamos munkák mind hozhatnak. A közös jegyzék
  ezt is be tudja tartatni (egy ág csak szabad helyre indul, különben a fájl a következő körre marad).

## 5. Ami nem változik

A protokoll (a `FAJLKEREK` eddig is hordozta az eltolást, a kiszolgáló állapotmentes), a lezárás szabálya (a név maga a
bizonyíték), a kiszolgálási keret (a kiszolgáló dönt), a törzs korlátja (D84/1: csak a vállaló adja), a fájl-tár kerete
(D112 ①). Új mező a vonalon nincs.
