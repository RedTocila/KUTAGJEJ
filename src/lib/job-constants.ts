/** Constants for the job listing form. */

export const JOB_INDUSTRY_OPTIONS = [
  { value: 'biznes-menaxhim', label: 'Biznes dhe Menaxhim Strategjik' },
  { value: 'horeka', label: 'HOREKA - Hoteleri, Restorant, Kafe' },
  { value: 'instalime-mirembajtje', label: 'Instalime dhe mirëmbajtje' },
  { value: 'ligjore', label: 'Ligjore' },
  { value: 'prokurim-logjistike', label: 'Prokurim dhe logjistikë' },
  { value: 'shitje-zhvillim', label: 'Shitje dhe Zhvillim Biznesi' },
  { value: 'finance', label: 'Financë' },
  { value: 'ndertim-industri', label: 'Ndërtim dhe Industri e rëndë' },
  { value: 'burime-njerezore', label: 'Burime Njerëzore' },
  { value: 'administrim', label: 'Administrim' },
  { value: 'teknologji-informacioni', label: 'Teknologji Informacioni' },
  { value: 'marketing-produkte', label: 'Marketing dhe Produkte' },
  { value: 'art-televizion', label: 'Art dhe Televizion' },
  { value: 'sherbim-klienti', label: 'Shërbim Klienti' },
  { value: 'mjekesore-shendetesore', label: 'Mjekësore dhe Shëndetësore' },
  { value: 'profesioniste', label: 'Profesionistë' },
  { value: 'siguria-kompjuterike', label: 'Siguria Kompjuterike, Çelësist, Ushqimore dhe Fizike' },
  { value: 'siguria-teknike', label: 'Siguria Teknike dhe në Punë' },
  { value: 'security', label: 'Security' },
  { value: 'prodhim', label: 'Prodhim' },
  { value: 'finance-banke', label: 'Financë / Bankë' },
  { value: 'retail', label: 'Retail' },
  { value: 'mjedisi', label: 'Mjedisi' },
  { value: 'magazine', label: 'Magazine' },
  { value: 'teknik', label: 'Teknik' },
  { value: 'pastrim', label: 'Pastrim' },
] as const;

export type JobIndustryValue = (typeof JOB_INDUSTRY_OPTIONS)[number]['value'];

export const JOB_EDUCATION_OPTIONS = [
  { value: 'no-requirement', label: 'Pa kërkesë' },
  { value: 'primary', label: 'Arsim fillor' },
  { value: 'secondary', label: 'Arsim i mesëm' },
  { value: 'vocational', label: 'Kurs / Trajnim profesional' },
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'master', label: 'Master' },
  { value: 'phd', label: 'Doktoraturë' },
] as const;

export const JOB_EXPERIENCE_OPTIONS = [
  { value: 'no-experience', label: 'Pa eksperiencë' },
  { value: 'less-than-1', label: 'Deri në 1 vit' },
  { value: '1-2', label: '1 – 2 vjet' },
  { value: '2-3', label: '2 – 3 vjet' },
  { value: '3-5', label: '3 – 5 vjet' },
  { value: '5-10', label: '5 – 10 vjet' },
  { value: 'more-than-10', label: 'Mbi 10 vjet' },
] as const;

export const JOB_TYPE_OPTIONS = [
  { value: 'full-time', label: 'Full time' },
  { value: 'part-time', label: 'Part time' },
  { value: 'remote', label: 'Remote' },
  { value: 'internship', label: 'Internship' },
  { value: 'weekend', label: 'Fundjave' },
  { value: 'seasonal', label: 'Sezonale' },
  { value: 'freelance', label: 'Freelance' },
] as const;

export const WORK_LOCATION_OPTIONS = [
  { value: 'onsite', label: 'Onsite (Në zyrë)' },
  { value: 'hybrid', label: 'Hybrid (Hibrid)' },
  { value: 'remote', label: 'Remote (Nga shtëpia)' },
] as const;
