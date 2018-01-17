var LevelIndex = require('hyperdb-index-level')
var collect = require('collect-stream')
var sub = require('subleveldown')
var bs58 = require('bs58')
var through = require('through2')
var utils = require('./utils')

function createIndex (hdb, ldb) {
  ldb = sub(ldb, 'cs')
  var idx = LevelIndex(hdb, ldb, onNode)

  function onNode (node, next) {
    var id = idFromKey(node.key)
    console.log('REFS INDEX :: node', id, node.value)
    var version = utils.nodeToVersion(hdb, node)
    var elm = node.value
    var ops = []
    if (elm.type === 'way' && elm.refs) {
      ops = elm.refs.map(function (refId) {
        return {
          type: 'put',
          key: refId + '!' + version,
          value: id
        }
      })
    } else if (elm.type === 'relation' && elm.members) {
      ops = elm.members.map(function (member) {
        return {
          type: 'put',
          key: member.id + '!' + version,
          value: id
        }
      })
    }

    console.log('ldb.batch', ops)
    if (ops.length) ldb.batch(ops, next)
    else next()
  }

  idx.getReferersById = function (id, cb) {
    this.ready(function () {
      var rs = ldb.createReadStream({
        gte: id + '!',
        lte: id + '~'
      })
      var t = through.obj(function (row, enc, next) {
        next(null, {
          id: row.value,
          version: row.key.split('!')[1]
        })
      })
      collect(rs.pipe(t), {encoding: 'object'}, cb)
    })
  }

  // idx.getReferersByVersion = function (version, cb) {
  // }

  return idx
}

// HyperDbKey -> Id
function idFromKey (key) {
  return key.substring(key.lastIndexOf('/') + 1)
}

module.exports = createIndex
