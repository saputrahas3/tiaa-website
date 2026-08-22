/* ============================================================
   TIAA — koneksi ke Supabase (auth + database member)

   CARA PAKAI:
   1. Buat project di https://supabase.com (gratis).
   2. Jalankan SQL setup (lihat file supabase-setup.sql) di
      Supabase > SQL Editor.
   3. Ambil "Project URL" dan "anon public key" dari
      Supabase > Project Settings > API.
   4. Tempel dua nilai itu di bawah ini, menggantikan
      'GANTI_DENGAN_PROJECT_URL_KAMU' dan 'GANTI_DENGAN_ANON_KEY_KAMU'.
   ============================================================ */

const SUPABASE_URL = 'https://wegrjlbukcfnlnsoowmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SaOHGU3UGIKGqYsV27l3Hg_tBVOPKMn';

const tiaaSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ambil profil member (nama, whatsapp, status langganan) berdasarkan user id
async function tiaaGetProfile(userId){
  const { data, error } = await tiaaSupabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if(error) return null;
  return data;
}
