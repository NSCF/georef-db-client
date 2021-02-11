'use strict';var _templateObject = _taggedTemplateLiteral(['McGregorHerps_accessioned_wb_import_final - Copy for testing.csv'], ['McGregorHerps_accessioned_wb_import_final - Copy for testing.csv']),_templateObject2 = _taggedTemplateLiteral(['C:UsersengelbrechtiGoogle DriveSANBI NSCFNSCF Data WGCurrent projectsHerp specimen digitizationHerpSpecimenDataMcGregor Herp Specimen Data'], ['C:\\Users\\engelbrechti\\Google Drive\\SANBI NSCF\\NSCF Data WG\\Current projects\\Herp specimen digitization\\HerpSpecimenData\\McGregor Herp Specimen Data']);



var _validateCSVContent = require('../src/CSVUtilities/validateCSVContent.js');var _validateCSVContent2 = _interopRequireDefault(_validateCSVContent);
var _groupLocalities = require('../src/CSVUtilities/groupLocalities.js');var _groupLocalities2 = _interopRequireDefault(_groupLocalities);
var _validateCountries = require('../src/dwcUtilities/validateCountries.js');var _validateCountries2 = _interopRequireDefault(_validateCountries);
var _fsExtra = require('fs-extra');var _fsExtra2 = _interopRequireDefault(_fsExtra);
var _path = require('path');var _path2 = _interopRequireDefault(_path);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _taggedTemplateLiteral(strings, raw) {return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } }));} //this tests groupLocalities now too
require('isomorphic-fetch');
var testFileName = String.raw(_templateObject);
var testFilePath = String.raw(_templateObject2);
var fullPath = _path2.default.join(testFilePath, testFileName);

var requiredFields = {
    countryField: 'dwc:country',
    recordIDField: 'dwc:catalogNumber',
    localityField: 'dwc:locality',
    collectorField: 'dwc:recordedBy' };


_fsExtra2.default.readFile(fullPath, 'utf8').then(function (fileString) {
    (0, _validateCSVContent2.default)(fileString, requiredFields).then(async function (fileSummary) {

        var countries = Object.keys(fileSummary.localityRecordIDMap);
        var countryCheck = await (0, _validateCountries2.default)(countries);


        var groupResults = await (0, _groupLocalities2.default)(fileSummary.localityRecordIDMap, 'testID', countryCheck.countryCodes);

        var i = 0;

        console.log('all done');
    }).catch(function (err) {return console.log(err);});
}).catch(function (err) {return console.log(err);});
//# sourceMappingURL=testValidateCSVContent.js.map