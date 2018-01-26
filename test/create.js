var test = require('tape')
var createDb = require('./lib/create-db')
var hyper = require('hyperdb')
var P2P = require('p2p-db')
var Osm = require('..')
var ram = require('random-access-memory')

test('incorrect db init', function (t) {
  t.plan(3)

  try {
    Osm()
  } catch (e) {
    t.ok(e instanceof Error)
  }

  try {
    Osm({})
  } catch (e) {
    t.ok(e instanceof Error)
  }

  try {
    Osm({
      p2pdb: P2P(hyper(ram, { valueEncoding: 'json' }))
    })
  } catch (e) {
    t.ok(e instanceof Error)
  }
})

test('create unknown element', function (t) {
  t.plan(1)

  var db = createDb()

  var node = {
    type: 'cortada',
    changeset: '9',
    lat: '-11',
    lon: '-10',
    timestamp: '2017-10-10T19:55:08.570Z'
  }

  db.osm.create(node, function (err) {
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

  t.plan(nodes.length * 4)

  var db = createDb()

  nodes.forEach(function (node) {
    db.osm.create(node, function (err, elm) {
      t.error(err)
      t.ok(elm)
      t.ok(elm.id)
      t.ok(elm.version)
    })
  })
})

test('create bad nodes', function (t) {
  var nodes = [
    {
      // no type set
    },
    {
      // non-string type
      type: 17
    },
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
    },
    {
      type: 'node',
      changeset: '9',
      lat: '31',
      lon: '85',
      tags: 'hello'  // non-object tags
    }
  ]

  t.plan(nodes.length)

  var db = createDb()

  nodes.forEach(function (node, idx) {
    db.osm.create(node, function (err) {
      t.ok(err instanceof Error, 'nodes[' + idx + ']')
    })
  })
})

test('create good ways', function (t) {
  var ways = [
    {
      type: 'way',
      changeset: '19',
      refs: ['bob', 'dole', 'for', 'prez'],
      timestamp: '2017-10-10T19:55:08.570Z'
    },
    {
      type: 'way',
      changeset: '19',
      refs: ['bob', 'dole', 'for', 'prez']
    },
    {
      type: 'node',
      changeset: '9',
      lat: '-11',
      lon: '-10',
      extra: 'field'
    }
  ]

  t.plan(ways.length * 4)

  var db = createDb()

  ways.forEach(function (node) {
    db.osm.create(node, function (err, elm) {
      t.error(err)
      t.ok(elm)
      t.ok(elm.id)
      t.ok(elm.version)
    })
  })
})

test('create bad ways', function (t) {
  var ways = [
    {
      type: 'way'
    },
    {
      type: 'way',
      changeset: '14'
    },
    {
      type: 'way',
      changeset: '14',
      refs: []
    },
    {
      type: 'way',
      changeset: '14',
      refs: ['hi']
    },
    {
      type: 'way',
      changeset: '14',
      refs: ['hi', 'there']
    },
    {
      type: 'way',
      changeset: 14,
      refs: ['hi', 'there', 'friend']
    },
    {
      type: 'way',
      changeset: '14',
      refs: ['hi', 'there', 'friend'],
      timestamp: 'a while ago'
    }
  ]

  t.plan(ways.length)

  var db = createDb()

  ways.forEach(function (node, idx) {
    db.osm.create(node, function (err) {
      t.ok(err instanceof Error, 'ways[' + idx + ']')
    })
  })
})

test('create good relations', function (t) {
  var relations = [
    {
      type: 'relation',
      changeset: '19',
      tags: { waterway: 'river' },
      members: [
        {
          type: 'node',
          id: '101'
        }
      ]
    },
    {
      type: 'relation',
      changeset: '19',
      tags: { waterway: 'river' },
      members: [
        {
          type: 'node',
          id: '101',
          role: 'best-friend'
        }
      ]
    },
    {
      type: 'relation',
      changeset: '21',
      tags: { foo: 'bar' },
      members: []
    }
  ]

  t.plan(relations.length * 4)

  var db = createDb()

  relations.forEach(function (node) {
    db.osm.create(node, function (err, elm) {
      t.error(err)
      t.ok(elm)
      t.ok(elm.id)
      t.ok(elm.version)
    })
  })
})

test('create bad relations </pun>', function (t) {
  var relations = [
    {
      type: 'relation'
    },
    {
      type: 'relation',
      changeset: '21'
    },
    {
      type: 'relation',
      changeset: '21',
      tags: { foo: 'bar' }
    },
    {
      type: 'relation',
      changeset: '21',
      tags: {},
      members: []
    },
    {
      type: 'relation',
      changeset: '21',
      tags: { foo: 'bar' },
      members: {}
    },
    {
      type: 'relation',
      changeset: '21',
      tags: { foo: 'bar' },
      members: [
        {
          type: 'sandwich',
          ref: '17'
        }
      ]
    },
    {
      type: 'relation',
      changeset: '21',
      tags: { foo: 'bar' },
      members: [
        {
          type: true,
          ref: '17'
        }
      ]
    },
    {
      type: 'relation',
      changeset: '21',
      tags: true,
      members: [
        {
          type: 'sandwich',
          ref: '17'
        }
      ]
    },
    {
      type: 'relation',
      changeset: '21',
      tags: { foo: 'bar' },
      members: [
        {
          ref: '17'
        }
      ]
    },
    {
      type: 'relation',
      changeset: '21',
      tags: { foo: 'bar' },
      members: [
        {
          type: 'way',
          id: 17
        }
      ]
    }
  ]

  t.plan(relations.length)

  var db = createDb()

  relations.forEach(function (node, idx) {
    db.osm.create(node, function (err) {
      t.ok(err instanceof Error, 'relations[' + idx + ']')
    })
  })
})

test('create good changesets', function (t) {
  var changesets = [
    {
      type: 'changeset'
    },
    {
      type: 'changeset',
      timestamp: '2017-10-10T19:55:08.570Z'
    }
  ]

  t.plan(changesets.length * 4)

  var db = createDb()

  changesets.forEach(function (node) {
    db.osm.create(node, function (err, elm) {
      t.error(err)
      t.ok(elm)
      t.ok(elm.id)
      t.ok(elm.version)
    })
  })
})

test('create bad changesets', function (t) {
  var changesets = [
    {
      type: 'changeset',
      timestamp: 'now'
    }
  ]

  t.plan(changesets.length)

  var db = createDb()

  changesets.forEach(function (node, idx) {
    db.osm.create(node, function (err) {
      t.ok(err instanceof Error, 'changesets[' + idx + ']')
    })
  })
})

test('create changeset', function (t) {
  t.plan(4)

  var db = createDb()

  var changes = {
    type: 'changeset'
  }

  db.osm.create(changes, function (err, elm) {
    t.error(err)
    t.ok(elm)
    t.ok(elm.id)
    t.ok(elm.version)
  })
})

test('version lookup correctness', function (t) {
  var db = createDb()

  var changes = {
    type: 'changeset'
  }

  db.osm.create(changes, function (err, elm1) {
    t.error(err)
    db.osm.getByVersion(elm1.version, function (err, elm2) {
      t.error(err)
      t.equals(elm1.id, elm2.id)
      t.equals(elm1.version, elm2.version)
      t.end()
    })
  })
})
