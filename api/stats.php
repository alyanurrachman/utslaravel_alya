<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../classes/Auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$response = [];

// Verify token
$token = Auth::getTokenFromHeader();
$verify = Auth::verifyToken($token);

if (!$verify['valid']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized: ' . $verify['message']]);
    exit();
}

$user = $verify['data'];

try {
    if ($method === 'GET') {
        $type = isset($_GET['type']) ? $_GET['type'] : 'all';
        
        // Stats Barang
        if ($type === 'barang' || $type === 'all') {
            $query = "SELECT 
                        COUNT(*) as total_barang,
                        SUM(stok) as total_stok,
                        COUNT(DISTINCT kategori) as total_kategori,
                        AVG(harga) as harga_rata_rata,
                        MIN(harga) as harga_terendah,
                        MAX(harga) as harga_tertinggi
                     FROM barang";
            
            // Input user hanya lihat data mereka
            if ($user['role'] === 'input') {
                $query .= " WHERE created_by = " . $user['id'];
            }
            
            $result = $conn->query($query);
            $barang_stats = $result->fetch_assoc();
            
            // Category breakdown
            $cat_query = "SELECT kategori, COUNT(*) as jumlah, SUM(stok) as total_stok 
                          FROM barang WHERE kategori IS NOT NULL";
            
            if ($user['role'] === 'input') {
                $cat_query .= " AND created_by = " . $user['id'];
            }
            
            $cat_query .= " GROUP BY kategori ORDER BY jumlah DESC";
            $cat_result = $conn->query($cat_query);
            $kategori_breakdown = [];
            while ($row = $cat_result->fetch_assoc()) {
                $kategori_breakdown[] = $row;
            }
            
            // Barang dengan stok rendah
            $low_query = "SELECT id, kode, nama, stok, harga 
                          FROM barang WHERE stok <= 10";
            
            if ($user['role'] === 'input') {
                $low_query .= " AND created_by = " . $user['id'];
            }
            
            $low_query .= " ORDER BY stok ASC LIMIT 5";
            $low_result = $conn->query($low_query);
            $low_stock = [];
            while ($row = $low_result->fetch_assoc()) {
                $low_stock[] = $row;
            }
        }
        
        // Stats Customer
        if ($type === 'customer' || $type === 'all') {
            $query = "SELECT COUNT(*) as total_customer FROM customers";
            
            if ($user['role'] === 'input') {
                $query .= " WHERE created_by = " . $user['id'];
            }
            
            $result = $conn->query($query);
            $customer_stats = $result->fetch_assoc();
            
            // Customer dengan email
            $email_query = "SELECT COUNT(*) as with_email FROM customers WHERE email IS NOT NULL AND email != ''";
            
            if ($user['role'] === 'input') {
                $email_query .= " AND created_by = " . $user['id'];
            }
            
            $result = $conn->query($email_query);
            $customer_email = $result->fetch_assoc()['with_email'];
            
            $customer_stats['with_email'] = $customer_email;
            $customer_stats['without_email'] = $customer_stats['total_customer'] - $customer_email;
        }
        
        // Overall stats
        if ($type === 'all') {
            $barang_stats['kategori_breakdown'] = $kategori_breakdown;
            $barang_stats['low_stock'] = $low_stock;
            
            http_response_code(200);
            $response = [
                'success' => true,
                'barang' => $barang_stats,
                'customer' => $customer_stats,
                'user' => $user
            ];
        } elseif ($type === 'barang') {
            $barang_stats['kategori_breakdown'] = $kategori_breakdown;
            $barang_stats['low_stock'] = $low_stock;
            
            http_response_code(200);
            $response = [
                'success' => true,
                'data' => $barang_stats,
                'user' => $user
            ];
        } elseif ($type === 'customer') {
            http_response_code(200);
            $response = [
                'success' => true,
                'data' => $customer_stats,
                'user' => $user
            ];
        } else {
            http_response_code(400);
            $response = ['success' => false, 'message' => 'Type tidak valid'];
        }
    } else {
        http_response_code(405);
        $response = ['success' => false, 'message' => 'Method tidak diizinkan'];
    }
} catch (Exception $e) {
    http_response_code(500);
    $response = ['success' => false, 'message' => 'Error: ' . $e->getMessage()];
}

echo json_encode($response);
?>
