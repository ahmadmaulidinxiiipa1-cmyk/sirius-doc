// js/profile.js
const profileEmail = document.getElementById('profile-email');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const updateBtn = document.getElementById('update-btn');

// Fungsi Notifikasi Cantik (Kita gunakan lagi di sini)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 1. Cek Login & Tampilkan Email
async function initProfile() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = "login.html";
        return;
    }
    
    profileEmail.innerText = session.user.email;
}

// 2. Fungsi Mengganti Password
updateBtn.addEventListener('click', async () => {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validasi input
    if (newPassword.length < 6) {
        showToast("⚠️ Kata sandi minimal 6 karakter!", "error");
        return;
    }
    if (newPassword !== confirmPassword) {
        showToast("❌ Kata sandi tidak cocok!", "error");
        return;
    }

    updateBtn.innerText = "Menyimpan...";
    updateBtn.disabled = true;

    try {
        // Kirim permintaan ganti password ke Supabase
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        // Jika berhasil
        showToast("✅ Kata sandi berhasil diubah!", "success");
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";
        
    } catch (error) {
        showToast("🚨 Gagal: " + error.message, "error");
    } finally {
        updateBtn.innerText = "Simpan Kata Sandi Baru";
        updateBtn.disabled = false;
    }
});

// Jalankan sistem
initProfile();