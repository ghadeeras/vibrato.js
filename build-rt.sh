#!bash

echo "Making sure runtime output directory exists ..."
mkdir -p ./out
rm -fR ./out/rt 
mkdir ./out/rt || exit 1 

echo "Building runtime modules ..."
ls ./src/rt/*.wat \
    | xargs -I {} basename {} ".wat" \
    | xargs -I {} wat2wasm --output=./out/rt/{}.wasm ./src/rt/{}.wat || exit 1

echo "Success!"
