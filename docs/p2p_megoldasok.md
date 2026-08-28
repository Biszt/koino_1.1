# Hogyan oldják meg mások — P2P kapcsolat a gyakorlatban

*Készült: 2026. 08. 29. — Csaba kérésére, miután kiderült, hogy a saját routerén se kézzel,
se automatikusan nem tudunk kaput nyitni. A kérdés: **mit csinálnak a létező rendszerek?***

> **Csaba felvetése, ami ezt kiváltotta:** *„nem az a lényeg, hogy most minek venném
> hasznát, hanem az, hogy kitaláljuk, hogyan hozzunk létre olyan P2P-t, ami nem zár ki
> senkit, azért mert mobilja van csak, és mobil nete. […] pont a szegények azok, akiknek
> nincsen PC-jük, meg fix IP-címük."*

---

## 0. A legfontosabb, amit az egész átnézésből meg lehet tanulni

Végignéztem, mit csinál a BitTorrent, a Bitcoin, a WebRTC, az IPFS/libp2p, a Tailscale, a
Syncthing, a Briar, a Scuttlebutt, a Nostr, a Delta Chat, a Matrix és a Tor. **Mindegyik
ugyanarra a szerkezetre jutott:**

> **Vannak, akik csak KIFELÉ tudnak kapcsolódni — és vannak, akik FOGADNI is tudnak.
> A hálózat úgy működik, hogy az utóbbiak dolgoznak az előbbiekért.**

**Senki nem kerülte meg ezt** — sem cég, sem közösségi projekt, sem kutatás. Nem
tehetetlenségből: ez a hálózat felépítéséből következik. Aki szolgáltatói NAT mögött van,
annak a külső portszáma **kívülről kiszámíthatatlan**, tehát nem is lehet megszólítani,
amíg ő meg nem szólal.

**A rendszerek NEM abban különböznek, hogy kell-e fogadni tudó csomópont, hanem hogy:**

| Kérdés | Ezen múlik minden |
|---|---|
| **Ki lehet fogadó csomópont?** | egy cég — vagy bárki |
| **Mit lát a fogadó?** | a tartalmat is — vagy csak titkosított bájtokat |
| **Cserélhető-e?** | egy címre kell menni — vagy bármelyikre |
| **Kap-e hatalmat tőle?** | dönthet, mi igaz — vagy csak továbbít |

⭐ **A koino előnye itt szerkezeti:** mivel minden esemény **aláírt**, és az állapot
**számítás**, a fogadó csomópont a felsoroltak közül **a legkevesebb hatalommal bír**, amit
egy ilyen szerepben egyáltalán lehet: nem hamisíthat, nem találhat ki, és ha elhallgat
valamit, az **hézagként látszik**.

---

## 1. A rendszerek

### Amik cégre támaszkodnak

| Rendszer | Hogyan old | Mi az ára |
|---|---|---|
| **WebRTC** (Meet, Discord, Messenger) | ICE: lyukfúrás + **STUN** (mi a külső címem) + **TURN** (továbbító, ha nem megy) | a jelzőpont és a TURN a cégé; nélkülük nincs hívás |
| **Signal, WhatsApp** | ugyanez, de a jelzés is a cégnél | teljesen a cégtől függ |
| **Tailscale** | **DERP** továbbítók a cégnél, ha a közvetlen út nem áll össze | ⭐ **2025 óta „Peer Relay": a SAJÁT eszközeid is lehetnek továbbítók** |

⭐ A Tailscale fordulata fontos precedens: rájöttek, hogy a továbbítónak **nem kell a
cégnél** lennie. Pontosan az az irány, ami a koinónak kell.

### Amik közösségre támaszkodnak

