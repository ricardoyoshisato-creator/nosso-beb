import { Clock } from "lucide-react";

import { BabyModuleGate } from "@/components/BabyModuleGate";
import { RoutineDiary } from "@/components/RoutineDiary";

const Routine = () => (
  <BabyModuleGate
    label="Rotina"
    title="Rotina do bebê"
    description="Sono, mamadas, fraldas e os cuidados do dia a dia em um só lugar."
    icon={Clock}
  >
    <RoutineDiary />
  </BabyModuleGate>
);

export default Routine;
