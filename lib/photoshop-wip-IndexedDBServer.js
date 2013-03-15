IndexedDBServer.protocol = {
  "domain": "IndexedDB",
  "hidden": true,
  "types": [
    {
      "id": "SecurityOriginWithDatabaseNames",
      "type": "object",
      "description": "Security origin with database names.",
      "properties": [
        { "name": "securityOrigin", "type": "string", "description": "Security origin." },
        { "name": "databaseNames", "type": "array", "items": { "type": "string" }, "description": "Database names for this origin." }
      ]
    },
    {
      "id": "DatabaseWithObjectStores",
      "type": "object",
      "description": "Database with an array of object stores.",
      "properties": [
        { "name": "name", "type": "string", "description": "Database name." },
        { "name": "version", "type": "string", "description": "Database version." },
        { "name": "objectStores", "type": "array", "items": { "$ref": "ObjectStore" }, "description": "Object stores in this database." }
      ]
    },
    {
      "id": "ObjectStore",
      "type": "object",
      "description": "Object store.",
      "properties": [
        { "name": "name", "type": "string", "description": "Object store name." },
        { "name": "keyPath", "type": "string", "description": "Object store key path." },
        { "name": "indexes", "type": "array", "items": { "$ref": "ObjectStoreIndex" }, "description": "Indexes in this object store." }
      ]
    },
    {
      "id": "ObjectStoreIndex",
      "type": "object",
      "description": "Object store index.",
      "properties": [
        { "name": "name", "type": "string", "description": "Index name." },
        { "name": "keyPath", "type": "string", "description": "Index key path." },
        { "name": "unique", "type": "boolean", "description": "If true, index is unique." },
        { "name": "multiEntry", "type": "boolean", "description": "If true, index allows multiple entries for a key." }
      ]
    }
  ],
  "commands": [
    {
      "name": "enable",
      "description": "Enables events from backend."
    },
    {
      "name": "disable",
      "description": "Disables events from backend."
    },
    {
      "name": "requestDatabaseNamesForFrame",
      "parameters": [
        { "name": "requestId", "type": "integer", "description": "Request id." },
        { "name": "frameId", "$ref": "Network.FrameId", "description": "Frame id." }
      ],
      "description": "Requests database names for given frame's security origin."
    },
    {
      "name": "requestDatabase",
      "parameters": [
        { "name": "requestId", "type": "integer", "description": "Request id." },
        { "name": "frameId", "$ref": "Network.FrameId" },
        { "name": "databaseName", "type": "string" }
      ],
      "description": "Requests database with given name in given frame."
    }
  ],
  "events": [
    {
      "name": "databaseNamesLoaded",
      "parameters": [
        { "name": "requestId", "type": "number", "description": "Request id." },
        { "name": "securityOriginWithDatabaseNames", "$ref": "SecurityOriginWithDatabaseNames", "description": "Frame with database names." }
      ]
    },
    {
      "name": "databaseLoaded",
      "parameters": [
        { "name": "requestId", "type": "integer", "description": "Request id." },
        { "name": "databaseWithObjectStores", "$ref": "DatabaseWithObjectStores", "description": "Database with an array of object stores." }
      ]
    }
  ]
}

exports.IndexedDBServer = IndexedDBServer

function IndexedDBServer(){}

var IndexedDB = IndexedDBServer.prototype = {constructor:IndexedDBServer}

IndexedDB.enable = function(params, callback, fire){
  callback()
}

