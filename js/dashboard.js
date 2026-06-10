// js/dashboard.js

const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const dashboardBody = document.getElementById('dashboard-body');
const createDocBtn = document.querySelector('.navbar .btn-primary');
// Kita cari wadah (kotak putih) tempat menampilkan dokumen
const documentContainer = document.querySelector('main div');

// ==========================================
// 1. CEK KEAMANAN & AMBIL DATA (INIT)
// ==========================================
async function initDashboard() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "login.html";
        return;
    }

    // Tampilkan halaman dan email jika lolos keamanan
    dashboardBody.style.display = "block";
    userEmailSpan.innerText = session.user.email;

    // Panggil fungsi untuk mengambil daftar dokumen milik user ini
    await fetchUserDocuments(session.user.id);
}

// ==========================================
// 2. FUNGSI MENAMPILKAN DAFTAR DOKUMEN
// ==========================================
async function fetchUserDocuments(userId) {
    documentContainer.innerHTML = `<p style="color: #64748b; text-align: center; padding: 20px;">Memuat dokumen...</p>`;

    // Ambil data dari tabel 'documents' yang kolom user_id nya cocok dengan user yang sedang login
    const { data: documents, error } = await supabaseClient
        .from('documents')
        .select('id, title, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }); // Urutkan dari yang paling baru diedit

    if (error) {
        documentContainer.innerHTML = `<p style="color: #ef4444; text-align: center; padding: 20px;">Gagal memuat: ${error.message}</p>`;
        return;
    }

    // Jika user belum punya dokumen sama sekali
    if (documents.length === 0) {
        documentContainer.innerHTML = `<p style="color: #64748b; text-align: center; padding: 40px;">Belum ada dokumen. Ayo mulai buat yang pertama!</p>`;
        return;
    }

    // Jika ada dokumen, bersihkan wadah lalu rakit daftarnya satu per satu
    documentContainer.innerHTML = '';
    
    // Membuat struktur tabel/list pembungkus agar rapi
    const listWrapper = document.createElement('div');
    listWrapper.style.display = 'flex';
    listWrapper.style.flexDirection = 'column';
    listWrapper.style.gap = '12px';

    documents.forEach(doc => {
        // Format tanggal agar lebih manusiawi
        const date = new Date(doc.updated_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
        });

        // Membuat kotak kecil untuk setiap dokumen (item)
        const docItem = document.createElement('div');
        docItem.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #ffffff;
            transition: all 0.2s;
            cursor: pointer;
        `;

        // Efek saat kursor menyentuh kotak dokumen
        docItem.onmouseover = () => { docItem.style.borderColor = '#4f46e5'; docItem.style.background = '#f8fafc'; };
        docItem.onmouseout = () => { docItem.style.borderColor = '#e2e8f0'; docItem.style.background = '#ffffff'; };

        // Isi dari kotak dokumen (Judul & Tanggal)
        docItem.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-weight: 600; color: #1e293b; font-size: 16px;">📄 ${doc.title}</span>
                <span style="font-size: 12px; color: #94a3b8;">Terakhir diubah: ${date}</span>
            </div>
            <span style="color: #4f46e5; font-weight: 500; font-size: 14px;">Buka →</span>
        `;

        // KETIKA DOKUMEN DIKLIK: Terbangkan ke halaman editor membawa ID dokumen tersebut!
        docItem.addEventListener('click', () => {
            window.location.href = `editor.html?id=${doc.id}`;
        });

        listWrapper.appendChild(docItem);
    });

    documentContainer.appendChild(listWrapper);
}

// ==========================================
// 3. TOMBOL BUAT DOKUMEN BARU & LOGOUT
// ==========================================
createDocBtn.addEventListener('click', () => {
    // Arahkan ke editor.html biasa (tanpa bawa ID di URL = dianggap dokumen baru)
    window.location.href = "editor.html";
});

logoutBtn.addEventListener('click', async () => {
    logoutBtn.innerText = "Keluar...";
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        window.location.href = "index.html";
    } else {
        alert("Gagal keluar: " + error.message);
        logoutBtn.innerText = "Keluar";
    }
});

// Jalankan sistem
initDashboard();