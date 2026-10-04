# A B/3 ÁTVIZSGÁLÁSA — a szigorú (b) bekapcsolása (2026-10-04)

*A VÉGLEGES SOR ⑦ lépése ([`alappillerek.md`](alappillerek.md) 4.). Az előfeltételek (G, D, E) készen állnak. Ez a lap
összegyűjti, mit mondanak a meglévő döntések, mit csinál ma a kód, mit mért a 66. mérés, és melyik kérdés Csabáé.*

## 1. Mit kell tudnia — a meglévő döntésekből

- **D72/1 (b):** egy készülék a SAJÁT érdeklődését tartja. *Nem köztes állapot: a szerkezet és a szabály együtt épül.*
- **D75 + D86:** a TARTÓS tár = a tudatpontos szeleteim (a megszavazott javaslat is) + a saját azonosság-szeletem; a
  máshová írt saját eseményeimet eseményként megtartom és kiszolgálom (D86/2); a visszavett pontú szelet átkerül az
  átmenetibe (D75/1); az ÁTMENETI tár mindent kiszolgál a törzs kivételével (D75/3); a D14 csak a tartósra (kész).
- **D83/2 + D84/1:** a TÖRZSET (szöveg-darab, fájlok) alapból csak a vállaló szolgálja ki, készülékenként „mindent” is
  beállítható; az ESEMÉNYEKET kiszolgálja, akinél megvannak.
- **D84/3:** nincs köztes állapot — a szigorú (b) a B végleges alakja.
- **D85 T3:** a részvételbe a döntési csomag szabálya is beletartozik: azok a TÖREDÉK-szeletek, amelyek érintettjét
  vállalom, és amelyek saját része valamikor igent mondott.
- **D90:** a gyökér (a legfelső szintű születések listája) nem vállalás, hanem a G osztja szét darabokban; a koinó
  születését mindenki tartja (kész).
- **D93/1 (E1):** a döntésben csak az ellenőrzött tag számít — tehát a vállalt szeleteim SZERZŐINEK tagsága is kell.
- **A skálázási terv 4.6 (SK8 — „van válasz”):** a tömeges entitásnál *a teljes halmazt csak aki vállalja*; a pont-tartó
  a gyökeret és a saját szavazatát tartja, és az összegző Merkle-fa bizonyítja a végösszeget.

## 2. Ami ma megvan — és ami még a mai módon fut

Kész: a vállalás számítása (`vallalas.js`), a két tár (`atmenetiTar.js`), az előléptetés, a `hozd` az átmenetibe, a
raj (a csere `RESZVETEL`-je már mondja, mit vállalok), a kérelem (D92: szelet, fejlécek, törzs — a törzs csak a
vállalótól), a döntési csomag (D85 T3), a zárt koinó kapuja (E3), a tagsági csomag (E2).

**A mai módon fut** (D84/3 szerint ezt váltjuk le): a csere MINDEN szeletben részt vesz (a `parbeszed` `reszvesz`-ét a
`koino.js` nem adja meg), és mindent a tartós tárba hoz; a fájl-randevú minden meglévő fájlt kiszolgál (a D84/1 korlátja
nincs bekötve, a „mindent” beállítás nincs); a kérelem szelet-kiszolgálása csak a tartós tárból felel; a visszavett
vállalás nem kerül át az átmenetibe; a gyökér egészében cserélődik.

## 3. A 66. mérés — egy készülék terhe a szigorú (b) alatt

[`eredmenyek.md`](../koino/meres/eredmenyek.md) 66. A szigorú (b) a tárolást drámaian csökkenti: egymillió tagnál a mai
„mindent tárol” 7,1 GB, a szigorú (b) alatt a készülékek 95%-a ~20 MB-ot tart. ⛔ **De két dolog a koinó méretével nő:**

- **A népszerű entitás.** Aki egy népszerű gondolatra tesz pontot, annak a szeletét egészében tartja (minden pont-tartó
  eseményét). A 95% tárolása ~√N szerint nő: 1 159 → 4 074 → 11 561 → 36 957 esemény 1 000 → 1 000 000 tagnál.
- **A szerzők tagsága (a D93/1 ára).** A vállalt szeletek minden szerzőjének tagsági bizonyítéka kell: a 95%-nál 1 000 000
  tagnál ~36 000 szerző, ~570 MB (a láncok megosztásával kevesebb, de ugyanígy nő).

⭐ **A két fokú vállalás** (a skálázási terv 4.6): ha egy szelet nagyobb egy küszöbnél (a mérésben 1000 esemény), a
pont-tartó csak a születést, a saját eseményeit, a szelet összegző gyökerét és néhány mintát tart. Ez **konstans**: a
koinó méretétől függetlenül ~2 300–2 800 esemény és ~2 300 szerző tagsága a 95%-nál, mert a nagy szeletnél a minták
szerzőinek tagsága kell csak.

## 4. A kérdések — javaslattal (D-szintűek, Csabáéi)

**B1. A tömeges entitás: két fokú vállalás a B/3-ban?**

