# Az E — az identitás a szeletelt világban: átvizsgálás a döntés előtt

*2026-10-03 · a végleges sor ⑥ lépése: az identitás a szeletelt világban, vele a zárt koinó betartatása (D89/2) és a
Profil (D28 a D88 alakjában). A G és a D mintájára: a követelmények, ami ma megvan, a 63. mérés, a nyitott kérdések
javaslattal.*

## 1. Mit kell tudnia — a követelmények (a meglévő döntésekből)

1. **A két lépcső (D56–D63):** a tagság egy meghívóval (1. lépcső), a pénztárca három tanúsítással felhatalmazott
   tanúsítóktól (2. lépcső, D11); a felhatalmazás visszavonható és csak előre hat (D47), a tanúsítás állítás a múltról
   (D46), a horgony és a buli-elismerés a rést zárja (D61).
2. **Számítás, nem nyilvántartás (D17):** ki tag, az az eseményekből következik — nincs központi névsor.
3. **A hiány nem vád (D19):** P2P-n a „nem tag” és a „még nem láttam a bizonyítékát” ugyanaz — a koinónak erre szava
   van (`nemEllenorizhetok`).
4. **A „végtelen” (9. szabály):** egy készülék terhe ne a koinó méretétől függjön; ahol elkerülhetetlen (az
   identitás-ellenőrzés), **legfeljebb logaritmikusan** nőjön.
5. **A zárt koinó (D89/2):** a tartalmat a készülék csak tagnak adja ki — a társ a kézfogásban bizonyítja a tagságát
   (a személyes kulcsával aláír, és megmutatja a meghívási láncát).
6. **A Profil (D28, D88):** a koinó megmondja, milyen adatokat vár el (pl. teljes név, település); a `Profil` esemény
   csak a sózott lenyomatot hordozza, a darab (név, település, só) a fájl-tárban él, és törölhető; a meghívó
   tanúsítása a névre is kiterjed (D28/2).
7. **A szeletelt világ (B, D86):** a tartós tár a vállalt szeletek + a SAJÁT azonosság-szelet — mások
   azonosság-szeletét (és a meghívási láncuk eseményeit) általában nem tartjuk.

## 2. Ami ma megvan — és ahol elakad

Az `identitas.js` a három kérdést (tag-e, tanúsíthat-e, 2. lépcsős-e) a TÁRBÓL számolja: a horgony (a `Belepes`)
szeletéből a meghívást, abból a meghívó horgonyát (`sajatBelepes`), és így tovább az alapítóig — gyorsítótárral
logaritmikus (D59). ⛔ **Ahol elakad:** a szeletelt világban a lánc eseményei nincsenek meg → „nem ellenőrizhető”.
⛔⛔ **És egy nyitott rés, ami nem a szeletelésből jön:** a **szabály-réteg nem kérdez tagságot** (régóta nyitott
döntés, 2026-09-12). Bárki, aki ismeri a koinó azonosítóját, kulcsot generálhat, pontot tehet és szavazhat — a
tudatpont-keret kulcsonként él, a kulcs pedig ingyen van. A zárt koinó mezője megvan, de nem tilt (D89/2: „a
betartatás az E-vel jön”). A kontraszt-jelzés (`jelzesek.js`) szintén a tárból számol.

## 3. A 63. mérés — a tagsági lánc

*`meres/tagsagMeres.js`: a koinó meghívással nő; három növekedési mód (véletlen hívó · aktív hívók · mindig a
legutóbb belépettek hívnak); egy lépés a bizonyítékban a tag `Belepes`-e + a `Meghivas` (valódi aláírt események, a
lánc-gyökérrel): **1237 B**. A teljes jegyzőkönyv: [`eredmenyek.md`](../koino/meres/eredmenyek.md) 63.*

⭐ **Természetes növekedésnél a lánc logaritmikus:** egymillió tagnál átlagosan 13 lépés (95%: 19), a bizonyíték
~16 KB (95%: 23 KB); aktív hívókkal 8 lépés, ~10 KB. A gyorsítótárral (a közös ősöket egyszer nézzük meg) tagonként
átlagosan **3–7 lépés** kell. ⛔ **A rossz eset:** ha mindig a legutóbb belépettek hívnak (lánc-szerű növekedés — egy
támadó szándékosan is előállíthatja), a mélység LINEÁRIS: egymillió tagnál ~47 600 lépés, ~57 MB — ez sérti a
„végtelent”. ⭐ **A válasz a meglévő szabályokban van:** egy tagnak több meghívása is lehet, és a legrövidebb lánc
számít (a meghívás ingyenes); a D59 mélység-korlátja (`D`, „elhagyható biztonsági szelep”) pedig kimondja: aki ennél
mélyebben van, az „nem ellenőrizhető”, amíg egy közelebbi tagtól nem kap meghívást. Így a bizonyíték felülről
korlátos (D × 1,24 KB), és a becsületes, mély tag egyetlen ingyenes meghívással rövidít.

