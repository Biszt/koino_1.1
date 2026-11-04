# A koino programja — folyamatábrák a tervezéshez

*Létrehozva: 2026-11-04, Csaba kérésére: „tudsz készíteni egy folyamat ábrát a programról, a tervezéshez?”*

> **Mi ez a dokumentum?** Az ÚJ program (`koino/` — a P2P koino) **működése képekben**: mi fut egy
> készüléken, merre megy egy esemény, mit csinál az őrjárat egy körben, hogyan beszél két készülék,
> hogyan találják meg egymást, mi az e-ember útja, mi a koinó családja — és a tervezéshez: **mi kész,
> mi nyitott, mi nincs még** (8. ábra).
>
> A [`gepezet.md`](gepezet.md) testvére: az a **döntés-gépezet** képei (javaslat → egyezmény, a
> tudatpont útja), ez a **program** egésze. A képek `mermaid` alakban vannak, mint ott: a GitHub és a
> legtöbb szerkesztő rendereli, a nyers szöveg olvasható marad — nulla függőség (6. szabály).
>
> ⚠️ **Az állapot 2026-11-04-i** (a D122 után, 1366 önpróba). Ha egy pillér változik, a képet is
> javítani kell — *a képet javítva vitatjuk meg, nem a szöveget.*

**A színek — minden ábrán ugyanazok:** zöld = **kész** és próbákkal őrzött · sárga = **nyitott**
(Csabánál, vagy a terepen mérendő) · szürke, szaggatott keret = **még nincs** · kék = **kívül** (az
e-ember, a társak, a DHT, a fájl).

**Az ábrák:** 1. A nagy kép · 2. Egy esemény útja · 3. Az őrjárat köre · 4. Egy csere · 5. Hogyan
találják meg egymást · 6. Az e-ember útja · 7. A koinó családja · 8. ⭐ Hol tartunk — a tervezés térképe

