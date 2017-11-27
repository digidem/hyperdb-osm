var test = require('tape')
var createDb = require('./lib/create-db')

test('changeset: get elements', function (t) {
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
    refs: ['bob', 'dole', 'for', 'prez']
  }

  var relation = {
    type: 'relation',
    changeset: '9',
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

  db.osm.create(node, function (err, id1) {
    t.ifError(err)
    db.osm.create(way, function (err, id2) {
      t.ifError(err)
      db.osm.create(relation, function (err, id3) {
        t.ifError(err)
        db.osm.getChanges('9', function (err, res) {
          var expected = [id1, id2, id3].sort()
          t.equals(res.length, 3)
          t.deepEquals(res, expected)
          t.end()
        })
      })
    })
  })
})

