/*
============================================================
INTEGRASI SUPABASE UNTUK index.html
REKAP TAT BNN KOTA MOJOKERTO
============================================================

1. Tambahkan CDN Supabase setelah Chart.js:
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

2. Ganti URL dan publishable/anon key di bawah.
   Jangan gunakan service_role/secret key di browser.

3. Blok-blok di bawah menggantikan bagian DATA, STORAGE,
   SAVE, DELETE, INITIAL LOAD, dan SCRIPT LOGIN lama.
============================================================
*/

/* ==========================================================
   SUPABASE CONFIG
   ========================================================== */

const SUPABASE_URL = "https://GANTI-PROJECT-ID.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "GANTI-DENGAN-PUBLISHABLE-KEY-ATAU-ANON-KEY";

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);


/* ==========================================================
   DATA
   ========================================================== */

const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember"
];

let dataTAT = [];
let editIndex = null;


/* ==========================================================
   HELPER TANGGAL
   Tetap kompatibel dengan fungsi lama.
   ========================================================== */

function getMonthName(dateValue) {
    if (!dateValue) return "";

    const date = new Date(dateValue + "T00:00:00");

    if (isNaN(date.getTime())) return "";

    return date.toLocaleDateString("id-ID", {
        month: "long"
    });
}

function formatDate(dateValue) {
    if (!dateValue) return "-";

    const date = new Date(dateValue + "T00:00:00");

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}


/* ==========================================================
   LOAD DATABASE
   ========================================================== */

async function loadDataFromDatabase() {
    const { data, error } = await sb
        .from("data_tat")
        .select("id,nama,nik,alamat,usia,pekerjaan,pendidikan,tanggal")
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("LOAD DATA:", error);
        alert("Gagal mengambil data dari database: " + error.message);
        return false;
    }

    dataTAT = data || [];

    renderTable();
    updateDashboard();
    updateStatistics();
    updateCharts();

    return true;
}


/* ==========================================================
   MODAL
   ========================================================== */

function openModal(index = null) {
    editIndex = index;

    document
        .getElementById("dataModal")
        .classList.add("show");

    if (index !== null) {
        document.getElementById("modalTitle").textContent = "Edit Data TAT";

        const item = dataTAT[index];

        document.getElementById("nama").value = item.nama || "";
        document.getElementById("nik").value = item.nik || "";
        document.getElementById("alamat").value = item.alamat || "";
        document.getElementById("usia").value = item.usia ?? "";
        document.getElementById("pekerjaan").value = item.pekerjaan || "";
        document.getElementById("pendidikan").value = item.pendidikan || "";
        document.getElementById("tanggal").value = item.tanggal || "";
    } else {
        document.getElementById("modalTitle").textContent = "Tambah Data TAT";
        document.getElementById("dataForm").reset();
    }
}

function closeModal() {
    document
        .getElementById("dataModal")
        .classList.remove("show");

    document
        .getElementById("dataForm")
        .reset();

    editIndex = null;
}


/* ==========================================================
   CREATE / UPDATE
   ========================================================== */

async function saveData(event) {
    event.preventDefault();

    const item = {
        nama: document.getElementById("nama").value.trim(),
        nik: document.getElementById("nik").value.trim(),
        alamat: document.getElementById("alamat").value.trim(),
        usia: Number(document.getElementById("usia").value),
        pekerjaan: document.getElementById("pekerjaan").value.trim(),
        pendidikan: document.getElementById("pendidikan").value,
        tanggal: document.getElementById("tanggal").value
    };

    if (
        !item.nama ||
        !item.nik ||
        !item.alamat ||
        !item.usia ||
        !item.pekerjaan ||
        !item.pendidikan ||
        !item.tanggal
    ) {
        alert("Mohon lengkapi semua data.");
        return;
    }

    const wasEditing = editIndex !== null;

    try {
        if (wasEditing) {
            const id = dataTAT[editIndex]?.id;

            if (!id) {
                throw new Error("ID data tidak ditemukan.");
            }

            const { error } = await sb
                .from("data_tat")
                .update(item)
                .eq("id", id);

            if (error) throw error;

        } else {
            const { error } = await sb
                .from("data_tat")
                .insert(item);

            if (error) throw error;
        }

        await loadDataFromDatabase();
        closeModal();

        alert(
            wasEditing
                ? "Data berhasil diperbarui."
                : "Data berhasil ditambahkan."
        );

    } catch (error) {
        console.error("SAVE DATA:", error);
        alert("Gagal menyimpan data: " + error.message);
    }
}