## 4. A nyitott kérdések — javaslattal

**E1. Kérdezzen-e a szabály-réteg tagságot?** ⛔ Ma nem — és ez Sybil-rés: a kulcs ingyen van. ⭐ Javaslat: **igen —
a döntésben (pont, javaslat, szavazat) csak az ellenőrzött tag számít**; a nem ellenőrizhető szerző eseménye nem
számít bele, de nem is tűnik el: a kivételek közt kimondjuk (`nemEllenorizhetok`, D19), és amint a bizonyíték
megérkezik, számít. ⚠️ A következménye: a döntési csomagnak (D85 T3) a résztvevők tagsági bizonyítékát is hoznia kell
(vagy a tartónál már ismertnek kell lennie) — ez a csomag méretét növeli (~16 KB résztvevőnként, a gyorsítótárral
kevesebb); mérni kell.

**E2. A tagsági bizonyíték formája.** ⭐ Javaslat — (A) **TAGSÁGI CSOMAG a saját azonosság-szeletben**: amikor valaki
taggá válik (megkapta a meghívást), egy aláírt csomagot tesz a saját azonosság-szeletébe a lánca eseményeinek
másolatával az alapítóig (a D85 T3 döntési csomag mintája: a kapu ellenőrzi, a számítás a bemenetébe bontja). Aki az
azonosság-szeletét elkéri (egy szelet-kérelem — D), megkapja vele a teljes bizonyítékot; az ellenőrzött tagokat a
készülék megjegyzi. A mélység-korlát (`D`, javaslat: 64) a „végtelent” őrzi, és egy rövidebb láncú meghívás után új
csomag (rövidebb) váltja a régit. *(Elvetendő jelöltek: (B) egy koinó-szintű tagsági gyökér — a tartós maggal és a
pénzzel együtt jön, D66; (C) ősönként külön kérelem — sok kör, a NAT mögött lassú.)*

**E3. A zárt koinó a kézfogásban.** ⭐ Javaslat: zárt koinóban a csere `CIMEK`-jében a társ (a tábla-kulcs aláírása
mellett) a SZEMÉLYES kulcsával is aláírja a kézfogás átiratát, és megnevezi a horgonyát (a `Belepes`-ét); ha a tagsága
nálunk még nem ellenőrzött, az első üzenetváltásban a tagsági csomagját is elküldi. Aki nem tag (vagy nem
ellenőrizhető), annak a zárt koinóból csak ennyi jár: a koinó születése és a SAJÁT azonosság-szelete (különben a
frissen meghívott soha nem jutna hozzá a meghívásához). Nyílt koinóban nincs ilyen kapu. ⚠️ A kopogtatás és a DHT
témái már vakítottak (D91, D92).

**E4. A 2. lépcső bizonyítéka.** A 2. lépcső (a pénztárca) bizonyítéka nagyobb (a tanúsítók felhatalmazásai, a
mérésben 17–40 ős). ⭐ Javaslat: **ugyanaz a csomag-forma**, a tanúsítások és a felhatalmazások láncával — de csak
akkor kerül a csomagba, ha valaki 2. lépcsős; előbb a mérés (a csomag mérete a 12. mérés modelljén). *(Alternatíva: a
pénzzel együtt — D66 —, mert ma a 2. lépcsőnek a felhatalmazási küszöbön kívül nincs fogyasztója.)*

**E5. A Profil.** ⭐ Javaslat: a koinó a létrehozásakor megmondja a kötelező mezőit (`KoinoLetrehozas.profil`, pl.
`['nev', 'telepules']`; üres = nincs); a `Profil` esemény az azonosság-szeletben a darab sózott lenyomatát hordozza
(D88), a darab a fájl-tárban; ⭐ **a meghívás megnevezi a profil lenyomatát** (a meghívó ezzel tanúsítja a nevet —
D28/2); ahol a koinó mezőket vár el, ott a meghívás csak profil-lenyomattal érvényes. A törlés: a darabot senki nem
szolgálja ki tovább (D88/2), a lenyomat marad.

**E6. A kontraszt-jelzés a szeletelt világban.** A jelzés („hány olyan embert tanúsítottál, akinek nincs önálló
élete?”) a tanúsított emberek tevékenységét kívánja — az az ő szeleteikben van. ⭐ Javaslat: a jelzést az számolja,
aki a tanúsító felhatalmazásáról dönt (a felhatalmazók), a tanúsítottak azonosság-szeletéből és a láncuk összegzéséből
(az A pillér: a lánc-gyökér darabszáma mutatja, van-e önálló élete) — kérésre, gyorsítótárral; a jelzés nem dönt
(D46), tehát a hiánya nem vád. Ez a B/3 után válik élessé; az E-ben a számítás bemenete készül el.

