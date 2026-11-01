# A meghívás a lapon — átvizsgálás (2026-11-01)

*Csaba kérése a ⑦ terepi próba közben: „ha ez működik, akkor utána, beszéljük át, hogy hogyan lehetne felhasználó barátabb, a
meghívási folyamat, pl. hogy ne keljen hozzá termuxot használni.” — a D30 marad, a Termux marad (Csaba: „a d30-as szabályt ne
rugjuk fel. maradjon a termux.”), és a telefonra a program egy bemásolt sorral kerül (elágazás 224). Ami a Termuxból még
megmaradt, az a belépés és a meghívás — ez az átvizsgálás arról szól, hogyan kerül a lapra.*

---

## 1. Ma — hat lépés, két hosszú szöveg oda-vissza

A terepi próbán (2026-11-01) így lett a telefonból tag:

1. a telefonra a program (ma már egy sor — 224.);
2. a koinó 43 jeles NEVE valahogy átjut (üzenetben), és a telefon a lapján csatlakozik („🔗 Csatlakozás egy koinóhoz…”);
3. a telefon a lapján felveszi a meghívó címét társnak („🤝 Társak…” — IP + port, kézzel);
4. a telefon a PARANCSSORBAN belép (`koino belep`), és kiírja a 43 jeles HORGONYÁT;
5. a horgony visszajut a meghívóhoz (üzenetben);
6. a meghívó a PARANCSSORBAN meghívja (`koino meghiv <horgony>`); a meghívás a következő cserével a telefonra ér.

**Amit a kód ma tud, és amire építeni lehet:**
- A belépés (`Belepes`) egy esemény a belépő saját azonosság-szeletében; a zárt koinó kapuja (D93/3) a nem tagtól is átveszi a
  SAJÁT azonosság-szeletét, és neki a koinó születését adja — ezért a belépés a meghívás ELŐTT átér a meghívóhoz (a terepen
  mérve: a telefon belépése a cserével a laptopra ért, utána ment a `meghiv`).
- A meghívás (`allitokRola`) a meghívott szeletébe kerül, és a meghívó horgonyát hozza; a parancs a belépést a tárból veszi
  (`allitasAdatai`), és ha a koinó profilt vár (D93/5), a meghívott legutóbbi profiljának lenyomatát is (`meghivottProfilja`).
- A csatlakozás (`koinoCsatlakozas`) és a társ felvétele (`tarsFelvetele`) már a lapon van (⑥); a belépés és a meghívás nincs.
- A kopogtatás (D92/1): aki egy készülékhez akar szólni, de a NAT miatt nem éri el, a készülék kopogtató témáján jelentkezik a
  DHT-n (a tábla-aláírójából számolva), és a készülék őrjárata visszakopog — ma a függő kérelmek útja.

## 2. A cél

**Két ember, két gomb, egy összevetett kód.** A meghívó a lapján „Meghívás”-t nyom, és kap egy szöveget; a belépő ezt beilleszti
a lapján — a többi magától megy; a meghívó lapján megjelenik, hogy valaki vár, egy rövid ellenőrző kóddal, ugyanaz a kód a
belépő lapján is; ha egyezik (élőben, telefonon összemondják), a meghívó egy gombbal meghívja.

## 3. A javasolt menet

**(a) A meghívó (a MEGHÍVÓ SZÖVEGE).** Egy sor, pl. `koino-meghivo:1:<base64url>`, benne: a koinó neve · a meghívó készülékének
címei (a helyi hálózaton, és a nyilvános, ha a készülék tudja) a kapu portjával · a meghívó készülékének tábla-aláírója (a
kopogtatáshoz és ahhoz, hogy a belépő tudja, KIT keres — D71) · egy megnevezés („Csaba laptopja” — kényelem, nem ellenőrzött).
Titok nincs benne: a koinó neve nem jogosít semmire (a zárt koinó tartalmát a tagság védi), a címek a cserében úgyis utaznak.
Becsült hossza ~200 jel — üzenetben, papíron is átvihető (4. szabály: a kézi út maga a szöveg).

**(b) A belépő oldala.** A lap „🔗 Csatlakozás” ablaka a meghívó szöveget is elfogadja (a puszta név mellett). Beillesztés után a
program: csatlakozik (a felület becenevével, ha szabad — mint ma), felveszi a meghívó címeit társnak, és **belép** (a `Belepes` —
ugyanaz a függvény, mint a `belep` parancsé). Ha a koinó profilt vár (D93/5 — ezt a születés mondja meg, ami az első cserével
jön), a lap egy űrlapot mutat a mezőkkel, és a profilt is ő teszi (`profilMegadasa`). A lap ezután kiírja: „Várakozás a
meghívásra — a meghívód ezt a kódot látja: **4F7-KQ2**”.

**(c) A jelentkezés.** Ugyanazon a wifin a helyi cím elég (a terepen mérve: a laptop az ismeretlen bekopogóval is cserélt). Két
külön hálózat között a belépő a meghívó készülékének kopogtató témáján jelentkezik a DHT-n (a meghívóban ott a tábla-aláíró), a
meghívó őrjárata visszakopog, a rés megnyílik, és az első csere a belépést a meghívóhoz viszi — a D92/1 meglévő útja (a
belépő egy függő kérelmet vesz fel a koinó születésére, a meghívó készülékének kopogtatójával). ⚠️ A két mobilnet közötti rés
mérése (a terep 🅱️) még nincs meg — ugyanazon a wifin és PC–mobil között mérve működik.

