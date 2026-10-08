# A BEKAPCSOLÁS ÁTVIZSGÁLÁSA — a szigorú (b) élesítése (2026-10-06)

*A B/3 (⑦) utolsó lépése ([`b3_szigoru_atvizsgalas.md`](b3_szigoru_atvizsgalas.md) 6.). A D95 négy darabja megépült (B1 a
két fokú vállalás, B2 a tagsági kísérők, B3 a csak küldő út, B4 a gyökér darabjai), a D96 eldőlt. Hátra van, hogy a csere
részvétele a vállalásból jöjjön. Ez a lap összegyűjti, mit kell bekapcsolni, mit mért a 68. mérés, és melyik kérdés
Csabáé.*

## 1. Mit kapcsol be

- **A részvétel a vállalásból:** a csere csak a vállalt (egészében tartott) szeletekben vesz részt — ma minden szeletben
  (a `reszvesz` csak az összegzett nagy szeletet zárja ki). Vele a D85 T3 töredék-részvétele (a töredék-szeletek, amelyek
  érintettjét vállalom, és amelyek saját része valamikor igent mondott), és a **D96**: a koinó születésének szeletében
  csak az alapító vesz részt.
- **A törzs korlátja a randevúban** (D84/1): a szöveg-darabot és a fájlokat alapból csak a vállalt entitásokra szolgáljuk
  ki („mindent” beállítással mindent — D83/2).
- **A kérelem az átmenetiből** (D75/3): a szelet-kérelmet az átmeneti tárból is kiszolgáljuk; és a `hozd` és a kérelem
  is kér tagsági kísérőt (a B2 párja).
- **A visszavett vállalás** (D75/1): a visszavont pontú szelet a tartósból az átmenetibe kerül — a tartós tár ritka
  újraírásával (D73, mint a `git gc`); a saját eseményeim maradnak (D86/2). Vele a két fokú vállalás nagy szeletének régi
  eseményei is kikerülnek.
- **A B2–B4 parancssor-próbái a cserében** — ma (a mai módban) a szerzők azonosság-szelete és a születés a rendes
  egyeztetéssel úgyis megérkezik, ezért csak a bekapcsolás után különböztethetők meg.

## 2. A 68. mérés — a „nincs újdonság” csere, ha a részvétel a saját halmaz

[`eredmenyek.md`](../koino/meres/eredmenyek.md) 68. Ha két készülék mást vállal, a nyitó lenyomatuk soha nem egyezik, és a
párbeszéd minden cserén végigfuttatja az első szintet a nem közös szeleteken is: a hétköznapi „nincs újdonság” csere
50 vállalt szeletnél 6–17 KB, 200-nál 25–58 KB, 1000-nél 92–298 KB (az átfedéstől függően) — a 702 B helyett, amennyi
akkor volna, ha a két fél csak a KÖZÖS szeletekben venne részt. ⛔ **Így nem kapcsolható be.**

## 3. Amit a kódból látni — kivel cserél ma az őrjárat

Az őrjárat a kötés-társakkal (K = 3–5), a friss és az induló címekkel, a függő kérelmek céljaival és a kopogtatókkal
cserél — **a raj tartóival nem** (a raj-jegyzéket ma a `hozd` és a kérelem használja). A szigorú (b) alatt egy véletlen
társsal a közös vállalt szeletek várható száma nagyjából n²/S (n a vállalt szeleteim, S az összes szelet): 300 vállalt
szeletnél egymillió között ~0,09. ⛔ **A vállalt szeleteim tehát a kötés-társakkal szinte soha nem frissülnének** — a mai
módban ez nem látszik, mert ott mindenki mindent egyeztet.

## 4. A kérdések — javaslattal (D-szintűek, Csabáéi)

**K1. Honnan tudja a két fél a KÖZÖS halmazt?** (hogy a nyitó lenyomat csak azon fusson — a 68. mérés szerint ettől
függ, hogy a hétköznapi csere 0,7 KB vagy több tíz KB)

- **(A) ⭐ Ujjlenyomat-lista az első találkozáskor, utána változás-napló — ezt javaslom.** Az első cserén mindkét fél
  elküldi a részvételi halmazát RÖVID ujjlenyomatokként (szeletenként 6 bájt, ~11 B a vonalon — 1000 szeletnél ~11 KB,
  egyszer); a társ tábla-aláírója alatt megjegyezzük (helyi, korlátos). Utána a NYITÁS a saját halmazom változatát és a
  társé közül azt viszi, amit ismerek (~20 B); ha mindkettő stimmel, mindketten ugyanazt a metszetet számolják, és a nyitó
  lenyomat azon fut (a „nincs újdonság” ~0,7 KB marad). Ha változott, a változás (a hozzáadott és a kivett ujjlenyomatok)
  megy, nem az egész. Pontos és determinisztikus (a 48 bites ujjlenyomat ütközése 1000 szeletnél ~10⁻⁹).
- **(B) Bloom-szűrő és tanulás.** Az első cserén ~1,2 KB (1000 szeletnél, 1% hamis pozitív); a hamis pozitívokat egy-egy
  első szint tanítja ki (a társ kizárja). Olcsóbb első találkozás, de nem determinisztikus, és bonyolultabb.
- **(C) A teljes kulcslista.** ~45 KB 1000 szeletnél, egyszer társanként; a legegyszerűbb, de az (A) négyszerese.

**K2. Kivel cseréljen az őrjárat a szigorú (b) alatt?** (különben a vállalt szeletek nem frissülnek)