**Hogyan használd a tervezéshez:** egy új lépésnél keresd meg a dobozát (a 8. ábrán), és nézd meg,
mire épül és mi épül rá — a nyilak a függőséget mutatják. A doboz D-száma a
[`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md)-ben, az elágazás az
[`alappillerek.md`](alappillerek.md) 5. szakaszában. Ha a lépés egy KÖZÖS réteget érint (az esemény
alakja, a kapu, a tár, a szabály-réteg — az 1. ábra közepe), a végén a teljes próbasor kell.

---

## 1. A NAGY KÉP — egy készülék és a világ

Nincs szerver: **minden a készüléken fut**, két hosszan futó folyamatban — a **felület** (`koino
felulet`: a lap és a helyi kapu) és az **őrjárat** (`koino orjarat`: a csere a társakkal). A telefonon
a `koino` indító (`koino/termux/indit.sh`) mindkettőt elindítja. Ami közös bennük: **egy kapu** és
**egy tár**.

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart TB
    EE(["👤 az e-ember"])

    subgraph KESZ["📱 EGY KÉSZÜLÉK — a koino itt fut, szerver nélkül"]
        BEJ["🖥️ A LAP a böngészőben — pakli, kártyák, modálok<br/>a helyi kapun át: 127.0.0.1 + jelszó — kapu.js<br/>⌨️ A PARANCSSOR — koino.js, a fejlesztői eszköz"]
        MUV["✍️ MŰVELET — muveletek.js<br/>a lánc vége → ALÁÍRT ESEMÉNY<br/>a kulcs maga a személy — Ed25519"]
        GATE{{"⛔ AZ EGYETLEN KAPU — esemenyMentese<br/>alak · aláírás · koinó · lánc · bizonyíték"}}
        TAR["🗄️ A TÁRAK — az író fűz hozzájuk, koinónként egy<br/>tartós: amit VÁLLALOK · átmeneti: amit csak LÁTTAM<br/>kereső-tár: a régióm · fájl-tár: szöveg, kép, kód"]
        SZ["🧮 SZÁMÍTÁS — koinoKepe<br/>szabályok → entitások → döntések → végrehajtás<br/>az egyezmény is itt születik — D17"]
        ORJ["🔁 AZ ŐRJÁRAT — percenként, a fal órájához<br/>állandó UDP-kapu: postaláda, titkosított rés<br/>a háztartás a háttérben"]
    end

    TARS["📱 a társak<br/>ugyanilyen készülékek"]
    DHT["🌐 BitTorrent DHT — segédeszköz<br/>hirdetőtábla, címjegyzék"]
    KEZI["📁 a kézi út<br/>kivisz / behoz"]

    EE --> BEJ
    BEJ --> MUV
    MUV --> GATE
    GATE --> TAR
    TAR --> SZ
    SZ -->|pakli.js — egy oldalnyi kártya| BEJ
    TAR -->|amit adok| ORJ
    ORJ -->|amit kapok — beolvasztás| GATE
    ORJ <-->|csere, kérelem, fájlok| TARS
    ORJ <--> DHT
    KEZI --> GATE

    classDef kesz fill:#EAF3DE,stroke:#3B6D11,color:#173404
    classDef kapu fill:#EAF3DE,stroke:#3B6D11,color:#173404,stroke-width:3px
    classDef kulso fill:#E6F1FB,stroke:#185FA5,color:#042C53
    class BEJ,MUV,TAR,SZ,ORJ kesz
    class GATE kapu
    class EE,TARS,DHT,KEZI kulso
```

- **Két bejárat, egy út.** A lap és a parancssor ugyanazt a műveletet hívja (`muveletek.js`), és a
  művelet egy ALÁÍRT eseményt ad. „Módosít” és „töröl” nincs, csak hozzáfűzés — a változás is egy új
  esemény.
- **Egy kapu mindenre (3. szabály).** A saját műveletem, a társtól jött esemény (`beolvasztas`), a
  kérelem válasza és a fájlból behozott mind az `esemenyMentese`-n megy át. *A hálózat nem kap
  engedékenyebb kaput.*
- **Négy tár.** A tartósban az van, amit VÁLLALOK (amire pontot tettem, a saját azonosságom, a koinó
  születése — `vallalas.js`, D75), az átmenetiben, amit csak LÁTTAM (eldobható, ≤ 20 MB), a kereső-tár
  a megtalálhatóság puha állapota (D107 L1), a fájl-tár a szövegek, képek és a kód tartalom-címzett
  tára.
- **Az állapot nem tárolt, hanem számított (D17).** A lap, a parancssor és a művelet ugyanazt a képet
  számolja (`ketReteg.js` `koinoKepe`) — ezért mond ugyanazt. A lap soha nem kap „mindent”: a pakli
  egy oldalnyi kártyát ad (5.2).
- **Az író (D70).** Egy készüléken több folyamat dolgozik, de koinónként csak egy fűz a tárhoz; a többi
  az aláírt eseményt átadja neki.
- **Ami kívül van, az segédeszköz (2. és 4. szabály).** A DHT nélkül is megy a koino (csak a leszakadt
  társ visszatalálása lassul), és a kézi út hálózat nélkül is.

---

## 2. EGY ESEMÉNY ÚTJA — a kattintástól a másik lapjáig

Anna egy gondolatot ír; Béla ugyanannak a koinónak a tagja, egy másik készüléken. *(A „készülék” itt a
felület és az őrjárat együtt — a két folyamat ugyanazt a kaput és tárat használja.)*

```mermaid
sequenceDiagram
    autonumber
    participant AL as Anna lapja
    participant AK as Anna készüléke
    participant BK as Béla készüléke
    participant BL as Béla lapja

    Note over AL: 👤 Anna: „💡 Új gondolat”<br/>cím, szöveg, kezdő tudatpont
    AL->>AK: POST /api/gondolat<br/>a helyi kapun, jelszóval
    Note over AK: a lánc vége: sorszám, előző,<br/>lánc-gyökér (Merkle) · aláírás<br/>a neve a lenyomata<br/>a szöveg külön darab — D72
    AK->>AK: esemenyMentese → író → tár<br/>a gondolat ÉS a kezdő pont — D14
    AK-->>AL: az új kép — a kártya ott van
    Note over AK,BK: a következő percforduló:<br/>mindkét őrjárat ugyanakkor kopog
    AK->>BK: kopogás → rés → kézfogás
    AK->>BK: NYITÁS — a lenyomat ELTÉR
    AK->>BK: szeletek → tartományok → ESEMENY<br/>+ a fájl-randevún a szöveg
    Note over BK: beolvasztás → esemenyMentese<br/>UGYANAZ a kapu → Béla tára
    BL->>BK: 10 mp-enként: jött új?<br/>az alsó sáv — csere.json
    BK-->>BL: igen — a pakli<br/>csendben frissül
    Note over BL: 👤 Béla látja<br/>Anna gondolatát
    Note over BK: a következő körökben Béla őrjárata<br/>továbbviszi a saját társainak
```

- ⭐ **Ha Béla nem tartja ezt az ágat.** A szigorú (b) óta (D97) egy készülék csak a VÁLLALT szeleteiben
  vesz részt a cserében. A gondolat születése a szülőjénél (a legfelső szintűé a gyökér-darabban) be
  van jelentve (`bejelentesHelyei`), tehát aki azt tartja, a cserében megkapja. Ha Béla semmit nem tart
  belőle, a 7–9. lépés helyett a lapja **kérelmet** ad, amikor a kártyát mutatná (fejlécek, szelet,
  törzs — D92), és a válasz az **átmeneti tárba** kerül.
- A hálózaton minden titkosítva megy (D89/1), de **a bizalom nem a csatornából jön**: Béla gépe az
  aláírást, a láncot és a bizonyítékot maga ellenőrzi.
- A tudatpont, a javaslat és a szavazat ugyanígy utazik; a döntés mindkét gépen ugyanabból az
  eseményhalmazból **számolódik** — senki nem „hirdeti ki” (D17).

---

## 3. AZ ŐRJÁRAT KÖRE — minden ablakban

A kör hossza beállítható (`koino orjarat [perc] [port]` — a telefonon az indító alapból percenként
futtatja). A kör mindig a fal órájához igazodik: az epoch szerinti percfordulóhoz.

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 440}}}%%
flowchart TD
    P(["⏰ a percforduló — a fal órája<br/>a két fél ugyanakkor ébred"])
    CS["a család új koinói<br/>újraindítás nélkül — D119 ⑥"]
    CEL["KIRE KOPOGJAK? — négy forrás<br/>① a kötéseim: ≤ 3 cím, a név a tábla-kulcs<br/>② a friss UDP-címek<br/>③ a koinók céljai: raj, fájl-források,<br/>függő kérelmek, továbbítások, kopogtatók<br/>④ az induló címek — a tars parancs"]
    KI["kimarad: akivel e fél körben már cseréltem,<br/>és azóta nincs újdonságom — D99<br/>aki „később”-t mondott — D109 · saját magam"]
    KOP["🚪 KOPOGÁS — egyszerre mindenkire<br/>a lyukfúrás: a két rés középen találkozik"]
    MU["🤝 MUNKA társanként, a védett résen<br/>válasz vissza · továbbadás · függő kérelem · vagy CSERE<br/>+ fájl-randevú + a család többi közös koinója"]
    UJ{"jött újdonság,<br/>és tart még az ablak?"}
    FEL["feljegyzés a lapnak — csere.json<br/>az alsó sáv: 🔄 2 perce +3 · ⏭ 0:42"]
    HAT["🧹 A HÁTTÉR — egyszerre egy, a kör nem várja meg — D115<br/>hirdetőtábla: a néma kötések új címe · a saját címem, ha változott<br/>háztartás koinónként: címjegyzék a DHT-n · felszabadítás ·<br/>előléptetés · tagsági és döntési csomag · tömörítés ·<br/>kereső-tár · felderítés · a fájl-tár kerete · értesítések"]
    ALV(["💤 alvás a következő percfordulóig"])
    BEK["🔔 közben a kapu MINDIG nyitva — postaláda, D34<br/>aki bekopog, azzal ugyanez a munka indul"]

    P --> CS --> CEL --> KI --> KOP --> MU --> UJ
    UJ -->|igen — még egy menet| KOP
    UJ -->|nem| FEL
    FEL --> HAT --> ALV --> P
    BEK -.-> MU

    classDef kesz fill:#EAF3DE,stroke:#3B6D11,color:#173404
    class P,CS,CEL,KI,KOP,MU,UJ,FEL,HAT,ALV,BEK kesz
