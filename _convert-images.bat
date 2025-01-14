@echo off
rem https://imagemagick.org/script/mogrify.php

cd src
cd assets
cd enshrouded-images

echo convert with ImageMagick
pause
magick mogrify -format webp *.png

echo deleting png
pause
del *.png

echo convert file to lowercase
pause
python ../../../_lowercase.py

pause
