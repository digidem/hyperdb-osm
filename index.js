module.exports = Osm

function Osm (db) {
  if (!(this instanceof Osm)) return new Osm(db)
  if (!db) throw new Error('missing param "db"')
}

// OsmElement -> Error
Osm.prototype.create = function (element, cb) {
  var errs = checkNewElement(element)
  if (errs.length) return cb(null, errs[0])

  switch (element.type) {
    case 'node': {
      populateNodeDefaults(node)
      errs = checkNewNode(node)
      if (errs.length) return cb(null, errs[0])
      break
    }
    default: {
      return cb(null, new Error('unknown value for "type" field'))
    }
  }
}

// TODO: async sanity check phase that ensures changeset exists, etc

// OsmElement -> [Error]
function checkNewElement (elm) {
  var res = []

  if (!elm.type) {
    res.push(new Error('missing "type" field'))
  }
  if (typeof elm.type !== 'string') {
    res.push(new Error('"type" field must be a string'))
  }

  if (!elm.changeset) {
    res.push(new Error('missing "changeset" field'))
  }
  if (typeof elm.changeset !== 'string') {
    res.push(new Error('"changeset" field must be a string'))
  }

  return res
}

// Node -> [Error]
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

// OsmNode -> undefined [Mutate]
function populateNodeDefaults (node) {
  if (!node.timestamp) {
    node.timestamp = (new Date()).toISOString()
  }
}