```

- ⭐ **Miért a fal órája?** Rést csak az EGYIDEJŰ kopogás nyit, ezért mindenki ugyanahhoz a külső
  ponthoz igazodik — megbeszélés és jelzőpont nélkül. A 30. mérés szerint ritka hálón ez a működés
  feltétele, nem gyorsítás.
- **Az ismétlés.** Egy menetben a hír egy lépést tesz; amíg jön újdonság, a kör újra kopog azokra,
  akikkel a munka sikerült — az ablak végéig (a „buli”).
- **A háttér nem tartja fel a kopogást (D115, 80. mérés).** Ami egyidejűséget kíván (a kopogás), az az
  óra szerint megy; ami nem (a DHT, a takarítás), az ráér.
- **Nem folyamatos kapcsolat (5. szabály).** A kör végén minden elenged, a készülék alszik a következő
  ablakig — de a kapu nyitva marad, mint egy postaláda.

---

## 4. EGY CSERE — két készülék a résen

A párbeszéd **szimmetrikus** (`vonal.js` `parbeszed` mindkét oldalon fut): kliens és szerver nincs, a
két fél ugyanazt mondja. Az ábra az egyik irányt rajzolja.

```mermaid
sequenceDiagram
    participant A as A készülék
    participant B as B készülék
    Note over A,B: a percfordulón mindkettő kopog — a két NAT-rés középen találkozik
    A->>B: kopogás — UDP, ~60 bájt
    B->>A: visszakopogás
    A->>B: kézfogás — egyszeri X25519 kulcs, 33 bájt
    B->>A: kézfogás
    Note over A,B: innen minden csomag titkosítva, AES-256-GCM — D89/1<br/>a munka végén a kulcs elvész: a rögzített múlt később sem nyitható ki
    A->>B: NYITÁS — a koinó, a családja, a közös halmaz lenyomata,<br/>a gyökér-darab és a kereső-régió jele, a tábla-kulcs
    B->>A: NYITÁS
    opt a kiszolgálási keretem betelt — D109
        B-->>A: KÉSŐBB — ennyi mp múlva, tiszta vég
    end
    A->>B: CÍMEK — kiket ismerek · a tábla-kulcs aláírja a kézfogás átiratát
    opt zárt koinó, ismeretlen társ — D93/3
        B->>A: KELL
        A->>B: TAGSÁG — a személyes aláírás, a horgony, a tagsági csomag
    end
    alt a két lenyomat egyezik
        Note over A,B: „nincs újdonság” — KÉSZ, ~1,2–1,7 KB
    else eltérnek
        A->>B: VÁLTOZOTT, ha emlékszünk a legutóbbira — különben SZELETEK
        A->>B: ELTÉRŐ · RÉSZVÉTEL — ki mit vállal, néhány ismert tartóval
        A->>B: TARTOMÁNYOK — mely események hiányoznak
        A->>B: ESEMENY × N · KEREK · BEJEGYZÉS a kereső-régióba
        Note over B: beolvasztás → esemenyMentese — ugyanaz a kapu
        A->>B: TAGSÁGKÉREK → TAGSÁGCSOMAGOK — akinek a tagságát nem tudom
        A->>B: LÁNCKÉREK → LÁNCVÁLASZ — ép-e a szerzők lánca
    end
    A->>B: fájl-randevú: FÁJLKÉREK → FÁJLSZELET … → FÁJLVÉGE<br/>a szöveg mindig — a nem vállaltból ≤ 1 MB magától, D120
    Note over A,B: utána: a kötés és a raj jegyzi a társat, a társ-emlékezet feljegyez,<br/>és ugyanezen a résen a család többi közös koinója — koinónként új kézfogással
