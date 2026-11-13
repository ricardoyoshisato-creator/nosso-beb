import { Syringe } from "lucide-react";

import { BabyModuleGate } from "@/components/BabyModuleGate";
import { VaccineTimeline } from "@/components/VaccineTimeline";

const Vaccines = () => (
  <BabyModuleGate
    label="Vacinas"
    title="Vacinas do bebê"
    description="Registre as doses aplicadas, guarde o comprovante e acompanhe o que está previsto ou atrasado."
    icon={Syringe}
  >
    <VaccineTimeline />
  </BabyModuleGate>
);

export default Vaccines;
