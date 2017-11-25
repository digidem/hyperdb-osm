var hindex = require('hyperdb-index')

function LevelIndex (hdb, ldb, myProcessFn) {
  if (!(this instanceof LevelIndex)) {
    return new LevelIndex(hdb, ldb, myProcessFn)
  }

  var idx = hindex(hdb, {
    processFn: processFn,
    getSnapshot: getSnapshot,
    setSnapshot: setSnapshot
  })

  function getSnapshot (cb) {
    ldb.get('snapshot', function (err, json) {
      if (err && !err.notFound) cb(err)
      else if (err) cb()
      else cb(null, JSON.parse(json))
    })
  }

  function setSnapshot (snapshot, cb) {
    var json = JSON.stringify(snapshot)
    ldb.put('snapshot', json, cb)
  }

  function processFn (kv, oldKv, next) {
    myProcessFn(ldb, kv, oldKv, next)
  }

  return idx
}

module.exports = LevelIndex
