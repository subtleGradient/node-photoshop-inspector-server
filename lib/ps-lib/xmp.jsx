function ao_XMP(){
  if (!(this instanceof ao_XMP)) throw Error('this is a constructor, you must use `new`');
  this.Namespace = Namespace
  this.XMPMeta = XMPMeta
}

ao_XMP.load = function(){
  return ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript')
}
ao_XMP.unload = function(){
  if (ExternalObject.AdobeXMPScript && ExternalObject.AdobeXMPScript.unload)
    ExternalObject.AdobeXMPScript.unload()
  return delete ExternalObject.AdobeXMPScript
}

ao_XMP.require = function(callback){
  var XMP
  try {
    XMP = ao_XMP.load()
  }
  catch(e){return callback(e)}
  try {
    return callback(null, new ao_XMP())
  }
  finally {
    ao_XMP.unload()
  }
}
