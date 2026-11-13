-- ============================================================================
-- Nosso Bebê — esquema do Supabase
-- Tabelas, relacionamentos, funções de apoio, triggers e Row Level Security.
--
-- Regra central de segurança: toda linha pertence a uma família e o acesso é
-- sempre derivado da participação ativa do usuário em family_members.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensões e tipos
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

create type public.family_role as enum ('owner', 'admin', 'caregiver', 'viewer');

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'declined',
  'canceled',
  'expired'
);

create type public.permission_key as enum (
  'family.edit',
  'family.delete',
  'members.invite',
  'members.manage',
  'permissions.manage',
  'records.view',
  'records.create',
  'records.edit',
  'records.delete',
  'calendar.manage',
  'data.export'
);

-- ---------------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------------

-- A família é a raiz do isolamento de dados.
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  city text,
  timezone text not null default 'America/Sao_Paulo',
  baby_name text,
  baby_due_date date,
  baby_birth_date date,
  baby_gender text check (baby_gender in ('menina', 'menino', 'surpresa')),
  notification_settings jsonb not null
    default '{"push": true, "weekly": true, "photos": true, "history": false}'::jsonb,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfil 1:1 com auth.users. family_id aponta a família principal do usuário
-- e é sincronizado a partir de family_members (fonte de verdade do acesso).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Participação do usuário na família: define o papel e alimenta todas as RLS.
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.family_role not null default 'viewer',
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_members_unique_member unique (family_id, user_id)
);

-- Convites por e-mail, com token de uso único e expiração.
create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.family_role not null default 'viewer',
  status public.invitation_status not null default 'pending',
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Matriz de permissões por papel dentro de cada família.
create table public.family_permissions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  role public.family_role not null,
  permission public.permission_key not null,
  allowed boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_permissions_unique_rule unique (family_id, role, permission)
);

-- Gestação ativa da família: DUM (ou data de referência) e DPP.
-- Apenas um registro ativo por família (índice único parcial abaixo).
create table public.pregnancies (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  reference_date date not null,
  reference_type text not null default 'dum' check (reference_type in ('dum', 'reference')),
  cycle_length integer not null default 28 check (cycle_length between 20 and 45),
  due_date date not null,
  status text not null default 'active' check (status in ('active', 'ended')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Marcos personalizados da gestação (memórias criadas pela família).
-- A linha do tempo do app combina estes marcos com as etapas padrão do pré-natal.
create table public.pregnancy_milestones (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  event_date date not null,
  description text check (description is null or char_length(description) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfil do bebê: um registro por família (`family_id` é único). `avatar_url`
-- guarda o **caminho** do arquivo no bucket privado `baby` (a foto é aberta por
-- URL assinada, nunca por URL pública). Regra de negócio do app: enquanto
-- `birth_date` estiver vazio, os módulos Rotina, Vacinas e Crescimento ficam
-- bloqueados. A data também é espelhada em `families.baby_birth_date` pelo
-- trigger `sync_family_baby_profile`, que alimenta o resumo da tela inicial.
create table public.baby_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  birth_date date,
  birth_time time,
  -- peso em kg; comprimento e perímetro cefálico em cm
  birth_weight numeric(5,2)
    check (birth_weight is null or (birth_weight > 0.2 and birth_weight <= 30)),
  birth_height numeric(5,1)
    check (birth_height is null or (birth_height between 20 and 100)),
  head_circumference numeric(5,1)
    check (head_circumference is null or (head_circumference between 20 and 60)),
  maternity_hospital text
    check (maternity_hospital is null or char_length(btrim(maternity_hospital)) between 1 and 160),
  pediatrician text
    check (pediatrician is null or char_length(btrim(pediatrician)) between 1 and 120),
  important_info text
    check (important_info is null or char_length(important_info) <= 2000),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint baby_profiles_one_per_family unique (family_id)
);

-- Diário de cuidados do bebê. Cada linha é um acontecimento do dia a dia e as
-- variações de cada tipo vivem no JSONB `details` (fralda: xixi/coco;
-- mamadeira: volume_ml/milk_type; sono: started_at/ended_at; etc.). `user_id`
-- é sempre quem registrou. Sem data de nascimento no perfil, o app bloqueia a
-- tela de Rotina (`BabyModuleGate`), mas a tabela aceita qualquer data.
create table public.baby_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  log_type text not null check (log_type in (
    'fralda', 'mamadeira', 'amamentacao', 'sono', 'banho',
    'medicamento', 'temperatura', 'evacuacao', 'outro'
  )),
  logged_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  notes text check (notes is null or char_length(notes) <= 1000),
  -- Troca de fralda pode baixar um produto do estoque (opcional). A baixa é
  -- feita pelo trigger `apply_diaper_stock`, nunca pelo cliente.
  inventory_item_id uuid references public.inventory_items (id) on delete set null,
  stock_quantity numeric(10,2),
  created_at timestamptz not null default now(),
  constraint baby_logs_details_object_check check (jsonb_typeof(details) = 'object'),
  -- O produto pode ser excluído depois (o vínculo fica nulo e a quantidade
  -- permanece como histórico da troca).
  constraint baby_logs_stock_link_check check (
    stock_quantity is null or (stock_quantity > 0 and stock_quantity <= 10000)
  ),
  constraint baby_logs_stock_fralda_check check (
    inventory_item_id is null or log_type = 'fralda'
  )
);

-- Vacinas do bebê. `expected_date` é a previsão e `applied_date` a aplicação;
-- ao menos uma delas precisa existir. O status (aplicada / atrasada / prevista)
-- é derivado no app em `src/lib/vaccines.ts`. O comprovante fica no bucket
-- privado `vaccines` e o caminho é guardado em `proof_path`.
create table public.vaccines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  dose text check (dose is null or char_length(btrim(dose)) between 1 and 40),
  expected_date date,
  applied_date date,
  location text check (location is null or char_length(btrim(location)) between 1 and 160),
  batch text check (batch is null or char_length(btrim(batch)) between 1 and 60),
  professional text
    check (professional is null or char_length(btrim(professional)) between 1 and 120),
  proof_path text check (proof_path is null or char_length(proof_path) <= 500),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vaccines_date_check check (expected_date is not null or applied_date is not null)
);

-- Medidas do bebê ao longo do tempo: peso em kg (numeric(5,2)) e altura /
-- perímetro cefálico em cm (numeric(5,1)). Pelo menos uma medida é obrigatória.
create table public.growth_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  weight numeric(5,2) check (weight is null or (weight > 0.2 and weight <= 60)),
  height numeric(5,1) check (height is null or (height between 20 and 140)),
  head_circumference numeric(5,1)
    check (head_circumference is null or (head_circumference between 20 and 70)),
  measurement_date date not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_records_measure_check check (
    weight is not null or height is not null or head_circumference is not null
  )
);

-- Central de documentos da família. `file_path` aponta para o bucket privado
-- `documents` e o arquivo só é aberto por URL assinada (createSignedUrl).
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null check (category in (
    'exames', 'vacinas', 'gestacao', 'identidade', 'financeiro', 'outros'
  )),
  date date not null,
  description text check (description is null or char_length(description) <= 1000),
  file_path text not null check (char_length(btrim(file_path)) between 1 and 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Linha do tempo de memórias da família. `media_path` aponta para o bucket
-- privado `memories` (foto ou vídeo) e só é aberto por URL assinada.
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  date date not null,
  description text check (description is null or char_length(description) <= 1000),
  category text not null check (category in (
    'primeiro_ultrassom', 'nascimento', 'primeiro_banho', 'primeiro_sorriso',
    'primeira_palavra', 'primeiros_passos', 'primeira_comida', 'primeira_viagem',
    'aniversario', 'outros'
  )),
  media_path text
    check (media_path is null or char_length(btrim(media_path)) between 1 and 500),
  is_favorite boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Consultas médicas da gestação. `scheduled_at` é um instante (timestamptz):
-- o app envia o horário local convertido para UTC pelo input datetime-local.
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  doctor_name text not null check (char_length(btrim(doctor_name)) between 1 and 120),
  specialty text,
  clinic text,
  address text,
  scheduled_at timestamptz not null,
  reason text,
  notes text,
  recommendations text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'done', 'canceled', 'rescheduled')),
  -- Consulta particular: o custo, quando informado, gera despesa no Financeiro.
  is_private boolean not null default false,
  cost_cents integer
    check (cost_cents is null or (cost_cents > 0 and cost_cents <= 1000000000)),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Metadados dos arquivos anexados às consultas (o binário fica no bucket privado).
