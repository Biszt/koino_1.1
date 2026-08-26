# Szakasz 1 — A HELYI KOINO (részletes terv)

*Készült: 2026. 08. 26. — a [Fázis 2 terv](fejlesztesi_terv_fazis2.md) lépés-sorrendjének
**1. szakasza**, a **D22** (P2P az első kiadástól) után. A kód helye:
[`../koino/`](../koino/). Az előmérés: [`../koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md).*

---

## Mit épít ez a szakasz — és mit nem

**Épít:** egy működő koinót **egyetlen készüléken, hálózat nélkül**. A végén egy ember
tartalmat hoz létre, tudatpontot rendez, javaslatot tesz, szavaz — és az egyezmény
megszületik. **Minden művelet aláírva**, az adat a készüléken.

**Nem épít:** hálózatot. Két készülék még nem talál egymásra — az a Szakasz 2.

> **Miért van értelme egy magányos koinónak?** Mert minden más ezen áll. Ha az esemény-modell
> és az aláírás nem működik egy gépen, hálózaton sem fog. És mert **egyedül is
> kipróbálható**: nem kell hozzá se másik ember, se infrastruktúra.

---

## 1. Az ESEMÉNY — a program atomja

A prototípusban az adat **állapot**: egy tartalom-dokumentum, amit a szerver módosít. Itt az
adat **esemény**: *„én, ekkor, ezt tettem"* — aláírva. Az állapot ebből **számítódik** (D17).

### Egy esemény mezői

| Mező | Mi ez | Miért kell |
|---|---|---|
| `koino` | melyik koinóhoz tartozik | **D25**: egy ember több koinóban is tag lehet — az eseménynek tudnia kell, hol érvényes |
| `tipus` | mi történt (pl. `TartalomLetrehozas`) | ez dönti el, hogyan hat az állapotra |
| `szerzo` | a nyilvános kulcs (32 bájt) | **ez a személyazonosság** — nem név, nem fiók |
| `elozo` | az előző **saját** eseményem azonosítója | ez fűzi láncba a cselekedeteimet |
| `sorszam` | hányadik a saját láncomban | emberi olvashatóság + a lánc hézagai látszanak |
| `ido` | a szerző órája szerint | **tájékoztató, nem bizonyíték** — lásd a 6. pontot |
| `adat` | a művelet tartalma (típusfüggő) | |
| `azonosito` | a fentiek **hash-e** (SHA-256) | az esemény neve = a tartalma |
| `alairas` | a szerző aláírása az azonosítón (64 bájt) | **ez teszi hamisíthatatlanná** |

**Az entitást létrehozó és módosító események `adat` részében kötelező a MÉRET** (D26):
a tudatpont-hozzárendelés tárolási vállalás is, ezért **tudni kell, mit vállalsz, mielőtt
vállalod** — és ehhez a méretnek a *hivatkozásban* kell utaznia, nem csak a letöltött
tartalomban. A csatolt fájlok külön objektumok: a rájuk mutató hivatkozás hordozza a
**lenyomatukat és a méretüket**.

### Az azonosító = a tartalom lenyomata

Az esemény **neve a tartalmából származik** — pontosan úgy, ahogy a git nevezi el az
objektumait (lásd a fázis 2 terv „A git mint minta" szakaszát). Ennek három haszna van:

- két gép **ugyanarra az eseményre ugyanazt a nevet** adja → az összefésülés triviális;
- ha egy bájt megváltozik, **más lesz a neve** → a hamisítás nem rejthető el;
- a hivatkozás (pl. „erre a javaslatra szavaztam") **önmagát ellenőrzi**.

### ⚠️ A kanonikus alak — ahol a determinizmus eldől

A hash a bájtokból számítódik, tehát **ugyanannak az eseménynek mindig ugyanazokat a
bájtokat kell adnia**. A `JSON.stringify` erre önmagában **nem alkalmas**: a mezők
sorrendje a beszúrás sorrendjétől függ, a számok és az egyesített karakterek írásmódja
pedig eltérhet.

**Szabály:** az eseményt kanonikus alakra hozzuk a hash előtt — **rendezett mezőnevek,
egész számok, `NFC` szöveg-normalizálás, `undefined` mező nem szerepel.** Ez egyetlen
függvény lesz (`kanonikusAlak`), és **minden hash rajta megy keresztül**.

> Ez a legapróbb és legveszélyesebb részlet az egész szakaszban: ha elrontjuk, két gép
> ugyanarra az eseményre **két különböző nevet** ad, és soha nem fognak egyetérteni.
> Ezért kap saját, önmagában kipróbálható lépést (lásd a 7. pontot).

---

## 2. A SAJÁT LÁNC — miért nem kell globális egyetértés

Minden e-embernek **egy lánca** van: minden eseménye az előzőre mutat (`elozo`). Ez a D17
„saját lánc-következetesség"-e a gyakorlatban:

```
Csaba:   [1]───▶[2]───▶[3]───▶[4]
Anna:    [1]───▶[2]───▶[3]
```

**Amit ez megold, konszenzus nélkül:** a kettős cselekvés. Ha valaki két különböző
szavazatot ír alá ugyanarra a javaslatra, akkor vagy

- **ugyanazt a láncot folytatja** (2. szavazat felülírja az elsőt) → **ez megengedett**, a
  szavazat módosítható, ahogy ma is; vagy
- **kettéágazik** (két esemény ugyanazzal az `elozo`-vel) → **ez önellentmondás**, és
  **bizonyíték**: mindkét eseményt ő írta alá. Nem kell hozzá bíró — a két aláírás
  önmagában elég.

> **Ez a kulcsa annak, hogy a koino nem igényel globális konszenzust a mindennapokhoz**
> (D17). Nem megakadályozzuk a csalást, hanem **leleplezhetővé** tesszük.

---

## 3. Az ÁLLAPOTSZÁMÍTÁS — és a jó hír, hogy nem kell sorrend

Az állapot (mely tartalmak léteznek, kinek hány tudatpontja van hol, mi a szavazás állása)
**az eseményekből számítódik**. A kérdés, ami minden ilyen rendszert meg szokott fogni:
*milyen sorrendben?* — mert hálózaton az események összevissza érkeznek.

**A koino esetében ez a probléma nagyrészt eltűnik**, és ez nem szerencse, hanem a domain
tulajdonsága: **a műveletek túlnyomó része „e-emberenként az utolsó nyer" típusú.**

| Művelet | Ütközhet? | Miért nem |
|---|---|---|
| Tudatpont-rendezés | ❌ | (e-ember, entitás) párra **a saját láncod utolsója** érvényes — a sorszám dönt, nem a beérkezés |
| Szavazat | ❌ | ugyanígy: (e-ember, javaslat) párra az utolsó |
| Érték javaslat | ❌ | ugyanígy: (e-ember, entitás) párra az utolsó |
| Tartalom létrehozása | ❌ | egyszeri esemény, saját azonosítóval |
| Javaslat, egyezmény | ❌ | az eredmény **számítás** a szavazatokból (D17), nem külön állítás |

> **Vagyis nincs szükség globális sorrendre, és nincs szükség ütközés-feloldó könyvtárra
> (CRDT) sem.** Az „utolsó" mindig **a saját láncban** egyértelmű — és a saját láncot csak
> te írhatod.

**A számítás alakja:** `állapot = f(események halmaza)`. Egy tiszta függvény, ami rendezés
nélkül dolgozik: e-emberenként megkeresi az utolsó vonatkozó eseményt. **Ugyanaz a halmaz
mindig ugyanazt az állapotot adja** — ez a D17 determinizmusa.

**A gyorsítótár:** a számított állapotot **elmentjük** (különben minden indulás
újraszámolás), de a mérés szerint a teljes újraszámolás is olcsó: **10 000 esemény
ellenőrzése 0,58 mp**. Vagyis a gyorsítótár kényelem, nem szükséglet — bármikor
eldobható. *(A H6 `szamitott` rétege pontosan ez, 56 mezővel.)*

---

## 4. A TÁROLÁS — mi kerül a készülékre

A H6 besorolása közvetlenül megmondja ([`adat_osztalyozas.md`](adat_osztalyozas.md)):

| Réteg | Hova kerül a Szakasz 1-ben |
|---|---|
| `mag` + `lanc` + `tartalom` | **IndexedDB, aláírt eseményként** |
| `szamitott` | **nem tároljuk igazságként** — újraszámolható gyorsítótár |
| `helyi` | a készüléken marad; nagy része **megszűnik** (jelszó, token: a kulcs hitelesít — D15) |

**Három tár (IndexedDB „object store"):**

1. **`esemenyek`** — kulcs: az esemény azonosítója. Indexek: `szerzo+sorszam` (a saját lánc
   bejárásához), `koino` (D25: több koino egy készüléken).
2. **`allapot`** — a kiszámolt entitások (gyorsítótár, bármikor eldobható).
3. **`kulcsok`** — a saját kulcspár koinónként vagy közösen *(lásd a nyitott kérdéseket)*.

---

## 5. A KULCS — a legérzékenyebb pont

A mérés kellemetlen ténye: **a böngésző kiürítheti a tárat**, és a tartós tárolás alapból
nincs bekapcsolva. A kulcs elvesztése nem ritka határeset, hanem **hétköznapi kockázat**.

**Ezért a Szakasz 1 kötelező elemei:**

1. **`navigator.storage.persist()` kérése rögtön a kulcs létrehozásakor** — ez kéri meg a
   böngészőt, hogy magától ne törölje az adatot.
2. **A kulcs kimenthető** legyen (fájlba), és a program **kérje is** a mentést az első
   indításkor — nem elrejtett haladó funkcióként.
3. **Őszinte szöveg a felületen:** *„ez a kulcs te vagy; ha elveszik, a
   koino-azonosságodat a közösség tudja visszaadni (D15), de az lassabb, mint egy mentés."*

> A D15 (több tanús helyreállítás) így nem elméleti biztonsági háló, hanem **a Szakasz 3
> egyik indoka** — de addig is kell a mentés, mert az egy kattintás.

---

## 6. AZ IDŐ — amit most még megúszunk

Az esemény `ido` mezője **a szerző órája** — hazudható, és P2P-ben nincs közös óra.
A Szakasz 1-ben ez **nem probléma**, mert egyetlen készülék van: az óra egyértelmű.

**Amit már most be kell tartani, hogy később ne fájjon:**

- az `ido` **tájékoztató adat**, soha nem bizonyíték;
- ami az `ido`-tól függene (pl. „lejárt-e a döntési idő"), az **számítás legyen**, ne tárolt
  állapot — hogy később kicserélhető legyen a szabálya;
- a saját láncban a `sorszam` adja a sorrendet, **nem az idő**.

*(A valódi megoldás a Szakasz 4–5-ben jön: kötegelés és köteg-gyökér — D21. A D16/D17
lassú döntési ablakai miatt ez nem sürgős.)*

---

## 7. A LÉPÉSEK — apró, külön-külön kipróbálható darabok

Minden lépés végén **legyen valami, ami megnézhető**. A sorrend a függőségeket követi.

| # | Lépés | Mi az eredménye | Hogyan próbáljuk ki |
|---|---|---|---|
| **1** ✅ | **Kulcs-réteg** — kulcspár létrehozása, tárolása, mentése, `persist()` | van azonosságod | a felületen látod a nyilvános kulcsod; újratöltés után is megvan |
| **2** ✅ | **Kanonikus alak + hash** | két azonos esemény **ugyanazt** az azonosítót kapja | [`kanonikusProba.html`](../koino/meres/kanonikusProba.html) — **14/14 rendben** |
| **3** ✅ | **Esemény-réteg** — aláírás, ellenőrzés | hamisíthatatlan esemény | [`esemenyProba.html`](../koino/meres/esemenyProba.html) — **13/13 rendben** |
| **4** ✅ | **Tár-réteg** — IndexedDB, a saját lánc | az események megmaradnak | [`tarProba.html`](../koino/meres/tarProba.html) — **11/11 rendben**, a megmaradás újratöltéssel igazolva |
| **5** | **Állapot-réteg** — események → entitások | *„van egy tartalmam"* | a számított állapot megjelenik |
| **6** | **Felület** — a pakli és a kártya ráültetése | a megszokott koino-kép | ugyanaz, mint ma, de helyi adatból |
| **7** | **A teljes kör** — tartalom → tudatpont → javaslat → szavazat → **egyezmény** | **működő koino egy gépen** | végigjátszod magadnak |

**A 7. lépés a szakasz vizsgája.** Ha az egyezmény megszületik pusztán aláírt eseményekből,
szerver nélkül — akkor a Fázis 2 gerince áll.

---

## 8. Mit ÖRÖKLÜNK a prototípusból (D22)

| Örökség | Hogyan |
|---|---|
| **Domain-logika**: küszöb-medián (D4), bizonyossági mutató, javaslat-életciklus, különválás | **átemelhető** — ezek tiszta számítások, nem függenek a szervertől. A `services/` mappa érdemi része. |
| **Felület**: kártyák, pakli, szövegszerkesztő, struktúra/síkidom nézet | **átemelhető** — vanilla JS, build nélkül, ahogy ma is |
| **Fogalmak és nevek**: e-ember, tudatpont, tartalom, javaslat, egyezmény | változatlan |
| **Konvenciók**: magyar nevek, fájl-fejléc komment, bőséges magyarázat | változatlan |

| Amit NEM viszünk | Miért |
|---|---|
| REST-végpontok, `controllers/`, `routes/` | nincs szerver |
| Mongoose-modellek, `repositories/` | nincs központi adatbázis |
| Bejelentkezés, jelszó, token | a kulcs hitelesít (D15) |
| **Az adat** | D24: új regisztráció lesz |

---

## 9. Nyitott kérdések — ezekre a kódolás előtt kell válasz

1. ✅ **EGY KULCS A BELÉPŐ TÉRBEN** *(Csaba, 2026-08-26)*. A D25-ből következik: ha az
   azonosság és a tanúsítások közösek a térben, akkor **egy kulcs viszi át mindet** —
   különben nem lenne mit „átvinni". A **megjelenített név** viszont koinónként külön
   lehet. *Vállalt ára: ugyanaz a kulcs azonosít mindenhol, tehát összeköthető, ki hol
   tag.*
2. ✅ **A PRIVÁT KULCS KIMENTHETŐ, ÉS A PROGRAM KÉRI IS A MENTÉST** *(Csaba, 2026-08-26)*.
   Indok: a mérés szerint a böngésző kiürítheti a tárat, tehát a kulcsvesztés **valós,
   hétköznapi** kockázat; a mentés egy kattintás, a D15 több-tanús helyreállítása lassabb.
   *Vállalt ára: egy rosszindulatú kód elvileg ellophatná a mentett fájlt.*
3. **Mi az esemény-típusok első köre?** Javaslat a legszűkebb, ami a 7. lépéshez elég:
   `TartalomLetrehozas`, `TudatpontRendezes`, `ErtekJavaslat`, `JavaslatLetrehozas`,
   `Szavazat`. *(Kategória és tartalomtípus később — azok is „tartalom" típusúak.)*
4. **Hogyan születik meg maga a koino?** A D25 szerint a koino entitás a térben. A Szakasz
   1-ben elég egy `KoinoLetrehozas` esemény — de a mezőit a D25 alapján kell kitalálni
   (név, paraméterek, belépési szabály, hitelesítési küszöb).

---

## Napló

- **2026-08-26** — A terv létrejött, az előmérés után (Ed25519 natív, 0,058 ms/ellenőrzés,
  IndexedDB 2,5 GB, WebRTC elérhető). A legfontosabb szerkezeti felismerés: **a koino
  műveletei „e-emberenként az utolsó nyer" típusúak**, ezért az állapotszámításhoz **nem
  kell globális sorrend és nem kell ütközés-feloldó könyvtár** — az „utolsó" a saját
  láncban mindig egyértelmű. A legveszélyesebb részlet: **a kanonikus alak** (ha két gép
  ugyanarra az eseményre más hasht ad, soha nem értenek egyet) — külön lépést kapott.
