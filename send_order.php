<?php
// === НАСТРОЙКИ ===
$BOT_TOKEN = '8572774677:AAEAkPXdklN1pHmdvsYE0XOEBh4h-rE-1ME';  // Токен бота
$CHAT_ID = '-1004409380252';      // Chat ID группы

// Заголовки для CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Обработка preflight запроса
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Только POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Получаем данные
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid data']);
    exit;
}

// Формируем сообщение
$message = "🌐 <b>ЗАКАЗ С САЙТА</b>\n\n";
$message .= "🛒 <b>НОВЫЙ ЗАКАЗ</b>\n\n";
$message .= "📋 <b>Заказ #" . $data['id'] . "</b>\n";
$message .= "📅 " . $data['date'] . "\n\n";

$message .= "📦 <b>Товары:</b>\n";
foreach ($data['items'] as $item) {
    $message .= "• " . $item['name'] . " × " . $item['qty'] . " = " . ($item['price'] * $item['qty']) . " ₽\n";
}

$message .= "\n💰 <b>Итого: " . $data['total'] . " ₽</b>\n\n";

if (!empty($data['customer']['telegram'])) {
    $message .= "📨 Telegram: " . $data['customer']['telegram'] . "\n";
}

if (!empty($data['customer']['comment'])) {
    $message .= "💬 Комментарий: " . $data['customer']['comment'] . "\n";
}

// Отправляем в Telegram
$url = "https://api.telegram.org/bot{$BOT_TOKEN}/sendMessage";

$params = [
    'chat_id' => $CHAT_ID,
    'text' => $message,
    'parse_mode' => 'HTML'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$result = json_decode($response, true);

// Подробная отладка
$debugInfo = "=== " . date('Y-m-d H:i:s') . " ===\n";
$debugInfo .= "HTTP Code: $httpCode\n";
$debugInfo .= "cURL Error: $curlError\n";
$debugInfo .= "Response: $response\n";
$debugInfo .= "Chat ID: $CHAT_ID\n";
$debugInfo .= "Message: " . substr($message, 0, 200) . "...\n\n";
file_put_contents('telegram_debug.log', $debugInfo, FILE_APPEND);

if ($httpCode === 200 && isset($result['ok']) && $result['ok']) {
    echo json_encode(['success' => true]);
} else {
    $error = 'Unknown error';
    if (!empty($result['description'])) {
        $error = $result['description'];
    } elseif ($httpCode === 0) {
        $error = 'Connection failed: ' . $curlError;
    } elseif ($httpCode !== 200) {
        $error = "HTTP error: $httpCode, Response: " . substr($response, 0, 100);
    }
    echo json_encode(['success' => false, 'error' => $error]);
}
?>
