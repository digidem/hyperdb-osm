module.exports = Osm

var through = require('through2')
var readonly = require('read-only-stream')
var bs58 = require('bs58')
var sub = require('subleveldown')
var utils = require('./lib/utils')

var checkElement = require('./lib/check-element')
var validateBoundingBox = require('./lib/utils').validateBoundingBox
var createChangesetsIndex = require('./lib/changesets-index')
var createGeoIndex = require('./lib/geo-index')

function Osm (opts) {
  if (!(this instanceof Osm)) return new Osm(opts)
  if (!opts) throw new Error('missing param "opts"')
  if (!opts.p2pdb) throw new Error('missing param "opts.p2pdb"')
  if (!opts.index) throw new Error('missing param "opts.index"')

  this.p2pdb = opts.p2pdb
  this.db = this.p2pdb.hyper
  this.index = opts.index
  this.dbPrefix = opts.prefix || '/osm'

  // Create indexes
  this.changesets = createChangesetsIndex(this.db, this.index)
  this.geo = createGeoIndex(this.db, sub(this.index, 'geo'))
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
  console.log('creating', key, '->', element)
  this.db.put(key, element, function (err) {
    if (err) return cb(err)
    var w = self.db._localWriter
    w.head(function (err, node) {
      if (err) return cb(err)
      var version = utils.encodeVersion(w.key, node.seq)
      var elm = Object.assign({}, element)
      elm.id = id
      elm.version = bs58.encode(version)
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
      v.version = bs58.encode(utils.nodeToVersion(self.db, node))
      return v
    }))
  })
}

// OsmVersion -> OsmElement
Osm.prototype.getByVersion = function (osmVersion, cb) {
  var version = bs58.decode(osmVersion)
  utils.versionToNode(this.db, version, function (err, node) {
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
    console.log('updating', key, '->', element)
    self.db.put(key, element, function (err) {
      if (err) return cb(err)
      var w = self.db._localWriter
      w.head(function (err, node) {
        if (err) return cb(err)
        var version = utils.encodeVersion(w.key, node.seq)
        var elm = Object.assign({}, element)
        elm.id = id
        elm.version = bs58.encode(version)
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

// TODO: return id or version or both?
// TODO: return a stream if no cb is given
// Id -> [Id]
Osm.prototype.getChanges = function (id, cb) {
  this.changesets.getElements(id, cb)
}

// BoundingBox, Opts -> (Stream or Callback)
Osm.prototype.query = function (bbox, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  var result = cb ? [] : through()

  var err = validateBoundingBox(bbox)
  if (err) return end(err)

  // TODO(sww): do query work
  // ...

  if (!cb) return readonly(result)

  // Push an element to the stream or callback
  // TODO(sww): backpressure!
  function push (elm) {
    result.push(elm)
  }

  // Terminate the callback/stream; optionally with an error
  function end (err) {
    if (cb) {
      if (err) cb(err)
      else cb(null, result)
    } else {
      if (err) result.emit('error', err)
      else result.push(null)
      return readonly(result)
    }
  }
}