| Rendszer | Hogyan old | Tanulság |
|---|---|---|
| **BitTorrent** | DHT (elosztott címjegyzék) + lyukfúrás; **sok peer közül elég, ha néhány fogad** | a **sokaság** old meg mindent — kis közösségben nem működne |
| **Bitcoin** | nyitott portos csomópontok + DNS-magok az induláshoz | a legtöbb felhasználó **csak kifelé** kapcsolódik, és ez rendben van |
| **IPFS / libp2p** | **DCUtR**: lyukfúrás **jelzőszerver nélkül**, egy továbbítón keresztül összehangolva | ⭐ ez a legközelebbi a koinóhoz — lásd a mért számokat lentebb |
| **Syncthing** | globális felfedező-szerverek + **önkéntes továbbítók**, de **helyi felfedezés is** | a helyi hálózaton **semmi nem kell** |
| **Nostr** | **kizárólag továbbítók** („relay"), a kliens csak kifelé kapcsolódik | ⭐ **bárki üzemeltethet továbbítót**, és mindenki többre csatlakozik |
| **Scuttlebutt** | pletyka-terjedés + „pub"-ok (fogadó csomópontok) + **helyi felfedezés + pendrive** | a **futár-modell** működik a gyakorlatban is |
| **Matrix** | föderált szerverek: mindenki a SAJÁT szerveréhez kapcsolódik kifelé | nem P2P, de a hatalom megoszlik |
| **Delta Chat** | ⭐ **e-mailt használ szállításnak** — nulla új infrastruktúra | a meglévő hálózatra ül rá |

### Amik a hálózat átjárhatóságát oldják meg

| Rendszer | Hogyan old | Ára |
|---|---|---|
| ⭐ **Tor onion-szolgáltatás** | **elérhető címet ad bárkinek** — CGNAT, mobil, tűzfal mögött is, port-nyitás NÉLKÜL | lassabb; a Tor-hálózattól függ (önkéntes, nem cég); egyes országokban tiltott |
| **Briar** | Tor + **Bluetooth + wifi + memóriakártya**; szerver nélkül | ⚠️ ismerőst **csak személyesen**, QR-kóddal lehet felvenni; **nincs iOS-változata** |
| **Yggdrasil, cjdns, I2P** | saját átfedő hálózat építése | kis felhasználói kör, lassabb |

---

## 2. A MÉRT SZÁMOK — ez a legfontosabb rész

*Nem becslés: az IPFS/libp2p csapata **4,4 millió kapcsolat-kísérletet** mért **85 000
hálózaton, 167 országban**.*

| Amit mértek | Eredmény |
|---|---|
| **a lyukfúrás sikeressége** | **70% ± 7,1%** |
| TCP vagy UDP jobb-e | ⚠️ **statisztikailag azonos** (~70%) — megdőlt a régi hiedelem, hogy az UDP jobb |
| első próbálkozásra sikerül-e | **97,6%** — ha megy, azonnal megy |
| számít-e, milyen a továbbító | **nem** — véletlenszerű továbbítóval is ugyanaz |

**Amit ebből tudni kell:**

1. ⭐ **A lyukfúrás megéri** — az esetek 70%-át megoldja, központi szerver nélkül.
2. ⚠️ **De a 30% marad.** Erre **nincs ismert megoldás** továbbító nélkül. Ez nem
   mérnöki hiányosság: a szimmetrikus NAT mögötti port **kiszámíthatatlan**, tehát az
   információ nem létezik, amíg az illető meg nem szólal.
3. **A továbbító minősége nem számít** — tehát nyugodtan lehet **bárki**, akár egy gyenge
   gép is. Ez a koino szempontjából nagyon jó hír.

---

## 3. Amit a csak-mobilos e-emberről tudni kell

*Csaba kérdésének a magja.*

| Helyzet | Fogadhat kapcsolatot? |
|---|---|
| mobilnet, **csak IPv4** (szolgáltatói NAT) | **nem** — és a lyukfúrás is gyakran bukik (szimmetrikus NAT) |
| mobilnet, **IPv6-tal** | **talán** — de ⚠️ **több szolgáltató a bejövő IPv6-ot is szűri** (a T-Mobile-t név szerint említik a források) |
| otthoni net **CGNAT-tal** | **nem** — ⚠️ **Csaba is ilyen** (`100.97.184.76`) |
| otthoni net **saját IPv6-tal, engedő routerrel** | **igen** |

**Két dolog derül ki ebből:**

1. **A „szegény = mobilos = kizárva" félelem részben jogos, de nem a szegénység miatt.**
   Csaba **vezetékes** kapcsolata ugyanúgy CGNAT mögött van, mint egy mobilos. A választóvonal
   nem a pénz, hanem hogy **a szolgáltató ad-e működő IPv6-ot.**
2. ⭐ **Két csak-mobilos e-ember EGYMÁST nem éri el, sehogyan.** Ezt ki kell mondani: ha egy
   koinóban **mindenki** csak mobilnetes, akkor kell valaki kívülről, aki fogad. Ezen
   semmilyen tervezés nem segít.

---

## 4. Mit jelent ez a koinóra

**A cél nem lehet az, hogy „ne legyen továbbító"** — ilyen rendszer nem létezik, és nem is
tudunk ilyet tervezni. **A cél az, hogy ne legyen KITÜNTETETT továbbító.**

Négy tulajdonság, ami ezt biztosítja — és mindegyik **már ma is teljesül** a koinóban:

| Tulajdonság | Hogyan áll ma |
|---|---|
| a továbbító **nem hamisíthat** | ✅ minden esemény aláírt; egyetlen kapu az `esemenyMentese` |
| az elhallgatás **látszik** | ✅ a hézag kimutatható (`ALLAS`), és a csere kéri is |
| **bárki lehet** továbbító | ✅ a `figyel` parancs bármelyik gépen fut, nulla függőséggel |
| **nem kap hatalmat** tőle | ✅ az állapot **számítás**, nem az ő állítása (D17) |

⭐ **Vagyis a koino a felsorolt rendszerek közül a legjobb helyzetben van ehhez** — nem
azért, mert okosabbak voltunk, hanem mert az aláírt esemény + számított állapot szerkezete
eleve elveszi a közvetítő hatalmát.

### A négy út, sorrendben

| # | Út | Kit ér el | Mennyire kész |
|---|---|---|---|
| 1 | **közvetlen kapcsolat** (nyitott port / IPv6) | akinek engedi a szolgáltatója | ✅ megvan (`figyel` / `csere`) |
| 2 | **lyukfúrás** | +70% a maradékból | ⬜ megépítendő |
| 3 | **e-ember-továbbítók** | gyakorlatilag mindenkit | ⬜ megépítendő |
| 4 | **Tor onion-cím** | mindenkit, port-nyitás nélkül | ⬜ megfontolandó |

⚠️ **A 4. külön mérlegelést kíván.** A Tor onion-szolgáltatás **elérhető címet ad bárkinek**
— CGNAT-os mobilnak is —, és a Briar bizonyítja, hogy Androidon működik. **De** függés egy
külső hálózattól (igaz, önkéntesektől, nem cégtől), lassabb, és egyes országokban tiltott.
*A platform-függetlenség 2. szabálya szerint: lehet, de csak úgy, ha **elhagyható**.*

---

## 5. Amit még nem tudunk, és meg kellene mérni

1. **Adnak-e a magyar mobilszolgáltatók IPv6-ot, és átengedik-e a bejövő kapcsolatot?**
   Ez dönti el, mekkora a probléma. Egy paranccsal mérhető — de mobilnet kell hozzá.
2. **Átengedi-e a Telekom a bejövő IPv6-ot magas porton?** A 443-mal nem ment; lehet, hogy
   a szolgáltató szűri a 80/443-at, és egy magas port átmenne.
3. **Mennyi a lyukfúrás sikeressége magyar hálózatokon?** A 70% világátlag.

---

## Napló

- **2026-08-29** — A dokumentum létrejött, Csaba kérésére: *„kérlek nézz utána az összes
  P2P rendszernek, hogy milyen megoldásokat használnak."* Jogos kérés — ezzel kellett
  volna kezdeni, ahelyett hogy lépésenként ütközünk falakba, amikről tudni lehetett.
  **A legfontosabb lelet:** minden rendszer ugyanarra a szerkezetre jutott (kifelé
  kapcsolódók + fogadni tudók), és **a mért lyukfúrás-sikeresség 70%** — tehát a maradék
  30%-ra **továbbító kell, és ez alól nincs kivétel sehol.**
  Ezzel a kérdés átfogalmazódott: nem *„legyen-e továbbító"*, hanem **„ki lehet az, és kap-e
  tőle hatalmat"**.

## Források

- [DCUtR mérés (arXiv)](https://arxiv.org/pdf/2510.27500) · [IPFS eset-tanulmány (arXiv)](https://arxiv.org/pdf/2604.12484) · [libp2p: Hole Punching](https://libp2p.io/docs/hole-punching/)
- [Briar: hogyan működik](https://briarproject.org/how-it-works/)
- [Tailscale: Peer Relays](https://tailscale.com/blog/peer-relays-ga) · [DERP-kiszolgálók](https://tailscale.com/docs/reference/derp-servers)
- [Carrier-grade NAT (Wikipédia)](https://en.wikipedia.org/wiki/Carrier-grade_NAT)
