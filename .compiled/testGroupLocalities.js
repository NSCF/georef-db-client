'use strict';var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {return typeof obj;} : function (obj) {return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;};var _groupLocalities = require('../src/CSVUtilities/groupLocalities.js');var _groupLocalities2 = _interopRequireDefault(_groupLocalities);
var _testGoupLocalitiesData = require('./testGoupLocalitiesData.json');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
require('isomorphic-fetch');

console.log('groupLocalities is', typeof _groupLocalities2.default === 'undefined' ? 'undefined' : _typeof(_groupLocalities2.default));
console.log('localityRecordIDMap is', typeof _testGoupLocalitiesData.localityRecordIDMap === 'undefined' ? 'undefined' : _typeof(_testGoupLocalitiesData.localityRecordIDMap));

var ID = 'asdfasdf';

(0, _groupLocalities2.default)(_testGoupLocalitiesData.localityRecordIDMap, ID).then(function (groups) {
  var i = 0;
}).
catch(function (err) {return console.log(err.message);});
//# sourceMappingURL=testGroupLocalities.js.map