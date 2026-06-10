// js/dashboard.js
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const dashboardBody = document.getElementById('dashboard-body');
const createDocBtn = document.querySelector('.navbar .btn-primary');
const documentContainer = document.querySelector('main div');

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
    
    // Panggil fungsi untuk mengambil dokumen milik user ini
    await fetchUserDocuments(session.user.id);
}

// ==========================================
// 2. AMBIL DATA DARI SUPABASE & TAMPILKAN
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

    // Bersihkan kontainer dan buat daftar baru
    documentContainer.innerHTML = '';
    const listWrapper = document.createElement('div');
    listWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    documents.forEach(doc => {
        // Format tanggal agar rapi
        const date = new Date(doc.updated_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
        });
        
        const docItem = document.createElement('div');
        docItem.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border: 1px solid #e2e8f0; border-radius: 8px; transition: all 0.2s; background: white;`;
        
        // Efek Hover (Warna berubah saat disorot mouse)
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
// 3. FUNGSI MENGHAPUS DOKUMEN (UTUH & AMAN)
// ==========================================
async function deleteDocument(docId, docTitle) {
    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus dokumen "${docTitle}"?`);
    
    if (confirmDelete) {
        try {
            // Perintah hapus dengan .select() agar Supabase wajib memberikan laporan
            const { data, error } = await supabaseClient
                .from('documents')
                .delete()
                .eq('id', docId)
                .select();

            if (error) {
                alert("❌ Gagal menghapus (Error Database): " + error.message);
                return;
            }

            if (!data || data.length === 0) {
                alert("🔒 Gagal dihapus! Satpam Supabase (RLS) menolak akses Anda.");
                return;
            }

            // Jika berhasil, beri tahu dan muat ulang halaman agar dokumen hilang dari layar
            alert("✅ Dokumen berhasil dihapus!");
            window.location.reload(); 
            
        } catch (err) {
            console.error("Error Detail:", err);
            alert("🚨 Terjadi kesalahan sistem: " + err.message);
        }
    }
}

// ==========================================
// 4. TOMBOL-TOMBOL UTAMA
// ==========================================
if (createDocBtn) {
    createDocBtn.addEventListener('click', () => window.location.href = "editor.html");
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        logoutBtn.innerText = "Keluar...";
        await supabaseClient.auth.signOut();
        window.location.href = "index.html";
    });
}

// ==========================================
// JALANKAN SISTEM DASHBOARD
// ==========================================
initDashboard();