// Customer management functions
const CustomerManager = {
    list: async (search = '') => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);

        const response = await apiCall('customer.php?' + params.toString(), 'GET');
        return response.data;
    },

    getById: async (id) => {
        const response = await apiCall('customer.php?id=' + id, 'GET');
        return response.data;
    },

    create: async (data) => {
        const response = await apiCall('customer.php', 'POST', data);
        return response.data;
    },

    update: async (id, data) => {
        data.id = id;
        const response = await apiCall('customer.php', 'PUT', data);
        return response.data;
    },

    delete: async (id) => {
        const response = await apiCall('customer.php', 'DELETE', { id: id });
        return response.data;
    }
};

// Global modal functions
window.openCustomerModal = function(isEdit = false, itemName = '') {
    const modal = document.getElementById('customerModal');
    if (!modal) return;
    
    const title = isEdit ? `✏️ Edit Customer - ${itemName}` : '➕ Tambah Customer';
    const titleEl = document.getElementById('customerModalTitle');
    if (titleEl) {
        titleEl.textContent = title;
    }
    modal.classList.add('show');
};

window.closeCustomerModal = function() {
    const modal = document.getElementById('customerModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

// Dashboard page
if (document.getElementById('dashboardContainer')) {
    let allCustomers = [];
    let editingId = null;

    // Load data on page load
    window.addEventListener('load', async () => {
        await loadCustomerList();
    });

    // Load customer list
    const loadCustomerList = async (search = '') => {
        const tbody = document.querySelector('#daftarCustomerSection table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div>Loading...</td></tr>';

        const result = await CustomerManager.list(search);

        if (result.success) {
            allCustomers = result.data;
            renderCustomerTable(allCustomers);
        } else {
            showAlert(result.message, 'danger');
        }
    };

    // Render table
    const renderCustomerTable = (items) => {
        const tbody = document.querySelector('#daftarCustomerSection table tbody');
        if (!tbody) return;
        
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">📭</div>Tidak ada data customer</td></tr>';
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
                    <td>${item.alamat || '-'}</td>
                    <td>${item.telepon || '-'}</td>
                    <td>${item.email || '-'}</td>
                    <td>${item.created_by_name}</td>
                    <td>
                        <div class="action-buttons">
                            ${canEdit ? `<button class="btn-edit" onclick="editCustomer(${item.id})">Edit</button>` : ''}
                            ${canDelete ? `<button class="btn-delete" onclick="deleteCustomer(${item.id})">Hapus</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // Modal event listeners
    const modal = document.getElementById('customerModal');
    const closeModalBtn = document.getElementById('customerModalClose');
    const batalBtn = document.getElementById('customerModalBatal');

    // Close modal when clicking close button
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeCustomerModal);
    }

    // Close modal when clicking batal button
    if (batalBtn) {
        batalBtn.addEventListener('click', closeCustomerModal);
    }

    // Close modal when clicking outside modal content
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCustomerModal();
            }
        });
    }

    // Add/Edit form submission
    const formId = document.getElementById('customerForm');
    if (formId) {
        formId.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                kode: document.getElementById('customerKode').value,
                nama: document.getElementById('customerNama').value,
                alamat: document.getElementById('customerAlamat').value,
                telepon: document.getElementById('customerTelepon').value,
                email: document.getElementById('customerEmail').value
            };

            let result;
            if (editingId) {
                result = await CustomerManager.update(editingId, data);
            } else {
                result = await CustomerManager.create(data);
            }

            if (result.success) {
                showAlert(result.message, 'success');
                formId.reset();
                document.getElementById('customerKode').readOnly = false;
                editingId = null;
                closeCustomerModal();
                await loadCustomerList();
            } else {
                showAlert(result.message, 'danger');
            }
        });
    }

    // Edit customer
    window.editCustomer = async (id) => {
        const result = await CustomerManager.getById(id);
        
        if (result.success) {
            const item = result.data;
            editingId = id;
            
            document.getElementById('customerKode').value = item.kode;
            document.getElementById('customerKode').readOnly = true;
            document.getElementById('customerNama').value = item.nama;
            document.getElementById('customerAlamat').value = item.alamat || '';
            document.getElementById('customerTelepon').value = item.telepon || '';
            document.getElementById('customerEmail').value = item.email || '';
            
            // Open modal with edit title
            openCustomerModal(true, item.nama);
        } else {
            showAlert(result.message, 'danger');
        }
    };

    // Delete customer
    window.deleteCustomer = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus customer ini?')) return;

        const result = await CustomerManager.delete(id);
        
        if (result.success) {
            showAlert(result.message, 'success');
            await loadCustomerList();
        } else {
            showAlert(result.message, 'danger');
        }
    };

    // Reset form for add new
    const addBtn = document.getElementById('addCustomerBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            editingId = null;
            document.getElementById('customerForm').reset();
            document.getElementById('customerKode').readOnly = false;
            openCustomerModal(false);
        });
    }

    // Search
    const searchInput = document.getElementById('searchCustomerInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', debounce(() => {
            const search = searchInput.value;
            loadCustomerList(search);
        }, 500));
    }
}
