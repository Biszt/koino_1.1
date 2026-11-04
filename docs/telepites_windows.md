# A koino telepítése Windowsra — egy bemásolt sor

*2026-11-04. Csaba anyukájának laptopján a meghívó sora nem működött: az a Termuxnak (a telefonnak) szólt, és a Windows
parancssora már az első szónál, a `yes`-nél megállt. A Windowsnak ezért saját sora van, ugyanazzal a meghívóval. A párja a
telefonos leírás: [`telepites_telefon.md`](telepites_telefon.md), „A legegyszerűbb út”. Elágazás 232.*

## Ha meghívót kaptál

A meghívód a lapján („✉️ Meghívóim”) két gombot lát a meghívód mellett: 📋 a telefonra (Termux), 💻 a Windowsra. A 💻 egy
ilyen sort másol (a `meghivo` parancs is kiírja mindkettőt):

```
powershell -NoProfile -ExecutionPolicy Bypass -Command "cd ~; if (-not (Test-Path koino_1.1)) { curl.exe -fL -o koino_1.1.zip https://github.com/Biszt/koino_1.1/archive/refs/heads/main.zip; Expand-Archive koino_1.1.zip .; Rename-Item koino_1.1-main koino_1.1; Remove-Item koino_1.1.zip }; & .\koino_1.1\koino\windows\telepit.ps1" koino-meghivo:2:…
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

## Ezután

**Minden további indításhoz elég az asztalon a „koino” ikon.** A telepítő teszi oda. Ugyanazt indítja: a lapot és az
őrjáratot, egy ablakban.

A program parancsai ugyanazzal az adattal: `%USERPROFILE%\koino_1.1\koino\windows\koino.cmd ter`, `… koino.cmd belep`, és
így tovább. Ez a Termux `koino <parancs>`-ának párja.

## Mit csinál a sor, lépésenként

- A `powershell` maga a parancs, a többi egy idézőjeles szöveg. Ezért fut a PowerShellben és a régi parancssorban is. A
  szövegben nincs olyan jel (`$`, `%`, `!`, belső idézőjel), amit az egyik vagy a másik héj a maga módján kibontana. A
  meghívó a záró idézőjel után jön, és a telepítő első argumentuma lesz.
- **A letöltés:** ha az otthoni mappádban (`C:\Users\<név>`) még nincs `koino_1.1`, a GitHubról letölti a zip-et (~4,6 MB,
  a `curl.exe` a Windows része), kicsomagolja és átnevezi. Git nem kell. Ha a mappa már megvan, a letöltést kihagyja; a sor
  a már telepített **régi programot nem frissíti**, ugyanúgy, mint a Termuxé.
- **A [`telepit.ps1`](../koino/windows/telepit.ps1):** ha kell, hozza a Node-ot (`winget install OpenJS.NodeJS.LTS`).
  Megvizsgálja, hogy a Node tud-e Ed25519-et, mert a koino minden műveletet aláír. Az asztalra teszi a „koino” ikont, és
  átadja a meghívót az indítónak.
- **Az [`indit.ps1`](../koino/windows/indit.ps1):** a meghívóval csatlakozik és belép, elindítja a felületet és (ha már van
  koinó) az őrjáratot, ugyanabban az ablakban, és megnyitja a lapot. Ez a `termux/indit.sh` párja.

## Hol mi van

- **A program:** `%USERPROFILE%\koino_1.1`.
- **Az adat:** `%USERPROFILE%\koino-adat`, benne a kulcs, vagyis te magad. A naplók ugyanott vannak: `felulet.log`,
  `orjarat.log` és a `.hiba.log` párjaik.
- ⚠️ **Az adat szándékosan a program mappáján kívül van**, hogy a program törlése és újratelepítése ne vigye el a kulcsot.
  A kulcsot érdemes kimenteni: `koino.cmd mentes <fájl>`.

## Ha elakadsz

- **„'yes' is not recognized…”:** a telefonos (Termux) sort másoltad be. A 💻 gomb sorát kérd.
- **„A Node.js nincs a gépen, és most nem sikerült telepíteni”:** nincs `winget` (régebbi Windows 10). Telepítsd a Node.js
  LTS-t a https://nodejs.org oldalról, aztán másold be újra ugyanazt a sort.
- **„A felület nem indult el (fut már egy koino?)”:** egy korábbi ablak még fut. Elég a böngészőben a régi lap, vagy zárd
  be a régi ablakot.
- **Elalszik a gép:** alvás közben a koino sem fut. Amíg a meghívód gépe nem cserélt veled, maradjon ébren.
- **A szkripteket UTF-8 BOM-mal mentjük:** a Windows PowerShell 5.1 a BOM nélküli fájlt ANSI-ként olvasná, és a magyar
  idézőjel (`„`) ott idézőjelnek számítana, vagyis a szkript el sem indulna. A meghívó-próba őrzi.
