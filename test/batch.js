var test = require('tape')
var createDb = require('./lib/create-db')

test('create nodes', function (t) {
  var db = createDb()

  t.plan(2)

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

  var batch = nodes.map(function (node) {
    return {
      type: 'put',
      value: node
    }
  })

  db.batch(batch, function (err, elms) {
    t.error(err)
    elms.forEach(clearIdVersion)
    t.deepEquals(elms, nodes)
  })
})

test('create + update nodes', function (t) {
  var db = createDb()

  t.plan(7)

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

  db.create(nodes[0], function (err, node) {
    t.error(err)

    nodes[0].lat = '75'

    var batch = nodes.map(function (elm, idx) {
      return {
        type: 'put',
        id: idx === 0 ? node.id : undefined,
        value: elm
      }
    })

    db.batch(batch, function (err) {
      t.error(err)
      db.get(node.id, function (err, elements) {
        t.error(err)
        t.equals(elements.length, 1)
        var element = elements[0]
        t.equals(element.id, node.id)
        t.ok(element.version)
        t.equals(element.lat, '75')
      })
      // TODO: do a hyperdb#createHistoryStream to check for entries
    })
  })
})

test('create + delete nodes', function (t) {
  var db = createDb()

  t.plan(10)

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

  var batch1 = nodes.map(function (node) {
    return {
      type: 'put',
      value: node
    }
  })

  db.batch(batch1, function (err, elms) {
    t.error(err)

    var elmId = elms[0].id
    var elmVersion = elms[0].version
    var batch2 = [
      {
        type: 'del',
        id: elmId,
        value: { changeset: '10' }
      },
      {
        type: 'put',
        value: { type: 'node', changeset: '8', lat: '0', lon: '0' }
      }
    ]
    db.batch(batch2, function (err, elms) {
      t.error(err)
      t.equals(elms.length, 2)
      t.notEqual(elms[0].version, elmVersion)
      delete elms[0].version
      t.deepEquals(elms[0], { id: elmId, deleted: true, changeset: '10' })
      clearIdVersion(elms[1])
      t.deepEquals(elms[1], { type: 'node', changeset: '8', lat: '0', lon: '0' })

      db.get(elmId, function (err, elms) {
        t.error(err)
        t.equals(elms.length, 1)
        t.notEqual(elms[0].version, elmVersion)
        delete elms[0].version
        t.deepEquals(elms[0], { id: elmId, deleted: true, changeset: '10' })
      })
    })
  })
})

function clearIdVersion (elm) {
  delete elm.id
  delete elm.version
}
