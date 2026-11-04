# koino/windows/indit.ps1

# Felelősség: A KOINO EGY PARANCCSAL WINDOWSON — a `termux/indit.sh` párja (2026-11-04, elágazás 232): a két folyamat (az őrjárat és
# a felület) indítása, a lap megnyitása a böngészőben, és a leállítás egy Ctrl+C-vel vagy az ablak bezárásával. Az első indításkor a
# `telepit.ps1` hívja, utána az asztali „koino” ikon (és a `koino.cmd`).
#
# ⭐ A program szerkezete nem változik (CS5 (A): két külön folyamat, a felület nem indít őrjáratot) — ez csak a windowsos indítás
# kényelme.
#
# ⭐ HA MÉG NINCS KOINÓ: csak a felület indul; a lapon csatlakozol egy koinóhoz („🔗 Csatlakozás egy koinóhoz…”), és amint a becenév
# a koinó nevére mutat, az őrjárat magától elindul. ⚠️ Előbb nem: a jegyzetlen becenévvel az őrjárat egy üres, régi alakú koinót
# nyitna (a ⑦ terepi próba 2. lelete).
#
# ⭐ ARGUMENTUMMAL a program parancsa fut, ugyanazzal az adat-mappával: `koino.cmd belep`, `koino.cmd ter`.
# ⭐⭐ D122: ha az első argumentum egy MEGHÍVÓ (`koino-meghivo:2:…` — a windowsos telepítő sor vége), előbb elfogadja (csatlakozás, a
# meghívó készüléke társnak, belépés), aztán indul: a lap már a koinóban nyílik, és a következő csere után tag vagy.
#
# ⭐ A két folyamat UGYANABBAN a konzolban fut (`-NoNewWindow`): a Ctrl+C és az ablak bezárása őket is leállítja — egy rejtett
# ablakban indított folyamat bezáráskor tovább futna, és a következő indítás foglalt portot találna.
#
# Beállítható (környezet): KOINO_ADAT (alapból %USERPROFILE%\koino-adat — a program mappáján KÍVÜL, hogy a program újratelepítése
# ne vigye el a kulcsot), KOINO_AZONOSITO (a becenév, alapból sajat), KOINO_ORJARAT_PORT (7373), KOINO_FELULET_PORT (7499),
# KOINO_KOR (az őrjárat köre percben, 1), KOINO_BONGESZO (`nem`: a lap nem nyílik meg magától — a próbáknak).
# ⚠️ UTF-8 BOM-mal mentve: a Windows PowerShell 5.1 a BOM nélküli szkriptet ANSI-ként olvasná (a magyar betűk elromlanának) — a
# meghívó-próba őrzi.

# Ha a kimenet át van irányítva (fájlba, csőbe), UTF-8 legyen — különben a PowerShell a konzol kódlapján írná, és a magyar betűk
# elromlanának (mérve: „fel�let”). A konzolban nem változtatunk semmin (ott a betűk úgyis jók).
if ([Console]::IsOutputRedirected) { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false }

$KONYVTAR = Split-Path -Parent $PSScriptRoot
$PROGRAM = Join-Path $KONYVTAR 'koino.js'
if (-not $env:KOINO_ADAT) { $env:KOINO_ADAT = Join-Path $HOME 'koino-adat' }
$BECENEV = 'sajat'; if ($env:KOINO_AZONOSITO) { $BECENEV = $env:KOINO_AZONOSITO }
$ORJARAT_PORT = '7373'; if ($env:KOINO_ORJARAT_PORT) { $ORJARAT_PORT = $env:KOINO_ORJARAT_PORT }
$FELULET_PORT = '7499'; if ($env:KOINO_FELULET_PORT) { $FELULET_PORT = $env:KOINO_FELULET_PORT }
$KOR = '1'; if ($env:KOINO_KOR) { $KOR = $env:KOINO_KOR }

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host '⚠ A Node.js nincs a gépen. Telepítsd a https://nodejs.org oldalról (az LTS-t), vagy másold be újra a meghívó windowsos sorát.'
  exit 1
}
$NODE = $node.Source

# ===== ⭐ D122: A MEGHÍVÓ (az első argumentum) =====
$ervek = @($args)
$meghivo = $null
if ($ervek.Count -gt 0 -and ([string]$ervek[0]) -like '*koino-meghivo:*') {
  $meghivo = [string]$ervek[0]
  $ervek = @($ervek | Select-Object -Skip 1)
}

# ===== ARGUMENTUMMAL: a program parancsa =====
if ($ervek.Count -gt 0) {
  & $NODE $PROGRAM @ervek
  exit $LASTEXITCODE
}

