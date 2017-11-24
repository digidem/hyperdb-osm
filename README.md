# p2p-db-osm

> Pluggable API for [p2p-db][p2p-db] adding OpenStreetMap data types and
> querying.

## Usage

```js
var P2P = require('p2p-db')
var Osm = require('p2p-db-osm')
var hyperdb = require('hyperdb')
var ram = require('random-access-memory')
var GeoStore = require('grid-point-store')
var memdb = require('memdb')

// Create a fresh hyperdb and p2p-db
var hyper = hyperdb(ram, { valueEncoding: 'json' })
var db = P2P(hyper)

// Create the p2p-db-osm API
var osm = Osm({
  p2pdb: db,
  index: memdb(),
  geo: GeoStore(memdb())
})

// Plug the OSM API into the p2p-db
db.install('osm', osm)

var node = {
  type: 'node',
  lat: '-12.7',
  lon: '1.3',
  tags: { feature: 'water fountain' },
  changeset: 'abcdef'
}

db.osm.create(node, function (err, id) {
  console.log('created node with id', id)
  db.osm.get(id, function (err, elms) {
    console.log('got elements at', id)
    elms.forEach(console.log)
  })
})
```

outputs

```
created node with id 034832050139jfwj
got elements at 203202390532
{
  id: '324230930349',
  version: '???',
  type: 'node',
  lat: '-12.7',
  lon: '1.3',
  tags: { feature: 'water fountain' }
}
```

## API

```js
var Osm = require('p2p-db-osm')
```

### db.install('osm', new Osm(opts))

Install the API into the [p2p-db](p2p-db) `db` under the name `"osm"`.

Valid `opts` include:

- `p2pdb` (required): a p2p-db instance
- `index` (required): a [LevelUP](https://github.com/level/levelup) instance. There are [many](https://github.com/Level/levelup/wiki/Modules#storage) different storage backends to choose from. Various OSM indexes (changeset lookups, nodes referenced by ways/relations) depend on this.
- `geo` (required): an instance of [grid-point-store](https://github.com/noffle/grid-point-store). This is used to maintain a geographic index of the OSM data.

*TODO: make this an abstract-point-store or something*

### db.osm.create(element, cb)

Create the new OSM element `element` and add it to the database. An `id` and
`version` will be generated, and returned as the 2nd and 3rd parameters on `cb`.

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