```

- **A csere helyett jöhet KÉRELEM is** (D92 — „add ide ezt”): a nyitás helyett `KERELEM`, és a válasz
  szelet (`ESEMENY` × N), fejlécek (`FEJLECEK` → `MINTAKEREK` → `MINTAK` — a szúrópróba), törzs
  (`TORZS` → a fájlok), keresés vagy felajánlás. Ha egy munkában mindkét fél kérne, a kisebbik megy
  elöl, a másik kiszolgálja (az ütközés — a ⑦ terepi lelete).
- **A két szint:** előbb a SZELETEK lenyomatai (melyik szelet tér el), aztán csak az eltérőkben a
  TARTOMÁNYOK (mely események) — a forgalom az eltérések számától függ, nem a koinó méretétől (D74).
- **A társ-emlékezet (F, D98/1):** ha mindkét fél emlékszik a legutóbbi cseréjükre, az első szint
  elmarad, és csak az azóta változott szeletek mennek (70. mérés).

---

## 5. HOGYAN TALÁLJÁK MEG EGYMÁST

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 320}}}%%
flowchart TB
    subgraph ELSO["① az ELSŐ találkozás — a kurbli: az induló címek"]
        direction TB
        M["📨 a meghívó sora — D122<br/>a meghívó címei és tábla-aláírója"]
        T["⌨️ tars cím port<br/>vagy a lapon: 🤝 Társak…"]
        H["📶 helyi felfedezés<br/>ugyanazon a wifin, cím nélkül"]
    end
    KOR(["🔁 az őrjárat köre — kire kopogjak?"])
    subgraph TARTOS["② a tartós kapcsolat — a KÉSZÜLÉKEK között"]
        direction TB
        HT["📋 HIRDETŐTÁBLA — a DHT-n, BEP 44<br/>társanként titkosított rekesz:<br/>„leszakadtam, itt az új címem”"]
        K["🔗 KÖTÉSEK — K = 3, legfeljebb 5<br/>a név a tábla-kulcs, nem a cím<br/>≤ 3 cím, rang szerint — D71"]
        HT -->|a néma kötés új címe| K
    end
    subgraph TARTALOM["③ a TARTALOM szerint — ki tartja, amit keresek"]
        direction TB
        R["🐝 RAJ — szeletenként ≤ 8 tartó<br/>a cserékből tanulva — D91"]
        CJ["📇 CÍMJEGYZÉK — a DHT-n, BEP 5<br/>vakított témák: gyökér-darab,<br/>kereső-régió, kopogtató téma"]
        FK["🙋 FÜGGŐ KÉRELEM — cím nélkül<br/>a tartó témáján jelentkezem,<br/>és mindketten kopogunk — D92/1"]
        CJ --> FK
    end
    ELSO --> KOR
    KOR <-->|a sikeres cseréből kötés — a kör elöl hívja| TARTOS
    KOR <-->|a tartók a kör céljai közé| TARTALOM

    classDef kesz fill:#EAF3DE,stroke:#3B6D11,color:#173404
    class M,T,H,KOR,K,HT,R,CJ,FK kesz
```

