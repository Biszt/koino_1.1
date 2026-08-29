# A koino a telefonon — lépésről lépésre

*Készült: 2026. 08. 28. — a [Szakasz 2](szakasz2_terv.md) **4. lépéséhez**: két készülék,
két hálózat, szolgáltató nélkül.*

> **Ez az útmutató feltételezi, hogy nem vagy otthon a telefonos és hálózati
> beállításokban.** Minden lépésnél odaírom, **mit fogsz látni**, ha sikerült. Ha valahol
> mást látsz, ott állj meg — nem kell találgatni.

---

## Mit csinálunk, és miért

A koinónak **két külön készüléken, két külön hálózaton** kell megtalálnia egymást, hogy
kiderüljön: működik-e szolgáltató nélkül. Ehhez a telefonra fel kell tenni ugyanazt a
programot, ami a laptopon fut.

**Három szakasz lesz, és mindegyik után meg lehet állni:**

| Szakasz | Hol | Mennyi idő | Mit dönt el |
|---|---|---|---|
| **A** | otthon, a telefonon | ~30 perc | fut-e a koino a telefonon egyáltalán |
| **B** | otthon, egy wifin | ~5 perc | működik-e a csere a két készülék között |
| **C** | a szomszédban | ~10 perc | **a nagy kérdés:** két hálózat között is? |

⚠️ **A `C` szakaszt csak akkor kezdd el, ha a `B` sikerült.** Így ha ott nem megy, tudni
fogjuk, hogy a hálózat miatt — nem a program miatt.

---

## 🔄 HA MÁR FENT VAN A KOINO: frissítés

*Erre akkor van szükség, ha a laptopon fejlesztettünk valamit, és a telefonnak is meg kell
kapnia. A koino gyorsan változik, és **a két készüléknek ugyanazt a verziót kell futtatnia**
— a csere-protokoll változhat.*

**Nyisd meg a Termuxot, és illeszd be ezt az egy sort:**

```bash
cd ~/koino_1.1 && git fetch --depth 1 origin main && git reset --hard origin/main && node koino/meres/mind.js
```

Ez négy dolgot csinál egymás után: lemegy a koino mappájába, lehozza a legfrissebb
változatot, ráállítja a telefont, és **rögtön le is futtatja az önpróbákat**.

✅ **Ha sikerült:** a legalsó sor `✅ Mind a … próba rendben`.

❌ **Ha bármi „BUKOTT":** másold ki a végét, és küldd el nekem.

> ### ⚠️ Két dolog, ami elsőre ijesztő lehet, de nem az
>
> **1. A `git reset --hard` nem törli a koino-adatodat.** A kulcsod és az eseményeid a
> `~/koino-adat` mappában vannak, ami **a program mappáján KÍVÜL** van — ezt a parancs nem
> érinti. Csak a program frissül, az adat marad.
>
> **2. A régi és az új verzió nem tud egymással beszélni.** Ha a csere-protokoll változott,
> a frissítés után a **laptopon is** frissnek kell lennie. Ezért jó, ha a két készüléket
> mindig együtt frissítjük — különben olyan hibát látsz, mintha a hálózattal lenne baj,
> pedig csak két különböző verzió próbál egyeztetni.

---

# 🅰️ SZAKASZ — a telefon előkészítése (otthon)

## Előkészület: hogyan írsz be hosszú parancsokat a telefonon

Ez a legbosszantóbb rész, ezért kezdjük vele. A telefonon gépelni fárasztó, és **egyetlen
elgépelt betű is elrontja a parancsot**.

**A trükk:** küldd el magadnak a parancsokat üzenetben (e-mail, Messenger, bármi), és a
telefonon **másold ki** onnan, majd a Termuxban **hosszan nyomd meg a képernyőt → Paste
(Beillesztés)**.

Ezt az útmutatót is elküldheted magadnak — így minden parancs másolható lesz.

## 1. lépés — F-Droid telepítése

Az F-Droid egy „alkalmazásbolt", mint a Play Áruház, csak szabad programokat ad.
⚠️ **A Termuxot NE a Play Áruházból töltsd le** — az ottani változat 2020 óta nem frissül,
és újabb telefonokon nem működik.

1. Nyisd meg a telefon böngészőjét, és menj ide: **f-droid.org**
2. Nyomd meg a nagy **„Download F-Droid"** gombot. Letöltődik egy fájl.
3. Nyisd meg a letöltött fájlt (a letöltések között találod).
4. A telefon meg fogja kérdezni, hogy engedélyezed-e a telepítést ebből a forrásból.
   **Engedélyezd** — ez azt jelenti, hogy nem a Play Áruházból telepítesz.
