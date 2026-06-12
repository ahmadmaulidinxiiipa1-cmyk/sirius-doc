// js/editor.js
console.log("✅ Sistem Editor mulai berjalan...");

const editorCanvas = document.getElementById('editor-canvas');
const titleInput = document.getElementById('title-input');
const saveBtn = document.getElementById('save-btn');

let currentDocId = null; 
let autoSaveTimer; 
let realtimeChannel = null; 
let myUserId = null;        

// ==========================================
// 1. INISIALISASI & MULTIPLAYER TRIGGER
// ==========================================
async function initEditor() {
    if (typeof supabaseClient === 'undefined') {
        console.error("🚨 Error: 'supabaseClient' tidak ditemukan.");
        return;
    }

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
        initMultiplayer(docId);
    }
}

// ==========================================
// 2. FUNGSI MEMUAT DOKUMEN & CEK HAK AKSES
// ==========================================
async function loadDocument(id) {
    if (saveBtn) saveBtn.innerText = "Memuat...";
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    const myEmail = session.user.email;
    const myId = session.user.id;

    const { data, error } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert("🔒 Akses Ditolak atau Dokumen tidak ditemukan!");
        window.location.href = "dashboard.html";
        return;
    }

    if (data) {
        if (titleInput) titleInput.value = data.title || "Dokumen Tanpa Judul";
        if (editorCanvas) editorCanvas.innerHTML = data.content || "";
        if (saveBtn) saveBtn.innerText = "Tersimpan ✓";
        
        // --- LOGIKA SATPAM: Tentukan Hak Akses ---
        let permission = 'none'; 
        
        if (data.user_id === myId) {
            permission = 'owner'; 
        } else if (data.link_mode === 'edit') {
            permission = 'edit';  
        } else if (data.link_mode === 'view') {
            permission = 'view';  
        } else {
            const { data: collab } = await supabaseClient
                .from('collaborators')
                .select('*')
                .eq('document_id', id)
                .eq('collaborator_email', myEmail)
                .maybeSingle();
                
            if (collab) {
                permission = 'edit'; 
            }
        }

        // Terapkan Kunci Layar
        applyPermissions(permission);

        // Update Dropdown Status Link (Hanya terlihat jika ada di modal)
        const linkModeSelect = document.getElementById('link-mode-select');
        if (linkModeSelect && data.link_mode) {
            linkModeSelect.value = data.link_mode;
        }
    }
}

