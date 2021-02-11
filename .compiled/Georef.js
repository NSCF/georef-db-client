'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}();var _createClass = function () {function defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}return function (Constructor, protoProps, staticProps) {if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;};}();function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}var Georef = function () {
  function Georef() {_classCallCheck(this, Georef);
    this.georefID = null;
    this.country = null;
    this.stateProvince = null;
    this.locality = null;
    this.verbatimCoordinates = null;
    this.decimalLatitude = null;
    this.decimalLongitude = null;
    this.uncertainty = null;
    this.uncertaintyUnit = null;
    this.datum = null;
    this.by = null;
    this.date = null;
    this.sources = null;
    this.originalGeorefSource = null;
    this.protocol = null;
    this.remarks = null;
    this.verified = false;
    this.verifiedBy = null;
    this.verifiedDate = null;
    this.verifiedByRole = null;
    this.dateCreated = Date.now();
    this.createdBy = null;
    this.lastEdited = null;
    this.lastEditedBy = null;
    this.lastEditRemarks = null;

    Object.defineProperties(this, {
      protocolObject: {
        enumerable: false,
        get: function get() {
          if (this.protocol && this.protocol.trim()) {
            var r = { value: this.protocol, label: this.protocol };
            return r;
          } else
          {
            return undefined;
          }
        },
        set: function set(obj) {
          if (obj) {
            this.protocol = obj.value;
          } else
          {
            this.protocol = null;
          }
        } },

      sourcesArray: {
        enumerable: false,
        get: function get() {
          if (this.sources && this.sources.trim()) {
            var sourceItems = this.sources.split('|').filter(function (x) {return x;}).map(function (x) {return x.trim();}).filter(function (x) {return x;});
            if (sourceItems.length) {
              var selectedSources = [];var _iteratorNormalCompletion = true;var _didIteratorError = false;var _iteratorError = undefined;try {
                for (var _iterator = sourceItems[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {var item = _step.value;
                  selectedSources.push({ value: item, label: item });
                }} catch (err) {_didIteratorError = true;_iteratorError = err;} finally {try {if (!_iteratorNormalCompletion && _iterator.return) {_iterator.return();}} finally {if (_didIteratorError) {throw _iteratorError;}}}
              return selectedSources;
            } else
            {
              return null;
            }
          } else
          {
            return null;
          }
        },
        set: function set(selectedSources) {//for taking an array of {value, label} objects used for a <select>, throws if any problems
          if (Array.isArray(selectedSources)) {
            this.sources = selectedSources.map(function (x) {return x.value;}).join(' | ');
          } else
          {
            this.sources = null;
          }
        } },

      dateOkay: {
        value: true,
        writable: true,
        enumerable: false },

      verifiedDateOkay: {
        value: true,
        writable: true,
        enumerable: false },

      uncertaintyUnitOkay: {
        value: true,
        writable: true,
        enumerable: false } });


  }

  //deep copy
  _createClass(Georef, [{ key: 'copy', value: function copy() {
      var copy = new Georef();var _iteratorNormalCompletion2 = true;var _didIteratorError2 = false;var _iteratorError2 = undefined;try {
        for (var _iterator2 = Object.entries(this)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {var _step2$value = _slicedToArray(_step2.value, 2),key = _step2$value[0],val = _step2$value[1];

          if (key == 'protocolObject') {
            copy[key] = Object.assign({}, val);
            continue;
          }

          if (key == 'sourcesArray') {
            copy[key] = val.map(function (x) {return Object.assign({}, x);}); //sourcesArray is an array of objects
            continue;
          }

          copy[key] = val;
        }} catch (err) {_didIteratorError2 = true;_iteratorError2 = err;} finally {try {if (!_iteratorNormalCompletion2 && _iterator2.return) {_iterator2.return();}} finally {if (_didIteratorError2) {throw _iteratorError2;}}}
      return copy;
    }

    //empty everything
  }, { key: 'clear', value: function clear() {var _iteratorNormalCompletion3 = true;var _didIteratorError3 = false;var _iteratorError3 = undefined;try {
        for (var _iterator3 = Object.keys(this)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {var key = _step3.value;
          this[key] = null;
        }} catch (err) {_didIteratorError3 = true;_iteratorError3 = err;} finally {try {if (!_iteratorNormalCompletion3 && _iterator3.return) {_iterator3.return();}} finally {if (_didIteratorError3) {throw _iteratorError3;}}}
      this.protocolObject = null;
      this.sourcesArray = undefined;
      this.dateCreated = Date.now();
    } }, { key: 'decimalCoordinates', get: function get()

    {
      if (this.decimalLatitude && this.decimalLongitude) {
        return this.decimalLatitude + ',' + this.decimalLongitude;
      } else
      {
        return null;
      }
    }

    //assumed already validated
    , set: function set(coordsString) {
      if (coordsString && coordsString.trim()) {
        var parts = coordsString.split(',');
        this.decimalLatitude = Number(parts[0]);
        this.decimalLongitude = Number(parts[1]);
      }

    }

    //this is validation
  }, { key: 'decimalCoordinatesOkay', get: function get() {
      if (this.decimalLatitude && this.decimalLongitude) {
        if (isNaN(this.decimalLatitude) || isNaN(this.decimalLongitude)) {
          return false;
        }

        if (this.decimalLatitude > 90 || this.decimalLongitude < -90) {
          return false;
        }

        if (this.decimalLongitude > 180 || this.decimalLongitude < -180) {
          return false;
        }

        //Check they are actually decimals
        var re = /^-?\d{1,2}\.\d+,\s*-?\d{1,3}\.\d+$/;
        if (!re.test(this.decimalCoordinates)) {
          return false;
        }

        //else
        return true;
      } else
      {
        return true;
      }

    }

    //this just to show warnings for those with too few or too many decimals
  }, { key: 'decimalCoordinatesWarning', get: function get() {
      var re = /^-?\d{1,2}\.\d{4,8},\s*-?\d{1,3}\.\d{4,8}$/;
      if (!re.test(this.decimalCoordinates)) {
        return true;
      } else
      {
        return false;
      }
    } }, { key: 'dateOkay', get: function get()

    {
      if (this.date && this.date.trim()) {
        return (/^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(this.date) && new Date(this.date) < Date.now());
      } else
      {
        return true; //we dont' test for it being required here
      }

    } }, { key: 'verifiedDateOkay', get: function get()

    {
      if (this.verifiedDate && this.verifiedDate.trim()) {
        return (/^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(this.verifiedDate) && new Date(this.verifiedDate) < Date.now());
      } else
      {
        return true; //we dont' test if its required here
      }
    } }, { key: 'uncertaintyUnitOkay', get: function get()

    {
      if (this.uncertainty) {
        if (!this.uncertaintyUnit || !this.uncertaintyUnit.trim() || !['m', 'km'].contains(this.uncertaintyUnit.trim())) {
          return false;
        }
      }
      //else
      return true;
    } }]);return Georef;}();exports.default = Georef;
//# sourceMappingURL=Georef.js.map