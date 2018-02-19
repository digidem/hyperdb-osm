module.exports = Osm

var through = require('through2')
var readonly = require('read-only-stream')
var sub = require('subleveldown')
var collect = require('collect-stream')
var utils = require('./lib/utils')
var once = require('once')

var checkElement = require('./lib/check-element')
var validateBoundingBox = require('./lib/utils').validateBoundingBox
var createGeoIndex = require('./lib/geo-index')
var createRefsIndex = require('./lib/refs-index')

module.exports = Osm

function Osm (opts) {
  if (!(this instanceof Osm)) return new Osm(opts)
  if (!opts.db) throw new Error('missing param "db"')
  if (!opts.index) throw new Error('missing param "index"')
  if (!opts.pointstore) throw new Error('missing param "pointstore"')

  this.db = opts.db
  this.index = opts.index
  this.pointstore = opts.pointstore
  this.dbPrefix = opts.prefix || '/osm'

  // Create indexes
  this.refs = createRefsIndex(this.db, this.index)
  this.geo = createGeoIndex(this.db, sub(this.index, 'geo'), this.pointstore)
}

Osm.prototype.ready = function (cb) {
  var self = this
  this.refs.ready(function () {
    self.geo.ready(function () {
      cb()
    })
  })
}

// OsmElement -> Error
Osm.prototype.create = function (element, cb) {
  var self = this

  // Element format verification
  var errs = checkElement(element, 'put')
  if (errs.length) return cb(errs[0])

  utils.populateElementDefaults(element)

  // Generate unique ID for element
  var id = utils.generateId()

  // Write the element to the db
  var key = this.dbPrefix + '/elements/' + id
  // console.log('creating', key, '->', element)
  this.db.put(key, element, function (err) {
    if (err) return cb(err)
    var w = self.db._localWriter
    w.head(function (err, node) {
      if (err) return cb(err)

      // TODO(noffle): need hyperdb to return the 'node' that was created
      var elm = Object.assign({}, element)
      elm.id = id
      elm.version = utils.versionFromKeySeq(w.key, node.seq)
      cb(null, elm)
    })
  })
}

// OsmId -> [OsmElement]
Osm.prototype.get = function (id, cb) {
  var self = this

  var key = this.dbPrefix + '/elements/' + id
  this.db.get(key, function (err, res) {
    if (err) return cb(err)
    res = res || []

    cb(null, res.map(function (node) {
      var v = node.value
      v.id = id
      v.version = utils.nodeToVersion(self.db, node)
      return v
    }))
  })
}

// OsmVersion -> OsmElement
Osm.prototype.getByVersion = function (osmVersion, cb) {
  utils.versionToNode(this.db, osmVersion, function (err, node) {
    if (err) return cb(err)
    var elm = Object.assign(node.value, {
      id: utils.hyperDbKeyToId(node.key),
      version: osmVersion
    })
    cb(null, elm)
  })
}

