const test = require('tape')

import * as Project from '../src/slugline'

test('that we expose things from the project properly', t=> {
  t.ok(Project.Playlist,         'Playlist was present')
  t.ok(Project.PlaylistFetcher,  'PlaylistFetcher was present')
  t.ok(Project.TransportStream,  'TransportStream was present')
  t.ok(Project.ElementaryStream, 'ElementaryStream was present')
  t.ok(Project.MPEGParser,       'MPEGParser was present')
  t.ok(Project.Transmuxer,       'Transmuxer was present')
  t.end()
})
