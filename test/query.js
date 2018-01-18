var test = require('tape')
var createDb = require('./lib/create-db')
var queryTest = require('./lib/query-test')

test('no bbox', function (t) {
  t.plan(4)

  var db = createDb()

  var bbox = null

  db.osm.query(bbox, function (err, elements) {
    t.ok(err instanceof Error)
    t.equals(elements, undefined)
  })

  collect(db.osm.query(bbox), function (err, elements) {
    t.ok(err instanceof Error)
    t.equals(elements, undefined)
  })
})

test('bad bbox', function (t) {
  t.plan(4)

  var db = createDb()

  var bbox = [[5, -5], [-5, 5]]

  db.osm.query(bbox, function (err, elements) {
    t.ok(err instanceof Error)
    t.equals(elements, undefined)
  })

  collect(db.osm.query(bbox), function (err, elements) {
    t.ok(err instanceof Error)
    t.equals(elements, undefined)
  })
})

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

test('relations on bbox nodes', function (t) {
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
    { type: 'relation',
      id: 'C',
      members: [
        { type: 'node',
          id: 'A' }
      ] },
  ]

  var queries = [
    {
      bbox: [[-10, 10], [-10, 10]],
      expected: [ 'A', 'B', 'C' ]
    },
    {
      bbox: [[-10, 0], [-10, 0]],
      expected: [ 'A', 'C' ]
    }
  ]

  queryTest(t, db, data, queries, function () {
    t.end()
  })
})

test('ways', function (t) {
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
  ]

  var queries = [
    {
      bbox: [[-10, 10], [-10, 10]],
      expected: [ 'A', 'B', 'C', 'D' ]
    },
    {
      bbox: [[-10, 0], [-10, 0]],
      expected: [ 'A', 'B', 'C', 'D' ]
    },
    {
      bbox: [[-10, -10], [-10, -10]],
      expected: []
    }
  ]

  queryTest(t, db, data, queries, function () {
    t.end()
  })
})

test('relations on ways and nodes', function (t) {
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
          role: 'bar' },
      ]
    }
  ]

  var queries = [
    {
      bbox: [[-10, 10], [-10, 10]],
      expected: [ 'A', 'B', 'C', 'D', 'E' ]
    },
    {
      bbox: [[-10, 0], [-10, 0]],
      expected: [ 'A', 'B', 'C', 'D', 'E' ]
    },
    {
      bbox: [[-10, -10], [-10, -10]],
      expected: []
    }
  ]

  queryTest(t, db, data, queries, function () {
    t.end()
  })
})

function collect (stream, cb) {
  var res = []
  stream.on('data', res.push.bind(res))
  stream.once('end', cb.bind(null, null, res))
  stream.once('error', cb.bind(null))
}
