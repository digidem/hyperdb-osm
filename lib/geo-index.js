var LevelIndex = require('hyperdb-index-level')
var d64 = require('d64')
var varint = require('varint')
var toBuffer = require('to-buffer')
var utils = require('./utils')
var Types = require('comparable-storable-types')
var through = require('through2')
var readonly = require('read-only-stream')

function createIndex (hdb, ldb, geo) {
  // HACK: override the value type on the geo store. won't work for any store
  // but grid-point-store!
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

        // ------------------------------------------------------------
        // HERE BE HACKS!
        // ------------------------------------------------------------
        //
        // When a node is updated, it's important that all old versions of that
        // node (the old heads) are removed from the geo-spatial index.
        //
        // hyperdb does not yet have a public API for this, so what follows is
        // a manual dirty process of reaching our hands in elbow-deep into the
        // private internals in order to retrieve the old heads and remove them
        // from the index.
        // ------------------------------------------------------------

        var clock = node.clock.slice()

        // -1. fudge clock if feed===0
        if (node.feed === 0) clock[0] = node.seq

        // 0. skip edge cases I haven't figured out yet
        if (clock[node.feed] === 0) return next()

        // 1. turn back the clock
        clock[node.feed]--

        // 2. turn the clock into db heads
        var arr = []
        for (var i = 0; i < clock.length; i++) {
          arr.push({key: hdb._writers[i].key, seq: clock[i]})
        }

        // 3. convert heads to a hyperdb version buffer
        var version = headsToVersion(arr)

        // 4. checkout that version
        var oldDb = hdb.checkout(version)

        // 5. do a lookup on that key
        oldDb.get(node.key, function (err, values) {
          if (err) return next(err)
          if (!values || !values.length) return next()

          // 6. delete those entries from 'geo'
          var pending = values.length
          for (var i = 0; i < values.length; i++) {
            var oldVersion =
              versionToBuffer36(utils.nodeToVersion(hdb, values[i]))
            geo.remove([Number(v.lat), Number(v.lon)], { value: oldVersion }, function (err) {
              if (!--pending) next(err)
            })
          }
        })
        // ------------------------------------------------------------
        // HERE ENDETH THE HACKS
        // ------------------------------------------------------------
      })
    } else {
      // malformed element; skip
      next()
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

// [Head] -> Buffer
function headsToVersion (heads) {
  var bufAccum = []

  for (var i = 0; i < heads.length; i++) {
    bufAccum.push(heads[i].key)
    bufAccum.push(toBuffer(varint.encode(heads[i].seq)))
  }

  return Buffer.concat(bufAccum)
}

module.exports = createIndex
