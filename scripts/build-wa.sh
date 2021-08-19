#!/usr/bin/bash

echo "Making sure runtime output directory exists ..."
mkdir -p ./out
rm -fR ./out/wa 
mkdir ./out/wa || exit 1 

echo "Building runtime modules ..."
ls ./src/wa/*.wat \
    | xargs -I {} basename {} ".wat" \
    | xargs -I {} wat2wasm --enable-bulk-memory --output=./out/wa/{}.wasm ./src/wa/{}.wat || exit 1

echo "Success!"
