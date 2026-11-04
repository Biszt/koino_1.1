# koino/windows/telepit.ps1

# Felelősség: AZ ELSŐ INDÍTÁS WINDOWSON — a `termux/telepit.sh` párja (2026-11-04, a terepi lelet: a Termux-sor egy windowsos laptop
# parancssorában az első szónál megállt; elágazás 232). A meghívó windowsos sora (`js/csere/meghivo.js` `WINDOWS_TELEPITO_SOR`) a
# letöltés után ezt hívja: ha nincs Node, a `winget`-tel telepíti (a Windows engedélyt kér rá), ellenőrzi, hogy a Node tud-e
# Ed25519-et (a koino minden műveletet aláír — ha ez nincs meg, semmi más nem számít), az asztalra tesz egy „koino” ikont (a további
# indításhoz), és elindítja (`indit.ps1`, a meghívóval).
#
# A windowsos sor (a „Meghívóim” ablak 💻 gombja és a `meghivo` parancs adja — a végén a meghívó):
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "cd ~; if (-not (Test-Path koino_1.1)) { curl.exe … main.zip; Expand-Archive …;
#   Rename-Item koino_1.1-main koino_1.1; Remove-Item koino_1.1.zip }; & .\koino_1.1\koino\windows\telepit.ps1" koino-meghivo:2:…
#
# ⚠️ A program nem frissül magától: hogy melyik kódot futtatja egy koinó, az a közösség dolga (a koino-verzió kártya, D119).
# ⚠️ UTF-8 BOM-mal mentve: a Windows PowerShell 5.1 a BOM nélküli szkriptet ANSI-ként olvasná (a magyar betűk elromlanának) — a
# meghívó-próba őrzi.

# Átirányított kimenetnél UTF-8 (a konzol kódlapján a magyar betűk elromlanának — az `indit.ps1` ugyanígy).
if ([Console]::IsOutputRedirected) { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false }

if ($env:OS -ne 'Windows_NT') {
  Write-Host 'Ez a telepítő Windowsra készült. Telefonon (Termux): sh koino/termux/telepit.sh — más gépen: node koino/koino.js felulet'
  exit 1
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