- **A cím elromlik, a kötés nem.** A mobilnet és a wifi gyakran vált címet (31. mérés: a leképezés
  percek alatt elhal), ezért a kötés a társ TÁBLA-KULCSÁT jegyzi — ami soha nem az azonosságod (D6) —,
  és ha a társ elnémul, a hirdetőtábláról olvassa ki az új címét. *(35. mérés: hirdetőtábla nélkül a
  kötés-háló egy nap alatt szétesik, vele ~1% szakad le.)*
- **A tartalom útja külön van.** A raj és a címjegyzék azt mondja meg, ki TARTJA azt a szeletet, amit
  keresek („mi kinél van” — D84/2, D91). A téma vakított: kívülálló nem tudja kiszámolni, hol keresse.
- **Két NAT között a függő kérelem.** Ha a tartónak nincs ismert címe, a kérő a tartó készülékének
  kopogtató témáján jelentkezik; a tartó őrjárata ezt látja, és a következő ablakban mindketten
  kopognak (60. mérés: 20% → 76%).
- ⚠️ **Mindez a MEGTALÁLÁS** — ami DÖNT valamiről, az soha nem kíván élő lekérdezést.

---

## 6. AZ E-EMBER ÚTJA — a meghívótól az egyezményig

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 300}}}%%
flowchart TD
    subgraph BEL["1. A BELÉPÉS — D121, D122"]
        direction TB
        A1["a meghívó a lapon: „Meghívóim” → a meghívott neve + nyilatkozat<br/>→ EGY sor: a telepítő és a meghívó · egy hónap · egyszer"]
        A2["a meghívott bemásolja — a telefonon a Termuxba, vagy a lapon: 🔗 Csatlakozás…<br/>telepít · csatlakozik · belép a horgonyával · a meghívó a társa"]
        A3["az első megnyitáskor: a profil-űrlap"]
        A4["az első csere: bizonyítja, hogy nála a titok — HMAC<br/>a meghívó gépe MAGÁTÓL meghív → TAG, az 1. lépcső"]
        A1 --> A2 --> A3 --> A4
    end
    subgraph RES["2. A RÉSZVÉTEL — csak a TAG számít"]
        direction TB
        B1["💡 gondolat — kategória, gondolattípus, szülő"]
        B2["🎯 tudatpont — mindenkinek ugyanannyi, 10 000<br/>nem elkölthető: szétosztható, bármikor átrendezhető"]
        B3["📝 javaslat — csak aki pontot tett a gondolatra<br/>szerkesztési: módosítás · áthelyezés · törlés · egyesítés<br/>általános: a közösség álláspontja — D27"]
        B4["🗳️ szavazás — aki pontot tett rá, egyenlő súllyal<br/>+ érték javaslat a küszöbökre"]
        B5["🤝 EGYEZMÉNY — nem esemény, hanem SZÁMÍTÁS, D17<br/>a bizonyossági mutató szerint, a min/max döntési idő között"]
        B1 --> B2 --> B3 --> B4 --> B5
    end
    subgraph LEP["3. A 2. LÉPCSŐ"]
        direction TB
        C1["felhatalmazás — D60 → három tanúsítás<br/>→ 2. lépcsős: a pénztárca kapuja, D11"]
        C2["💰 a pénz maga"]
        C1 --> C2
    end
    subgraph CSA["4. A CSALÁD"]
        direction TB
        D1["🧬 új koino-verzió: gyermek koinó, a kártyáján a kód"]
        D2["🧳 költözés a gyermekbe"]
        D1 --> D2
    end
    BEL --> RES
    BEL --> LEP
    BEL --> CSA

    classDef kesz fill:#EAF3DE,stroke:#3B6D11,color:#173404
    classDef nincs fill:#F1EFE8,stroke:#888780,color:#444441,stroke-dasharray:5 5
    class A1,A2,A3,A4,B1,B2,B3,B4,B5,C1,D1,D2 kesz
    class C2 nincs
