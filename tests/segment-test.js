import { MediaSegment } from '../src/segment'
import {setupServer, tearDownServer, serverPort, hostAndPort} from './fixture-server'
const test = require('tape')

const initSegment   = '/basic/krad.tv/tractor/fileSeq0.mp4'
const mediaSegment  = '/basic/krad.tv/tractor/fileSeq1.mp4'

test('parsing segments', t=> {
  t.test(setupServer,     'parsing segments - fixture server started')
  t.test(testParse,       'parsing a segment')
  t.test(tearDownServer,  'parsing segments - tore down fixture server')
  t.end()
})


const testParse = (t) => {
  t.plan(2)
  t.timeoutAfter(3000)
  const segment = new MediaSegment({title: 'hi', duration: 5.0})

  segment.basePath = hostAndPort()
  segment.uri      = initSegment

  t.notOk(segment.data, 'segment had no data')

  segment.fetch()
  .then(segment => {
    t.ok(segment, 'we fetched the segment')
    console.log(segment);
  }).catch(err => {
    t.fail('Segment fetch failed:' + err)
  })


}
