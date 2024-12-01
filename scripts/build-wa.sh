#!/usr/bin/bash

echo "Making sure runtime output directory exists ..."
mkdir -p ./lib
rm -fR ./lib/wa 
mkdir ./lib/wa || exit 1 

echo "Building runtime modules ..."
ls ./src/wa/*.wat \
    | xargs -I {} basename {} ".wat" \
    | xargs -I {} wat2wasm --output=./lib/wa/{}.wasm ./src/wa/{}.wat || exit 1

echo "Success!"
