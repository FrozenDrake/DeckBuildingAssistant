<?php
$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

$query = new MongoDB\Driver\Query([]);
$cursor = $m->executeQuery('deckbuilder.cards', $query);
$cards = $cursor->toArray();

echo "Found " . count($cards) . " cards in DB.\n";

$sourceDir = __DIR__ . '/../public/data/assets/supportcard';
$targetDir = __DIR__ . '/../src/images/cards';

if (!is_dir($targetDir)) {
    mkdir($targetDir, 0777, true);
}

$TARGET_WIDTH = 400;
$TARGET_HEIGHT = 560;

$processed = 0;
$missing = 0;

foreach ($cards as $card) {
    // Try to find the scraper ID from various possible schema formats
    $supportId = $card->id ?? $card->support_id ?? $card->raw_data->support_id ?? null;
    
    if (!$supportId) {
        continue;
    }
    
    // Only process if it doesn't already have an image_url, so we don't waste time on the 1074 already done
    if (!empty($card->image_url)) {
        continue;
    }
    
    $sourcePath = "$sourceDir/$supportId.png";
    
    if (!file_exists($sourcePath)) {
        $missing++;
        continue;
    }
    
    // Process image
    $sourceImage = imagecreatefrompng($sourcePath);
    if (!$sourceImage) {
        echo "Failed to open $sourcePath\n";
        continue;
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
        $cropWidth = (int)($srcHeight * $targetRatio);
        $cropX = (int)(($srcWidth - $cropWidth) / 2);
    } else {
        $cropHeight = (int)($srcWidth / $targetRatio);
        $cropY = (int)(($srcHeight - $cropHeight) / 2);
    }
    
    $targetImage = imagecreatetruecolor($TARGET_WIDTH, $TARGET_HEIGHT);
    imagealphablending($targetImage, false);
    imagesavealpha($targetImage, true);
    $transparent = imagecolorallocatealpha($targetImage, 255, 255, 255, 127);
    imagefilledrectangle($targetImage, 0, 0, $TARGET_WIDTH, $TARGET_HEIGHT, $transparent);
    
    imagecopyresampled(
        $targetImage, $sourceImage,
        0, 0, $cropX, $cropY,
        $TARGET_WIDTH, $TARGET_HEIGHT, $cropWidth, $cropHeight
    );
    
    $cardIdStr = (string)$card->_id;
    $newFileName = "$cardIdStr.webp";
    $savePath = "$targetDir/$newFileName";
    
    if (imagewebp($targetImage, $savePath, 85)) {
        // Update DB
        $bulk = new MongoDB\Driver\BulkWrite();
        $bulk->update(
            ['_id' => $card->_id],
            ['$set' => ['image_url' => "images/cards/$newFileName"]]
        );
        $m->executeBulkWrite('deckbuilder.cards', $bulk);
        $processed++;
    } else {
        echo "Failed to save WebP for $supportId\n";
    }
    
    imagedestroy($sourceImage);
    imagedestroy($targetImage);
}

echo "Done! Processed: $processed. Missing source images: $missing.\n";