create table public.appointment_attachments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes integer check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Exames do pré-natal. As datas são dias de calendário ("AAAA-MM-DD") e podem
-- ser preenchidas conforme o exame avança (solicitado -> agendado -> realizado).
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  requested_date date,
  scheduled_date date,
  performed_date date,
  doctor_name text,
  lab text,
  result text,
  notes text,
  -- Exame particular: o custo, quando informado, gera despesa no Financeiro.
  is_private boolean not null default false,
  cost_cents integer
    check (cost_cents is null or (cost_cents > 0 and cost_cents <= 1000000000)),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exam_attachments (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes integer check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Vitaminas e medicamentos cadastrados pela família (nunca sugeridos pelo app).
-- `times` guarda os horários do dia; `frequency` define em quais dias eles valem.
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  dosage text not null check (char_length(btrim(dosage)) between 1 and 40),
  dosage_unit text not null check (char_length(btrim(dosage_unit)) between 1 and 40),
  times time[] not null default '{}',
  frequency text not null default 'daily'
    check (frequency in ('daily', 'every_other_day', 'weekly', 'as_needed')),
  start_date date not null,
  end_date date,
  doctor_name text,
  -- Valor opcional do medicamento/vitamina: quando preenchido, gera despesa em `saude`.
  cost_cents integer
    check (cost_cents is null or (cost_cents > 0 and cost_cents <= 1000000000)),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medications_period_check check (end_date is null or end_date >= start_date)
);

-- Receita anexada ao cadastro (o binário fica no bucket privado).
create table public.medication_attachments (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes integer check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Histórico de adesão: uma linha por dose registrada no checklist diário.
-- Quem confirmou (`confirmed_by`) é sempre o usuário logado no momento do registro.
create table public.medication_doses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  dose_date date not null,
  dose_time time not null,
  status text not null default 'pending'
    check (status in ('pending', 'taken', 'late', 'missed')),
  confirmed_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medication_doses_unique_slot unique (medication_id, dose_date, dose_time),
  constraint medication_doses_confirmation_check check (
    (status = 'pending' and confirmed_by is null and confirmed_at is null)
    or (status in ('taken', 'late', 'missed') and confirmed_by is not null and confirmed_at is not null)
  )
);

