/* DingleBERRY — artifact icon-name → lucide-react component map.
   The artifact referenced icons as strings (NAV.icon, MeshLayer.icon,
   EvidenceItem.icon, …). The repo already ships lucide-react, and every
   artifact glyph has a 1:1 lucide export — so we map names to components
   instead of porting raw SVG path data. */
import {
  Activity,
  AlertTriangle,
  Ban,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Eye,
  Fingerprint,
  GitBranch,
  Globe,
  Hexagon,
  Lock,
  Network,
  Radar,
  Scale,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  WifiOff,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const DB_ICON: Record<string, LucideIcon> = {
  scale: Scale,
  search: Search,
  users: Users,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  clock: Clock,
  bell: Bell,
  settings: Shield, // unused glyph fallback
  shield: Shield,
  shieldCheck: ShieldCheck,
  activity: Activity,
  server: Server,
  network: Network,
  lock: Lock,
  alertTriangle: AlertTriangle,
  eye: Eye,
  zap: Zap,
  wifiOff: WifiOff,
  cpu: Cpu,
  radar: Radar,
  hexagon: Hexagon,
  globe: Globe,
  fingerprint: Fingerprint,
  ban: Ban,
  sparkle: Sparkles,
  gitBranch: GitBranch,
};

/** Resolve an artifact icon-name to a lucide component (Shield fallback). */
export function dbIcon(name: string): LucideIcon {
  return DB_ICON[name] ?? Shield;
}
