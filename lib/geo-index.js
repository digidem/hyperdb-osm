var LevelIndex = require('hyperdb-index-level')
var sub = require('subleveldown')
var utils = require('./utils')
var bs58 = require('bs58')
var varint = require('varint')
var toBuffer = require('to-buffer')

function createIndex (hdb, ldb, geo) {
  ldb = sub(ldb, 'geo')
  var idx = LevelIndex(hdb, ldb, geoProcessor)

  function geoProcessor (node, next) {
    console.log('geo node', node.key, node.value)

    if (!node.value) return next()
    if (node.value.type !== 'node') return next()

    var v = node.value
    if (v.lat !== undefined && v.lon !== undefined) {
      var version = versionToBuffer36(v.version)
      geo.insert([Number(v.lat), Number(v.lon)], version, function (err) {
        if (err) return idx.emit('error', err)
//        console.log('inserted', Number(v.lat), Number(v.lon), version, buffer36ToVersion(version))
        next()
      })
    }

    // TODO(noffle): handle deletions!
  }

  return idx
}

// String -> Buffer[36]
function versionToBuffer36 (version) {
  var buf = bs58.decode(version)
  var key = buf.slice(0, 32)
  var seq = varint.decode(buf, 32)
  var seqOut = Buffer.alloc(4)
  seqOut.writeUInt32LE(0, seq)
  return Buffer.concat([key, seqOut])
}

// Buffer[36] -> String
function buffer36ToVersion (buf) {
  var key = buf.slice(0, 32)
  var seq = buf.readUInt32LE(32)
  var seqOut = toBuffer(varint.encode(seq))
  var res = Buffer.concat([key, seqOut])
  return bs58.encode(res)
}

module.exports = createIndex
