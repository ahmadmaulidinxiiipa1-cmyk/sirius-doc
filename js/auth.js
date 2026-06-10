// js/auth.js

// CATATAN PENTING:
// Pastikan variabel 'supabaseClient' sudah terhubung.
// Jika Anda menggunakan framework/bundler (seperti Vite), hapus tanda '//' di bawah ini:
// import { supabaseClient } from './supabase.js'; 

// ==========================================
// 1. DEKLARASI ELEMEN HTML
// ==========================================
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const authSubtitle = document.getElementById('auth-subtitle');
const authFooterText = document.getElementById('auth-footer-text');
const toggleAuth = document.getElementById('toggle-auth');

// ==========================================
// 2. STATE APLIKASI
// ==========================================
// Secara default, halaman dimuat dalam mode "Masuk" (Login)
let isLoginMode = true;

// ==========================================
// 3. FUNGSI UNTUK MENGUBAH TAMPILAN
// ==========================================
// Fungsi ini dipisahkan agar lebih rapi dan bisa dipanggil dari mana saja
function switchMode() {
    isLoginMode = !isLoginMode; // Membalikkan status saat ini (true jadi false, dst)
    
    if (isLoginMode) {
        // --- TAMPILAN MODE MASUK (LOGIN) ---
        authSubtitle.innerText = "Selamat datang! Silakan masuk ke akunmu.";
        authBtn.innerText = "Masuk ke Ruang Kerja";
        authFooterText.innerText = "Belum punya akun?";
        toggleAuth.innerText = "Daftar di sini";
    } else {
        // --- TAMPILAN MODE DAFTAR (REGISTER) ---
        authSubtitle.innerText = "Buat akun baru untuk mulai membuat dokumen.";
        authBtn.innerText = "Daftar Sekarang";
        authFooterText.innerText = "Sudah punya akun?";
        toggleAuth.innerText = "Masuk di sini";
    }
}

// ==========================================
// 4. EVENT LISTENER: TOMBOL GANTI MODE
// ==========================================
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault(); // Mencegah browser melakukan reload halaman
    switchMode();       // Panggil fungsi perubahan UI di atas
});

// ==========================================
// 5. EVENT LISTENER: PROSES AUTENTIKASI (SUBMIT)
// ==========================================
authForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    // Ambil nilai input dan hapus spasi berlebih di awal/akhir menggunakan trim()
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // --- A. VALIDASI DASAR ---
    // Jangan kirim request ke database jika input masih kosong
    if (!email || !password) {
        alert("Mohon isi email dan password terlebih dahulu!");
        return; // Hentikan proses eksekusi kode di bawahnya
    }
    
    // --- B. STATUS LOADING PADA TOMBOL ---
    const originalBtnText = authBtn.innerText; // Simpan teks asli
    authBtn.innerText = "Memproses...";        // Beri tahu user bahwa sistem sedang bekerja
    authBtn.disabled = true;                   // Kunci tombol agar user tidak klik berulang kali

    // --- C. PROSES KE SUPABASE ---
    try {
        if (isLoginMode) {
            
            // ---> SKENARIO 1: PROSES MASUK (LOGIN)
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) throw error; // Jika gagal, lempar ke blok 'catch' di bawah
            
            alert("Berhasil masuk!");
            window.location.href = "dashboard.html"; // Arahkan ke halaman utama
            
        } else {
            
            // ---> SKENARIO 2: PROSES DAFTAR (REGISTER)
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });
            
            if (error) throw error;
            
            alert("Pendaftaran berhasil! Silakan CEK KOTAK MASUK atau SPAM di email Anda untuk mengklik link verifikasi sebelum masuk.");
            
            // Setelah berhasil daftar, kembalikan tampilan ke mode Login dan kosongkan form
            switchMode(); 
            authForm.reset();
        }
        
    } catch (error) {
        // --- D. PENANGANAN ERROR ---
        // Akan menangkap error dari Supabase (misal: password salah, email sudah terdaftar)
        alert("Ups, ada masalah: " + error.message); 
        
    } finally {
        // --- E. KEMBALIKAN TOMBOL KE KEADAAN SEMULA ---
        // Blok ini PASTI dieksekusi di akhir, baik prosesnya berhasil maupun gagal
        authBtn.innerText = originalBtnText;
        authBtn.disabled = false;
    }
});