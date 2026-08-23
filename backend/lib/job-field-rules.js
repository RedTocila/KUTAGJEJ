/** Server-side validation for job listings (mirrors frontend job-constants.ts). */

const { validateJobSections } = require('./job-listing-sections');
const { isUuid } = require('./public-listings/query-helpers');

const INDUSTRY_VALUES = [
  'biznes-menaxhim', 'horeka', 'instalime-mirembajtje', 'ligjore',
  'prokurim-logjistike', 'shitje-zhvillim', 'finance', 'ndertim-industri',
  'burime-njerezore', 'administrim', 'teknologji-informacioni',
  'marketing-produkte', 'art-televizion', 'sherbim-klienti',
  'mjekesore-shendetesore', 'profesioniste', 'siguria-kompjuterike',
  'siguria-teknike', 'security', 'prodhim', 'finance-banke', 'retail',
  'mjedisi', 'magazine', 'teknik', 'pastrim',
];

const EDUCATION_VALUES = [
  'no-requirement', 'primary', 'secondary', 'vocational',
  'bachelor', 'master', 'phd',
];

const EXPERIENCE_VALUES = [
  'no-experience', 'less-than-1', '1-2', '2-3', '3-5', '5-10', 'more-than-10',
];

const JOB_TYPE_VALUES = [
  'full-time', 'part-time', 'remote', 'internship', 'weekend', 'seasonal', 'freelance',
];

const WORK_LOCATION_VALUES = ['onsite', 'hybrid', 'remote'];

const CURRENCY_VALUES = ['EUR', 'LEK'];

/**
 * Returns { ok: true } or { ok: false, message }.
 */
function validateJobPayload(body) {
  const title = String(body?.title || '').trim();
  if (!title) return { ok: false, message: 'Titulli i punës është i detyrueshëm.' };
  if (title.length > 120) return { ok: false, message: 'Titulli është shumë i gjatë.' };

  body.description = String(body?.description || '').trim();

  const industry = String(body?.industry || '').trim();
  if (industry && industry.length > 80) {
    return { ok: false, message: 'Industria e zgjedhur nuk është e vlefshme.' };
  }
  body.industry = industry || null;

  const cityId = String(body?.cityId || '').trim();
  if (cityId && !isUuid(cityId)) {
    return { ok: false, message: 'Ju lutem zgjidhni një qytet të vlefshëm.' };
  }
  body.cityId = cityId || null;

  const education = String(body?.education || '').trim();
  if (education && !EDUCATION_VALUES.includes(education)) {
    return { ok: false, message: 'Niveli i edukimit nuk është i vlefshëm.' };
  }
  body.education = education || null;

  const experience = String(body?.experience || '').trim();
  if (experience && !EXPERIENCE_VALUES.includes(experience)) {
    return { ok: false, message: 'Eksperienca e zgjedhur nuk është e vlefshme.' };
  }
  body.experience = experience || null;

  const jobType = String(body?.jobType || '').trim();
  if (jobType && !JOB_TYPE_VALUES.includes(jobType)) {
    return { ok: false, message: 'Lloji i punës nuk është i vlefshëm.' };
  }
  body.jobType = jobType || null;

  const workLocation = String(body?.workLocation || '').trim();
  if (workLocation && !WORK_LOCATION_VALUES.includes(workLocation)) {
    return { ok: false, message: 'Vendi i punës nuk është i vlefshëm.' };
  }
  body.workLocation = workLocation || null;

  // Salary is optional — but if provided, currency must also be present.
  if (body?.salary !== null && body?.salary !== undefined && body?.salary !== '') {
    const s = Number(body.salary);
    if (!Number.isFinite(s) || s < 0) {
      return { ok: false, message: 'Paga duhet të jetë një numër pozitiv.' };
    }
    if (!CURRENCY_VALUES.includes(body?.currency)) {
      return { ok: false, message: 'Ju lutem zgjidhni monedhën për pagën.' };
    }
  }

  const phone = String(body?.contactPhone || '').trim();
  if (phone.length < 6) return { ok: false, message: 'Numri i telefonit duhet të ketë të paktën 6 karaktere.' };
  if (phone.length > 40) return { ok: false, message: 'Numri i telefonit është shumë i gjatë.' };
  if (!/^[\d+\s().-]{6,40}$/.test(phone)) {
    return { ok: false, message: 'Numri i telefonit përmban karaktere të pavlefshme.' };
  }

  const sections = validateJobSections(body);
  if (!sections.ok) return sections;

  return {
    ok: true,
    responsibilities: sections.responsibilities,
    requirements: sections.requirements,
    benefits: sections.benefits,
  };
}

module.exports = {
  INDUSTRY_VALUES,
  EDUCATION_VALUES,
  EXPERIENCE_VALUES,
  JOB_TYPE_VALUES,
  WORK_LOCATION_VALUES,
  validateJobPayload,
};
