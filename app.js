const categoryIcons = {
    "Gaji": "fa-money",
    "Bonus": "fa-gift",
    "Investasi": "fa-line-chart",
    "Lainnya (Masuk)": "fa-plus-circle",
    
    "Makanan": "fa-cutlery",
    "Transport": "fa-car",
    "Belanja": "fa-shopping-bag",
    "Tagihan": "fa-credit-card",
    "Hiburan": "fa-gamepad",
    "Kesehatan": "fa-heartbeat",
    "Lainnya (Keluar)": "fa-ellipsis-h"
};

let transactions = JSON.parse(localStorage.getItem("finance_v4_pro")) || [];
let itemsLimit = 10;
let currentFilter = "all";
let myChart;
let deferredPrompt;

const Toast = Swal.mixin({
    toast: true,
    position: "top",
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
    }
});

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    $("#install-banner").fadeIn();
});

window.addEventListener("appinstalled", (evt) => {
    console.log("Finance Pro berhasil diinstal!");
    $("#install-banner").fadeOut();
});

$(document).ready(function() {
    initChart();
    renderUI();
    updateStorage();
    
    $("#history-wrapper").on("scroll", function() {
        if ($(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight - 5) {
            if (itemsLimit < filterData(transactions).length) {
                $("#loader").show();
                
                setTimeout(() => {
                    itemsLimit += 5;
                    renderUI();
                    $("#loader").hide();
                }, 500);
            }
        }
    });
    
    $(".filter-pill").click(function() {
        $(".filter-pill").removeClass("active");
        $(this).addClass("active");
        
        currentFilter = $(this).data("filter");
        itemsLimit = 10;
        renderUI();
    });
    
    $("#type").on("change", updateCategoryOptions);
    
    $("#search-input").on("input", function() {
        const val = $(this).val();
        if (val.length > 0) {
            $("#clear-search").fadeIn(200);
        } else {
            $("#clear-search").fadeOut(200);
        }
        
        itemsLimit = 10;
        renderUI();
    });

    $("#clear-search").on("click", function() {
        $("#search-input").val("");
        $(this).fadeOut(200);
        itemsLimit = 10;
        renderUI();
        $("#search-input").focus();
    });
    
    $("#title, #amount").on("input", function() {
        $("#modalAlert").fadeOut();
    });
    
    $("#modalForm").on("hidden.bs.modal", function () {
        $("#modalAlert").hide();
    });
    
    setInterval(() => {
        renderUI();
    }, 60000);
    
    $("#btn-install").on("click", async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            
            $("#install-banner").fadeOut();
            deferredPrompt = null;
        }
    });

    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) {
        $("#install-banner").hide();
    }
});

