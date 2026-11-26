#!/bin/sh
# Build the web root by ALLOWLIST (run at install time from the repo root):
#   sh packaging/build-web.sh
# Copies exactly what the app serves. Never includes sql/, server/, tests/,
# packaging/, docs/, setup/, tools/, analysis/, .git or markdown.
set -eu
DEST="$(dirname "$0")/web"
# Empty the directory IN PLACE, never rm -rf it: a running web container
# bind-mounts this directory, and replacing the directory itself leaves the
# container looking at a deleted inode (403/404 until it is recreated).
mkdir -p "$DEST"
find "$DEST" -mindepth 1 -delete

# pages (pricing.html KEPT: clinical pricing page linked from control.html)
cp ./*.html "$DEST"/
rm -f "$DEST/employees.demo.html"   # demo page

# runtime assets actually referenced by the pages:
#   css/ js/ vendor/      <- <link>/<script> tags
#   images/               <- tooth SVGs loaded by js/patient-file.js
#   webfonts/             <- FontAwesome fonts referenced by vendor/*.css
#   manifest/icons/sw     <- referenced by index.html
cp -r css js vendor images webfonts "$DEST"/
cp manifest.json service-worker.js icon-192.png icon-512.png "$DEST"/

# config: the served file is $DEST/js/config.local.js. If the installer
# already created the real js/config.local.js, ship it; otherwise ship the
# placeholder and say so loudly (the app refuses to start without real values).
rm -f "$DEST"/js/config.local.js
if [ -f js/config.local.js ]; then
    cp js/config.local.js "$DEST"/js/config.local.js
    echo "config: real js/config.local.js included"
else
    cp js/config.example.js "$DEST"/js/config.local.js
    echo "WARNING: no js/config.local.js - placeholder shipped."
    echo "  Create the real config, then re-run this script (or edit"
    echo "  $DEST/js/config.local.js directly) before first use."
fi
echo "web root built at $DEST"
