var LevelIndex = require('hyperdb-index-level')
var d64 = require('d64')
var varint = require('varint')
var toBuffer = require('to-buffer')
var utils = require('./utils')
var Types = require('comparable-storable-types')
var through = require('through2')
var readonly = require('read-only-stream')

function createIndex (hdb, ldb, geo) {
  // XXX: override the value type on the geo store
  geo.valueType = Types('buffer[36]')

  var idx = LevelIndex(hdb, ldb, geoProcessor)

  function geoProcessor (node, next) {
    // console.log('geo node', node.key, node.value)

    if (!node.value) return next()
    if (node.value.type !== 'node') return next()

    var v = node.value
    if (v.lat !== undefined && v.lon !== undefined) {
      var nodeVersion = utils.nodeToVersion(hdb, node)
      var version = versionToBuffer36(nodeVersion)
      // console.log('geo insert', nodeVersion)
      geo.insert([Number(v.lat), Number(v.lon)], version, function (err) {
        if (err) return idx.emit('error', err)
//        console.log('inserted', Number(v.lat), Number(v.lon), version, buffer36ToVersion(version))
        next()
      })
    }

    // TODO(noffle): handle deletions!
  }

  idx.queryStream = function (bbox) {
    var t = through.obj(write)
    geo.queryStream(bbox).pipe(t)

    function write (chunk, enc, next) {
      next(null, buffer36ToVersion(chunk.value))
    }

    return readonly(t)
  }

  idx.geo = geo

  return idx
}

// String -> Buffer[36]
function versionToBuffer36 (version) {
  var buf = d64.decode(version)
  var key = buf.slice(0, 32)
  var seq = varint.decode(buf, 32)
  var seqOut = Buffer.alloc(4)
  seqOut.writeUInt32LE(seq, 0)
  return Buffer.concat([key, seqOut])
}

// Buffer[36] -> String
function buffer36ToVersion (buf) {
  var key = buf.slice(0, 32)
  var seq = buf.readUInt32LE(32)
  var seqOut = toBuffer(varint.encode(seq))
  var res = Buffer.concat([key, seqOut])
  return d64.encode(res)
}

module.exports = createIndex
