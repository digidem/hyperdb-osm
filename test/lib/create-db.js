var hyper = require('hyperdb')
var P2P = require('p2p-db')
var Osm = require('../..')
var ram = require('random-access-memory')
var Geo = require('grid-point-store')
var memdb = require('memdb')

module.exports = function () {
  var db = P2P(hyper(ram, { valueEncoding: 'json' }))
  var geo = Geo(memdb())
  db.install('osm', Osm({
    p2pdb: db,
    geo: geo,
    index: memdb()
  }))
  return db
}
