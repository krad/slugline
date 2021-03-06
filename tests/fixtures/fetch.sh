#!/bin/bash

SCRIPT=$0
SCRIPTPATH=$(dirname "$SCRIPT")

######################################################################
echo "Fetching krad.tv example stream"
KRAD_STREAM_PATH=$SCRIPTPATH/basic/krad.tv/tractor
KRAD_ASSET_HOST="https://s3.amazonaws.com/krad-tv-staging-video"
mkdir -p $KRAD_STREAM_PATH
wget -N  $KRAD_ASSET_HOST/17382146-1e78-4ab5-bcdd-b57c59376259/vod.m3u8 -P $KRAD_STREAM_PATH
for number in $(seq 0 21); do
  PLAYLIST_URL="$KRAD_ASSET_HOST/17382146-1e78-4ab5-bcdd-b57c59376259/fileSeq${number}.mp4"
  wget -N $PLAYLIST_URL -P $KRAD_STREAM_PATH
done

######################################################################
echo "Fetching Apple Basic sample HLS stream"
mkdir -p $SCRIPTPATH/apple-basic-ts/{gear1,gear2,gear3,gear4,gear0}

# Fetch master playlist
wget -N https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8 -P $SCRIPTPATH/apple-basic-ts

# Fetch variant playlists
for number in $(seq 0 4); do
  PLAYLIST_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/gear${number}/prog_index.m3u8"
  OUTPUT="${SCRIPTPATH}/apple-basic-ts/gear${number}"
  wget -N $PLAYLIST_URL -P $OUTPUT
done

# Fetch transport stream files from the first playlist
for number in $(seq 0 180); do
  VIDEO_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/gear1/fileSequence${number}.ts"
  OUTPUT="${SCRIPTPATH}/apple-basic-ts/gear1"
  wget -N $VIDEO_URL -P $OUTPUT
done

######################################################################
echo "Fetching Apple Advanced sample HLS stream"
mkdir -p $SCRIPTPATH/apple-advanced-fmp4/{v2,v3,v4,v5,v6,v7,v8,v9,a1,a2,a3}

# Fetch master playlist
wget -N https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8 -P $SCRIPTPATH/apple-advanced-fmp4

# Fetch variant playlists for video streams
for number in $(seq 2 9); do
  PLAYLIST_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/v${number}/prog_index.m3u8"
  #VIDEO_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/v${number}/main.mp4"
  OUTPUT="${SCRIPTPATH}/apple-advanced-fmp4/v${number}"
  wget -N $PLAYLIST_URL -P $OUTPUT
  #wget -N $VIDEO_URL -P $OUTPUT
done

# Fetch variant playlists for audio streams
for number in $(seq 1 3); do
  PLAYLIST_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/a${number}/prog_index.m3u8"
  #AUDIO_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/a${number}/main.mp4"
  OUTPUT="${SCRIPTPATH}/apple-advanced-fmp4/a${number}"
  wget -N $PLAYLIST_URL -P $OUTPUT
  #wget -N $AUDIO_URL -P $OUTPUT
done

echo "Fetching a single ts file for now"
wget -N https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/gear1/fileSequence0.ts -P $SCRIPTPATH