New-Item -ItemType Directory -Force -Path $env:KOINO_ADAT | Out-Null
if ($meghivo) {
  Write-Host '· A meghívó: csatlakozás és belépés…'
  & $NODE $PROGRAM csatlakoz $meghivo
  if ($LASTEXITCODE -ne 0) {
    Write-Host '⚠ A meghívót most nem sikerült elfogadni — a lapon is beillesztheted („🔗 Csatlakozás egy koinóhoz…”).'
  }
}

# ===== A KÉT FOLYAMAT =====

# Egy program-folyamat ugyanebben a konzolban, a kimenete a naplóba (a hibakimenete külön fájlba — a Start-Process kéri így).
function Inditas([string]$nev, [string[]]$parancs) {
  $lista = @('"' + $PROGRAM + '"') + $parancs
  Start-Process -FilePath $NODE -ArgumentList $lista -NoNewWindow -PassThru `
    -RedirectStandardOutput (Join-Path $env:KOINO_ADAT ($nev + '.log')) `
    -RedirectStandardError (Join-Path $env:KOINO_ADAT ($nev + '.hiba.log'))
}

# Egy folyamat naplójának vége (ha leállt, ebből látszik, miért).
function NaploVege([string]$nev) {
  foreach ($f in @(($nev + '.log'), ($nev + '.hiba.log'))) {
    $ut = Join-Path $env:KOINO_ADAT $f
    if (Test-Path $ut) { Get-Content -Path $ut -Tail 5 -Encoding UTF8 | ForEach-Object { Write-Host ('  ' + $_) } }
  }
}

# Van-e már koinó a becenév alatt? (a `koino`, a `csatlakoz` és a lap csatlakozása jegyzi — `becenevek.json`)
function VanKoino {
  $f = Join-Path $env:KOINO_ADAT 'becenevek.json'
  if (-not (Test-Path $f)) { return $false }
  $t = Get-Content -Path $f -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
  return [bool]($t -and $t.Contains('"' + $BECENEV + '"'))
}

function OrjaratIndul {
  $p = Inditas 'orjarat' @('orjarat', $KOR, $ORJARAT_PORT)
  Write-Host ('✓ Az őrjárat fut (' + $ORJARAT_PORT + '-es kapu, ' + $KOR + ' percenként) — a naplója: ' + (Join-Path $env:KOINO_ADAT 'orjarat.log'))
  return $p
}

# ===== AZ INDÍTÁS — és a leállítás (a Ctrl+C a `finally`-t is lefuttatja) =====
$felulet = $null
$orjarat = $null
try {
  $felulet = Inditas 'felulet' @('felulet', $FELULET_PORT)
  $cim = $null
  $naplo = Join-Path $env:KOINO_ADAT 'felulet.log'
  for ($i = 0; $i -lt 60 -and -not $cim; $i++) {
    Start-Sleep -Milliseconds 500
    $t = $null
    if (Test-Path $naplo) { $t = Get-Content -Path $naplo -Raw -Encoding UTF8 -ErrorAction SilentlyContinue }
    if ($t -and $t -match ('http://127\.0\.0\.1:' + $FELULET_PORT + '/\?kulcs=[A-Za-z0-9_-]*')) { $cim = $Matches[0] }
    if ($felulet.HasExited) { break }
  }
  if (-not $cim) {
    Write-Host '⚠ A felület nem indult el (fut már egy koino? — akkor elég a böngészőben a régi lap). A naplója:'
    NaploVege 'felulet'
    exit 1
  }
  Write-Host ('✓ A felület fut: ' + $cim)
  if ($env:KOINO_BONGESZO -ne 'nem') { Start-Process $cim }

  if (VanKoino) {
    $orjarat = OrjaratIndul
  } else {
    Write-Host '· Még nincs koinód: a lapon csatlakozz egyhez („🔗 Csatlakozás egy koinóhoz…”) — az őrjárat utána magától indul.'
  }
  Write-Host 'Leállítás: Ctrl+C (vagy az ablak bezárása)'

  # ===== A FIGYELÉS — a csatlakozásra vár, és kimondja, ha egy folyamat leállt =====
  while ($true) {
    Start-Sleep -Seconds 2
    if (-not $orjarat -and (VanKoino)) { $orjarat = OrjaratIndul }
    if ($felulet.HasExited) {
      Write-Host '⚠ A felület leállt. A naplója:'
      NaploVege 'felulet'
      exit 1
    }
    if ($orjarat -and $orjarat.HasExited) {
      Write-Host '⚠ Az őrjárat leállt. A naplója:'
      NaploVege 'orjarat'
      exit 1
    }
  }
} finally {
  foreach ($p in @($felulet, $orjarat)) {
    if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
  }
  Write-Host ''
  Write-Host 'A koino leállt.'
}