- **(A) ⭐ Igen — ezt javaslom.** A szelet mérete szerint két fok: a KIS szeletet (≤ küszöb, kiindulásnak 1000 esemény —
  helyi mennyiség, mint a D94 kerete) a pont-tartó egészében tartja; a NAGY szeletből csak a születést, a saját eseményeit,
  a szelet összegző gyökerét (a pont-tartók és pontjaik állapot-fája — az A pillér fája, a D92/5 össz-pontjának szelet
  szintű párja) és k mintát (a minta szerzőjének tagságával). A teljes nagy szeletet az ÖNKÉNTES tartja (a „mindent”
  beállítás, D83/2) és a szerzői a saját eseményeiket. A nagy szelet döntéseit (a javaslat támogatottsága, a részvétel) a
  pont-tartó az ellenőrzött összegzésből számolja — a gyökér és a minták a cserében érkeznek, és tárolva maradnak, tehát
  a döntés pillanatában nincs élő lekérdezés. Ha senki nem tartja egészében, a döntés „nem ellenőrizhető” (D19). ⚠️ Ez a
  B/3 legnagyobb új része: a nagy szelet csere-alakja (gyökér + minták a halmaz helyett) és a döntés számítása
  összegzésből.
- **(B) Nem most — mindenki a teljes szeletet tartja**, a két fokú vállalás a ⑧-ban. Egyszerűbb, de a „végtelen” próbáján
  közben elbukik (a D84/3 köztes állapota volna).
- **(C) Mindig összegző** (küszöb nélkül, a kis szeletnél is). Egy szabály, de a kis koinó elveszti a pontos, egyszerű
  ítéletet, és minden döntés mintákon áll.

**B2. A szerzők tagsági bizonyítéka a szigorú (b) alatt — hogyan jut el?**

- **(A) ⭐ A cserében, kísérőként — ezt javaslom.** A szelet cseréje után akinek a tagságát nem tudom, annak a tagsági
  csomagját a társtól kérem (egy új lépés: a szerzők listája → a csomagjaik); a csomag a vállalt szeletek kísérőjeként a
  tartós tárba kerül (a csere-részvételt nem bővíti). Szerzőnként egyszer.
- **(B) Kérésre** (a D kérelmének egy új fajtája), a függő kérelmek útján — lassabb, a „tagsága függőben” állapot tovább
  tart.
- **(C) A csomag bejelentése minden szeletbe, ahol a szerző dönt** — szeletenként ismétlődne (~16 KB / szerző / szelet).

**B3. A saját eseményeim mások szeleteiben (D86/2) — hogyan jutnak el a szigorú (b) alatt?** *(pl. a meghívás a
meghívotthoz, a tanúsítás, az ellentmondás-bejelentés — a címzett szeletét nem én vállalom)*

- **(A) ⭐ Csak küldő részvétel — ezt javaslom.** Abban a szeletben, ahol saját eseményem van, de nem vállalom, a cserében
  részt veszek, de csak a sajátjaimat küldöm, és onnan semmit nem kérek és nem veszek át. A címzettnek nem kell tudnia,
  hogy kérnie kell.
- **(B) Csak kérésre** — a címzett kéri a saját szeletét (az E3 kapu ezt a nem tagnak is engedi); de honnan tudná, hogy
  van mit kérnie?

**B4. A gyökér darabjai a cserében (D90)**

- **(A) ⭐ A darab „szeletként” cserélődik — ezt javaslom.** Egy darab kulcsa a mélység és a darab lenyomata; a halmaza a
  gyökérhez bejelentett születések közül azok, amelyek a darabba esnek. Mivel a mélységet ki-ki a maga ismerte legfelső
  szintű gondolatok számából számolja (és ez eltérhet), a készülék a darabjában ±1 mélységen is részt vesz — így a
  szomszédos mélységet számolók is találkoznak. A terhe darabonként ~256 születés (D91/3).
- **(B) A gyökér nem cserélődik**, a darab tartója kérelemmel frissít a raj többi tartójától — de akkor egy új legfelső
  szintű gondolat születése csak a szerzőjénél van meg, amíg valaki nem kérdez.

## 5. Ami nem igényel döntést (a megépítés része)

- **A részvétel** a vállalásból (a tudatpontos szeletek, az azonosság-szelet, a koinó születése) + a töredék-szeletek a
  D85 T3 szerint + a B3 csak küldő szeletei + a B4 darabjai.
- **A törzs kiszolgálása** a D84/1 szerint a fájl-randevúban is (csak a vállalt entitások törzse), és a **„mindent”
  beállítás** (D83/2 — helyi, készülékenként).
- **A kérelem** szelet-kiszolgálása az átmeneti tárból is (D75/3).
- **A visszavett vállalás** → az átmeneti tár (D75/1): a tartós tár ritka újraírása (D73 — mint a `git gc`); a saját
  eseményeim maradnak (D86/2).
- **A megnézett frissítése** kérésre (a kártya megnyitásakor a D kérelme).
- **A telefon frissítése** — újabb tiszta törés (a részvétel és a két fokú csere-alak).

## 6. A javasolt sorrend (ha a javaslatok szerint dől el)

1. **A két fokú vállalás** (B1/A) — a nagy szelet összegző gyökere és mintái, a csere-alakja, és a döntés számítása
   összegzésből (előbb mérés: a gyökér és a minták ára a cserében, és a küszöb).
2. **A tagsági csomag a cserében** (B2/A) és **a csak küldő részvétel** (B3/A) — ugyanaz a vonal-réteg.
3. **A gyökér darabjai** (B4/A).
4. **A bekapcsolás:** a részvétel a vállalásból, a törzs korlátja, a kérelem az átmenetiből, a visszavett vállalás —
   próbákkal (a „végtelen” próbája: egy készülék terhe a saját érdeklődésével arányos).
