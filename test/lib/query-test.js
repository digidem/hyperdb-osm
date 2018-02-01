module.exports = function (t, db, data, expected, cb) {
  var batch = data.map(function (elm) {
    var id = elm.id
    delete elm.id
    return {
      type: 'put',
      id: id,
      value: elm
    }
  })

  expected = expected.slice()

  db.batch(batch, function (err) {
    t.error(err)

    ;(function next () {
      var q = expected.shift()
      if (!q) return cb()
      var pending = 2

      db.query(q.bbox, function (err, res) {
        t.error(err, 'no error on cb query')
        var ids = res.map(function (elm) { return elm.id }).sort()
        t.deepEquals(ids, q.expected.sort(), 'ids match cb query')
        if (!--pending) next()
      })

      collect(db.query(q.bbox), function (err, res) {
        t.error(err, 'no error on streaming query')
        var ids = res.map(function (elm) { return elm.id }).sort()
        t.deepEquals(ids, q.expected.sort(), 'ids match cb query')
        if (!--pending) next()
      })
    })()
  })
}

function collect (stream, cb) {
  var res = []
  stream.on('data', res.push.bind(res))
  stream.once('end', cb.bind(null, null, res))
  stream.once('error', cb.bind(null))
}
