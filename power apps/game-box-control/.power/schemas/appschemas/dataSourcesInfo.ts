/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "iot_20game_20staff_20api_20connector_5f0ce8bdb1_5e21a452ca4389f9": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "GetDeviceProfiles": {
        "path": "/{connectionId}/device-profiles",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "GetKioskState": {
        "path": "/{connectionId}/kiosk-state",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "SetMode": {
        "path": "/{connectionId}/set-mode",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "ToggleDevice": {
        "path": "/{connectionId}/toggle-device",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "SetGameMode": {
        "path": "/{connectionId}/set-game-mode",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "GetPrizeTypes": {
        "path": "/{connectionId}/prize-types",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "GetPrizeCount": {
        "path": "/{connectionId}/prize-count",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "BulkCreatePrizes": {
        "path": "/{connectionId}/bulk-create-prizes",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "GrandPrizeCheckIn": {
        "path": "/{connectionId}/grand-prize/check-in",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "GetDrawingSlices": {
        "path": "/{connectionId}/grand-prize/drawing-slices",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "GetDrawingState": {
        "path": "/{connectionId}/grand-prize/drawing-state",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "DrawGrandPrize": {
        "path": "/{connectionId}/grand-prize/draw",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "CreateTestWin": {
        "path": "/{connectionId}/create-win",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      },
      "ClaimTestPrize": {
        "path": "/{connectionId}/claim-prize",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          }
        }
      }
    }
  }
};