-- Controle de despesas da família. `amount_cents` guarda o valor em centavos
-- (inteiro) para não haver erro de arredondamento de ponto flutuante.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  expense_date date not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null check (category in (
    'roupas', 'higiene', 'moveis', 'quarto', 'alimentacao', 'saude',
    'consultas_exames', 'transporte', 'brinquedos', 'outros'
  )),
  description text check (description is null or char_length(description) <= 500),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 1000000000),
  paid_by text check (paid_by is null or char_length(btrim(paid_by)) between 1 and 80),
  store text check (store is null or char_length(btrim(store)) between 1 and 120),
  notes text check (notes is null or char_length(notes) <= 500),
  -- Origem da despesa automática de Saúde (a linha derivada morre junto com o registro).
  appointment_id uuid references public.appointments (id) on delete cascade,
  exam_id uuid references public.exams (id) on delete cascade,
  medication_id uuid references public.medications (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Foto do comprovante (opcional) — binário no bucket privado `receipts`.
create table public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes integer check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Lista de enxoval da família. Preços são por unidade, em centavos
-- (`estimated_price_cents` × desejada, `actual_price_cents` × comprada);
-- `status` acompanha o item da vontade até a chegada.
create table public.layette_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null default 'outros' check (category in (
    'roupas', 'berco', 'banho', 'alimentacao', 'passeio', 'quarto', 'brinquedos', 'outros'
  )),
  desired_quantity integer not null default 1 check (desired_quantity between 1 and 999),
  purchased_quantity integer not null default 0 check (purchased_quantity between 0 and 999),
  estimated_price_cents integer
    check (estimated_price_cents is null or estimated_price_cents between 0 and 100000000),
  actual_price_cents integer
    check (actual_price_cents is null or actual_price_cents between 0 and 100000000),
  store_link text check (
    store_link is null
    or (char_length(store_link) between 1 and 500 and store_link ~* '^https?://')
  ),
  responsible text check (responsible is null or char_length(btrim(responsible)) between 1 and 80),
  status text not null default 'desejado'
    check (status in ('desejado', 'pesquisando', 'comprado', 'recebido', 'presenteado')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Presentes recebidos pelo bebê. `photo_path` é a foto única no bucket privado
-- `gifts`; `layette_item_id` liga o presente ao item do enxoval e as unidades
-- recebidas são SOMADAS na quantidade do item (trigger `apply_gift_layette`).
-- `cost_cents` só existe quando a família pagou pelo presente: aí o trigger
-- `sync_gift_expense` cria a despesa derivada; sem valor, não há despesa.
create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  product_name text not null check (char_length(btrim(product_name)) between 1 and 120),
  date_received date not null,
  giver_name text check (giver_name is null or char_length(btrim(giver_name)) between 1 and 120),
  quantity integer not null default 1 check (quantity between 1 and 999),
  description text check (description is null or char_length(description) <= 500),
  photo_path text check (photo_path is null or char_length(photo_path) <= 500),
  notes text check (notes is null or char_length(notes) <= 500),
  layette_item_id uuid references public.layette_items (id) on delete set null,
  -- Custo que a família teve com o presente (centavos). Nulo = presente sem custo.
  cost_cents integer check (cost_cents is null or (cost_cents > 0 and cost_cents <= 1000000000)),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Controle de estoque de produtos do bebê. Quantidades são `numeric(10,2)`
-- para aceitar unidades fracionadas (ml, g). O alerta de estoque baixo é
-- derivado: `current_quantity <= minimum_stock`.
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  product_name text not null check (char_length(btrim(product_name)) between 1 and 120),
  brand text check (brand is null or char_length(btrim(brand)) between 1 and 80),
  size text check (size is null or char_length(btrim(size)) between 1 and 40),
  current_quantity numeric(10,2) not null default 0
    check (current_quantity >= 0 and current_quantity <= 1000000),
  unit text not null default 'un' check (unit in (
    'un', 'pacote', 'caixa', 'par', 'frasco', 'rolo', 'ml', 'l', 'g', 'kg'
  )),
  minimum_stock numeric(10,2) not null default 0
    check (minimum_stock >= 0 and minimum_stock <= 1000000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Histórico de movimentações do estoque (livro-caixa append-only). O saldo de
-- `inventory_items.current_quantity` é ajustado pelo trigger
-- `apply_inventory_movement`: entradas somam, saídas subtraem e o ajuste manual
-- define o valor. `updated_at` do produto também é atualizado no processo.
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  movement_type text not null check (movement_type in (
    'entrada_compra', 'entrada_presente', 'saida_uso', 'ajuste_manual'
  )),
  quantity numeric(10,2) not null,
  occurred_at timestamptz not null default now(),
  user_id uuid references public.profiles (id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  constraint inventory_movements_quantity_check check (
    (movement_type = 'ajuste_manual' and quantity >= 0 and quantity <= 1000000)
    or (movement_type <> 'ajuste_manual' and quantity > 0 and quantity <= 1000000)
  )
);

-- Vínculos da integração Enxoval · Financeiro · Presentes · Estoque.
-- Ficam como `alter table` por causa da ordem de criação das tabelas acima.
-- A despesa sabe de qual item do enxoval ela nasceu (compra dos pais).
alter table public.expenses
  add column layette_item_id uuid references public.layette_items (id) on delete set null;

-- Presente com custo para a família também gera despesa: `gift_id` liga a linha
-- derivada ao presente (uma por presente) e cai junto com ele.
alter table public.expenses
  add column gift_id uuid references public.gifts (id) on delete cascade;

-- O presente pode registrar entrada de um consumível no estoque.
alter table public.gifts
  add column inventory_item_id uuid references public.inventory_items (id) on delete set null,
  add column stock_quantity numeric(10,2)
    check (stock_quantity is null or (stock_quantity > 0 and stock_quantity <= 1000000)),
  add constraint gifts_stock_link_check check (
    (inventory_item_id is null and stock_quantity is null)
    or (inventory_item_id is not null and stock_quantity is not null)
  );

-- Central de notificações internas. As linhas são geradas pela função
-- `generate_family_notifications` a partir das datas já cadastradas
-- (consultas, exames, doses do dia e pendências). `dedupe_key` garante um
-- aviso por evento, sem duplicar. Sem push/e-mail: tudo fica no app.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  kind text not null check (kind in ('appointment', 'exam', 'medication', 'pending')),
  dedupe_key text not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text check (body is null or char_length(body) <= 300),
  link text,
  due_at timestamptz,
  read_at timestamptz,
  read_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_unique_key unique (family_id, dedupe_key),
  constraint notifications_read_check check (read_at is null or read_by is not null)
);

-- Trilha de auditoria da família (somente leitura para os membros).
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(btrim(action)) between 1 and 80),
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Índices
-- ---------------------------------------------------------------------------
create index family_members_user_id_idx on public.family_members (user_id);
create index family_invitations_email_idx on public.family_invitations (lower(email));
create unique index family_invitations_pending_unique
  on public.family_invitations (family_id, lower(email))
  where status = 'pending';
create index activity_logs_family_created_idx on public.activity_logs (family_id, created_at desc);
create unique index pregnancies_one_active_per_family
  on public.pregnancies (family_id)
  where status = 'active';
create index pregnancy_milestones_family_date_idx
  on public.pregnancy_milestones (family_id, event_date);
create index appointments_family_scheduled_idx
  on public.appointments (family_id, scheduled_at desc);
create index appointment_attachments_appointment_idx
  on public.appointment_attachments (appointment_id);
create index exams_family_name_idx
  on public.exams (family_id, lower(btrim(name)));
create index exam_attachments_exam_idx
  on public.exam_attachments (exam_id);
create index medications_family_start_idx
  on public.medications (family_id, start_date desc);
create index medication_attachments_medication_idx
  on public.medication_attachments (medication_id);
create index medication_doses_family_date_idx
  on public.medication_doses (family_id, dose_date desc, dose_time);
create index notifications_family_due_idx
  on public.notifications (family_id, read_at, due_at);
create index expenses_family_date_idx
  on public.expenses (family_id, expense_date desc);
create index expenses_family_category_idx
  on public.expenses (family_id, category);
create index expense_attachments_expense_idx
  on public.expense_attachments (expense_id);
create index expenses_layette_item_idx
  on public.expenses (layette_item_id);
-- Uma despesa derivada por presente (o trigger mantém em dia).
create unique index expenses_gift_id_key
  on public.expenses (gift_id)
  where gift_id is not null;
create index expenses_appointment_idx
  on public.expenses (appointment_id);
create index expenses_exam_idx
  on public.expenses (exam_id);
create index expenses_medication_idx
  on public.expenses (medication_id);
create index layette_items_family_category_idx
  on public.layette_items (family_id, category);
create index layette_items_family_name_idx
  on public.layette_items (family_id, lower(btrim(name)));
create index gifts_family_date_idx
  on public.gifts (family_id, date_received desc);
create index inventory_items_family_name_idx
  on public.inventory_items (family_id, lower(btrim(product_name)));
create index inventory_movements_item_date_idx
  on public.inventory_movements (inventory_item_id, occurred_at desc);
create index baby_logs_family_logged_idx
  on public.baby_logs (family_id, logged_at desc);
create index vaccines_family_date_idx
  on public.vaccines (family_id, expected_date, applied_date);
create index growth_records_family_date_idx
  on public.growth_records (family_id, measurement_date);
create index documents_family_date_idx
  on public.documents (family_id, date desc);
create index documents_family_category_idx
  on public.documents (family_id, category);
create index memories_family_date_idx
  on public.memories (family_id, date desc, created_at desc);
create index memories_family_favorite_idx
  on public.memories (family_id, is_favorite);

-- ---------------------------------------------------------------------------
-- 4. Funções de apoio
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Aplica a movimentação no saldo do produto. Security definer para que o
-- ajuste aconteça mesmo sem `records.edit`; a saída nunca deixa o saldo
-- negativo (o erro volta para a interface).
create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_q numeric(10,2);
begin
  select current_quantity into current_q
    from public.inventory_items
   where id = new.inventory_item_id
     and family_id = new.family_id
   for update;

  if not found then
    raise exception 'O produto do estoque não pertence a esta família.';
  end if;

  if new.movement_type = 'ajuste_manual' then
    update public.inventory_items
       set current_quantity = new.quantity
     where id = new.inventory_item_id;
  elsif new.movement_type in ('entrada_compra', 'entrada_presente') then
    update public.inventory_items
       set current_quantity = current_quantity + new.quantity
     where id = new.inventory_item_id;
  else
    if new.quantity > current_q then
      raise exception 'A saída (%) é maior que o estoque atual (%).', new.quantity, current_q;
    end if;

    update public.inventory_items
       set current_quantity = current_quantity - new.quantity
     where id = new.inventory_item_id;
  end if;

  return new;
end;
$$;

-- Soma/subtrai unidades de um item do enxoval (usado só pelos triggers abaixo).
-- Regra das quantidades: nada aqui força `purchased_quantity = desired_quantity`;
-- "concluído" é derivado (`purchased_quantity >= desired_quantity`) no app.
create or replace function public.adjust_layette_from_gift(
  p_item_id uuid,
  p_family_id uuid,
  p_delta integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next integer;
begin
  if p_item_id is null or p_delta is null or p_delta = 0 then
    return;
  end if;

  select li.purchased_quantity + p_delta
    into v_next
    from public.layette_items li
   where li.id = p_item_id
     and li.family_id = p_family_id;

  -- Item inexistente só pode acontecer em remoções (cascade); aí não há o que
  -- devolver. Ao somar, é erro de vínculo com item de outra família.
  if v_next is null then
    if p_delta > 0 then
      raise exception 'O item do enxoval vinculado não pertence a esta família.';
    end if;
    return;
  end if;

  update public.layette_items
     set purchased_quantity = greatest(0, v_next),
         status = case
           when greatest(0, v_next) = 0 and status in ('presenteado', 'comprado') then 'desejado'
           when p_delta > 0 and status in ('desejado', 'pesquisando') then 'presenteado'
           else status
         end
   where id = p_item_id;
end;
$$;

revoke all on function public.adjust_layette_from_gift(uuid, uuid, integer)
  from public, anon, authenticated;

-- Presente vinculado ao enxoval: SOMA as unidades recebidas na quantidade do
-- item (sem fechar o item inteiro). O delta é aplicado também ao editar a
-- quantidade, ao trocar o vínculo e ao remover o presente.
-- Security definer para funcionar mesmo quando quem cadastra o presente não
-- tem `records.edit` no enxoval.
create or replace function public.apply_gift_layette()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.adjust_layette_from_gift(old.layette_item_id, old.family_id, -old.quantity);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.layette_item_id is distinct from new.layette_item_id then
      perform public.adjust_layette_from_gift(old.layette_item_id, old.family_id, -old.quantity);
      perform public.adjust_layette_from_gift(new.layette_item_id, new.family_id, new.quantity);
      return new;
    end if;

    if new.layette_item_id is not null and new.quantity <> old.quantity then
      perform public.adjust_layette_from_gift(
        new.layette_item_id,
        new.family_id,
        new.quantity - old.quantity
      );
    end if;

    return new;
  end if;

  perform public.adjust_layette_from_gift(new.layette_item_id, new.family_id, new.quantity);
  return new;
end;
$$;

revoke all on function public.apply_gift_layette() from anon, authenticated;

-- Presente com custo para a família -> despesa no Financeiro. Sem valor (caixa
-- desmarcada) a despesa derivada sai; a categoria acompanha a do item do
-- enxoval vinculado (ou "outros"). Chamada apenas por trigger.
create or replace function public.sync_gift_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cost integer;
  v_category text;
  v_expense_id uuid;
  v_expense_cents integer;
  v_gift_id uuid;
begin
  v_gift_id := case when tg_op = 'DELETE' then old.id else new.id end;

  if tg_op = 'DELETE' then
    delete from public.expenses where gift_id = v_gift_id;
    return old;
  end if;

  select e.id, e.amount_cents into v_expense_id, v_expense_cents
    from public.expenses e
   where e.gift_id = v_gift_id;

  v_cost := new.cost_cents;
  if v_cost is null or v_cost <= 0 then
    if v_expense_id is not null then
      delete from public.expenses where id = v_expense_id;
    end if;
    return new;
  end if;

  -- Só exige permissão de registrar gastos quando o valor realmente muda.
  if v_expense_id is null or v_expense_cents is distinct from v_cost then
    if not public.has_family_permission(new.family_id, 'records.create') then
      raise exception 'Sem permissão para registrar despesas.' using errcode = '42501';
    end if;
  end if;

  select public.layette_expense_category(li.category) into v_category
    from public.layette_items li
   where li.id = new.layette_item_id
     and li.family_id = new.family_id;

  v_category := coalesce(v_category, 'outros');

  if v_expense_id is not null then
    update public.expenses
       set expense_date = new.date_received,
           name = left(new.product_name, 120),
           category = v_category,
           description = left(
             concat(
               'Custo do presente',
               coalesce(' de ' || nullif(btrim(coalesce(new.giver_name, '')), ''), '')
             ),
             500
           ),
           amount_cents = v_cost,
           layette_item_id = new.layette_item_id
     where id = v_expense_id;
  else
    insert into public.expenses (
      family_id,
      expense_date,
      name,
      category,
      description,
      amount_cents,
      gift_id,
      layette_item_id,
      created_by
    ) values (
      new.family_id,
      new.date_received,
      left(new.product_name, 120),
      v_category,
      left(
        concat(
          'Custo do presente',
          coalesce(' de ' || nullif(btrim(coalesce(new.giver_name, '')), ''), '')
        ),
        500
      ),
      v_cost,
      new.id,
      new.layette_item_id,
      coalesce(new.created_by, auth.uid())
    );
  end if;

  return new;
end;
$$;

revoke all on function public.sync_gift_expense() from anon, authenticated;

-- Presente que é consumível: registra a entrada no livro do estoque. Quem soma
-- no saldo é o trigger `apply_inventory_movement`. Nada aqui toca `expenses`.
create or replace function public.apply_gift_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_family uuid;
  v_tz text;
begin
  if new.inventory_item_id is null or new.stock_quantity is null then
    return new;
  end if;

  select family_id into v_item_family
    from public.inventory_items
   where id = new.inventory_item_id;

  if v_item_family is null or v_item_family <> new.family_id then
    raise exception 'O produto do estoque vinculado não pertence a esta família.';
  end if;

  select coalesce(f.timezone, 'America/Sao_Paulo') into v_tz
    from public.families f
   where f.id = new.family_id;

  insert into public.inventory_movements (
    family_id,
    inventory_item_id,
    movement_type,
    quantity,
    occurred_at,
    user_id,
    notes
  ) values (
    new.family_id,
    new.inventory_item_id,
    'entrada_presente',
    new.stock_quantity,
    (new.date_received + time '12:00') at time zone coalesce(v_tz, 'America/Sao_Paulo'),
    new.created_by,
    concat(
      'Presente: ',
      new.product_name,
      coalesce(' de ' || nullif(btrim(coalesce(new.giver_name, '')), ''), '')
    )
  );

  return new;
end;
$$;

-- Troca de fralda com produto do estoque: registra a saída no livro do estoque
-- (o saldo é subtraído por `apply_inventory_movement`). A troca em si nunca é
-- bloqueada por falta de saldo: a saída maior que o estoque gera erro na hora.
create or replace function public.apply_diaper_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_family uuid;
begin
  if new.log_type <> 'fralda' or new.inventory_item_id is null or new.stock_quantity is null then
    return new;
  end if;

  select family_id into v_item_family
    from public.inventory_items
   where id = new.inventory_item_id;

  if v_item_family is null or v_item_family <> new.family_id then
    raise exception 'O produto do estoque vinculado não pertence a esta família.';
  end if;

  insert into public.inventory_movements (
    family_id,
    inventory_item_id,
    movement_type,
    quantity,
    occurred_at,
    user_id,
    notes
  ) values (
    new.family_id,
    new.inventory_item_id,
    'saida_uso',
    new.stock_quantity,
    new.logged_at,
    new.user_id,
    'Troca de fralda registrada na rotina'
  );

  return new;
end;
$$;

-- Remover o registro do diário devolve a quantidade ao estoque como ajuste
-- manual (o livro de movimentações nunca é apagado).
create or replace function public.restore_diaper_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current numeric(10,2);
begin
  if old.log_type <> 'fralda' or old.inventory_item_id is null or old.stock_quantity is null then
    return old;
  end if;

  select current_quantity into v_current
    from public.inventory_items
   where id = old.inventory_item_id
     and family_id = old.family_id
   for update;

  if not found then
    return old;
  end if;

  insert into public.inventory_movements (
    family_id,
    inventory_item_id,
    movement_type,
    quantity,
    occurred_at,
    user_id,
    notes
  ) values (
    old.family_id,
    old.inventory_item_id,
    'ajuste_manual',
    v_current + old.stock_quantity,
    now(),
    old.user_id,
    'Estorno · troca de fralda removida do diário'
  );

  return old;
end;
$$;

-- Categoria do Financeiro correspondente à categoria do enxoval.
create or replace function public.layette_expense_category(p_category text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_category
    when 'roupas' then 'roupas'
    when 'berco' then 'moveis'
    when 'banho' then 'higiene'
    when 'alimentacao' then 'alimentacao'
    when 'passeio' then 'transporte'
    when 'quarto' then 'quarto'
    when 'brinquedos' then 'brinquedos'
    else 'outros'
  end;
$$;

-- Compra dos pais: numa única transação as unidades compradas SOMAM na
-- quantidade do item (o item só fica concluído quando alcança a quantidade
-- desejada) e a despesa entra no Financeiro com a categoria equivalente.
-- Security definer para as duas escritas acontecerem juntas, mas exige
-- `records.edit` (enxoval) e `records.create` (despesas) na família.
create or replace function public.purchase_layette_item(
  p_layette_item_id uuid,
  p_quantity integer,
  p_total_cents integer,
  p_paid_by text,
  p_purchase_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.layette_items;
  v_purchased_after integer;
  v_spent_before integer;
  v_expense_id uuid;
begin
  select * into v_item
    from public.layette_items
   where id = p_layette_item_id;

  if not found then
    raise exception 'Item do enxoval não encontrado.' using errcode = 'P0002';
  end if;

  if not public.has_family_permission(v_item.family_id, 'records.edit') then
    raise exception 'Sem permissão para editar o enxoval.' using errcode = '42501';
  end if;

  if not public.has_family_permission(v_item.family_id, 'records.create') then
    raise exception 'Sem permissão para registrar despesas.' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 999 then
    raise exception 'Informe a quantidade comprada (1 a 999).' using errcode = '22023';
  end if;

  if p_total_cents is null or p_total_cents <= 0 or p_total_cents > 1000000000 then
    raise exception 'Informe um valor pago maior que zero.' using errcode = '22023';
  end if;

  v_purchased_after := v_item.purchased_quantity + p_quantity;

  select coalesce(sum(e.amount_cents), 0) into v_spent_before
    from public.expenses e
   where e.layette_item_id = v_item.id;

  update public.layette_items
     set purchased_quantity = v_purchased_after,
         -- Preço real é sempre por unidade: média ponderada do que já foi pago.
         actual_price_cents = greatest(
           1,
           round((v_spent_before + p_total_cents)::numeric / v_purchased_after)::integer
         ),
         status = case
           when status in ('desejado', 'pesquisando') then 'comprado'
           else status
         end
   where id = p_layette_item_id;

  insert into public.expenses (
    family_id,
    expense_date,
    name,
    category,
    description,
    amount_cents,
    paid_by,
    created_by,
    layette_item_id
  ) values (
    v_item.family_id,
    coalesce(p_purchase_date, current_date),
    v_item.name,
    public.layette_expense_category(v_item.category),
    'Compra do enxoval · '
      || p_quantity
      || case when p_quantity > 1 then ' peças' else ' peça' end,
    p_total_cents,
    nullif(btrim(coalesce(p_paid_by, '')), ''),
    auth.uid(),
    v_item.id
  )
  returning id into v_expense_id;

  return v_expense_id;
end;
$$;

-- Alterna o coração da memória. Liberado para qualquer membro ativo: o coração
-- não depende de `records.edit`, mas a função só muda `is_favorite`.
create or replace function public.toggle_memory_favorite(p_memory_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_favorite boolean;
begin
  select family_id into v_family_id
    from public.memories
   where id = p_memory_id;

  if v_family_id is null then
    raise exception 'Memória não encontrada.' using errcode = 'P0002';
  end if;

  if not public.is_family_member(v_family_id) then
    raise exception 'Você não tem permissão para essa ação.' using errcode = '42501';
  end if;

  update public.memories
     set is_favorite = not is_favorite
   where id = p_memory_id
  returning is_favorite into v_favorite;

  return v_favorite;
end;
$$;

revoke all on function public.toggle_memory_favorite(uuid) from public, anon;

-- Cria/atualiza/remove a despesa derivada de um registro de Saúde. Usada apenas
-- pelos triggers abaixo: o EXECUTE é revogado de anon/authenticated para o
-- cliente não poder criar despesas por RPC.
create or replace function public.upsert_health_expense(
  p_family_id uuid,
  p_expense_date date,
  p_name text,
  p_category text,
  p_amount_cents integer,
  p_description text,
  p_store text,
  p_appointment_id uuid default null,
  p_exam_id uuid default null,
  p_medication_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_id uuid;
begin
  select e.id into v_expense_id
    from public.expenses e
   where e.family_id = p_family_id
     and (
       (p_appointment_id is not null and e.appointment_id = p_appointment_id)
       or (p_exam_id is not null and e.exam_id = p_exam_id)
       or (p_medication_id is not null and e.medication_id = p_medication_id)
     )
   limit 1;

  -- Sem valor (ou particular desmarcado) não existe despesa: a linha derivada sai.
  if p_amount_cents is null or p_amount_cents <= 0 then
    if v_expense_id is not null then
      delete from public.expenses where id = v_expense_id;
    end if;
    return;
  end if;

  if v_expense_id is not null then
    update public.expenses
       set expense_date = coalesce(p_expense_date, current_date),
           name = left(coalesce(nullif(btrim(p_name), ''), 'Saúde'), 120),
           category = p_category,
           description = left(p_description, 500),
           amount_cents = p_amount_cents,
           store = nullif(btrim(coalesce(p_store, '')), '')
     where id = v_expense_id;
  else
    insert into public.expenses (
      family_id,
      expense_date,
      name,
      category,
      description,
      amount_cents,
      store,
      created_by,
      appointment_id,
      exam_id,
      medication_id
    ) values (
      p_family_id,
      coalesce(p_expense_date, current_date),
      left(coalesce(nullif(btrim(p_name), ''), 'Saúde'), 120),
      p_category,
      left(p_description, 500),
      p_amount_cents,
      nullif(btrim(coalesce(p_store, '')), ''),
      auth.uid(),
      p_appointment_id,
      p_exam_id,
      p_medication_id
    );
  end if;
end;
$$;

revoke all on function public.upsert_health_expense(
  uuid, date, text, text, integer, text, text, uuid, uuid, uuid
) from public, anon, authenticated;

-- Consulta particular: categoria "Consultas e exames", nome e descrição com o médico.
create or replace function public.sync_appointment_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
begin
  select coalesce(f.timezone, 'America/Sao_Paulo') into v_tz
    from public.families f
   where f.id = new.family_id;

  v_tz := coalesce(v_tz, 'America/Sao_Paulo');

  perform public.upsert_health_expense(
    p_family_id => new.family_id,
    p_expense_date => (new.scheduled_at at time zone v_tz)::date,
    p_name => new.doctor_name,
    p_category => 'consultas_exames',
    p_amount_cents => case when new.is_private then new.cost_cents else null end,
    p_description => concat(
      'Consulta particular · ',
      new.doctor_name,
      coalesce(' · ' || nullif(btrim(coalesce(new.specialty, '')), ''), '')
    ),
    p_store => new.clinic,
    p_appointment_id => new.id
  );

  return new;
end;
$$;

-- Exame particular: categoria "Consultas e exames", descrição com o nome do exame.
create or replace function public.sync_exam_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.upsert_health_expense(
    p_family_id => new.family_id,
    p_expense_date => coalesce(
      new.performed_date,
      new.scheduled_date,
      new.requested_date,
      current_date
    ),
    p_name => new.name,
    p_category => 'consultas_exames',
    p_amount_cents => case when new.is_private then new.cost_cents else null end,
    p_description => concat(
      'Exame particular · ',
      new.name,
      coalesce(' · ' || nullif(btrim(coalesce(new.lab, '')), ''), '')
    ),
    p_store => new.lab,
    p_exam_id => new.id
  );

  return new;
end;
$$;

-- Medicamento/vitamina com valor: categoria "Saúde".
create or replace function public.sync_medication_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.upsert_health_expense(
    p_family_id => new.family_id,
    p_expense_date => coalesce(new.start_date, current_date),
    p_name => new.name,
    p_category => 'saude',
    p_amount_cents => new.cost_cents,
    p_description => concat('Medicamento · ', new.name, ' ', new.dosage, ' ', new.dosage_unit),
    p_store => null,
    p_medication_id => new.id
  );

  return new;
end;
$$;

-- Famílias em que o usuário logado é membro ativo.
create or replace function public.current_user_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select fm.family_id
  from public.family_members fm
  where fm.user_id = auth.uid()
    and fm.status = 'active';
$$;

create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
  );
$$;

-- Dono e administrador têm acesso total; os demais seguem a matriz da família.
create or replace function public.has_family_permission(
  p_family_id uuid,
  p_permission public.permission_key
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members fm
    left join public.family_permissions fp
      on fp.family_id = fm.family_id
     and fp.role = fm.role
     and fp.permission = p_permission
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
      and (fm.role in ('owner', 'admin') or coalesce(fp.allowed, false))
  );
$$;

-- ---------------------------------------------------------------------------
-- Central de notificações internas
-- Recalcula os avisos da família a partir das datas já cadastradas:
--   * consultas agendadas/remarcadas nos próximos 7 dias;
--   * exames com data agendada nos próximos 7 dias (ainda não realizados);
--   * doses de hoje sem registro, respeitando a frequência cadastrada;
--   * pendências: exame realizado sem resultado, exame agendado que passou,
--     consulta que passou e continua como agendada.
-- O que deixou de valer (dose registrada, consulta atualizada) é removido.
-- Só membros ativos da família podem disparar a geração.
-- ---------------------------------------------------------------------------
create or replace function public.generate_family_notifications(p_family_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_today date;
  v_keys text[];
begin
  if not public.is_family_member(p_family_id) then
    raise exception 'Acesso negado a esta família.' using errcode = '42501';
  end if;

  select coalesce(f.timezone, 'America/Sao_Paulo') into v_tz
  from public.families f
  where f.id = p_family_id;

  v_tz := coalesce(v_tz, 'America/Sao_Paulo');
  v_today := (now() at time zone v_tz)::date;

  with candidates as (
    select
      'appointment:' || a.id::text as dedupe_key,
      'appointment'::text as kind,
      'Consulta com ' || a.doctor_name as title,
      nullif(
        concat_ws(
          ' · ',
          nullif(btrim(coalesce(a.specialty, '')), ''),
          nullif(btrim(coalesce(a.clinic, '')), '')
        ),
        ''
      ) as body,
      a.scheduled_at as due_at,
      '/consultas'::text as link
    from public.appointments a
    where a.family_id = p_family_id
      and a.status in ('scheduled', 'rescheduled')
      and a.scheduled_at >= now()
      and a.scheduled_at < now() + interval '7 days'

    union all

    select
      'exam-scheduled:' || e.id::text,
      'exam',
      'Exame agendado: ' || e.name,
      nullif(btrim(coalesce(e.lab, '')), ''),
      (e.scheduled_date + time '12:00') at time zone v_tz,
      '/exames'
    from public.exams e
    where e.family_id = p_family_id
      and e.performed_date is null
      and e.scheduled_date is not null
      and e.scheduled_date between v_today and v_today + 7

    union all

    select
      'medication:' || m.id::text || ':' || v_today::text || ':' || t.slot::text,
      'medication',
      'Hora do remédio: ' || m.name,
      m.dosage || ' ' || m.dosage_unit,
      (v_today + t.slot) at time zone v_tz,
      '/medicamentos'
    from public.medications m
    cross join lateral unnest(m.times) as t(slot)
    where m.family_id = p_family_id
      and m.frequency <> 'as_needed'
      and m.start_date <= v_today
      and (m.end_date is null or m.end_date >= v_today)
      and case m.frequency
            when 'daily' then true
            when 'every_other_day' then mod(v_today - m.start_date, 2) = 0
            else mod(v_today - m.start_date, 7) = 0
          end
      and not exists (
        select 1
        from public.medication_doses d
        where d.medication_id = m.id
          and d.dose_date = v_today
          and d.dose_time = t.slot
          and d.status <> 'pending'
      )

    union all

    select
      'exam-result:' || e.id::text,
      'pending',
      'Resultado pendente: ' || e.name,
      'Anexe o laudo ou registre a conclusão do exame.',
      (e.performed_date + time '12:00') at time zone v_tz,
      '/exames'
    from public.exams e
    where e.family_id = p_family_id
      and e.performed_date is not null
      and e.performed_date <= v_today
      and (e.result is null or btrim(e.result) = '')

    union all

    select
      'exam-late:' || e.id::text,
      'pending',
      'Exame sem realização: ' || e.name,
      'A data agendada já passou. Atualize o registro do exame.',
      (e.scheduled_date + time '12:00') at time zone v_tz,
      '/exames'
    from public.exams e
    where e.family_id = p_family_id
      and e.performed_date is null
      and e.scheduled_date is not null
      and e.scheduled_date < v_today

    union all

    select
      'appointment-status:' || a.id::text,
      'pending',
      'Consulta sem atualização: ' || a.doctor_name,
      'Registre se a consulta foi realizada, cancelada ou remarcada.',
      a.scheduled_at,
      '/consultas'
    from public.appointments a
    where a.family_id = p_family_id
      and a.status in ('scheduled', 'rescheduled')
      and a.scheduled_at < now()
  ),
  upserted as (
    insert into public.notifications as n (family_id, kind, dedupe_key, title, body, due_at, link)
    select p_family_id, kind, dedupe_key, title, body, due_at, link
    from candidates
    on conflict (family_id, dedupe_key) do update
      set kind = excluded.kind,
          title = excluded.title,
          body = excluded.body,
          due_at = excluded.due_at,
          link = excluded.link
    returning n.dedupe_key
  )
  select coalesce(array_agg(dedupe_key), '{}'::text[]) into v_keys from upserted;

  delete from public.notifications
  where family_id = p_family_id
    and dedupe_key <> all (v_keys);

  return coalesce(array_length(v_keys, 1), 0);
end;
$$;

-- Cria o perfil automaticamente no cadastro (auth.users -> profiles).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Ao criar a família: registra o dono, a matriz padrão de permissões e o log.
create or replace function public.handle_new_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.family_members (family_id, user_id, role, status, joined_at)
  values (new.id, new.created_by, 'owner', 'active', now())
  on conflict (family_id, user_id) do update
    set role = 'owner', status = 'active';

  insert into public.family_permissions (family_id, role, permission, allowed)
  select
    new.id,
    r.role,
    p.permission,
    case
      when r.role in ('owner', 'admin') then true
      when r.role = 'caregiver' then p.permission in ('records.view', 'records.create', 'calendar.manage')
      else p.permission = 'records.view'
    end
  from (
    values
      ('owner'::public.family_role),
      ('admin'::public.family_role),
      ('caregiver'::public.family_role),
      ('viewer'::public.family_role)
  ) as r (role)
  cross join (
    values
      ('family.edit'::public.permission_key),
      ('family.delete'::public.permission_key),
      ('members.invite'::public.permission_key),
      ('members.manage'::public.permission_key),
      ('permissions.manage'::public.permission_key),
      ('records.view'::public.permission_key),
      ('records.create'::public.permission_key),
      ('records.edit'::public.permission_key),
      ('records.delete'::public.permission_key),
      ('calendar.manage'::public.permission_key),
      ('data.export'::public.permission_key)
  ) as p (permission)
  on conflict (family_id, role, permission) do nothing;

  insert into public.activity_logs (family_id, actor_id, action, entity_type, entity_id)
  values (new.id, new.created_by, 'family.created', 'family', new.id);

  return new;
end;
$$;

-- Ao entrar na família: mantém profiles.family_id e registra a atividade.
create or replace function public.handle_member_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set family_id = new.family_id
  where id = new.user_id
    and family_id is null;

  insert into public.activity_logs (family_id, actor_id, action, entity_type, entity_id)
  values (new.family_id, coalesce(new.invited_by, new.user_id), 'member.joined', 'profile', new.user_id);

  return new;
end;
$$;

-- Perfil do bebê -> família: mantém `families.baby_name` e
-- `families.baby_birth_date` alinhados ao perfil (o resumo da tela inicial e o
-- painel da gestação continuam lendo a família, sem duplicar regra no cliente).
create or replace function public.sync_family_baby_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.families
  set baby_name = new.name,
      baby_birth_date = new.birth_date
  where id = new.family_id
    and (baby_name is distinct from new.name
      or baby_birth_date is distinct from new.birth_date);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create trigger family_members_set_updated_at
  before update on public.family_members
  for each row execute function public.set_updated_at();

create trigger family_invitations_set_updated_at
  before update on public.family_invitations
  for each row execute function public.set_updated_at();

create trigger family_permissions_set_updated_at
  before update on public.family_permissions
  for each row execute function public.set_updated_at();

create trigger pregnancies_set_updated_at
  before update on public.pregnancies
  for each row execute function public.set_updated_at();

create trigger pregnancy_milestones_set_updated_at
  before update on public.pregnancy_milestones
  for each row execute function public.set_updated_at();

create trigger baby_profiles_set_updated_at
  before update on public.baby_profiles
  for each row execute function public.set_updated_at();

-- Nome e data de nascimento do perfil sobem para a família (resumo da home).
create trigger baby_profiles_sync_family
  after insert or update of name, birth_date on public.baby_profiles
  for each row execute function public.sync_family_baby_profile();

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

create trigger medication_doses_set_updated_at
  before update on public.medication_doses
  for each row execute function public.set_updated_at();

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create trigger layette_items_set_updated_at
  before update on public.layette_items
  for each row execute function public.set_updated_at();

create trigger gifts_set_updated_at
  before update on public.gifts
  for each row execute function public.set_updated_at();

create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

create trigger inventory_movements_apply_after_insert
  after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

create trigger vaccines_set_updated_at
  before update on public.vaccines
  for each row execute function public.set_updated_at();

create trigger growth_records_set_updated_at
  before update on public.growth_records
  for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create trigger memories_set_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();

-- Troca de fralda: baixa ao registrar e estorno ao remover o registro do dia.
create trigger baby_logs_apply_diaper_stock
  after insert on public.baby_logs
  for each row execute function public.apply_diaper_stock();

create trigger baby_logs_restore_diaper_stock
  after delete on public.baby_logs
  for each row execute function public.restore_diaper_stock();

-- Regra de negócio: as unidades de um presente vinculado ao enxoval SOMAM na
-- quantidade do item (insert, edição de quantidade/vínculo e remoção).
create trigger gifts_apply_layette_after_write
  after insert or update or delete on public.gifts
  for each row execute function public.apply_gift_layette();

-- Presente com custo para a família: mantém a despesa derivada em dia.
create trigger gifts_sync_expense_after_write
  after insert or update of cost_cents, layette_item_id, product_name, date_received, giver_name
  or delete on public.gifts
  for each row execute function public.sync_gift_expense();

-- Presente consumível entra no estoque no momento do cadastro do presente.
create trigger gifts_apply_stock_after_insert
  after insert on public.gifts
  for each row execute function public.apply_gift_stock();

-- Regras de negócio Saúde -> Financeiro: só disparam quando muda algo que
-- compõe a despesa (valor, particular, nome, local ou data).
create trigger appointments_sync_expense
  after insert or update of is_private, cost_cents, doctor_name, specialty, clinic, scheduled_at
  on public.appointments
  for each row execute function public.sync_appointment_expense();

create trigger exams_sync_expense
  after insert or update of is_private, cost_cents, name, lab, performed_date, scheduled_date, requested_date
  on public.exams
  for each row execute function public.sync_exam_expense();

create trigger medications_sync_expense
  after insert or update of cost_cents, name, dosage, dosage_unit, start_date
  on public.medications
  for each row execute function public.sync_medication_expense();

create trigger families_after_insert
  after insert on public.families
  for each row execute function public.handle_new_family();

create trigger family_members_after_insert
  after insert on public.family_members
  for each row execute function public.handle_member_added();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;
alter table public.family_permissions enable row level security;
alter table public.pregnancies enable row level security;
alter table public.pregnancy_milestones enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_attachments enable row level security;
alter table public.exams enable row level security;
alter table public.exam_attachments enable row level security;
alter table public.medications enable row level security;
alter table public.medication_attachments enable row level security;
alter table public.medication_doses enable row level security;
alter table public.notifications enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_attachments enable row level security;
alter table public.activity_logs enable row level security;

-- profiles -----------------------------------------------------------------
create policy "profiles_select_self_or_family"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.family_members fm
      where fm.user_id = public.profiles.id
        and fm.status = 'active'
        and fm.family_id in (select public.current_user_family_ids())
    )
  );

create policy "profiles_insert_self"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- families -----------------------------------------------------------------
create policy "families_select_members"
  on public.families for select to authenticated
  using (id in (select public.current_user_family_ids()));

create policy "families_insert_self"
  on public.families for insert to authenticated
  with check (created_by = auth.uid());

create policy "families_update_editors"
  on public.families for update to authenticated
  using (public.has_family_permission(id, 'family.edit'))
  with check (public.has_family_permission(id, 'family.edit'));

create policy "families_delete_owners"
  on public.families for delete to authenticated
  using (public.has_family_permission(id, 'family.delete'));

-- family_members -----------------------------------------------------------
create policy "family_members_select_family"
  on public.family_members for select to authenticated
  using (
    user_id = auth.uid()
    or family_id in (select public.current_user_family_ids())
  );

create policy "family_members_insert_managers_or_invitee"
  on public.family_members for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'members.manage')
    or public.has_family_permission(family_id, 'members.invite')
    or (
      user_id = auth.uid()
      and status = 'active'
      and exists (
        select 1
        from public.family_invitations fi
        where fi.family_id = public.family_members.family_id
          and lower(fi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          and fi.status = 'pending'
          and fi.expires_at > now()
      )
    )
  );

create policy "family_members_update_managers"
  on public.family_members for update to authenticated
  using (public.has_family_permission(family_id, 'members.manage'))
  with check (public.has_family_permission(family_id, 'members.manage'));

create policy "family_members_delete_self_or_manager"
  on public.family_members for delete to authenticated
  using (
    user_id = auth.uid()
    or public.has_family_permission(family_id, 'members.manage')
  );

-- family_invitations -------------------------------------------------------
create policy "family_invitations_select_members_or_invitee"
  on public.family_invitations for select to authenticated
  using (
    family_id in (select public.current_user_family_ids())
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "family_invitations_insert_inviters"
  on public.family_invitations for insert to authenticated
  with check (public.has_family_permission(family_id, 'members.invite'));

create policy "family_invitations_update_inviters_or_invitee"
  on public.family_invitations for update to authenticated
  using (
    public.has_family_permission(family_id, 'members.invite')
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    public.has_family_permission(family_id, 'members.invite')
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "family_invitations_delete_inviters"
  on public.family_invitations for delete to authenticated
  using (public.has_family_permission(family_id, 'members.invite'));

-- family_permissions -------------------------------------------------------
create policy "family_permissions_select_members"
  on public.family_permissions for select to authenticated
  using (family_id in (select public.current_user_family_ids()));

create policy "family_permissions_insert_managers"
  on public.family_permissions for insert to authenticated
  with check (public.has_family_permission(family_id, 'permissions.manage'));

create policy "family_permissions_update_managers"
  on public.family_permissions for update to authenticated
  using (public.has_family_permission(family_id, 'permissions.manage'))
  with check (public.has_family_permission(family_id, 'permissions.manage'));

create policy "family_permissions_delete_managers"
  on public.family_permissions for delete to authenticated
  using (public.has_family_permission(family_id, 'permissions.manage'));

-- pregnancies ---------------------------------------------------------------
create policy "pregnancies_select_members"
  on public.pregnancies for select to authenticated
  using (public.is_family_member(family_id));

create policy "pregnancies_insert_editors"
  on public.pregnancies for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'family.edit')
    and created_by = auth.uid()
  );

create policy "pregnancies_update_editors"
  on public.pregnancies for update to authenticated
  using (public.has_family_permission(family_id, 'family.edit'))
  with check (public.has_family_permission(family_id, 'family.edit'));

create policy "pregnancies_delete_editors"
  on public.pregnancies for delete to authenticated
  using (public.has_family_permission(family_id, 'family.edit'));

-- pregnancy_milestones -----------------------------------------------------
create policy "pregnancy_milestones_select_members"
  on public.pregnancy_milestones for select to authenticated
  using (public.is_family_member(family_id));

create policy "pregnancy_milestones_insert_recorders"
  on public.pregnancy_milestones for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "pregnancy_milestones_update_editors"
  on public.pregnancy_milestones for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

-- Quem criou o marco sempre pode removê-lo; os demais precisam de records.delete.
create policy "pregnancy_milestones_delete_author_or_manager"
  on public.pregnancy_milestones for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- baby_profiles --------------------------------------------------------------
create policy "baby_profiles_select_members"
  on public.baby_profiles for select to authenticated
  using (public.is_family_member(family_id));

-- Preencher o perfil do bebê é editar a família (mesma permissão da gestação).
create policy "baby_profiles_insert_editors"
  on public.baby_profiles for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'family.edit')
    and created_by = auth.uid()
  );

create policy "baby_profiles_update_editors"
  on public.baby_profiles for update to authenticated
  using (public.has_family_permission(family_id, 'family.edit'))
  with check (public.has_family_permission(family_id, 'family.edit'));

create policy "baby_profiles_delete_editors"
  on public.baby_profiles for delete to authenticated
  using (public.has_family_permission(family_id, 'family.edit'));

-- baby_logs ------------------------------------------------------------------
-- Diário: todos os membros leem, quem registra é sempre o usuário logado e só
-- o autor (ou quem tem records.delete) remove. Diário não se edita: para
-- corrigir, apaga e registra de novo.
create policy "baby_logs_select_members"
  on public.baby_logs for select to authenticated
  using (public.is_family_member(family_id));

create policy "baby_logs_insert_recorders"
  on public.baby_logs for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and user_id = auth.uid()
  );

