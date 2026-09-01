import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Bank as BankIcon } from '@phosphor-icons/react/dist/ssr/Bank';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Broom as BroomIcon } from '@phosphor-icons/react/dist/ssr/Broom';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Calculator as CalculatorIcon } from '@phosphor-icons/react/dist/ssr/Calculator';
import { Code as CodeIcon } from '@phosphor-icons/react/dist/ssr/Code';
import { ForkKnife as ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { Gavel as GavelIcon } from '@phosphor-icons/react/dist/ssr/Gavel';
import { Hammer as HammerIcon } from '@phosphor-icons/react/dist/ssr/Hammer';
import { Headphones as HeadphonesIcon } from '@phosphor-icons/react/dist/ssr/Headphones';
import { Hospital as HospitalIcon } from '@phosphor-icons/react/dist/ssr/Hospital';
import { Leaf as LeafIcon } from '@phosphor-icons/react/dist/ssr/Leaf';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { Money as MoneyIcon } from '@phosphor-icons/react/dist/ssr/Money';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { Palette as PaletteIcon } from '@phosphor-icons/react/dist/ssr/Palette';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Toolbox as ToolboxIcon } from '@phosphor-icons/react/dist/ssr/Toolbox';
import { Truck as TruckIcon } from '@phosphor-icons/react/dist/ssr/Truck';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { UsersThree as UsersThreeIcon } from '@phosphor-icons/react/dist/ssr/UsersThree';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';

import type { JobIndustryValue } from '@/lib/job-constants';
import { matchJobCoverRoleFromTitle, type JobCoverRole } from '@/lib/job-cover-role';

const JOB_INDUSTRY_ICON_MAP: Record<JobIndustryValue, PhosphorIcon> = {
  'biznes-menaxhim': BriefcaseIcon,
  horeka: ForkKnifeIcon,
  'instalime-mirembajtje': WrenchIcon,
  ligjore: GavelIcon,
  'prokurim-logjistike': TruckIcon,
  'shitje-zhvillim': MegaphoneIcon,
  finance: MoneyIcon,
  'ndertim-industri': HammerIcon,
  'burime-njerezore': UsersThreeIcon,
  administrim: CalculatorIcon,
  'teknologji-informacioni': CodeIcon,
  'marketing-produkte': MegaphoneIcon,
  'art-televizion': PaletteIcon,
  'sherbim-klienti': HeadphonesIcon,
  'mjekesore-shendetesore': HospitalIcon,
  profesioniste: UserCircleIcon,
  'siguria-kompjuterike': ShieldCheckIcon,
  'siguria-teknike': ShieldCheckIcon,
  security: ShieldCheckIcon,
  prodhim: PackageIcon,
  'finance-banke': BankIcon,
  retail: StorefrontIcon,
  mjedisi: LeafIcon,
  magazine: ShoppingBagIcon,
  teknik: ToolboxIcon,
  pastrim: BroomIcon,
};

/** Title-derived role → Phosphor icon (subset of icons already used for industries). */
const JOB_COVER_ROLE_ICON_MAP: Record<JobCoverRole, PhosphorIcon> = {
  waiter: ForkKnifeIcon,
  chef: ForkKnifeIcon,
  driver: TruckIcon,
  nurse: HospitalIcon,
  doctor: HospitalIcon,
  electrician: WrenchIcon,
  plumber: ToolboxIcon,
  construction: HammerIcon,
  developer: CodeIcon,
  cleaner: BroomIcon,
  security: ShieldCheckIcon,
  manager: BriefcaseIcon,
  sales: StorefrontIcon,
  teacher: UserCircleIcon,
  accountant: CalculatorIcon,
  logistics: PackageIcon,
  legal: GavelIcon,
  designer: PaletteIcon,
  'customer-service': HeadphonesIcon,
  hospitality: ForkKnifeIcon,
  worker: BriefcaseIcon,
};

export function jobIndustryIcon(industry?: string | null): PhosphorIcon {
  const key = String(industry ?? '').trim() as JobIndustryValue;
  return JOB_INDUSTRY_ICON_MAP[key] ?? BriefcaseIcon;
}

/** Title keywords first; industry icon is the fallback. */
export function resolveJobCoverIcon(title?: string | null, industry?: string | null): PhosphorIcon {
  const roleFromTitle = matchJobCoverRoleFromTitle(title);
  if (roleFromTitle) {
    return JOB_COVER_ROLE_ICON_MAP[roleFromTitle];
  }
  return jobIndustryIcon(industry);
}