```

- **Egy meghívó elég az 1. lépcsőhöz (D56):** a tagsággal minden mehet — gondolat, tudatpont,
  javaslat, szavazat. A nem tag eseménye nem vész el, csak „függőben” van, amíg a tagsága nem
  bizonyítható (D19, D93/1).
- **A 2. lépcső drága, mert ott a zsákmány:** három tanúsítás felhatalmazott tanúsítótól. A számítása
  kész (szúrópróbával is — D94), a **pénz maga még nincs** a programban.
- **A sorrend a tudatpont felől:** javaslatot csak az tesz, akinek pontja van a gondolaton; a döntés a
  pontosok köréből, a küszöbök a tulajdonosok érték javaslatainak mediánjából jönnek (a részletek a
  [`gepezet.md`](gepezet.md) 1–4. ábráján).

---

## 7. A KOINÓ CSALÁDJA — gyermek, költözés, családi őrjárat

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart TD
    SZ["🌳 a SZÜLŐ koinó<br/>a neve a születése lenyomata — D118/2<br/>a szabályai a születésben"]
    UJ["🧬 Új koino-verzió… — a szülő TAGJA indítja<br/>a gyermek aláírt születése: a szülő, a létrehozó tagsága, a program neve"]
    KV["a KOINO-VERZIÓ KÁRTYA a szülőben<br/>a születés beágyazva + a teljes program kódja<br/>a feltöltő pontot tesz rá — D119"]
    GY["🌱 a GYERMEK koinó<br/>a szülő szabályait és zártságát örökli<br/>a létrehozó a születésével költözik"]
    KI["📤 kiköltözés — a szülőben<br/>itt vezetné ki a pénzt — az még nincs"]
    BE["📥 beköltözés — a gyermekben<br/>a láncom a vágásig + a vágáskori tagság<br/>+ amit elhagyok — KZ3"]
    KEP["🧮 a gyermek KÉPE két rétegben — D118 ③<br/>MÚLT: a szülőé a vágásig — közös, rögzítve<br/>JELEN: a szerkezet mindenkié, a súly csak a költözőké"]
    CSO["🔁 CSALÁDI ŐRJÁRAT — D119<br/>egy őrjárat a közös gyökerű koinóknak<br/>egy társsal egy munka, a közös koinók sorban"]
    SZ --> UJ --> KV
    UJ --> GY
    SZ --> KI --> BE --> GY
    GY --> KEP
    SZ -.-> CSO
    GY -.-> CSO

    classDef kesz fill:#EAF3DE,stroke:#3B6D11,color:#173404
    class SZ,UJ,KV,GY,KI,BE,KEP,CSO kesz
```

