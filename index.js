module.exports = Osm

var randomBytes = require('randombytes')

var checkElement = require('./lib/check-element')

function Osm (p2pdb, geo, opts) {
  if (!(this instanceof Osm)) return new Osm(p2pdb, geo, opts)
  if (!p2pdb) throw new Error('missing param "p2pdb"')
  if (!geo) throw new Error('missing param "geo"')
  opts = opts || {}

  this._p2pdb = p2pdb
  this.geo = geo
  this.db = this._p2pdb.hyper
  this.dbPrefix = opts.prefix || '/osm'
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
      return cb(new Error('existing element is type ' + type
        + ' but new element is type ' + element.type))
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

// BoundingBox, Opts -> (Stream or Callback)
Osm.prototype.query = function (bbox, opts, cb) {
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
