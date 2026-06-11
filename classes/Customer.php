<?php
require_once __DIR__ . '/../config/database.php';

class Customer {
    private $conn;
    private $user_id;
    private $user_role;
    
    public function __construct($conn, $user_id, $user_role) {
        $this->conn = $conn;
        $this->user_id = $user_id;
        $this->user_role = $user_role;
    }
    
    /**
     * Get All Customers
     */
    public function getAll($search = '') {
        $query = "SELECT c.*, u.nama_lengkap as created_by_name 
                  FROM customers c 
                  LEFT JOIN users u ON c.created_by = u.id 
                  WHERE 1=1";
        
        $params = [];
        $types = '';
        
        // Filter untuk Input user (hanya data mereka sendiri)
        if ($this->user_role === 'input') {
            $query .= " AND c.created_by = ?";
            $params[] = $this->user_id;
            $types .= 'i';
        }
        
        // Search
        if (!empty($search)) {
            $query .= " AND (c.kode LIKE ? OR c.nama LIKE ? OR c.email LIKE ?)";
            $search_param = '%' . $search . '%';
            $params[] = $search_param;
            $params[] = $search_param;
            $params[] = $search_param;
            $types .= 'sss';
        }
        
        $query .= " ORDER BY c.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $customers_list = [];
        while ($row = $result->fetch_assoc()) {
            $customers_list[] = $row;
        }
        
        return $customers_list;
    }
    
    /**
     * Get Customer By ID
     */
    public function getById($id) {
        $query = "SELECT c.*, u.nama_lengkap as created_by_name 
                  FROM customers c 
                  LEFT JOIN users u ON c.created_by = u.id 
                  WHERE c.id = ?";
        
        // Untuk Input user, hanya bisa akses data mereka sendiri
        if ($this->user_role === 'input') {
            $query .= " AND c.created_by = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param('ii', $id, $this->user_id);
        } else {
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param('i', $id);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        
        return null;
    }
    
    /**
     * Create Customer
     */
    public function create($kode, $nama, $alamat, $telepon, $email) {
        // Validasi
        if (empty($kode) || empty($nama)) {
            return ['success' => false, 'message' => 'Kode dan nama harus diisi'];
        }
        
        // Check if kode already exists
        $query = "SELECT id FROM customers WHERE kode = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('s', $kode);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            return ['success' => false, 'message' => 'Kode customer sudah ada'];
        }
        
        // Check if email already exists (jika email diisi)
        if (!empty($email)) {
            $query = "SELECT id FROM customers WHERE email = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param('s', $email);
            $stmt->execute();
            if ($stmt->get_result()->num_rows > 0) {
                return ['success' => false, 'message' => 'Email sudah terdaftar'];
            }
        }
        
        // Insert customer
        $query = "INSERT INTO customers (kode, nama, alamat, telepon, email, created_by) 
                  VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('sssssi', $kode, $nama, $alamat, $telepon, $email, $this->user_id);
        
        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Customer berhasil ditambahkan', 'id' => $this->conn->insert_id];
        } else {
            return ['success' => false, 'message' => 'Terjadi kesalahan: ' . $this->conn->error];
        }
    }
    
    /**
     * Update Customer
     */
    public function update($id, $nama, $alamat, $telepon, $email) {
        // Get customer untuk verify ownership
        $customer = $this->getById($id);
        
        if (!$customer) {
            return ['success' => false, 'message' => 'Customer tidak ditemukan atau akses ditolak'];
        }
        
        // Admin bisa update semua, Input hanya data mereka sendiri
        if ($this->user_role === 'input' && $customer['created_by'] != $this->user_id) {
            return ['success' => false, 'message' => 'Anda hanya bisa update data milik sendiri'];
        }
        
        // Check if email already exists for other customer
        if (!empty($email)) {
            $query = "SELECT id FROM customers WHERE email = ? AND id != ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param('si', $email, $id);
            $stmt->execute();
            if ($stmt->get_result()->num_rows > 0) {
                return ['success' => false, 'message' => 'Email sudah terdaftar untuk customer lain'];
            }
        }
        
        $query = "UPDATE customers 
                  SET nama = ?, alamat = ?, telepon = ?, email = ?, updated_by = ?
                  WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('ssssii', $nama, $alamat, $telepon, $email, $this->user_id, $id);
        
        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Customer berhasil diupdate'];
        } else {
            return ['success' => false, 'message' => 'Terjadi kesalahan: ' . $this->conn->error];
        }
    }
    
    /**
     * Delete Customer
     */
    public function delete($id) {
        // Only admin can delete
        if ($this->user_role !== 'admin') {
            return ['success' => false, 'message' => 'Hanya admin yang bisa menghapus data customer'];
        }
        
        $query = "DELETE FROM customers WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('i', $id);
        
        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Customer berhasil dihapus'];
        } else {
            return ['success' => false, 'message' => 'Terjadi kesalahan: ' . $this->conn->error];
        }
    }
}
?>
