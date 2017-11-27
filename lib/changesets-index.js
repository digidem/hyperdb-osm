var LevelIndex = require('hyperdb-index-level')
var collect = require('collect-stream')
var sub = require('subleveldown')

function createIndex (hdb, ldb) {
  ldb = sub(ldb, 'cs')
  var idx = LevelIndex(hdb, ldb, changesetProcessor)

  function changesetProcessor (lvl, kv, oldKv, next) {
    // console.log('kv', kv)
    var id = idFromKey(kv.key)
    var batch = kv.value.reduce(function (accum, elm) {
      if ((elm.type === 'node' ||
          elm.type === 'way' ||
          elm.type === 'relation') && elm.changeset) {
        // TODO: store real version!
        var version = elm.changeset + '!' + 'v' + id
        console.log('lvl.put', version, id)
        accum.push({ type: 'put', key: version, value: id })
      }
      return accum
    }, [])
    lvl.batch(batch, next)
  }

  idx.getElements = function (changesetId, cb) {
    this.ready(function () {
      var rs = ldb.createValueStream({
        gte: changesetId + '!',
        lte: changesetId + '~'
      })
      collect(rs, {encoding:'object'}, cb)
    })
  }

  return idx
}

// HyperDbKey -> Id
function idFromKey (key) {
  return key.substring(key.lastIndexOf('/') + 1)
}

module.exports = createIndex