function timeAgo(timestamp) {
    const now = new Date();
    const past = new Date(parseInt(timestamp));
    const seconds = Math.floor((now - past) / 1000);

    if (seconds < 60) return "Baru saja";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari yang lalu`;

    return past.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}


function updateStorage() {
    const size = (JSON.stringify(transactions).length * 2) / 1024;
    const pct = (size / 5000) * 100;
    
    $("#storage-progress").css("width", pct + "%");
    $("#storage-text").text(`${size.toFixed(2)} KB / 5MB`);
}

function initChart() {
    const ctx = document.getElementById("financeChart").getContext("2d");
    
    myChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    data: [],
                    borderColor: "#6366f1",
                    tension: 0.4,
                    fill: true,
                    backgroundColor: "rgba(99, 102, 241, 0.05)",
                    pointRadius: 0
                }
            ]
        },
        options: {
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    display: false
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderUI() {
    let filtered = filterData(transactions);
    
    if (transactions.length === 0) {
        $("#btnResetData").fadeOut();
    } else {
        $("#btnResetData").fadeIn();
    }
    
    let total = 0, inc = 0, exp = 0;
    
    transactions.forEach(t => {
        if (t.type === "income") {
            total += t.amount;
            inc += t.amount;
        } else {
            total -= t.amount;
            exp += t.amount;
        }
    });
    
    $("#total-balance").text("Rp " + total.toLocaleString("id-ID"));
    $("#top-income").text(inc.toLocaleString("id-ID"));
    $("#top-expense").text(exp.toLocaleString("id-ID"));
    
    updateChartData();
    
    const list = $("#transaction-list").empty();
    const slice = filtered.slice(0, itemsLimit);
    
    if (!slice.length) return list.html(`<div class="text-center" style="padding:40px; color:#94a3b8">Tidak ada data</div>`);
    
    slice.forEach(t => {
        const isInc = t.type === "income";
        const iconClass = categoryIcons[t.category] || "fa-tag";
        const relativeTime = timeAgo(t.id);
        
        list.append(`<div class="transaction-row" onclick="editEntry('${t.id}')">
            <div class="icon-box" style="background:${isInc ? "#ecfdf5" : "#fff1f2"}; color:${isInc ? "#10b981" : "#f43f5e"}">
                <i class="fa ${iconClass}"></i>
            </div>
            <div style="flex:1">
                <div style="font-weight:600; font-size:14px;">${t.title}</div>
                <small style="color:#94a3b8">${t.category} • ${relativeTime}</small>
            </div>
            <div style="font-weight:700; color:${isInc ? "#10b981" : "#f43f5e"}">
                ${isInc ? "+" : "-"} ${t.amount.toLocaleString("id-ID")}
            </div>
        </div>`);
    });
}

function filterData(data) {
    let sorted = [...data].sort((a, b) => parseInt(b.id) - parseInt(a.id));
    
    const searchTerm = $("#search-input").val().toLowerCase();

    if (searchTerm) {
        sorted = sorted.filter(t => 
            t.title.toLowerCase().includes(searchTerm) || 
            t.category.toLowerCase().includes(searchTerm)
        );
    }

    if (currentFilter === "all") return sorted;
    
    const now = new Date();
    return sorted.filter(t => {
        const d = new Date(t.date);
        if(currentFilter === "day") return d.toDateString() === now.toDateString();
        if(currentFilter === "week") return (now - d) / 86400000 <= 7;
        if(currentFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
}

function openModal() {
    if ($("#modalAlert").hasClass("alert-info")) {
        $("#modalAlert").removeClass("alert-info");
        $("#modalAlert").addClass("alert-danger");
    }
    
    $("#modalAlert").hide();
    $("#modal-title").text("Tambah");
    
    $("#edit-id").val("");
    $("#title").val("");
    $("#amount").val("");
    
    $("#date").val(new Date().toISOString().split("T")[0]);
    $("#edit-actions").hide();
    
    const hasIncome = transactions.some(t => t.type === "income");
    const typeSelect = $("#type");
    
    if (!hasIncome) {
        typeSelect.val("income");
        typeSelect.find("option[value='expense']").attr("disabled", true);
        
        if ($("#modalAlert").hasClass("alert-danger")) {
            $("#modalAlert").removeClass("alert-danger");
            $("#modalAlert").addClass("alert-info");
        };
        
        $("#modalAlert").text("Input pemasukan pertama Anda dulu ya!").fadeIn();
    } else {
        typeSelect.find("option[value='expense']").attr("disabled", false);
    }
    
    updateCategoryOptions();
    
    $("#modalForm").modal("show");
}

function updateCategoryOptions() {
    const type = $("#type").val();
    const catSelect = $("#category").empty();
    
    const categories = type === "income" 
        ? ["Gaji", "Bonus", "Investasi", "Lainnya (Masuk)"]
        : ["Makanan", "Transport", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Lainnya (Keluar)"];
    
    categories.forEach(cat => {
        catSelect.append(`<option value="${cat}">${cat}</option>`);
    });
}

function saveEntry() {
    if ($("#modalAlert").hasClass("alert-info")) {
        $("#modalAlert").removeClass("alert-info");
        $("#modalAlert").addClass("alert-danger");
    }
    
    const entry = {
        id: $("#edit-id").val() || Date.now().toString(),
        title: $("#title").val(),
        amount: parseFloat($("#amount").val()),
        type: $("#type").val(),
        category: $("#category").val(),
        date: $("#date").val()
    };
    
    if (!entry.title || isNaN(entry.amount) || entry.amount <= 0) {
        let msg = !entry.title ? "Judul tidak boleh kosong" : "Nominal harus lebih dari 0";
        
        $("#modalAlert").text(msg).fadeIn();
        return;
    }
    
    const idx = transactions.findIndex(t => t.id === entry.id);
    
    if (idx > -1) transactions[idx] = entry;
    else transactions.push(entry);
    
    localStorage.setItem("finance_v4_pro", JSON.stringify(transactions));
    
    renderUI();
    updateStorage();
    
    $("#modalForm").modal("hide");
    
    Toast.fire({
        icon: "success",
        title: "Berhasil disimpan"
    });
}

function editEntry(id) {
    const t = transactions.find(x => x.id === id);
    
    $("#modal-title").text("Edit");
    
    $("#edit-id").val(t.id);
    $("#title").val(t.title);
    $("#amount").val(t.amount);
    $("#type").val(t.type);
    $("#date").val(t.date);
    
    updateCategoryOptions();
    $("#category").val(t.category);
    
    const otherIncomes = transactions.filter(item => item.type === "income" && item.id !== id);
    const typeSelect = $("#type");
    
    if (otherIncomes.length === 0 && t.type === "income") {
        typeSelect.find("option[value='expense']").attr("disabled", true);
    } else {
        typeSelect.find("option[value='expense']").attr("disabled", false);
    }
    
    $("#edit-actions").show();
    $("#modalForm").modal("show");
}

function deleteEntry() {
    Swal.fire({
        title: "Hapus data?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, Hapus"
    }).then(r => {
        if (r.isConfirmed) {
            transactions = transactions.filter(t => t.id !== $("#edit-id").val());
            
            localStorage.setItem("finance_v4_pro", JSON.stringify(transactions));
            renderUI(); updateStorage();
            
            $("#modalForm").modal("hide");
            
            Toast.fire({
                icon: "success",
                title: "Data terhapus"
            });
        }
    });
}

function resetAllData() {
    Swal.fire({
        title: "Reset Total?",
        text: "Semua riwayat akan hilang!",
        icon: "error",
        showCancelButton: true
    }).then(r => {
        if (r.isConfirmed) {
            transactions = [];
            localStorage.setItem("finance_v4_pro", JSON.stringify(transactions));
            
            renderUI();
            updateStorage();
            
            Toast.fire({
                icon: "info",
                title: "Semua data dibersihkan"
            });
        }
    });
}

function updateChartData() {
    const last7 = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        
        return d.toISOString().split("T")[0];
    }).reverse();
    
    const data = last7.map(date => transactions.filter(t => t.date === date).reduce((a,c) => c.type==="income" ? a+c.amount : a-c.amount, 0));
    
    myChart.data.labels = last7.map(d => d.split("-")[2]);
    myChart.data.datasets[0].data = data;
    myChart.update();
}

function exportData(type) {
    if (!transactions.length) return Toast.fire({
        icon: "info",
        title: "Tidak ada data"
    });
    
    if (type === "csv" || type === "excel") {
        const ws = XLSX.utils.json_to_sheet(transactions);
        const wb = XLSX.utils.book_new();
        
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `Laporan.${type === "csv" ? "csv" : "xlsx"}`);
    } else {
        const { jsPDF } = window.jspdf;
        
        const doc = new jsPDF();
        doc.text("Laporan Keuangan", 14, 15);
        
        const body = transactions.map(t => [t.date, t.title, t.type, t.category, t.amount]);
        
        doc.autoTable({
            head: [
                [
                    "Tanggal",
                    "Judul",
                    "Tipe",
                    "Kategori",
                    "Nominal"
                ]
            ],
            body: body,
            startY: 22
        });
        
        doc.save("Laporan.pdf");
    }
}

(function() {
    let adblockActive = false;

    function checkAdblock() {
        const testAd = document.createElement("div");
        testAd.innerHTML = "&nbsp;";
        testAd.className = "adsbox ads google-ads ad-placement e-ads";
        testAd.style.position = "absolute";
        testAd.style.left = "-999px";
        document.body.appendChild(testAd);

        window.setTimeout(function() {
            if (testAd.offsetHeight === 0) {
                if (!adblockActive) {
                    showAdblockWarning();
                    adblockActive = true;
                }
            } else {
                if (adblockActive) {
                    location.reload();
                }
            }
            document.body.removeChild(testAd);
        }, 100);
    }

    function showAdblockWarning() {
        Swal.fire({
            title: "Adblock Terdeteksi!",
            text: "Konten terkunci. Mohon nonaktifkan Adblock agar halaman bisa terbuka kembali secara otomatis.",
            icon: "warning",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            allowEnterKey: false,
            footer: "<small>Halaman akan refresh otomatis setelah Adblock mati</small>"
        });
    }

    window.onload = function() {
        checkAdblock();
        setInterval(checkAdblock, 3000);
    };

    const script = document.createElement("script");
    script.src = "https://pl29285005.profitablecpmratenetwork.com/dd/dd/66/dddd66005c85f2081e58c5b18283ae4b.js";
    document.body.appendChild(script);
})();

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").then(reg => {
            console.log("SW Registered!", reg);
        }).catch(err => {
            console.log("SW Registration Failed!", err);
        });
    });
}