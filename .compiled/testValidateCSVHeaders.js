'use strict';var _templateObject = _taggedTemplateLiteral(['Digital_Accession_Book_McGregor_Museum_Herpetofauna_Manual_Clean - Herpetological_Accessions_Datab.csv'], ['Digital_Accession_Book_McGregor_Museum_Herpetofauna_Manual_Clean - Herpetological_Accessions_Datab.csv']),_templateObject2 = _taggedTemplateLiteral(['C:UsersengelbrechtiGoogle DriveSANBI NSCFNSCF Data WGCurrent projectsGeoreferencing toolGeoreferencing toolTest datasets'], ['C:\\Users\\engelbrechti\\Google Drive\\SANBI NSCF\\NSCF Data WG\\Current projects\\Georeferencing tool\\Georeferencing tool\\Test datasets']);var _validateCSVHeaders = require('../src/svelte/validateCSVHeaders');var _validateCSVHeaders2 = _interopRequireDefault(_validateCSVHeaders);
var _fsExtra = require('fs-extra');var _fsExtra2 = _interopRequireDefault(_fsExtra);
var _path = require('path');var _path2 = _interopRequireDefault(_path);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _taggedTemplateLiteral(strings, raw) {return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } }));}

var testFileName = String.raw(_templateObject);
var testFilePath = String.raw(_templateObject2);
var fullPath = _path2.default.join(testFilePath, testFileName);

_fsExtra2.default.readFile(fullPath, 'utf8').then(function (fileString) {
  (0, _validateCSVHeaders2.default)(fileString).then(function (_) {return console.log('all done');}).catch(function (err) {return console.log(err);});
}).catch(function (err) {return console.log(err);});
//# sourceMappingURL=testValidateCSVHeaders.js.map