# p2p-db-osm

> API for p2p-db adding OpenStreetMap data types and querying.

## Usage

```js
var P2P = require('p2p-db')
var Osm = require('p2p-db-osm')
var hyperdb = require('hyperdb')
var ram = require('random-access-memory')

var hyper = hyperdb(ram, { valueEncoding: 'json' })
var db = P2P(hyper)
db.install('osm', new Osm(db))

var node = {
  type: 'node',
  lat: '-12.7',
  lon: '1.3',
  tags: { feature: 'water fountain' }
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

### db.install('osm', Osm)

Install the API into the p2p-db `db` under the name `"osm"`.

### db.osm.create(element, cb)

Create the new OSM element `element` and add it to the database. An `id` and
`version` will be generated, and returned as the 2nd and 3rd parameters on `cb`.

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install p2p-db-osm
```

## License

ISC

