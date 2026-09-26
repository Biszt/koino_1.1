# Kollektív Intelligencia Online (koino)

> Közösségi tér, amit a közösség irányít — központi szereplő nélkül.

A **koino** egy közösségi platform, ahol a regisztrálók nem „felhasználók", hanem
**e-emberek**: egyszerre tulajdonosok, fejlesztők, moderátorok és felelősök. A
platform lényege a **közösségi döntéshozatal**: a gondolatokból *javaslatok*, a
javaslatokból *egyezmények* születnek — mindezt egy átlátható, mindenki számára
egyenlő szavazási mechanika vezérli.

A prototípus élesben: **[koino.hu](https://koino.hu)**

---

## Tartalomjegyzék

- [Mi ez a projekt?](#mi-ez-a-projekt)
- [Két program egy repóban](#két-program-egy-repóban)
- [A központi ötlet dióhéjban](#a-központi-ötlet-dióhéjban)
- [Technológiák](#technológiák)
- [Gyors indítás](#gyors-indítás)
- [Könyvtár-térkép](#könyvtár-térkép)
- [Hol kezdd az olvasást?](#hol-kezdd-az-olvasást)
- [Dokumentáció](#dokumentáció)
- [Állapot](#állapot)
- [Licenc](#licenc)

---

## Mi ez a projekt?

A koino a nagy közösségi platformok ellenpontja: ott néhány ember birtokol és
irányít mindent, itt a **közösség maga** hozza a döntéseket. A rendszer nem a
„társadalmi többség akaratát" mondja ki, hanem a **részt vevők hitelesített
szándékát** teszi láthatóvá — ellenőrzött emberek, egy-ember-egy-hang, átlátható
folyamat.

Két fázisban gondolkodunk:

- **Fázis 1 — a prototípus:** központi szerveres koino, amely kifejlesztette és
  élesben bizonyította a döntéshozatali mechanikát az első közösséggel.
- **Fázis 2 — a P2P koino:** a készüléken fut, aláírt eseményekkel, szerver nélkül.
  **Itt folyik a fejlesztés** (2026-08-26 óta, D22 döntés: *„a kis családi
  közösségeknek is P2P-nek kell lenniük"*).

Részletek: [`docs/utiterv.md`](docs/utiterv.md) és
[`docs/fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md).

## Két program egy repóban

| Mappa | Mi ez | Állapot |
|-------|-------|---------|
| **`koino/`** | **Az új program** — P2P koino (Fázis 2). Önálló Node-program, nem böngészőben fut; a felülete egy helyi kapun át a böngészőben nyílik meg | 🚧 **itt folyik a fejlesztés** |
| `backend/` + `frontend/` | **A prototípus** — központi szerveres koino (Fázis 1), ez fut a koino.hu-n | ⏸️ **befagyasztva** — üzemel, de nem fejlesztjük |

> ⚠️ A prototípus mappáihoz ne nyúlj: az éles deploy a repó gyökeréből épít, egy
> átrendezés némán eltörné. A `koino/felulet/` a prototípus kártyáit és modáljait
> örökölte, jórészt bájtra változatlanul (ezt önpróba őrzi).

## A központi ötlet dióhéjban

1. Egy e-ember **gondolatot** hoz létre (kérdés, válasz, ismeret, feladat…), amit
   **kategóriák** és **gondolattípusok** rendszereznek.
2. Mindenkinek ugyanannyi **tudatpontja** van. Ez nem elkölthető, csak
   szétosztható és bármikor átrendezhető — a **prioritást** fejezi ki, NEM a
   szavazaterőt (szavazásnál mindenki egyenlő).
3. Aki tudatpontot rendelt egy gondolathoz, az tehet rá **javaslatot**
   (módosítás, áthelyezés, törlés, egyesítés).
4. A javaslatról **szavaznak**. Minden gondolatnak vannak **küszöbértékei**
   (mekkora támogatottság és részvétel kell az elfogadáshoz) és min/max
   döntési ideje.
5. A **bizonyossági mutató** dönti el, mikor zárul a szavazás: minél
   egyértelműbb az eredmény és magasabb a részvétel, annál hamarabb.
6. Az elfogadott javaslatból **egyezmény** lesz.

A P2P koinóban ugyanez **aláírt eseményekből számolódik** minden készüléken: nincs
szerver, amely kimondaná az eredményt — ugyanazokból az eseményekből mindenhol
ugyanaz az állapot jön ki. A készülékek időnként maguktól összeérnek (**őrjárat**),
és kicserélik egymással, ami újdonság.

> A pontos terminológiát (kötelező!) lásd a [`CLAUDE.md`](CLAUDE.md)
> „Domain-fogalmak" szakaszában.

## Technológiák

**Az új program (`koino/`):**

| Réteg | Eszközök |
|-------|----------|
| Futtatókörnyezet | Node.js (laptopon és telefonon, Termuxban) — **nulla külső függőség** |
| Kriptográfia | a Node beépített WebCryptója (Ed25519 aláírások) |
| Tárolás | hozzáfűzhető eseménynapló (`koino-adat/`), fájlok a lenyomatuk szerint |
| Hálózat | **csak UDP** (2026-09-26 óta nincs TCP a készülékek között): állandó UDP-kapu, pajzsfúrás a NAT-on át, saját ablakos vonal, BitTorrent DHT hirdetőtáblának, helyi felfedezés |
| Felület | a prototípus vanilla JS kártyái, egy helyi (127.0.0.1) kapun kiszolgálva |

**A prototípus (`backend/` + `frontend/`):**

| Réteg | Eszközök |
|-------|----------|
| Frontend | Vanilla HTML / CSS / JavaScript (ES-modulok, **build nélkül**) |
| Backend | Node.js, Express, Mongoose, MongoDB |
| Auth / feltöltés / időzítés | JWT + bcrypt · Multer · node-cron |
| Üzemeltetés | Docker Compose (külön dev és prod stack) |

## Gyors indítás

### Az új program (`koino/`)

Csak Node kell, telepítendő függőség nincs:

```bash
node koino/koino.js
```

Ez kiírja az állapotot (gondolatok, javaslatok, egyezmények). Néhány további parancs:

```bash
node koino/koino.js orjarat          # a valódi üzemmód: a készülék magától dolgozik
node koino/koino.js felulet          # a felület a böngészőben (helyi kapu, jelszóval)
node koino/meres/mind.js             # az önpróbák (714, mind zöldnek kell lennie)
```

A teljes parancslista: [`koino/README.md`](koino/README.md). Telefonra telepítés
(Termux): [`docs/telepites_telefon.md`](docs/telepites_telefon.md).

### A prototípus (`backend/` + `frontend/`)

```bash
docker-compose -f docker-compose.dev.yml up
```

Ezután a prototípus elérhető: **http://localhost:3000** (a backend a 3000-es
porton fut, és statikusan kiszolgálja a frontendet is; a MongoDB kívülről a
27018-as porton). A backend Docker nélkül is fut (`cd backend`, `npm install`,
`npm run dev`); ehhez a `backend/.env` fájlban kell a `MONGODB_URI`.

> Az **éles** (koino.hu) környezet külön stackben fut ugyanazon a gépen — lásd
> [`docs/elesites.md`](docs/elesites.md). Éleset **soha** ne állíts le
> `down -v`-vel (törölné az adatbázist).

## Könyvtár-térkép

```
koino_1.1/
├─ README.md              ← ezt olvasod
├─ CLAUDE.md              ← hol tartunk + szabályok + domain-fogalmak (kötelező olvasmány)
├─ CHANGELOG.md           ← mi változott mikor
├─ LICENSE                ← AGPL-3.0 (lásd a Licenc szakaszt)
├─ SECURITY.md            ← biztonsági hiba bejelentése
│
├─ koino/                 ← 🚧 AZ ÚJ PROGRAM — P2P koino (lásd koino/README.md)
│  ├─ koino.js            ← belépési pont: a parancssor és az őrjárat
│  ├─ js/esemeny/         ← az aláírt esemény és a kanonikus alak
│  ├─ js/allapot/         ← az állapot számítása: szabályok, javaslat, identitás, pakli
│  ├─ js/csere/           ← a szállítás: csere, UDP-vonal, pajzsfúró, kapu, DHT, tábla
│  ├─ js/tar/             ← esemény- és fájltár
│  ├─ js/kulcs/           ← a kulcspár (ez az azonosságod)
│  ├─ js/felulet/         ← a helyi kapu a böngészőnek
│  ├─ felulet/            ← a böngészős felület (a prototípusból örökölve)
│  └─ meres/              ← önpróbák (mind.js) és mérések (eredmenyek.md)
│
├─ backend/               ← ⏸️ PROTOTÍPUS: Node + Express + Mongoose (lásd backend/README.md)
├─ frontend/              ← ⏸️ PROTOTÍPUS: vanilla JS SPA (lásd frontend/README.md)
├─ docker-compose.*.yml   ← a prototípus fejlesztői és éles stackje
│
├─ megismeres/            ← rövid bemutató lapok a fogalmakról
└─ docs/                  ← részletes dokumentáció (lásd lentebb)
```

## Hol kezdd az olvasást?

Ha most találkozol először a kóddal:

1. **[`CLAUDE.md`](CLAUDE.md)** — hol tartunk, a kilenc szabály, amely minden új kódra
   érvényes, és a domain-fogalmak. Enélkül a magyar elnevezések nehezen értelmezhetők.
2. **[`docs/utiterv.md`](docs/utiterv.md)** — mit építünk, milyen sorrendben, és miért
   (rövid; ez a belépő).
3. **[`koino/README.md`](koino/README.md)** — az új program: miért nem böngésző, a
   parancsok, a rétegek.
4. **[`docs/gepezet.md`](docs/gepezet.md)** — a döntéshozatali gépezet ábrákon.
5. **[`docs/fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md)** — a
   tervezési döntések (D1–D70) és indoklásuk.

A prototípushoz: [`docs/architektura.md`](docs/architektura.md) (kód-túra),
[`backend/README.md`](backend/README.md), [`frontend/README.md`](frontend/README.md) és
[`docs/fejlesztoi_utmutato.md`](docs/fejlesztoi_utmutato.md).

## Dokumentáció

A `docs/` mappa a projekt tudásbázisa:

| Fájl | Miről szól |
|------|-----------|
| [`utiterv.md`](docs/utiterv.md) | **A belépő:** mit építünk, milyen sorrendben, és miért |
| [`fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md) | Fázis 2 (P2P) — a döntések (D1–D70) |
| [`szakasz1_terv.md`](docs/szakasz1_terv.md) … [`szakasz5_terv.md`](docs/szakasz5_terv.md) | A szakaszok részletes tervei (helyi modell, szállítás, szerkezet, identitás, felület) |
| [`gepezet.md`](docs/gepezet.md) | A döntéshozatali gépezet ábrákon |
| [`skalazas_terv.md`](docs/skalazas_terv.md) | A milliárdos lépték szerkezete |
| [`felulet_terv.md`](docs/felulet_terv.md) | A P2P felület döntései |
| [`telepites_telefon.md`](docs/telepites_telefon.md) / [`terepmeres_mobil.md`](docs/terepmeres_mobil.md) | Telefonra telepítés és a terepmérések forgatókönyve |
| [`claude_naplo.md`](docs/claude_naplo.md) | A fejlesztés naplója (2026-09-06 – 09-25): mérések, átnézések, döntések indoklása |
| [`kormanyzas.md`](docs/kormanyzas.md) | **Forráskód-kormányzás** — hogyan alakítja a közösség magát a programot, és miért nincs a koinók felett kormányzat |
| [`vizio_kritikak.md`](docs/vizio_kritikak.md) | A vízió melletti és elleni érvek |
| [`jegyzetek.md`](docs/jegyzetek.md) | Zárójeles ötletek naplója |
| [`koinos_idios.md`](docs/koinos_idios.md) | A „koino" név eredete, és a koinós/idios szembenállás |
| [`bemutato_kivulalloknak.md`](docs/bemutato_kivulalloknak.md) / [`bemutato_kormany.md`](docs/bemutato_kormany.md) | Bemutató anyagok |
| [`architektura.md`](docs/architektura.md) / [`fejlesztoi_utmutato.md`](docs/fejlesztoi_utmutato.md) | A prototípus kód-túrája és konvenciói |
| [`fejlesztesi_terv.md`](docs/fejlesztesi_terv.md) / [`teszt.md`](docs/teszt.md) / [`elesites.md`](docs/elesites.md) | A prototípus terve, böngészős teszt-referenciája és éles üzemeltetése |
| [`adatkezeles.md`](docs/adatkezeles.md) / [`adatvedelmi_nyilatkozat.md`](docs/adatvedelmi_nyilatkozat.md) | Adatvédelem |

A mérések jegyzőkönyve: [`koino/meres/eredmenyek.md`](koino/meres/eredmenyek.md).

## Állapot

🚧 **A P2P koino (`koino/`) fejlesztés alatt.** Kész a helyi modell, a szállítás, a
szerkezet és az identitás (Szakasz 1–4), a felület gerince (Szakasz 5), valamint a
fájlok szállítása. Az őrjárat UDP-n kopog és cserél, a hirdetőtábla (BitTorrent DHT)
terepen, valódi telefonokkal is működik. 2026-09-26 óta **nincs TCP a készülékek között**: az
őrjárat, a postaláda és a kézi parancsok is egy állandó UDP-kapun mennek (D69). **714
önpróba**, mind zöld (`node koino/meres/mind.js`). A terepmérés az új úton (43.) sikerült, és
2026-09-26 óta egy készüléken egyetlen folyamat ír a tárba (D70, egy író). A friss állapot mindig a [`CLAUDE.md`](CLAUDE.md) elején áll.

🟢 **A prototípus élesben fut** a [koino.hu](https://koino.hu)-n (Fázis 1),
befagyasztva. Automatizált tesztje nincs; a tesztelés böngészős, referenciája a
[`docs/teszt.md`](docs/teszt.md).

## Licenc

**GNU Affero General Public License v3.0** ([`LICENSE`](LICENSE)) —
Copyright © 2026 Csaba és a koino közreműködői.

Ez azt jelenti, hogy **bárki** használhatja, tanulmányozhatja, módosíthatja és
terjesztheti a koino kódját — ugyanazokkal a jogokkal, amikkel a szerzője.

Az AGPL egyetlen feltételt szab, és az a koino lényegéből következik: **aki a
koinót módosítva hálózaton szolgáltatja** — vagyis futtat egy saját koino-verziót
—, annak a módosított forrást is elérhetővé kell tennie a felhasználói számára.

Ez nem korlátozás, hanem a **fork-jog védelme**. A koino terve szerint bárki
letöltheti a kódot, átalakíthatja, és kirakhatja választható közösségként; az
AGPL garantálja, hogy ez a lánc **nem vágható el** — a kirakott verziót a
következő ember is letöltheti és továbbforkolhatja. Egy megengedőbb licenc
(pl. MIT) mellett az első, aki bezárja a forrást, megállítaná a láncot, és
létrejöhetne pontosan az, ami ellen a koino született: egy közösségi tér,
amelynek a tagjai nem látják és nem alakíthatják a kódot, ami őket működteti.

A forráskód-kormányzás tervéről (hogyan hat a közösség közvetlenül a kódra)
lásd: [`docs/kormanyzas.md`](docs/kormanyzas.md),
[`docs/vizio_kritikak.md`](docs/vizio_kritikak.md) 9. pontja és
[`docs/fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md) D9 / N5.
