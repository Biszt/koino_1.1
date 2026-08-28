# A koino a telefonon — telepítés és mérés

*Készült: 2026. 08. 28. — a [Szakasz 2](szakasz2_terv.md) **4. lépéséhez**: két készülék,
két hálózat, szolgáltató nélkül. Ez a szakasz nagy kérdése.*

---

## Miért kell egyáltalán telefon?

Mert a mérés csak akkor ér valamit, ha a két készülék **külön hálózaton** van. Csaba
korlátai (a Szakasz 2 terv 8. pontja) ezt jelölik ki:

| Korlát | Következmény |
|---|---|
| nincs mobilnet | a telefon **átvihető a szomszédba**, ott másik routerre csatlakozik → **külön nyilvános cím** |
| nincs második laptop | a szomszédban nincs kábel és nincs port-továbbítás → **a telefonnak magának kell futtatnia a koinót** |
| nem akarunk alagutat | épp azt a kérdést kerülné meg, amit mérni akarunk |

⚠️ **A koino natívan fut a telefonon, nem böngészőben** (D29). A telefon nem „kliens",
hanem ugyanaz a program — csak egy másik készüléken.

---

## 1. Termux — a Linux-környezet Androidon

**⚠️ NE a Google Play-ből.** Az ottani Termux 2020 óta nem frissül, és az újabb
Androidokon nem működik (a rendszer nem engedi futtatni, amit a saját mappájába telepít).

