var toBuffer = require('to-buffer')
var varint = require('varint')
var randomBytes = require('randombytes')

module.exports = {
  validateBoundingBox: validateBoundingBox,
  generateId: generateId,
  populateElementDefaults: populateElementDefaults,
  versionToNode: versionToNode,
  nodeToVersion: nodeToVersion,
  encodeVersion: encodeVersion,
  hyperDbKeyToId: hyperDbKeyToId
}

// [[minLat,maxLat],[minLon,maxLon]] -> Error? [Mutate]
function validateBoundingBox (bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 2 ||
      bbox[0].length !== 2 || bbox[1].length !== 2) {
    return new Error('bbox format is [[minLat,maxLat],[minLon,maxLon]]')
  }

  // Cap off the edges of the bounding box
  bound(bbox[0][0], -90, 90)
  bound(bbox[0][1], -90, 90)
  bound(bbox[1][0], -180, 180)
  bound(bbox[1][1], -180, 180)

  // Check whether min < max on the bbox
  if (bbox[0][0] > bbox[0][1] || bbox[1][0] > bbox[1][1]) {
    return new Error('max cannot be smaller than min')
  }
}

// bound :: Number, Number, Number -> Number
function bound (n, min, max) {
  return Math.min(max, Math.max(min, n))
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

// HyperDB, Buffer -> Node
function versionToNode (db, version, cb) {
  var feedseq = decodeVersion(version)

  for (var i = 0; i < db._writers.length; i++) {
    var w = db._writers[i]
    if (feedseq.key.equals(w.key)) {
      return w.get(feedseq.seq, cb)
    }
  }

  throw new Error('node doesnt exist in db')
}

// Buffer -> { key, seq }
function decodeVersion (version) {
  var key = version.slice(0, 32)
  var seq = varint.decode(version, 32)
  return {
    key: key,
    seq: seq
  }
}

// HyperDB, Node -> Buffer
function nodeToVersion (db, node) {
  for (var i = 0; i < db._writers.length; i++) {
    var w = db._writers[i]
    if (i === node.feed) {
      return encodeVersion(w.key, node.seq)
    }
  }

  throw new Error('node doesnt exist in db')
}

// Buffer, Number -> Buffer
function encodeVersion (key, seq) {
  return Buffer.concat([
    key,
    toBuffer(varint.encode(seq))
  ])
}

function hyperDbKeyToId (key) {
  var components = key.split('/')
  return components[components.length - 1]
}
