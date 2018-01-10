# p2p-db-osm

> Pluggable API for [p2p-db][p2p-db] adding OpenStreetMap data types and
> querying.

## Usage

```js
var P2P = require('p2p-db')
var osm = require('p2p-db-osm')
var hyperdb = require('hyperdb')
var ram = require('random-access-memory')
var memdb = require('memdb')
var Geo = require('grid-point-store')

// Create p2p-db and p2p-db-osm dependencies
var hyperdb = P2P.provide('hyperdb', hyperdb(ram, { valueEncoding: 'json' }))
var leveldb = P2P.provide('leveldb', memdb())
var pointstore = P2P.provide('pointstore', Geo(memdb()))

// Create the p2p-db
var db = P2P([hyperdb, leveldb, pointstore, osm])

var node = {
  type: 'node',
  lat: '-12.7',
  lon: '1.3',
  tags: { feature: 'water fountain' },
  changeset: 'abcdef'
}

db.osm.create(node, function (err, node) {
  console.log('created node with id', node.id)
  db.osm.get(node.id, function (err, elms) {
    console.log('got elements at', node.id)
    console.log(elms)
  })
})
```

outputs

```
created node with id 78d06921416fe95b
got elements at 78d06921416fe95b
[ { type: 'node',
    lat: '-12.7',
    lon: '1.3',
    tags: { feature: 'water fountain' },
    changeset: 'abcdef',
    timestamp: '2017-12-16T00:15:55.238Z',
    id: '78d06921416fe95b',
    version: 'eAXxidJuq9PoqiDsyrLKfR4jME9hgYnGSozS7BKXUqbDH' } ]
```

## API

```js
var osm = require('p2p-db-osm')
```

Returns a [depj](https://github.com/noffle/depj) dependency object, which is no
more than

```js
module.exports = {
  gives: 'osm',
  needs: ['hyperdb', 'leveldb', 'pointstore'],
  create: function (api) {
    return new Osm(api)
  }
}
```

This is passed as a dependency directly into the
[p2p-db](https://github.com/noffle/p2p-db) constructor. See p2p-db for more
details on how this works.

You create a new p2p-db with p2p-db-osm like so:

```js
var P2P = require('p2p-db')

var db = P2P([
  P2P.provide('hyperdb', hyperdb),
  P2P.provide('leveldb', leveldb),
  P2P.provide('pointstore', pointstore),
  require('p2p-db-osm')
])
```

Where `hyperdb` is a [hyperdb](https://github.com/mafintosh/hyperdb) instance,
`leveldb` is a [levelup](https://github.com/level/levelup) instance, and
`pointstore` is a [grid-point-store](https://github.com/noffle/grid-point-store)
instance. The order they are given doesn't matter --
[depj](https://github.com/noffle/depj) sorts it out.

If you just want to use p2p-db-osm and don't care about p2p-db, that's fine too!
You can get around the dependency management business and make a plain osmdb
like so:

```js
var osm = require('p2p-db-osm')

var osmdb = osm.create({
  hyperdb: hyperdb,
  leveldb: leveldb,
  pointstore: pointstore
})

osmdb.create({type: 'node', ...})  // etc
```

### db.osm.create(element, cb)

Create the new OSM element `element` and add it to the database. The resulting
element, populated with the `id` and `version` fields, is returned by the
callback `cb`.

### db.osm.get(id, cb)

Fetch all of the newest OSM elements with the ID `id`. In the case that multiple
peers modified an element prior to sync'ing with each other, there may be
multiple latest elements ("heads") for the ID.

### db.osm.put(id, element, cb)

Update an existing element with ID `id` to be the OSM element `element`. The new
element should have all fields that the OSM element would have. The `type` of
the element cannot be changed.

If the value of ID currently returns two or more elements, this new value will
replace them all.

`cb` is called with the new element, including `id` and `version` properties.

### db.osm.batch(ops, cb)

Create and update many elements atomically. `ops` is an array of objects
describing the elements to be added or updated.

```js
{
  type: 'put',
  id: 'id',
  value: { /* element */ }
}
```

If no `id` field is set, the element is created, otherwise it is updated with
the element `value`.

Currently, doing a batch insert skips many validation checks in order to be as
fast as possible.

*TODO: accept `opts.validate` or `opts.strict`*

### var rs = db.osm.query(bbox[, cb])

Retrieves all `node`s, `way`s, and `relation`s touching the bounding box `bbox`.

`bbox` is expected to be of the format `[[minLat, maxLat], [minLon, maxLon]]`.
Latitude runs between `(-85, 85)`, and longitude between `(-180, 180)`.

A callback parameter `cb` is optional. If given, it will be called as
`cb(err, elements)`. If not provided or set to `null`, a Readable stream will be
returned that can be read from as elements are emitted. The distinction between
the two is that the callback will buffer all results before they are returned,
but the stream will emit results as they arrive, resulting in much less
buffering. This can make a large impact on memory use for queries on large
datasets.

Elements are returned using the semantics defined by the [OSM API v0.6](https://wiki.openstreetmap.org/wiki/API_v0.6#Retrieving_map_data_by_bounding_box:_GET_.2Fapi.2F0.6.2Fmap).

### db.osm.getChanges(id, cb)

Fetch a list of all OSM elements belonging to the changeset `id`. `cb` is called
with an array of objects of the form:

```js
{
  id: '...',
  version: '...'
}
```

*TODO: optionally return a readable stream*

## Deletions

To delete an element, [OSM
specifies](https://wiki.openstreetmap.org/wiki/Elements#Common_attributes) to
set the `visible` property to `false`. This can be done using the `db.osm.put`
API above.

## Architecture

*TODO: talk about forking data & forking architecture*

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install p2p-db-osm
```

## License

ISC

[p2p-db]: https://github.com/noffle/p2p-db

