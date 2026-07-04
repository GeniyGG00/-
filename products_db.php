<?php
// === API для хранения товаров ===

// Заголовки для CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Обработка preflight запроса
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Файл для хранения товаров
$DATA_FILE = __DIR__ . '/products.json';

// === GET - Получить товары ===
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($DATA_FILE)) {
        $json = file_get_contents($DATA_FILE);
        $data = json_decode($json, true);
        
        if ($data && isset($data['products'])) {
            echo json_encode(['success' => true, 'products' => $data['products']]);
        } else {
            echo json_encode(['success' => true, 'products' => []]);
        }
    } else {
        echo json_encode(['success' => true, 'products' => []]);
    }
    exit;
}

// === POST - Сохранить товары ===
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['products'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid data']);
        exit;
    }
    
    // Сохраняем в файл
    $result = file_put_contents($DATA_FILE, json_encode(['products' => $data['products']], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    if ($result !== false) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save data']);
    }
    exit;
}

// Если метод не поддерживается
http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
?>
