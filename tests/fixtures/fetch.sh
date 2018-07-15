#!/bin/bash

mkdir -p ./apple-advanced-fmp4
mkdir -p ./apple-advanced-fmp4/{v2,v3,v4,v5,v6,v7,v8,v9,a1,a2,a3}

# Fetch master playlist
wget -N https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8 -P ./apple-advanced-fmp4

# Fetch variant playlists for video streams
for number in $(seq 2 9); do
  PLAYLIST_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/v${number}/prog_index.m3u8"
  VIDEO_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/v${number}/main.mp4"
  OUTPUT="./apple-advanced-fmp4/v${number}"
  wget -N $PLAYLIST_URL -P $OUTPUT
  wget -N $VIDEO_URL -P $OUTPUT
done

# Fetch variant playlists for audio streams
for number in $(seq 1 3); do
  PLAYLIST_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/a${number}/prog_index.m3u8"
  AUDIO_URL="https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/a${number}/main.mp4"
  OUTPUT="./apple-advanced-fmp4/a${number}"
  wget -N $PLAYLIST_URL -P $OUTPUT
  wget -N $AUDIO_URL -P $OUTPUT
done