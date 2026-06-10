// js/supabase.js

// URL sudah diperbaiki (tanpa /rest/v1/ di akhir)
const supabaseUrl = 'https://qppgikgqlttuxmpkdslp.supabase.co';

// API Key milikmu
const supabaseKey = 'sb_publishable_KxyiE3PzbEpnD07vXE1p9g_BB57seHt';

// Inisialisasi jembatan Supabase
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Supabase berhasil diinisialisasi!");