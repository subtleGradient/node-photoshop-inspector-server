NetworkServer.protocol = {
  "domain": "Network",
  "description": "Network domain allows tracking network activities of the page. It exposes information about http, file, data and other requests and responses, their headers, bodies, timing, etc.",
  "types": [
    {
      "id": "LoaderId",
      "type": "string",
      "description": "Unique loader identifier."
    },
    {
      "id": "FrameId",
      "type": "string",
      "description": "Unique frame identifier.",
      "hidden": true
    },
    {
      "id": "RequestId",
      "type": "string",
      "description": "Unique request identifier."
    },
    {
      "id": "Timestamp",
      "type": "number",
      "description": "Number of seconds since epoch."
    },
    {
      "id": "Headers",
      "type": "object",
      "description": "Request / response headers as keys / values of JSON object."
    },
    {
      "id": "ResourceTiming",
      "type": "object",
      "description": "Timing information for the request.",
      "properties": [
        { "name": "requestTime", "type": "number", "description": "Timing's requestTime is a baseline in seconds, while the other numbers are ticks in milliseconds relatively to this requestTime." },
        { "name": "proxyStart", "type": "number", "description": "Started resolving proxy." },
        { "name": "proxyEnd", "type": "number", "description": "Finished resolving proxy." },
        { "name": "dnsStart", "type": "number", "description": "Started DNS address resolve." },
        { "name": "dnsEnd", "type": "number", "description": "Finished DNS address resolve." },
        { "name": "connectStart", "type": "number", "description": "Started connecting to the remote host." },
        { "name": "connectEnd", "type": "number", "description": "Connected to the remote host." },
        { "name": "sslStart", "type": "number", "description": "Started SSL handshake." },
        { "name": "sslEnd", "type": "number", "description": "Finished SSL handshake." },
        { "name": "sendStart", "type": "number", "description": "Started sending request." },
        { "name": "sendEnd", "type": "number", "description": "Finished sending request." },
        { "name": "receiveHeadersEnd", "type": "number", "description": "Finished receiving response headers." }
      ]
    },
    {
      "id": "Request",
      "type": "object",
      "description": "HTTP request data.",
      "properties": [
        { "name": "url", "type": "string", "description": "Request URL." },
        { "name": "method", "type": "string", "description": "HTTP request method." },
        { "name": "headers", "$ref": "Headers", "description": "HTTP request headers." },
        { "name": "postData", "type": "string", "optional": true, "description": "HTTP POST request data." }
      ]
    },
    {
      "id": "Response",
      "type": "object",
      "description": "HTTP response data.",
      "properties": [
        { "name": "url", "type": "string", "description": "Response URL." },
        { "name": "status", "type": "number", "description": "HTTP response status code." },
        { "name": "statusText", "type": "string", "description": "HTTP response status text." },
        { "name": "headers", "$ref": "Headers", "description": "HTTP response headers." },
        { "name": "headersText", "type": "string", "optional": true, "description": "HTTP response headers text." },
        { "name": "mimeType", "type": "string", "description": "Resource mimeType as determined by the browser." },
        { "name": "requestHeaders", "$ref": "Headers", "optional": true, "description": "Refined HTTP request headers that were actually transmitted over the network." },
        { "name": "requestHeadersText", "type": "string", "optional": true, "description": "HTTP request headers text." },
        { "name": "connectionReused", "type": "boolean", "description": "Specifies whether physical connection was actually reused for this request." },
        { "name": "connectionId", "type": "number", "description": "Physical connection id that was actually used for this request." },
        { "name": "fromDiskCache", "type": "boolean", "optional": true, "description": "Specifies that the request was served from the disk cache." },
        { "name": "timing", "$ref": "ResourceTiming", "optional": true, "description": "Timing information for the given request." }
      ]
    },
    {
      "id": "WebSocketRequest",
      "type": "object",
      "description": "WebSocket request data.",
      "hidden": true,
      "properties": [
        { "name": "requestKey3", "type": "string", "description": "HTTP response status text." },
        { "name": "headers", "$ref": "Headers", "description": "HTTP response headers." }
      ]
    },
    {
      "id": "WebSocketResponse",
      "type": "object",
      "description": "WebSocket response data.",
      "hidden": true,
      "properties": [
        { "name": "status", "type": "number", "description": "HTTP response status code." },
        { "name": "statusText", "type": "string", "description": "HTTP response status text." },
        { "name": "headers", "$ref": "Headers", "description": "HTTP response headers." },
        { "name": "challengeResponse", "type": "string", "description": "Challenge response." }
      ]
    },
    {
      "id": "CachedResource",
      "type": "object",
      "description": "Information about the cached resource.",
      "properties": [
        { "name": "url", "type": "string", "description": "Resource URL." },
        { "name": "type", "$ref": "Page.ResourceType", "description": "Type of this resource." },
        { "name": "response", "$ref": "Response", "optional": true, "description": "Cached response data." },
        { "name": "bodySize", "type": "number", "description": "Cached response body size." }
      ]
    },
    {
      "id": "Initiator",
      "type": "object",
      "description": "Information about the request initiator.",
      "properties": [
        { "name": "type", "type": "string", "enum": ["parser", "script", "other"], "description": "Type of this initiator." },
        { "name": "stackTrace", "$ref": "Console.StackTrace", "optional": true, "description": "Initiator JavaScript stack trace, set for Script only." },
        { "name": "url", "type": "string", "optional": true, "description": "Initiator URL, set for Parser type only." },
        { "name": "lineNumber", "type": "number", "optional": true, "description": "Initiator line number, set for Parser type only." }
      ]
    }
  ],
  "commands": [
    {
      "name": "enable",
      "description": "Enables network tracking, network events will now be delivered to the client."
    },
    {
      "name": "disable",
      "description": "Disables network tracking, prevents network events from being sent to the client."
    },
    {
      "name": "setUserAgentOverride",
      "description": "Allows overriding user agent with the given string.",
      "parameters": [
        { "name": "userAgent", "type": "string", "description": "User agent to use." }
      ]
    },
    {
      "name": "setExtraHTTPHeaders",
      "description": "Specifies whether to always send extra HTTP headers with the requests from this page.",
      "parameters": [
        { "name": "headers", "$ref": "Headers", "description": "Map with extra HTTP headers." }
      ]
    },
    {
      "name": "getResponseBody",
      "description": "Returns content served for the given request.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Identifier of the network request to get content for." }
      ],
      "returns": [
        { "name": "body", "type": "string", "description": "Response body." },
        { "name": "base64Encoded", "type": "boolean", "description": "True, if content was sent as base64." }
      ]
    },
    {
      "name": "canClearBrowserCache",
      "description": "Tells whether clearing browser cache is supported.",
      "returns": [
        { "name": "result", "type": "boolean", "description": "True if browser cache can be cleared." }
      ]
    },
    {
      "name": "clearBrowserCache",
      "description": "Clears browser cache."
    },
    {
      "name": "canClearBrowserCookies",
      "description": "Tells whether clearing browser cookies is supported.",
      "returns": [
        { "name": "result", "type": "boolean", "description": "True if browser cookies can be cleared." }
      ]
    },
    {
      "name": "clearBrowserCookies",
      "description": "Clears browser cookies."
    },
    {
      "name": "setCacheDisabled",
      "parameters": [
        { "name": "cacheDisabled", "type": "boolean", "description": "Cache disabled state." }
      ],
      "description": "Toggles ignoring cache for each request. If <code>true</code>, cache will not be used." 
    }
  ],
  "events": [
    {
      "name": "requestWillBeSent",
      "description": "Fired when page is about to send HTTP request.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "frameId", "$ref": "FrameId", "description": "Frame identifier.", "hidden": true },
        { "name": "loaderId", "$ref": "LoaderId", "description": "Loader identifier." },
        { "name": "documentURL", "type": "string", "description": "URL of the document this request is loaded for." },
        { "name": "request", "$ref": "Request", "description": "Request data." },
        { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." },
        { "name": "initiator", "$ref": "Initiator", "description": "Request initiator." },
        { "name": "stackTrace", "$ref": "Console.StackTrace", "optional": true, "description": "JavaScript stack trace upon issuing this request." },
        { "name": "redirectResponse", "optional": true, "$ref": "Response", "description": "Redirect response data." }
      ]
    },
    {
      "name": "requestServedFromCache",
      "description": "Fired if request ended up loading from cache.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." }
      ]
    },
    {
      "name": "responseReceived",
      "description": "Fired when HTTP response is available.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "frameId", "$ref": "FrameId", "description": "Frame identifier.", "hidden": true },
        { "name": "loaderId", "$ref": "LoaderId", "description": "Loader identifier." },
        { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." },
        { "name": "type", "$ref": "Page.ResourceType", "description": "Resource type." },
        { "name": "response", "$ref": "Response", "description": "Response data." }
      ]
    },
    {
      "name": "dataReceived",
      "description": "Fired when data chunk was received over the network.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." },
        { "name": "dataLength", "type": "integer", "description": "Data chunk length." },
        { "name": "encodedDataLength", "type": "integer", "description": "Actual bytes received (might be less than dataLength for compressed encodings)." }
      ]
    },
    {
      "name": "loadingFinished",
      "description": "Fired when HTTP request has finished loading.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." }
      ]
    },
    {
      "name": "loadingFailed",
      "description": "Fired when HTTP request has failed to load.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." },
        { "name": "errorText", "type": "string", "description": "User friendly error message." },
        { "name": "canceled", "type": "boolean", "optional": true, "description": "True if loading was canceled." }
      ]
    },
    {
      "name": "requestServedFromMemoryCache",
      "description": "Fired when HTTP request has been served from memory cache.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "frameId", "$ref": "FrameId", "description": "Frame identifier.", "hidden": true },
        { "name": "loaderId", "$ref": "LoaderId", "description": "Loader identifier." },
        { "name": "documentURL", "type": "string", "description": "URL of the document this request is loaded for." },
        { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." },
        { "name": "initiator", "$ref": "Initiator", "description": "Request initiator." },
        { "name": "resource", "$ref": "CachedResource", "description": "Cached resource data." }
      ]
    },
    {
      "name": "webSocketWillSendHandshakeRequest",
      "description": "Fired when WebSocket is about to initiate handshake.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." },
        { "name": "request", "$ref": "WebSocketRequest", "description": "WebSocket request data." }
      ],
      "hidden": true
    },
    {
      "name": "webSocketHandshakeResponseReceived",
      "description": "Fired when WebSocket handshake response becomes available.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." },
        { "name": "response", "$ref": "WebSocketResponse", "description": "WebSocket response data." }
      ],
      "hidden": true
    },
    {
      "name": "webSocketCreated",
      "description": "Fired upon WebSocket creation.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "url", "type": "string", "description": "WebSocket request URL." }
      ],
      "hidden": true
    },
    {
      "name": "webSocketClosed",
      "description": "Fired when WebSocket is closed.",
      "parameters": [
        { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
        { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." }
      ],
      "hidden": true
    }
  ]
}

