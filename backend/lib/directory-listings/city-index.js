'use strict';

const { buildCityIndex } = require('../public-listings/query-helpers');

/** @deprecated Prefer buildCityIndex — kept for directory route call sites. */
async function buildCityIndexFromDocs(docs) {
  return buildCityIndex(docs);
}

module.exports = { buildCityIndexFromDocs };
