module.exports = Osm

var async = require('async')
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

module.exports = {
  gives: 'osm',
  needs: ['hyperdb', 'leveldb', 'pointstore'],
  create: function (api) {
    return new Osm(api)
  }
}

function Osm (api) {
  if (!(this instanceof Osm)) return new Osm(api)
  if (!api) throw new Error('missing param "api"')

  this.db = api.hyperdb
  this.index = api.leveldb
  this.dbPrefix = '/osm'

  // Create indexes
  this.refs = createRefsIndex(this.db, this.index)
  this.geo = createGeoIndex(this.db, sub(this.index, 'geo'), api.pointstore)
}

Osm.prototype.ready = function (cb) {
  var funcs = [this.changesets, this.refs, this.geo]
    .filter(function (idx) { return !!idx })
    .map(function (idx) { return idx.ready.bind(idx) })

  async.map(funcs, function (fn, cb) { fn(cb) }, cb)
}

// OsmElement -> Error
Osm.prototype.create = function (element, cb) {
  var self = this

  // Element format verification
  var errs = checkElement(element)
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
    var elm = Object.assign({
      id: utils.hyperDbKeyToId(node.key),
      version: osmVersion
    }, node.value)
    cb(null, elm)
  })
}

// OsmId, OsmElement -> OsmElement
Osm.prototype.put = function (id, element, cb) {
  var self = this

  this.get(id, function (err, elms) {
    if (err) return cb(err)

    // Ensure element already exists
    if (elms.length === 0) {
      return cb(new Error('element with id ' + id + ' doesnt exist'))
    }

    // Ensure existing type matches new type
    var type = elms[0].type
    if (type !== element.type) {
      return cb(new Error('existing element is type ' + type +
        ' but new element is type ' + element.type))
    }

    // Check for type errors
    var errs = checkElement(element)
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
  })
}

Osm.prototype.batch = function (ops, cb) {
  var self = this
  var batch = ops.map(function (op) {
    var prefix = self.dbPrefix + '/elements/'
    if (!op.id) op.id = prefix + utils.generateId()
    else op.id = prefix + op.id
    return {
      type: 'put',
      key: op.id,
      value: op.value
    }
  })
  this.db.batch(batch, cb)
}

// TODO: return a stream if no cb is given
// Id -> { id, version }
Osm.prototype.getChanges = function (id, cb) {
  var self = this
  this.refs.ready(function () {
    self.refs.getReferersById(id, cb)
  })
}

// BoundingBox -> (Stream or Callback)
Osm.prototype.query = function (bbox, cb) {
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

  // Convert p2p-db-osm bbox format to grid-point-store format
  // TODO(noffle): unify the bbox formats!
  bbox = [[bbox[0][0], bbox[1][0]], [bbox[0][1], bbox[1][1]]]

  var self = this
  t = through.obj(onPoint)
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

  function add (elm, gen) {
    var alreadySeen = seen[0][elm.version]
    if (gen === 1) alreadySeen = alreadySeen || seen[1][elm.version]

    if (!seen[0][elm.version] && !seen[1][elm.version]) {
      t.push(elm)
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
        // console.log(elm.version, res.length)

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

    self.refs.getReferersById(elm.id, function (err, refs) {
      if (err) return cb(err)
      if (!refs.length) return cb(null, [])

      var pending = refs.length
      for (var i = 0; i < refs.length; i++) {
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

    self.get(id, function (err, elms) {
      if (err) return cb(err)
      for (var i = 0; i < elms.length; i++) {
        if (add(elms[i], 1)) res.push(elms[i])
      }
      cb(null, res)
    })
  }
}
