slugline
========

[![Build Status](https://travis-ci.com/krad/slugline.svg?branch=master)](https://travis-ci.com/krad/slugline)
[![Coverage Status](https://coveralls.io/repos/github/krad/slugline/badge.svg?branch=master)](https://coveralls.io/github/krad/slugline?branch=master)

slugline is a library for consuming HLS playlists.

It can be used in node.js and in the browser.

### Features

  * ✅ Fetching playlists
  * ✅ Fetching media segments
  * ✅ Parsing Media Playlists
  * ✅ Parsing Master Playlists
  * ✅ Retry logic (timeout, 500, network error, etc)
  * ✅ Parsing Media Segments
    * ✅ Fragmented MP4
    * ❎ Transport Stream
    * ❎ FLV
  * ✅ Periodic fetching of event & live playlists
  * ❎ Range Requests

# Usage

*COMING SOON*

# Demos

*COMING SOON*

# Development setup

Dependencies for setting up a development environment are managed with npm.
One needs to simply clone the repo and run `npm install` like so:

```
$ git clone https://github.com/krad/slugline.git slugline
$ cd slugline
$ npm install
```

# Testing

## Preparation

The test suite relies on some fixtures that are too large to be distributed along with the library.
A fetch script is included and relies on [wget](https://www.gnu.org/software/wget/) to retrieve assets.

To prepare the environment simply run:
```
$ ./tests/fixtures/fetch.sh
```

And wait for all the assets to download.

## Running tests

### Unit tests

`npm run test`

### Autotesting

`npm run autotest`
