# A törzs-határ — átvizsgálás (D120, 2026-10-29)

*Csaba ötlete a 85. mérés lelete után (a nem vállaló készülék a koino-verzió kártya teljes kódját — 6,5 MB — elhozta).
A döntés: [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) D120.*

## 1. A kérdés

Mit hozzon el egy készülék magától a TÖRZSEKBŐL (a gondolat szövege, a képei és csatolt fájljai, a koino-verzió kártya kódja),
és mit csak kérésre? A 6. szabály: az adat-csomag kicsi marad — a program egyszer jön, az adat minden nap utazik.

## 2. Ami ma megvan

- **A szöveg-darab** (D72) a hivatkozásával utazik az eseményben: `{ lenyomat, bajt }` — a mérete tehát előre ismert.
- **A képek és a csatolt fájlok** a szöveg blokkjaiban (`/api/fajl/<lenyomat>`) és az ikonban — a méretük csak a letöltéskor
  derül ki: az első szelet `teljes` mezője mondja meg.
- **A kártya kódja** (D119 ①b): a jegyzék (~29 KB) a kártya `kod` hivatkozása, a fájljait (~6,4 MB) a jegyzék sorolja fel.
- **A fájl-igény** (`fajlIgeny.js` `fajlIgenyek`) MINDEN látott entitás hiányzó fájlját kéri — vállalt-e vagy sem (a kiszolgáló
  csak a vállaltat adja ki, D84/1). Visszafogja: a fájlonkénti 2 MB (`FAJL_KORLAT`), a randevúnkénti 50 kérés, a kiszolgálási
  keret és az átmeneti fájl-tár 50 MB-os kerete (D112 ①). ⚠️ A korlát a letöltés KÖZBEN fog: a 2 MB fölötti fájlból 2 MB
  jön, aztán eldobjuk.
- **A lap** a megnyitott kártya törzsét maga is elkéri (a ház, D100: `lapHianyzoinakElkerese`, a törzs-kérelem — az
  elvárás-őrrel, D119 ①b).

## 3. Az alak (D120)

- **Az elemek:** a szöveg-darab · minden fájl (kép, csatolmány, ikon) · a kártya kód-csomagja EGY elemként (a fájljai egyenként
  kicsik — a legnagyobb, a `koino.js` 532 KB —, a fájlonkénti határ tehát nem fogná meg; a jegyzék a csomag „szövege”, az
  mindig jön).
- **A határ** (`TORZS_HATAR` = 1 MB, helyi): böngészés közben a nem vállalt entitás eleme magától csak a határ alatt jön; a
  szöveg-darab és a jegyzék mindig. A vállalt entitás (amire pontot tettem — `vallaltE`, a saját létrehozással és a vállalás
  kifutásával) és a „mindent” készülék mindent hoz; a költözés a teljes kódot.
- **A méret a fejlécen:** a hivatkozás egy harmadik mezőt kap: `{ lenyomat, bajt, torzs }` — a `torzs` a teljes törzs mérete
  (a darab + a benne hivatkozott fájlok; a kártya `kod`-jánál a jegyzék + a fájljai). A szerző számolja ki a létrehozáskor (a
  fájlok nála megvannak), és aláírja. A fejléc maga a létrehozó esemény, tehát a méret protokoll-változás nélkül utazik vele
  (+~13 B). ⚠️ Bemondás — de olcsón ellenőrizhető: a letöltő a valódi méretet az első szeletből tudja (`teljes`), és a határnál
  megáll; egy hazug szerző legfeljebb egy szeletnyit (64 KB) okozhat kárt. Ha a szerző nem ismeri valamelyik fájlja méretét,
  a `torzs` elmarad (nem tippelünk). A régi (két mezős) hivatkozás érvényes marad. ⛔ A tartó bemondása a fejléc-válaszban
  (új mező nélkül) elvetve: egy harmadik fél állítása lenne, és a kézi úton jött esemény mellett nem állna ott.
- **A letöltő** (`fajlHozatala`): ha az első szelet `teljes`-e nagyobb a fájl korlátjánál, MEGÁLL (a részlegest eldobja — a
  D114 aktív forrásai különben befejeznék), és kimondja (`tulNagy`); a készülék megjegyzi a méretét (helyi jegyzék — a lap
  ebből mutatja, a fájl-igény ebből nem kéri újra). A korlát fájlonként: a vállalt és a kért elemé a régi `FAJL_KORLAT`, a
  többié a `TORZS_HATAR`.
- **A kérés** (a „kattintás”): a kért elem (egy fájl lenyomata, vagy a kártya kód-csomagja) a helyi jegyzékbe kerül (korlátosan,
  elévüléssel); a fájl-igény onnantól határ nélkül kéri, és egy függő törzs-kérelem is indul (az őrjárat viszi a tartóhoz).
  A következő csere hozza el. Parancs (`torzs`) és a kapun egy útvonal (a lapnak).
- **A lap:** a kártyán a törzs mérete (a `torzs`-ból; ha nincs, a helyben ismert részekből); a nagy kép / csatolmány helyén a
  méret és „kattints — a következő csere elhozza”; a kártya „Kód” fülén a csomag mérete és ugyanez.

## 4. Az építési sor

