#!bash

echo "Removing last snapshot files ..."
rm -R latest  
rm -R docs
rm README.md

echo "Removing non-releaseable files ..."
find out -type f -not -name '*.wasm' -not -name '*.js' -not -name '*.ts' -not -name '*.md' -delete || exit 1

echo "Taking new snapshot ..."
mkdir latest
mv out/wa latest/wa || exit 1
mv out/prod latest/js || exit 1
mv out/docs docs || exit 1
mv out/README.md . || exit 1

echo "Creating archive ..."
rm latest.zip
zip -r9 latest.zip latest || exit 1

echo "Pushing the new changes ..."
git add . || exit 1
git commit --amend --no-edit || exit 1
git push -f || exit 1

echo "Success!"
