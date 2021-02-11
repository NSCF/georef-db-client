'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {return typeof obj;} : function (obj) {return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;};var _createClass = function () {function defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}return function (Constructor, protoProps, staticProps) {if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;};}();function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}} //from https://dev.to/bytebodger/javascript-type-checking-without-typescript-21aa
//and https://github.com/bytebodger/type-checking

//had to be modified to allow for debugging in VS Code
var
Is = function () {function Is() {_classCallCheck(this, Is);}_createClass(Is, null, [{ key: 'aBoolean',
      /**
                                                                                                        * @param {boolean} value
                                                                                                        * @param {boolean} suppressError
                                                                                                        * @returns {boolean}
                                                                                                        */value: function aBoolean()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (typeof value === 'boolean')
         return true;
         if (!suppressError)
         console.error(value, 'is not a Boolean');
         return false;
      } }, { key: 'aFunction',

      /**
                                * @param {function} value
                                * @param {boolean} suppressError
                                * @returns {boolean}
                                */value: function aFunction()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (typeof value === 'function')
         return true;
         if (!suppressError)
         console.error(value, 'is not a function');
         return false;
      } }, { key: 'anArray',

      /**
                              * @param {[]} value
                              * @param {boolean} suppressError
                              * @returns {boolean}
                              */value: function anArray()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (Array.isArray(value))
         return true;
         if (!suppressError)
         console.error(value, 'is not an array');
         return false;
      } }, { key: 'anInteger',

      /**
                                * @param {number} value
                                * @param {boolean} suppressError
                                * @returns {boolean}
                                */value: function anInteger()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (Number.isInteger(value))
         return true;
         if (!suppressError)
         console.error(value, 'is not an integer');
         return false;
      } }, { key: 'anObject',

      /**
                               * @param {Object} value
                               * @param {boolean} suppressError
                               * @returns {boolean}
                               */value: function anObject()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && !Array.isArray(value) && value !== null)
         return true;
         if (!suppressError)
         console.error(value, 'is not an object');
         return false;
      } }, { key: 'aNonNegativeInteger',

      /**
                                          * @param {number} value
                                          * @param {boolean} suppressError
                                          * @returns {boolean}
                                          */value: function aNonNegativeInteger()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         return this.anInteger(value, suppressError) && value >= 0;
      } }, { key: 'aNumber',

      /**
                              * @param {number} value
                              * @param {boolean} suppressError
                              * @returns {boolean}
                              */value: function aNumber()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (typeof value === 'number')
         return true;
         if (!suppressError)
         console.error(value, 'is not a number');
         return false;
      } }, { key: 'aPopulatedArray',

      /**
                                      * @param {[]} value
                                      * @param {boolean} suppressError
                                      * @returns {boolean}
                                      */value: function aPopulatedArray()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (Array.isArray(value) && value.length > 0)
         return true;
         if (!suppressError)
         console.error(value, 'is not a populated array');
         return false;
      } }, { key: 'aPopulatedObject',

      /**
                                       * @param {Object} value
                                       * @param {boolean} suppressError
                                       * @returns {boolean}
                                       */value: function aPopulatedObject()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (this.nullOrUndefined(value)) {
            if (!suppressError)
            console.error(value, 'is not a populated object');
            return false;
         }
         if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && !Array.isArray(value) && Object.keys(value).length > 0)
         return true;
         if (!suppressError)
         console.error(value, 'is not a populated object');
         return false;
      } }, { key: 'aPopulatedString',

      /**
                                       * @param {string} value
                                       * @param {boolean} suppressError
                                       * @returns {boolean}
                                       */value: function aPopulatedString()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (typeof value === 'string' && value.trim() !== '')
         return true;
         if (!suppressError)
         console.error(value, 'is not a populated string');
         return false;
      } }, { key: 'aPositiveInteger',

      /**
                                       * @param {number} value
                                       * @param {boolean} suppressError
                                       * @returns {boolean}
                                       */value: function aPositiveInteger()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         return this.anInteger(value, suppressError) && value > 0;
      } }, { key: 'aString',

      /**
                              * @param {string} value
                              * @param {boolean} suppressError
                              * @returns {boolean}
                              */value: function aString()
      {var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (typeof value === 'string')
         return true;
         if (!suppressError)
         console.error(value, 'is not a string');
         return false;
      } }, { key: 'null',

      /**
                           * @param {*} variable
                           * @returns {boolean}
                           */value: function _null(
      variable) {
         return variable === null;
      } }, { key: 'nullOrUndefined',

      /**
                                      * @param {*} variable
                                      * @returns {boolean}
                                      */value: function nullOrUndefined(
      variable) {return variable === undefined || variable === null;}

      /**
                                                                       * @param {*} variable
                                                                       * @returns {boolean}
                                                                       */ }, { key: 'undefined', value: function (_undefined) {function undefined(_x) {return _undefined.apply(this, arguments);}undefined.toString = function () {return _undefined.toString();};return undefined;}(function (
      variable) {return variable === undefined;}) }, { key: 'empty', value: function empty(

      variable) {var suppressError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
         if (this.nullOrUndefined(variable) || !this.aPopulatedString(variable)) {
            return true;
         } else
         {
            if (!suppressError) {
               console.error(variable, 'is not empty');
            }
         }
      } }]);return Is;}();exports.default = Is;
//# sourceMappingURL=is.js.map