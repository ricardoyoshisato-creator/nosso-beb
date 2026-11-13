import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  APPOINTMENT_BUCKET,
  BABY_BUCKET,
  DOCUMENT_BUCKET,
  EXAM_BUCKET,
  GIFT_BUCKET,
  MEMORY_BUCKET,
  PRESCRIPTION_BUCKET,
  RECEIPT_BUCKET,
  VACCINE_BUCKET,
  safeStorageFileName,
} from "@/lib/attachments";
import type { ExpenseWithAttachments } from "@/lib/expenses";
import type {
  ActivityLog,
  AppNotification,
  Appointment,
  AppointmentAttachment,
  AppointmentStatus,
  BabyLog,
  BabyLogDetails,
  BabyLogType,
  BabyProfile,
  DocumentCategory,
  DocumentRecord,
  DoseStatus,
  Exam,
  ExamAttachment,
  ExpenseAttachment,
  ExpenseCategory,
  Family,
  FamilyInvitation,
  FamilyMember,
  FamilyPermission,
  FamilyRole,
  Gift,
  GrowthRecord,
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
  InventoryUnit,
  LayetteCategory,
  LayetteItem,
  LayetteStatus,
  Medication,
  MedicationAttachment,
  MedicationDose,
  MedicationFrequency,
  Memory,
  MemoryCategory,
  PermissionKey,
  Pregnancy,
  PregnancyMilestone,
  PregnancyReferenceType,
  Profile,
  Vaccine,
} from "@/types/database";

export type FamilyMemberWithProfile = FamilyMember & { profile: Profile | null };
export type ActivityEntry = ActivityLog & { actor: Pick<Profile, "id" | "full_name"> | null };
export type AppointmentWithAttachments = Appointment & { attachments: AppointmentAttachment[] };
export type ExamWithAttachments = Exam & { attachments: ExamAttachment[] };
export type MedicationWithAttachments = Medication & { attachments: MedicationAttachment[] };

type Result = { error: string | null };
type SaveResult = { error: string | null; id: string | null };

type CreateFamilyInput = {
  name: string;
  city?: string;
  babyName?: string;
  babyDueDate?: string;
};

type PermissionUpdate = { role: FamilyRole; permission: PermissionKey; allowed: boolean };

type PregnancyInput = {
  referenceDate: string;
  referenceType: PregnancyReferenceType;
  cycleLength: number;
  dueDate: string;
  notes?: string | null;
};

type MilestoneInput = {
  title: string;
  eventDate: string;
  description?: string | null;
};

type BabyProfileInput = {
  name: string;
  birthDate?: string | null;
  birthTime?: string | null;
  birthWeight?: number | null;
  birthHeight?: number | null;
  headCircumference?: number | null;
  maternityHospital?: string | null;
  pediatrician?: string | null;
  importantInfo?: string | null;
};

type BabyLogInput = {
  type: BabyLogType;
  /** Instante do cuidado; o formulário abre com o horário atual. */
  loggedAt: string;
  details: BabyLogDetails;
  notes?: string | null;
  /** Troca de fralda: produto do estoque que tem baixa automática. */
  inventoryItemId?: string | null;
  stockQuantity?: number | null;
};

type DocumentInput = {
  name: string;
  category: DocumentCategory;
  /** Data do documento (dia de calendário "AAAA-MM-DD"). */
  date: string;
  description?: string | null;
  /** Arquivo novo: no cadastro é obrigatório, na edição substitui o atual. */
  file?: File | null;
};

type MemoryInput = {
  title: string;
  /** Data do acontecimento (dia de calendário "AAAA-MM-DD"). */
  date: string;
  category: MemoryCategory;
  description?: string | null;
  /** Mídia nova: no cadastro é opcional, na edição substitui a atual. */
  media?: File | null;
  /** Remove a foto/vídeo atual (edição). */
  removeMedia?: boolean;
};

type VaccineInput = {
  name: string;
  dose?: string | null;
  expectedDate?: string | null;
  appliedDate?: string | null;
  location?: string | null;
  batch?: string | null;
  professional?: string | null;
  notes?: string | null;
};

type GrowthRecordInput = {
  measurementDate: string;
  weight?: number | null;
  height?: number | null;
  headCircumference?: number | null;
};

type AppointmentInput = {
  doctorName: string;
  specialty?: string | null;
  clinic?: string | null;
  address?: string | null;
  scheduledAt: string;
  reason?: string | null;
  notes?: string | null;
  recommendations?: string | null;
  status: AppointmentStatus;
  isPrivate: boolean;
  costCents?: number | null;
};

type ExamInput = {
  name: string;
  requestedDate?: string | null;
  scheduledDate?: string | null;
  performedDate?: string | null;
  doctorName?: string | null;
  lab?: string | null;
  result?: string | null;
  notes?: string | null;
  isPrivate: boolean;
  costCents?: number | null;
};

type MedicationInput = {
  name: string;
  dosage: string;
  dosageUnit: string;
  times: string[];
  frequency: MedicationFrequency;
  startDate: string;
  endDate?: string | null;
  doctorName?: string | null;
  costCents?: number | null;
};

type DoseInput = {
  medicationId: string;
  date: string;
  time: string;
  status: Exclude<DoseStatus, "pending">;
};

type ExpenseInput = {
  date: string;
  name: string;
  category: ExpenseCategory;
  description?: string | null;
  amountCents: number;
  paidBy?: string | null;
  store?: string | null;
  notes?: string | null;
};

type LayetteInput = {
  name: string;
  category: LayetteCategory;
  desiredQuantity: number;
  purchasedQuantity: number;
  estimatedPriceCents: number | null;
  actualPriceCents: number | null;
  storeLink?: string | null;
  responsible?: string | null;
  status: LayetteStatus;
  notes?: string | null;
};

type GiftInput = {
  productName: string;
  dateReceived: string;
  giverName?: string | null;
  quantity: number;
  description?: string | null;
  notes?: string | null;
  layetteItemId?: string | null;
  /** Produto do estoque que recebe a entrada do presente (opcional). */
  inventoryItemId?: string | null;
  /** Quantidade que entra no estoque; obrigatória quando há `inventoryItemId`. */
  stockQuantity?: number | null;
  /** Custo que a família teve com o presente; o banco cria/remove a despesa. */
  costCents?: number | null;
};

type LayettePurchaseInput = {
  layetteItemId: string;
  quantity: number;
  totalCents: number;
  paidBy?: string | null;
  purchaseDate: string;
};

type InventoryInput = {
  productName: string;
  brand?: string | null;
  size?: string | null;
  currentQuantity: number;
  unit: InventoryUnit;
  minimumStock: number;
};

type InventoryMovementInput = {
  inventoryItemId: string;
  movementType: InventoryMovementType;
  quantity: number;
  occurredAt: string;
  notes?: string | null;
};

