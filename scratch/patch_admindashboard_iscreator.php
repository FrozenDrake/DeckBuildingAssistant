<?php
$file = 'src/js/pages/AdminDashboard.js';
$content = file_get_contents($file);

$content = str_replace(
    '<h3 style="margin-top: 0;">Multi-Admin Management</h3>',
    '<div v-if="isCreator">\n                            <h3 style="margin-top: 0;">Multi-Admin Management</h3>',
    $content
);

$content = str_replace(
    "                            </ul>\n                        </div>\n                    </div>\n\n                    <!-- ART MODERATION -->",
    "                            </ul>\n                        </div>\n                        </div>\n                    </div>\n\n                    <!-- ART MODERATION -->",
    $content
);

$content = str_replace(
    "const loadingAdmins = ref(false);",
    "const loadingAdmins = ref(false);\n        const isCreator = computed(() => selectedGame.value && store.user && selectedGame.value.created_by === store.user.id);",
    $content
);

$content = str_replace(
    "isPublic, savingVisibility, saveVisibility, newAdminUsername, grantingAdmin, grantAdmin, currentAdmins, loadingAdmins, revokeAdmin",
    "isPublic, savingVisibility, saveVisibility, newAdminUsername, grantingAdmin, grantAdmin, currentAdmins, loadingAdmins, revokeAdmin, isCreator",
    $content
);

// We need to import `computed` if it's not already imported. Wait, it is probably imported since we use it.
file_put_contents($file, $content);
