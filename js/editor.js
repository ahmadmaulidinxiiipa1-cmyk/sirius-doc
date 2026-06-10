// js/editor.js

const editorCanvas = document.getElementById('editor-canvas');
const titleInput = document.querySelector('.document-title input');
const saveBtn = document.querySelector('.editor-navbar .btn-primary');

let currentDocId = null; // Menyimpan ID dokumen yang sedang dibuka
let autoSaveTimer; // Variabel untuk menghitung jeda mengetik

// ==========================================
// 1. INISIALISASI (Dijalankan saat halaman dibuka)
// ==========================================
async function initEditor() {
    // A. Cek apakah ada pengguna yang login
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session) {
        alert("Akses ditolak! Silakan masuk terlebih dahulu.");
        window.location.href = "login.html";
        return;
    }

    // B. Cek apakah pengguna sedang membuat dokumen baru atau membuka yang lama
    // (Mengecek URL, misalnya: editor.html?id=12345)
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    if (docId) {
        currentDocId = docId;
        await loadDocument(docId); // Buka dokumen lama
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
    const content = editorCanvas.innerHTML; // Mengambil seluruh tag HTML dari dalam kertas
    
    // Ambil ID pengguna saat ini
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userId = session.user.id;

    try {
        if (currentDocId) {
            // ---> SKENARIO A: PERBARUI DOKUMEN LAMA (UPDATE)
            const { error } = await supabaseClient
                .from('documents')
                .update({ title: title, content: content, updated_at: new Date() })
                .eq('id', currentDocId);
            
            if (error) throw error;
            
        } else {
            // ---> SKENARIO B: BUAT DOKUMEN BARU (INSERT)
            const { data, error } = await supabaseClient
                .from('documents')
                .insert([{ title: title, content: content, user_id: userId }])
                .select(); // Minta Supabase mengembalikan data yang baru dibuat
            
            if (error) throw error;
            
            // Simpan ID yang baru saja dibuat oleh Supabase
            currentDocId = data[0].id;
            
            // Ubah URL browser agar sistem tahu dokumen ini bukan baru lagi
            // (Mengubah editor.html menjadi editor.html?id=1234tanpa me-refresh halaman)
            window.history.replaceState({}, '', `editor.html?id=${currentDocId}`);
        }
        
        // Kembalikan status tombol
        saveBtn.innerText = "Tersimpan ✓";
        setTimeout(() => { saveBtn.innerText = "Simpan"; }, 3000);
        
    } catch (error) {
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
    
    // Batalkan hitungan mundur sebelumnya (jika user masih mengetik)
    clearTimeout(autoSaveTimer);
    
    // Mulai hitung mundur baru. Jika user diam 2 detik (2000ms), simpan otomatis!
    autoSaveTimer = setTimeout(() => {
        saveDocument();
    }, 2000);
}

// Pasang pendeteksi ketikan di kertas dan judul
editorCanvas.addEventListener('input', handleTyping);
titleInput.addEventListener('input', handleTyping);

// Pasang pendeteksi klik untuk tombol Simpan manual
saveBtn.addEventListener('click', saveDocument);

// ==========================================
// 5. ALAT FORMAT TEKS KERTAS (Bold, Italic, dll)
// ==========================================
function formatText(command) {
    document.execCommand(command, false, null);
    editorCanvas.focus(); // Kembalikan kursor ke kertas setelah tombol ditekan
    handleTyping(); // Panggil fungsi agar format baru ini ikut ter-AutoSave
}

// Panggil fungsi inisialisasi untuk menghidupkan semuanya
initEditor();
// ==========================================
// 6. FITUR EKSPOR KE PDF
// ==========================================
const exportPdfBtn = document.getElementById('export-pdf-btn');

exportPdfBtn.addEventListener('click', () => {
    // Ubah teks tombol saat sedang memproses
    const originalText = exportPdfBtn.innerText;
    exportPdfBtn.innerText = "Mencetak...";
    exportPdfBtn.disabled = true;

    // Ambil elemen kertas yang ingin dijadikan PDF
    const element = document.getElementById('editor-canvas');
    
    // Ambil judul dari input untuk dijadikan nama file PDF
    let fileName = titleInput.value.trim();
    if (!fileName) fileName = "Dokumen_Sirius";

    // Pengaturan bentuk PDF (margin, ukuran kertas A4, kualitas)
    const opt = {
        margin:       1,
        filename:     `${fileName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 }, // Agar teks di PDF tidak pecah/blur
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // Jalankan perintah dari library html2pdf
    html2pdf().set(opt).from(element).save().then(() => {
        // Kembalikan tombol seperti semula setelah selesai diunduh
        exportPdfBtn.innerText = originalText;
        exportPdfBtn.disabled = false;
    });
});