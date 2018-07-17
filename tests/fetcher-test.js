const test = require('tape')
import { Fetcher } from '../src/fetcher'


test.only('basic fetcher behavior', t=> {

  t.plan(3)
  t.timeoutAfter(3000)

  const fetcher = new Fetcher({url: '/fake', timeout: 100})
  t.equals(0, fetcher.progress,     'progress was zero')
  t.equals(100, fetcher._timeout,  'default timeout was 100ms')

  fetcher.fetch()
  .then(res => { t.fail('We should have timeedOut') })
  .catch(err => {
    t.deepEquals(err, new Error('fetch timed out'), 'got timeout error')
  })

})
