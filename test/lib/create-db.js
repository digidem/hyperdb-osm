var hyper = require('hyperdb')
var Osm = require('../..')
var ram = require('random-access-memory')
var Geo = require('grid-point-store')
var memdb = require('memdb')

module.exports = function () {
  var hyperdb = hyper(ram, { valueEncoding: 'json' })
  var leveldb = memdb()
  var pointstore = Geo(memdb(), {zoomLevel: 10})
  var db = Osm({
    db: hyperdb,
    index: leveldb,
    pointstore: pointstore
  })
  return db
}