create policy "baby_logs_delete_author_or_manager"
  on public.baby_logs for delete to authenticated
  using (
    user_id = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- vaccines ------------------------------------------------------------------
-- Todos os membros acompanham o calendário; registrar exige records.create e
-- autoria própria, editar exige records.edit e remover é do autor ou de quem
-- tem records.delete.
create policy "vaccines_select_members"
  on public.vaccines for select to authenticated
  using (public.is_family_member(family_id));

create policy "vaccines_insert_recorders"
  on public.vaccines for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "vaccines_update_editors"
  on public.vaccines for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "vaccines_delete_author_or_manager"
  on public.vaccines for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- growth_records ------------------------------------------------------------
create policy "growth_records_select_members"
  on public.growth_records for select to authenticated
  using (public.is_family_member(family_id));

create policy "growth_records_insert_recorders"
  on public.growth_records for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "growth_records_update_editors"
  on public.growth_records for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "growth_records_delete_author_or_manager"
  on public.growth_records for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- documents ----------------------------------------------------------------
create policy "documents_select_members"
  on public.documents for select to authenticated
  using (public.is_family_member(family_id));

create policy "documents_insert_recorders"
  on public.documents for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "documents_update_editors"
  on public.documents for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "documents_delete_author_or_manager"
  on public.documents for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- memories ------------------------------------------------------------------
create policy "memories_select_members"
  on public.memories for select to authenticated
  using (public.is_family_member(family_id));

create policy "memories_insert_recorders"
  on public.memories for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "memories_update_editors"
  on public.memories for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "memories_delete_author_or_manager"
  on public.memories for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- appointments --------------------------------------------------------------
create policy "appointments_select_members"
  on public.appointments for select to authenticated
  using (public.is_family_member(family_id));

create policy "appointments_insert_calendar_managers"
  on public.appointments for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'calendar.manage')
    and created_by = auth.uid()
  );