① a méret a hivatkozásban (`torzs` — a darab, a művelet, a kód-csomag, a kapu) → ② a határ a letöltőnél (a `teljes`, a
fájlonkénti korlát a randevún és a törzs-kérelemben, a helyi jegyzék, a fájl-igény: a kártya kódja csak a vállalónak / a
kérőnek / a költözőnek) → ③ a kérés (parancs, kapu, függő törzs-kérelem) → ④ a lap → a próbák, a mérés (86.), a doksi.

## 5. ✅ Megépült (2026-10-29)

- **① A méret a hivatkozásban:** a szöveg-hivatkozás elhagyható harmadik mezője, a `torzs` (`szovegDarab.js`
  `szovegHivatkozasE`, `hivatkozasTorzse` — csak nagyobb a darabnál, biztonságos egész; a régi két mezős alak érvényes); a
  művelet számolja a szöveg-darab létrehozásakor (`muveletek.js` `torzsesHivatkozas` — a blokkokban hivatkozott fájlok a
  fájl-tárból, egyszer számolva; fájl nélkül és ismeretlen fájlnál elmarad — nem tippelünk; a fájl-tár `meret`-e); a kód-csomag
  hivatkozása a jegyzék + a különböző fájlok (`kodCsomag.js`); a kapu a kártya kódját a születés programjával a mérettel együtt
  veti össze. Az esemény +~13 B (csak fájlos törzsnél).
- **② A határ a letöltőnél:** `fajlIgeny.js` — `TORZS_HATAR` (1 MB; a próbák `KOINO_TORZS_HATAR`), a fájl-igény a határ mellett
  a nem vállalt elemet korláttal kéri, az ismerten nagyot nem kéri (kérhetőként adja vissza a méretével), a kártya kód-csomagját
  egy elemként kezeli (a fájljai csak a vállalónak és a kérőnek — a jegyzék mindig); a szöveg-darab mindig jön; a vállalt (pontot
  tettem rá) és a „mindent” készülék mindent hoz. A letöltő (`vonal.js` `fajlHozatala`) az első szelet `teljes`-énél megáll, ha
  az a fájl korlátja fölött van (`tulNagy`), és kimondja a `KESZ`-t; a randevú (`udpVonal.js` `fajlRandevu` `fajlKorlat`) és a
  törzs-kérelem (`torzsSzabaly` — a kérelem entitására: a korlát és a kihagyás) fájlonként; a helyi jegyzék (`fajlTar.js`
  `torzsElemTarolo`, `<koino>/torzselemek.json` — a nagyok mérete és a kért elemek, korlátosan, 30 napig).
- **③ A kérés:** `koino.js` `torzsKerhetoi` és `torzsElemKerese` (a kért elemek közé + egy függő törzs-kérelem) — a `torzs`
  parancs (a lista; `torzs <entitás> [<lenyomat>|kod]`), a kapun `GET`/`POST /api/torzs`; a kimondott `kerelem torzs` a teljes
  törzset hozza; a `fajlok` parancs a kérhetőket külön mondja.
- **④ A lap:** `felulet/js/koinoTorzs.js` (+ `css/components/koinoTorzs.css`): a kártya tudatpont-sorában a törzs mérete
  („📦 6,2 KB” — `pakli.js` `torzsMeret`), a nagy kép helyén a mérete és a kérés gombja (a betöltése elbukik → `GET /api/torzs`
  → ha kérhető, gomb), a kártya „Kód” fülén a kód elhozásának gombja; a fül minden megnyitáskor friss. Böngészőben végigjárva
  (asztali és telefon-szélesség): a gomb kér, a következő csere hozza, a kép betölt; a kód 244/337 fájlja jött (a többit a
  tartó kiszolgálási kerete — társanként óránként ~5 MB — a következő órára hagyta).
- ⛔ **A mérés lelete:** a letöltő a régi korlát-ellenőrzésnél a határ fölötti fájlt „rossz szeletnek” vette, és `KESZ` nélkül
  lépett ki — a kiszolgáló az előző kapcsolatán várt, és a következő két fájl a tétlenségi óráig hiába kért (három fájlból mind
  a három elbukott, 22 mp alatt). A megállás most az ellenőrzés ELŐTT jön, és a rossz-szelet ág is kimondja a `KESZ`-t (ez a
  láncreakció eddig is lehetséges volt, csak ritka).
- **A próbák:** `szovegDarabProba.js` (+2), `koinoVerzioProba.js` (+1), `fajlIgenyProba.js` (+2), a parancssor (+1: a nagy kép és
  a kód nem jön magától, a vállalt igen, a méret a hivatkozásban, a `torzs` lista, a kérés után a következő csere hozza).
  Rontások: a művelet méret nélkül, a hivatkozás három mező nélkül, a kód-hivatkozás méret nélkül, a kártya méretének
  összevetése nélkül, a határ nélkül, a megállás nélkül, a kód-csomag elem nélkül, a kérés nélkül, a vállalás kivétele nélkül —
  mind bukott (a „kérés nélkül” csak a modul-próbán: a parancssoron a függő törzs-kérelem a másik út).
- **A 86. mérés** (a 85. megismételve): a nem vállaló B a kártyák kódjából csak a jegyzéket hozza (29,5 KB a korábbi 6,5 MB és 9
  csere helyett); a „nincs újdonság” családi csere változatlan.
