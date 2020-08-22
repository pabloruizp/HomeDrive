#! /bin/bash
echo "dump2drive instalation"

echo "[x] Installing NodeJS packages"
npm install

echo "[x] Creating files folder"
mkdir files

echo "[x] Adding dump2drive to the PATH"
sudo cp dump2drive /usr/local/bin
