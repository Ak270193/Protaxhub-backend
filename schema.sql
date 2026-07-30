-- Pro Tax Hub — database schema (run this in the Supabase SQL editor)

create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  entity_type text,
  entity_name text,
  entity_abn text,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  residency text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- one row per person on the file (applicant, director, trustee, partner, spouse)
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  role text not null, -- 'applicant' | 'director' | 'trustee' | 'partner' | 'spouse'
  name text,
  tfn_abn_type text,
  tfn_abn text,
  dob date,
  address text,
  email text,
  phone text,
  bsb text,
  account_number text,
  marital_status text,
  kids int,
  residency text,
  created_at timestamptz default now()
);

create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  direction text check (direction in ('inbox', 'sent')), -- inbox = accountant -> client, sent = client -> accountant
  file_name text not null,
  file_path text, -- path in the 'documents' storage bucket
  note text,
  created_at timestamptz default now()
);

create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  status text default 'pending', -- 'pending' | 'signed'
  signature_type text, -- 'type' | 'draw'
  signature_value text, -- typed name, or base64 PNG for a drawn signature
  signed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists payment_options (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  amount text not null,
  reference text not null,
  due_date date,
  method text,
  created_at timestamptz default now()
);

create index if not exists idx_documents_client on documents(client_id);
create index if not exists idx_forms_client on forms(client_id);
create index if not exists idx_payment_options_client on payment_options(client_id);
create index if not exists idx_people_client on people(client_id);
create index if not exists idx_otp_phone on otp_codes(phone);
