var test = require('tape')
var hyper = require('hyperdb')
var Osm = require('..')
var ram = require('random-access-memory')

test('creation verification: node', function (t) {
  t.plan(1)

  var db = hyper(ram, { valueEncoding: 'json' })
  var osm = Osm(db)

  var node = {
    type: 'node',
    changeset: '9',
    lat: '-11',
    lon: '-10',
    timestamp: '2017-10-10T19:55:08.570Z'
  }

  osm.create(node, function (err) {
    t.error(err)
  })
})

test('creation verification: way', function (t) {
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

test('creation verification: relation', function (t) {
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

test('creation verification: changeset', function (t) {
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
