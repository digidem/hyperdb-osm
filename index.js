module.exports = Osm

var randomBytes = require('randombytes')

function Osm (db, opts) {
  if (!(this instanceof Osm)) return new Osm(db, opts)
  if (!db) throw new Error('missing param "db"')
  opts = opts || {}

  this.db = db
  this.dbPrefix = opts.prefix || '/osm'
}

// OsmElement -> Error
Osm.prototype.create = function (element, cb) {
  // Element format verification
  var errs = checkNewElement(element)
  if (errs.length) return cb(errs[0])

  populateElementDefaults(element)

  // Element sub-type format verification
  switch (element.type) {
    case 'node': {
      errs = checkNewNode(element)
      if (errs.length) return cb(errs[0])
      break
    }
    case 'way': {
      errs = checkNewWay(element)
      if (errs.length) return cb(errs[0])
      break
    }
    case 'relation': {
      errs = checkNewRelation(element)
      if (errs.length) return cb(errs[0])
      break
    }
    case 'changeset': {
      errs = checkNewChangeset(element)
      if (errs.length) return cb(errs[0])
      break
    }
    default: {
      return cb(new Error('unknown value for "type" field'))
    }
  }

  // Generate unique ID for element
  var id = generateId()

  // Write the element to the db
  var key = this.dbPrefix + '/elements/' + id
  console.log('would write', key, '->', element)
  return cb(null)
  // this.db.put('/' + element.type + '/' + id, element, cb)
}

// generateId :: String
function generateId () {
  return randomBytes(8).toString('hex')
}

// OsmElement -> [Error]
function checkNewElement (elm) {
  var res = []

  if (!elm.type) {
    res.push(new Error('missing "type" field'))
  }
  if (typeof elm.type !== 'string') {
    res.push(new Error('"type" field must be a string'))
  }

  if (elm.type !== 'changeset') {
    if (!elm.changeset) {
      res.push(new Error('missing "changeset" field'))
    }
    if (typeof elm.changeset !== 'string') {
      res.push(new Error('"changeset" field must be a string'))
    }
    // TODO: check that ensures changeset exists
  }

  if (elm.timestamp && !/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d\d\dZ$/.test(elm.timestamp)) {
    res.push(new Error('"timestamp" must be in String.prototype.toUTCString format'))
  }

  return res
}

// OsmElement -> undefined [Mutate]
function populateElementDefaults (elm) {
  if (!elm.timestamp) {
    elm.timestamp = (new Date()).toISOString()
  }
}

// OsmNode -> [Error]
function checkNewNode (node) {
  var res = []

  res = res.concat(checkNewElement(node))

  if (!node.lat) {
    res.push(new Error('missing "lat" field'))
  }
  if (typeof node.lat !== 'string') {
    res.push(new Error('"lat" field must be string'))
  }
  if (Number(node.lat) < -90 || Number(node.lon) > 90) {
    res.push(new Error('"lat" field must be between -90 and 90'))
  }

  if (!node.lon) {
    res.push(new Error('missing "lon" field'))
  }
  if (typeof node.lon !== 'string') {
    res.push(new Error('"lon" field must be string'))
  }
  if (Number(node.lat) < -180 || Number(node.lon) > 180) {
    res.push(new Error('"lat" field must be between -180 and 180'))
  }

  return res
}

// OsmWay -> [Error]
function checkNewWay (way) {
  var res = []

  res = res.concat(checkNewElement(way))

  if (!way.refs) {
    res.push(new Error('missing "refs" field'))
  }
  if (!Array.isArray(way.refs)) {
    res.push(new Error('"refs" field must be an array'))
  }
  if (way.refs && way.refs.length < 3) {
    res.push(new Error('"refs" field must have > 2 nodes'))
  }
  // TODO: check that all refs exist in the db

  return res
}

// OsmRelation -> [Error]
function checkNewRelation (rel) {
  var res = []

  res = res.concat(checkNewElement(rel))

  if (!rel.tags) {
    res.push(new Error('missing "tags" field'))
  }
  if (rel.tags && typeof rel.tags !== 'object') {
    res.push(new Error('"tags" field must be an object'))
  }
  if (rel.tags && Object.keys(rel.tags).length < 1) {
    res.push(new Error('"tags" field must have >= 1 members'))
  }

  if (!rel.members) {
    res.push(new Error('missing "members" field'))
  }
  if (!Array.isArray(rel.members)) {
    res.push(new Error('"members" field must be an array'))
  }

  if (rel.members && Array.isArray(rel.members)) { 
    ;(rel.members ? rel.members : []).forEach(function (member, idx) {
      if (!member.type) {
        res.push(new Error('"members['+idx+']" missing "type" field'))
      }
      if (typeof member.type !== 'string') {
        res.push(new Error('"members['+idx+'].type" must be a string'))
      }
      if (!isValidRelationMemberType(member.type)) {
        res.push(new Error('"members['+idx+'].type" must be one of node, way, relation'))
      }

      if (!member.id) {
        res.push(new Error('"members['+idx+']" missing "id" field'))
      }
      if (typeof member.id !== 'string') {
        res.push(new Error('"members['+idx+'].id" must be a string'))
      }
    })
  }

  // TODO: check that all members exist in the db

  return res
}

// String -> Boolean
function isValidRelationMemberType (type) {
  return ['node', 'way', 'relation'].indexOf(type) !== -1
}

// OsmChangeset -> [Error]
function checkNewChangeset (changes) {
  var res = []
  return res
}
