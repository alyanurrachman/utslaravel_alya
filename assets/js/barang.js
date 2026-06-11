// Barang management functions
const BarangManager = {
    list: async (search = '', kategori = '') => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (kategori) params.append('kategori', kategori);

        const response = await apiCall('barang.php?' + params.toString(), 'GET');
        return response.data;
    },

    getById: async (id) => {
        const response = await apiCall('barang.php?id=' + id, 'GET');
        return response.data;
    },

    create: async (data) => {
        const response = await apiCall('barang.php', 'POST', data);
        return response.data;
    },

    update: async (id, data) => {
        data.id = id;
        const response = await apiCall('barang.php', 'PUT', data);
        return response.data;
    },

    delete: async (id) => {
        const response = await apiCall('barang.php', 'DELETE', { id: id });
        return response.data;
    }
};

// Global modal functions
window.openModal = function(isEdit = false, itemName = '') {
    const modal = document.getElementById('barangModal');
    if (!modal) return;
    
    const title = isEdit ? `✏️ Edit Barang - ${itemName}` : '➕ Tambah Barang';
    const titleEl = document.getElementById('barangModalTitle');
    if (titleEl) {
        titleEl.textContent = title;
    }
    modal.classList.add('show');
};

window.closeModal = function() {
    const modal = document.getElementById('barangModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

// Dashboard page
if (document.getElementById('dashboardContainer')) {
    let allBarang = [];
    let editingId = null;

    // Load data on page load
    window.addEventListener('load', async () => {
        await loadBarangList();
        await loadCategories();
    });

    // Load barang list
    const loadBarangList = async (search = '', kategori = '') => {
        const tbody = document.querySelector('#daftarBarangSection table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="9" class="loading"><div class="spinner"></div>Loading...</td></tr>';

        const result = await BarangManager.list(search, kategori);

        if (result.success) {
            allBarang = result.data;
            renderBarangTable(allBarang);
        } else {
            showAlert(result.message, 'danger');
        }
    };

    // Render table
    const renderBarangTable = (items) => {
        const tbody = document.querySelector('#daftarBarangSection table tbody');
        if (!tbody) return;
        
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><div class="empty-state-icon">📭</div>Tidak ada data barang</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => {
            const user = UserManager.get();
            const canEdit = user.role === 'admin' || item.created_by === user.id;
            const canDelete = user.role === 'admin';

            return `
                <tr>
                    <td>${item.kode}</td>
                    <td>${item.nama}</td>
                    <td>${item.satuan}</td>
                    <td>${formatCurrency(item.harga)}</td>
                    <td>${item.stok}</td>
                    <td>${item.kategori || '-'}</td>
                    <td>${item.deskripsi ? item.deskripsi.substring(0, 30) + '...' : '-'}</td>
                    <td>${item.created_by_name}</td>
                    <td>
                        <div class="action-buttons">
                            ${canEdit ? `<button class="btn-edit" onclick="editBarang(${item.id})">Edit</button>` : ''}
                            ${canDelete ? `<button class="btn-delete" onclick="deleteBarang(${item.id})">Hapus</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // Load categories
    const loadCategories = async () => {
        const kategoriSelect = document.getElementById('filterKategori');
        if (!kategoriSelect) return;

        const result = await BarangManager.list();
        const categories = [...new Set(result.data.map(b => b.kategori).filter(k => k))];

        kategoriSelect.innerHTML = '<option value="">Semua Kategori</option>' + 
            categories.map(k => `<option value="${k}">${k}</option>`).join('');
    };

    // Modal event listeners
    const modal = document.getElementById('barangModal');
    const closeModalBtn = document.getElementById('barangModalClose');
    const batalBtn = document.getElementById('barangModalBatal');

    // Close modal when clicking close button
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Close modal when clicking batal button
    if (batalBtn) {
        batalBtn.addEventListener('click', closeModal);
    }

    // Close modal when clicking outside modal content
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Add/Edit form submission
    const formId = document.getElementById('barangForm');
    if (formId) {
        formId.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                kode: document.getElementById('kode').value,
                nama: document.getElementById('nama').value,
                satuan: document.getElementById('satuan').value,
                harga: parseFloat(document.getElementById('harga').value),
                stok: parseInt(document.getElementById('stok').value),
                kategori: document.getElementById('kategori').value,
                deskripsi: document.getElementById('deskripsi').value
            };

            let result;
            if (editingId) {
                result = await BarangManager.update(editingId, data);
            } else {
                result = await BarangManager.create(data);
            }

            if (result.success) {
                showAlert(result.message, 'success');
                formId.reset();
                document.getElementById('kode').readOnly = false;
                editingId = null;
                closeModal();
                await loadBarangList();
            } else {
                showAlert(result.message, 'danger');
            }
        });
    }

    // Edit barang
    window.editBarang = async (id) => {
        const result = await BarangManager.getById(id);
        
        if (result.success) {
            const item = result.data;
            editingId = id;
            
            document.getElementById('kode').value = item.kode;
            document.getElementById('kode').readOnly = true;
            document.getElementById('nama').value = item.nama;
            document.getElementById('satuan').value = item.satuan;
            document.getElementById('harga').value = item.harga;
            document.getElementById('stok').value = item.stok;
            document.getElementById('kategori').value = item.kategori || '';
            document.getElementById('deskripsi').value = item.deskripsi || '';
            
            // Open modal with edit title
            openModal(true, item.nama);
        } else {
            showAlert(result.message, 'danger');
        }
    };

    // Delete barang
    window.deleteBarang = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus barang ini?')) return;

        const result = await BarangManager.delete(id);
        
        if (result.success) {
            showAlert(result.message, 'success');
            await loadBarangList();
        } else {
            showAlert(result.message, 'danger');
        }
    };

    // Reset form for add new
    const addBtn = document.getElementById('addBarangBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            editingId = null;
            document.getElementById('barangForm').reset();
            document.getElementById('kode').readOnly = false;
            openModal(false);
        });
    }

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', debounce(() => {
            const search = searchInput.value;
            const kategori = document.getElementById('filterKategori').value;
            loadBarangList(search, kategori);
        }, 500));
    }

    // Filter by category
    const filterKategori = document.getElementById('filterKategori');
    if (filterKategori) {
        filterKategori.addEventListener('change', () => {
            const search = searchInput.value;
            const kategori = filterKategori.value;
            loadBarangList(search, kategori);
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Yakin ingin logout?')) {
                Auth.logout();
            }
        });
    }
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
