'use strict';Object.defineProperty(exports, "__esModule", { value: true });
var isEmpty = function isEmpty(val) {
  if (typeof val == 'string') {
    return !Boolean(val.trim());
  } else
  {
    return val === null || val === undefined;
  }
};

var georefsEqual = function georefsEqual(georef1, georef2) {

  delete georef1.selected;
  delete georef2.selected;

  //convert to plain objects
  var obj1 = JSON.parse(JSON.stringify(georef1));
  var obj2 = JSON.parse(JSON.stringify(georef2));

  var keys = new Set();var _iteratorNormalCompletion = true;var _didIteratorError = false;var _iteratorError = undefined;try {
    for (var _iterator = Object.keys(obj1)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {var key = _step.value;
      keys.add(key);
    }} catch (err) {_didIteratorError = true;_iteratorError = err;} finally {try {if (!_iteratorNormalCompletion && _iterator.return) {_iterator.return();}} finally {if (_didIteratorError) {throw _iteratorError;}}}var _iteratorNormalCompletion2 = true;var _didIteratorError2 = false;var _iteratorError2 = undefined;try {
    for (var _iterator2 = Object.keys(obj2)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {var _key = _step2.value;
      keys.add(_key);
    }} catch (err) {_didIteratorError2 = true;_iteratorError2 = err;} finally {try {if (!_iteratorNormalCompletion2 && _iterator2.return) {_iterator2.return();}} finally {if (_didIteratorError2) {throw _iteratorError2;}}}var _iteratorNormalCompletion3 = true;var _didIteratorError3 = false;var _iteratorError3 = undefined;try {

    for (var _iterator3 = Array.from(keys)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {var _key2 = _step3.value;
      if (obj1.hasOwnProperty(_key2)) {
        if (obj2.hasOwnProperty(_key2)) {
          //if empty on one it must be empty on the other
          if (isEmpty(obj1[_key2]) && !isEmpty(obj2[_key2])) {
            return false;
          }

          if (!isEmpty(obj1[_key2]) && isEmpty(obj2[_key2])) {
            return false;
          }

          //they both have a value
          if (obj1[_key2] != obj2[_key2]) {
            return false;
          }

        } else
        {
          //they key is on 1 but not 2 so it must be empty
          if (!isEmpty(obj1[_key2], true)) {
            return false;
          }
        }
      } else
      {//it must have been on 2 so it must be null or empty there
        if (!isEmpty(obj2[_key2], true)) {
          return false;
        }
      }
    }

    //we got through it all, they must be equal
  } catch (err) {_didIteratorError3 = true;_iteratorError3 = err;} finally {try {if (!_iteratorNormalCompletion3 && _iterator3.return) {_iterator3.return();}} finally {if (_didIteratorError3) {throw _iteratorError3;}}}return true;

};exports.

georefsEqual = georefsEqual;
//# sourceMappingURL=georefFormFuncs.js.map