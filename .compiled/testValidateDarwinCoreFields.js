'use strict';var _validateDarwinCoreFields = require('../src/svelte/validateDarwinCoreFields');var _validateDarwinCoreFields2 = _interopRequireDefault(_validateDarwinCoreFields);
var _parseDWCReference = require('../src/svelte/parseDWCReference');var _parseDWCReference2 = _interopRequireDefault(_parseDWCReference);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

(0, _parseDWCReference2.default)().then(function (dwcterms) {
  try {
    var results = (0, _validateDarwinCoreFields2.default)(testTerms, dwcterms);
    var i = 0;
  }
  catch (err) {
    console.log('error validating dwc terms:', err.message);
  }

}).catch(function (err) {return console.log('error getting dwc terms:', err.message);});

var testTerms = [
'CcatalogNumber',
'catalognumber',
'CcatalogNumber',
'catalognumber2',
'dwc:catalogNumber',
'otherCatalogNumbers',
'someField',
'dwc:sexx',
'typ',
'dc:references'];
//# sourceMappingURL=testValidateDarwinCoreFields.js.map