**(d) A meghívó oldala.** A fő menüben „👋 Belépők”: a még meg nem hívott belépések, amelyeket a készülék ismer (a legfrissebb
elöl), mindegyiknél az ellenőrző kód, a profil (ha a koinó vár), mikor jött; és egy „Meghívom” gomb (ugyanaz a függvény, mint a
`meghiv` parancsé). Új belépő érkezésekor a készülék saját értesítése (D103): „Új belépő vár a koinóban — kód: 4F7-KQ2”.

**(e) A tagság.** A meghívás a következő cserével a belépőhöz ér; a lapja kimondja: „✅ Tag vagy”. A gyermekbe a tagság a
költözéssel jön (D118/3) — a meghívás a gyökér-koinóé (vagy annak a koinónak, ahová a meghívó szól).

**Az ellenőrző kód:** a belépés horgonyának lenyomatából 6 jel (könnyen kimondható ábécéből, két hármas csoportban). Mire
véd: ha a meghívó szöveg idegenhez is eljut (továbbküldik, ellopják), az idegen is beléphet és várhat — de az ő kódja más, és a
meghívó csak azt hívja meg, akinek a kódját a belépő élőben bemondta. Az idegen nem tudja előre a valódi belépő kódját, tehát nem
tud rá hangolni. ⭐ A védelem itt is az ember, nem a kapu — a D56 szerint az 1. lépcső olcsó, a kár a figyelmes meghívón múlik.

## 4. ⏸️ Döntési pontok — Csabánál

- **MH1 — a meghívó formája.** (A) ⭐ egy bemásolható szöveg (bármilyen csatornán, papíron is); a QR-kód később, külön lépésben ·
  (B) QR-kód is most (saját kódolóval — 0 függőség —; a beolvasás a böngészőben nem biztos: a kódolvasó csak a Chromium-alapú
  böngészőkben van, és a 7. szabály szerint a böngészőre nem építhetünk).
- **MH2 — egyszer használható jel a meghívóban.** (A) ⭐ nincs: a védelem az ellenőrző kód, a meghívó szöveg nem titok · (B) a
  meghívó egy véletlen jelet hordoz, amit a belépés eseménye megnevez (új eseménymező — utazó bájt, 6. szabály), és a meghívó
  lapja csak a saját meghívóival jött belépőket mutatja — nagy koinóban kevesebb zaj, de az ellen nem véd, akihez a szöveg
  eljut.
- **MH3 — az ellenőrző kód.** (A) ⭐ 6 jel a horgonyból, mindkét lapon; a meghívó az összevetés után nyom gombot · (B) nincs kód —
  az első jelentkező (megtéveszthető).
- **MH4 — a belépő oldala.** (A) ⭐ a beillesztés után minden magától (csatlakozás, társ, belépés; profil-űrlap, ha a koinó vár)
  · (B) lépésenként külön gombok.
- **MH5 — a meghívó oldala.** (A) ⭐ „👋 Belépők” ablak a fő menüben, ÉS a készülék értesítése az új belépőről (D103) · (B) csak
  az ablak.
- **MH6 — két külön hálózat.** (A) ⭐ a belépő a meghívó készülékének kopogtató témáján jelentkezik (a D92/1 útja); ugyanazon a
  wifin a helyi cím · (B) csak ugyanazon a hálózaton (a távoli meghívás marad kézi).

## 5. Ami nem változik

- A parancsok maradnak (`csatlakoz`, `tars`, `belep`, `profil`, `meghiv`) — a lap ugyanazokat a függvényeket hívja (mint a ⑥
  óta a csatlakozás és a társ); a kézi út (4. szabály) maga a meghívó szöveg, és a `kivisz`/`behoz`.
- A kapu és a tagság szabályai (D56, D93): a meghívás ugyanaz az aláírt esemény; a lap csak kényelem — amit a számítás nem
  ellenőriz, az illemtan.
- A meghívó-szám 1 marad (Csaba: „igen, maradjon 1 egyenlőre”).

## 6. Az építés sorrendje (a döntések után)

① a meghívó szöveg alakja és olvasása (tiszta modul — a kapu-szerű ellenőrzéssel: alak, hossz, címek) és az ellenőrző kód ·
② a belépő útja (a csatlakozás a meghívóval: társ + belépés + a profil-űrlap) · ③ a jelentkezés (ugyanazon a wifin, és — MH6
szerint — a kopogtatás) · ④ a meghívó oldala (a belépők jegyzéke, a meghívás a lapról, az értesítés) · ⑤ a lap (a „Meghívás…”,
a „Belépők”, a csatlakozás ablaka) · ⑥ parancssor-próba két készülékkel (viselkedés: a belépő lemezén a meghívás), böngészőben
végigjárva, és terepen: egy friss e-ember a telefonon, egy bemásolt sorral és egy meghívóval.
