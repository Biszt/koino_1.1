# Jegyzetek — a zárójeles üzenetek naplója

Ebbe a fájlba kerül **szó szerint** minden olyan üzeneted, amit zárójelben írsz
(`[ ... ]` vagy `{ ... }`) — a munka közben felmerülő ötletek, kérések, amiket
NEM akarunk azonnal megcsinálni, de elveszíteni sem.

## Hogyan működik

- Amikor zárójeles jegyzetet írsz, **felveszem ide** (dátummal, szó szerint),
  röviden visszaigazolom, és **folytatjuk az aktuális feladatot**.
- A jegyzet nem azonnal elvégzendő feladat — csak feljegyzés a jövőre.
- Ha egy jegyzet a folyó munkát közvetlenül érinti, előbb rákérdezek.
- Ha egy jegyzetből valódi feladat lesz, átvezetjük a
  [fejlesztesi_terv.md](fejlesztesi_terv.md)-be, és itt lezárjuk (✅).

## Állapotjelek

- 🆕 új, még feldolgozatlan
- ✅ átvezetve a fejlesztési tervbe vagy elvégezve
- 💤 elvetve

---

## Napló

<!-- Az új jegyzetek FELÜLRE kerülnek. Formátum:

### ÉÉÉÉ-HH-NN
- 🆕 a jegyzet szövege szó szerint

-->

### 2026-07-10

- ✅ „[javaslat, létrhozásakkor, ne legyen, minimum karakter követelmény, sőt
  nem is, kell, hogy kötelező legyen, az indoklás.]"
  → **Elvégezve (2026-07-10):** az indoklás opcionális lett. Eltávolítva a
  kötelezőség a frontend `JavaslatModal._validalas`-ból (≥10 karakter),
  a `javaslatService`-ből (throw), a `javaslat` modellből (`required:false` +
  pre-hook check törölve); a template `*` helyett „(opcionális)".

- ✅ „[szavazáskór a szavazat leadása, a servernek, ne a gombok
  megnyomásakkór, hanem a szavazási, modal rendben, gombjára kattíntva,
  tőrtényen meg.]"
  → **Elvégezve (2026-07-10):** a `SzavazatModal` halasztott véglegesítésű lett.
  A típus-gombok és a „Visszavonás" már CSAK helyben választanak
  (`kivalasztottTipus`); a tényleges szerverhívás (POST/DELETE) a „Rendben"
  gombra fut (`_megerosites`), a kiválasztás és az eredeti szavazat
  összevetésével, sikeres mentés után zárva. Bezárás mentés nélkül = nincs
  változás. Frontend-only.

- ✅ „[A szerkesztőben, link létrehozásakkor, a link blokk, nem tartja a
  szerkesztőben megadott méretét, a kártya body-jában. mindig nagyobb lessz a
  magassága]"
  → **Elvégezve (2026-07-10):** flexbox-csapda. A megjelenítő fő konténere
  `display: flex`, így a blokk-wrapperek flex-elemek, és a default
  `min-height: auto` felfújta a beállított magasságot a tartalom min-content
  méretére. Javítás: `szovegMezoMegjelenito.css`-ben a `.link-blokk-wrapper` és
  `.fajl-blokk-wrapper` `min-height: 0`. Frontend-only.

- ✅ „[a tátható/láthatatlan/takart státusz, teljes egészben, törőlhető, a
  tartalom létrhozása modalból is.]"
  → **Elvégezve (2026-07-10):** a tartalom `statusz` mezője (Lathato/Lathatatlan/
  Takart) teljesen eltávolítva. Backend: `tartalom` modell (mező + 2 index),
  `tartalomService` (create/update validáció, `tartalomLekerese` és
  `tartalomListazasa` láthatóság-szűrése – most minden tartalom látható),
  `tartalomRepository` (`findAll` + `findBySzuloId` szűrés/param), `tartalomController`
  (query-param), `tools/teszt.js`. Frontend: `tartalomModal.html` (legördülő),
  `TartalomModal.js` (kiolvasás/kitöltés), `JavaslatModal.js` (egyesítés
  `statusz:'Lathato'`). A **javaslat** statusz-a (Aktiv/…) érintetlen.

- 🆕 „[fejlécnek, mutatnia kéne majd az eember, saját tudatpontját is, az
  entitáson, ha van neki rajta]"
  → Kontextus: a pakli e-ember-tudatossá tétele kapcsán merült fel (a pakli
  ismerje a néző e-ember azonosítóját). Ez a fejléc-jelzés ennek egy későbbi
  felhasználása. Egyelőre feljegyezve, nem valósítjuk meg most.

### 2026-07-08 (visszavezetve az előző sessionből)

- ✅ „A jogosultságokat, már a menüben is jeleznünk kéne, úgy hogy lesznek
  menüpontok, amik csak akkor opciók a felhasználó számára, ha tudatpontjuk van
  az entitáson. (ha nem függ össze a mostani fejlesztéssel, akkor csak a
  fejlesztési tervbe rakjuk)"
  → **Átvezetve:** [fejlesztesi_terv.md](fejlesztesi_terv.md), a fejlesztési
  sorrend 10. pontja („Jogosultság-függő menüpontok").

- ✅ „Ami a modalok, és a menük stílusát illeti, az irányadók, a pl.
  tartalom(entitás) létrehozása modal, menübe, meg a fő menü, és a kártyák
  hamburger menüi. A javaslat típusok menüje, már eltér ettől, és a modaljai is."
  → **Átvezetve:** [fejlesztesi_terv.md](fejlesztesi_terv.md), a „Stílus-irányelvek"
  szakasz.