create policy "appointments_update_calendar_managers"
  on public.appointments for update to authenticated
  using (public.has_family_permission(family_id, 'calendar.manage'))
  with check (public.has_family_permission(family_id, 'calendar.manage'));

create policy "appointments_delete_calendar_managers"
  on public.appointments for delete to authenticated
  using (public.has_family_permission(family_id, 'calendar.manage'));

-- appointment_attachments ---------------------------------------------------
create policy "appointment_attachments_select_members"
  on public.appointment_attachments for select to authenticated
  using (public.is_family_member(family_id));

create policy "appointment_attachments_insert_calendar_managers"
  on public.appointment_attachments for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'calendar.manage')
    and uploaded_by = auth.uid()
    and exists (
      select 1
      from public.appointments a
      where a.id = appointment_id
        and a.family_id = public.appointment_attachments.family_id
    )
  );

create policy "appointment_attachments_delete_calendar_managers"
  on public.appointment_attachments for delete to authenticated
  using (public.has_family_permission(family_id, 'calendar.manage'));

-- exams ---------------------------------------------------------------------
create policy "exams_select_members"
  on public.exams for select to authenticated
  using (public.is_family_member(family_id));

create policy "exams_insert_recorders"
  on public.exams for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "exams_update_editors"
  on public.exams for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "exams_delete_author_or_manager"
  on public.exams for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- exam_attachments ----------------------------------------------------------
