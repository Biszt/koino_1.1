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
- ⏭️ **64.** a tagsági csomag a döntési csomagban (E1 ára) és a 2. lépcső csomagja (E4) — a döntés után.
