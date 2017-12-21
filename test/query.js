var test = require('tape')
var createDb = require('./lib/create-db')

test('query empty dataset', function (t) {
  t.plan(6)

  var db = createDb()

  var bbox = [[-5, 5], [-5, 5]]

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

test('query random dataset', function (t) {
  t.plan(7)

  var db = createDb()

  var bbox = [[-10, 10], [-10, 10]]

  // Generate a batch of random nodes
  var batch = (new Array(100))
    .fill(0)
    .map(function () {
      return {
        type: 'node',
        lat: Math.random() * 10 - 5,
        lon: Math.random() * 10 - 5
      }
    })
    .map(function (node) {
      return {
        type: 'put',
        value: node
      }
    })
  db.osm.batch(batch, function (err) {
    t.error(err)

    db.osm.geo.ready(function () {
      db.osm.query(bbox, function (err, elements) {
        t.error(err)
        t.ok(Array.isArray(elements))
        t.equals(elements.length, 100)
      })

      collect(db.osm.query(bbox), function (err, elements) {
        t.error(err)
        t.ok(Array.isArray(elements))
        t.equals(elements.length, 100)
      })
    })
  })
})

function collect (stream, cb) {
  var res = []
  stream.on('data', res.push.bind(res))
  stream.once('end', cb.bind(null, null, res))
  stream.once('error', cb.bind(null))
}
