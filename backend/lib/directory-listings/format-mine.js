const { premiumFieldsFromDoc } = require('../premium-listing');

function listingId(doc) {
  return doc.id != null ? String(doc.id) : doc._id != null ? String(doc._id) : null;
}

function formatMineBusiness(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    vertical: doc.vertical,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrls: doc.imageUrls ?? [],
    openingHours: doc.openingHours ?? null,
    weeklyHours: Array.isArray(doc.weeklyHours) ? doc.weeklyHours : doc.weeklyHours ?? [],
    menuCategories: doc.menuCategories ?? [],
    menuItems: doc.menuItems ?? [],
    reservationsEnabled: Boolean(doc.reservationsEnabled),
    reservationUrl: doc.reservationUrl ?? null,
    reservationTimeSlots: doc.reservationTimeSlots ?? [],
    reservationPartySizes: doc.reservationPartySizes ?? [],
    servicesHighlight: doc.servicesHighlight ?? null,
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
  };
}

function formatMineProfessional(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    vertical: doc.vertical,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    currency: doc.currency ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrls: doc.imageUrls ?? [],
    responseTimeHours: doc.responseTimeHours ?? null,
    portfolioItems: doc.portfolioItems ?? [],
    servicesHighlight: doc.servicesHighlight ?? null,
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
  };
}

module.exports = { formatMineBusiness, formatMineProfessional };
