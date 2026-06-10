// js/editor.js

const editorCanvas = document.getElementById('editor-canvas');
const titleInput = document.querySelector('.document-title input');
const saveBtn = document.querySelector('.editor-navbar .btn-primary');

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
// 3. FUNGSI MENYIMPAN DOKUMEN (MANUAL & AUTO)
// ==========================================
async function saveDocument() {
    saveBtn.innerText = "Menyimpan...";
    saveBtn.disabled = true;

    const title = titleInput.value.trim();
    const content = editorCanvas.innerHTML; 
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userId = session.user.id;

    try {
        if (currentDocId) {
            // UPDATE DOKUMEN
            const { error } = await supabaseClient
                .from('documents')
                .update({ title: title, content: content, updated_at: new Date() })
                .eq('id', currentDocId);
            
            if (error) throw error;
            
        } else {
            // BUAT DOKUMEN BARU
            const { data, error } = await supabaseClient
                .from('documents')
                .insert([{ title: title, content: content, user_id: userId }])
                .select(); 
            
            if (error) throw error;
            
            currentDocId = data[0].id;
            
            // Perbaikan URL agar tidak bentrok
            try {
                window.history.replaceState({}, '', `editor.html?id=${currentDocId}`);
            } catch (urlError) {
                console.log("URL History ditahan (Mode Lokal)");
            }
        }
        
        saveBtn.innerText = "Tersimpan ✓";
        setTimeout(() => { saveBtn.innerText = "Simpan"; }, 3000);
        
    } catch (error) {
        console.error("Error Supabase:", error);
        alert("Gagal menyimpan: " + error.message);
        saveBtn.innerText = "Simpan";
    } finally {
        saveBtn.disabled = false;
    }
}

// ==========================================
// 4. PEMICU AUTO-SAVE (Mendeteksi Ketikan)
// ==========================================
function handleTyping() {
    saveBtn.innerText = "Mengetik...";
    clearTimeout(autoSaveTimer);
    
    autoSaveTimer = setTimeout(() => {
        saveDocument();
    }, 2000);
}

editorCanvas.addEventListener('input', handleTyping);
titleInput.addEventListener('input', handleTyping);
saveBtn.addEventListener('click', saveDocument);

// ==========================================
// 5. ALAT FORMAT TEKS KERTAS
// ==========================================
function formatText(command) {
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

// Jalankan editor
initEditor();