5. Nyomd meg a **Telepítés** gombot.

✅ **Ha sikerült:** megjelenik egy új, kék-fehér ikon a telefonon, „F-Droid" néven.

## 2. lépés — Termux telepítése

A Termux az, ami a telefonon egy **parancssort** ad — ugyanolyan fekete ablakot, mint a
laptopon.

1. Nyisd meg az F-Droidot. Először eltölt egy-két percet azzal, hogy letölti a listáját —
   várd meg.
2. Alul nyomd meg a **keresőt (nagyító)**, és írd be: `Termux`
3. Válaszd a **Termux** nevűt (a fejlesztő: „Fredrik Fornwall"), és nyomd meg a
   **Telepítés** gombot.

✅ **Ha sikerült:** megjelenik egy fekete ikon, „Termux" néven.

## 3. lépés — az első pillantás a Termuxra

Nyisd meg a Termuxot.

✅ **Amit látni fogsz:** fekete képernyő, néhány sor üdvözlő szöveg, és a legalján egy
ilyesmi: `~ $` — utána villog a kurzor. **Ide lehet parancsokat írni.**

**Két dolog, amit jó tudni:**

- A billentyűzet fölött van egy extra sor gombokkal (`CTRL`, `ALT`, nyilak). Ha egy
  program nem akar leállni, a **CTRL + C** állítja meg.
- Hosszan nyomd a képernyőt → megjelenik a **Paste (Beillesztés)**.

## 4. lépés — a Termux frissítése

Írd be (vagy illeszd be) ezt, majd nyomj Entert:

```bash
pkg update
```

Kérdezni fog valamit — például hogy folytassa-e (`[Y/n]`). **Nyomj Entert.** Ha
fájlokról kérdez, arra is elég az Enter.

⏱ Ez eltarthat pár percig, sok szöveg fog gördülni. Ez normális.

✅ **Ha sikerült:** a végén visszakapod a `$` jelet, és nem ír „error"-t.

## 5. lépés — a két program telepítése

```bash
pkg install nodejs git
```

Ez telepíti a **Node**-ot (ami a koinót futtatja) és a **git**-et (amivel letöltjük).
Ha kérdez, Enter.

✅ **Ha sikerült:** ellenőrizd ezzel:

```bash
node -v
```

Valami ilyesmit kell kiírnia: `v22.5.1` (a szám lehet más).

## 6. lépés — ⭐ a legfontosabb ellenőrzés

A koino minden műveletet **aláír** — ez a lelke. Ha ez a telefonon nem működik, semmi más
nem számít, ezért **most mérjük meg, és nem feltételezzük**.

```bash
node -e "crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']).then(()=>console.log('Ed25519 RENDBEN')).catch(e=>console.log('NINCS MEG:',e.message))"
```

✅ **Ha sikerült:** kiírja, hogy `Ed25519 RENDBEN`.

❌ **Ha azt írja, `NINCS MEG`:** állj meg és szólj. Ez nem a te hibád, és van rá megoldás,
de akkor másképp kell folytatni.

## 7. lépés — a koino letöltése

```bash
git clone --depth 1 https://github.com/Biszt/koino_1.1.git
```

*(A `--depth 1` azért van ott, hogy csak a mai állapot jöjjön le — 5,6 MB a 23 helyett.)*

✅ **Ha sikerült:** néhány sort ír a letöltésről, és a végén visszakapod a `$` jelet.

## 8. lépés — a rövidítés beállítása

Hogy ne kelljen minden alkalommal hosszú útvonalat gépelni, csinálunk egy **rövidítést**:
mostantól elég lesz annyit írni, hogy `k`.

Írd be ezt a két sort, egyenként (mindkettő után Enter):

```bash
echo "alias k='KOINO_ADAT=\$HOME/koino-adat node \$HOME/koino_1.1/koino/koino.js'" >> ~/.bashrc
```

```bash
source ~/.bashrc
```

✅ **Ha sikerült:** semmi látványos nem történik — visszakapod a `$` jelet. Próbáld ki:

```bash
k kulcs
```

Ki kell írnia egy hosszú betűsort (ez lesz a telefon azonossága a koinóban) és azt, hogy
hol tárolja.

## 9. lépés — ⭐⭐ a telefon vizsgája (ez a legértékesebb mérés az egészben)

Most kiderül, hogy a koino nemcsak **elindul** a telefonon, hanem **ugyanazt is számolja**,
mint a laptop. Ez 174 önellenőrzés.

> **Miért ez a legfontosabb, és miért nem a hálózat?**
>
> A koino egész működése azon áll, hogy **két gép ugyanarra az adatra bájtra ugyanazt a
> lenyomatot adja** — ez a kanonikus alak, a legveszélyesebb részlet. Ha ez elromlik, két
> gép SOHA nem ért egyet, méghozzá némán.
>
> Eddig ezt **csak egyetlen gépen, egyetlen processzoron** (Windows / x86) bizonyítottuk.
> A telefon **ARM-processzor, más operációs rendszer, más Node-fordítás** — ez lesz az
> **első független megerősítés**, hogy az ígéret nem csak egy gép sajátossága.
>
> Ez a mérés akkor is megéri a telepítést, ha a hálózati rész soha nem jön össze.

```bash
cd ~/koino_1.1 && node koino/meres/mind.js
```

⏱ Fél-egy percig fut, sok sor gördül.

✅ **Ha sikerült:** a legalsó sor ez lesz:

```
✅ Mind a 174 próba rendben
```

*(A szám nő, ahogy új próbák születnek — a lényeg, hogy a sor **✅**-tel kezdődjön, és ne
legyen benne „BUKOTT".)*

❌ **Ha bármi „BUKOTT":** másold ki a végét, és küldd el nekem. Ezt a mérés ELŐTT kell
megérteni.

**🎉 Ha idáig eljutottál, a telefon teljes értékű koino-készülék.** Innen már gyors lesz.

---

# 🅱️ SZAKASZ — az első csere otthon (mindkettő a te wifidén)

⚠️ **A telefon és a laptop ugyanazon a wifin legyen.**

## 10. lépés — a laptop címének megkeresése

**A laptopon** (a `C:\koino_1.1` mappában):

```bash
node koino/koino.js cimek
```

Keresd meg a **„Helyi hálózat (IPv4)"** sort. Valami ilyesmi lesz benne:
`192.168.1.134`. **Ezt írd fel** (ez a laptop címe a lakáson belül).

## 11. lépés — a laptop kaput nyit

**A laptopon:**

```bash
node koino/koino.js figyel 7373
```

⚠️ **A Windows fel fog ugrani egy tűzfal-kérdéssel** („Engedélyezi a Node.js
kommunikációját?"). **Nyomd meg az Engedélyezés gombot** — a „Magánhálózatok" pipa elég.

✅ **Ha sikerült:** kiírja, hogy `A kapu nyitva: 7373-es port`. **Ezt az ablakot hagyd
nyitva**, itt fog dolgozni.

## 12. lépés — a telefon csatlakozik

**A telefonon**, a saját címeddel a `192.168.1.134` helyén:

```bash
k csere 192.168.1.134 7373
```

✅ **Ha sikerült:** a telefon kiírja, hogy `Csere kész — kaptam ... eseményt`, a laptop
ablakában pedig megjelenik egy zöld pipa és egy `✓ csere` sor.

❌ **Ha azt írja, hogy nem tud csatlakozni:** a leggyakoribb ok, hogy a tűzfalnál nem
Engedélyezést nyomtál. Zárd be a `figyel`-t (CTRL + C), és próbáld újra.

## 13. lépés — ⭐ ugyanazt látja a két készülék?

**Mindkét készüléken** futtasd le ezt (a telefonon `k ujjlenyomat`, a laptopon
`node koino/koino.js ujjlenyomat`):

```bash
node koino/koino.js ujjlenyomat
```

✅ **Ha sikerült:** a **TUDÁS** alatti hosszú betűsor a két készüléken **betűre azonos**.

Ez a vizsga, szemmel elvégezve: ha a két sor egyezik, a két készülék ugyanazt a koinót
látja.

---

# 🅲 SZAKASZ — a hálózati mérés (telefon a szomszédban)

> ⚠️ **Ez már nem életkérdés (D31, 2026-08-28).** Amíg a mérce az volt, hogy „két
> készüléknek közvetlenül össze kell érnie", addig ezen múlt a koino sorsa. A
> [platform-függetlenségi híd](platform_fuggetlenseg.md) óta a mérce elfogadja az
> aszimmetriát: **nem kell mindenkinek tudnia kapcsolatot fogadni, elég, ha valakik
> tudnak.** Ez a mérés tehát már nem azt dönti el, hogy *működik-e* a koino, hanem azt,
> hogy **hányan tudnak kaput nyitni** — vagyis mennyire lesz kényelmes.
>
> ⚠️ **A Termux mérőeszköz, nem termék.** A végleges koino Androidon nem így fog települni,
> és a koino kódja semmit nem tud a Termuxról — eltávolítása semmit nem változtat.

**Az elrendezés:** a **laptop marad otthon és figyel**, a **telefon megy a szomszédba és
csatlakozik**.

*Miért így?* Mert a bejövő kapcsolatot a **router** engedi vagy tiltja — és otthon a **te**
routered van. Ha fordítva csinálnánk, egy idegen router beállításán múlna a mérés.

## 14. lépés — otthon, indulás előtt

**A laptopon:**

```bash
node koino/koino.js cimek
```

Most a **„GLOBÁLIS IPv6"** rész kell — egy hosszú, kettőspontos cím, ami `2001:`-gyel
kezdődik. Ha több is van, **az elsőt** vedd.

⚠️ **Ezt a címet nem fogod tudni fejből** — és elgépelni is könnyű. **Küldd el magadnak
üzenetben**, hogy a szomszédban a telefonon be tudd illeszteni.

⚠️ **Ezek a címek naponta cserélődnek**, ezért közvetlenül indulás előtt kérdezd le,
ne előző nap.

## 15. lépés — a laptop figyel, és úgy is marad

**A laptopon:**

```bash
node koino/koino.js figyel 7373
```

**Hagyd futni**, és úgy menj át a szomszédba. Ne zárd be az ablakot, és a laptop ne
aludjon el.

## 16. lépés — a szomszédban: van-e ott IPv6?

Csatlakoztasd a telefont a szomszéd wifijére. Aztán:

```bash
k cimek
```

✅ **Ha van „GLOBÁLIS IPv6" sor** (`2001:`-gyel kezdődő cím), mehet tovább.

❌ **Ha azt írja, hogy „(nincs)":** akkor a szomszéd internet-szolgáltatója nem ad IPv6-ot.
**Ez is eredmény** — nem a koino hibája, és fontos tudni. Írd fel, és szólj.

## 17. lépés — ⭐⭐ a csere két hálózat között

A telefonon, a laptop `2001:`-es címével (amit üzenetben elküldtél magadnak):

```bash
k csere 2001:4c4d:25cb:b200:7395:e583:5de6:5a1a 7373
```

*(Szögletes zárójel nem kell. A cím helyére a sajátodat illeszd be.)*

✅ **Ha sikerült:** `Csere kész — ... (2 kör, ... ms)`. **Írd fel a ms-számot** — ez a
mérés legfontosabb száma.

❌ **Ha nem sikerül:** ez sem kudarc, hanem eredmény. Írd le, mit írt ki pontosan, és
együtt megnézzük, melyik lépcsőn akadt el.

## 18. lépés — az összevetés

A telefonon:

```bash
k ujjlenyomat
```

És otthon a laptopon ugyanígy. **Ha a TUDÁS-sorok egyeznek, a koino két külön hálózat
között, szolgáltató nélkül működik.**

---

## Ha bármelyik lépésnél elakadsz

Nem kell találgatni. Írd le:

1. **melyik lépésnél** vagy,
2. **mit írtál be** pontosan,
3. **mit írt ki** a gép (a végét elég).

Ebből meg tudom mondani, mi történt.

---
---

# Függelék — a technikai háttér

*Ez a rész nem a telepítéshez kell, hanem hogy később is tudjuk, miért így csináltuk.*

## Miért natívan fut a telefonon, és nem böngészőben?

A **D29** szerint a koino önálló program. A böngésző korlátai nem a koino korlátai: egy
lap nem tud portot nyitni, nem fogad kapcsolatot, és elrejti a saját címeit. Az egész
infrastruktúra, amit a P2P-hez emlegetni szoktak (jelzőpont, STUN, továbbító), jórészt
ebből következik.

## Miért ez az elrendezés?

A Szakasz 2 terv 8. pontja írja le Csaba korlátait, és mindegyikből következik valami:

| Korlát | Következmény |
|---|---|
| nincs mobilnet | a telefon **átvihető a szomszédba** → külön router, külön nyilvános cím |
| nincs második laptop | a szomszédban nincs kábel és port-továbbítás → **a telefon futtatja a koinót** |
| nem akarunk alagutat | épp azt a kérdést kerülné meg, amit mérni akarunk |

## Mit dönt el a mérés?

| Eredmény | Mit jelent |
|---|---|
| **Összeér** | A koino a legszigorúbb értelemben is működik **szolgáltató nélkül**: se jelzőpont, se STUN, se továbbító. Az IPv6 nem NAT-ol, tehát a globális cím maga a nyilvános cím. |
| **Nem ér össze** | Pontosan tudni fogjuk, **mi hiányzik és miért** — nem sejtés alapján. |

A **ms-szám** a terv 7. pontjának legfontosabb mérendő értéke: ebből jön a józan
**minimum döntési idő** (D4) és a hézag-döntés ára. *A helyi alsó korlát 9 ms.*

## Ha a `C` szakasz nem megy: a diagnosztikai létra

0. ⭐ **Először válaszd szét: a HÁLÓZAT nem megy, vagy a PROGRAM?** Erre van egy trükk,
   amihez semmit nem kell telepíteni. A telefon **böngészőjébe** írd be a laptop címét —
   ⚠️ itt **szögletes zárójel kell**, mert ez URL (a `csere` parancsnál nem kellett):

   ```
   http://[2001:4c4d:25cb:b200:7395:e583:5de6:5a1a]:7373/
   ```

   A böngésző hibát fog mutatni — **ez várt**, mert a koino nem weboldalt szolgál ki. A jel
   a **laptop oldalán** van: ha ott megjelenik egy ilyen sor, akkor a kapcsolat **átjutott
   két hálózat között**, és a hiba nem a hálózaté:

   ```
   ✗ megszakadt (2001:...): A vonal lezárult, mielőtt a válasz megjött volna
   ```

   *(Kipróbálva 2026-08-28-án, helyben: a figyelő pontosan ezt írja ki egy böngésző-szerű
   kérésre.)*

1. **Van-e a telefonnak globális IPv6 a szomszédban?** (16. lépés — ha nincs, ott az ISP
   nem ad IPv6-ot; a mérés nem a koinóról szól)
2. **Windows tűzfal:** engedi-e a Node bejövő kapcsolatait, **IPv6-ra is**?
3. **A saját routered:** a legtöbb otthoni router alapból **tiltja a bejövő IPv6-ot**.
   Ez az a beállítás, amit engedni kell.
4. **Fut-e még a `figyel`?** A laptop ne aludjon el.

## Ha egy még nem pusholt változatot akarsz a telefonon

A 7. lépés a GitHubról tölt le. Ha a laptopon van egy frissebb, még ki nem tett változat,
akkor wifin is átvihető. **A laptopon:**

```bash
tar -czf koino.tar.gz koino
```

```bash
node -e "require('http').createServer((q,v)=>require('fs').createReadStream('koino.tar.gz').pipe(v)).listen(8000,()=>console.log('fut'))"
```

**A telefonon** (a laptop IPv4-címével):

```bash
curl -o koino.tar.gz http://192.168.1.134:8000/koino.tar.gz && tar -xzf koino.tar.gz
```

⚠️ Mérve: a csomag **73 KB, 26 fájl**, és a kicsomagolt mappa **önmagában lefuttatja mind
a 124 próbát**, a repó többi része nélkül. *Ez a `koino/` mappa legfontosabb tulajdonsága:
nincs mihez tartoznia.*

## A VÉGLEGES VERZIÓBAN: telepítés a koino.hu-ról

*Csaba kérése (2026-08-28): „ezt a végleges verzióban majd a koino.hu-ról is szeretném,
hogy telepíthető legyen."* — **Felírva követelményként.**

**Ez NEM mond ellent a D29-nek.** A D29 arról szól, hogy a koino nem a böngészőben *fut*;
a koino.hu-ról való telepítés viszont **terjesztés**, nem futtatás. A letöltés után a
program a készüléken él, és a weboldal nélkül is működik tovább.

**De egy feszültséget érdemes kimondani:** a koino lényege, hogy nincs központi szereplő —
egy weboldal viszont központi terjesztési pont. Aki a koino.hu-t megszerzi, hamis
programot oszthatna. A választható válaszok (a döntés még nincs meg):

| Eszköz | Mit ad |
|---|---|
| **Aláírt kiadás** | a letöltött csomag ujjlenyomata ellenőrizhető — pontosan az a minta, amit a koino az eseményeknél is használ |
| **A forrás nyilvános** (AGPL-3.0) | bárki újraépítheti és összevetheti |
| **Több forrás** | F-Droid, GitHub-kiadás, koino.hu — ne egyetlen ponton múljon |
| **A koinón belüli verzió-entitás** (D12) | a közösség maga dönthessen róla, melyik verziót futtatja |

**Ami technikailag hátravan:** Androidon a webről telepítés **APK**-t jelent (nem Play
Áruházat), és az APK-nak vinnie kell magával egy Node-futtatót — ezt ma a Termux adja, egy
végleges kiadásban nem várható el a felhasználótól.

*Amíg ez nincs meg, a Termux az út — és a méréshez tökéletesen elég.*