/* ==========================================================
   DELETE
   ========================================================== */

async function deleteData(index) {
    const item = dataTAT[index];

    if (!item?.id) {
        alert("ID data tidak ditemukan.");
        return;
    }

    if (!confirm(`Hapus data ${item.nama}?`)) {
        return;
    }

    try {
        const { error } = await sb
            .from("data_tat")
            .delete()
            .eq("id", item.id);

        if (error) throw error;

        await loadDataFromDatabase();

        alert("Data berhasil dihapus.");

    } catch (error) {
        console.error("DELETE DATA:", error);
        alert("Gagal menghapus data: " + error.message);
    }
}


/* ==========================================================
   LOGIN SUPABASE AUTH
   Menggantikan LOGIN_EMAIL, LOGIN_PASSWORD,
   sessionStorage TAT_LOGIN, dan pengecekan password
   yang ada di index.html lama.
   ========================================================== */

const loginScreen = document.getElementById("loginScreen");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");

function showApplication() {
    loginScreen.style.display = "none";
    document.body.style.overflow = "auto";
}

function showLogin() {
    loginScreen.style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function doLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    loginError.style.display = "none";
    loginButton.disabled = true;

    try {
        const { data, error } = await sb.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (!data.session) {
            throw new Error("Session login tidak terbentuk.");
        }

        showApplication();
        await loadDataFromDatabase();

    } catch (error) {
        console.error("LOGIN:", error);

        loginError.textContent =
            "Email atau password salah / login gagal.";

        loginError.style.display = "block";

        loginPassword.value = "";
        loginPassword.focus();

    } finally {
        loginButton.disabled = false;
    }
}

loginButton.addEventListener("click", doLogin);

loginEmail.addEventListener("keypress", function(event) {
    if (event.key === "Enter") doLogin();
});

loginPassword.addEventListener("keypress", function(event) {
    if (event.key === "Enter") doLogin();
});

togglePassword.addEventListener("click", function() {
    if (loginPassword.type === "password") {
        loginPassword.type = "text";
        togglePassword.classList.remove("fa-eye");
        togglePassword.classList.add("fa-eye-slash");
    } else {
        loginPassword.type = "password";
        togglePassword.classList.remove("fa-eye-slash");
        togglePassword.classList.add("fa-eye");
    }
});


/* ==========================================================
   SESSION / INITIAL LOAD
   ========================================================== */

async function initApplication() {
    const { data, error } = await sb.auth.getSession();

    if (error) {
        console.error("GET SESSION:", error);
        showLogin();
        return;
    }

    if (data.session) {
        showApplication();
        await loadDataFromDatabase();
    } else {
        showLogin();
    }
}

sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
        showLogin();
        dataTAT = [];
        renderTable();
        updateDashboard();
        updateStatistics();
        updateCharts();
    }
});


/* ==========================================================
   LOGOUT
   Bisa dipanggil dari console atau tombol logout jika
   tombol tersebut ditambahkan ke UI.
   ========================================================== */

async function logout() {
    const { error } = await sb.auth.signOut();

    if (error) {
        console.error("LOGOUT:", error);
        alert("Gagal keluar: " + error.message);
        return;
    }

    showLogin();
}


/* ==========================================================
   INITIAL LOAD
   Jangan lagi memanggil renderTable() sebelum database
   selesai dimuat.
   ========================================================== */

window.addEventListener("load", async function() {
    await initApplication();
});