exports.NetworkServer = NetworkServer

function NetworkServer(){}

var Network = NetworkServer.prototype = {constructor:NetworkServer}

Network.enable = function(params, callback, fire){
  callback()
  
  var request = {
    requestId:"testing123 requestId",
    frameId:"testing123 frameId",
    loaderId:"testing123 loaderId",
    documentURL:"testing123 documentURL",
    request:"testing123 request",
    timestamp:Date.now() / 1000,
    initiator: {
      type: 'parser', // ["parser", "script", "other"]
    },
    // stackTrace:"testing123 stackTrace",
    // redirectResponse:"testing123 redirectResponse",
  }
  var response = {
    requestId: "testing123 requestId",
    frameId: "testing123 frameId",
    loaderId: "testing123 loaderId",
    timestamp: Date.now() / 1000,
    type: "Document",//["Document", "Stylesheet", "Image", "Font", "Script", "XHR", "WebSocket", "Other"],
    response: "Not Implemented",
  }
  setTimeout(function(){
    fire({method:"Network.requestWillBeSent", params:request})
    fire({method:"Network.responseReceived", params:response})
  }, 100);
}

/*
{
  "name": "requestWillBeSent",
  "description": "Fired when page is about to send HTTP request.",
  "parameters": [
    { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
    { "name": "frameId", "$ref": "FrameId", "description": "Frame identifier.", "hidden": true },
    { "name": "loaderId", "$ref": "LoaderId", "description": "Loader identifier." },
    { "name": "documentURL", "type": "string", "description": "URL of the document this request is loaded for." },
    { "name": "request", "$ref": "Request", "description": "Request data." },
    { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." },
    { "name": "initiator", "$ref": "Initiator", "description": "Request initiator." },
    { "name": "stackTrace", "$ref": "Console.StackTrace", "optional": true, "description": "JavaScript stack trace upon issuing this request." },
    { "name": "redirectResponse", "optional": true, "$ref": "Response", "description": "Redirect response data." }
  ]
}

{
  "name": "responseReceived",
  "description": "Fired when HTTP response is available.",
  "parameters": [
    { "name": "requestId", "$ref": "RequestId", "description": "Request identifier." },
    { "name": "frameId", "$ref": "FrameId", "description": "Frame identifier.", "hidden": true },
    { "name": "loaderId", "$ref": "LoaderId", "description": "Loader identifier." },
    { "name": "timestamp", "$ref": "Timestamp", "description": "Timestamp." },
    { "name": "type", "$ref": "Page.ResourceType", "description": "Resource type." },
    { "name": "response", "$ref": "Response", "description": "Response data." }
  ]
}*/
