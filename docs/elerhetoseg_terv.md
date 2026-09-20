# AZ ELÉRHETŐSÉG TERVE — kötés-háló · buli · hirdetőtábla · őrjárat

*(2026-09-20, Csaba kérésére. ⛔ Ez TERV: eldöntendő pontokkal. A kód a jóváhagyás után épül.)*

## 1. A kérdés, egy mondatban

**Hogyan talál meg két készülék egymást holnap is, ha mindkettő mobilneten van, egyikük sem
fogadóképes, és a címük naponta többször megváltozik?**

A választ négy mérés keríti be, és mindegyik **szűkíti**, mit szabad tervezni:

- **31/b (mobil leképezés):** a bemondott cím **330 mp csendet is túlél**, és célfüggetlen →
  *az 5 perces buli-köz külön életjel nélkül is átvészelhető.*
- ⛔ **36/d (mobil szűrés):** **idegent a mobil NAT nem enged be** → *új kapcsolatot CSAK a
  kölcsönös kopogás nyit. Nincs „nyitott ajtó" telefonon.*
- ⛔ **35 (kötés-háló):** mentés nélkül a háló **egy nap alatt szétesik** (a hálózatváltás
  minden kötést elvisz) → *a mentés nem kényelem, hanem feltétel.*
- ⭐ **35 + 36 (hirdetőtábla):** a tábla **mérettől függetlenül** tart (~1% leszakadva), és a
  valódi DHT-n a feltevés/keresés **~20 mp** az 5 perces ablakban, 6,6 óra múlva is megvan.

⭐ **A négyből együtt egy szerkezet következik, nem négy ötlet:** *a kötés tartja, amíg él; a
buli adja az egyidejűséget; a tábla hozza vissza, ami elszakadt; az őrjárat mindezt futtatja.*

## 2. A négy darab és a dolga

| Darab | Mit old meg | Mit NEM old meg |
|---|---|---|
| **Kötés-háló** (3 társ, véletlen séta) | a csendből jövő elévülés; a társ mindig elérhető marad | a hálózatváltást (35.) |
| **Buli** (percfordulós ablak) | az egyidejűség — enélkül a kopogás nem talál rést (36/d) | a címet nem tudja, csak az időt |
| **Hirdetőtábla** (DHT) | a leszakadt visszatalál: kiírja az új címét, a társai kiolvassák | nem szállít adatot, csak címet |
| **Őrjárat** | ez futtatja mindet; ma TCP-n cserél, és a kaput postaládaként tartja | — |

**A kör, ahogy majd fut (egy ablak):**

1. **Ébredés a percfordulóra** (megvan: 30. mérés).
2. **Ha valamelyik kötésem néma volt a múlt ablakban → olvasok a tábláról** (az ő rekeszét).
3. **Kopogás egyszerre minden kötött társra** a legfrissebb címükre (pajzsfúrás, UDP).
4. **Csere a résen** — és a csere maga is címcsere (34.: *a találkozás MAGA a terjesztés*).
5. **Ha a saját külső címem megváltozott → kiírom a táblára** (mindegyik társam rekeszébe).
6. Az ablak végén elenged mindent (5. szabály).

## 3. Mi van már meg, és mi hiányzik

✅ **Megvan:** a percfordulós ablak és az ismétlődő menet (30.) · a pajzsfúrás és a csere a
résen (17., 19., 32.) · a fájl-randevú · a friss UDP-cím jegyzéke és terjesztése a cserén
(`udpcimek.json`, 33.) · a DHT-kliens mérőeszközként (`js/csere/dht.js`, 36.).

⛔ **Hiányzik:** *(1)* **az őrjárat UDP-re állítása** — ma `csereVonalon` (TCP), a kaput a
`figyeloIndulasa` nyitja · *(2)* **a kötések nyilvántartása** (kit tartok, mikor hallottam
utoljára) · *(3)* **a tábla bekötése** (írás címváltáskor, olvasás néma kötésnél) · *(4)* a
**cím-korlát** olcsóbbra vétele.

⚠️ **És egy tény, amit ki kell mondani:** a friss cím jegyzéke ma **write-only** — gyűlik és
terjed, de semmi nem tárcsáz róla, mert az őrjárat TCP-n cserél. *A 33. mérés bájtjaiért ma nem
kapunk semmit.* Ezt az (1) lépés hozza meg.

## 4. ✅ A DÖNTÉSEK — Csaba válaszai (2026-09-20)

### (a) Ki olvashatja a táblát? — a kulcs és a titkosítás (D6)

⛔ A tábla **nyilvános hely**: a DHT-n bárki kiolvassa azt a rekeszt, akinek megvan a kulcsa,
és a bejegyzés **a készülék IP-címe** — vagyis a tartózkodási helyed nyoma.

**A javaslatom (három réteg, mind olcsó):**

1. **Külön kulcs, nem az azonosságod.** A tábla-kulcs **nem** a koino-kulcsod: ha valaki figyeli
   a táblát, ne tudja hozzákötni a személyedhez. *(Ugyanaz az elv, mint mindenhol: két kérdés,
   két kulcs.)*
