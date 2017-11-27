module.exports = Osm

var randomBytes = require('randombytes')
var through = require('through2')
var readonly = require('read-only-stream')

var checkElement = require('./lib/check-element')
var validateBoundingBox = require('./lib/utils').validateBoundingBox
var createChangesetsIndex = require('./lib/changesets-index')

function Osm (opts) {
  if (!(this instanceof Osm)) return new Osm(opts)
  if (!opts) throw new Error('missing param "opts"')
  if (!opts.p2pdb) throw new Error('missing param "opts.p2pdb"')
  if (!opts.index) throw new Error('missing param "opts.index"')
  if (!opts.geo) throw new Error('missing param "opts.geo"')

  this.p2pdb = opts.p2pdb
  this.db = this.p2pdb.hyper
  this.geo = opts.geo
  this.index = opts.index
  this.dbPrefix = opts.prefix || '/osm'

  // Create indexes
  this.changesets = createChangesetsIndex(this.db, this.index)
}

// OsmElement -> Error
Osm.prototype.create = function (element, cb) {
  // Element format verification
  var errs = checkElement(element)
  if (errs.length) return cb(errs[0])

  populateElementDefaults(element)

  // Generate unique ID for element
  var id = generateId()

  // Write the element to the db
  var key = this.dbPrefix + '/elements/' + id
  console.log('creating', key, '->', element)
  this.db.put(key, element, function (err) {
    if (err) cb(err)
    else cb(null, id)
  })
}

// OsmId -> [OsmElement]
Osm.prototype.get = function (id, cb) {
  var key = this.dbPrefix + '/elements/' + id
  this.db.get(key, function (err, res) {
    if (err) return cb(err)
    res = res || []

    cb(null, res.map(function (node) {
      var v = node.value
      v.id = id
      v.version = '???'
      return v
    }))
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
      if (err) cb(err)
      cb()
    })
  })
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
  return end()

  // Push an element to the stream or callback
  function push (elm) {
    if (cb) result.push(elm)
    else result.push(elm)
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

// generateId :: String
function generateId () {
  return randomBytes(8).toString('hex')
}

// OsmElement -> undefined [Mutate]
function populateElementDefaults (elm) {
  if (!elm.timestamp) {
    elm.timestamp = (new Date()).toISOString()
  }
}
