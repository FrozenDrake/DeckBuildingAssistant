<?php
$file = 'src/js/pages/AdminDashboard.js';
$content = file_get_contents($file);

$code = <<<JS
        const executeDelete = async () => {
            if (!selectedCardId.value) return;
            cardToDelete.value = selectedCardId.value;
        };

        const executeDeleteConfirmed = async () => {
            if (!cardToDelete.value) return;
            saving.value = true;
            try {
                const res = await fetch('api/admin_delete_card.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value, card_id: cardToDelete.value })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                store.addToast("Card deleted.", "success");
                cardToDelete.value = null;
                resetCardForm();
                await fetchCards();
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                saving.value = false;
            }
        };
JS;

$content = preg_replace('/        const executeDelete = async \(\) => \{[\s\S]*?saving\.value = false;\s*\}\s*\};\s*/', $code . "\n\n", $content);
file_put_contents($file, $content);
