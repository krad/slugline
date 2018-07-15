const test = require('tape')
const fs   = require('fs')
import { Attribute, splitComponents } from '../src/attribute_list'


test('parsing a complex attribute list', t=>{

  const input  = 'AVERAGE-BANDWIDTH=2168183,BANDWIDTH=2177116,CODECS="avc1.640020,mp4a.40.2",RESOLUTION=960x540,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud1",SUBTITLES="sub1"'
  const result = splitComponents(input)

  t.equals(2168183, result['AVERAGE-BANDWIDTH'],      'got avg bandwidth')
  t.equals(2177116, result['BANDWIDTH'],              'got bandwidth')
  t.equals('avc1.640020,mp4a.40.2', result['CODECS'], 'got codecs')
  t.equals('960x540', result['RESOLUTION'],           'got resolution')
  t.equals(60.000, result['FRAME-RATE'],              'got frame-rate')
  t.equals('cc1', result['CLOSED-CAPTIONS'],          'got closed captions')
  t.equals('aud1', result['AUDIO'],                   'got audio')
  t.equals('sub1', result['SUBTITLES'],               'got subtitles')


  t.end()
})

test('parsing arbitrary list input', t=> {

  const tests = [
    {input: '1',          exp: 1},
    {input: 1,            exp: 1},
    {input: '1.23',       exp: 1.23},
    {input: '"hi there"', exp: 'hi there'},
    {input: 'a=1,b=2',    exp: {a: 1, b: 2}},
    {input: 'a="hi there",b=", dude"', exp: {a: 'hi there', b: ', dude'}},
    {input: '/fileSeq0.mp4', exp: '/fileSeq0.mp4'},
    {input: 'http://example.com/playlist.m3u8', exp: 'http://example.com/playlist.m3u8'}
  ]

  tests.forEach(i => {
    t.deepEquals(Attribute.parseList(i.input), i.exp, 'got expectation "' + i.exp + '"')
  })

  t.end()
})
