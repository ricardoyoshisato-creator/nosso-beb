export type FamilyRole = "owner" | "admin" | "caregiver" | "viewer";

export type InvitationStatus = "pending" | "accepted" | "declined" | "canceled" | "expired";

export type PermissionKey =
  | "family.edit"
  | "family.delete"
  | "members.invite"
  | "members.manage"
  | "permissions.manage"
  | "records.view"
  | "records.create"
  | "records.edit"
  | "records.delete"
  | "calendar.manage"
  | "data.export";

export type Profile = {
  id: string;
  family_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
};

export type NotificationSettings = {
  push: boolean;
  weekly: boolean;
  photos: boolean;
  history: boolean;
};

export type Family = {
  id: string;
  name: string;
  city: string | null;
  timezone: string;
  baby_name: string | null;
  baby_due_date: string | null;
  baby_birth_date: string | null;
  baby_gender: "menina" | "menino" | "surpresa" | null;
  notification_settings: NotificationSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PregnancyReferenceType = "dum" | "reference";

export type Pregnancy = {
  id: string;
  family_id: string;
  reference_date: string;
  reference_type: PregnancyReferenceType;
  cycle_length: number;
  due_date: string;
  status: "active" | "ended";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PregnancyMilestone = {
  id: string;
  family_id: string;
  title: string;
  event_date: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BabyProfile = {
  id: string;
  family_id: string;
  name: string;
  /** Sem data de nascimento, Rotina, Vacinas e Crescimento ficam bloqueados. */
  birth_date: string | null;
  /** Horário do nascimento no formato "HH:MM:SS". */
  birth_time: string | null;
  /** Peso ao nascer em kg (`numeric(5,2)` no banco). */
  birth_weight: number | null;
  /** Comprimento ao nascer em cm (`numeric(5,1)` no banco). */
  birth_height: number | null;
  /** Perímetro cefálico em cm (`numeric(5,1)` no banco). */
  head_circumference: number | null;
  maternity_hospital: string | null;
  pediatrician: string | null;
  important_info: string | null;
  /** Caminho da foto no bucket privado `baby` (aberta por URL assinada). */
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BabyLogType =
  | "fralda"
  | "mamadeira"
  | "amamentacao"
  | "sono"
  | "banho"
  | "medicamento"
  | "temperatura"
  | "evacuacao"
  | "outro";

/**
 * Campos específicos de cada tipo de cuidado, guardados no JSONB `details`.
 * Só os campos do tipo registrado são preenchidos — o resto fica ausente.
 */
export type BabyLogDetails = {
  /** fralda: o que tinha na fralda */
  xixi?: boolean;
  coco?: boolean;
  /** mamadeira */
  volume_ml?: number;
  milk_type?: "leite_materno" | "formula" | "misto";
  /** amamentação */
  side?: "esquerdo" | "direito" | "ambos";
  duration_min?: number;
  /** sono: instantes ISO de início e fim */
  started_at?: string;
  ended_at?: string;
  /** medicamento avulso (não é o cadastro de `medications`) */
  name?: string;
  dosage?: string;
  /** temperatura em °C */
  celsius?: number;
  /** evacuacao */
  consistency?: "pastosa" | "liquida" | "dura";
};

export type BabyLog = {
  id: string;
  family_id: string;
  /** Quem registrou o cuidado. */
  user_id: string | null;
  log_type: BabyLogType;
  logged_at: string;
  details: BabyLogDetails;
  notes: string | null;
  /** Produto do estoque baixado nesta troca de fralda (opcional). */
  inventory_item_id: string | null;
  /** Quantidade baixada do estoque nesta troca de fralda. */
  stock_quantity: number | null;
  created_at: string;
};

export type Vaccine = {
  id: string;
  family_id: string;
  name: string;
  dose: string | null;
  /** Data prevista (dia de calendário); no passado sem aplicação = atrasada. */
  expected_date: string | null;
  applied_date: string | null;
  location: string | null;
  batch: string | null;
  professional: string | null;
  /** Caminho do comprovante no bucket privado `vaccines`. */
  proof_path: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GrowthRecord = {
  id: string;
  family_id: string;
  /** Peso em kg (`numeric(5,2)` no banco). */
  weight: number | null;
  /** Altura/comprimento em cm (`numeric(5,1)` no banco). */
  height: number | null;
  /** Perímetro cefálico em cm (`numeric(5,1)` no banco). */
  head_circumference: number | null;
  measurement_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentCategory =
  | "exames"
  | "vacinas"
  | "gestacao"
  | "identidade"
  | "financeiro"
  | "outros";

export type DocumentRecord = {
  id: string;
  family_id: string;
  name: string;
  category: DocumentCategory;
  /** Data do documento (dia de calendário "AAAA-MM-DD"). */
  date: string;
  description: string | null;
  /** Caminho do arquivo no bucket privado `documents`. */
  file_path: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MemoryCategory =
  | "primeiro_ultrassom"
  | "nascimento"
  | "primeiro_banho"
  | "primeiro_sorriso"
  | "primeira_palavra"
  | "primeiros_passos"
  | "primeira_comida"
  | "primeira_viagem"
  | "aniversario"
  | "outros";

export type Memory = {
  id: string;
  family_id: string;
  title: string;
  /** Data do acontecimento (dia de calendário "AAAA-MM-DD"). */
  date: string;
  description: string | null;
  category: MemoryCategory;
  /** Foto ou vídeo no bucket privado `memories` (aberto por URL assinada). */
  media_path: string | null;
  is_favorite: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentStatus = "scheduled" | "done" | "canceled" | "rescheduled";

export type Appointment = {
  id: string;
  family_id: string;
  doctor_name: string;
  specialty: string | null;
  clinic: string | null;
  address: string | null;
  scheduled_at: string;
  reason: string | null;
  notes: string | null;
  recommendations: string | null;
  status: AppointmentStatus;
  /** Consulta particular: quando tem custo, gera despesa no Financeiro. */
  is_private: boolean;
  /** Custo da consulta em centavos (só vale com `is_private`). */
  cost_cents: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentAttachment = {
  id: string;
  appointment_id: string;
  family_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type Exam = {
  id: string;
  family_id: string;
  name: string;
  requested_date: string | null;
  scheduled_date: string | null;
  performed_date: string | null;
  doctor_name: string | null;
  lab: string | null;
  result: string | null;
  notes: string | null;
  /** Exame particular: quando tem custo, gera despesa no Financeiro. */
  is_private: boolean;
  /** Custo do exame em centavos (só vale com `is_private`). */
  cost_cents: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExamAttachment = {
  id: string;
  exam_id: string;
  family_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type MedicationFrequency = "daily" | "every_other_day" | "weekly" | "as_needed";

export type Medication = {
  id: string;
  family_id: string;
  name: string;
  dosage: string;
  dosage_unit: string;
  /** Horários do dia no formato "HH:MM:SS". */
  times: string[];
  frequency: MedicationFrequency;
  start_date: string;
  end_date: string | null;
  doctor_name: string | null;
  /** Valor opcional em centavos; quando preenchido, gera despesa em `saude`. */
  cost_cents: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MedicationAttachment = {
  id: string;
  medication_id: string;
  family_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type DoseStatus = "pending" | "taken" | "late" | "missed";

export type MedicationDose = {
  id: string;
  family_id: string;
  medication_id: string;
  dose_date: string;
  dose_time: string;
  status: DoseStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseCategory =
  | "roupas"
  | "higiene"
  | "moveis"
  | "quarto"
  | "alimentacao"
  | "saude"
  | "consultas_exames"
  | "transporte"
  | "brinquedos"
  | "outros";

export type Expense = {
  id: string;
  family_id: string;
  expense_date: string;
  name: string;
  category: ExpenseCategory;
  description: string | null;
  /** Valor em centavos para evitar erro de arredondamento. */
  amount_cents: number;
  paid_by: string | null;
  store: string | null;
  notes: string | null;
  /** Item do enxoval que originou a compra (opcional). */
  layette_item_id: string | null;
  /** Consulta particular que gerou a despesa (opcional). */
  appointment_id: string | null;
  /** Exame particular que gerou a despesa (opcional). */
  exam_id: string | null;
  /** Medicamento com valor que gerou a despesa (opcional). */
  medication_id: string | null;
  /** Presente que gerou custo para a família (opcional). */
  gift_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseAttachment = {
  id: string;
  expense_id: string;
  family_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type LayetteCategory =
  | "roupas"
  | "berco"
  | "banho"
  | "alimentacao"
  | "passeio"
  | "quarto"
  | "brinquedos"
  | "outros";

export type LayetteStatus = "desejado" | "pesquisando" | "comprado" | "recebido" | "presenteado";

export type LayetteItem = {
  id: string;
  family_id: string;
  name: string;
  category: LayetteCategory;
  desired_quantity: number;
  purchased_quantity: number;
  /** Preço estimado por unidade, em centavos. */
  estimated_price_cents: number | null;
  /** Preço realmente pago por unidade, em centavos. */
  actual_price_cents: number | null;
  store_link: string | null;
  responsible: string | null;
  status: LayetteStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Gift = {
  id: string;
  family_id: string;
  product_name: string;
  date_received: string;
  giver_name: string | null;
  quantity: number;
  description: string | null;
  /** Caminho da foto no bucket privado `gifts`. */
  photo_path: string | null;
  notes: string | null;
  /** Item do enxoval que este presente atende (opcional). */
  layette_item_id: string | null;
  /** Produto do estoque que recebeu a entrada do presente (opcional). */
  inventory_item_id: string | null;
  /** Quantidade que entrou no estoque junto com o presente. */
  stock_quantity: number | null;
  /** Custo que a família teve com o presente, em centavos (nulo = sem custo). */
  cost_cents: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryUnit =
  | "un"
  | "pacote"
  | "caixa"
  | "par"
  | "frasco"
  | "rolo"
  | "ml"
  | "l"
  | "g"
  | "kg";

export type InventoryItem = {
  id: string;
  family_id: string;
  product_name: string;
  brand: string | null;
  size: string | null;
  /** Quantidade atual, na unidade cadastrada (`numeric(10,2)` no banco). */
  current_quantity: number;
  unit: InventoryUnit;
  minimum_stock: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryMovementType =
  | "entrada_compra"
  | "entrada_presente"
  | "saida_uso"
  | "ajuste_manual";

export type InventoryMovement = {
  id: string;
  family_id: string;
  inventory_item_id: string;
  movement_type: InventoryMovementType;
  /** Quantidade movimentada; no ajuste manual é a nova quantidade do produto. */
  quantity: number;
  occurred_at: string;
  user_id: string | null;
  notes: string | null;
  created_at: string;
};

export type NotificationKind = "appointment" | "exam" | "medication" | "pending";

export type AppNotification = {
  id: string;
  family_id: string;
  kind: NotificationKind;
  dedupe_key: string;
  title: string;
  body: string | null;
  link: string | null;
  due_at: string | null;
  read_at: string | null;
  read_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FamilyMember = {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  status: "active" | "invited" | "suspended";
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FamilyInvitation = {
  id: string;
  family_id: string;
  email: string;
  role: FamilyRole;
  status: InvitationStatus;
  token: string;
  invited_by: string | null;
  accepted_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FamilyPermission = {
  id: string;
  family_id: string;
  role: FamilyRole;
  permission: PermissionKey;
  allowed: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  family_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