// OsmId, OsmElement -> OsmElement
Osm.prototype.put = function (id, element, opts, cb) {
  if (opts && !cb && typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  opts = opts || {}

  var self = this

  // Check for type errors
  var errs = checkElement(element, 'put')
  if (errs.length) return cb(errs[0])

  // Write to hyperdb
  var key = self.dbPrefix + '/elements/' + id
  // console.log('updating', key, '->', element)
  self.db.put(key, element, function (err) {
    if (err) return cb(err)

    // TODO(noffle): need hyperdb to return the 'node' that was created
    var w = self.db._localWriter
    w.head(function (err, node) {
      if (err) return cb(err)
      var elm = Object.assign({}, element)
      elm.id = id
      elm.version = utils.versionFromKeySeq(w.key, node.seq)
      cb(null, elm)
    })
  })
}

// OsmId, OsmElement -> OsmElement
Osm.prototype.del = function (id, element, opts, cb) {
  if (opts && !cb && typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  opts = opts || {}

  var self = this

  element = Object.assign({}, element)
  element.deleted = true

  // Check for type errors
  var errs = checkElement(element, 'del')
  if (errs.length) return cb(errs[0])

  // Write to hyperdb
  var key = self.dbPrefix + '/elements/' + id
  // console.log('updating', key, '->', element)

  self.db.put(key, element, function (err, node) {
    if (err) return cb(err)

    // TODO(noffle): need hyperdb to return the 'node' that was created
    var w = self.db._localWriter
    w.head(function (err, node) {
      if (err) return cb(err)
      var elm = Object.assign({}, element)
      elm.id = id
      elm.version = utils.versionFromKeySeq(w.key, node.seq)
      cb(null, elm)
    })
  })
}

// Q: should element validation happen on batch jobs?
Osm.prototype.batch = function (ops, cb) {
  var self = this
  cb = once(cb)

  var batch = ops.map(function (op) {
    op = Object.assign({}, op)

    if (!op.id) op.id = utils.generateId()

    var prefix = self.dbPrefix + '/elements/'
    op.id = prefix + op.id

    if (op.type === 'put') {
      return {
        type: 'put',
        key: op.id,
        value: op.value
      }
    } else if (op.type === 'del') {
      return {
        type: 'put',
        key: op.id,
        value: Object.assign(op.value || {}, { deleted: true })
      }
    } else {
      cb(new Error('unknown type'))
    }
  })
  this.db.batch(batch, function (err, res) {
    if (err) return cb(err)
    res = res.map(function (node, n) {
      var elm = Object.assign({}, node.value)
      elm.id = batch[n].key.substring(batch[n].key.lastIndexOf('/') + 1)
      elm.version = utils.versionFromKeySeq(self.db._writers[node.feed].key, node.seq)
      return elm
    })
    cb(null, res)
  })
}

// Id -> { id, version }
Osm.prototype.getChanges = function (id, cb) {
  return this.refs.getReferersById(id, cb)
}

// BoundingBox -> (Stream or Callback)
Osm.prototype.query = function (bbox, opts, cb) {
  if (opts && !cb && typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  opts = opts || {}

  // To prevent re-processing elements that were already processed.
  var seen = [{}, {}]
  var t

  var err = validateBoundingBox(bbox)
  if (err) {
    if (cb) {
      return cb(err)
    } else {
      t = through.obj()
      process.nextTick(function () { t.emit('error', err) })
      return t
    }
  }

  // For accumulating ways and relations when element type order matters.
  var typeQueue = []

  var self = this
  t = through.obj(onPoint, onFlush)
  this.geo.ready(function () {
    self.refs.ready(function () {
      self.geo.queryStream(bbox).pipe(t)
    })
  })

  if (!cb) {
    return readonly(t)
  } else {
    collect(t, {encoding: 'object'}, cb)
  }

  // Writes an OSM element to the output stream.
  //
  // 'gen' is the generation of the added element. This depends on the context
  // that the element has been added in. A node directly returned by the geo
  // query is gen=0, but a node indirectly found by looking at nodes in a way
  // that that gen=0 node belongs to is a gen=1. Same with ways: a way visited
  // by a gen=0 node is also gen=0, but one found by an indirect gen=1 node is
  // also gen=1. This is a bit difficult to wrap one's head around, but this is
  // necessary to prevent any elements from being processed more times than
  // they need to be.
  function add (elm, gen) {
    var alreadySeen = seen[0][elm.version]
    if (gen === 1) alreadySeen = alreadySeen || seen[1][elm.version]

    if (!seen[0][elm.version] && !seen[1][elm.version]) {
      if (opts.order === 'type' && elm.type !== 'node') {
        typeQueue.push(elm)
      } else {
        t.push(elm)
      }
    }

    if (!alreadySeen) {
      seen[gen][elm.version] = true
      seen[1][elm.version] = true
    }

    return !alreadySeen
  }

  // TODO: can we up the concurrency here & rely on automatic backpressure?
  function onPoint (version, _, next) {
    next = once(next)

    self.getByVersion(version, function (err, elm) {
      if (err) return next(err)

      add(elm, 0)

      // Get all referrer ways and relations recursively.
      getRefererElementsRec(elm, 0, function (err, res) {
        if (err) return next(err)
        if (!res.length) return next()

        // For each element that refers to the node, get all of its forked
        // heads and, for ways, get all nodes they reference.
        var pending = res.length
        for (var i = 0; i < res.length; i++) {
          var elm2 = res[i]
          if (elm2.type === 'way') {
            pending++
            getWayNodes(elm2, function (err, nodes) {
              if (err) return next(err)

              pending += nodes.length
              if (!--pending) return next()

              // Recursively get their heads & relations
              for (var j = 0; j < nodes.length; j++) {
                getWayNodeRec(nodes[j], function (err, elms) {
                  if (err) return cb(err)
                  if (!--pending) return next()
                })
              }
            })
          }

          getAllHeads(elm.id, function (err, heads) {
            if (err) return next(err)
            if (!--pending) return next()
          })
        }
      })
    })
  }

  function onFlush (cb) {
    typeQueue.sort(cmpType).forEach(function (elm) { t.push(elm) })
    cb()
  }

  // Get all heads of all nodes in a way.
  function getWayNodes (elm, cb) {
    cb = once(cb)
    var res = []
    var pending = elm.refs.length

    for (var i = 0; i < elm.refs.length; i++) {
      getAllHeads(elm.refs[i], function (err, heads) {
        if (err) cb(err)
        res.push.apply(res, heads)
        if (!--pending) return cb(null, res)
      })
    }
  }

  // Get all heads of the node, and all relations referring to it (recursively).
  function getWayNodeRec (elm, cb) {
    cb = once(cb)
    var res = []
    var pending = 2

    getRefererElementsRec(elm, 1, function (err, elms) {
      if (err) return cb(err)
      res.push.apply(res, elms)
      if (!--pending) cb(null, res)
    })

    getAllHeads(elm.id, function (err, heads) {
      if (err) return cb(err)
      res.push.apply(res, heads)
      if (!--pending) cb(null, res)
    })
  }

  // Get all head versions of all ways and relations referring to an element,
  // recursively.
  function getRefererElementsRec (elm, gen, cb) {
    cb = once(cb)
    var res = []

    getRefererElements(elm, gen, function (err, elms) {
      if (err) return cb(err)
      if (!elms.length) return cb(null, [])

      var pending = elms.length
      for (var i = 0; i < elms.length; i++) {
        res.push(elms[i])

        getRefererElementsRec(elms[i], gen, function (err, elms) {
          if (err) return cb(err)
          for (var j = 0; j < elms.length; j++) {
            res.push(elms[j])
          }
          if (!--pending) cb(null, res)
        })
      }
    })
  }

  // Get all head versions of all ways and relations referring to an element.
  function getRefererElements (elm, gen, cb) {
    cb = once(cb)
    var res = []

    // XXX: uncomment this to skip ref lookups on indirect nodes
    // if (gen === 1) return cb(null, [])

    self.refs.getReferersById(elm.id, function (err, refs) {
      if (err) return cb(err)
      if (!refs.length) return cb(null, [])

      var pending = refs.length
      for (var i = 0; i < refs.length; i++) {
        if (seen[gen][refs[i].version]) {
          if (!--pending) cb(null, res)
          continue
        }
        seen[gen][refs[i].id] = true

        self.get(refs[i].id, function (err, elms) {
          if (err) return cb(err)
          for (var j = 0; j < elms.length; j++) {
            if (add(elms[j], gen)) res.push(elms[j])
          }
          if (!--pending) cb(null, res)
        })
      }
    })
  }

  function getAllHeads (id, cb) {
    var res = []

    if (seen[0][id]) return cb(null, [])
    seen[0][id] = true

    self.get(id, function (err, elms) {
      if (err) return cb(err)
      for (var i = 0; i < elms.length; i++) {
        if (add(elms[i], 1)) res.push(elms[i])
      }
      cb(null, res)
    })
  }
}

Osm.prototype.createReplicationStream = function (opts) {
  return this.db.replicate(opts)
}
Osm.prototype.replicate = Osm.prototype.createReplicationStream

var typeOrder = { node: 0, way: 1, relation: 2 }
function cmpType (a, b) {
  return typeOrder[a.type] - typeOrder[b.type]
}
