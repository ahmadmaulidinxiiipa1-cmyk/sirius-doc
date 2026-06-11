// js/editor.js
console.log("✅ Sistem Editor mulai berjalan...");

const editorCanvas = document.getElementById('editor-canvas');
const titleInput = document.getElementById('title-input');
const saveBtn = document.getElementById('save-btn');

let currentDocId = null; 
let autoSaveTimer; 

// ==========================================
// 1. INISIALISASI
// ==========================================
async function initEditor() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session) {
        alert("Akses ditolak! Silakan masuk terlebih dahulu.");
        window.location.href = "login.html";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    if (docId) {
        currentDocId = docId;
        await loadDocument(docId); 
    }
}

// ==========================================
// 2. FUNGSI MEMUAT DOKUMEN LAMA
// ==========================================
async function loadDocument(id) {
    saveBtn.innerText = "Memuat...";
    const { data, error } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert("Gagal memuat dokumen: " + error.message);
        saveBtn.innerText = "Error";
        return;
    }

    if (data) {
        titleInput.value = data.title;
        editorCanvas.innerHTML = data.content;
        saveBtn.innerText = "Tersimpan ✓";
    }
}

// ==========================================
// FUNGSI NOTIFIKASI CANTIK (TOAST)
// ==========================================
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    
    // Jika wadah belum ada, buat otomatis
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Buat kotak notifikasi
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    // Masukkan ke dalam wadah
    container.appendChild(toast);
    
    // Efek animasi muncul (10ms)
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hilangkan otomatis setelah 3 detik
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// 3. FUNGSI MENYIMPAN DOKUMEN (ANTI CRASH)
// ==========================================
async function saveDocument() {
    saveBtn.innerText = "Menyimpan...";
    saveBtn.disabled = true;

    const title = titleInput.value.trim();
    const content = editorCanvas.innerHTML; 
    
    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) throw new Error("Sesi login terputus.");
        const userId = session.user.id;

        if (currentDocId) {
            // UPDATE
            const { data, error } = await supabaseClient
                .from('documents')
                .update({ title: title, content: content, updated_at: new Date() })
                .eq('id', currentDocId)
                .select(); 
            
            if (error) throw new Error(error.message);
            if (!data || data.length === 0) throw new Error("Update diblokir oleh sistem keamanan!");
        } else {
            // BUAT BARU
            const { data, error } = await supabaseClient
                .from('documents')
                .insert([{ title: title, content: content, user_id: userId }])
                .select(); 
            
            if (error) throw new Error(error.message);
            if (!data || data.length === 0) throw new Error("Gagal disimpan, diblokir oleh Satpam Supabase!");
            
            currentDocId = data[0].id;
            try { window.history.replaceState({}, '', `editor.html?id=${currentDocId}`); } catch (e) {}
            
            // ALERT SUKSES DIGANTI JADI TOAST! ✅
            showToast("✅ Dokumen berhasil tersimpan!", "success");
        }
        
        saveBtn.innerText = "Tersimpan ✓";
        setTimeout(() => { saveBtn.innerText = "Simpan"; }, 3000);
        
    } catch (error) {
        // ALERT GAGAL DIGANTI JADI TOAST! 🚨
        showToast("🚨 GAGAL: " + error.message, "error");
        saveBtn.innerText = "Gagal Simpan";
    } finally {
        saveBtn.disabled = false;
    }
}

// ==========================================
// 4. PEMICU AUTO-SAVE & TOMBOL
// ==========================================
function handleTyping() {
    saveBtn.innerText = "Mengetik...";
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveDocument();
    }, 2000);
}

if (editorCanvas) editorCanvas.addEventListener('input', handleTyping);
if (titleInput) titleInput.addEventListener('input', handleTyping);
if (saveBtn) saveBtn.addEventListener('click', saveDocument);

// ==========================================
// 5. ALAT FORMAT TEKS KERTAS
// ==========================================
window.formatText = function(command) {
    document.execCommand(command, false, null);
    editorCanvas.focus(); 
    handleTyping(); 
}

// ==========================================
// 6. FITUR EKSPOR PDF
// ==========================================
const exportPdfBtn = document.getElementById('export-pdf-btn');
if(exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
        const originalText = exportPdfBtn.innerText;
        exportPdfBtn.innerText = "Mencetak...";
        exportPdfBtn.disabled = true;

        const element = document.getElementById('editor-canvas');
        let fileName = titleInput.value.trim();
        if (!fileName) fileName = "Dokumen_Sirius";

        const opt = {
            margin:       1,
            filename:     `${fileName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            exportPdfBtn.innerText = originalText;
            exportPdfBtn.disabled = false;
        });
    });
}

// ==========================================
// 7. FITUR EKSPOR WORD
// ==========================================
const exportWordBtn = document.getElementById('export-word-btn');
if(exportWordBtn) {
    exportWordBtn.addEventListener('click', () => {
        const content = document.getElementById('editor-canvas').innerHTML;
        let fileName = titleInput.value.trim();
        if (!fileName) fileName = "Dokumen_Sirius";

        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = fileName + '.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);
    });
}

// ==========================================
// 8. FUNGSI BAGIKAN DOKUMEN KE TEMAN ✅
// ==========================================
const shareBtn = document.getElementById('share-btn');
const shareModal = document.getElementById('share-modal');
const confirmShareBtn = document.getElementById('confirm-share-btn');

if (shareBtn) {
    shareBtn.addEventListener('click', () => {
        if (!currentDocId) { 
            showToast("Simpan dulu dokumennya sebelum dibagikan!", "error"); 
            return; 
        }
        shareModal.style.display = 'flex';
    });
}

if (confirmShareBtn) {
    confirmShareBtn.addEventListener('click', async () => {
        const email = document.getElementById('share-email').value;
        if (!email) return;

        // Memasukkan email teman ke tabel collaborators
        const { error } = await supabaseClient
            .from('collaborators')
            .insert([{ document_id: currentDocId, collaborator_email: email }]);

        if (error) {
            showToast("Gagal membagikan: " + error.message, "error");
        } else {
            showToast("✅ Berhasil dibagikan ke " + email, "success");
            shareModal.style.display = 'none'; // Tutup pop-up
            document.getElementById('share-email').value = ''; // Kosongkan input
        }
    });
}

// Jalankan sistem
initEditor();

// ==========================================
// 9. FUNGSI SALIN LINK DOKUMEN 🔗
// ==========================================
const copyLinkBtn = document.getElementById('copy-link-btn');

if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
        // Cek apakah dokumen sudah disave dan punya ID
        if (!currentDocId) {
            showToast("Simpan dokumen dulu sebelum menyalin link!", "error");
            return;
        }
        
        // Merakit link dokumenmu
        const docLink = window.location.origin + window.location.pathname + '?id=' + currentDocId;
        
        // Memerintahkan browser untuk meng-copy link
        navigator.clipboard.writeText(docLink).then(() => {
            showToast("🔗 Link berhasil disalin! Silakan kirim ke temanmu.", "success");
        }).catch(() => {
            showToast("🚨 Gagal menyalin link.", "error");
        });
    });
}