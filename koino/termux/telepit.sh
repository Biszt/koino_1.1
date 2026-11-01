#!/bin/sh
# koino/termux/telepit.sh

# Felelősség: AZ ELSŐ INDÍTÁS a telefonon (Termux) — a bemásolt egy sor a letöltés után ezt hívja: ellenőrzi, hogy a Node tud-e
# Ed25519-et (a koino minden műveletet aláír — ha ez nincs meg, semmi más nem számít), a Termux PATH-jára teszi a `koino`
# parancsot (a további indításhoz és a program parancsaihoz), és elindítja (`indit.sh`).
#
# A bemásolandó sor (docs/telepites_telefon.md, „A legegyszerűbb út”):
#   yes | pkg upgrade && pkg install -y nodejs git && { [ -d ~/koino_1.1 ] || git clone --depth 1
#   https://github.com/Biszt/koino_1.1.git ~/koino_1.1; } && sh ~/koino_1.1/koino/termux/telepit.sh
#
# ⚠️ A program nem frissül magától: hogy melyik kódot futtatja egy koinó, az a közösség dolga (a koino-verzió kártya, D119).

KONYVTAR=$(cd "$(dirname "$0")/.." && pwd)

if [ -z "$PREFIX" ] || [ ! -d "$PREFIX/bin" ]; then
  echo "Ez a telepítő a Termuxnak készült (a \$PREFIX nincs beállítva). Számítógépen: node koino/koino.js felulet"
  exit 1
fi

# ===== A VIZSGA: tud-e a Node Ed25519-et? =====
if ! node -e "crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']).then(()=>process.exit(0),()=>process.exit(1))"; then
  echo "⚠ A telefon Node-ja nem tud Ed25519-aláírást — a koino így nem futhat. Frissítsd: pkg upgrade nodejs"
  exit 1
fi
echo "✓ A Node tud Ed25519-et ($(node -v))"

# ===== A `koino` PARANCS =====
cat > "$PREFIX/bin/koino" <<EOF
#!$PREFIX/bin/sh
exec sh "$KONYVTAR/termux/indit.sh" "\$@"
EOF
chmod 700 "$PREFIX/bin/koino"
echo "✓ Telepítve. A következő indításhoz elég ennyi: koino"
echo

exec sh "$KONYVTAR/termux/indit.sh"