2. **Társanként külön rekesz** (a BEP 44 „só" mezője) — így egy társad nem látja, kinek még
   írtál, és nem tudja végigolvasni a köreidet.
3. **A tartalom titkosítva** annak az egy társnak (AES-GCM, beépített WebCrypto — nulla
   függőség). A közös titkot **a találkozáskor** cseréljük, a már hitelesített csere-csatornán;
   nem kell hozzá új kulcs-matematika.

✅ **CSABA DÖNTÉSE: elég a külön kulcs — NINCS forgatás.** *(„igazából nem tudom, hogy milyen
visszaélések történhetnek akkor, ha nem titkos cím esetében.")* ⭐ **A titkosítás marad**, mert
gyakorlatilag ingyen van, és három valódi visszaélést zár ki:
1. ⛔⛔ **A bejegyzést IDEGENEK tárolják** — nem egy „tábla", hanem 7–8 véletlen internetes gép
   (36. mérés). Nyílt tartalomnál ők látják az **állandó kulcsot és mellette a címedet**, tehát
   hónapokon át összefűzhetik: mikor voltál otthon, mikor mobilneten, mikor utaztál.
2. **Az állandó kulcs maga is azonosító** — a hálózataidat akkor is összeköti, ha a tartalom
   haszontalan lenne. *(A forgatás EZT szüntetné meg; Csaba szerint ez az ár nem éri meg.)*
3. A cím ismerete **támadási felület** (kopogtatás, terhelés) — a kisebbik baj, mert a csere
   úgyis ellenőriz mindent (3. szabály).
⚠️ **Amit a titkosítás NEM old meg, és ezt kimondjuk:** a **társaid** előtt a cím amúgy sem
titok (a cserén ma is nyíltan utazik) — ez a tárolók és a véletlen megfigyelők elleni védelem.

### (b) Cserélhető tábla és kézi út (2. és 4. szabály)

A DHT **nem lehet előfeltétel**: a program egy *„tábla"* nevű illesztőt hívjon (*kiír* /
*kiolvas*), és a DHT ennek **egy** megvalósítása legyen. ⏸️ **Döntés:** épüljön-e mellé
azonnal a **webes tábla** is → ✅ **CSABA: NEM, elég a DHT és a kézi út.** ⭐ **A kézi út mindenképp kell** (4. szabály): a `tars <cím>` és a helyi
felfedezés ma is megvan — *a tábla a kurblit automatizálja, nem váltja ki.*

### (c) A megismert DHT-gépek átadása a társak között

⛔ A közismert belépő-gépek korlátoznak (36.: 5-ből 2 kör elakadt rajtuk). ⭐ A megoldás a
mérésben már bevált: **a készülék a saját emlékezetéből indul** (belépő nélkül 10/10). ⏸️
**CSABA: IGEN** — a csere adjon át néhány megismert DHT-gépet, így egy friss telepítés
az első buli után **független a közismert belépőktől**. ⚠️ Az ára: pár száz bájt körönként, és
ezt a (d) döntéssel együtt kell nézni.

### (d) A cím-korlát (a 34. mérés óta nyitva)

Ma **10 idegen cím** utazik körönként (~96 bájt darabja; a „nincs újdonság" kör 386 → 1346
bájt). ⛔ A 34. mérés szerint **a szám nem számít** (K=0 és K=10 között nincs mérhető
különbség), mert a találkozás maga is címcsere. ⭐ **A javaslatom: a saját cím mindig menjen,
másoké 10 → 3.** *(Nullára is vihető, de a 3 olcsó, és a kötésen kívüli véletlen találkozásokat
segíti.)* ✅ **CSABA: rendben — 3.**

### (e) Mikor írunk és olvasunk a tábláról? — ✅ **CSABA: rendben (eseményre)**

⭐ **Eseményre, nem órára.** Írunk, ha **megváltozott a saját külső címünk**;
olvasunk, ha **egy kötött társ egy ablakot kihagyott**. *Így egy nyugodt napon a tábla
forgalma nulla* — szemben az időzített írással, ami akkor is dolgozik, ha nincs mit mondani.
⚠️ Ezt mérni fogjuk: a 35. modell 5 perces ablakkal számolt, és a 36. szerint egy feltevés
~20 mp — vagyis belefér, de a valódi számot a bekötés után kell megnézni.

## 5. A megépítés sorrendje (a függőségek szerint, nem a látványosság szerint)

1. **Az őrjárat UDP-re** — ez minden változathoz kell, és a mobil mérésektől független. Ettől
   lesz a mai cím-jegyzék hasznos (ma write-only), és ettől jut el a koino odáig, hogy két
   telefon **magától** összeérjen.
2. **A kötések nyilvántartása** (3 társ, véletlen séta, „mikor hallottam utoljára").
3. **A tábla illesztő + a DHT mögé** — az (a)–(c) döntések szerint.
4. **Terepmérés két valódi mobillal**, a teljes körrel.

⚠️ **A 9. szabály próbája mindegyik darabon:** a kötésszám **felülről korlátos** (3, legfeljebb
5) · a tábla **rekeszenként** címzett, nem egy listát tart · a keresés a DHT-ben
**logaritmikus** · a cím-korlát **szám szerint** korlátos. *Egyik darab sem kíván globális
listát vagy központot.*

## 6. Amit szándékosan NEM építünk

- ⛔ **Nincs saját szerver, jelzőpont, továbbító** (2. szabály). A DHT gazdátlan, a webes tábla
  cserélhető és elhagyható.
- ⛔ **A tábla SOHA nem hordoz koino-adatot** — csak címet, titkosítva. Az események útja
  változatlanul a csere, egyetlen kapuval (3. szabály).
- ⛔ **A tábláról jövő cím NEM bizalom.** Attól, hogy egy cím a táblán állt, még semmit nem
  fogadunk el: a csere ugyanúgy ellenőriz, mint eddig.
