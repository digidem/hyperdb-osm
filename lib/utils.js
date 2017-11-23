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

module.exports = {
  validateBoundingBox: validateBoundingBox
}