create policy "exam_attachments_select_members"
  on public.exam_attachments for select to authenticated
  using (public.is_family_member(family_id));

create policy "exam_attachments_insert_recorders"
  on public.exam_attachments for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and uploaded_by = auth.uid()
    and exists (
      select 1
      from public.exams e
      where e.id = exam_id
        and e.family_id = public.exam_attachments.family_id
    )
  );

create policy "exam_attachments_delete_manager_or_author"
  on public.exam_attachments for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- medications ---------------------------------------------------------------
create policy "medications_select_members"
  on public.medications for select to authenticated
  using (public.is_family_member(family_id));

create policy "medications_insert_recorders"
  on public.medications for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "medications_update_editors"
  on public.medications for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "medications_delete_author_or_manager"
  on public.medications for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- medication_attachments ----------------------------------------------------
create policy "medication_attachments_select_members"
  on public.medication_attachments for select to authenticated
  using (public.is_family_member(family_id));

create policy "medication_attachments_insert_recorders"
  on public.medication_attachments for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and uploaded_by = auth.uid()
    and exists (
      select 1
      from public.medications m
      where m.id = medication_id
        and m.family_id = public.medication_attachments.family_id
    )
  );

create policy "medication_attachments_delete_manager_or_author"
  on public.medication_attachments for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- medication_doses ----------------------------------------------------------