type FamilyContextValue = {
  loading: boolean;
  error: string | null;
  family: Family | null;
  membership: FamilyMember | null;
  members: FamilyMemberWithProfile[];
  invitations: FamilyInvitation[];
  permissions: FamilyPermission[];
  activity: ActivityEntry[];
  pregnancy: Pregnancy | null;
  milestones: PregnancyMilestone[];
  babyProfile: BabyProfile | null;
  babyLogs: BabyLog[];
  vaccines: Vaccine[];
  growthRecords: GrowthRecord[];
  documents: DocumentRecord[];
  memories: Memory[];
  appointments: AppointmentWithAttachments[];
  exams: ExamWithAttachments[];
  medications: MedicationWithAttachments[];
  doses: MedicationDose[];
  expenses: ExpenseWithAttachments[];
  layetteItems: LayetteItem[];
  gifts: Gift[];
  inventoryItems: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  activeMembersCount: number;
  pendingInvitationsCount: number;
  can: (permission: PermissionKey) => boolean;
  refresh: () => Promise<void>;
  createFamily: (input: CreateFamilyInput) => Promise<Result>;
  updateFamily: (patch: Partial<Family>) => Promise<Result>;
  deleteFamily: () => Promise<Result>;
  inviteMember: (email: string, role: FamilyRole) => Promise<Result>;
  resendInvitation: (id: string) => Promise<Result>;
  cancelInvitation: (id: string) => Promise<Result>;
  removeMember: (id: string) => Promise<Result>;
  updateMemberRole: (id: string, role: FamilyRole) => Promise<Result>;
  savePermissions: (rows: PermissionUpdate[]) => Promise<Result>;
  savePregnancy: (input: PregnancyInput) => Promise<Result>;
  deletePregnancy: () => Promise<Result>;
  addMilestone: (input: MilestoneInput) => Promise<Result>;
  removeMilestone: (id: string) => Promise<Result>;
  saveBabyProfile: (input: BabyProfileInput) => Promise<SaveResult>;
  uploadBabyAvatar: (babyProfileId: string, file: File, previousPath?: string | null) => Promise<Result>;
  removeBabyAvatar: (profile: BabyProfile) => Promise<Result>;
  saveBabyLog: (input: BabyLogInput) => Promise<Result>;
  deleteBabyLog: (id: string) => Promise<Result>;
  saveVaccine: (input: VaccineInput, id?: string) => Promise<SaveResult>;
  deleteVaccine: (id: string) => Promise<Result>;
  uploadVaccineProof: (vaccineId: string, file: File, previousPath?: string | null) => Promise<Result>;
  removeVaccineProof: (vaccine: Vaccine) => Promise<Result>;
  saveGrowthRecord: (input: GrowthRecordInput, id?: string) => Promise<SaveResult>;
  deleteGrowthRecord: (id: string) => Promise<Result>;
  /** Cria/edita o documento e sobe o arquivo no bucket privado `documents`. */
  saveDocument: (input: DocumentInput, existing?: DocumentRecord) => Promise<SaveResult>;
  deleteDocument: (document: DocumentRecord) => Promise<Result>;
  /** Cria/edita a memória e sobe a foto ou o vídeo no bucket privado `memories`. */
  saveMemory: (input: MemoryInput, existing?: Memory) => Promise<SaveResult>;
  deleteMemory: (memory: Memory) => Promise<Result>;
  /** Alterna o coração da memória (RPC: liberada para qualquer membro ativo). */
  toggleMemoryFavorite: (memory: Memory) => Promise<Result>;
  saveAppointment: (input: AppointmentInput, id?: string) => Promise<SaveResult>;
  deleteAppointment: (id: string) => Promise<Result>;
  uploadAppointmentFiles: (appointmentId: string, files: File[]) => Promise<Result>;
  removeAppointmentAttachment: (attachment: AppointmentAttachment) => Promise<Result>;
  saveExam: (input: ExamInput, id?: string) => Promise<SaveResult>;
  deleteExam: (id: string) => Promise<Result>;
  uploadExamFiles: (examId: string, files: File[]) => Promise<Result>;
  removeExamAttachment: (attachment: ExamAttachment) => Promise<Result>;
  saveMedication: (input: MedicationInput, id?: string) => Promise<SaveResult>;
  deleteMedication: (id: string) => Promise<Result>;
  uploadMedicationFiles: (medicationId: string, files: File[]) => Promise<Result>;
  removeMedicationAttachment: (attachment: MedicationAttachment) => Promise<Result>;
  markDose: (input: DoseInput) => Promise<Result>;
  markNotificationRead: (id: string) => Promise<Result>;
  markAllNotificationsRead: () => Promise<Result>;
  saveExpense: (input: ExpenseInput, id?: string) => Promise<SaveResult>;
  deleteExpense: (id: string) => Promise<Result>;
  uploadExpenseFiles: (expenseId: string, files: File[]) => Promise<Result>;
  removeExpenseAttachment: (attachment: ExpenseAttachment) => Promise<Result>;
  saveLayetteItem: (input: LayetteInput, id?: string) => Promise<SaveResult>;
  deleteLayetteItem: (id: string) => Promise<Result>;
  /** Fecha a compra do item (status + preço real) e lança a despesa no Financeiro. */
  purchaseLayetteItem: (input: LayettePurchaseInput) => Promise<Result>;
  saveGift: (input: GiftInput, id?: string) => Promise<SaveResult>;
  deleteGift: (id: string) => Promise<Result>;
  uploadGiftPhoto: (giftId: string, file: File, previousPath?: string | null) => Promise<Result>;
  removeGiftPhoto: (gift: Gift) => Promise<Result>;
  saveInventoryItem: (input: InventoryInput, id?: string) => Promise<SaveResult>;
  deleteInventoryItem: (id: string) => Promise<Result>;
  addInventoryMovement: (input: InventoryMovementInput) => Promise<Result>;
};

type SupabaseError = { message: string; code?: string } | null;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

