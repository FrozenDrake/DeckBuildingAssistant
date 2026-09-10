<?php
$file = 'src/js/pages/AdminDashboard.js';
$content = file_get_contents($file);

$badBlock = <<<JS
                    generalSettings.value = {
                        name: game.name || '',
                        description: game.description || '',
                        cover_color: game.cover_color || '',
                        max_deck_size: game.max_deck_size || 60,
                        max_copies_per_card: game.max_copies_per_card || 4
                    };
JS;

// Only replace the FIRST occurrence (or just replace all but the bottom one, wait preg_replace with limit=1)
$content = preg_replace('/' . preg_quote($badBlock, '/') . '/', '', $content, 1);
file_put_contents($file, $content);