// MESIN PENGUNCI LAYAR OTOMATIS (BEBAS TYPO)
function applyPermissions(permission) {
    if (!editorCanvas || !titleInput) return; 

    const sidebar = document.querySelector('.sidebar');
    const shareBtn = document.getElementById('share-btn');
    const badge = document.getElementById('view-only-badge');
    
    if (permission === 'owner' || permission === 'edit') {
        editorCanvas.setAttribute('contenteditable', 'true');
        titleInput.disabled = false;
        if (sidebar) sidebar.style.display = 'flex'; // ✅ Bersih dari typo!
        if (saveBtn) saveBtn.style.display = 'inline-block';
        if (shareBtn) shareBtn.style.display = 'inline-block';
        if (badge) badge.remove(); 
    } else if (permission === 'view') {
        editorCanvas.setAttribute('contenteditable', 'false');
        titleInput.disabled = true;
        if (sidebar) sidebar.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (shareBtn) shareBtn.style.display = 'none'; 
        
        if (!document.getElementById('view-only-badge')) {
            const viewBadge = document.createElement('span');
            viewBadge.id = 'view-only-badge';
            viewBadge.innerText = '👁️ Mode Melihat';
            viewBadge.style.cssText = 'background: #e2e8f0; color: #475569; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-left: 15px; display: inline-block; vertical-align: middle;';
            titleInput.parentNode.appendChild(viewBadge);
        }
    } else {
        alert("🔒 Dokumen ini bersifat Pribadi. Akses ditolak!");
        window.location.href = "dashboard.html";
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
    if (!saveBtn || !editorCanvas || !titleInput) return;

    saveBtn.innerText = "Menyimpan...";
    saveBtn.disabled = true;

    const title = titleInput.value.trim();
    const content = editorCanvas.innerHTML; 
    
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const userId = session.user.id;

        if (currentDocId) {
            const { data, error } = await supabaseClient
                .from('documents')
                .update({ title: title, content: content, updated_at: new Date() })
                .eq('id', currentDocId)
                .select(); 
            if (error) throw new Error(error.message);
        } else {
            const { data, error } = await supabaseClient
                .from('documents')
                .insert([{ title: title, content: content, user_id: userId }])
                .select(); 
            if (error) throw new Error(error.message);
            
            currentDocId = data[0].id;
            try { window.history.replaceState({}, '', `editor.html?id=${currentDocId}`); } catch (e) {}
            
            showToast("✅ Dokumen berhasil tersimpan!", "success");
            initMultiplayer(currentDocId); 
        }
        
        saveBtn.innerText = "Tersimpan ✓";
        setTimeout(() => { if (saveBtn) saveBtn.innerText = "Simpan"; }, 3000);
        
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
    if (saveBtn) saveBtn.innerText = "Mengetik...";
    
    if (realtimeChannel && myUserId && titleInput && editorCanvas) {
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

    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveDocument(), 2000);
}

if (editorCanvas) editorCanvas.addEventListener('input', handleTyping);
if (titleInput) titleInput.addEventListener('input', handleTyping);
if (saveBtn) saveBtn.addEventListener('click', saveDocument);

window.formatText = function(command, value = null) {
    document.execCommand(command, false, value);
    if (editorCanvas) editorCanvas.focus(); 
    handleTyping(); 
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
        let fileName = titleInput ? titleInput.value.trim() : "Dokumen_Sirius";

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
        if (!editorCanvas) return;
        const content = editorCanvas.innerHTML;
        let fileName = titleInput ? titleInput.value.trim() : "Dokumen_Sirius";
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
const linkModeSelect = document.getElementById('link-mode-select');
const copyLinkModalBtn = document.getElementById('copy-link-modal-btn');

if (shareBtn) shareBtn.addEventListener('click', () => {
    if (!currentDocId) return showToast("Simpan dulu dokumennya sebelum dibagikan!", "error");
    if (shareModal) shareModal.style.display = 'flex';
});

if (confirmShareBtn) confirmShareBtn.addEventListener('click', async () => {
    const emailInputEl = document.getElementById('share-email');
    const email = emailInputEl ? emailInputEl.value : '';
    if (!email) return;
    const { error } = await supabaseClient.from('collaborators').insert([{ document_id: currentDocId, collaborator_email: email }]);
    if (error) showToast("Gagal membagikan: " + error.message, "error");
    else { 
        showToast("✅ Berhasil dibagikan ke " + email, "success"); 
        if (emailInputEl) emailInputEl.value = ''; 
    }
});

const copyLinkAction = () => {
    if (!currentDocId) return showToast("Simpan dokumen dulu sebelum menyalin link!", "error");
    navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?id=' + currentDocId)
        .then(() => showToast("🔗 Link berhasil disalin!", "success"))
        .catch(() => showToast("🚨 Gagal menyalin link.", "error"));
};
if (copyLinkBtn) copyLinkBtn.addEventListener('click', copyLinkAction);
if (copyLinkModalBtn) copyLinkModalBtn.addEventListener('click', copyLinkAction);

// SIARKAN PERUBAHAN IZIN KE TEMAN LAIN
if (linkModeSelect) {
    linkModeSelect.addEventListener('change', async (e) => {
        const newMode = e.target.value; 
        
        const { error } = await supabaseClient
            .from('documents')
            .update({ link_mode: newMode })
            .eq('id', currentDocId);
            
        if (error) {
            showToast("🚨 Gagal merubah akses: " + error.message, "error");
        } else {
            if (newMode === 'private') showToast("🔒 Link diubah menjadi Pribadi", "info");
            else if (newMode === 'view') showToast("👁️ Siapa saja sekarang bisa Melihat", "success");
            else if (newMode === 'edit') showToast("✏️ Siapa saja sekarang bisa Mengedit", "success");
            
            if (realtimeChannel) {
                realtimeChannel.send({
                    type: 'broadcast',
                    event: 'permission_update',
                    payload: { link_mode: newMode }
                });
            }
        }
    });
}

// ==========================================
// 7. FITUR MULTIPLAYER & TERIMA SIARAN
// ==========================================
const collaboratorsContainer = document.getElementById('collaborators-container');

async function initMultiplayer(docId) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    
    myUserId = session.user.id; 
    const myName = session.user.email.split('@')[0];

    realtimeChannel = supabaseClient.channel('document-' + docId);

    realtimeChannel.on('presence', { event: 'sync' }, () => {
        const newState = realtimeChannel.presenceState();
        renderCollaborators(newState, session.user.id);
    });

    realtimeChannel.on('broadcast', { event: 'typing' }, (response) => {
        const { user_id, title, content } = response.payload;
        if (user_id !== session.user.id) {
            if (titleInput && document.activeElement !== titleInput && titleInput.value !== title) {
                titleInput.value = title;
            }
            if (editorCanvas && document.activeElement !== editorCanvas && editorCanvas.innerHTML !== content) {
                editorCanvas.innerHTML = content;
            }
        }
    });

    // 📡 TERIMA PERINTAH KUNCI LAYAR DARI OWNER
    realtimeChannel.on('broadcast', { event: 'permission_update' }, async (response) => {
        if (currentDocId) {
            await loadDocument(currentDocId);
            showToast("⚠️ Pemilik dokumen telah memperbarui hak akses halaman ini.", "info");
        }
    });

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
        if (userPresence.user_id === myUserId) continue; 

        const initial = userPresence.user_name.charAt(0).toUpperCase();
        const avatar = document.createElement('div');
        avatar.style.cssText = `
            width: 32px; height: 32px; border-radius: 50%;
            background-color: ${userPresence.color}; color: white;
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 14px; border: 2px solid white; 
            margin-left: -10px; z-index: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer;
        `;
        avatar.title = userPresence.user_name + " sedang berada di sini"; 
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

// ==========================================
// 8. LOGIKA FLOATING TOOLBAR (GAYA CANVA)
// ==========================================
const floatingToolbar = document.getElementById('floating-toolbar');

if (floatingToolbar) {
    floatingToolbar.addEventListener('mousedown', (e) => {
        e.preventDefault(); 
    });
}

document.addEventListener('selectionchange', () => {
    if (!floatingToolbar || !editorCanvas) return; 

    // Jika mode melihat, sembunyikan toolbar
    if (editorCanvas.getAttribute('contenteditable') === 'false') {
        floatingToolbar.style.display = 'none';
        return;
    }

    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        if (editorCanvas.contains(range.commonAncestorContainer)) {
            const rect = range.getBoundingClientRect(); 
            floatingToolbar.style.display = 'flex';
            let topPos = rect.top - floatingToolbar.offsetHeight - 10;
            let leftPos = rect.left + (rect.width / 2) - (floatingToolbar.offsetWidth / 2);
            if (topPos < 10) topPos = rect.bottom + 10; 
            floatingToolbar.style.top = `${topPos}px`;
            floatingToolbar.style.left = `${leftPos}px`;
        } else {
            floatingToolbar.style.display = 'none';
        }
    } else {
        floatingToolbar.style.display = 'none';
    }
});

// ==========================================
// 9. FITUR UPLOAD GAMBAR & TABEL (CANVA TOOLS)
// ==========================================
const imageUpload = document.getElementById('image-upload');
const imageBtn = document.getElementById('image-btn');

if (imageBtn && imageUpload) {
    imageBtn.addEventListener('click', () => { imageUpload.click(); });
}

if (imageUpload) {
    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showToast("⏳ Mengunggah gambar...", "info");
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        try {
            const { error: uploadError } = await supabaseClient.storage.from('document-images').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data } = supabaseClient.storage.from('document-images').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            if (editorCanvas) {
                editorCanvas.focus();
                const imgTag = `<img src="${publicUrl}" style="max-width: 100%; border-radius: 8px; margin: 15px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">`;
                document.execCommand('insertHTML', false, imgTag);
            }
            showToast("✅ Gambar berhasil disisipkan!", "success");
            handleTyping(); 
        } catch (error) {
            showToast("🚨 Gagal unggah: " + error.message, "error");
        } finally {
            e.target.value = ''; 
        }
    });
}

