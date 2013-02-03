/*jshint asi:true*/

ActionList.prototype.toJSON = function(){
  var object = [], index = this.count
  while (index-- > 0){
    object[index] = this.ao_getValue(index)
  }
  return object
}

ActionDescriptor.prototype.toJSON = function(object){
  if (!(object && typeof object == 'object')) object = {}
  var index = this.count, key
  // , keyO
  // var keys = []
  while (index-- > 0){
    key = this.getKey(index)
    // keyO = keys[index] = {
    //   typeID:key,
    //   charID:typeIDToCharID(key),
    //   stringID:typeIDToStringID(key),
    //   type:ActionDescriptor.ao_getTypeString(this.getType(key)),
    //   valueType:ActionDescriptor.ao_getTypeString(this.ao_getValueType(key)),
    //   value:this.ao_getValue(key),
    // }
    object[typeIDToStringID(key)] = this.ao_getValue(key)
  }
  return object
}
ActionDescriptor.keys = function(descriptor, keys){
  var index = descriptor.count
  if (keys == null) keys = Array(index)
  while (index-- > 0){
    keys[index] = typeIDToStringID(descriptor.getKey(index))
  }
  return keys
}

ActionList.prototype.ao_getValueType =
ActionDescriptor.prototype.ao_getValueType = function(key){
  var _DescValueType = this.getType(key)
  if (_DescValueType == DescValueType.ENUMERATEDTYPE) return this.getEnumerationType(key)
  if (_DescValueType == DescValueType.OBJECTTYPE) return this.getObjectType(key)
  if (_DescValueType == DescValueType.UNITDOUBLE) return this.getUnitDoubleType(key)
  return _DescValueType
}

ActionList.prototype.ao_getValue =
ActionDescriptor.prototype.ao_getValue = function(key){
  var _DescValueType = this.getType(key)
  if (_DescValueType == DescValueType.ALIASTYPE) return this.getPath(key)
  else if (_DescValueType == DescValueType.BOOLEANTYPE) return this.getBoolean(key)
  else if (_DescValueType == DescValueType.CLASSTYPE) return this.getClass(key)
  else if (_DescValueType == DescValueType.DOUBLETYPE) return this.getDouble(key)
  else if (_DescValueType == DescValueType.ENUMERATEDTYPE) return typeIDToStringID(this.getEnumerationValue(key))
  else if (_DescValueType == DescValueType.INTEGERTYPE) return this.getInteger(key)
  else if (_DescValueType == DescValueType.LARGEINTEGERTYPE) return this.getLargeInteger(key)
  else if (_DescValueType == DescValueType.LISTTYPE) return this.getList(key)
  else if (_DescValueType == DescValueType.OBJECTTYPE) return this.getObjectValue(key)
  else if (_DescValueType == DescValueType.RAWTYPE) return this.getData(key)
  else if (_DescValueType == DescValueType.REFERENCETYPE) return this.getReference(key)
  else if (_DescValueType == DescValueType.STRINGTYPE) return this.getString(key)
  else if (_DescValueType == DescValueType.UNITDOUBLE) return this.getUnitDoubleValue(key)
  return
}

ActionList.ao_getTypeString =
ActionDescriptor.ao_getTypeString = function(_DescValueType){
  if (_DescValueType == DescValueType.ALIASTYPE) return 'alias'
  else if (_DescValueType == DescValueType.BOOLEANTYPE) return 'boolean'
  else if (_DescValueType == DescValueType.CLASSTYPE) return 'class'
  else if (_DescValueType == DescValueType.DOUBLETYPE) return 'double'
  else if (_DescValueType == DescValueType.ENUMERATEDTYPE) return 'enumerated'
  else if (_DescValueType == DescValueType.INTEGERTYPE) return 'integer'
  else if (_DescValueType == DescValueType.LARGEINTEGERTYPE) return 'largeinteger'
  else if (_DescValueType == DescValueType.LISTTYPE) return 'list'
  else if (_DescValueType == DescValueType.OBJECTTYPE) return 'object'
  else if (_DescValueType == DescValueType.RAWTYPE) return 'raw'
  else if (_DescValueType == DescValueType.REFERENCETYPE) return 'reference'
  else if (_DescValueType == DescValueType.STRINGTYPE) return 'string'
  else if (_DescValueType == DescValueType.UNITDOUBLE) return 'unitdouble'
  return 'unknown'
}

////////////////////////////////////////////////////////////////////////////////

ActionReference.prototype.toJSON = function(){
  var object = {}
  object.Class = typeIDToStringID(this.getDesiredClass())
  object[ActionReference.ao_getTypeString(this.getForm())] = this.ao_getValue()
  return object
}

ActionReference.prototype.ao_getValue = function(){
  var _ReferenceFormType = this.getForm()
  if (_ReferenceFormType == ReferenceFormType.CLASSTYPE) return this.getDesiredClass()
  if (_ReferenceFormType == ReferenceFormType.ENUMERATED) return typeIDToStringID(this.getEnumeratedValue())
  if (_ReferenceFormType == ReferenceFormType.IDENTIFIER) return this.getIdentifier()
  if (_ReferenceFormType == ReferenceFormType.INDEX) return this.getIndex()
  if (_ReferenceFormType == ReferenceFormType.NAME) return this.getName()
  if (_ReferenceFormType == ReferenceFormType.OFFSET) return this.getOffset()
  if (_ReferenceFormType == ReferenceFormType.PROPERTY) return typeIDToStringID(this.getProperty())
  return
}

ActionReference.prototype.ao_putValue =
ActionReference.from = function(Class, value, type){
  var ref
  if (this instanceof ActionReference && !(this instanceof Function)) ref = this
  else ref = new ActionReference
  
  if (type == null){
    switch(typeof value){
    case 'undefined':
      for (var property in Class) {
        if (property == 'Class' || typeof Class[type] == 'function') continue;
        type = property
        value = Class[type]
        break;
      }
      Class = Class.Class
      break;
    case 'number': type = ReferenceFormType.IDENTIFIER; break;
    case 'string': type = ReferenceFormType.NAME; break;
    default:
      throw Error('expected type')
    }
  }
  Class = stringIDToTypeID(Class)
    
  if (type == 'identifier' || type == ReferenceFormType.IDENTIFIER) ref.putIdentifier(Class, value)
  else if (type == 'index' || type == ReferenceFormType.INDEX) ref.putIndex(Class, value)
  else if (type == 'name' || type == ReferenceFormType.NAME) ref.putName(Class, value)
  else if (type == 'offset' || type == ReferenceFormType.OFFSET) ref.putOffset(Class, value)
  else if (type == 'property' || type == ReferenceFormType.PROPERTY) ref.putProperty(Class, value)
  else if (value == null)
    ref.putDesiredClass(Class)
  else
    ref.putEnumeratedValue(Class, stringIDToTypeID(type), value)
  return ref
}

ActionReference.ao_getTypeString = function(_ReferenceFormType){
  if (_ReferenceFormType == ReferenceFormType.CLASSTYPE) return 'class'
  if (_ReferenceFormType == ReferenceFormType.ENUMERATED) return 'enumerated'
  if (_ReferenceFormType == ReferenceFormType.IDENTIFIER) return 'identifier'
  if (_ReferenceFormType == ReferenceFormType.INDEX) return 'index'
  if (_ReferenceFormType == ReferenceFormType.NAME) return 'name'
  if (_ReferenceFormType == ReferenceFormType.OFFSET) return 'offset'
  if (_ReferenceFormType == ReferenceFormType.PROPERTY) return 'property'
  return
}
