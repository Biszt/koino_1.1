# koino/windows/telepit.ps1

# Felelősség: AZ ELSŐ INDÍTÁS WINDOWSON — a `termux/telepit.sh` párja (2026-11-04, a terepi lelet: a Termux-sor egy windowsos laptop
# parancssorában az első szónál megállt; elágazás 232). A meghívó windowsos sora (`js/csere/meghivo.js` `WINDOWS_TELEPITO_SOR`) a
# letöltés után ezt hívja: ha nincs Node, a `winget`-tel telepíti (a Windows engedélyt kér rá), ellenőrzi, hogy a Node tud-e
# Ed25519-et (a koino minden műveletet aláír — ha ez nincs meg, semmi más nem számít), az asztalra tesz egy „koino” ikont (a további
# indításhoz), és elindítja (`indit.ps1`, a meghívóval).
#
# A windowsos sor (a „Meghívóim” ablak 💻 gombja és a `meghivo` parancs adja — a végén a meghívó):
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "cd ~; Remove-Item … koino_1.1-uj, koino_1.1.zip …; curl.exe … main.zip;
#   if (Test-Path koino_1.1.zip) { Expand-Archive koino_1.1.zip koino_1.1-uj; … }; & { if (<az új telepítő megvan>) { & <az új> @args }
#   else { & .\koino_1.1\koino\windows\telepit.ps1 @args } }" koino-meghivo:2:…
#
# ⭐⭐ D123 (PR7): a sor a már telepített programot FRISSÍTI is — lent, „A FRISSÍTÉS”.
# ⚠️ A program magától nem frissül (csak ha a sort bemásolod): hogy melyik kódot futtatja egy koinó, az a közösség dolga (a
# koino-verzió kártya, D119 — és ha a gépeden más a számítás magja, mint amivel a koinó született, a lap kimondja: D123).
# ⚠️ UTF-8 BOM-mal mentve: a Windows PowerShell 5.1 a BOM nélküli szkriptet ANSI-ként olvasná (a magyar betűk elromlanának) — a
# meghívó-próba őrzi.

# Átirányított kimenetnél UTF-8 (a konzol kódlapján a magyar betűk elromlanának — az `indit.ps1` ugyanígy).
if ([Console]::IsOutputRedirected) { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false }

if ($env:OS -ne 'Windows_NT') {
  Write-Host 'Ez a telepítő Windowsra készült. Telefonon (Termux): sh koino/termux/telepit.sh — más gépen: node koino/koino.js felulet'
  exit 1
}

# ===== ⭐⭐ D123 (PR7): A FRISSÍTÉS — a sor az új változatot a régi MELLÉ tölti, ez a szkript cserél =====
#
# A windowsos sor minden bemásoláskor letölti a programot a `koino_1.1-uj` mappába, és ha a kicsomagolás sikerült, az ott lévő (ÚJ)
# telepítőt hívja — ezt. Az új telepítő megnézi, hogy a csomag teljes-e; leállítja a régi mappából futó koinót (a node és az indító —
# mérve: amíg egy folyamat munkakönyvtára a mappában áll, a mappa nem nevezhető át, és különben a régi kód futna tovább); a régit
# `koino_1.1-regi`-nek nevezi (a következő frissítésig megmarad — ha valami a program mappájában volt, ott megtalálod); az újat a
# helyére teszi; és a helyén lévő (új) telepítőt hívja. ⛔ Egy git-tárat (`koino_1.1\.git`) nem cserél le — azt git-tel frissítsd.
# Ha a csere nem sikerül (egy másik program fogja a régi mappát), a régi marad, és a régi program indul — kimondva.
# ⚠️ Az adat (`%USERPROFILE%\koino-adat`) a program mappáján kívül van: a csere nem érinti.
# ⭐ Ha nem frissítés (a meglévő telepítő fut — pl. nincs hálózat), a futó koinót akkor is leállítja és újraindítja: a felület
# különben foglalt portot találna. `KOINO_INDITAS=nem`: a telepítő csak frissít és leállít, a programot nem indítja (a próbáknak).

