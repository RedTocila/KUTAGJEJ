import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { BookOpen as BookOpenIcon } from '@phosphor-icons/react/dist/ssr/BookOpen';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { BuildingApartment as BuildingApartmentIcon } from '@phosphor-icons/react/dist/ssr/BuildingApartment';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CarSimple as CarSimpleIcon } from '@phosphor-icons/react/dist/ssr/CarSimple';
import { Code as CodeIcon } from '@phosphor-icons/react/dist/ssr/Code';
import { Couch as CouchIcon } from '@phosphor-icons/react/dist/ssr/Couch';
import { DeviceMobile as DeviceMobileIcon } from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import { ForkKnife as ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { GasPump as GasPumpIcon } from '@phosphor-icons/react/dist/ssr/GasPump';
import { Hammer as HammerIcon } from '@phosphor-icons/react/dist/ssr/Hammer';
import { Headphones as HeadphonesIcon } from '@phosphor-icons/react/dist/ssr/Headphones';
import { Hospital as HospitalIcon } from '@phosphor-icons/react/dist/ssr/Hospital';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { Leaf as LeafIcon } from '@phosphor-icons/react/dist/ssr/Leaf';
import { Lightning as LightningIcon } from '@phosphor-icons/react/dist/ssr/Lightning';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { Money as MoneyIcon } from '@phosphor-icons/react/dist/ssr/Money';
import { PuzzlePiece as PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { SoccerBall as SoccerBallIcon } from '@phosphor-icons/react/dist/ssr/SoccerBall';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { TShirt as TShirtIcon } from '@phosphor-icons/react/dist/ssr/TShirt';
import { Toolbox as ToolboxIcon } from '@phosphor-icons/react/dist/ssr/Toolbox';
import { Tree as TreeIcon } from '@phosphor-icons/react/dist/ssr/Tree';
import { Warehouse as WarehouseIcon } from '@phosphor-icons/react/dist/ssr/Warehouse';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';

import { paths } from '@/paths';

import type { HomeVerticalId } from './home-categories';

export interface SubcategoryItem {
  /** Albanian label rendered on the pill. */
  label: string;
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
    { label: 'Apartament', Icon: BuildingApartmentIcon, href: `${paths.public.realEstate}?cat=apartment` },
    { label: 'Vilë', Icon: HouseIcon, href: `${paths.public.realEstate}?cat=villa` },
    { label: 'Penthouse', Icon: BuildingsIcon, href: `${paths.public.realEstate}?cat=penthouse-duplex` },
    { label: 'Zyrë', Icon: BuildingOfficeIcon, href: `${paths.public.realEstate}?cat=office` },
    { label: 'Dyqan', Icon: StorefrontIcon, href: `${paths.public.realEstate}?cat=shop` },
    { label: 'Tokë', Icon: TreeIcon, href: `${paths.public.realEstate}?cat=building-plot` },
    { label: 'Parking', Icon: CarSimpleIcon, href: `${paths.public.realEstate}?cat=parking` },
    { label: 'Magazinë', Icon: WarehouseIcon, href: `${paths.public.realEstate}?cat=warehouse` },
  ],
  cars: [
    { label: 'Benzinë', Icon: GasPumpIcon, href: `${paths.public.cars}?fuel=petrol` },
    { label: 'Naftë', Icon: GasPumpIcon, href: `${paths.public.cars}?fuel=diesel` },
    { label: 'Hibrid', Icon: LeafIcon, href: `${paths.public.cars}?fuel=hybrid-petrol` },
    { label: 'Elektrik', Icon: LightningIcon, href: `${paths.public.cars}?fuel=electric` },
    { label: 'GPL', Icon: GasPumpIcon, href: `${paths.public.cars}?fuel=lpg` },
    { label: 'Të tjera', Icon: CarIcon, href: paths.public.cars },
  ],
  jobs: [
    { label: 'IT', Icon: CodeIcon, href: `${paths.public.jobs}?industry=teknologji-informacioni` },
    { label: 'Shitje', Icon: MegaphoneIcon, href: `${paths.public.jobs}?industry=shitje-zhvillim` },
    { label: 'HoReCa', Icon: ForkKnifeIcon, href: `${paths.public.jobs}?industry=horeka` },
    { label: 'Ndërtim', Icon: HammerIcon, href: `${paths.public.jobs}?industry=ndertim-industri` },
    { label: 'Mjekësi', Icon: HospitalIcon, href: `${paths.public.jobs}?industry=mjekesore-shendetesore` },
    { label: 'Marketing', Icon: MegaphoneIcon, href: `${paths.public.jobs}?industry=marketing-produkte` },
    { label: 'Financë', Icon: MoneyIcon, href: `${paths.public.jobs}?industry=finance` },
    { label: 'Klient', Icon: HeadphonesIcon, href: `${paths.public.jobs}?industry=sherbim-klienti` },
    { label: 'Të tjera', Icon: BriefcaseIcon, href: paths.public.jobs },
  ],
  marketplace: [
    { label: 'Elektronikë', Icon: DeviceMobileIcon, href: `${paths.public.marketplace}?cat=elektronike` },
    { label: 'Mobilje', Icon: CouchIcon, href: `${paths.public.marketplace}?cat=mobilje-shtepi` },
    { label: 'Veshje', Icon: TShirtIcon, href: `${paths.public.marketplace}?cat=veshje-aksesore` },
    { label: 'Libra', Icon: BookOpenIcon, href: `${paths.public.marketplace}?cat=libra-shkolla` },
    { label: 'Sport', Icon: SoccerBallIcon, href: `${paths.public.marketplace}?cat=sport-hobi` },
    { label: 'Lodra', Icon: PuzzlePieceIcon, href: `${paths.public.marketplace}?cat=lodra` },
    { label: 'Pjesë auto', Icon: WrenchIcon, href: `${paths.public.marketplace}?cat=automjete-pjese` },
    { label: 'Ushqim', Icon: ForkKnifeIcon, href: `${paths.public.marketplace}?cat=ushqime-bujqesi` },
    { label: 'Shërbime', Icon: ToolboxIcon, href: `${paths.public.marketplace}?cat=sherbime` },
    { label: 'Të tjera', Icon: ShoppingBagIcon, href: `${paths.public.marketplace}?cat=te-tjera` },
  ],
} as const;

/**
 * The top-level vertical icons live in `public/` as PNG assets and are
 * rendered by the {@link VerticalIcon} component. Keep this re-export so
 * existing imports from `home-subcategories` keep working.
 */
export { VerticalIcon, VERTICAL_ICON_SRC } from '@/components/public/vertical-icon';
