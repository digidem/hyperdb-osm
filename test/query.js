var test = require('tape')
var createDb = require('./lib/create-db')

test('query empty dataset', function (t) {
  t.plan(6)

  var db = createDb()

  var bbox = [[-85, 85], [-180, 180]]

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
