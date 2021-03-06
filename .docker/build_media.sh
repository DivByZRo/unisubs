#!/bin/bash
source /usr/local/bin/config_env

cd $APP_DIR
echo "Compiling Media..."
$VE_DIR/bin/python manage.py compile_media --compilation-level=ADVANCED_OPTIMIZATIONS --settings=unisubs_settings
echo "Uploading to S3..."
$VE_DIR/bin/python manage.py send_to_s3 --settings=unisubs_settings
