var test = require('tape')
var LevelIndex = require('../lib/level-index')
var hyper = require('hyperdb')
var ram = require('random-access-memory')
var memdb = require('memdb')
var sub = require('subleveldown')

test('basic', function (t) {
  var db = hyper(ram, { valueEncoding: 'json' })
  var lvl = memdb()
  var idx = LevelIndex(db, sub(lvl, 'stuff'), processor)

  t.plan(2)

  function processor (ldb, kv, oldKv, next) {
    t.deepEquals(kv, { key: '/foo', value: ['bar'] })
    next()
  }

  db.put('/foo', 'bar', function (err) {
    t.ifError(err)
  })
})

test('only process latest', function (t) {
  var db = hyper(ram, { valueEncoding: 'json' })
  var lvl = memdb()
  var idx = LevelIndex(db, sub(lvl, 'stuff'), processor)

  t.plan(3)

  function processor (ldb, kv, oldKv, next) {
    t.deepEquals(kv, { key: '/foo', value: ['quux'] })
    next()
  }

  db.put('/foo', 'bar', function (err) {
    t.ifError(err)
    db.put('/foo', 'quux', function (err) {
      t.ifError(err)
    })
  })
})

test('adder', function (t) {
  var db = hyper(ram, { valueEncoding: 'json' })
  var lvl = memdb()
  var slvl = sub(lvl, 'stuff')
  var idx = LevelIndex(db, slvl, processor)

  t.plan(5)

  function processor (ldb, kv, oldKv, next) {
    slvl.get('sum', function (err, sum) {
      if (err && !err.notFound) return next(err)
      else if (err) sum = 0
      else sum = Number(sum)

      console.log('sum so far', sum, kv.value)
      sum += kv.value[0]
      console.log('writing..', sum)
      slvl.put('sum', Number(sum), function (err) {
        console.log('..wrote')
        next(err)
      })
    })
  }

  idx.sum = function (cb) {
    this.ready(function () {
      slvl.get('sum', function (err, sum) {
        cb(err, sum ? Number(sum) : undefined)
      })
    })
  }

  db.put('/numbers/0', 15, function (err) {
    t.ifError(err)
    db.put('/numbers/1', 2, function (err) {
      t.ifError(err)
      db.put('/numbers/2', 8, function (err) {
        t.ifError(err)
        idx.sum(function (err, sum) {
          t.ifError(err)
          t.equals(sum, 25)
        })
      })
    })
  })
})
