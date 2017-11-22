module.exports = Osm

var randomBytes = require('randombytes')

var checkElement = require('./lib/check-element')

function Osm (p2pdb, opts) {
  if (!(this instanceof Osm)) return new Osm(p2pdb, opts)
  if (!p2pdb) throw new Error('missing param "p2pdb"')
  opts = opts || {}

  this._p2pdb = p2pdb
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
  console.log('writing', key, '->', element)
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

    cb(null, res.map(function (node) {
        var v = node.value
        v.id = id
        v.version = '???'
        return v
    }))
  })
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
