// js/editor.js
console.log("✅ Sistem Editor mulai berjalan...");

const editorCanvas = document.getElementById('editor-canvas');
const titleInput = document.getElementById('title-input');
const saveBtn = document.getElementById('save-btn');

let currentDocId = null; 
let autoSaveTimer; 
let realtimeChannel = null; // Variabel global untuk saluran komunikasi
let myUserId = null;        // Variabel global untuk menyimpan ID user aktif

// ==========================================
// 1. INISIALISASI & MULTIPLAYER TRIGGER
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
        
        // Panggil sistem kehadiran & siaran (Canva Mode) setelah dokumen dimuat
        initMultiplayer(docId);
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
        
        // --- FITUR BARU: Cocokkan status dropdown dengan database ---
        const linkModeSelect = document.getElementById('link-mode-select');
        if (linkModeSelect && data.link_mode) {
            linkModeSelect.value = data.link_mode;
        }
    }
}

// ==========================================
// FUNGSI NOTIFIKASI CANTIK (TOAST)
// ==========================================
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
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
            const { data, error } = await supabaseClient
                .from('documents')
                .update({ title: title, content: content, updated_at: new Date() })
                .eq('id', currentDocId)
                .select(); 
            
            if (error) throw new Error(error.message);
            if (!data || data.length === 0) throw new Error("Update diblokir oleh sistem keamanan!");
        } else {
            const { data, error } = await supabaseClient
                .from('documents')
                .insert([{ title: title, content: content, user_id: userId }])
                .select(); 
            
            if (error) throw new Error(error.message);
            if (!data || data.length === 0) throw new Error("Gagal disimpan, diblokir oleh Satpam Supabase!");
            
            currentDocId = data[0].id;
            try { window.history.replaceState({}, '', `editor.html?id=${currentDocId}`); } catch (e) {}
            
            showToast("✅ Dokumen berhasil tersimpan!", "success");
            initMultiplayer(currentDocId); // Mulai Realtime jika ini dokumen baru
        }
        
        saveBtn.innerText = "Tersimpan ✓";
        setTimeout(() => { saveBtn.innerText = "Simpan"; }, 3000);
        
    } catch (error) {
        showToast("🚨 GAGAL: " + error.message, "error");
        saveBtn.innerText = "Gagal Simpan";
    } finally {
        saveBtn.disabled = false;
    }
}

// ==========================================
// 4. PEMICU AUTO-SAVE & ALAT FORMAT
// ==========================================
function handleTyping() {
    saveBtn.innerText = "Mengetik...";
    
    // ✅ 1. SIARKAN KETIKAN SECARA REAL-TIME KEPADA TEMAN (CANVA MODE)
    if (realtimeChannel && myUserId) {
        realtimeChannel.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
                user_id: myUserId,
                title: titleInput.value,
                content: editorCanvas.innerHTML
            }
        });
    }

    // 2. Timer untuk Autosave ke database (tetap berjalan di latar belakang)
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveDocument(), 2000);
}

if (editorCanvas) editorCanvas.addEventListener('input', handleTyping);
if (titleInput) titleInput.addEventListener('input', handleTyping);
if (saveBtn) saveBtn.addEventListener('click', saveDocument);

window.formatText = function(command) {
    document.execCommand(command, false, null);
    editorCanvas.focus(); 
    handleTyping(); // Picu siaran perubahan format teks
}

