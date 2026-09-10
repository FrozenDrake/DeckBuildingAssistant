<?php
$file = 'src/js/pages/AdminDashboard.js';
$content = file_get_contents($file);

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
                store.addToast(`Revoked admin from \${adminToRevoke.value}`, "success");
                adminToRevoke.value = null;
                fetchAdmins();
            } catch (err) {
                store.addToast(err.message, "error");
            }
        };
JS;

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

// Use preg_replace to rip out the old revokeAdmin and deleteGame completely
$content = preg_replace('/        const revokeAdmin = async \(username\) => \{[\s\S]*?store\.fetchGames\(\); \/\/ refresh sidebar list\s*\} catch \(err\) \{\s*store\.addToast\(err\.message, "error"\);\s*\}\s*\};\s*/', $revokeAdminCode . "\n\n" . $deleteGameCode . "\n\n", $content);

file_put_contents($file, $content);
