var test = require('tape')
var hyper = require('hyperdb')
var Osm = require('..')
var ram = require('random-access-memory')

test('create unknown element', function (t) {
  t.plan(1)

  var db = hyper(ram, { valueEncoding: 'json' })
  var osm = Osm(db)

  var node = {
    type: 'cortada',
    changeset: '9',
    lat: '-11',
    lon: '-10',
    timestamp: '2017-10-10T19:55:08.570Z'
  }

  osm.create(node, function (err) {
    t.ok(err instanceof Error)
  })
})

test('create good nodes', function (t) {
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

  t.plan(nodes.length)

  var db = hyper(ram, { valueEncoding: 'json' })
  var osm = Osm(db)

  nodes.forEach(function (node) {
    osm.create(node, function (err) {
      t.error(err)
    })
  })
})

test('create bad nodes', function (t) {
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

  var db = hyper(ram, { valueEncoding: 'json' })
  var osm = Osm(db)

  nodes.forEach(function (node, idx) {
    osm.create(node, function (err) {
      t.ok(err instanceof Error, 'nodes['+idx+']')
    })
  })
})

test('create way', function (t) {
  t.plan(1)

  var db = hyper(ram, { valueEncoding: 'json' })
  var osm = Osm(db)

  var way = {
    type: 'way',
    changeset: '19',
    refs: ['bob', 'dole', 'for', 'prez']
  }

  osm.create(way, function (err) {
    t.error(err)
  })
})

test('create bad way', function (t) {
  t.plan(1)

  var db = hyper(ram, { valueEncoding: 'json' })
  var osm = Osm(db)

  var way = {
    type: 'way',
    changeset: '19',
    refs: ['bob']
  }

  osm.create(way, function (err) {
    t.ok(err instanceof Error)
  })
})

test('create relation', function (t) {
  t.plan(1)

  var db = hyper(ram, { valueEncoding: 'json' })
  var osm = Osm(db)

  var relation = {
    type: 'relation',
    changeset: '19',
    tags: {
      waterway: 'river'
    },
    members: [
      {
        type: 'node',
        id: '101'
      }
    ]
  }

  osm.create(relation, function (err) {
    t.error(err)
  })
})

test('create changeset', function (t) {
  t.plan(1)

  var db = hyper(ram, { valueEncoding: 'json' })
  var osm = Osm(db)

  var changes = {
    type: 'changeset'
  }

  osm.create(changes, function (err) {
    t.error(err)
  })
})
