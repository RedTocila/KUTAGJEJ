import type { JobIndustryValue } from '@/lib/job-constants';

/** Silhouette role shown on the job listing mockup cover. */
export type JobCoverRole =
  | 'waiter'
  | 'chef'
  | 'driver'
  | 'nurse'
  | 'doctor'
  | 'electrician'
  | 'plumber'
  | 'construction'
  | 'developer'
  | 'cleaner'
  | 'security'
  | 'manager'
  | 'sales'
  | 'teacher'
  | 'accountant'
  | 'logistics'
  | 'legal'
  | 'designer'
  | 'customer-service'
  | 'hospitality'
  | 'worker';

type RoleRule = { role: JobCoverRole; patterns: RegExp[] };

/** Title keywords first — Albanian + common English job titles. */
const ROLE_RULES: RoleRule[] = [
  {
    role: 'waiter',
    patterns: [
      /\bkamarier/,
      /\bbanakier/,
      /\bwaiter/,
      /\bwaitress/,
      /\bbartender/,
      /\bbarista/,
      /\bhostess/,
      /\bhost\b/,
      /\bservi[rt]or/,
      /\bkelner/,
      /\bgarson/,
      /\bsalle\b/,
      /\brestorant\b.*\b(pun|staf)/,
    ],
  },
  {
    role: 'chef',
    patterns: [
      /\bkuzhinier/,
      /\bchef/,
      /\bcook\b/,
      /\bsofr/,
      /\bpasticier/,
      /\bbaker/,
      /\bbukep/,
      /\bsous\s*chef/,
      /\bkuzhin/,
      /\bgrill/,
    ],
  },
  {
    role: 'driver',
    patterns: [
      /\bshofer/,
      /\bdriver/,
      /\bchauffeur/,
      /\bkamion/,
      /\btruck\s*driver/,
      /\bcourier/,
      /\bkurier/,
      /\bautist/,
      /\bdelivery\b/,
      /\btransportues/,
    ],
  },
  {
    role: 'nurse',
    patterns: [/\binfermier/, /\bnurse/, /\bndihm[eë]s\s*mjek/, /\bcaregiver/, /\bmedic\b/, /\bambulanc/],
  },
  {
    role: 'doctor',
    patterns: [
      /\bmjek\b/,
      /\bmjeke\b/,
      /\bdoctor/,
      /\bdentist/,
      /\bstomatolog/,
      /\bkirurg/,
      /\bphysician/,
      /\bfarmaceut/,
      /\bpharmacist/,
      /\bpediatr/,
      /\bgjinekolog/,
      /\bkardiolog/,
    ],
  },
  {
    role: 'electrician',
    patterns: [/\belektricist/, /\belectrician/, /\belektrik\b/, /\binstalues\s*elektrik/, /\belektro\b/],
  },
  {
    role: 'plumber',
    patterns: [/\bhidraulik/, /\bplumber/, /\bplumbing/, /\binstalues\s*uj/, /\bujesjel/],
  },
  {
    role: 'construction',
    patterns: [
      /\bndertim/,
      /\bndertues/,
      /\bmurator/,
      /\bconstruction/,
      /\bbuilder/,
      /\bteknik\s*ndertimi/,
      /\bmirembajtje\s*ndertes/,
      /\bfacade/,
      /\bskelet/,
      /\bbrigad/,
      /\bmontues/,
      /\bsaldator/,
      /\bgips/,
      /\bpllakash/,
      /\bboier/,
      /\bvarrues/,
      /\barkitekt/,
    ],
  },
  {
    role: 'developer',
    patterns: [
      /\bprogramues/,
      /\bdeveloper/,
      /\bsoftware/,
      /\bfrontend/,
      /\bbackend/,
      /\bfullstack/,
      /\bdata\s*scientist/,
      /\bdevops/,
      /\bit\s*support/,
      /\bsisteme/,
      /\bcyber/,
      /\bweb\s*dev/,
      /\bqa\b/,
      /\btester/,
      /\bnetwork/,
      /\brjet/,
    ],
  },
  {
    role: 'cleaner',
    patterns: [/\bpastrues/, /\bcleaner/, /\bhousekeep/, /\bpastrim/, /\bsanitiz/, /\broom\s*attendant/],
  },
  {
    role: 'security',
    patterns: [/\broje/, /\broja/, /\bsecurity/, /\bguard/, /\bsigurim/, /\bvigjil/, /\brojtar/],
  },
  {
    role: 'manager',
    patterns: [
      /\bmenaxher/,
      /\bmanager/,
      /\bdirector/,
      /\bsupervisor/,
      /\bteam\s*lead/,
      /\bkoordinator/,
      /\bhead\s*of/,
      /\bdrejt/,
      /\bchief\b/,
    ],
  },
  {
    role: 'sales',
    patterns: [
      /\bshit[eë]s/,
      /\bsales/,
      /\bretail/,
      /\bkasier/,
      /\bcashier/,
      /\bshop\s*assistant/,
      /\bdyqan/,
      /\bmerchandis/,
      /\brepr[eë]zentues\s*shitj/,
    ],
  },
  {
    role: 'teacher',
    patterns: [
      /\bmesues/,
      /\bteacher/,
      /\bprofesor/,
      /\binstruktor/,
      /\btrainer/,
      /\btrajner/,
      /\bedukator/,
      /\bpedagog/,
      /\bm[eë]suesh/,
      /\bdocent/,
    ],
  },
  {
    role: 'accountant',
    patterns: [
      /\bkontabilist/,
      /\baccountant/,
      /\bfinance/,
      /\bfinanc/,
      /\bauditor/,
      /\bbookkeep/,
      /\barketar/,
    ],
  },
  {
    role: 'logistics',
    patterns: [
      /\blogjistik/,
      /\blogistics/,
      /\bwarehouse/,
      /\bmagazin/,
      /\bdepo\b/,
      /\bdistributor/,
      /\bforklift/,
      /\bmagazinier/,
      /\bngarkues/,
      /\bshpedic/,
    ],
  },
  {
    role: 'legal',
    patterns: [/\bavokat/, /\blawyer/, /\bligjor/, /\bjurid/, /\blegal/, /\bnoter/, /\bparalegal/],
  },
  {
    role: 'designer',
    patterns: [
      /\bdesigner/,
      /\bdizajn/,
      /\bgrafik/,
      /\bartist/,
      /\bphotographer/,
      /\bfotograf/,
      /\bvideo/,
      /\bux\b/,
      /\bui\b/,
      /\bmultimedia/,
    ],
  },
  {
    role: 'customer-service',
    patterns: [
      /\bcall\s*center/,
      /\bcustomer\s*service/,
      /\bsherbim\s*klient/,
      /\boperator/,
      /\brecepsion/,
      /\bsekretar/,
      /\badministrativ/,
      /\bhelpdesk/,
    ],
  },
];

