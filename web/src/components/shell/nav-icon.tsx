import {
  ChatBubbleLeftRightIcon,
  FilmIcon,
  IdentificationIcon,
  MapIcon,
  PresentationChartLineIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrophyIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

type Props = {
  icon: string;
  className?: string;
};

/** Dock icons: Heroicons outline 24 — tuned for legibility at small sizes in the magnifying dock */
export function NavIcon({ icon, className }: Props) {
  const cn = className ?? "";
  switch (icon) {
    case "layout-dashboard":
      return <Squares2X2Icon className={cn} aria-hidden />;
    case "radio":
      return <ChatBubbleLeftRightIcon className={cn} aria-hidden />;
    case "gauge":
      return <PresentationChartLineIcon className={cn} aria-hidden />;
    case "route":
      return <MapIcon className={cn} aria-hidden />;
    case "clapperboard":
      return <FilmIcon className={cn} aria-hidden />;
    case "trophy":
      return <TrophyIcon className={cn} aria-hidden />;
    case "wrench":
      return <WrenchScrewdriverIcon className={cn} aria-hidden />;
    case "shopping-bag":
      return <SparklesIcon className={cn} aria-hidden />;
    case "sparkles":
      return <SparklesIcon className={cn} aria-hidden />;
    case "id-card":
      return <IdentificationIcon className={cn} aria-hidden />;
    default:
      return <Squares2X2Icon className={cn} aria-hidden />;
  }
}