- **(A) ⭐ A raj is a kör céljai közé kerül — ezt javaslom.** Körönként néhány (kiindulásnak 2) raj-társ: akik a
  raj-jegyzék szerint a legtöbb vállalt szeletemet tartják (a tábla-aláírójuk szerint összeszámolva), forgatva (hogy
  minden vállalt szelet sorra kerüljön), az utolsó ismert címükön — NAT mögött a kopogtatással (D92/1). A kötés-háló marad
  az elérhetőségé (a címek, a tábla), a raj a tartalomé. Korlátos: a kör célszáma nem nő a vállalással, csak a forgatás
  lassul.
- **(B) A kötés-társak választása átfedés szerint** — a kötés így egyszerre volna elérhetőség és tartalom; de a kötés
  azért van, mert a cím elromlik, nem azért, mert egyezik az érdeklődés.
- **(C) Csak a kérelem** (D92): a vállalt szeletet időnként kérelemmel frissítem a raj tartóitól — de a szelet-kérelem a
  teljes szeletet hozza (nincs tartomány-egyeztetés), tehát nagy szeletnél drága.

✅ **ELDŐLT — D97 (Csaba, 2026-10-08: „elfogadom a javaslataidat”):** K1/A és K2/A.

✅ **A KÖZÖS HALMAZ MEGÉPÜLT (2026-10-08)** — a részletek: a fázis-2 terv D97, „MEGÉPÜLT”; mérve: az első találkozás
2,9–28,3 KB, utána a „nincs újdonság” 1,3 KB. ⏭️ Következik: a részvétel a vállalásból.

✅ **A RÉSZVÉTEL A VÁLLALÁSBÓL MEGÉPÜLT (2026-10-08)** — a 7. pont szerint (a részletek: a fázis-2 terv D97); a szigorú (b) él.
⏭️ Következik: a raj a körben (K2/A — előtte szimuláció), aztán a 4. pont.

✅ **A RAJ A KÖRBEN MEGÉPÜLT (2026-10-09)** — a 69. mérés (szimuláció) után, egy változtatással: a raj-társ nem átfedés szerint,
hanem a VÁLTOZOTT szeleteim tartói sorban, aztán a forgatás (az átfedés szerinti választásnál a tartók gráfja szétesett).
⏭️ Következik: a 6. sorrend 4. pontja (a törzs korlátja, a kérelem az átmenetiből, a visszavett vállalás és a tömörítés).

## 5. Ami nem igényel döntést (a megépítés része)

A részvétel a vállalásból (a töredék-részvétellel és a D96-tal), a törzs korlátja, a kérelem az átmenetiből és a
kísérői, a visszavett vállalás és a tár tömörítése, a B2–B4 parancssor-próbái — az 1. pont szerint.

## 6. A javasolt sorrend (ha a javaslatok szerint dől el)

1. **A közös halmaz** (K1/A) — mert nélküle a bekapcsolás minden cserét drágít (68. mérés); a mai módban is kipróbálható
   (a részvételi halmaz ma „minden”, a metszet így ma is pontos).
2. **A részvétel a vállalásból** (a töredék-részvétellel és a D96-tal) — innen él a szigorú (b).
3. **A raj a kör céljai közt** (K2/A) — előtte szimuláció: hány kör alatt ér körbe egy vállalt szelet változása a rajban.
4. **A törzs korlátja, a kérelem az átmenetiből és a kísérői, a visszavett vállalás és a tár tömörítése**, a parancssor-
   próbákkal (a „végtelen” próbája: egy készülék terhe a saját érdeklődésével arányos).

## 7. ⭐ A RÉSZVÉTEL MŰSZAKI TERVE (a D97 keretén belül, 2026-10-08)

1. **A részvételi halmaz (P)** a vállalásból: a pozitív pontú szeleteim (a javaslatok és a töredékek is), az
   azonosság-szeletem; ⛔ a koinó születésének SZELETE csak az alapítónál (D96); a két fokú vállalás összegzett (nagy)
   szelete nem; a töredék-részvétel (D85 T3): a töredék-szelet, amelyik érintettjét vállalom, és amelyik saját része
   valamikor igent mondott — a javaslatok állapotából, a tár változata szerint gyorsítótárazva. A gyökér a darabjaival
   (B4) megy. A „mindent” beállítású készülék (D83/2) P-je „minden” — ő a mai módban cserél.
2. **A koinó születése mint ESEMÉNY (D96):** egy virtuális kulcs (mint a gyökér-darabé) mindenki részvételében, amelynek
   halmaza egyedül a `KoinoLetrehozas` (a bejelentései nélkül) — így mindenkihez eljut, a zárt koinó nem tagjához is (a
   kapu mindig engedi), az alapító állításai viszont nem. A nyitásban nem kerül semmibe (egy pár a párok közt).
3. **A zárt koinó korlátozott útja** a megengedett szeleteket a saját vállalásomtól függetlenül szolgálja ki (a nem tag
   azonosság-szeletét a tag nem vállalja — a meghívás a csak küldő úton megy, B3).
4. **A parancssor-próbák:** a meglévők nagy része arra épül, hogy a csere mindent mindenkihez eljuttat — ezek a
   „mindent” beállítású készüléken futnak (a próbák alapértéke a környezetből, mint a DHT-belépőké); a szigorú
   viselkedést külön próbák mérik (a B2–B4-é is itt).
