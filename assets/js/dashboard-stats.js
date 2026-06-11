// Dashboard Statistics Manager
const StatsManager = {
    getAll: async () => {
        const response = await apiCall('stats.php?type=all', 'GET');
        return response.data;
    },

    getBarang: async () => {
        const response = await apiCall('stats.php?type=barang', 'GET');
        return response.data;
    },

    getCustomer: async () => {
        const response = await apiCall('stats.php?type=customer', 'GET');
        return response.data;
    }
};

// Dashboard monitoring
if (document.getElementById('statsSection')) {
    let barangChart = null;
    let customerChart = null;
    let categoryChart = null;

    // Load stats on page load
    window.addEventListener('load', async () => {
        await loadDashboardStats();
    });

    // Load all dashboard stats
    const loadDashboardStats = async () => {
        const stats = await StatsManager.getAll();
        
        if (stats.success) {
            updateStatsCards(stats.barang, stats.customer);
            initializeBarangChart(stats.barang);
            initializeCustomerChart(stats.customer);
            initializeCategoryChart(stats.barang.kategori_breakdown);
        } else {
            showAlert(stats.message, 'danger');
        }
    };

    // Update stats cards
    const updateStatsCards = (barang, customer) => {
        // Barang stats
        if (document.getElementById('statTotalBarang')) {
            document.getElementById('statTotalBarang').textContent = barang.total_barang || 0;
        }
        if (document.getElementById('statTotalStok')) {
            document.getElementById('statTotalStok').textContent = (barang.total_stok || 0).toLocaleString('id-ID');
        }
        if (document.getElementById('statTotalKategori')) {
            document.getElementById('statTotalKategori').textContent = barang.total_kategori || 0;
        }
        if (document.getElementById('statHargaRataRata')) {
            document.getElementById('statHargaRataRata').textContent = formatCurrency(barang.harga_rata_rata || 0);
        }

        // Customer stats
        if (document.getElementById('statTotalCustomer')) {
            document.getElementById('statTotalCustomer').textContent = customer.total_customer || 0;
        }
        if (document.getElementById('statCustomerDenganEmail')) {
            document.getElementById('statCustomerDenganEmail').textContent = customer.with_email || 0;
        }
    };

    // Initialize Barang Chart (Bar Chart - Kategori)
    const initializeCategoryChart = (kategoriData) => {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const labels = kategoriData.map(k => k.kategori);
        const data = kategoriData.map(k => k.jumlah);
        const backgroundColors = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(199, 199, 199, 0.7)',
            'rgba(83, 102, 255, 0.7)',
        ];

        if (categoryChart) {
            categoryChart.destroy();
        }

        categoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Jumlah Barang per Kategori',
                    data: data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderColor: backgroundColors.slice(0, labels.length).map(c => c.replace('0.7', '1')),
                    borderWidth: 2,
                    borderRadius: 5,
                    hoverBackgroundColor: backgroundColors.slice(0, labels.length).map(c => c.replace('0.7', '0.9'))
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Distribusi Barang per Kategori',
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    };

    // Initialize Customer Chart (Donut Chart)
    const initializeCustomerChart = (customerData) => {
        const ctx = document.getElementById('customerChart');
        if (!ctx) return;

        if (customerChart) {
            customerChart.destroy();
        }

        customerChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Memiliki Email', 'Tanpa Email'],
                datasets: [{
                    data: [customerData.with_email, customerData.without_email],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 99, 132, 0.8)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 2,
                    hoverBackgroundColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: { size: 12 },
                            padding: 20
                        }
                    },
                    title: {
                        display: true,
                        text: 'Status Email Customer',
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return label + ': ' + value + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    };

    // Initialize Barang Stats Chart (if needed)
    const initializeBarangChart = (barangData) => {
        const ctx = document.getElementById('barangChart');
        if (!ctx) return;

        if (barangChart) {
            barangChart.destroy();
        }

        barangChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Total Barang', 'Total Stok', 'Total Kategori'],
                datasets: [{
                    label: 'Statistik Barang',
                    data: [
                        barangData.total_barang || 0,
                        Math.min((barangData.total_stok || 0) / 100, 100), // Scale untuk visibility
                        barangData.total_kategori || 0
                    ],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    };

    // Refresh stats button
    const refreshBtn = document.getElementById('refreshStatsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.textContent = '⟳ Memproses...';
            refreshBtn.disabled = true;
            
            setTimeout(async () => {
                await loadDashboardStats();
                refreshBtn.textContent = '🔄 Refresh';
                refreshBtn.disabled = false;
            }, 500);
        });
    }
}
