# A G — a címjegyzék („mi kinél van”): átvizsgálás a döntés előtt

*2026-10-03 · a végleges sor ④ lépése · a skálázási terv S10 (előbb irodalmi átvizsgálás) és SK7 (hash-DHT, bizalmi
háló vagy középút) pontja. Ez a dokumentum a DÖNTÉS ELŐTTI átvizsgálás: a követelmények, a terep valósága, az
irodalom, a jelöltek, egy javaslat, és a mérések, amik a döntés után az építést megalapozzák.*

> *„a meta adatok, amik megmutatják, hogy mi kinél található, azt több helyen kell tárolni, és biztosítani, hogy
> az egész hálózat tudja, vagy tudja azt, hogy ki tudhatja."* — Csaba, 2026-10-01 (D84/2)

## 1. Mit kell tudnia — a követelmények (a meglévő döntésekből)

1. **A „végtelen” (9. szabály):** egy készülék terhe ne a koinó méretétől függjön, hanem a saját vállalásától;
   ahol elkerülhetetlen (egy keresés), legfeljebb logaritmikusan nőjön.
2. **A zárt koinó (D89/2):** a címjegyzéke nem kerülhet olyan nyilvános helyre, ahonnan kívülálló kiolvashatja,
   kik a résztvevői.
3. **Elhagyható (2. szabály, 5.7):** ha a G nem működik, a koinó működik — a csere, a döntés, a bejárás nem függhet
   tőle. *Ami dönt, ne kívánjon élő lekérdezést; csak a megtalálás kívánhat.*
4. **Bizalom nem jár vele (3. szabály, 4.2):** a cím nem esemény; a hamis cím elérhetetlenséget okoz, nem hamisítást.
5. **Név nélkül (SK2, D6):** a bejegyzés egy készülék-azonosító (tábla-aláíró) és egy utolsó cím — a személyhez
   soha nem köthető.
6. **Csak a VÁLLALT szeletet hirdetjük, a megnézettet soha** (D75/3: elárulná, mit néztem meg).
7. **Bárki kiszámolja, ki tudhatja (D84/2):** a hash-elhelyezés — nem kell előre tudni, kit kérdezz.
8. **A gyökér (D90):** a legfelső szintű születések listája lenyomat szerinti darabokban, több helyen.
9. **Az adat kicsi marad (6. szabály):** a hirdetés és a keresés napi forgalma korlátos és kicsi.

## 2. A terep valósága — amit a „tudni, ki tartja” nem old meg

⚠️ **Tudni, hogy valaki tartja, nem ugyanaz, mint elérni.** NAT mögött két készülék csak akkor beszél, ha mindkettő
kopog (a „buli”, D33); ma ezt a **kötés-háló** (K = 3–5 társ, D71), a **hirdetőtábla** (a kötött társ új címe,
titkosítva a BitTorrent-DHT-n, 36.) és a **postaláda** (`figyel`, aki fogadni tud) adja. A G ezért egy készülék-
azonosítót és egy utolsó címet ad; az ELÉRÉS a kötéseken, a postaládákon és a kérelem továbbadásán (D) múlik.
*Ez a G határa, nem hibája: a „ki” és a „hogyan érem el” két külön kérdés.*

⭐ **A mérés (2026-10-03, ezen a gépen, a valódi BitTorrent-DHT-n — a 36. mérés eszközével):** egy feltevés
**48 kérdés, 22,3 mp**; egy keresés első érvényes találata **4,1 mp** (a teljes keresés 22,7 mp, 55 kérdés). Egy
DHT-művelet tehát nagyjából **50 kérdés ≈ 5–10 KB** forgalom. ⛔ **Ebből a fontos határ:** ha minden készülék minden
vállalt szeletét félóránként meghirdetné, az 100 szeletnél **napi több tíz MB** — a 6. szabály ellen. A DHT tehát
csak TAKARÉKOSAN jöhet szóba: kevés, ritka hirdetésre, és igény szerinti keresésre.

## 3. Az irodalom — mit tanít, röviden

- **Kademlia és a BitTorrent mainline DHT** (BEP 5 — „ki tartja ezt a lenyomatot”: `get_peers` / `announce_peer`; BEP
  44 — aláírt adat). Bevált, milliónyi gép, logaritmikus keresés. A hirdetés MULANDÓ, időnként meg kell ismételni.
  ⚠️ Klasszikus gyengéje: bárki sok azonosítót vehet fel, és odaállhat egy célkulcs mellé (Sybil).
- **IPFS (libp2p Kademlia, „provider record”):** minden blokk meghirdetése a nagy tárolóknál nem skálázik (a
  „reprovide” gondja) — a gyakorlat az, hogy csak a gyökereket hirdetik, a többit a gyökérből bejárják. ⭐ Ez
  pontosan a koinó fája: **hirdess keveset, járd be a többit.**
- **Hypercore / Hyperswarm:** a téma (topic) egy titok lenyomata — aki nem ismeri a titkot, nem tudja kiszámolni, hol
  keresse; a DHT-n csak a lenyomat látszik. ⭐ Ez a zárt koinó mintája: **a koinó azonosítója a só.**
