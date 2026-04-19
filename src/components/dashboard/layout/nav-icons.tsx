import type * as React from 'react';
import { ChartPie as ChartPieIcon } from '@phosphor-icons/react/dist/ssr/ChartPie';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { XSquare } from '@phosphor-icons/react/dist/ssr/XSquare';
import { Terminal as TerminalIcon } from '@phosphor-icons/react/dist/ssr/Terminal';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';
import { Pencil as PencilIcon } from '@phosphor-icons/react/dist/ssr/Pencil';
import { Note as NoteIcon } from '@phosphor-icons/react/dist/ssr/Note';
import { ChartLine as ChartLineIcon } from '@phosphor-icons/react/dist/ssr/ChartLine';
import { Shield as ShieldIcon } from '@phosphor-icons/react/dist/ssr/Shield';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { BookOpen as BookOpenIcon } from '@phosphor-icons/react/dist/ssr/BookOpen';
import { Scroll as ScrollIcon } from '@phosphor-icons/react/dist/ssr/Scroll';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';

/** React 19 JSX expects components that return `Element | null`, not loose `ReactNode` (Phosphor's `Icon` type). */
export type NavIconComponent = React.ComponentType<{
  className?: string;
  color?: string;
  fill?: string;
  fontSize?: string | number;
  weight?: 'bold' | 'duotone' | 'fill' | 'light' | 'regular' | 'thin';
}>;

export const navIcons = {
  'chart-pie': ChartPieIcon,
  'gear-six': GearSixIcon,
  'plugs-connected': PlugsConnectedIcon,
  'x-square': XSquare,
  'user': UserIcon,
  'users': UsersIcon,
  'terminal': TerminalIcon,
  'buildings': BuildingsIcon,
  'user-gear': UserGearIcon,
  'pencil': PencilIcon,
  'note': NoteIcon,
  'chart-line': ChartLineIcon,
  'shield': ShieldIcon,
  'shield-check': ShieldCheckIcon,
  'calendar-blank': CalendarBlankIcon,
  'file-text': FileTextIcon,
  'package': PackageIcon,
  'book-open': BookOpenIcon,
  'squares-four': SquaresFourIcon,
  scroll: ScrollIcon,
  handshake: HandshakeIcon,
} as Record<string, NavIconComponent>;
