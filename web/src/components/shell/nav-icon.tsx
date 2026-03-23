import {
  Clapperboard,
  Gauge,
  IdCard,
  LayoutDashboard,
  Radio,
  Route,
  ShoppingBag,
  Trophy,
  Wrench,
} from "lucide-react";

type Props = {
  icon: string;
  className?: string;
};

export function NavIcon({ icon, className }: Props) {
  switch (icon) {
    case "layout-dashboard":
      return <LayoutDashboard className={className} />;
    case "radio":
      return <Radio className={className} />;
    case "gauge":
      return <Gauge className={className} />;
    case "route":
      return <Route className={className} />;
    case "clapperboard":
      return <Clapperboard className={className} />;
    case "trophy":
      return <Trophy className={className} />;
    case "wrench":
      return <Wrench className={className} />;
    case "shopping-bag":
      return <ShoppingBag className={className} />;
    case "id-card":
      return <IdCard className={className} />;
    default:
      return <LayoutDashboard className={className} />;
  }
}
