var LevelIndex = require('hyperdb-index-level')
var collect = require('collect-stream')
var sub = require('subleveldown')
var through = require('through2')
var utils = require('./utils')

function createIndex (hdb, ldb) {
  ldb = sub(ldb, 'cs')
  var idx = LevelIndex(hdb, ldb, changesetProcessor)

  function changesetProcessor (node, next) {
    var id = idFromKey(node.key)
    var version = utils.nodeToVersion(hdb, node)
    var elm = node.value
    if ((elm.type === 'node' ||
        elm.type === 'way' ||
        elm.type === 'relation') && elm.changeset) {
      var k = elm.changeset + '!' + id
      var v = version
      ldb.put(k, v, next)
    }
  }

  idx.getElements = function (changesetId, cb) {
    this.ready(function () {
      var rs = ldb.createReadStream({
        gte: changesetId + '!',
        lte: changesetId + '~'
      })
      var t = through.obj(function (row, enc, next) {
        next(null, {
          id: row.key.split('!')[1],
          version: row.value
        })
      })
      collect(rs.pipe(t), {encoding: 'object'}, cb)
    })
  }

  return idx
}

// HyperDbKey -> Id
function idFromKey (key) {
  return key.substring(key.lastIndexOf('/') + 1)
}

module.exports = createIndex
