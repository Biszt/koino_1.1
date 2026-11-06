# A koino telepítése Windowsra — egy bemásolt sor

*2026-11-04. Csaba anyukájának laptopján a meghívó sora nem működött: az a Termuxnak (a telefonnak) szólt, és a Windows
parancssora már az első szónál, a `yes`-nél megállt. A Windowsnak ezért saját sora van, ugyanazzal a meghívóval. A párja a
telefonos leírás: [`telepites_telefon.md`](telepites_telefon.md), „A legegyszerűbb út”. Elágazás 232.*

## Ha meghívót kaptál

A meghívód a lapján („✉️ Meghívóim”) két gombot lát a meghívód mellett: 📋 a telefonra (Termux), 💻 a Windowsra. A 💻 egy
ilyen sort másol (a `meghivo` parancs is kiírja mindkettőt):

```
powershell -NoProfile -ExecutionPolicy Bypass -Command "cd ~; Remove-Item -Recurse -Force koino_1.1-uj, koino_1.1.zip -ErrorAction Ignore; curl.exe -fL -o koino_1.1.zip https://github.com/Biszt/koino_1.1/archive/refs/heads/main.zip; if (Test-Path koino_1.1.zip) { Expand-Archive koino_1.1.zip koino_1.1-uj; Remove-Item koino_1.1.zip }; & { if (Test-Path koino_1.1-uj\koino_1.1-main\koino\windows\telepit.ps1) { & .\koino_1.1-uj\koino_1.1-main\koino\windows\telepit.ps1 @args } else { & .\koino_1.1\koino\windows\telepit.ps1 @args } }" koino-meghivo:2:…
```

1. **Nyiss egy parancsablakot:** Start gomb, írd be, hogy `PowerShell` (vagy `cmd`), Enter. A sor mindkettőben ugyanúgy
   fut, a Windows Terminalban is.
2. **Illeszd be az egész sort** (jobb klikk vagy Ctrl+V), majd nyomj Entert.
3. Ha a gépen még nincs **Node.js**, a telepítő a `winget`-tel felteszi. A Windows ilyenkor engedélyt kér: válaszolj
   **Igen**-nel.
4. Amikor az őrjárat elindul, a Windows tűzfala megkérdezi, hogy a Node.js kommunikálhat-e. Nyomd meg az **Engedélyezés**
   gombot; a „Magánhálózatok” pipa elég.
5. A böngészőben megnyílik a lap, már a koinóban. Az első megnyitáskor az adataidat kéri (nem kötelező). A következő
   cserénél a meghívód gépe magától tagnak hív meg; ehhez az ő gépén is futnia kell a koinónak.

**Az ablakot hagyd nyitva**, ebben fut a koino. Leállítás: Ctrl+C vagy az ablak bezárása.

⭐ **Ha a koino már fent van, ugyanez a sor FRISSÍTI** (2026-11-06, D123): letölti az újat a régi mellé, leállítja a futó régi
koinót, kicseréli, és az újjal indít. Az adatod marad. Frissíteni meghívó nélkül is lehet: ugyanez a sor a `koino-meghivo:…` rész
nélkül.

## Ezután

**Minden további indításhoz elég az asztalon a „koino” ikon.** A telepítő teszi oda. Ugyanazt indítja: a lapot és az
őrjáratot, egy ablakban.

A program parancsai ugyanazzal az adattal: `%USERPROFILE%\koino_1.1\koino\windows\koino.cmd ter`, `… koino.cmd belep`, és
így tovább. Ez a Termux `koino <parancs>`-ának párja.

## Mit csinál a sor, lépésenként

- A `powershell` maga a parancs, a többi egy idézőjeles szöveg. Ezért fut a PowerShellben és a régi parancssorban is. A
  szövegben nincs olyan jel (`$`, `%`, `!`, belső idézőjel), amit az egyik vagy a másik héj a maga módján kibontana. A
  meghívó a záró idézőjel után jön, és a telepítő első argumentuma lesz.
- **A letöltés:** az otthoni mappádba (`C:\Users\<név>`) a GitHubról letölti a zip-et (~4,6 MB, a `curl.exe` a Windows része),
  és a meglévő program MELLÉ csomagolja ki, a `koino_1.1-uj` mappába (egy korábbi, félbemaradt letöltés maradékát előbb
  eltávolítja). Git nem kell. Ha a kicsomagolás sikerült, az ÚJ telepítő folytat; ha nem (például nincs hálózat), a meglévő.
- **A csere** (2026-11-06, D123): az új telepítő leállítja a régi mappából futó koinót (különben a mappa nem nevezhető át, és a
  régi kód futna tovább), a régit `koino_1.1-regi`-nek nevezi, az újat `koino_1.1`-re, és onnan folytat. Egy git-tárat (ha a
  `koino_1.1`-ben `.git` mappa van) nem cserél le. Ha a csere nem sikerül (például egy parancsablak áll a régi
  mappában), kiírja, és a régi program indul.
- **A [`telepit.ps1`](../koino/windows/telepit.ps1):** ha kell, hozza a Node-ot (`winget install OpenJS.NodeJS.LTS`).
  Megvizsgálja, hogy a Node tud-e Ed25519-et, mert a koino minden műveletet aláír. Az asztalra teszi a „koino” ikont, és
  átadja a meghívót az indítónak.
- **Az [`indit.ps1`](../koino/windows/indit.ps1):** a meghívóval csatlakozik és belép, elindítja a felületet és (ha már van
  koinó) az őrjáratot, ugyanabban az ablakban, és megnyitja a lapot. Ez a `termux/indit.sh` párja.

## Hol mi van

- **A program:** `%USERPROFILE%\koino_1.1`. Frissítés után az előző változat a `koino_1.1-regi` mappában marad, a következő
  frissítésig — ha valamit a program mappájában tartottál, ott megtalálod.
- **Az adat:** `%USERPROFILE%\koino-adat`, benne a kulcs, vagyis te magad. A naplók ugyanott vannak: `felulet.log`,
  `orjarat.log` és a `.hiba.log` párjaik.
- ⚠️ **Az adat szándékosan a program mappáján kívül van**, hogy a program törlése és újratelepítése ne vigye el a kulcsot.
  A kulcsot érdemes kimenteni: `koino.cmd mentes <fájl>`.

## Ha elakadsz

- **„'yes' is not recognized…”:** a telefonos (Termux) sort másoltad be. A 💻 gomb sorát kérd.
- **„A Node.js nincs a gépen, és most nem sikerült telepíteni”:** nincs `winget` (régebbi Windows 10). Telepítsd a Node.js
  LTS-t a https://nodejs.org oldalról, aztán másold be újra ugyanazt a sort.
- **„A felület nem indult el (fut már egy koino?)”:** egy korábbi ablak még fut (az asztali ikonról indítva; a telepítő sor
  a futó koinót magától leállítja). Elég a böngészőben a régi lap, vagy zárd be a régi ablakot.
- **„A program most nem frissült: a csere nem sikerült”:** egy program fogja a `koino_1.1` mappát (például egy parancsablak,
  ami abban a mappában áll). Zárd be, és másold be újra a sort.
- **Elalszik a gép:** alvás közben a koino sem fut. Amíg a meghívód gépe nem cserélt veled, maradjon ébren.
- **A szkripteket UTF-8 BOM-mal mentjük:** a Windows PowerShell 5.1 a BOM nélküli fájlt ANSI-ként olvasná, és a magyar
  idézőjel (`„`) ott idézőjelnek számítana, vagyis a szkript el sem indulna. A meghívó-próba őrzi.
