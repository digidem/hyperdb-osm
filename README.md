# p2p-db-osm

> Pluggable API for [p2p-db][p2p-db] adding OpenStreetMap data types and
> querying.

## Usage

```js
var P2P = require('p2p-db')
var Osm = require('p2p-db-osm')
var hyperdb = require('hyperdb')
var ram = require('random-access-memory')

var hyper = hyperdb(ram, { valueEncoding: 'json' })
var db = P2P(hyper)
db.install('osm', Osm(db))

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

### db.install('osm', new Osm(db))

Install the API into the [p2p-db](p2p-db) `db` under the name `"osm"`.

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

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install p2p-db-osm
```

## License

ISC

[p2p-db]: https://github.com/noffle/p2p-db

