var test = require('tape')
var createDb = require('./lib/create-db')

test('update to id that doesnt exist', function (t) {
  t.plan(1)

  var db = createDb()

  var node = {
    type: 'node',
    changeset: '9',
    lat: '-11',
    lon: '-10',
    timestamp: '2017-10-10T19:55:08.570Z'
  }

  db.osm.put('1213230', node, function (err) {
    t.ok(err instanceof Error)
  })
})

test('update to different type', function (t) {
  t.plan(2)

  var db = createDb()

  var node = {
    type: 'node',
    changeset: '9',
    lat: '-11',
    lon: '-10',
    timestamp: '2017-10-10T19:55:08.570Z'
  }
  var way = {
    type: 'way',
    changeset: '9',
    nodes: ['1']
  }

  db.osm.create(node, function (err, id) {
    t.error(err)
    db.osm.put(id, way, function (err) {
      t.ok(err instanceof Error)
    })
  })
})

test('update good nodes', function (t) {
  var nodes = [
    {
      type: 'node',
      changeset: '9',
      lat: '-11',
      lon: '-10',
      timestamp: '2017-10-10T19:55:08.570Z'
    },
    {
      type: 'node',
      changeset: '9',
      lat: '-11',
      lon: '-10'
    }
  ]

  t.plan(6)

  var db = createDb()

  db.osm.create(nodes[0], function (err, elm1) {
    t.error(err)
    t.ok(elm1)
    db.osm.put(elm1.id, nodes[1], function (err, elm2) {
      t.error(err)
      t.ok(elm1)
      t.equals(elm1.id, elm2.id)
      t.notEquals(elm1.version, elm2.version)
    })
  })
})

test('update bad nodes', function (t) {
  var nodes = [
    {
      type: 'node'
    },
    {
      type: 'node',
      changeset: '9'
    },
    {
      type: 'node',
      changeset: '9',
      lat: '12'
    },
    {
      type: 'node',
      changeset: '9',
      lon: '-7'
    },
    {
      type: 'node',
      changeset: '9',
      lat: '-91',
      lon: '-7'
    },
    {
      type: 'node',
      changeset: '9',
      lat: '291',
      lon: '-7'
    },
    {
      type: 'node',
      changeset: '9',
      lat: '31',
      lon: '-185'
    },
    {
      type: 'node',
      changeset: '9',
      lat: '31',
      lon: '185'
    },
    {
      type: 'node',
      changeset: '9',
      lat: '31',
      lon: '85',
      timestamp: 'soon'
    }
  ]

  t.plan(nodes.length + 1)

  var db = createDb()

  db.osm.create({
    type: 'node',
    changeset: '12',
    lat: '12',
    lon: '17'
  }, function (err, id) {
    t.error(err)
    nodes.forEach(function (node, idx) {
      db.osm.put(id, node, function (err) {
        t.ok(err instanceof Error, 'nodes[' + idx + ']')
      })
    })
  })
})

test('delete a node', function (t) {
  t.plan(6)

  var db = createDb()

  var node = {
    type: 'node',
    changeset: '9',
    lat: '-11',
    lon: '-10',
    timestamp: '2017-10-10T19:55:08.570Z'
  }
  var nodeDeletion = {
    type: 'node',
    changeset: '10',
    lat: '-11',
    lon: '-10',
    visible: false
  }

  db.osm.create(node, function (err, elm) {
    t.error(err)
    db.osm.put(elm.id, nodeDeletion, function (err) {
      t.error(err)
      db.osm.get(elm.id, function (err, elms) {
        t.error(err)
        t.equals(elms.length, 1)
        t.equals(elms[0].id, elm.id)
        delete elms[0].id
        delete elms[0].version
        t.deepEquals(elms[0], nodeDeletion)
      })
    })
  })
})

test('version lookup correctness', function (t) {
  var db = createDb()

  var changes = {
    type: 'changeset'
  }

  db.osm.create(changes, function (err, elm1) {
    t.error(err)
    changes.tags = { foo: 'bar' }
    db.osm.put(elm1.id, changes, function (err, elm2) {
      t.error(err)
      t.deepEquals(elm2.tags, { foo: 'bar' })
      db.osm.getByVersion(elm1.version, function (err, elm3) {
        t.error(err)
        t.equals(elm1.id, elm3.id)
        t.equals(elm1.version, elm3.version)
        db.osm.getByVersion(elm2.version, function (err, elm4) {
          t.error(err)
          t.equals(elm2.id, elm4.id)
          t.equals(elm2.version, elm4.version)
          t.deepEquals(elm4.tags, { foo: 'bar' })
          t.end()
        })
      })
    })
  })
})
