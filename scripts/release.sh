#!bash

echo "Removing last snapshot files ..."
rm -R rt  
rm -R js  
rm -R docs
rm README.md

echo "Removing non-releaseable files ..."
find out -type f -not -name '*.wasm' -not -name '*.js' -not -name '*.ts' -not -name '*.md' -delete || exit 1

echo "Taking new snapshot ..."
mv out/rt rt || exit 1
mv out/prod js || exit 1
mv out/docs docs || exit 1
mv out/README.md . || exit 1

echo "Creating the manifest ..."
touch manifest
find rt -type f > manifest
find js -type f >> manifest
[[ -f manifest ]] || exit 1

echo "Pushing the new changes ..."
git add . || exit 1
git commit --amend --no-edit || exit 1
git push -f || exit 1

echo "Success!"
