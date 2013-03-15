exports.MirrorCache = MirrorCache

function MirrorCache(){
  this._cache = Object.create(null)
}
MirrorCache.prototype.set = function(id, value){
  if (id == null) return false
  if (id in this._cache) {
    console.warn('Cache clobber; Value with id already exists')
    console.trace()
  }
  this._cache[id] = value
}
MirrorCache.prototype.get = function(id){
  return this._cache[id]
}
MirrorCache.prototype.erase = function(id){
  return delete this._cache[id]
}
MirrorCache.prototype.eraseAll = function(){
  for (var id in this._cache)
    delete this._cache[id]
}
MirrorCache.prototype.forEach = function(callback, thisObj){
  Object.keys(this._cache).forEach(function(id, index, ids){
    callback.call(thisObj, this._mirrorCache[id], id, this)
  }, this)
}