create policy "medication_doses_select_members"
  on public.medication_doses for select to authenticated
  using (public.is_family_member(family_id));

-- Só é possível registrar uma dose confirmando como o próprio usuário logado.
create policy "medication_doses_insert_recorders"
  on public.medication_doses for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and confirmed_by = auth.uid()
    and status in ('taken', 'late', 'missed')
    and exists (
      select 1
      from public.medications m
      where m.id = medication_id
        and m.family_id = public.medication_doses.family_id
    )
  );

create policy "medication_doses_update_confirmer_or_editor"
  on public.medication_doses for update to authenticated
  using (
    confirmed_by = auth.uid()
    or public.has_family_permission(family_id, 'records.edit')
  )
  with check (
    status in ('taken', 'late', 'missed')
    and confirmed_by = auth.uid()
  );

create policy "medication_doses_delete_confirmer_or_manager"
  on public.medication_doses for delete to authenticated
  using (
    confirmed_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- expenses ------------------------------------------------------------------
create policy "expenses_select_members"
  on public.expenses for select to authenticated
  using (public.is_family_member(family_id));

create policy "expenses_insert_recorders"
  on public.expenses for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "expenses_update_editors"
  on public.expenses for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "expenses_delete_author_or_manager"
  on public.expenses for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- expense_attachments -------------------------------------------------------
create policy "expense_attachments_select_members"
  on public.expense_attachments for select to authenticated
  using (public.is_family_member(family_id));

create policy "expense_attachments_insert_recorders"
  on public.expense_attachments for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and uploaded_by = auth.uid()
    and exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and e.family_id = public.expense_attachments.family_id
    )
  );

