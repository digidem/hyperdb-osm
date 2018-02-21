var test = require('tape')
var createDb = require('./lib/create-db')
var queryTest = require('./lib/query-test')

test('no bbox', function (t) {
  t.plan(4)

  var db = createDb()

  var bbox = null

  db.query(bbox, function (err, elements) {
    t.ok(err instanceof Error)
    t.equals(elements, undefined)
  })

  collect(db.query(bbox), function (err, elements) {
    t.ok(err instanceof Error)
    t.equals(elements, undefined)
  })
})

test('bad bbox', function (t) {
  t.plan(4)

  var db = createDb()

  var bbox = [[5, -5], [-5, 5]]

  db.query(bbox, function (err, elements) {
    t.ok(err instanceof Error)
    t.equals(elements, undefined)
  })

  collect(db.query(bbox), function (err, elements) {
    t.ok(err instanceof Error)
    t.equals(elements, undefined)
  })
})

test('query empty dataset', function (t) {
  t.plan(6)

  var db = createDb()

  var bbox = [[-5, 5], [-5, 5]]

  db.query(bbox, function (err, elements) {
    t.error(err)
    t.ok(Array.isArray(elements))
    t.equals(elements.length, 0)
  })

  collect(db.query(bbox), function (err, elements) {
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
        lat: String(Math.random() * 10 - 5),
        lon: String(Math.random() * 10 - 5)
      }
    })
    .map(function (node) {
      return {
        type: 'put',
        value: node
      }
    })
  db.batch(batch, function (err) {
    t.error(err)

    db.query(bbox, function (err, elements) {
      t.error(err)
      t.ok(Array.isArray(elements))
      t.equals(elements.length, 100)
    })

    collect(db.query(bbox), function (err, elements) {
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
      ] }
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
      refs: [ 'A', 'B', 'C' ] }
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
          role: 'bar' }
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

test('relation + super-relation on out-of-bbox node of a way', function (t) {
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
          id: 'C',
          role: 'foo' }
      ]
    },
    { type: 'relation',
      id: 'F',
      members: [
        { type: 'relation',
          id: 'E',
          role: 'bar' }
      ]
    }
  ]

  var queries = [
    {
      bbox: [[-10, 10], [-10, 10]],
      expected: [ 'A', 'B', 'C', 'D', 'E', 'F' ]
    },
    {
      bbox: [[-10, 0], [-10, 0]],
      expected: [ 'A', 'B', 'C', 'D', 'E', 'F' ]
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

test('opts.type: results sorted by type', function (t) {
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
          id: 'C',
          role: 'foo' }
      ]
    }
  ]

  var bbox = [[-10, 0], [-10, 0]]

  var batch = data.map(function (elm) {
    var id = elm.id
    delete elm.id
    return {
      type: 'put',
      id: id,
      value: elm
    }
  })
  db.batch(batch, function (err) {
    t.error(err)

    var pending = 2

    db.query(bbox, { order: 'type' }, function (err, res) {
      t.error(err, 'no error on cb query')
      t.equals(res.length, 5)
      t.equals(res[0].type, 'node')
      t.equals(res[1].type, 'node')
      t.equals(res[2].type, 'node')
      t.equals(res[3].type, 'way')
      t.equals(res[4].type, 'relation')
      if (!--pending) t.end()
    })

    collect(db.query(bbox, { order: 'type' }), function (err, res) {
      t.error(err, 'no error on streaming query')
      t.equals(res.length, 5)
      t.equals(res[0].type, 'node')
      t.equals(res[1].type, 'node')
      t.equals(res[2].type, 'node')
      t.equals(res[3].type, 'way')
      t.equals(res[4].type, 'relation')
      if (!--pending) t.end()
    })
  })
})

test('return only latest version of a modified node', function (t) {
  var db = createDb()

  var node = {
    type: 'node',
    id: 'A',
    lat: '0',
    lon: '0',
    tags: {}
  }
  var queries = [ {
    bbox: [[-10, 10], [-10, 10]],
    expected: [ 'A' ]
  } ]

  // Make sure node is present
  queryTest(t, db, [node], queries, function () {
    // Update node
    node.tags = { foo: 'bar' }
    node.changeset = '123'
    db.put('A', node, function (err) {
      t.error(err)
      db.query(queries[0].bbox, function (err, res) {
        t.error(err)
        t.equals(res.length, 1)
        t.equals(res[0].id, 'A')
        t.deepEquals(res[0].tags, { foo: 'bar' })
        t.end()
      })
    })
  })
})

test('return only latest way that references a node', function (t) {
  var db = createDb()

  var data = [
    { type: 'node',
      id: 'A',
      lat: '0',
      lon: '0',
      tags: {} },
    { type: 'node',
      id: 'B',
      lat: '1',
      lon: '1',
      tags: {} },
    { type: 'node',
      id: 'C',
      lat: '2',
      lon: '2',
      tags: {} },
    { type: 'way',
      id: 'D',
      refs: ['A', 'B', 'C'],
      tags: {} }
  ]

  var queries = [ {
    bbox: [[-10, 10], [-10, 10]],
    expected: [ 'A', 'B', 'C', 'D' ]
  } ]

  // Make sure node is present
  queryTest(t, db, data, queries, function () {
    // Update way
    var way = data[3]
    way.tags = { foo: 'bar' }
    way.changeset = '123'
    db.put('D', way, function (err) {
      t.error(err)
      db.query(queries[0].bbox, function (err, res) {
        t.error(err)
        t.equals(res.length, 4)
        var ids = res.map(function (elm) { return elm.id }).sort()
        t.deepEquals(ids, [ 'A', 'B', 'C', 'D' ])
        var ways = res.filter(function (elm) { return elm.id === 'D' })
        t.equals(ways.length, 1)
        t.deepEquals(ways[0].tags, { foo: 'bar' })
        t.end()
      })
    })
  })
})

test('deleted lone node', function (t) {
  var db = createDb()

  var data = [
    { type: 'node',
      id: 'A',
      lat: '0',
      lon: '0' },
    { type: 'node',
      id: 'B',
      lat: '1',
      lon: '1' }
  ]

  var queries = [
    {
      bbox: [[-10, 10], [-10, 10]],
      expected: [ 'A', 'B' ]
    }
  ]

  queryTest(t, db, data, queries, function () {
    db.del('A', { changeset: '4' }, function (err) {
      t.error(err)
      db.query([[-10, 10], [-10, 10]], function (err, res) {
        t.error(err)
        t.equals(res.length, 2)
        res.sort(cmpId)
        t.equals(res[0].id, 'A')
        t.equals(res[0].deleted, true)
        t.equals(res[1].id, 'B')
        t.end()
      })
    })
  })
})

test('deleted node of a way', function (t) {
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
      lat: '2',
      lon: '2' },
    { type: 'way',
      id: 'D',
      refs: ['A', 'B', 'C'] }
  ]

  var queries = [
    {
      bbox: [[-10, 10], [-10, 10]],
      expected: [ 'A', 'B', 'C', 'D' ]
    }
  ]

  queryTest(t, db, data, queries, function () {
    db.del('B', { changeset: '4' }, function (err) {
      t.error(err)
      db.query([[-10, 10], [-10, 10]], function (err, res) {
        t.error(err)
        t.equals(res.length, 4)
        res.sort(cmpId)
        var ids = res.map(e => e.id)
        t.deepEquals(ids, ['A', 'B', 'C', 'D'])
        t.equals(res[1].deleted, true)
        t.end()
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

function cmpId (a, b) {
  if (a.id < b.id) return -1
  else if (a.id > b.id) return 1
  else return 0
}