- ⭐ **A múlt közös, a jelenlét személyes (D118).** A gyermek a szülőre épül — a szülő eseményei a
  vágásig átírás nélkül, az entitások a régi nevükön —, de a gyermekben súlyt csak az hoz, aki
  beköltözött. A lezárt döntés múlt; a nyitott a költözőkkel folytatódik.
- **A gyermek a kódot is magával hozza (D119 ①).** A koino-verzió kártya „Kód” fülén a teljes program; a
  lap kimondja, ha a készülék más verziót futtat. *(Ez a forráskód-kormányzás 2. szintje — a
  [`kormanyzas.md`](kormanyzas.md).)*
- **A családot egy őrjárat cseréli (D119 ③–④).** A közös gyökerű koinók egy munkában mennek, társanként;
  a független koinók külön családok maradnak (⑤ — külön kötés-jegyzék, külön tábla-rekesz).

---

## 8. ⭐ HOL TARTUNK — a tervezés térképe

A program rétegei a mai állapotukkal, és a nyitott ágak: **honnan indulhat a következő lépés.** A
nyilak a függőséget mutatják (amire épül). A részletek a [`CLAUDE.md`](../CLAUDE.md) „HOL TARTUNK”
szakaszában és az [`alappillerek.md`](alappillerek.md)-ben.

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 460}}}%%
flowchart TB
    ALAP["🧱 AZ ALAP<br/>aláírt esemény · kanonikus alak · a kulcs — D15<br/>az egyetlen kapu · a tár és a mutató · az író — D70, D73<br/>összegző Merkle-fa · lánc-gyökér · lánc-ellenőrzés — D78–D82, D98"]
    SZAM["🧮 A SZÁMÍTÁS<br/>szabályok · entitások · döntés → egyezmény · végrehajtás<br/>— D17, D85<br/>identitás: tagság · 2. lépcső szúrópróbával · kontraszt-jelzés<br/>— D56–D62, D93–D94<br/>a koinó szabályai a születésben · a két réteg — D118"]
    HAL["🌐 A HÁLÓZAT<br/>UDP-kapu · lyukfúrás · titkosítás — D69, D89<br/>szeletenkénti csere · szigorú (b) · közös halmaz<br/>· társ-emlékezet — D74, D97, D98<br/>kötések · hirdetőtábla · DHT-címjegyzék · raj — D71, D91<br/>kérelem · függő kérelem · továbbadás · kiszolgálási keret<br/>— D92, D109<br/>kereső-réteg · felderítés · törzs-határ · több forrás<br/>— D105–D114, D120<br/>családi őrjárat és csere — D119"]
    FEL["🖥️ A FELÜLET<br/>pakli · modálok · alsó sáv · értesítések — D100–D104<br/>tér · csatlakozás · társak · költözés · koino-verzió — D118–D119<br/>meghívás a lapon: Meghívóim + profil — D121–D122<br/>telepítés egy bemásolt sorral — a Termux marad, D30"]
    NY["⏸️ NYITOTT — Csabánál, vagy a terepen mérendő<br/>a telepítő sor a RÉGI programot nem frissíti — döntési kérdés<br/>gyökér-koinó a lapról nem hozható létre<br/>a családi őrjárat terepi leletei — 18. szakasz<br/>a meghívás mellékes megfigyelései<br/>a 🅱️ terep: két mobilnet — kihagyva · IPv6<br/>régebbi kérdések: véletlen séta · olcsóbb tábla-kulcs ·<br/>a fájl-bájtok kézi útja · a hívás ötlete"]
    NI["○ MÉG NINCS<br/>a pénz — a 2. lépcső pénztárcája,<br/>a kiköltözés kivezetése<br/>a forráskód-kormányzás 2. és 5. lépcsője:<br/>az elismerés és a sürgősségi út — N9"]
    ALAP --> SZAM
    ALAP --> HAL
    SZAM --> FEL
    HAL --> FEL
    FEL --> NY
    FEL --> NI

    classDef kesz fill:#EAF3DE,stroke:#3B6D11,color:#173404
    classDef nyitott fill:#FAEEDA,stroke:#854F0B,color:#412402
    classDef nincs fill:#F1EFE8,stroke:#888780,color:#444441,stroke-dasharray:5 5
    class ALAP,SZAM,HAL,FEL kesz
    class NY nyitott
    class NI nincs