$GYOKER = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # …\koino_1.1 — vagy a letöltött: …\koino_1.1-uj\koino_1.1-main
$UJ_NEV = 'koino_1.1-uj'
$UJBOL = ((Split-Path -Leaf $GYOKER) -eq 'koino_1.1-main') -and ((Split-Path -Leaf (Split-Path -Parent $GYOKER)) -eq $UJ_NEV)

# A csomag teljes-e: ezek nélkül a program nem indulhat. (A zip a `koino\windows` mappát a koino többi része UTÁN hozza — ha a
# telepítő megvan, a többi is; ez a vizsga a biztonság kedvéért.)
$LENYEGES = @('koino\koino.js', 'koino\js\esemeny\esemeny.js', 'koino\felulet\index.html', 'koino\windows\indit.ps1',
  'koino\windows\telepit.ps1')

# A program mappájából futó koino leállítása: a node (`…\koino\koino.js`) és az indító (`…\koino\windows\indit.ps1`) — ezt a
# folyamatot kivéve. Visszaadja, hány folyamatot állított le.
function FutoKoinoLeallitasa([string]$programMappa) {
  $elotag = (Join-Path $programMappa 'koino') + '\'
  $mintak = @(($elotag + 'koino.js'), ($elotag + 'windows\indit.ps1'))
  $futok = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $sor = $_.CommandLine
    $_.ProcessId -ne $PID -and $sor -and @($mintak | Where-Object { $sor.IndexOf($_, [StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count
  })
  foreach ($p in $futok) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
  foreach ($p in $futok) { Wait-Process -Id $p.ProcessId -Timeout 10 -ErrorAction SilentlyContinue }
  return $futok.Count
}

if ($UJBOL) {
  $ujMappa = Split-Path -Parent $GYOKER
  $otthon = Split-Path -Parent $ujMappa
  $helye = Join-Path $otthon 'koino_1.1'
  $regi = Join-Path $otthon 'koino_1.1-regi'
  $hiany = @($LENYEGES | Where-Object { -not (Test-Path -LiteralPath (Join-Path $GYOKER $_)) })
  $baj = $null
  if ($hiany.Count) {
    $baj = 'a letöltött csomag nem teljes (hiányzik: ' + ($hiany -join ', ') + ')'
  } elseif (Test-Path -LiteralPath (Join-Path $helye '.git')) {
    $baj = 'a ' + $helye + ' egy git-tár — azt nem cserélem le; frissítsd git-tel (git pull)'
  } else {
    $leallitva = FutoKoinoLeallitasa $helye
    if ($leallitva) { Write-Host ('· A futó koinót leállítottam (' + $leallitva + ' folyamat) — az új programmal indul újra.') }
    $atnevezve = $false
    try {
      if (Test-Path -LiteralPath $helye) {
        if (Test-Path -LiteralPath $regi) { Remove-Item -LiteralPath $regi -Recurse -Force -ErrorAction Stop }
        Rename-Item -LiteralPath $helye 'koino_1.1-regi' -ErrorAction Stop
        $atnevezve = $true
      }
      Move-Item -LiteralPath $GYOKER $helye -ErrorAction Stop
    } catch {
      $baj = 'a csere nem sikerült: ' + $_.Exception.Message
      if ($atnevezve -and -not (Test-Path -LiteralPath $helye)) { Rename-Item -LiteralPath $regi 'koino_1.1' -ErrorAction SilentlyContinue }
    }
  }
  Remove-Item -LiteralPath $ujMappa -Recurse -Force -ErrorAction SilentlyContinue
  $telepito = Join-Path $helye 'koino\windows\telepit.ps1'
  if ($baj) {
    Write-Host ('⚠ A program most nem frissült: ' + $baj)
    if (-not (Test-Path -LiteralPath $telepito)) { exit 1 }
    Write-Host '  A meglévő program indul.'
  } else {
    if ($atnevezve) { Write-Host ('✓ A program frissült: ' + $helye + ' — a régi a következő frissítésig: ' + $regi) }
    else { Write-Host ('✓ A program letöltve: ' + $helye) }
  }
  # a helyén lévő telepítő (frissítés után már az új) folytatja — a meghívóval
  & $telepito @args
  exit $LASTEXITCODE
}

# Egy korábbi, félbemaradt letöltés maradéka (a sor a következő bemásoláskor amúgy is eltávolítja).
Remove-Item -LiteralPath (Join-Path (Split-Path -Parent $GYOKER) $UJ_NEV) -Recurse -Force -ErrorAction SilentlyContinue
# Ha egy korábbi ablakban fut a koino, leállítjuk: a felület különben foglalt portot találna.
$leallitva = FutoKoinoLeallitasa $GYOKER
if ($leallitva) { Write-Host ('· A futó koinót leállítottam (' + $leallitva + ' folyamat) — most újraindul.') }
if ($env:KOINO_INDITAS -eq 'nem') {
  Write-Host ('✓ A program a helyén: ' + $GYOKER + ' (KOINO_INDITAS=nem — nem indítom el)')
  exit 0
}

# A winget után a mostani folyamat még a régi PATH-t látja — a gépé és a felhasználóé újra a rendszerből.
function NodeKeresese {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  Get-Command node -ErrorAction SilentlyContinue
}

# ===== A NODE — ha nincs, a winget hozza =====
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host '· A Node.js nincs a gépen — telepítem (winget). A Windows engedélyt kér rá: válaszolj igennel.'
    winget install -e --id OpenJS.NodeJS.LTS --source winget
    $node = NodeKeresese
  }
  if (-not $node) {
    Write-Host '⚠ A Node.js nincs a gépen, és most nem sikerült telepíteni. Telepítsd a https://nodejs.org oldalról (az LTS-t),'
    Write-Host '  aztán másold be újra ugyanazt a sort.'
    exit 1
  }
}
$NODE = $node.Source

