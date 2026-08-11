import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { BookOpen as BookOpenIcon } from '@phosphor-icons/react/dist/ssr/BookOpen';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { BuildingApartment as BuildingApartmentIcon } from '@phosphor-icons/react/dist/ssr/BuildingApartment';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Boat as BoatIcon } from '@phosphor-icons/react/dist/ssr/Boat';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CarProfile as CarProfileIcon } from '@phosphor-icons/react/dist/ssr/CarProfile';
import { CarSimple as CarSimpleIcon } from '@phosphor-icons/react/dist/ssr/CarSimple';
import { Motorcycle as MotorcycleIcon } from '@phosphor-icons/react/dist/ssr/Motorcycle';
import { Truck as TruckIcon } from '@phosphor-icons/react/dist/ssr/Truck';
import { Van as VanIcon } from '@phosphor-icons/react/dist/ssr/Van';
import { Code as CodeIcon } from '@phosphor-icons/react/dist/ssr/Code';
import { Coffee as CoffeeIcon } from '@phosphor-icons/react/dist/ssr/Coffee';
import { Couch as CouchIcon } from '@phosphor-icons/react/dist/ssr/Couch';
import { DeviceMobile as DeviceMobileIcon } from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import { ForkKnife as ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { BeerBottle as BeerBottleIcon } from '@phosphor-icons/react/dist/ssr/BeerBottle';
import { Hammer as HammerIcon } from '@phosphor-icons/react/dist/ssr/Hammer';
import { Headphones as HeadphonesIcon } from '@phosphor-icons/react/dist/ssr/Headphones';
import { Hospital as HospitalIcon } from '@phosphor-icons/react/dist/ssr/Hospital';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { Money as MoneyIcon } from '@phosphor-icons/react/dist/ssr/Money';
import { PuzzlePiece as PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { SoccerBall as SoccerBallIcon } from '@phosphor-icons/react/dist/ssr/SoccerBall';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { TShirt as TShirtIcon } from '@phosphor-icons/react/dist/ssr/TShirt';
import { Toolbox as ToolboxIcon } from '@phosphor-icons/react/dist/ssr/Toolbox';
import { Tree as TreeIcon } from '@phosphor-icons/react/dist/ssr/Tree';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { Pizza as PizzaIcon } from '@phosphor-icons/react/dist/ssr/Pizza';
import { Warehouse as WarehouseIcon } from '@phosphor-icons/react/dist/ssr/Warehouse';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';

import { localizedLabel, type AppLanguage } from '@/lib/language';
import { paths } from '@/paths';

import type { HomeVerticalId } from './home-categories';

export interface SubcategoryItem {
  /** Default (sq) label — prefer localized copy in client UI. */
  label: string;
  /** English label when language is `en`. */
  labelEn: string;
  /** Pre-bound Phosphor icon component. */
  Icon: PhosphorIcon;
  /** Where the pill links — public browse page with a query filter. */
  href: string;
}

/**
 * Curated subcategory pills shown inside each homepage section. Matches the
 * filter values understood by the public browse pages, so refining the query
 * later is just a matter of reading `searchParams` on those pages.
 */
export const HOME_SUBCATEGORIES: Record<HomeVerticalId, readonly SubcategoryItem[]> = {
  'real-estate': [
    { label: 'Apartament', labelEn: 'Apartment', Icon: BuildingApartmentIcon, href: `${paths.public.realEstate}?cat=apartment` },
    { label: 'Vilë', labelEn: 'Villa', Icon: HouseIcon, href: `${paths.public.realEstate}?cat=villa` },
    { label: 'Penthouse', labelEn: 'Penthouse', Icon: BuildingsIcon, href: `${paths.public.realEstate}?cat=penthouse-duplex` },
    { label: 'Zyrë', labelEn: 'Office', Icon: BuildingOfficeIcon, href: `${paths.public.realEstate}?cat=office` },
    { label: 'Dyqan', labelEn: 'Shop', Icon: StorefrontIcon, href: `${paths.public.realEstate}?cat=shop` },
    { label: 'Tokë', labelEn: 'Land', Icon: TreeIcon, href: `${paths.public.realEstate}?cat=building-plot` },
    { label: 'Parking', labelEn: 'Parking', Icon: CarSimpleIcon, href: `${paths.public.realEstate}?cat=parking` },
    { label: 'Magazinë', labelEn: 'Warehouse', Icon: WarehouseIcon, href: `${paths.public.realEstate}?cat=warehouse` },
  ],
  cars: [
    { label: 'Vetura', labelEn: 'Cars', Icon: CarIcon, href: `${paths.public.cars}?type=car` },
    { label: 'SUV', labelEn: 'SUV', Icon: CarProfileIcon, href: `${paths.public.cars}?type=suv` },
    { label: 'Furgon', labelEn: 'Van', Icon: VanIcon, href: `${paths.public.cars}?type=van` },
    { label: 'Kamion', labelEn: 'Truck', Icon: TruckIcon, href: `${paths.public.cars}?type=truck` },
    { label: 'Motor', labelEn: 'Motorcycle', Icon: MotorcycleIcon, href: `${paths.public.cars}?type=motorcycle` },
    { label: 'Varkë', labelEn: 'Boat', Icon: BoatIcon, href: `${paths.public.cars}?type=boat` },
  ],
  jobs: [
    { label: 'IT', labelEn: 'IT', Icon: CodeIcon, href: `${paths.public.jobs}?industry=teknologji-informacioni` },
    { label: 'Shitje', labelEn: 'Sales', Icon: MegaphoneIcon, href: `${paths.public.jobs}?industry=shitje-zhvillim` },
    { label: 'HoReCa', labelEn: 'HoReCa', Icon: ForkKnifeIcon, href: `${paths.public.jobs}?industry=horeka` },
    { label: 'Ndërtim', labelEn: 'Construction', Icon: HammerIcon, href: `${paths.public.jobs}?industry=ndertim-industri` },
    { label: 'Mjekësi', labelEn: 'Healthcare', Icon: HospitalIcon, href: `${paths.public.jobs}?industry=mjekesore-shendetesore` },
    { label: 'Marketing', labelEn: 'Marketing', Icon: MegaphoneIcon, href: `${paths.public.jobs}?industry=marketing-produkte` },
    { label: 'Financë', labelEn: 'Finance', Icon: MoneyIcon, href: `${paths.public.jobs}?industry=finance` },
    { label: 'Klient', labelEn: 'Customer service', Icon: HeadphonesIcon, href: `${paths.public.jobs}?industry=sherbim-klienti` },
    { label: 'Të tjera', labelEn: 'Other', Icon: BriefcaseIcon, href: paths.public.jobs },
  ],
  marketplace: [
    { label: 'Elektronikë', labelEn: 'Electronics', Icon: DeviceMobileIcon, href: `${paths.public.marketplace}?cat=elektronike` },
    { label: 'Mobilje', labelEn: 'Furniture', Icon: CouchIcon, href: `${paths.public.marketplace}?cat=mobilje-shtepi` },
    { label: 'Veshje', labelEn: 'Clothing', Icon: TShirtIcon, href: `${paths.public.marketplace}?cat=veshje-aksesore` },
    { label: 'Libra', labelEn: 'Books', Icon: BookOpenIcon, href: `${paths.public.marketplace}?cat=libra-shkolla` },
    { label: 'Sport', labelEn: 'Sports', Icon: SoccerBallIcon, href: `${paths.public.marketplace}?cat=sport-hobi` },
    { label: 'Lodra', labelEn: 'Toys', Icon: PuzzlePieceIcon, href: `${paths.public.marketplace}?cat=lodra` },
    { label: 'Pjesë auto', labelEn: 'Auto parts', Icon: WrenchIcon, href: `${paths.public.marketplace}?cat=automjete-pjese` },
    { label: 'Ushqim', labelEn: 'Food', Icon: ForkKnifeIcon, href: `${paths.public.marketplace}?cat=ushqime-bujqesi` },
    { label: 'Shërbime', labelEn: 'Services', Icon: ToolboxIcon, href: `${paths.public.marketplace}?cat=sherbime` },
    { label: 'Të tjera', labelEn: 'Other', Icon: ShoppingBagIcon, href: `${paths.public.marketplace}?cat=te-tjera` },
  ],
  businesses: [
    { label: 'Restorant', labelEn: 'Restaurant', Icon: ForkKnifeIcon, href: `${paths.public.businesses}?type=restorant` },
    { label: 'Bar & pub', labelEn: 'Bar & pub', Icon: BeerBottleIcon, href: `${paths.public.businesses}?type=bar` },
    { label: 'Kafene', labelEn: 'Café', Icon: CoffeeIcon, href: `${paths.public.businesses}?type=kafe` },
    { label: 'Brunch', labelEn: 'Brunch', Icon: ForkKnifeIcon, href: `${paths.public.businesses}?type=brunch` },
    { label: 'Piceri', labelEn: 'Pizzeria', Icon: PizzaIcon, href: `${paths.public.businesses}?type=piceri-fast-food` },
    { label: 'Pastiçeri', labelEn: 'Pastry shop', Icon: StorefrontIcon, href: `${paths.public.businesses}?type=pasticeri` },
  ],
  professionals: [
    { label: 'Freelance', labelEn: 'Freelance', Icon: UserCircleIcon, href: `${paths.public.professionals}?type=freelance` },
    { label: 'Konsulence', labelEn: 'Consulting', Icon: BriefcaseIcon, href: `${paths.public.professionals}?type=konsulent` },
    { label: 'Dizajn & IT', labelEn: 'Design & IT', Icon: CodeIcon, href: `${paths.public.professionals}?type=dizajn-it` },
    { label: 'Marketing', labelEn: 'Marketing', Icon: MegaphoneIcon, href: `${paths.public.professionals}?type=marketing` },
    { label: 'Mjekësi', labelEn: 'Healthcare', Icon: HospitalIcon, href: `${paths.public.professionals}?type=mjekesi` },
    { label: 'Arsim', labelEn: 'Education', Icon: BookOpenIcon, href: `${paths.public.professionals}?type=arsim` },
    { label: 'Të tjera', labelEn: 'Other', Icon: HeadphonesIcon, href: paths.public.professionals },
  ],
} as const;

export function localizeSubcategories(
  verticalId: HomeVerticalId,
  language: AppLanguage,
): SubcategoryItem[] {
  return HOME_SUBCATEGORIES[verticalId].map((item) => ({
    ...item,
    label: localizedLabel(language, item.label, item.labelEn),
  }));
}

/**
 * The top-level vertical icons live in `public/` as PNG assets and are
 * rendered by the {@link VerticalIcon} component. Keep this re-export so
 * existing imports from `home-subcategories` keep working.
 */
export { VerticalIcon, VERTICAL_ICON_SRC } from '@/components/public/vertical-icon';
