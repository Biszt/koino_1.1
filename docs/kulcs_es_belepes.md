# A kulcs, a bejelentkezés és a regisztráció a Fázis 2-ben

*Létrehozva: 2026. 08. 27. — Csaba kérdésére: „nem értem a kulcs lényegét, kérlek fejtsd
ki… nem zavar, ha nem kell bejelentkezni, de gondolom regisztrálni azért kell, nem?"*

> **Miért van erről külön dokumentum?** Mert ez az a pont, ahol a Fázis 2 a leginkább
> eltér attól, amit mindenki megszokott — és mert ha ezt nem lehet **egyszerűen**
> elmagyarázni, akkor a koinóba nem fognak belépni az emberek. Ez a szöveg egyben a
> [`megismeres/`](../megismeres/) mappa jövendő leírásának a magja is.

---

## 1. Mi a kulcs

A **kulcspár** két összetartozó szám, amit a készüléked számol ki egyetlen pillanat alatt:

| | |
|---|---|
| **privát kulcs** | nálad marad, **soha nem mutatod meg senkinek** |
| **nyilvános kulcs** | ez a „neved" a hálózaton — bárki láthatja (43 karakteres jel) |

A privát kulccsal **aláírsz** valamit. Az aláírásból bárki ellenőrizheti a nyilvános
kulcsoddal, hogy tényleg te írtad alá — **de az aláírásból nem lehet visszafejteni a
privát kulcsot.** Ez a matematikai trükk az egész rendszer alapja.

> **Hasonlat:** mint egy pecsétnyomó, amiből csak egy létezik, és nálad van. A lenyomatot
> bárki felismeri, de a lenyomatból nem lehet legyártani a pecsétnyomót.

*(Technikailag: Ed25519, natívan a böngésző WebCrypto szolgáltatásából. Nyilvános kulcs
32 bájt, aláírás 64 bájt, egy ellenőrzés 0,058 ms — mérve, lásd
[`koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md).)*

---

## 2. Ezért nincs bejelentkezés

Gondoljuk végig, mire való a bejelentkezés: **elmondod a titkodat a szervernek**, ő
megnézi, hogy stimmel-e, és utána *elhiszi*, hogy te vagy — egy ideig. Ehhez két dolog
kell: egy szerver, és hogy **megbízz benne**.

A koinóban nincs szerver, akinek elmondhatnád. De nem is kell:

> **Nem „belépsz, és utána elhiszik, hogy te vagy" — hanem minden egyes tettedet külön
> aláírod.** Minden gondolat, minden tudatpont, minden szavazat magában hordozza a
> bizonyítékot, hogy tőled származik.

Ez **erősebb**, mint a jelszó: egy ellopott jelszóval bármit tehetnek a nevedben; itt
viszont minden egyes cselekvéshez kellene a kulcsod.

*(Ez a **D15** gyakorlati olvasata: „a kulcs hitelesít, nem titkol".)*

---

## 3. Akkor mi lesz a regisztrációból? — KÉT dologra válik

| Ma | A Fázis 2-ben |
|---|---|
| Fiókot nyitsz **egy szolgáltatónál** (név, e-mail, jelszó) | **Létrehozod a kulcsodat** — a saját gépeden, engedély nélkül, egy pillanat alatt |
| A szolgáltató **felvesz a listájára** | **Belépsz egy koinóba**, és **valaki tanúsít**, hogy valódi, külön ember vagy (D18) |

**A kulcs a tiéd, és mindenhol ugyanaz** a belépő téren belül (D25) — a **tagság** viszont
koinónként külön, és ott dől el, mennyire számítasz hitelesnek.

### A mai regisztrációs űrlap sorsa

| Mező | Mi lesz vele |
|---|---|
| jelszó | **elfogy** — a kulcs hitelesít (D15) |
| e-mail | legfeljebb **értesítésre** marad, azonosításra nem |
| név, település | **gondolat**: amit magadról mondasz, aláírva (D28) |

### A belépés két eseménye (D28)

```
Belepes  { koino }                    → a tagság ténye: „csatlakozom"
Profil   { koino, nev, lokacio }      → az adataid: „ezt mondom magamról"
```

**A felületen ez nem látszik:** egy űrlap, egy „Belépés" gomb — a háttérben két aláírás.
Hogy egy koino milyen adatokat vár el, az **az ő döntése** (Csaba első koinója: teljes név
+ település).

**És ki hitelesíti az adatot?** Nem a rendszer — hanem **aki behívott, és ismer** (D18).
*Ez már ma is így működik: a meghívó tartalmazza a meghívott teljes nevét, és a kibocsátó
tanúsítása a névre is kiterjed.*

---

## 4. Két gyakorlati következmény, amit előre tudni kell

### ① Ha elveszted a kulcsot, elveszted az azonosságodat

Ezért **mentsd el fájlba** — a program az első indításkor kéri is. A mentés egy kattintás.

Ha a mentés is odaveszik, marad a **D15 több-tanús helyreállítása**: a közösség
tanúsíthatja, hogy az új kulcs is te vagy. Az viszont **lassú és emberi** — a mentés
gyorsabb.

> ⚠️ **Ez nem elméleti kockázat.** Mérve (2026-08-26): a böngésző **kiürítheti a tárat**,
> és a „tartós tárolás" kérése nem mindig jár sikerrel.

### ② Több készülék = ugyanaz a kulcs

Ha a telefonodon is használni akarod, **át kell vinni** oda a mentett kulcsfájlt. Nem
„bejelentkezel a telefonon", hanem **odaviszed az azonosságodat**.

> ⚠️ Ebből ered az **elágazás** lehetősége: ha két készüléken, egymástól függetlenül
> (offline) írsz alá, a saját láncod kettéágazik. A koino ezt **nem bünteti** — mindenki
> ugyanazt az ágat számolja érvényesnek —, de **láthatóvá teszi** (lásd a Szakasz 1 tervét
> és a D19-et: a rendszer bejelent, nem bíró).

---

## Napló

- **2026-08-27** — A dokumentum létrejött, Csaba kérdésére. Gondolata a beszélgetésben
  elhangzott magyarázat rögzítése: a kulcspár működése, miért nincs bejelentkezés, mi lesz
  a regisztrációból (D28), és a két gyakorlati következmény (kulcsvesztés, több készülék).