# ===== A VIZSGA: tud-e a Node Ed25519-et? =====
& $NODE -e 'crypto.subtle.generateKey({name:''Ed25519''},true,[''sign'',''verify'']).then(()=>process.exit(0),()=>process.exit(1))'
if ($LASTEXITCODE -ne 0) {
  Write-Host ('⚠ A Node (' + (& $NODE -v) + ') nem tud Ed25519-aláírást — a koino így nem futhat. Frissítsd:')
  Write-Host '  winget upgrade -e --id OpenJS.NodeJS.LTS  (vagy a https://nodejs.org oldalról), aztán másold be újra a sort.'
  exit 1
}
Write-Host ('✓ A Node tud Ed25519-et (' + (& $NODE -v) + ')')

# ===== AZ ASZTALI IKON — a következő indításhoz =====
#
# ⭐ Közvetlenül a PowerShellt indítja (nem a `koino.cmd`-t: a cmd a Ctrl+C után még egy „Terminate batch job?” kérdést tenne fel),
# `-NoExit`-tel: ha valami nem indul el, az ablak nyitva marad, és a hiba olvasható.
$indito = Join-Path $PSScriptRoot 'indit.ps1'
try {
  $asztal = [Environment]::GetFolderPath('Desktop')
  # (mérve: egy kicserélt USERPROFILE mellett a Windows üres asztal-mappát ad — akkor nincs hova tenni az ikont)
  if (-not $asztal) { throw 'a Windows nem mondta meg, hol az asztal' }
  $ikon = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $asztal 'koino.lnk'))
  $ikon.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $ikon.Arguments = '-NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $indito + '"'
  $ikon.WorkingDirectory = $HOME
  $ikon.Description = 'A koino indítása (a lap és az őrjárat)'
  $ikon.Save()
  Write-Host '✓ Telepítve. A következő indításhoz elég az asztalon a „koino” ikon.'
} catch {
  Write-Host ('✓ Telepítve. (Az asztali ikon nem készült el: ' + $_.Exception.Message + ')')
  Write-Host ('  A következő indítás: ' + (Join-Path $PSScriptRoot 'koino.cmd'))
}
Write-Host ''

# ⭐ D122: a meghívó (ha a telepítő sor végén ott van) az indítóhoz megy — az fogadja el
& $indito @args
exit $LASTEXITCODE
