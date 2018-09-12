const test = require('tape')
import fs from 'fs'
import { Playlist } from '../src/playlist'
import VariantStream from '../src/playlists/variant-stream'
import {setupServer, tearDownServer, serverPort, hostAndPort} from './fixture-server'

const advMaster = fs.readFileSync('./tests/fixtures/apple-advanced-fmp4/master.m3u8').toString()

test('that we can fetch a variant playlist', t=> {

  const playlist = Playlist.parse(advMaster)

  const variantA = playlist.variants[0]
  t.ok(variantA, 'has a variant')
  t.equals(false, variantA.isIFrame, 'was not an iframe variant')
  t.equals('v5/prog_index.m3u8', variantA.uri, 'had the correct uri')
  t.notOk(variantA.url, 'fetched from the file system does not have a url')

  variantA.basePath = 'http://www.example.com'
  t.ok(variantA.url, 'has a url now')
  t.equals('http://www.example.com/v5/prog_index.m3u8', variantA.url, 'resolved the url correctly')

  t.end()
})
