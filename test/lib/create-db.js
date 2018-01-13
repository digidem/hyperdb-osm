var hyper = require('hyperdb')
var P2P = require('p2p-db')
var Osm = require('../..')
var ram = require('random-access-memory')
var Geo = require('grid-point-store')
var memdb = require('memdb')

module.exports = function () {
  var hyperdb = P2P.provide('hyperdb', hyper(ram, { valueEncoding: 'json' }))
  var leveldb = P2P.provide('leveldb', memdb())
  var pointstore = P2P.provide('pointstore', Geo(memdb(), {zoomLevel: 10}))
  var db = P2P([hyperdb, leveldb, pointstore, Osm])
  return db
}
