var LevelIndex = require('hyperdb-index-level')
var collect = require('collect-stream')
var sub = require('subleveldown')
var utils = require('./utils')

function createIndex (hdb, ldb) {
  ldb = sub(ldb, 'cs')
  var idx = LevelIndex(hdb, ldb, changesetProcessor)

  function changesetProcessor (node, next) {
    var id = idFromKey(node.key)
    // console.log('node', id, node)
    var version = utils.nodeToVersion(hdb, node)
    var elm = node.value
    if ((elm.type === 'node' ||
        elm.type === 'way' ||
        elm.type === 'relation') && elm.changeset) {
      var v = elm.changeset + '!' + 'v' + id
      console.log('ldb.put', v, id)
      ldb.put(v, id, next)
    }
  }

  idx.getElements = function (changesetId, cb) {
    this.ready(function () {
      var rs = ldb.createValueStream({
        gte: changesetId + '!',
        lte: changesetId + '~'
      })
      collect(rs, {encoding: 'object'}, cb)
    })
  }

  return idx
}

// HyperDbKey -> Id
function idFromKey (key) {
  return key.substring(key.lastIndexOf('/') + 1)
}

module.exports = createIndex