window.insertTable = function(rows, cols) {
    if (!editorCanvas) return;
    editorCanvas.focus();
    let tableHTML = '<table><tbody>';
    for (let i = 0; i < rows; i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < cols; j++) {
            if (i === 0) tableHTML += '<th>Header</th>';
            else tableHTML += '<td>Ketik di sini...</td>';
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table><p><br></p>'; 
    document.execCommand('insertHTML', false, tableHTML);
    handleTyping(); 
};

window.insertDivider = function() {
    if (!editorCanvas) return;
    editorCanvas.focus();
    const hrHTML = '<hr style="border: 0; height: 1px; background: #cbd5e1; margin: 30px 0;"><p><br></p>';
    document.execCommand('insertHTML', false, hrHTML);
    handleTyping();
};

// Jalankan sistem
initEditor();
// ==========================================
// 10. SISTEM EDIT TABEL DINAMIS (CANVA STYLE)
// ==========================================
const tableToolbar = document.getElementById('table-toolbar');
let currentTable = null;
let currentRow = null;
let currentCell = null;

// Deteksi klik pada tabel
if (editorCanvas) {
    editorCanvas.addEventListener('click', (e) => {
        const cell = e.target.closest('td, th');
        
        if (cell && editorCanvas.contains(cell)) {
            currentCell = cell;
            currentRow = cell.closest('tr');
            currentTable = cell.closest('table');

            // Munculkan toolbar
            const rect = currentTable.getBoundingClientRect();
            tableToolbar.style.display = 'flex';
            tableToolbar.style.position = 'absolute'; // Pastikan absolute agar mengikuti posisi
            tableToolbar.style.top = `${rect.top + window.scrollY - 45}px`;
            tableToolbar.style.left = `${rect.left + window.scrollX}px`;
        } else {
            if (tableToolbar) tableToolbar.style.display = 'none';
            currentTable = null;
        }
    });
}

// FUNGSI AKSI (Pastikan nama fungsi ini sama dengan di HTML)
window.addTableRow = function() {
    if (!currentTable || !currentRow) return;
    const newRow = currentRow.cloneNode(true);
    newRow.querySelectorAll('td, th').forEach(c => c.innerText = '...');
    currentRow.after(newRow);
    handleTyping();
};

window.addTableCol = function() {
    if (!currentTable || !currentCell) return;
    const cellIndex = Array.from(currentRow.children).indexOf(currentCell);
    currentTable.querySelectorAll('tr').forEach(row => {
        const newCell = row.children[cellIndex].cloneNode(true);
        newCell.innerText = '...';
        row.children[cellIndex].after(newCell);
    });
    handleTyping();
};

window.deleteTableRow = function() {
    if (!currentTable || !currentRow) return;
    if (currentTable.querySelectorAll('tr').length <= 1) return alert("Minimal 1 baris!");
    currentRow.remove();
    tableToolbar.style.display = 'none';
    handleTyping();
};

window.deleteTableCol = function() {
    if (!currentTable || !currentCell) return;
    const cellIndex = Array.from(currentRow.children).indexOf(currentCell);
    if (currentRow.children.length <= 1) return alert("Minimal 1 kolom!");
    currentTable.querySelectorAll('tr').forEach(row => {
        if (row.children[cellIndex]) row.children[cellIndex].remove();
    });
    tableToolbar.style.display = 'none';
    handleTyping();
};

window.deleteTableFull = function() {
    if (currentTable) {
        currentTable.remove();
        tableToolbar.style.display = 'none';
        handleTyping();
    }
};
// ==========================================
// 11. FITUR PENGATURAN UKURAN KERTAS DINAMIS
// ==========================================
const paperSizeSelect = document.getElementById('paper-size-select');
const customPaperInputs = document.getElementById('custom-paper-inputs');
const customWidth = document.getElementById('custom-width');
const customHeight = document.getElementById('custom-height');

// Data Ukuran Kertas Standar (dalam milimeter)
const paperSizes = {
    'a4': { width: '210mm', minHeight: '297mm' },
    'legal': { width: '216mm', minHeight: '356mm' },
    'f4': { width: '215mm', minHeight: '330mm' }
};

function applyPaperSize() {
    if (!editorCanvas) return;
    
    const size = paperSizeSelect.value;
    
    if (size === 'custom') {
        // Tampilkan kotak input angka jika pilih Custom
        customPaperInputs.style.display = 'flex';
        editorCanvas.style.width = customWidth.value + 'mm';
        editorCanvas.style.minHeight = customHeight.value + 'mm';
    } else {
        // Sembunyikan kotak input dan gunakan ukuran standar
        customPaperInputs.style.display = 'none';
        editorCanvas.style.width = paperSizes[size].width;
        editorCanvas.style.minHeight = paperSizes[size].minHeight;
    }
}

// Pasang pendeteksi perubahan
if (paperSizeSelect) {
    paperSizeSelect.addEventListener('change', applyPaperSize);
}
if (customWidth && customHeight) {
    customWidth.addEventListener('input', applyPaperSize);
    customHeight.addEventListener('input', applyPaperSize);
}
// ==========================================
// 12. FITUR RESIZE GAMBAR (OTAK-ATIK ALA CANVA)
// ==========================================
let activeImage = null;
let isResizing = false;
let startX, startWidth;

if (editorCanvas) {
    // 1. Deteksi saat gambar diklik untuk dimunculkan kotaknya
    editorCanvas.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            // Bersihkan efek dari gambar sebelumnya jika ada
            if (activeImage) activeImage.style.outline = 'none';
            
            activeImage = e.target;
            // Beri garis tepi biru sebagai tanda sedang diedit
            activeImage.style.outline = '3px solid #4f46e5';
            activeImage.style.cursor = 'ew-resize'; // Kursor panah kanan-kiri
        } else {
            // Jika klik di luar gambar, hilangkan garis tepinya
            if (activeImage) {
                activeImage.style.outline = 'none';
                activeImage.style.cursor = 'default';
                activeImage = null;
            }
        }
    });

    // 2. Mulai proses tarik ukuran (Klik Tahan)
    editorCanvas.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'IMG' && activeImage === e.target) {
            isResizing = true;
            startX = e.clientX;
            // Ambil ukuran lebar gambar saat ini
            startWidth = activeImage.clientWidth; 
            e.preventDefault(); // Mencegah gambar ter-drag seperti teks
        }
    });

    // 3. Proses mengubah ukuran saat mouse digeser
    document.addEventListener('mousemove', (e) => {
        if (isResizing && activeImage) {
            // Hitung ukuran baru berdasarkan pergeseran mouse
            const newWidth = startWidth + (e.clientX - startX);
            // Terapkan ukuran baru (jangan sampai lebih lebar dari kertas)
            activeImage.style.width = `${newWidth}px`;
            activeImage.style.maxWidth = '100%'; 
            activeImage.style.height = 'auto'; // Biar proporsional tidak gepeng
        }
    });

    // 4. Selesai menarik (Lepas Klik)
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            handleTyping(); // Otomatis simpan ukuran baru ke database & siarkan ke teman!
        }
    });
}

// ==========================================
// KODE TAMBAHAN: Panggil ukuran kertas saat pertama kali aplikasi dibuka!
// ==========================================
applyPaperSize();
// ==========================================
// 13. LOGIKA MENU DROPDOWN (TITIK TIGA)
// ==========================================
const menuDropdownBtn = document.getElementById('menu-dropdown-btn');
const actionMenu = document.getElementById('action-menu');

if (menuDropdownBtn && actionMenu) {
    // Buka/Tutup menu saat tombol diklik
    menuDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Mencegah klik bocor
        actionMenu.style.display = actionMenu.style.display === 'flex' ? 'none' : 'flex';
    });

    // Tutup menu otomatis jika pengguna mengklik area lain di luar menu
    document.addEventListener('click', (e) => {
        if (!actionMenu.contains(e.target) && e.target !== menuDropdownBtn) {
            actionMenu.style.display = 'none';
        }
    });
}