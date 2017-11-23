var test = require('tape')
var hyper = require('hyperdb')
var P2P = require('p2p-db')
var Osm = require('..')
var ram = require('random-access-memory')
var Geo = require('grid-point-store')
var memdb = require('memdb')

test('query empty dataset', function (t) {
  t.plan(6)

  var db = P2P(hyper(ram, { valueEncoding: 'json' }))
  var geo = Geo(memdb())
  db.install('osm', Osm(db, geo))

  var bbox = [[-85,85],[-180,180]]

  db.osm.query(bbox, function (err, elements) {
    t.error(err)
    t.ok(Array.isArray(elements))
    t.equals(elements.length, 0)
  })

  collect(db.osm.query(bbox), function (err, elements) {
    t.error(err)
    t.ok(Array.isArray(elements))
    t.equals(elements.length, 0)
  })
})

function collect (stream, cb) {
  var res = []
  stream.on('data', res.push.bind(res))
  stream.once('end', cb.bind(null, null, res))
  stream.once('error', cb.bind(null))
}
