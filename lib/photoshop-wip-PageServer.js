PageServer.protocol = {
  "domain": "Page",
  "description": "Actions and events related to the inspected page belong to the page domain.",
  "types": [
    {
      "id": "ResourceType",
      "type": "string",
      "enum": ["Document", "Stylesheet", "Image", "Font", "Script", "XHR", "WebSocket", "Other"],
      "description": "Resource type as it was perceived by the rendering engine."
    },
    {
      "id": "Frame",
      "type": "object",
      "description": "Information about the Frame on the page.",
      "properties": [
        { "name": "id", "type": "string", "description": "Frame unique identifier." },
        { "name": "parentId", "type": "string", "optional": true, "description": "Parent frame identifier." },
        { "name": "loaderId", "$ref": "Network.LoaderId", "description": "Identifier of the loader associated with this frame." },
        { "name": "name", "type": "string", "optional": true, "description": "Frame's name as specified in the tag." },
        { "name": "url", "type": "string", "description": "Frame document's URL." },
        { "name": "securityOrigin", "type": "string", "optional": true, "description": "Frame document's security origin." },
        { "name": "mimeType", "type": "string", "description": "Frame document's mimeType as determined by the browser." }
      ],
      "hidden": true
    },
    {
      "id": "FrameResourceTree",
      "type": "object",
      "description": "Information about the Frame hierarchy along with their cached resources.",
      "properties": [
        { "name": "frame", "$ref": "Frame", "description": "Frame information for this tree item." },
        { "name": "childFrames", "type": "array", "optional": true, "items": { "$ref": "FrameResourceTree" }, "description": "Child frames." },
        { "name": "resources", "type": "array",
          "items": {
            "type": "object",
            "properties": [
              { "name": "url", "type": "string", "description": "Resource URL." },
              { "name": "type", "$ref": "ResourceType", "description": "Type of this resource." },
              { "name": "mimeType", "type": "string", "description": "Resource mimeType as determined by the browser." }
            ]
          },
          "description": "Information about frame resources."
        }
      ],
      "hidden": true
    },
    {
      "id": "SearchMatch",
      "type": "object",
      "description": "Search match for resource.",
      "properties": [
        { "name": "lineNumber", "type": "number", "description": "Line number in resource content." },
        { "name": "lineContent", "type": "string", "description": "Line with match content." }
      ],
      "hidden": true
    },
    {
      "id": "SearchResult",
      "type": "object",
      "description": "Search result for resource.",
      "properties": [
        { "name": "url", "type": "string", "description": "Resource URL." },
        { "name": "frameId", "$ref": "Network.FrameId", "description": "Resource frame id." },
        { "name": "matchesCount", "type": "number", "description": "Number of matches in the resource content." }
      ],
      "hidden": true
    },
    {
      "id": "Cookie",
      "type": "object",
      "description": "Cookie object",
      "properties": [
        { "name": "name", "type": "string", "description": "Cookie name." },
        { "name": "value", "type": "string", "description": "Cookie value." },
        { "name": "domain", "type": "string", "description": "Cookie domain." },
        { "name": "path", "type": "string", "description": "Cookie path." },
        { "name": "expires", "type": "integer", "description": "Cookie expires." },
        { "name": "size", "type": "integer", "description": "Cookie size." },
        { "name": "httpOnly", "type": "boolean", "description": "True if cookie is http-only." },
        { "name": "secure", "type": "boolean", "description": "True if cookie is secure." },
        { "name": "session", "type": "boolean", "description": "True in case of session cookie." }
      ],
      "hidden": true
    },
    {
      "id": "ScriptIdentifier",
      "type": "string",
      "description": "Unique script identifier.",
      "hidden": true
    }
  ],
  "commands": [
    {
      "name": "enable",
      "description": "Enables page domain notifications."
    },
    {
      "name": "disable",
      "description": "Disables page domain notifications."
    },
    {
      "name": "addScriptToEvaluateOnLoad",
      "parameters": [
        { "name": "scriptSource", "type": "string" }
      ],
      "returns": [
        { "name": "identifier", "$ref": "ScriptIdentifier", "description": "Identifier of the added script." }
      ],
      "hidden": true
    },
    {
      "name": "removeScriptToEvaluateOnLoad",
      "parameters": [
        { "name": "identifier", "$ref": "ScriptIdentifier" }
      ],
      "hidden": true
    },
    {
      "name": "reload",
      "parameters": [
        { "name": "ignoreCache", "type": "boolean", "optional": true, "description": "If true, browser cache is ignored (as if the user pressed Shift+refresh)." },
        { "name": "scriptToEvaluateOnLoad", "type": "string", "optional": true, "description": "If set, the script will be injected into all frames of the inspected page after reload." }
      ],
      "description": "Reloads given page optionally ignoring the cache."
    },
    {
      "name": "navigate",
      "parameters": [
        { "name": "url", "type": "string", "description": "URL to navigate the page to." }
      ],
      "description": "Navigates current page to the given URL."
    },
    {
      "name": "getCookies",
      "returns": [
        { "name": "cookies", "type": "array", "items": { "$ref": "Cookie"}, "description": "Array of cookie objects." },
        { "name": "cookiesString", "type": "string", "description": "document.cookie string representation of the cookies." }
      ],
      "description": "Returns all browser cookies. Depending on the backend support, will either return detailed cookie information in the <code>cookie</code> field or string cookie representation using <code>cookieString</code>.",
      "hidden": true
    },
    {
      "name": "deleteCookie",
      "parameters": [
        { "name": "cookieName", "type": "string", "description": "Name of the cookie to remove." },
        { "name": "domain", "type": "string", "description": "Domain of the cookie to remove." }
      ],
      "description": "Deletes browser cookie with given name for the given domain.",
      "hidden": true
    },
    {
      "name": "getResourceTree",
      "description": "Returns present frame / resource tree structure.",
      "returns": [
        { "name": "frameTree", "$ref": "FrameResourceTree", "description": "Present frame / resource tree structure." }
      ],
      "hidden": true
    },
    {
      "name": "getResourceContent",
      "description": "Returns content of the given resource.",
      "parameters": [
        { "name": "frameId", "$ref": "Network.FrameId", "description": "Frame id to get resource for." },
        { "name": "url", "type": "string", "description": "URL of the resource to get content for." }
      ],
      "returns": [
        { "name": "content", "type": "string", "description": "Resource content." },
        { "name": "base64Encoded", "type": "boolean", "description": "True, if content was served as base64." }
      ],
      "hidden": true
    },
    {
      "name": "searchInResource",
      "description": "Searches for given string in resource content.",
      "parameters": [
        { "name": "frameId", "$ref": "Network.FrameId", "description": "Frame id for resource to search in." },
        { "name": "url", "type": "string", "description": "URL of the resource to search in." },
        { "name": "query", "type": "string", "description": "String to search for."  },
        { "name": "caseSensitive", "type": "boolean", "optional": true, "description": "If true, search is case sensitive." },
        { "name": "isRegex", "type": "boolean", "optional": true, "description": "If true, treats string parameter as regex." }
      ],
      "returns": [
        { "name": "result", "type": "array", "items": { "$ref": "SearchMatch" }, "description": "List of search matches." }
      ],
      "hidden": true
    },
    {
      "name": "searchInResources",
      "description": "Searches for given string in frame / resource tree structure.",
      "parameters": [
        { "name": "text", "type": "string", "description": "String to search for."  },
        { "name": "caseSensitive", "type": "boolean", "optional": true, "description": "If true, search is case sensitive." },
        { "name": "isRegex", "type": "boolean", "optional": true, "description": "If true, treats string parameter as regex." }
      ],
      "returns": [
        { "name": "result", "type": "array", "items": { "$ref": "SearchResult" }, "description": "List of search results." }
      ],
      "hidden": true
    },
    {
      "name": "setDocumentContent",
      "description": "Sets given markup as the document's HTML.",
      "parameters": [
        { "name": "frameId", "$ref": "Network.FrameId", "description": "Frame id to set HTML for." },
        { "name": "html", "type": "string", "description": "HTML content to set."  }
      ],
      "hidden": true
    },
    {
      "name": "setScreenSizeOverride",
      "description": "Overrides the values of window.screen.width, window.screen.height, window.innerWidth, window.innerHeight, and \"device-width\"/\"device-height\"-related CSS media query results",
      "parameters": [
        { "name": "width", "type": "integer", "description": "Overriding width value in pixels (minimum 0, maximum 10000000). 0 disables the override." },
        { "name": "height", "type": "integer", "description": "Overriding height value in pixels (minimum 0, maximum 10000000). 0 disables the override." }
      ],
      "hidden": true
    }
  ],
  "events": [
    {
      "name": "domContentEventFired",
      "parameters": [
        { "name": "timestamp", "type": "number" }
      ]
    },
    {
      "name": "loadEventFired",
      "parameters": [
        { "name": "timestamp", "type": "number" }
      ]
    },
    {
      "name": "frameNavigated",
      "description": "Fired once navigation of the frame has completed. Frame is now associated with the new loader.",
      "parameters": [
        { "name": "frame", "$ref": "Frame", "description": "Frame object." }
      ],
      "hidden": true
    },
    {
      "name": "frameDetached",
      "description": "Fired when frame has been detached from its parent.",
      "parameters": [
        { "name": "frameId", "$ref": "Network.FrameId", "description": "Id of the frame that has been detached." }
      ],
      "hidden": true
    }
  ]
}

exports.PageServer = PageServer

function PageServer(){}

var Page = PageServer.prototype = {constructor:PageServer}

Page.enable = function(params, callback, fire){
  callback()
  
  var frame = {
    "id": "frame1", // "description": "Frame unique identifier." },
    // "parentId": "string", // "optional": true, "description": "Parent frame identifier." },
    "loaderId": "Network.LoaderId", // "description": "Identifier of the loader associated with this frame." },
    // "name": "string", // "optional": true, "description": "Frame's name as specified in the tag." },
    "url": "myawesomeurl.com", // "description": "Frame document's URL." },
    "securityOrigin": "INSECURE", // "optional": true, "description": "Frame document's security origin." },
    "mimeType": "text/html", // "description": "Frame document's mimeType as determined by the browser." }
  }
  fire({method:"Page.frameNavigated", params:frame})
}
