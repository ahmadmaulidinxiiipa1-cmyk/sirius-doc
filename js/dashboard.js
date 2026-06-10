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
        documentContainer.innerHTML = `<p style="color: red;">Gagal: ${error.message}</p>`;
        return;
    }

    if (documents.length === 0) {
        documentContainer.innerHTML = `<p style="text-align: center; color: #64748b;">Belum ada dokumen. Ayo mulai buat yang pertama!</p>`;
        return;
    }

    documentContainer.innerHTML = '';
    const listWrapper = document.createElement('div');
    listWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    documents.forEach(doc => {
        const date = new Date(doc.updated_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
        });
        
        const docItem = document.createElement('div');
        docItem.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border: 1px solid #e2e8f0; border-radius: 8px; transition: all 0.2s; background: white;`;
        
        // Efek Hover
        docItem.onmouseover = () => { docItem.style.borderColor = '#4f46e5'; docItem.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; };
        docItem.onmouseout = () => { docItem.style.borderColor = '#e2e8f0'; docItem.style.boxShadow = 'none'; };

        docItem.innerHTML = `
            <div style="cursor: pointer; flex-grow: 1;" onclick="window.location.href='editor.html?id=${doc.id}'">
                <div style="font-weight: 600; font-size: 16px; color: #1e293b; margin-bottom: 4px;">📄 ${doc.title}</div>
                <div style="font-size: 12px; color: #94a3b8;">Terakhir diubah: ${date}</div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button onclick="window.location.href='editor.html?id=${doc.id}'" style="background: transparent; color: #4f46e5; border: none; font-weight: 500; cursor: pointer;">Buka →</button>
                <button onclick="deleteDocument('${doc.id}', '${doc.title}')" style="background: #fee2e2; color: #ef4444; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 14px;" title="Hapus Dokumen">🗑️</button>
            </div>
        `;
        listWrapper.appendChild(docItem);
    });
    documentContainer.appendChild(listWrapper);
}

// ==========================================
// 3. FUNGSI MENGHAPUS DOKUMEN
// ==========================================
async function deleteDocument(docId, docTitle) {
    // Munculkan peringatan sebelum menghapus (agar tidak tidak sengaja terklik)
    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus dokumen "${docTitle}"? Data yang dihapus tidak bisa dikembalikan.`);
    
    if (confirmDelete) {
        const { error } = await supabaseClient
            .from('documents')
            .delete()
            .eq('id', docId);

        if (error) {
            alert("Gagal menghapus dokumen: " + error.message);
        } else {
            // Jika berhasil dihapus, segarkan ulang halaman dashboard
            const { data: { session } } = await supabaseClient.auth.getSession();
            fetchUserDocuments(session.user.id);
        }
    }
}

// ==========================================
// 4. TOMBOL-TOMBOL UTAMA
// ==========================================
createDocBtn.addEventListener('click', () => window.location.href = "editor.html");

logoutBtn.addEventListener('click', async () => {
    logoutBtn.innerText = "Keluar...";
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
});

// Jalankan sistem
initDashboard();