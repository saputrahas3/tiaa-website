-- ============================================================
-- TIAA — Setup database member di Supabase
-- Jalankan seluruh isi file ini di: Supabase > SQL Editor > New query
-- ============================================================

-- 1. Tabel profil member (nama, whatsapp, status langganan)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  whatsapp text,
  subscribed boolean default false,
  package text,
  created_at timestamptz default now()
);

-- 2. Aktifkan keamanan baris (Row Level Security)
alter table public.profiles enable row level security;

-- 3. Member hanya boleh melihat & mengubah profil miliknya sendiri
create policy "Member lihat profil sendiri"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Member ubah profil sendiri"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. Otomatis buat baris profil setiap ada member baru daftar
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, whatsapp)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'whatsapp'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SELESAI. Setelah ini:
-- - Buka menu "Table Editor" > tabel "profiles" untuk melihat
--   daftar member yang mendaftar.
-- - Untuk mengaktifkan member yang sudah bayar, klik baris
--   member tersebut, ubah kolom "subscribed" jadi true, lalu
--   isi kolom "package" sesuai paket yang dibeli. Simpan.
-- ============================================================