## 5. A mérések

- ✅ **63.** a tagsági lánc mélysége és mérete — fent.
- ✅ **64.** a zárt koinó kapuja a dróton (E3): az ismert társnál +0 B, az első találkozáskor +0,5 KB, csomaggal ~1,1 KB
  lépésenként (`eredmenyek.md` 64.).
- ✅ **65.** a 2. lépcső bizonyítéka (E4): a teljes zárvány közel lineáris — lent, 6.
- ⏭️ **66.** a tagsági láncok a döntési csomagban (az E1 ára).

## 6. ⭐ Az E4 a 65. mérés után — a D93/4 így nem tartható (2026-10-04)

A D93/4 („ugyanaz a csomag-forma, a tanúsítások és a felhatalmazások láncával”) a mérés előtti feltevésen állt, hogy a
2. lépcső bizonyítéka a tagsági lánchoz hasonlóan kicsi (az átvizsgálás 17–40 őst említett). ⛔ **A 65. mérés szerint
nem az:** a tagság lánca egy szülős (a legrövidebb választható), a 2. lépcső viszont minden lépcsőn 3 tanúsítást és
tanúsítónként N felhatalmazást kíván — a teljes bizonyíték az ős-háló zárványa, és ez közel LINEÁRISAN nő (egymillió
2. lépcsősnél ~59 000 ember, ~290 MB; lánc-szerű növekedésnél a 2. lépcsősök 45%-a). Ez a „végtelen” elvét sérti.

**A lehetőségek:**

- **(A) ⭐ Szúrópróba — a javaslatom.** A 2. lépcső igazolása két részből áll: a HELYI rész teljesen (X 3 tanúsítása, a
  tanúsítók bemondott N felhatalmazása — mind aláírva, különböző emberektől; ~37 esemény), és k = 8 VÉLETLEN ÚT az alapító
  körig: minden lépésen az aktuális ember egy véletlen tanúsítója, és annak egy véletlen kötelezettsége (a saját 2.
  lépcsője vagy egy felhatalmazója). Az utakat az ELLENŐRZŐ választja, és a lépések eseményeit az azonosság-szeletekből
  kéri (a D kérelmével) — ⚠️ nem a bizonyító számolja ki előre: egy előre rögzített utat addig sorsolhatna, amíg el nem
  kerüli a zsákutcákat (egy hamis ág ~1/3 eséllyel esik útba, 8 útnál ~25 próbálkozás elég volna). Ár: egymillió 2.
  lépcsősnél ~0,9–2,2 MB (lépésenként 2N + 6 esemény — a javított modell; az első kiírás ~0,4–0,9 MB-ot mondott),
  személyenként egyszer (a már igazolt 2. lépcsősök gyorsítótárban), **logaritmikus**. A biztonság:
  a teljesen hamis szerkezet mindig elbukik (nem ér el a gyökérig); a részben hamis (valódi tanúsítók + egy gyűrű) 8
  úttal ~96%-kal; a maradékot a kontraszt-jelzés és a visszacsatolás fogja — a D56 szerkezete: *a védelem nem a kapu,
  hanem hogy a rossz tanúsító elveszíti a szerepét*. Ugyanaz a minta, mint az össz-pont szúrópróbája (D92/5).
- **(B) Halasztás a pénzig (D66).** Ma a 2. lépcsőnek a tanúsítási jogon kívül nincs fogyasztója a döntésben; a forma a
  tartós maggal együtt dőlne el (pl. egy aláírt, koinó-szintű lépcső-gyökér, logaritmikus bizonyítékkal). Addig a
  `lepcso2E` a meglévő tárból számol, és ami hiányzik, az „nem ellenőrizhető” (D19). ⚠️ Az alappillér elve ellen szól:
  a tanúsítási jog (és a pénz) erre épül.
- **(C) A teljes zárvány** (a D93/4 eredeti alakja) — a mérés elveti.
- **(D) Korlátozott mélység szúrópróba nélkül** — konstans, de D = 1-nél a mélyebb szint bemondása egy kulcs-gyűrűvel
  ingyen hamisítható, D = 2–3 pedig 0,6–8 MB.

✅ **ELDŐLT — D94 (Csaba, 2026-10-04: „Az (A)-t választom.”):** a szúrópróba. ✅ **Megépült**, és vele az E6 is — az E pillér
kész (a fázis-2 terv D93 „MEGÉPÜLT” és D94).
