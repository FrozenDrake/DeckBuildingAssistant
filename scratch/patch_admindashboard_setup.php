<?php
$file = 'src/js/pages/AdminDashboard.js';
$content = file_get_contents($file);

$setupCode = <<<JS
        // ---- SETTINGS & MULTI-ADMIN ----
        const isPublic = ref(false);
        const savingVisibility = ref(false);
        const newAdminUsername = ref('');
        const grantingAdmin = ref(false);
        const currentAdmins = ref([]);
        const loadingAdmins = ref(false);

        watch(selectedGame, (game) => {
            if (game) {
                isPublic.value = !!game.is_public;
                if (activeTab.value === 'settings') fetchAdmins();
            }
        }, { immediate: true });

        watch(() => activeTab.value, (newTab) => {
            if (newTab === 'art') fetchArtSubmissions();
            if (newTab === 'settings' && selectedGameId.value) fetchAdmins();
        });

        const saveVisibility = async () => {
            savingVisibility.value = true;
            try {
                const res = await fetch('api/admin_update_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        is_public: isPublic.value
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                if (selectedGame.value) selectedGame.value.is_public = isPublic.value;
                store.addToast("Visibility saved successfully", "success");
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                savingVisibility.value = false;
            }
        };

        const fetchAdmins = async () => {
            loadingAdmins.value = true;
            try {
                const res = await fetch('api/admin_get_roles.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                currentAdmins.value = data.admins;
            } catch (err) {
                console.error(err);
            } finally {
                loadingAdmins.value = false;
            }
        };

        const grantAdmin = async () => {
            if (!newAdminUsername.value.trim()) return;
            grantingAdmin.value = true;
            try {
                const res = await fetch('api/admin_manage_roles.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value, username: newAdminUsername.value.trim(), action: 'grant' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                store.addToast(\`Granted admin to \${newAdminUsername.value}\`, "success");
                newAdminUsername.value = '';
                fetchAdmins();
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                grantingAdmin.value = false;
            }
        };

        const revokeAdmin = async (username) => {
            if (!confirm(\`Revoke admin rights for \${username}?\`)) return;
            try {
                const res = await fetch('api/admin_manage_roles.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value, username: username, action: 'revoke' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                store.addToast(\`Revoked admin from \${username}\`, "success");
                fetchAdmins();
            } catch (err) {
                store.addToast(err.message, "error");
            }
        };
        // ----------------------------

JS;

// Find watch(() => activeTab.value... and replace it
$content = preg_replace('/watch\(\(\) => activeTab\.value, \(newTab\) => \{\s*if \(newTab === \'art\'\) fetchArtSubmissions\(\);\s*\}\);/', '', $content);

$content = str_replace(
    "        // ----------------------------\n\n        return {",
    $setupCode . "\n        return {",
    $content
);

$content = str_replace(
    "artSubmissions, loadingArt, moderatingId, moderateArt\n        }",
    "artSubmissions, loadingArt, moderatingId, moderateArt,\n            isPublic, savingVisibility, saveVisibility, newAdminUsername, grantingAdmin, grantAdmin, currentAdmins, loadingAdmins, revokeAdmin\n        }",
    $content
);

file_put_contents($file, $content);
