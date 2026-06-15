const mongoose = require('mongoose');
const RealEstateCity = require('../../models/RealEstateCity');

async function buildCityIndexFromDocs(docs) {
  const cityIds = [...new Set(docs.map((d) => String(d.cityId)).filter(Boolean))];
  const cityObjectIds = cityIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const cities =
    cityObjectIds.length > 0 ? await RealEstateCity.find({ _id: { $in: cityObjectIds } }).lean() : [];
  return new Map(cities.map((c) => [String(c._id), c]));
}

module.exports = { buildCityIndexFromDocs };
