var test = require('tape')
var hyper = require('hyperdb')
var P2P = require('p2p-db')
var Osm = require('..')
var ram = require('random-access-memory')

test('update to id that doesnt exist', function (t) {
  t.plan(1)

  var db = P2P(hyper(ram, { valueEncoding: 'json' }))
  db.install('osm', Osm(db))

  var node = {
    type: 'node',
    changeset: '9',
    lat: '-11',
    lon: '-10',
    timestamp: '2017-10-10T19:55:08.570Z'
  }

  db.osm.put('1213230', node, function (err) {
    console.log('err', err)
    t.ok(err instanceof Error)
  })
})

test('update to different type', function (t) {
  t.plan(2)

  var db = P2P(hyper(ram, { valueEncoding: 'json' }))
  db.install('osm', Osm(db))

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

  t.plan(2)

  var db = P2P(hyper(ram, { valueEncoding: 'json' }))
  db.install('osm', Osm(db))

  db.osm.create(nodes[0], function (err, id) {
    t.error(err)
    db.osm.put(id, nodes[1], function (err) {
      t.error(err)
    })
  })
})

test('update bad nodes', function (t) {
  var nodes = [
    {
      type: 'node',
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
    },
  ]

  t.plan(nodes.length)

  var db = P2P(hyper(ram, { valueEncoding: 'json' }))
  db.install('osm', Osm(db))

  db.osm.create({
    type: 'node',
    changeset: '12',
    lat: '12',
    lon: '17'
  }, function (err, id) {
    nodes.forEach(function (node, idx) {
      db.osm.put(id, node, function (err) {
        t.ok(err instanceof Error, 'nodes['+idx+']')
      })
    })
  })
})

test('delete a node', function (t) {
  t.plan(5)

  var db = P2P(hyper(ram, { valueEncoding: 'json' }))
  db.install('osm', Osm(db))

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

  db.osm.create(node, function (err, id) {
    t.error(err)
    db.osm.put(id, nodeDeletion, function (err) {
      t.error(err)
      db.osm.get(id, function (err, elms) {
        t.error(err)
        t.equals(elms.length, 1)
        delete elms[0].id
        delete elms[0].version
        t.deepEquals(elms[0], nodeDeletion)
      })
    })
  })
})

