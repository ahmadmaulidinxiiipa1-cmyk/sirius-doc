// js/dashboard.js
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const dashboardBody = document.getElementById('dashboard-body');
const createDocBtn = document.querySelector('.navbar .btn-primary');
// Kita ubah selektornya menggunakan ID agar lebih spesifik dan aman
const documentContainer = document.getElementById('document-container');
const searchInput = document.getElementById('search-input');

let allDocuments = []; // Variabel untuk menyimpan semua data dokumen sementara

// ==========================================
// 1. INISIALISASI & CEK LOGIN
// ==========================================
async function initDashboard() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = "login.html";
        return;
    }
    
    dashboardBody.style.display = "block";
    userEmailSpan.innerText = session.user.email;
    
    await fetchUserDocuments(session.user.id);
}

// ==========================================
// 2. AMBIL DATA DARI SUPABASE
// ==========================================
async function fetchUserDocuments(userId) {
    documentContainer.innerHTML = `<p style="text-align: center;">Memuat dokumen...</p>`;
    
    const { data: documents, error } = await supabaseClient
        .from('documents')
        .select('id, title, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        documentContainer.innerHTML = `<p style="color: red; text-align: center;">Gagal memuat: ${error.message}</p>`;
        return;
    }

    if (!documents || documents.length === 0) {
        documentContainer.innerHTML = `<p style="text-align: center; color: #64748b; padding: 40px;">Belum ada dokumen. Ayo mulai buat yang pertama!</p>`;
        return;
    }

    // Simpan data ke variabel global agar bisa dicari tanpa memanggil database lagi
    allDocuments = documents;
    
    // Tampilkan semua dokumen
    renderDocuments(allDocuments);
}

// ==========================================
// 3. FUNGSI MENAMPILKAN DOKUMEN KE LAYAR (BARU)
// ==========================================
function renderDocuments(docs) {
    documentContainer.innerHTML = ''; // Bersihkan wadah

    if (docs.length === 0) {
        documentContainer.innerHTML = `<p style="text-align: center; color: #64748b; padding: 40px;">Pencarian tidak ditemukan.</p>`;
        return;
    }

    const listWrapper = document.createElement('div');
    listWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    docs.forEach(doc => {
        const date = new Date(doc.updated_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
        });
        
        const docItem = document.createElement('div');
        docItem.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border: 1px solid #e2e8f0; border-radius: 8px; transition: all 0.2s; background: white;`;
        
        docItem.onmouseover = () => { docItem.style.borderColor = '#4f46e5'; docItem.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; };
        docItem.onmouseout = () => { docItem.style.borderColor = '#e2e8f0'; docItem.style.boxShadow = 'none'; };

        docItem.innerHTML = `
            <div style="cursor: pointer; flex-grow: 1;" onclick="window.location.href='editor.html?id=${doc.id}'">
                <div style="font-weight: 600; font-size: 16px; color: #1e293b; margin-bottom: 4px;">📄 ${doc.title || 'Tanpa Judul'}</div>
                <div style="font-size: 12px; color: #94a3b8;">Terakhir diubah: ${date}</div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button onclick="window.location.href='editor.html?id=${doc.id}'" style="background: transparent; color: #4f46e5; border: none; font-weight: 500; cursor: pointer;">Buka →</button>
                <button onclick="deleteDocument('${doc.id}', '${doc.title || 'Tanpa Judul'}')" style="background: #fee2e2; color: #ef4444; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 14px;" title="Hapus Dokumen">🗑️</button>
            </div>
        `;
        listWrapper.appendChild(docItem);
    });
    
    documentContainer.appendChild(listWrapper);
}

// ==========================================
// 4. FITUR PENCARIAN LANGSUNG (BARU)
// ==========================================
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        
        // Filter dokumen yang judulnya mengandung kata kunci
        const filteredDocs = allDocuments.filter(doc => {
            const title = (doc.title || 'Tanpa Judul').toLowerCase();
            return title.includes(keyword);
        });

        // Tampilkan hasil filter
        renderDocuments(filteredDocs);
    });
}

// ==========================================
// 5. FUNGSI MENGHAPUS DOKUMEN (Versi Toast & Tanpa Refresh)
// ==========================================

// Fungsi Pembuat Notifikasi Toast
function showToast(message, type = 'success') {
    // Buat wadah toast jika belum ada
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Buat elemen toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    // Animasi masuk (kasih jeda 10ms agar CSS transisinya jalan)
    setTimeout(() => toast.classList.add('show'), 10);

    // Hilangkan otomatis setelah 3 detik
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // Tunggu animasi keluar selesai baru hapus dari HTML
    }, 3000);
}

// Fungsi Hapus yang Diperbarui
async function deleteDocument(docId, docTitle) {
    // Konfirmasi hapus tetap pakai bawaan dulu biar aman dari salah pencet
    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus dokumen "${docTitle}"?`);
    
    if (confirmDelete) {
        try {
            const { data, error } = await supabaseClient
                .from('documents')
                .delete()
                .eq('id', docId)
                .select();

            if (error) { showToast("❌ Gagal menghapus: " + error.message, "error"); return; }
            if (!data || data.length === 0) { showToast("🔒 Gagal dihapus! RLS menolak.", "error"); return; }

            // Panggil notifikasi cantik
            showToast("✅ Dokumen berhasil dihapus!", "success");
            
            // HAPUS DARI LAYAR TANPA REFRESH HALAMAN!
            allDocuments = allDocuments.filter(doc => doc.id !== docId);
            
            // Render ulang sesuai apa yang sedang dicari di Search Bar
            const searchBox = document.getElementById('search-input');
            const keyword = searchBox ? searchBox.value.toLowerCase() : '';
            const filteredDocs = allDocuments.filter(doc => (doc.title || 'Tanpa Judul').toLowerCase().includes(keyword));
            
            renderDocuments(filteredDocs);
            
        } catch (err) {
            showToast("🚨 Terjadi kesalahan sistem: " + err.message, "error");
        }
    }
}

// ==========================================
// 6. TOMBOL LAINNYA
// ==========================================
if (createDocBtn) createDocBtn.addEventListener('click', () => window.location.href = "editor.html");

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        logoutBtn.innerText = "Keluar...";
        await supabaseClient.auth.signOut();
        window.location.href = "index.html";
    });
}

// Jalankan sistem
initDashboard();