<?php
$file = 'src/js/pages/AdminDashboard.js';
$content = file_get_contents($file);

// 2. Add ref variables in setup
$refsCode = <<<JS
        const cardToDelete = ref(null);
        const adminToRevoke = ref(null);
        const showDeleteGameModal = ref(false);
        const deleteGameConfirmText = ref('');
JS;
$content = str_replace("const loadingAdmins = ref(false);", "const loadingAdmins = ref(false);\n" . $refsCode, $content);

// 3. Replace executeDelete
$deleteCardCode = <<<JS
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
$content = preg_replace('/        const executeDelete = async \(\) => \{[\s\S]*?saving\.value = false;\s*\}\s*\};\s*/', $deleteCardCode . "\n\n", $content);

// 4. Replace revokeAdmin
$revokeAdminCode = <<<JS
        const revokeAdmin = (username) => {
            adminToRevoke.value = username;
        };

        const executeRevokeConfirmed = async () => {
            if (!adminToRevoke.value) return;
            try {
                const res = await fetch('api/admin_manage_roles.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value, username: adminToRevoke.value, action: 'revoke' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                store.addToast(\`Revoked admin from \${adminToRevoke.value}\`, "success");
                adminToRevoke.value = null;
                fetchAdmins();
            } catch (err) {
                store.addToast(err.message, "error");
            }
        };
JS;
$content = preg_replace('/        const revokeAdmin = async \(username\) => \{[\s\S]*?store\.addToast\(err\.message, "error"\);\s*\}\s*\};\s*/', $revokeAdminCode . "\n\n", $content);

// 5. Replace deleteGame
$deleteGameCode = <<<JS
        const deleteGame = () => {
            deleteGameConfirmText.value = '';
            showDeleteGameModal.value = true;
        };

        const executeDeleteGameConfirmed = async () => {
            if (deleteGameConfirmText.value !== selectedGame.value.name) return;
            try {
                const res = await fetch('api/admin_delete_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                store.addToast("Game permanently deleted.", "success");
                showDeleteGameModal.value = false;
                store.selectedGameId = null;
                store.currentView = null; // Clear view so it drops to landing page
                await store.fetchGames(); // refresh sidebar list
            } catch (err) {
                store.addToast(err.message, "error");
            }
        };
JS;
$content = preg_replace('/        const deleteGame = async \(\) => \{[\s\S]*?store\.addToast\(err\.message, "error"\);\s*\}\s*\};\s*/', $deleteGameCode . "\n\n", $content);

// 6. Export new functions
$content = str_replace(
    "deleteCardFallback: executeDelete,",
    "deleteCardFallback: executeDelete, cardToDelete, executeDeleteConfirmed,",
    $content
);
$content = str_replace(
    "revokeAdmin, isCreator, deleteGame",
    "revokeAdmin, isCreator, deleteGame, adminToRevoke, executeRevokeConfirmed, showDeleteGameModal, deleteGameConfirmText, executeDeleteGameConfirmed",
    $content
);

file_put_contents($file, $content);