```

**A nyitott ágak, egy mondatban mindegyik** (hol a részlet):

- **A régi program frissítése** — a telepítő sor egy már telepített, régebbi programot NEM frissít, és a
  régi kód az új meghívót nem fogadja el; hogy frissítsen-e, az döntési kérdés (D119: a program nem
  frissül magától). → [`meghivas_atvizsgalas.md`](meghivas_atvizsgalas.md) 8. szakasz.
- **Gyökér-koinó a lapról** — gyermeket már lehet a lapról (a fő menü „🧬 Új koino-verzió…”), de egy
  független, új koinót csak a `koino "<név>"` parancs hoz létre.
- **A családi őrjárat terepi leletei** (2026-11-01) — a többi között: a DHT-n a vakított témáinkon
  idegen címek is jelentkeznek, és a kör rájuk is kopog (~0,9 MB/nap); a jegyzetlen becenévvel a program
  csendben üres, régi alakú koinót indít; a lap a megjegyzett entitást a rossz koinóban kéri; és a „⚠ más
  programverzió” minden frissítés után megjelenik. → [`csaladi_orjarat_atvizsgalas.md`](csaladi_orjarat_atvizsgalas.md)
  18. szakasz, „Még nyitott leletek”.
- **A meghívás mellékes megfigyelései** (2026-11-04) — az üres koinó alapítójának lapja is „a hiányzó
  részek tartóit még keresem”-et ír, és a meghívó címei közé a gép virtuális hálókártyájáé is bekerül.
  → [`meghivas_atvizsgalas.md`](meghivas_atvizsgalas.md) 8. szakasz vége.
- **A terep 🅱️** (két mobilnetes telefon — Csaba: „ezt hagyjuk ki”) és **az IPv6** (egy második út a két
  mobilnet közé; az értéke a terepen derülne ki).
- **Régebbi döntések** — a véletlen séta, az olcsóbb tábla-kulcs, a fájl-bájtok kézi útja, a hívás
  ötlete: a [`CLAUDE.md`](../CLAUDE.md) „Régebbi nyitott döntések” listája.
- **Ami még nincs:** a **pénz** (a 2. lépcső számítása kész, a pénztárca maga nem — a kiköltözés lesz a
  kivezetés helye), és a forráskód-kormányzás **elismerés-** és **sürgősségi** lépcsője (N9 — a
  [`kormanyzas.md`](kormanyzas.md) „Az öt lépcső”).

⚠️ *A kisebb, mérendő ügyek (az időzítés-érzékeny próbák egyszeri bukásai, a „még nem jött meg” felirat
a hiányzó szövegnél) nem kerültek az ábrára — a [`CLAUDE.md`](../CLAUDE.md) „Kisebb nyitottak”
blokkjaiban állnak.*