- **Whānau (2010), a Freenet „darknet” módja:** a társas gráfra épített, Sybil-ellenálló útvonalválasztás (véletlen
  séták). Erős, de bonyolult kód, és a társas hubokra torlódik — a skálázási terv 5.3 ezért javasolt középutat.
- **Scuttlebutt, Briar:** csak a barátok között terjed, nincs globális megtalálás — a koinó kötés-hálója és a
  „kitől kaptam” ehhez a családhoz tartozik.

## 4. A jelöltek

**C1 — A FA ÉS A RAJ (a skálázási terv 4.2, Csaba ötlete), DHT nélkül.** Aki egy szeletet vállal, azt VALAKITŐL kapta
(a `hozd`, a D kérelme vagy a csere) — tehát ismer legalább egy tartót. A tartók a szelet cseréjekor egymás tábla-
aláíróját és utolsó címét is átadják (a `CIMEK` mintájára, szeletenként korlátos listában, név nélkül), és a szülő
tartói a gyerekek születésével együtt néhány tartójuk aláíróját is ismerik — a böngészés így a fa bejárása, minden
lépés megadja a következő lépés címeit. ⭐ Mind a titkosított cserén belül (a zárt koinó semmit nem tesz nyilvános
helyre), a terhe a saját vállalással arányos. ⚠️ Ami hiányzik belőle: a **gyökér** (a legfelső szinthez nincs
szülő), és a **közvetlen keresés azonosító alapján**, ha nincs fa-út (egy hivatkozásból).

**C2 — HASH-DHT A KOINÓ SAJÁT KÉSZÜLÉKEIN (belső Kademlia).** Minden készüléknek koinón belüli azonosítója és
útvonal-táblája van (log N), a szelet lenyomata megmondja, mely készülékek őrzik a „ki tartja” bejegyzést. ⭐ Nem
függ külső hálótól. ⚠️ Saját útvonal-tábla és karbantartás (több kód — 6. szabály), és a Sybil ellen az E kell
(a tartó azonosítója a bizonyított identitásból jöjjön — 5.6).

**C3 — A BITTORRENT-DHT, VAKÍTOTT TÉMÁVAL (BEP 5).** A téma `H(„koino-g” ‖ koinó-azonosító ‖ szelet)`: aki nem
ismeri a koinó azonosítóját, nem tudja kiszámolni (a Hyperswarm mintája); a „ki tartja” bejegyzést a meglévő,
milliós háló őrzi. ⭐ Nincs saját útvonal-tábla, a DHT-kliens és a belépés már megvan (36.). ⚠️ Ára ~5–10 KB
műveletenként, a hirdetés mulandó; a DHT-gépek látják, hogy egy IP egy (értelmezhetetlen) lenyomatot hirdet; és a
háló nem a miénk (a 2. szabály szerint ezért cserélhető és elhagyható kell legyen — mint a tábla).

**C4 — KÖZÉPÚT (5.3):** a társak a bizalmi hálóból, a kiosztás hash szerint — a C2 az E-ből vett azonosítókkal.

## 5. A javaslat

⭐ **A „mi kinél van” FŐ ÚTJA a C1 (a fa és a raj)** — mert a koinó fája maga az útvonal-gráf (4.2), a hirdetés a
cserén belül marad (a zárt koinó is biztonságban), és a terhe a saját vállalással nő. ⭐ **A hash-elhelyezés CSAK két
helyen kell:** (1) a **gyökér darabjai** (D90 — egy készülék a saját lenyomata szerint néhány darabért felel, és
azokat hirdeti), (2) a **közvetlen keresés azonosító alapján** (gyorsító, elhagyható). Így a DHT-forgalom
készülékenként néhány hirdetés, és igény szerinti keresés — nem szeletenkénti.

**A hash-elhelyezés közege (SK7) — ezt kell eldönteni:** a **C3 most** (a meglévő BitTorrent-DHT, vakított témával
— cserélhetően, mint a tábla), és a **C2 / C4 az E után**, ha a Sybil-veszély ott valósnak bizonyul (a hash-elhelyezés
a C3-ban bárki által elfoglalható pozíció, de a C1 fő útja nem függ tőle, és egy hamis bejegyzés csak elérhetetlenséget
okoz).

## 6. A mérések (az építés első lépése)

- **58. — a BEP 5 a valódi DHT-n:** hirdetés és keresés vakított témával — sikeresség, idő, kérdésszám, bájt; két
  készülékről, NAT mögül is. *(A mai 48 / 55 kérdés a BEP 44-é; a BEP 5 várhatóan hasonló.)*
- **59. — a raj kialakulása (szimuláció):** a „kitől kaptam” + a tartók közti címcsere mellett hány tartót ismer egy
  tartó, szétesik-e a raj a lemorzsolódásnál, mekkora a címlista szeletenként.

## 7. Nyitott, a döntés után

- **A nagy szülő** (a skálázási terv 4.6 — tömeges entitás): a több tízezer gyerekű szülő gyerek-címjegyzéke ugyanúgy
  darabolandó, mint a gyökér.
- **A példányszám** (hány helyen él egy gyökér-darab) közösségi paraméter (D13/c), a mért elérhetőségből (5.2).
- **Az elhalványulás (5.7):** a bejegyzés csak addig él, amíg valaki tartja — a hirdetés mulandó, a megismétlése a
  vállalóé.
