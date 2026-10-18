import { SiteHeader } from "@/components/site-header";
import { PracticeGame } from "@/components/game/practice-game";

export const metadata = { title: "Practice" };

export default function PracticePage() {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <PracticeGame />
    </div>
  );
}