create policy "expense_attachments_delete_manager_or_author"
  on public.expense_attachments for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- layette_items --------------------------------------------------------------
create policy "layette_items_select_members"
  on public.layette_items for select to authenticated
  using (public.is_family_member(family_id));

create policy "layette_items_insert_recorders"
  on public.layette_items for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "layette_items_update_editors"
  on public.layette_items for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "layette_items_delete_author_or_manager"
  on public.layette_items for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- gifts ----------------------------------------------------------------------
create policy "gifts_select_members"
  on public.gifts for select to authenticated
  using (public.is_family_member(family_id));

create policy "gifts_insert_recorders"
  on public.gifts for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "gifts_update_editors"
  on public.gifts for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "gifts_delete_author_or_manager"
  on public.gifts for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- inventory_items ------------------------------------------------------------
create policy "inventory_items_select_members"
  on public.inventory_items for select to authenticated
  using (public.is_family_member(family_id));

create policy "inventory_items_insert_recorders"
  on public.inventory_items for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and created_by = auth.uid()
  );

create policy "inventory_items_update_editors"
  on public.inventory_items for update to authenticated
  using (public.has_family_permission(family_id, 'records.edit'))
  with check (public.has_family_permission(family_id, 'records.edit'));

create policy "inventory_items_delete_author_or_manager"
  on public.inventory_items for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_family_permission(family_id, 'records.delete')
  );

-- inventory_movements --------------------------------------------------------
-- Histórico append-only: os membros leem e registram; ninguém edita nem apaga
-- (apagar um movimento deixaria o saldo do produto inconsistente).
create policy "inventory_movements_select_members"
  on public.inventory_movements for select to authenticated
  using (public.is_family_member(family_id));

create policy "inventory_movements_insert_recorders"
  on public.inventory_movements for insert to authenticated
  with check (
    public.has_family_permission(family_id, 'records.create')
    and user_id = auth.uid()
  );

-- notifications -------------------------------------------------------------
-- Apenas leitura e marcação de leitura pelo cliente: a criação é feita
-- exclusivamente pela função security definer `generate_family_notifications`.
create policy "notifications_select_members"
  on public.notifications for select to authenticated
  using (public.is_family_member(family_id));

-- Marcar como lida é a única escrita permitida ao cliente, e sempre
-- registrando quem leu (`read_by = auth.uid()`).
create policy "notifications_update_read_state"
  on public.notifications for update to authenticated
  using (public.is_family_member(family_id) and read_at is null)
  with check (public.is_family_member(family_id) and read_by = auth.uid());

-- activity_logs ------------------------------------------------------------
create policy "activity_logs_select_members"
  on public.activity_logs for select to authenticated
  using (family_id in (select public.current_user_family_ids()));

create policy "activity_logs_insert_self"
  on public.activity_logs for insert to authenticated
  with check (
    actor_id = auth.uid()
    and public.is_family_member(family_id)
  );

-- ---------------------------------------------------------------------------
-- 7. Data API grants (RLS continua sendo a camada de autorização)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete
  on public.profiles, public.families, public.family_members,
     public.family_invitations, public.family_permissions, public.pregnancies,
     public.pregnancy_milestones, public.baby_profiles,
     public.appointments, public.appointment_attachments,
     public.exams, public.exam_attachments, public.medications,
     public.medication_attachments, public.medication_doses,
     public.expenses, public.expense_attachments, public.layette_items,
     public.gifts, public.inventory_items, public.activity_logs,
     public.vaccines, public.growth_records, public.documents, public.memories
  to authenticated;

-- O histórico de estoque é append-only: o cliente lê e insere.
grant select, insert on public.inventory_movements to authenticated;

-- O diário de cuidados também é append-only (sem update): lê, insere e remove.
grant select, insert, delete on public.baby_logs to authenticated;

-- A central é gerada no servidor: o cliente só lê e marca como lida.
grant select, update, delete on public.notifications to authenticated;

grant all privileges
  on public.profiles, public.families, public.family_members,
     public.family_invitations, public.family_permissions, public.pregnancies,
     public.pregnancy_milestones, public.baby_profiles,
     public.appointments, public.appointment_attachments,
     public.exams, public.exam_attachments, public.medications,
     public.medication_attachments, public.medication_doses,
     public.expenses, public.expense_attachments, public.layette_items,
     public.gifts, public.inventory_items, public.inventory_movements,
     public.notifications, public.activity_logs, public.baby_logs,
     public.vaccines, public.growth_records, public.documents, public.memories
  to service_role;

grant execute on function public.generate_family_notifications(uuid) to authenticated;

-- Compra do enxoval lança a despesa na mesma transação (permissões checadas dentro).
grant execute on function public.purchase_layette_item(uuid, integer, integer, text, date)
  to authenticated;

-- O coração da memória é liberado para qualquer membro ativo da família.
grant execute on function public.toggle_memory_favorite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Storage: anexos das consultas
-- Bucket privado; o primeiro segmento do caminho é o id da família
-- (<family_id>/<appointment_id>/<arquivo>) e é ele que valida o acesso.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'appointments',
  'appointments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "appointments_storage_read_family"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'appointments'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "appointments_storage_insert_managers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'appointments'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'calendar.manage')
  );

create policy "appointments_storage_delete_managers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'appointments'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'calendar.manage')
  );

-- Bucket dos exames: <family_id>/<exam_id>/<arquivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exams',
  'exams',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "exams_storage_read_family"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exams'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "exams_storage_insert_recorders"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exams'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
  );

-- Autores podem remover os próprios arquivos; gestores de registros, qualquer um.
create policy "exams_storage_delete_author_or_manager"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'exams'
    and (
      public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.delete')
      or (
        owner = auth.uid()
        and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
      )
    )
  );

-- Bucket das receitas: <family_id>/<medication_id>/<arquivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prescriptions',
  'prescriptions',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "prescriptions_storage_read_family"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'prescriptions'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "prescriptions_storage_insert_recorders"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'prescriptions'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
  );

create policy "prescriptions_storage_delete_author_or_manager"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'prescriptions'
    and (
      public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.delete')
      or (
        owner = auth.uid()
        and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
      )
    )
  );

-- Bucket dos comprovantes de despesa: <family_id>/<expense_id>/<arquivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "receipts_storage_read_family"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts_storage_insert_recorders"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
  );

create policy "receipts_storage_delete_author_or_manager"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (
      public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.delete')
      or (
        owner = auth.uid()
        and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
      )
    )
  );

-- Bucket das fotos de presentes: <family_id>/<gift_id>/<arquivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gifts',
  'gifts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "gifts_storage_read_family"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'gifts'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "gifts_storage_insert_recorders"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gifts'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
  );

create policy "gifts_storage_delete_author_or_manager"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'gifts'
    and (
      public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.delete')
      or (
        owner = auth.uid()
        and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
      )
    )
  );

-- Bucket da foto do bebê: <family_id>/<baby_profile_id>/<arquivo>
-- O caminho fica em `baby_profiles.avatar_url` e é aberto por URL assinada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'baby',
  'baby',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "baby_storage_read_family"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'baby'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "baby_storage_insert_editors"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'baby'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'family.edit')
  );

create policy "baby_storage_delete_editors"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'baby'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'family.edit')
  );

-- Bucket dos comprovantes de vacina: <family_id>/<vaccine_id>/<arquivo>
-- O caminho fica em `vaccines.proof_path` e é aberto por URL assinada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vaccines',
  'vaccines',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "vaccines_storage_read_family"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vaccines'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "vaccines_storage_insert_recorders"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vaccines'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
  );

create policy "vaccines_storage_delete_author_or_manager"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vaccines'
    and (
      public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.delete')
      or (
        owner = auth.uid()
        and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
      )
    )
  );

-- Bucket da Central de Documentos: <family_id>/<document_id>/<arquivo>
-- O caminho fica em `documents.file_path` e é aberto por URL assinada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "documents_storage_read_family"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_storage_insert_recorders"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
  );

create policy "documents_storage_delete_author_or_manager"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (
      public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.delete')
      or (
        owner = auth.uid()
        and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
      )
    )
  );

-- Bucket da Linha do Tempo de Memórias: <family_id>/<memory_id>/<arquivo>
-- Aceita fotos (até 10 MB) e vídeos (até 50 MB); o caminho fica em
-- `memories.media_path` e é aberto por URL assinada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories',
  'memories',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do nothing;

create policy "memories_storage_read_family"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'memories'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "memories_storage_insert_recorders"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'memories'
    and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
  );

create policy "memories_storage_delete_author_or_manager"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'memories'
    and (
      public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.delete')
      or (
        owner = auth.uid()
        and public.has_family_permission(((storage.foldername(name))[1])::uuid, 'records.create')
      )
    )
  );