const INDUSTRY_ROLE_MAP: Partial<Record<JobIndustryValue, JobCoverRole>> = {
  horeka: 'hospitality',
  'ndertim-industri': 'construction',
  'instalime-mirembajtje': 'electrician',
  'teknologji-informacioni': 'developer',
  'mjekesore-shendetesore': 'nurse',
  ligjore: 'legal',
  'prokurim-logjistike': 'logistics',
  magazine: 'logistics',
  prodhim: 'construction',
  teknik: 'construction',
  pastrim: 'cleaner',
  security: 'security',
  'siguria-kompjuterike': 'security',
  'siguria-teknike': 'security',
  'burime-njerezore': 'manager',
  'biznes-menaxhim': 'manager',
  administrim: 'accountant',
  finance: 'accountant',
  'finance-banke': 'accountant',
  'shitje-zhvillim': 'sales',
  retail: 'sales',
  'marketing-produkte': 'designer',
  'art-televizion': 'designer',
  'sherbim-klienti': 'customer-service',
  profesioniste: 'worker',
  mjedisi: 'worker',
};

export function normalizeJobTitleForRoleMatch(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s/|+,.\-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchRoleFromNormalizedText(text: string): JobCoverRole | null {
  if (!text) return null;
  const segments = text.split(/\s*[\/|+,]\s*/).filter(Boolean);
  const candidates = segments.length > 1 ? segments : [text];
  for (const segment of candidates) {
    for (const rule of ROLE_RULES) {
      if (rule.patterns.some((pattern) => pattern.test(segment))) {
        return rule.role;
      }
    }
  }
  for (const rule of ROLE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.role;
    }
  }
  return null;
}

export function matchJobCoverRoleFromTitle(title?: string | null): JobCoverRole | null {
  const normalized = normalizeJobTitleForRoleMatch(String(title ?? '').trim());
  return matchRoleFromNormalizedText(normalized);
}

export function matchJobCoverRoleFromIndustry(industry?: string | null): JobCoverRole | null {
  const key = String(industry ?? '').trim() as JobIndustryValue;
  return INDUSTRY_ROLE_MAP[key] ?? null;
}

/** Title keywords win; industry is the fallback; generic worker last. */
export function resolveJobCoverRole(title?: string | null, industry?: string | null): JobCoverRole {
  return (
    matchJobCoverRoleFromTitle(title) ??
    matchJobCoverRoleFromIndustry(industry) ??
    'worker'
  );
}