**Innen töltsd:** [F-Droid](https://f-droid.org/packages/com.termux/) — vagy a Termux
GitHub-kiadásai. (Az F-Droid maga is telepítendő alkalmazás; a telefonnak engednie kell
az „ismeretlen forrásból" való telepítést.)

Telepítés után a Termuxban:

```bash
pkg update && pkg upgrade
```

```bash
pkg install nodejs
```

Ellenőrzés:

```bash
node -v
```

---

## 2. ⚠️ Mérd meg, hogy az Ed25519 megvan-e — ne feltételezd

A koino **minden** eseménye Ed25519-cel van aláírva, és ezt a Node beépített
WebCryptójából veszi (nincs npm-függőség). Ha ez a telefonon nem működik, semmi más nem
számít. Egy parancs eldönti:

```bash
node -e "crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']).then(()=>console.log('Ed25519 RENDBEN')).catch(e=>console.log('NINCS MEG:',e.message))"
```

Ha `Ed25519 RENDBEN`, a telefon alkalmas. (A Node 18.4 óta tudja; a Termux ennél újabbat
telepít.)

---

## 3. A koino átvitele a telefonra

⚠️ **A `koino/` mappa NINCS fenn a GitHubon** — a fejlesztés commitolva van, de nem
pusholtuk. Ezért a `git clone` **most nem járható út**. Két lehetőség van.

### a) Átvitel a laptopról, otthoni wifin (ez a javasolt)

Ehhez a telefon és a laptop **ugyanazon a wifin** legyen. Ez az előkészítés otthon
történik; a szomszédba már kész telefont viszel.

**A laptopon** (a repó gyökerében), csomagolás és egy egyszeri kiszolgáló:

```bash
tar -czf koino.tar.gz koino
```

```bash
node -e "require('http').createServer((q,v)=>require('fs').createReadStream('koino.tar.gz').pipe(v)).listen(8000,()=>console.log('http://<a laptop IPv4-címe>:8000'))"
```

A laptop IPv4-címét a `node koino/koino.js cimek` írja ki („Helyi hálózat" sor —
`192.168.…`).

**A telefonon** (Termux):

```bash
pkg install curl tar
```

```bash
curl -o koino.tar.gz http://192.168.1.134:8000/koino.tar.gz && tar -xzf koino.tar.gz
```

*(A `192.168.1.134` helyére a laptop valódi címe kerül. A kiszolgáló minden útvonalra
ugyanazt a fájlt adja — a `-o` azért kell, mert a `-O` nem tud nevet kitalálni.)* A
laptopon a kiszolgálót utána `Ctrl+C`-vel állítsd le, a `koino.tar.gz`-t pedig törölheted.

⚠️ **A csomag 73 KB, 26 fájl, és semmi mást nem igényel.** Mérve a laptopon: a
kicsomagolt mappa **önmagában lefuttatja mind a 124 próbát**, a repó többi része nélkül.

### b) Ha mégis pusholunk

Akkor a telefonon egyszerűen:

```bash
pkg install git && git clone https://github.com/Biszt/koino_1.1.git
```

Ez egyszerűbb — de a repó nyilvános, tehát a push **közzététel**. Ez Csaba döntése.

---

## 4. ⚠️ A telefon vizsgája: fussanak le az önpróbák

Mielőtt bármit mérnénk, derüljön ki, hogy a koino **tényleg fut** Androidon. Nem
„elindul" — hanem ugyanazt számolja, mint a laptop:

```bash
node koino/meres/mind.js
```

**Ha mind a 124 próba zöld, a telefon teljes értékű koino-készülék.** Ha valami bukik,
azt a mérés előtt kell megérteni — utána már nem lehetne szétválasztani, hogy a hálózat
vagy a program hibás.

Ezután hozz létre rajta egy azonosságot:

```bash
node koino/koino.js kulcs
```

---

## 5. A mérés menete

### 5.1. ⭐ Először OTTHON, egy wifin — a program próbája

Ez még nem a nagy kérdés, de **el kell választani a két hibalehetőséget**: ha a
szomszédban nem megy, tudni akarjuk, hogy a hálózat miatt-e vagy a program miatt.

**A laptopon:**

```bash
node koino/koino.js figyel 7373
```

Windows először rákérdez a tűzfalnál — **engedélyezni kell** (privát hálózatra elég).

**A telefonon:** a laptop IPv4-címével

```bash
node koino/koino.js csere 192.168.1.134 7373
```

Ha lement, mindkét készüléken:

```bash
node koino/koino.js ujjlenyomat
```

**A két TUDÁS-ujjlenyomatnak bájtra egyeznie kell.** Ez a szemmel elvégezhető vizsga.

### 5.2. ⭐⭐ Aztán a SZOMSZÉDBAN — a szakasz nagy kérdése

**A laptop marad otthon és figyel; a telefon megy a szomszédba és csatlakozik.**

*Miért így, és nem fordítva?* Mert a bejövő kapcsolatot a **router tűzfala** engedi vagy
tiltja — és otthon a te routered van, a szomszédban nem. Ha a telefon figyelne, egy idegen
router beállításán múlna a mérés.

**Otthon, indulás előtt** — a laptop globális IPv6-címe:

```bash
node koino/koino.js cimek
```

Írd fel a `2001:…` kezdetű címet (⚠️ **a Windows több ilyet is ad, és ezek naponta
cserélődnek** — közvetlenül a mérés előtt kérdezd le újra), majd hagyd futni:

```bash
node koino/koino.js figyel 7373
```

**A szomszédban, a telefonon** — előbb nézd meg, van-e ott egyáltalán globális IPv6:

```bash
node koino/koino.js cimek
```

Aztán a csere, a laptop IPv6-címével (szögletes zárójel **nem** kell):

```bash
node koino/koino.js csere 2001:4c4d:25cb:b200:7395:e583:5de6:5a1a 7373
```

---

## 6. Amit a mérés eldönt — mindkét kimenet értékes

| Eredmény | Mit jelent |
|---|---|
| **Összeér** | A koino a legszigorúbb értelemben is működik **szolgáltató nélkül**: se jelzőpont, se STUN, se továbbító. Az IPv6 nem NAT-ol, tehát a globális cím maga a nyilvános cím. |
| **Nem ér össze** | Akkor pontosan tudni fogjuk, **mi hiányzik és miért** — nem sejtés alapján. A `cimek` megmondja, hogy a cím hiányzott-e, vagy a tűzfal fogta meg. |

**Jegyezd fel, mennyi idő alatt fut le a csere** (a `csere` parancs kiírja ms-ban). Ez a
terv 7. pontjának legfontosabb száma: ebből jön a **józan minimum döntési idő** (D4) és a
hézag-döntés ára. *A helyi alsó korlát 9 ms — a valódi számot ez a mérés adja.*

### Ha nem megy: a diagnosztikai létra

1. **Van-e a telefonnak globális IPv6 a szomszédban?** (`cimek` → ha nincs, ott az ISP nem
   ad IPv6-ot; a mérés nem a koinóról szól)
2. **Windows tűzfal:** engedi-e a Node bejövő kapcsolatait — és **IPv6-ra** is?
3. **A te routered:** a legtöbb otthoni router alapból **tiltja a bejövő IPv6-ot**. Ez az
   a beállítás, amit engedni kell.
4. **Fut-e még a `figyel`?** Az Android leállíthatja a háttérben futó Termuxot —
   a `termux-wake-lock` parancs segít, ha a telefon oldalán kell sokáig futnia.

---

## 7. A VÉGLEGES VERZIÓBAN: telepítés a koino.hu-ról

*Csaba kérése (2026-08-28): „ezt a végleges verzióban majd a koino.hu-ról is szeretném,
hogy telepíthető legyen."* — **Felírva követelményként.** Ami ehhez tudni való:

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

**Ami technikailag hátravan** (ez már valódi mérnöki munka, nem tervezési kérdés):
Androidon a webről telepítés **APK-t** jelent (nem Play Áruházat), és a felhasználónak
engedélyeznie kell az „ismeretlen forrás" telepítést. Az APK-nak vinnie kell magával egy
Node-futtatót — ezt ma a Termux adja, egy végleges kiadásban nem várható el.

*Amíg ez nincs meg, a Termux az út — és ez a mérésre tökéletesen elég.*
