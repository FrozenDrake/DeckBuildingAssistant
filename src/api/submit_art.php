<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Must be logged in to submit art.']));
}

require_once __DIR__ . '/rate_limit.php';

$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
$rl = checkRateLimit($m, $_SESSION['user_id'], 'art', 20);
if (!$rl['allowed']) {
    http_response_code(429);
    die(json_encode(['error' => $rl['error']]));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'Method not allowed.']));
}

$card_id = $_POST['card_id'] ?? null;
$game_id = $_POST['game_id'] ?? null;

if (!$card_id || !$game_id) {
    http_response_code(400);
    die(json_encode(['error' => 'card_id and game_id are required.']));
}

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    die(json_encode(['error' => 'No valid image uploaded.']));
}

$tmpPath = $_FILES['image']['tmp_name'];
$type = mime_content_type($tmpPath);

if (!in_array($type, ['image/jpeg', 'image/png', 'image/webp'])) {
    http_response_code(400);
    die(json_encode(['error' => 'Only JPG, PNG, and WebP images are allowed.']));
}

// Image Resizing and Cropping to standard size (e.g. 400x560 for cards)
$TARGET_WIDTH = 400;
$TARGET_HEIGHT = 560;

$sourceImage = null;
if ($type === 'image/jpeg') {
    $sourceImage = imagecreatefromjpeg($tmpPath);
} elseif ($type === 'image/png') {
    $sourceImage = imagecreatefrompng($tmpPath);
} elseif ($type === 'image/webp') {
    $sourceImage = imagecreatefromwebp($tmpPath);
}

if (!$sourceImage) {
    http_response_code(500);
    die(json_encode(['error' => 'Failed to process image.']));
}

$srcWidth = imagesx($sourceImage);
$srcHeight = imagesy($sourceImage);

$srcRatio = $srcWidth / $srcHeight;
$targetRatio = $TARGET_WIDTH / $TARGET_HEIGHT;

$cropWidth = $srcWidth;
$cropHeight = $srcHeight;
$cropX = 0;
$cropY = 0;

if ($srcRatio > $targetRatio) {
    // Source is wider than target ratio - crop sides
    $cropWidth = (int)($srcHeight * $targetRatio);
    $cropX = (int)(($srcWidth - $cropWidth) / 2);
} else {
    // Source is taller than target ratio - crop top/bottom
    $cropHeight = (int)($srcWidth / $targetRatio);
    $cropY = (int)(($srcHeight - $cropHeight) / 2);
}

$targetImage = imagecreatetruecolor($TARGET_WIDTH, $TARGET_HEIGHT);

// Handle transparency for PNG/WebP if needed (though target is webp)
imagealphablending($targetImage, false);
imagesavealpha($targetImage, true);
$transparent = imagecolorallocatealpha($targetImage, 255, 255, 255, 127);
imagefilledrectangle($targetImage, 0, 0, $TARGET_WIDTH, $TARGET_HEIGHT, $transparent);

imagecopyresampled(
    $targetImage, $sourceImage,
    0, 0, $cropX, $cropY,
    $TARGET_WIDTH, $TARGET_HEIGHT, $cropWidth, $cropHeight
);

$fileName = uniqid('sub_') . '.webp';
$savePath = __DIR__ . '/../images/submissions/' . $fileName;

if (!imagewebp($targetImage, $savePath, 85)) { // 85 quality
    http_response_code(500);
    die(json_encode(['error' => 'Failed to save processed image.']));
}

imagedestroy($sourceImage);
imagedestroy($targetImage);

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    $bulk = new MongoDB\Driver\BulkWrite();
    
    $submission = [
        'card_id' => new MongoDB\BSON\ObjectId($card_id),
        'game_id' => new MongoDB\BSON\ObjectId($game_id),
        'user_id' => new MongoDB\BSON\ObjectId($_SESSION['user_id']),
        'file_name' => $fileName,
        'status' => 'pending',
        'submitted_at' => new MongoDB\BSON\UTCDateTime()
    ];
    
    $bulk->insert($submission);
    $m->executeBulkWrite('deckbuilder.image_submissions', $bulk);
    
    incrementRateLimit($m, $_SESSION['user_id'], 'art');
    
    echo json_encode(['success' => true, 'message' => 'Art submitted for moderation.']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

