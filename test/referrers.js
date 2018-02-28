var test = require('tape')
var createDb = require('./lib/create-db')
var setup = require('./lib/setup')
var collect = require('./lib/collect')

test('getReferrers API', function (t) {
  var db = createDb()

  var data = [
    { type: 'node',
      id: 'A',
      lat: '0',
      lon: '0' },
    { type: 'node',
      id: 'B',
      lat: '1',
      lon: '1' },
    { type: 'node',
      id: 'C',
      lat: '5',
      lon: '5' },
    { type: 'way',
      id: 'D',
      refs: [ 'A', 'B', 'C' ] },
    { type: 'relation',
      id: 'E',
      members: [
        { type: 'node',
          id: 'B',
          role: 'foo' },
        { type: 'way',
          id: 'D',
          role: 'bar' }
      ]
    },
    { type: 'relation',
      id: 'F',
      members: [
        { type: 'node',
          id: 'C',
          role: 'foob' },
        { type: 'node',
          id: 'B',
          role: 'boof' },
        { type: 'relation',
          id: 'E',
          role: 'bax' }
      ]
    }
  ]

  setup(db, data, function (err) {
    t.error(err)

    db.getReferrers('B', function (err, refs) {
      t.error(err)
      var ids = refs.map(function (ref) { return ref.id }).sort()
      t.deepEquals(ids, ['D', 'E', 'F'])
      db.getReferrers('C', function (err, refs) {
        t.error(err)
        var ids = refs.map(function (ref) { return ref.id }).sort()
        t.deepEquals(ids, ['D', 'F'])
        collect(db.getReferrers('E'), function (err, refs) {
          t.error(err)
          var ids = refs.map(function (ref) { return ref.id }).sort()
          t.deepEquals(ids, ['F'])
          t.end()
        })
      })
    })
  })
})