// ==========================================
// 5. FITUR EKSPOR PDF & WORD
// ==========================================
const exportPdfBtn = document.getElementById('export-pdf-btn');
if(exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
        const originalText = exportPdfBtn.innerText;
        exportPdfBtn.innerText = "Mencetak...";
        exportPdfBtn.disabled = true;

        const element = document.getElementById('editor-canvas');
        let fileName = titleInput.value.trim() || "Dokumen_Sirius";

        html2pdf().set({
            margin: 1, filename: `${fileName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        }).from(element).save().then(() => {
            exportPdfBtn.innerText = originalText;
            exportPdfBtn.disabled = false;
        });
    });
}

const exportWordBtn = document.getElementById('export-word-btn');
if(exportWordBtn) {
    exportWordBtn.addEventListener('click', () => {
        const content = document.getElementById('editor-canvas').innerHTML;
        let fileName = titleInput.value.trim() || "Dokumen_Sirius";
        const sourceHTML = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>" + content + "</body></html>";
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        fileDownload.download = fileName + '.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);
    });
}

// ==========================================
// 6. FITUR BAGIKAN DOKUMEN & PENGATURAN LINK
// ==========================================
const shareBtn = document.getElementById('share-btn');
const shareModal = document.getElementById('share-modal');
const confirmShareBtn = document.getElementById('confirm-share-btn');
const copyLinkBtn = document.getElementById('copy-link-btn');

// Deklarasi Elemen Baru di Modal
const linkModeSelect = document.getElementById('link-mode-select');
const copyLinkModalBtn = document.getElementById('copy-link-modal-btn');

// Buka Modal Bagikan
if (shareBtn) shareBtn.addEventListener('click', () => {
    if (!currentDocId) return showToast("Simpan dulu dokumennya sebelum dibagikan!", "error");
    shareModal.style.display = 'flex';
});

// Logika 1: Undang via Email
if (confirmShareBtn) confirmShareBtn.addEventListener('click', async () => {
    const email = document.getElementById('share-email').value;
    if (!email) return;
    const { error } = await supabaseClient.from('collaborators').insert([{ document_id: currentDocId, collaborator_email: email }]);
    if (error) showToast("Gagal membagikan: " + error.message, "error");
    else { showToast("✅ Berhasil dibagikan ke " + email, "success"); document.getElementById('share-email').value = ''; }
});

// Logika 2: Salin Link Cepat (di luar & di dalam modal)
const copyLinkAction = () => {
    if (!currentDocId) return showToast("Simpan dokumen dulu sebelum menyalin link!", "error");
    navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?id=' + currentDocId)
        .then(() => showToast("🔗 Link berhasil disalin!", "success"))
        .catch(() => showToast("🚨 Gagal menyalin link.", "error"));
};
if (copyLinkBtn) copyLinkBtn.addEventListener('click', copyLinkAction);
if (copyLinkModalBtn) copyLinkModalBtn.addEventListener('click', copyLinkAction);

// Logika 3: Mengubah Status Link saat Dropdown diganti (FITUR BARU)
if (linkModeSelect) {
    linkModeSelect.addEventListener('change', async (e) => {
        const newMode = e.target.value; // 'private', 'view', atau 'edit'
        
        const { error } = await supabaseClient
            .from('documents')
            .update({ link_mode: newMode })
            .eq('id', currentDocId);
            
        if (error) {
            showToast("🚨 Gagal merubah akses: " + error.message, "error");
        } else {
            // Beri notifikasi sesuai pilihan
            if (newMode === 'private') showToast("🔒 Link diubah menjadi Pribadi", "info");
            else if (newMode === 'view') showToast("👁️ Siapa saja sekarang bisa Melihat", "success");
            else if (newMode === 'edit') showToast("✏️ Siapa saja sekarang bisa Mengedit", "success");
        }
    });
}

// ==========================================
// 7. FITUR MULTIPLAYER: INDIKATOR KEHADIRAN & BROADCAST 🟢
// ==========================================
const collaboratorsContainer = document.getElementById('collaborators-container');

async function initMultiplayer(docId) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    
    myUserId = session.user.id; // Menyimpan ID kita ke variabel global
    const myName = session.user.email.split('@')[0];

    // Buka saluran khusus dokumen ini
    realtimeChannel = supabaseClient.channel('document-' + docId);

    // [Presence] Dengarkan siapa yang masuk dan keluar halaman dokumen
    realtimeChannel.on('presence', { event: 'sync' }, () => {
        const newState = realtimeChannel.presenceState();
        renderCollaborators(newState, session.user.id);
    });

    // [Broadcast] ✅ JALUR TERIMA SIARAN: Dengarkan apa yang diketik teman
    realtimeChannel.on('broadcast', { event: 'typing' }, (response) => {
        const { user_id, title, content } = response.payload;
        
        // Hanya update jika siaran dikirim oleh orang lain
        if (user_id !== session.user.id) {
            
            // TRICK PRO: Jangan update kolom jika kita sendiri sedang fokus mengetik di sana 
            if (document.activeElement !== titleInput && titleInput.value !== title) {
                titleInput.value = title;
            }
            if (document.activeElement !== editorCanvas && editorCanvas.innerHTML !== content) {
                editorCanvas.innerHTML = content;
            }
        }
    });

    // Daftarkan dan umumkan kehadiran kita ke saluran
    realtimeChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await realtimeChannel.track({
                user_id: session.user.id,
                user_name: myName,
                color: getRandomColor(myName)
            });
        }
    });
}

function renderCollaborators(presenceState, myUserId) {
    if (!collaboratorsContainer) return;
    collaboratorsContainer.innerHTML = ''; 

    for (const id in presenceState) {
        const userPresence = presenceState[id][0];
        if (userPresence.user_id === myUserId) continue; // Lewati deteksi diri sendiri

        const initial = userPresence.user_name.charAt(0).toUpperCase();
        const avatar = document.createElement('div');
        avatar.style.cssText = `
            width: 32px; height: 32px; border-radius: 50%;
            background-color: ${userPresence.color}; color: white;
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 14px; border: 2px solid white; 
            margin-left: -10px; z-index: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer;
        `;
        avatar.title = userPresence.user_name + " sedang mengetik..."; 
        avatar.innerText = initial;
        
        collaboratorsContainer.appendChild(avatar);
    }
}

function getRandomColor(name) {
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// Jalankan sistem utama editor
initEditor();