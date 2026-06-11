// js/supabase.js

// 1. URL Markas Supabase (Pastikan tanpa /rest/v1/ di akhir)
const SUPABASE_URL = "https://qppgikgqlttuxmpkdslp.supabase.co";

// 2. Kunci Publishable (Aman untuk frontend/browser)
const SUPABASE_KEY = "sb_publishable_KxyiE3PzbEpnD07vXE1p9g_BB57seHt";

// 3. Menghubungkan Aplikasi ke Markas Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Kunci Supabase berhasil dipasang!");