function cleanText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toMessage(error: SupabaseError, fallback = "Não foi possível concluir a ação.") {
  if (!error) return null;
  switch (error.code) {
    case "23505":
      return "Já existe um registro com esses dados.";
    case "23503":
      return "Este registro está vinculado a outros dados da família.";
    case "42501":
      return "Você não tem permissão para essa ação.";
    case "PGRST116":
      return "Registro não encontrado.";
    default:
      return error.message || fallback;
  }
}

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [membership, setMembership] = useState<FamilyMember | null>(null);
  const [members, setMembers] = useState<FamilyMemberWithProfile[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [permissions, setPermissions] = useState<FamilyPermission[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [milestones, setMilestones] = useState<PregnancyMilestone[]>([]);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [babyLogs, setBabyLogs] = useState<BabyLog[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithAttachments[]>([]);
  const [exams, setExams] = useState<ExamWithAttachments[]>([]);
  const [medications, setMedications] = useState<MedicationWithAttachments[]>([]);
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithAttachments[]>([]);
  const [layetteItems, setLayetteItems] = useState<LayetteItem[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const clear = useCallback(() => {
    setFamily(null);
    setMembership(null);
    setMembers([]);
    setInvitations([]);
    setPermissions([]);
    setActivity([]);
    setPregnancy(null);
    setMilestones([]);
    setBabyProfile(null);
    setBabyLogs([]);
    setVaccines([]);
    setGrowthRecords([]);
    setDocuments([]);
    setMemories([]);
    setAppointments([]);
    setExams([]);
    setMedications([]);
    setDoses([]);
    setExpenses([]);
    setLayetteItems([]);
    setGifts([]);
    setInventoryItems([]);
    setInventoryMovements([]);
    setNotifications([]);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!userId) {
        clear();
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      setError(null);

      const { data: membershipData, error: membershipError } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        setError(toMessage(membershipError));
        clear();
        setLoading(false);
        return;
      }

      const currentMembership = (membershipData as FamilyMember | null) ?? null;

      if (!currentMembership) {
        clear();
        setLoading(false);
        return;
      }

      const [
        familyRes,
        membersRes,
        invitesRes,
        permissionsRes,
        activityRes,
        pregnancyRes,
        milestonesRes,
        appointmentsRes,
        examsRes,
        medicationsRes,
        dosesRes,
        expensesRes,
        layetteRes,
        giftsRes,
        inventoryRes,
        movementsRes,
        babyRes,
        babyLogsRes,
        vaccinesRes,
        growthRes,
        documentsRes,
        memoriesRes,
      ] = await Promise.all([
          supabase.from("families").select("*").eq("id", currentMembership.family_id).maybeSingle(),
          supabase
            .from("family_members")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("created_at", { ascending: true }),
          supabase
            .from("family_invitations")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("created_at", { ascending: false }),
          supabase.from("family_permissions").select("*").eq("family_id", currentMembership.family_id),
          supabase
            .from("activity_logs")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("pregnancies")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("pregnancy_milestones")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("event_date", { ascending: true }),
          supabase
            .from("appointments")
            .select("*, attachments:appointment_attachments(*)")
            .eq("family_id", currentMembership.family_id)
            .order("scheduled_at", { ascending: false }),
          supabase
            .from("exams")
            .select("*, attachments:exam_attachments(*)")
            .eq("family_id", currentMembership.family_id)
            .order("created_at", { ascending: false }),
          supabase
            .from("medications")
            .select("*, attachments:medication_attachments(*)")
            .eq("family_id", currentMembership.family_id)
            .order("start_date", { ascending: false }),
          supabase
            .from("medication_doses")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("dose_date", { ascending: false })
            .order("dose_time", { ascending: true }),
          supabase
            .from("expenses")
            .select("*, attachments:expense_attachments(*)")
            .eq("family_id", currentMembership.family_id)
            .order("expense_date", { ascending: false }),
          supabase
            .from("layette_items")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("created_at", { ascending: true }),
          supabase
            .from("gifts")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("date_received", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("inventory_items")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("product_name", { ascending: true }),
          supabase
            .from("inventory_movements")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("occurred_at", { ascending: false })
            .limit(300),
          supabase
            .from("baby_profiles")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .maybeSingle(),
          // Diário de cuidados: os 300 registros mais recentes alimentam os
          // cards de "últimos acontecimentos" e a lista do dia.
          supabase
            .from("baby_logs")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("logged_at", { ascending: false })
            .limit(300),
          supabase
            .from("vaccines")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("expected_date", { ascending: true })
            .order("applied_date", { ascending: true }),
          supabase
            .from("growth_records")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("measurement_date", { ascending: true }),
          supabase
            .from("documents")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("memories")
            .select("*")
            .eq("family_id", currentMembership.family_id)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false }),
        ]);

      const firstError =
        familyRes.error ||
        membersRes.error ||
        invitesRes.error ||
        permissionsRes.error ||
        activityRes.error ||
        pregnancyRes.error ||
        milestonesRes.error ||
        appointmentsRes.error ||
        examsRes.error ||
        medicationsRes.error ||
        dosesRes.error ||
        expensesRes.error ||
        layetteRes.error ||
        giftsRes.error ||
        inventoryRes.error ||
        movementsRes.error ||
        babyRes.error ||
        babyLogsRes.error ||
        vaccinesRes.error ||
        growthRes.error ||
        documentsRes.error ||
        memoriesRes.error;

      if (firstError) setError(toMessage(firstError));

      const memberRows = (membersRes.data ?? []) as FamilyMember[];
      const logRows = (activityRes.data ?? []) as ActivityLog[];

      const profileIds = Array.from(
        new Set([
          ...memberRows.map((row) => row.user_id),
          ...logRows.map((row) => row.actor_id).filter((value): value is string => Boolean(value)),
        ]),
      );

      let profileRows: Profile[] = [];
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", profileIds);
        profileRows = (profilesData ?? []) as Profile[];
      }

      const profileMap = new Map(profileRows.map((profile) => [profile.id, profile]));

      // A central interna é recalculada a cada carga a partir das datas cadastradas.
      const { error: generateError } = await supabase.rpc("generate_family_notifications", {
        p_family_id: currentMembership.family_id,
      });

      // Não lidas nunca são cortadas pelo limite; das lidas mantemos só as recentes.
      const [unreadRes, readRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("family_id", currentMembership.family_id)
          .is("read_at", null)
          .order("due_at", { ascending: true, nullsFirst: false }),
        supabase
          .from("notifications")
          .select("*")
          .eq("family_id", currentMembership.family_id)
          .not("read_at", "is", null)
          .order("due_at", { ascending: false, nullsFirst: false })
          .limit(15),
      ]);

      const notificationsError = generateError || unreadRes.error || readRes.error;
      if (notificationsError) setError(toMessage(notificationsError));

      setNotifications([
        ...((unreadRes.data ?? []) as AppNotification[]),
        ...((readRes.data ?? []) as AppNotification[]),
      ]);
      setMembership(currentMembership);
      setFamily((familyRes.data as Family | null) ?? null);
      setMembers(
        memberRows.map((row) => ({ ...row, profile: profileMap.get(row.user_id) ?? null })),
      );
      setInvitations((invitesRes.data ?? []) as FamilyInvitation[]);
      setPermissions((permissionsRes.data ?? []) as FamilyPermission[]);
      setPregnancy((pregnancyRes.data as Pregnancy | null) ?? null);
      setMilestones((milestonesRes.data ?? []) as PregnancyMilestone[]);
      // Peso e medidas são `numeric` e podem voltar como texto pelo Data API.
      const babyRow = (babyRes.data as BabyProfile | null) ?? null;
      setBabyProfile(
        babyRow
          ? {
              ...babyRow,
              birth_weight: babyRow.birth_weight === null ? null : Number(babyRow.birth_weight),
              birth_height: babyRow.birth_height === null ? null : Number(babyRow.birth_height),
              head_circumference:
                babyRow.head_circumference === null ? null : Number(babyRow.head_circumference),
            }
          : null,
      );
      setBabyLogs(
        ((babyLogsRes.data ?? []) as BabyLog[]).map((log) => ({
          ...log,
          stock_quantity: log.stock_quantity === null ? null : Number(log.stock_quantity),
        })),
      );
      setVaccines((vaccinesRes.data ?? []) as Vaccine[]);
      // Peso e medidas são `numeric` e podem voltar como texto pelo Data API.
      setGrowthRecords(
        ((growthRes.data ?? []) as GrowthRecord[]).map((record) => ({
          ...record,
          weight: record.weight === null ? null : Number(record.weight),
          height: record.height === null ? null : Number(record.height),
          head_circumference:
            record.head_circumference === null ? null : Number(record.head_circumference),
        })),
      );
      setDocuments((documentsRes.data ?? []) as DocumentRecord[]);
      setMemories((memoriesRes.data ?? []) as Memory[]);
      setAppointments(
        ((appointmentsRes.data ?? []) as AppointmentWithAttachments[]).map((appointment) => ({
          ...appointment,
          attachments: [...(appointment.attachments ?? [])].sort((a, b) =>
            a.created_at.localeCompare(b.created_at),
          ),
        })),
      );
      setExams(
        ((examsRes.data ?? []) as ExamWithAttachments[]).map((exam) => ({
          ...exam,
          attachments: [...(exam.attachments ?? [])].sort((a, b) =>
            a.created_at.localeCompare(b.created_at),
          ),
        })),
      );
      setMedications(
        ((medicationsRes.data ?? []) as MedicationWithAttachments[]).map((medication) => ({
          ...medication,
          times: [...(medication.times ?? [])].sort(),
          attachments: [...(medication.attachments ?? [])].sort((a, b) =>
            a.created_at.localeCompare(b.created_at),
          ),
        })),
      );
      setDoses((dosesRes.data ?? []) as MedicationDose[]);
      setLayetteItems((layetteRes.data ?? []) as LayetteItem[]);
      // `stock_quantity` é `numeric` e pode voltar como texto pelo Data API.
      setGifts(
        ((giftsRes.data ?? []) as Gift[]).map((gift) => ({
          ...gift,
          stock_quantity:
            gift.stock_quantity === null ? null : Number(gift.stock_quantity),
        })),
      );
      // `numeric` pode voltar como texto pelo Data API: normaliza para número.
      setInventoryItems(
        ((inventoryRes.data ?? []) as InventoryItem[]).map((item) => ({
          ...item,
          current_quantity: Number(item.current_quantity),
          minimum_stock: Number(item.minimum_stock),
        })),
      );
      setInventoryMovements(
        ((movementsRes.data ?? []) as InventoryMovement[]).map((movement) => ({
          ...movement,
          quantity: Number(movement.quantity),
        })),
      );
      setExpenses(
        ((expensesRes.data ?? []) as ExpenseWithAttachments[]).map((expense) => ({
          ...expense,
          attachments: [...(expense.attachments ?? [])].sort((a, b) =>
            a.created_at.localeCompare(b.created_at),
          ),
        })),
      );
      setActivity(
        logRows.map((row) => ({
          ...row,
          actor: row.actor_id ? profileMap.get(row.actor_id) ?? null : null,
        })),
      );
      setLoading(false);
    },
    [clear, userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(false);
  }, [load]);

  const run = useCallback(
    async (action: () => PromiseLike<{ error: SupabaseError }>): Promise<Result> => {
      const { error: actionError } = await action();
      if (actionError) return { error: toMessage(actionError) };
      await load(true);
      return { error: null };
    },
    [load],
  );

  const createFamily = useCallback(
    async (input: CreateFamilyInput): Promise<Result> => {
      if (!userId) return { error: "Sessão expirada. Entre novamente." };

      const { error: createError } = await supabase.from("families").insert({
        name: input.name.trim(),
        city: input.city?.trim() || null,
        baby_name: input.babyName?.trim() || null,
        baby_due_date: input.babyDueDate || null,
        created_by: userId,
      });

      if (createError) return { error: toMessage(createError) };
      await load(true);
      return { error: null };
    },
    [load, userId],
  );

  const updateFamily = useCallback(
    async (patch: Partial<Family>): Promise<Result> => {
      if (!family) return { error: "Nenhuma família encontrada." };
      return run(() => supabase.from("families").update(patch).eq("id", family.id));
    },
    [family, run],
  );

  const deleteFamily = useCallback(async (): Promise<Result> => {
    if (!family) return { error: "Nenhuma família encontrada." };
    return run(() => supabase.from("families").delete().eq("id", family.id));
  }, [family, run]);

  const inviteMember = useCallback(
    async (email: string, role: FamilyRole): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const { error: inviteError } = await supabase.from("family_invitations").insert({
        family_id: family.id,
        email: email.trim().toLowerCase(),
        role,
        invited_by: userId,
      });

      if (inviteError) {
        if (inviteError.code === "23505") {
          return { error: "Já existe um convite pendente para este e-mail." };
        }
        return { error: toMessage(inviteError) };
      }

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const resendInvitation = useCallback(
    async (id: string): Promise<Result> => {
      const nextExpiration = new Date(Date.now() + WEEK_MS).toISOString();
      return run(() =>
        supabase
          .from("family_invitations")
          .update({ status: "pending", expires_at: nextExpiration })
          .eq("id", id),
      );
    },
    [run],
  );

  const cancelInvitation = useCallback(
    async (id: string): Promise<Result> =>
      run(() => supabase.from("family_invitations").update({ status: "canceled" }).eq("id", id)),
    [run],
  );

  const removeMember = useCallback(
    async (id: string): Promise<Result> => run(() => supabase.from("family_members").delete().eq("id", id)),
    [run],
  );

  const updateMemberRole = useCallback(
    async (id: string, role: FamilyRole): Promise<Result> =>
      run(() => supabase.from("family_members").update({ role }).eq("id", id)),
    [run],
  );

  const savePermissions = useCallback(
    async (rows: PermissionUpdate[]): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };
      if (rows.length === 0) return { error: null };

      const payload = rows.map((row) => ({
        family_id: family.id,
        role: row.role,
        permission: row.permission,
        allowed: row.allowed,
        updated_by: userId,
      }));

      return run(() =>
        supabase
          .from("family_permissions")
          .upsert(payload, { onConflict: "family_id,role,permission" }),
      );
    },
    [family, run, userId],
  );

  const savePregnancy = useCallback(
    async (input: PregnancyInput): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const payload = {
        family_id: family.id,
        reference_date: input.referenceDate,
        reference_type: input.referenceType,
        cycle_length: input.cycleLength,
        due_date: input.dueDate,
        notes: input.notes?.trim() || null,
      };

      const response = pregnancy
        ? await supabase.from("pregnancies").update(payload).eq("id", pregnancy.id)
        : await supabase
            .from("pregnancies")
            .insert({ ...payload, status: "active", created_by: userId });

      if (response.error) {
        if (response.error.code === "23505") {
          return { error: "Já existe uma gestação ativa nesta família." };
        }
        return { error: toMessage(response.error) };
      }

      await load(true);
      return { error: null };
    },
    [family, load, pregnancy, userId],
  );

  const deletePregnancy = useCallback(async (): Promise<Result> => {
    if (!pregnancy) return { error: "Nenhuma gestação registrada." };
    return run(() => supabase.from("pregnancies").delete().eq("id", pregnancy.id));
  }, [pregnancy, run]);

  const addMilestone = useCallback(
    async (input: MilestoneInput): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const { error: insertError } = await supabase.from("pregnancy_milestones").insert({
        family_id: family.id,
        title: input.title.trim(),
        event_date: input.eventDate,
        description: input.description?.trim() || null,
        created_by: userId,
      });

      if (insertError) return { error: toMessage(insertError) };

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const removeMilestone = useCallback(
    async (id: string): Promise<Result> =>
      run(() => supabase.from("pregnancy_milestones").delete().eq("id", id)),
    [run],
  );

  /**
   * O perfil existe uma única vez por família (`baby_profiles.family_id` é
   * único), então a tela apenas preenche ou atualiza o mesmo registro.
   * A data de nascimento aqui é o que libera Rotina, Vacinas e Crescimento.
   */
  const saveBabyProfile = useCallback(
    async (input: BabyProfileInput): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        name: input.name.trim(),
        birth_date: input.birthDate || null,
        // Horário do nascimento: "HH:MM" na interface e `time` no banco.
        birth_time: input.birthTime ? `${input.birthTime.slice(0, 5)}:00` : null,
        birth_weight: input.birthWeight ?? null,
        birth_height: input.birthHeight ?? null,
        head_circumference: input.headCircumference ?? null,
        maternity_hospital: cleanText(input.maternityHospital),
        pediatrician: cleanText(input.pediatrician),
        important_info: cleanText(input.importantInfo),
      };

      const response = babyProfile
        ? await supabase
            .from("baby_profiles")
            .update(payload)
            .eq("id", babyProfile.id)
            .select("id")
            .single()
        : await supabase
            .from("baby_profiles")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [babyProfile, family, load, userId],
  );

  const uploadBabyAvatar = useCallback(
    async (babyProfileId: string, file: File, previousPath?: string | null): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const path = `${family.id}/${babyProfileId}/${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(BABY_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });

      if (uploadError) return { error: uploadError.message };

      const { error: rowError } = await supabase
        .from("baby_profiles")
        .update({ avatar_url: path })
        .eq("id", babyProfileId);

      if (rowError) {
        await supabase.storage.from(BABY_BUCKET).remove([path]);
        return { error: toMessage(rowError) };
      }

      if (previousPath && previousPath !== path) {
        await supabase.storage.from(BABY_BUCKET).remove([previousPath]);
      }

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const removeBabyAvatar = useCallback(
    async (profile: BabyProfile): Promise<Result> => {
      if (!profile.avatar_url) return { error: null };

      const { error: storageError } = await supabase.storage
        .from(BABY_BUCKET)
        .remove([profile.avatar_url]);

      if (storageError) return { error: storageError.message };

      return run(() => supabase.from("baby_profiles").update({ avatar_url: null }).eq("id", profile.id));
    },
    [run],
  );

  /**
   * Registra um cuidado no diário. As variações de cada tipo vão em `details`
   * (JSONB) e quem registrou é sempre o usuário logado.
   */
  const saveBabyLog = useCallback(
    async (input: BabyLogInput): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const { error: logError } = await supabase.from("baby_logs").insert({
        family_id: family.id,
        user_id: userId,
        log_type: input.type,
        logged_at: input.loggedAt,
        details: input.details,
        notes: cleanText(input.notes),
        inventory_item_id: input.inventoryItemId ?? null,
        stock_quantity: input.stockQuantity ?? null,
      });

      if (logError) return { error: toMessage(logError) };

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const deleteBabyLog = useCallback(
    async (id: string): Promise<Result> => run(() => supabase.from("baby_logs").delete().eq("id", id)),
    [run],
  );

  const saveVaccine = useCallback(
    async (input: VaccineInput, id?: string): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        name: input.name.trim(),
        dose: cleanText(input.dose),
        expected_date: input.expectedDate || null,
        applied_date: input.appliedDate || null,
        location: cleanText(input.location),
        batch: cleanText(input.batch),
        professional: cleanText(input.professional),
        notes: cleanText(input.notes),
      };

      const response = id
        ? await supabase.from("vaccines").update(payload).eq("id", id).select("id").single()
        : await supabase
            .from("vaccines")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [family, load, userId],
  );

  const uploadVaccineProof = useCallback(
    async (vaccineId: string, file: File, previousPath?: string | null): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const path = `${family.id}/${vaccineId}/${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(VACCINE_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });

      if (uploadError) return { error: uploadError.message };

      const { error: rowError } = await supabase
        .from("vaccines")
        .update({ proof_path: path })
        .eq("id", vaccineId);

      if (rowError) {
        await supabase.storage.from(VACCINE_BUCKET).remove([path]);
        return { error: toMessage(rowError) };
      }

      if (previousPath && previousPath !== path) {
        await supabase.storage.from(VACCINE_BUCKET).remove([previousPath]);
      }

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const removeVaccineProof = useCallback(
    async (vaccine: Vaccine): Promise<Result> => {
      if (!vaccine.proof_path) return { error: null };

      const { error: storageError } = await supabase.storage
        .from(VACCINE_BUCKET)
        .remove([vaccine.proof_path]);

      if (storageError) return { error: storageError.message };

      return run(() => supabase.from("vaccines").update({ proof_path: null }).eq("id", vaccine.id));
    },
    [run],
  );

  const deleteVaccine = useCallback(
    async (id: string): Promise<Result> => {
      const target = vaccines.find((vaccine) => vaccine.id === id);
      if (target?.proof_path) {
        await supabase.storage.from(VACCINE_BUCKET).remove([target.proof_path]);
      }

      return run(() => supabase.from("vaccines").delete().eq("id", id));
    },
    [run, vaccines],
  );

  const saveGrowthRecord = useCallback(
    async (input: GrowthRecordInput, id?: string): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        measurement_date: input.measurementDate,
        weight: input.weight ?? null,
        height: input.height ?? null,
        head_circumference: input.headCircumference ?? null,
      };

      const response = id
        ? await supabase.from("growth_records").update(payload).eq("id", id).select("id").single()
        : await supabase
            .from("growth_records")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [family, load, userId],
  );

  const deleteGrowthRecord = useCallback(
    async (id: string): Promise<Result> =>
      run(() => supabase.from("growth_records").delete().eq("id", id)),
    [run],
  );

  /**
   * Documento da família: o arquivo vive no bucket privado `documents`
   * (caminho `<family_id>/<document_id>/<uuid>-<arquivo>`) e é aberto por URL
   * assinada. O upload acontece antes da linha; se a gravação falhar, o arquivo
   * é removido para não deixar lixo no storage.
   */
  const saveDocument = useCallback(
    async (input: DocumentInput, existing?: DocumentRecord): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      if (!existing && !input.file) {
        return { error: "Selecione o arquivo do documento.", id: null };
      }

      const documentId = existing?.id ?? crypto.randomUUID();
      let uploadedPath: string | null = null;

      if (input.file) {
        const path = `${family.id}/${documentId}/${crypto.randomUUID()}-${safeStorageFileName(input.file.name)}`;

        const { error: uploadError } = await supabase.storage
          .from(DOCUMENT_BUCKET)
          .upload(path, input.file, {
            contentType: input.file.type || undefined,
            upsert: false,
          });

        if (uploadError) return { error: uploadError.message, id: null };
        uploadedPath = path;
      }

      const payload = {
        name: input.name.trim(),
        category: input.category,
        date: input.date,
        description: cleanText(input.description),
        ...(uploadedPath ? { file_path: uploadedPath } : {}),
      };

      const response = existing
        ? await supabase
            .from("documents")
            .update(payload)
            .eq("id", existing.id)
            .select("id")
            .single()
        : await supabase
            .from("documents")
            .insert({
              ...payload,
              id: documentId,
              family_id: family.id,
              created_by: userId,
              file_path: uploadedPath,
            })
            .select("id")
            .single();

      if (response.error) {
        if (uploadedPath) {
          await supabase.storage.from(DOCUMENT_BUCKET).remove([uploadedPath]);
        }
        return { error: toMessage(response.error), id: null };
      }

      // Arquivo substituído: o antigo sai do storage depois que a linha foi salva.
      if (uploadedPath && existing?.file_path && existing.file_path !== uploadedPath) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove([existing.file_path]);
      }

      await load(true);
      return { error: null, id: documentId };
    },
    [family, load, userId],
  );

  const deleteDocument = useCallback(
    async (document: DocumentRecord): Promise<Result> => {
      const { error: storageError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([document.file_path]);

      if (storageError) return { error: storageError.message };

      return run(() => supabase.from("documents").delete().eq("id", document.id));
    },
    [run],
  );

  /**
   * Memória da linha do tempo: a foto ou o vídeo fica no bucket privado
   * `memories` (caminho `<family_id>/<memory_id>/<uuid>-<arquivo>`) e é aberto
   * por URL assinada. O upload acontece antes da linha; se a gravação falhar, o
   * arquivo é removido para não deixar lixo no storage.
   */
  const saveMemory = useCallback(
    async (input: MemoryInput, existing?: Memory): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const memoryId = existing?.id ?? crypto.randomUUID();
      let uploadedPath: string | null = null;

      if (input.media) {
        const path = `${family.id}/${memoryId}/${crypto.randomUUID()}-${safeStorageFileName(input.media.name)}`;

        const { error: uploadError } = await supabase.storage
          .from(MEMORY_BUCKET)
          .upload(path, input.media, {
            contentType: input.media.type || undefined,
            upsert: false,
          });

        if (uploadError) return { error: uploadError.message, id: null };
        uploadedPath = path;
      }

      const payload = {
        title: input.title.trim(),
        date: input.date,
        category: input.category,
        description: cleanText(input.description),
        media_path:
          uploadedPath ?? (input.removeMedia ? null : existing?.media_path ?? null),
      };

      const response = existing
        ? await supabase
            .from("memories")
            .update(payload)
            .eq("id", existing.id)
            .select("id")
            .single()
        : await supabase
            .from("memories")
            .insert({ ...payload, id: memoryId, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) {
        if (uploadedPath) {
          await supabase.storage.from(MEMORY_BUCKET).remove([uploadedPath]);
        }
        return { error: toMessage(response.error), id: null };
      }

      // Mídia substituída ou removida: o arquivo antigo sai depois que a linha foi salva.
      if (
        (uploadedPath || input.removeMedia) &&
        existing?.media_path &&
        existing.media_path !== uploadedPath
      ) {
        await supabase.storage.from(MEMORY_BUCKET).remove([existing.media_path]);
      }

      await load(true);
      return { error: null, id: memoryId };
    },
    [family, load, userId],
  );

  const deleteMemory = useCallback(
    async (memory: Memory): Promise<Result> => {
      if (memory.media_path) {
        await supabase.storage.from(MEMORY_BUCKET).remove([memory.media_path]);
      }

      return run(() => supabase.from("memories").delete().eq("id", memory.id));
    },
    [run],
  );

  /**
   * O coração é independente da permissão de editar registros: a RPC só alterna
   * `is_favorite` e exige apenas que a pessoa seja membro ativo da família.
   */
  const toggleMemoryFavorite = useCallback(async (memory: Memory): Promise<Result> => {
    if (!family) return { error: "Nenhuma família encontrada." };

    const { data, error: favoriteError } = await supabase.rpc("toggle_memory_favorite", {
      p_memory_id: memory.id,
    });

    if (favoriteError) return { error: toMessage(favoriteError) };

    const isFavorite = Boolean(data);
    setMemories((current) =>
      current.map((item) => (item.id === memory.id ? { ...item, is_favorite: isFavorite } : item)),
    );

    return { error: null };
  }, [family]);

  const saveAppointment = useCallback(
    async (input: AppointmentInput, id?: string): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        doctor_name: input.doctorName.trim(),
        specialty: cleanText(input.specialty),
        clinic: cleanText(input.clinic),
        address: cleanText(input.address),
        scheduled_at: input.scheduledAt,
        reason: cleanText(input.reason),
        notes: cleanText(input.notes),
        recommendations: cleanText(input.recommendations),
        status: input.status,
        // O custo só existe quando a consulta é particular; o banco gera a despesa.
        is_private: input.isPrivate,
        cost_cents: input.isPrivate ? input.costCents ?? null : null,
      };

      const response = id
        ? await supabase.from("appointments").update(payload).eq("id", id).select("id").single()
        : await supabase
            .from("appointments")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [family, load, userId],
  );

  const uploadAppointmentFiles = useCallback(
    async (appointmentId: string, files: File[]): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };
      if (files.length === 0) return { error: null };

      for (const file of files) {
        const path = `${family.id}/${appointmentId}/${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;

        const { error: uploadError } = await supabase.storage
          .from(APPOINTMENT_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });

        if (uploadError) return { error: uploadError.message };

        const { error: rowError } = await supabase.from("appointment_attachments").insert({
          appointment_id: appointmentId,
          family_id: family.id,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: userId,
        });

        if (rowError) {
          await supabase.storage.from(APPOINTMENT_BUCKET).remove([path]);
          return { error: toMessage(rowError) };
        }
      }

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const removeAppointmentAttachment = useCallback(
    async (attachment: AppointmentAttachment): Promise<Result> => {
      const { error: storageError } = await supabase.storage
        .from(APPOINTMENT_BUCKET)
        .remove([attachment.storage_path]);

      if (storageError) return { error: storageError.message };

      return run(() => supabase.from("appointment_attachments").delete().eq("id", attachment.id));
    },
    [run],
  );

  const deleteAppointment = useCallback(
    async (id: string): Promise<Result> => {
      const target = appointments.find((appointment) => appointment.id === id);
      const paths = target?.attachments.map((attachment) => attachment.storage_path) ?? [];

      if (paths.length > 0) {
        await supabase.storage.from(APPOINTMENT_BUCKET).remove(paths);
      }

      return run(() => supabase.from("appointments").delete().eq("id", id));
    },
    [appointments, run],
  );

  const saveExam = useCallback(
    async (input: ExamInput, id?: string): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        name: input.name.trim(),
        requested_date: input.requestedDate || null,
        scheduled_date: input.scheduledDate || null,
        performed_date: input.performedDate || null,
        doctor_name: cleanText(input.doctorName),
        lab: cleanText(input.lab),
        result: cleanText(input.result),
        notes: cleanText(input.notes),
        // O custo só existe quando o exame é particular; o banco gera a despesa.
        is_private: input.isPrivate,
        cost_cents: input.isPrivate ? input.costCents ?? null : null,
      };

      const response = id
        ? await supabase.from("exams").update(payload).eq("id", id).select("id").single()
        : await supabase
            .from("exams")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [family, load, userId],
  );

  const uploadExamFiles = useCallback(
    async (examId: string, files: File[]): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };
      if (files.length === 0) return { error: null };

      for (const file of files) {
        const path = `${family.id}/${examId}/${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;

        const { error: uploadError } = await supabase.storage
          .from(EXAM_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });

        if (uploadError) return { error: uploadError.message };

        const { error: rowError } = await supabase.from("exam_attachments").insert({
          exam_id: examId,
          family_id: family.id,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: userId,
        });

        if (rowError) {
          await supabase.storage.from(EXAM_BUCKET).remove([path]);
          return { error: toMessage(rowError) };
        }
      }

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const removeExamAttachment = useCallback(
    async (attachment: ExamAttachment): Promise<Result> => {
      const { error: storageError } = await supabase.storage
        .from(EXAM_BUCKET)
        .remove([attachment.storage_path]);

      if (storageError) return { error: storageError.message };

      return run(() => supabase.from("exam_attachments").delete().eq("id", attachment.id));
    },
    [run],
  );

  const deleteExam = useCallback(
    async (id: string): Promise<Result> => {
      const target = exams.find((exam) => exam.id === id);
      const paths = target?.attachments.map((attachment) => attachment.storage_path) ?? [];

      if (paths.length > 0) {
        await supabase.storage.from(EXAM_BUCKET).remove(paths);
      }

      return run(() => supabase.from("exams").delete().eq("id", id));
    },
    [exams, run],
  );

  const saveMedication = useCallback(
    async (input: MedicationInput, id?: string): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        name: input.name.trim(),
        dosage: input.dosage.trim(),
        dosage_unit: input.dosageUnit.trim(),
        // Horários do dia são "HH:MM" na interface e `time` no banco.
        times: [...new Set(input.times)].sort().map((time) => `${time.slice(0, 5)}:00`),
        frequency: input.frequency,
        start_date: input.startDate,
        end_date: input.endDate || null,
        doctor_name: cleanText(input.doctorName),
        // Valor opcional: sem ele, nenhuma despesa é criada em `saude`.
        cost_cents: input.costCents ?? null,
      };

      const response = id
        ? await supabase.from("medications").update(payload).eq("id", id).select("id").single()
        : await supabase
            .from("medications")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [family, load, userId],
  );

  const uploadMedicationFiles = useCallback(
    async (medicationId: string, files: File[]): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };
      if (files.length === 0) return { error: null };

      for (const file of files) {
        const path = `${family.id}/${medicationId}/${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;

        const { error: uploadError } = await supabase.storage
          .from(PRESCRIPTION_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });

        if (uploadError) return { error: uploadError.message };

        const { error: rowError } = await supabase.from("medication_attachments").insert({
          medication_id: medicationId,
          family_id: family.id,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: userId,
        });

        if (rowError) {
          await supabase.storage.from(PRESCRIPTION_BUCKET).remove([path]);
          return { error: toMessage(rowError) };
        }
      }

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const removeMedicationAttachment = useCallback(
    async (attachment: MedicationAttachment): Promise<Result> => {
      const { error: storageError } = await supabase.storage
        .from(PRESCRIPTION_BUCKET)
        .remove([attachment.storage_path]);

      if (storageError) return { error: storageError.message };

      return run(() => supabase.from("medication_attachments").delete().eq("id", attachment.id));
    },
    [run],
  );

  const deleteMedication = useCallback(
    async (id: string): Promise<Result> => {
      const target = medications.find((medication) => medication.id === id);
      const paths = target?.attachments.map((attachment) => attachment.storage_path) ?? [];

      if (paths.length > 0) {
        await supabase.storage.from(PRESCRIPTION_BUCKET).remove(paths);
      }

      return run(() => supabase.from("medications").delete().eq("id", id));
    },
    [medications, run],
  );

  /**
   * Registra a dose do checklist. Quem confirma é sempre o usuário logado
   * (`confirmed_by` + `confirmed_at`), formando o histórico de adesão.
   */
  const markDose = useCallback(
    async (input: DoseInput): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const { error: doseError } = await supabase.from("medication_doses").upsert(
        {
          family_id: family.id,
          medication_id: input.medicationId,
          dose_date: input.date,
          dose_time: `${input.time.slice(0, 5)}:00`,
          status: input.status,
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: "medication_id,dose_date,dose_time" },
      );

      if (doseError) return { error: toMessage(doseError) };

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const markNotificationRead = useCallback(
    async (id: string): Promise<Result> => {
      if (!userId) return { error: "Sessão expirada. Entre novamente." };

      const readAt = new Date().toISOString();
      const { error: readError } = await supabase
        .from("notifications")
        .update({ read_at: readAt, read_by: userId })
        .eq("id", id)
        .is("read_at", null);

      if (readError) return { error: toMessage(readError) };

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id && !notification.read_at
            ? { ...notification, read_at: readAt, read_by: userId }
            : notification,
        ),
      );
      return { error: null };
    },
    [userId],
  );

  const markAllNotificationsRead = useCallback(async (): Promise<Result> => {
    if (!family || !userId) return { error: "Nenhuma família encontrada." };

    const readAt = new Date().toISOString();
    const { error: readError } = await supabase
      .from("notifications")
      .update({ read_at: readAt, read_by: userId })
      .eq("family_id", family.id)
      .is("read_at", null);

    if (readError) return { error: toMessage(readError) };

    setNotifications((current) =>
      current.map((notification) =>
        notification.read_at
          ? notification
          : { ...notification, read_at: readAt, read_by: userId },
      ),
    );
    return { error: null };
  }, [family, userId]);

  const saveExpense = useCallback(
    async (input: ExpenseInput, id?: string): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        expense_date: input.date,
        name: input.name.trim(),
        category: input.category,
        description: cleanText(input.description),
        amount_cents: input.amountCents,
        paid_by: cleanText(input.paidBy),
        store: cleanText(input.store),
        notes: cleanText(input.notes),
      };

      const response = id
        ? await supabase.from("expenses").update(payload).eq("id", id).select("id").single()
        : await supabase
            .from("expenses")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [family, load, userId],
  );

  const uploadExpenseFiles = useCallback(
    async (expenseId: string, files: File[]): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };
      if (files.length === 0) return { error: null };

      for (const file of files) {
        const path = `${family.id}/${expenseId}/${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;

        const { error: uploadError } = await supabase.storage
          .from(RECEIPT_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });

        if (uploadError) return { error: uploadError.message };

        const { error: rowError } = await supabase.from("expense_attachments").insert({
          expense_id: expenseId,
          family_id: family.id,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: userId,
        });

        if (rowError) {
          await supabase.storage.from(RECEIPT_BUCKET).remove([path]);
          return { error: toMessage(rowError) };
        }
      }

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const removeExpenseAttachment = useCallback(
    async (attachment: ExpenseAttachment): Promise<Result> => {
      const { error: storageError } = await supabase.storage
        .from(RECEIPT_BUCKET)
        .remove([attachment.storage_path]);

      if (storageError) return { error: storageError.message };

      return run(() => supabase.from("expense_attachments").delete().eq("id", attachment.id));
    },
    [run],
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<Result> => {
      const target = expenses.find((expense) => expense.id === id);
      const paths = target?.attachments.map((attachment) => attachment.storage_path) ?? [];

      if (paths.length > 0) {
        await supabase.storage.from(RECEIPT_BUCKET).remove(paths);
      }

      return run(() => supabase.from("expenses").delete().eq("id", id));
    },
    [expenses, run],
  );

  const saveLayetteItem = useCallback(
    async (input: LayetteInput, id?: string): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        name: input.name.trim(),
        category: input.category,
        desired_quantity: input.desiredQuantity,
        purchased_quantity: input.purchasedQuantity,
        estimated_price_cents: input.estimatedPriceCents,
        actual_price_cents: input.actualPriceCents,
        store_link: cleanText(input.storeLink),
        responsible: cleanText(input.responsible),
        status: input.status,
        notes: cleanText(input.notes),
      };

      const response = id
        ? await supabase.from("layette_items").update(payload).eq("id", id).select("id").single()
        : await supabase
            .from("layette_items")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [family, load, userId],
  );

  const deleteLayetteItem = useCallback(
    async (id: string): Promise<Result> =>
      run(() => supabase.from("layette_items").delete().eq("id", id)),
    [run],
  );

  /**
   * Regra de negócio da compra: a quantidade comprada é somada no item (que só
   * fica concluído quando alcança a quantidade desejada) e a mesma operação
   * lança a despesa no Financeiro. Roda inteira no banco
   * (`purchase_layette_item`), para não existir compra sem gasto.
   */
  const purchaseLayetteItem = useCallback(
    async (input: LayettePurchaseInput): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const { error: purchaseError } = await supabase.rpc("purchase_layette_item", {
        p_layette_item_id: input.layetteItemId,
        p_quantity: input.quantity,
        p_total_cents: input.totalCents,
        p_paid_by: cleanText(input.paidBy),
        p_purchase_date: input.purchaseDate,
      });

      if (purchaseError) return { error: toMessage(purchaseError) };

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const saveGift = useCallback(
    async (input: GiftInput, id?: string): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        product_name: input.productName.trim(),
        date_received: input.dateReceived,
        giver_name: cleanText(input.giverName),
        quantity: input.quantity,
        description: cleanText(input.description),
        notes: cleanText(input.notes),
        layette_item_id: input.layetteItemId || null,
        inventory_item_id: input.inventoryItemId || null,
        stock_quantity: input.inventoryItemId ? input.stockQuantity ?? null : null,
        // Sem valor, o trigger `sync_gift_expense` remove a despesa derivada.
        cost_cents: input.costCents ?? null,
      };

      // O vínculo com o enxoval é aplicado no banco (trigger `apply_gift_layette`):
      // as unidades recebidas são SOMADAS na quantidade do item, sem fechar o item
      // inteiro. A entrada no estoque também é do banco (`apply_gift_stock`) e a
      // despesa só existe quando há custo (`sync_gift_expense`).
      const response = id
        ? await supabase.from("gifts").update(payload).eq("id", id).select("id").single()
        : await supabase
            .from("gifts")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [family, load, userId],
  );

  const uploadGiftPhoto = useCallback(
    async (giftId: string, file: File, previousPath?: string | null): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const path = `${family.id}/${giftId}/${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(GIFT_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });

      if (uploadError) return { error: uploadError.message };

      const { error: rowError } = await supabase
        .from("gifts")
        .update({ photo_path: path })
        .eq("id", giftId);

      if (rowError) {
        await supabase.storage.from(GIFT_BUCKET).remove([path]);
        return { error: toMessage(rowError) };
      }

      if (previousPath && previousPath !== path) {
        await supabase.storage.from(GIFT_BUCKET).remove([previousPath]);
      }

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const removeGiftPhoto = useCallback(
    async (gift: Gift): Promise<Result> => {
      if (!gift.photo_path) return { error: null };

      const { error: storageError } = await supabase.storage
        .from(GIFT_BUCKET)
        .remove([gift.photo_path]);

      if (storageError) return { error: storageError.message };

      return run(() => supabase.from("gifts").update({ photo_path: null }).eq("id", gift.id));
    },
    [run],
  );

  const deleteGift = useCallback(
    async (id: string): Promise<Result> => {
      const target = gifts.find((gift) => gift.id === id);
      if (target?.photo_path) {
        await supabase.storage.from(GIFT_BUCKET).remove([target.photo_path]);
      }

      return run(() => supabase.from("gifts").delete().eq("id", id));
    },
    [gifts, run],
  );

  const saveInventoryItem = useCallback(
    async (input: InventoryInput, id?: string): Promise<SaveResult> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada.", id: null };

      const payload = {
        product_name: input.productName.trim(),
        brand: cleanText(input.brand),
        size: cleanText(input.size),
        current_quantity: input.currentQuantity,
        unit: input.unit,
        minimum_stock: input.minimumStock,
      };

      const response = id
        ? await supabase
            .from("inventory_items")
            .update(payload)
            .eq("id", id)
            .select("id")
            .single()
        : await supabase
            .from("inventory_items")
            .insert({ ...payload, family_id: family.id, created_by: userId })
            .select("id")
            .single();

      if (response.error) return { error: toMessage(response.error), id: null };

      await load(true);
      return { error: null, id: (response.data as { id: string } | null)?.id ?? null };
    },
    [family, load, userId],
  );

  const deleteInventoryItem = useCallback(
    async (id: string): Promise<Result> =>
      run(() => supabase.from("inventory_items").delete().eq("id", id)),
    [run],
  );

  /**
   * Registra a movimentação no histórico. Quem soma/subtrai no estoque é o
   * trigger `apply_inventory_movement` no banco — o cliente nunca escreve
   * `current_quantity` diretamente.
   */
  const addInventoryMovement = useCallback(
    async (input: InventoryMovementInput): Promise<Result> => {
      if (!family || !userId) return { error: "Nenhuma família encontrada." };

      const { error: movementError } = await supabase.from("inventory_movements").insert({
        family_id: family.id,
        inventory_item_id: input.inventoryItemId,
        movement_type: input.movementType,
        quantity: input.quantity,
        occurred_at: input.occurredAt,
        user_id: userId,
        notes: cleanText(input.notes),
      });

      if (movementError) return { error: toMessage(movementError) };

      await load(true);
      return { error: null };
    },
    [family, load, userId],
  );

  const can = useCallback(
    (permission: PermissionKey) => {
      if (!membership) return false;
      if (membership.role === "owner" || membership.role === "admin") return true;
      return permissions.some(
        (row) => row.role === membership.role && row.permission === permission && row.allowed,
      );
    },
    [membership, permissions],
  );

  const activeMembersCount = members.filter((member) => member.status === "active").length;
  const unreadNotificationsCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;
  const pendingInvitationsCount = invitations.filter(
    (invite) => invite.status === "pending" && new Date(invite.expires_at).getTime() > Date.now(),
  ).length;

  const value = useMemo<FamilyContextValue>(
    () => ({
      loading,
      error,
      family,
      membership,
      members,
      invitations,
      permissions,
      activity,
      pregnancy,
      milestones,
      babyProfile,
      babyLogs,
      vaccines,
      growthRecords,
      documents,
      memories,
      appointments,
      exams,
      medications,
      doses,
      expenses,
      layetteItems,
      gifts,
      inventoryItems,
      inventoryMovements,
      notifications,
      unreadNotificationsCount,
      activeMembersCount,
      pendingInvitationsCount,
      can,
      refresh,
      createFamily,
      updateFamily,
      deleteFamily,
      inviteMember,
      resendInvitation,
      cancelInvitation,
      removeMember,
      updateMemberRole,
      savePermissions,
      savePregnancy,
      deletePregnancy,
      addMilestone,
      removeMilestone,
      saveAppointment,
      deleteAppointment,
      uploadAppointmentFiles,
      removeAppointmentAttachment,
      saveExam,
      deleteExam,
      uploadExamFiles,
      removeExamAttachment,
      saveMedication,
      deleteMedication,
      uploadMedicationFiles,
      removeMedicationAttachment,
      markDose,
      markNotificationRead,
      markAllNotificationsRead,
      saveExpense,
      deleteExpense,
      uploadExpenseFiles,
      removeExpenseAttachment,
      saveLayetteItem,
      deleteLayetteItem,
      purchaseLayetteItem,
      saveGift,
      deleteGift,
      uploadGiftPhoto,
      removeGiftPhoto,
      saveInventoryItem,
      deleteInventoryItem,
      addInventoryMovement,
      saveBabyProfile,
      uploadBabyAvatar,
      removeBabyAvatar,
      saveBabyLog,
      deleteBabyLog,
      saveVaccine,
      deleteVaccine,
      uploadVaccineProof,
      removeVaccineProof,
      saveGrowthRecord,
      deleteGrowthRecord,
      saveDocument,
      deleteDocument,
      saveMemory,
      deleteMemory,
      toggleMemoryFavorite,
    }),
    [
      loading,
      error,
      family,
      membership,
      members,
      invitations,
      permissions,
      activity,
      pregnancy,
      milestones,
      babyProfile,
      babyLogs,
      vaccines,
      growthRecords,
      documents,
      memories,
      appointments,
      exams,
      medications,
      doses,
      expenses,
      layetteItems,
      gifts,
      inventoryItems,
      inventoryMovements,
      notifications,
      unreadNotificationsCount,
      activeMembersCount,
      pendingInvitationsCount,
      can,
      refresh,
      createFamily,
      updateFamily,
      deleteFamily,
      inviteMember,
      resendInvitation,
      cancelInvitation,
      removeMember,
      updateMemberRole,
      savePermissions,
      savePregnancy,
      deletePregnancy,
      addMilestone,
      removeMilestone,
      saveAppointment,
      deleteAppointment,
      uploadAppointmentFiles,
      removeAppointmentAttachment,
      saveExam,
      deleteExam,
      uploadExamFiles,
      removeExamAttachment,
      saveMedication,
      deleteMedication,
      uploadMedicationFiles,
      removeMedicationAttachment,
      markDose,
      markNotificationRead,
      markAllNotificationsRead,
      saveExpense,
      deleteExpense,
      uploadExpenseFiles,
      removeExpenseAttachment,
      saveLayetteItem,
      deleteLayetteItem,
      purchaseLayetteItem,
      saveGift,
      deleteGift,
      uploadGiftPhoto,
      removeGiftPhoto,
      saveInventoryItem,
      deleteInventoryItem,
      addInventoryMovement,
      saveBabyProfile,
      uploadBabyAvatar,
      removeBabyAvatar,
      saveBabyLog,
      deleteBabyLog,
      saveVaccine,
      deleteVaccine,
      uploadVaccineProof,
      removeVaccineProof,
      saveGrowthRecord,
      deleteGrowthRecord,
      saveDocument,
      deleteDocument,
      saveMemory,
      deleteMemory,
      toggleMemoryFavorite,
    ],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamily precisa ser usado dentro de um FamilyProvider");
  }
  return context;
}
