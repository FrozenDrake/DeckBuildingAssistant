<?php
$file = 'src/js/pages/AdminDashboard.js';
$content = file_get_contents($file);
$tabContent = <<<HTML

                    <!-- GAME SETTINGS -->
                    <div v-if="activeTab === 'settings'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0;">Game Visibility & Settings</h3>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="checkbox" v-model="isPublic" style="margin-right: 10px; transform: scale(1.2);" />
                                <div>
                                    <strong style="display: block;">Public Game</strong>
                                    <span style="font-size: 0.85em; opacity: 0.7;">If checked, anyone can see this game and its cards. If unchecked, only admins can see it.</span>
                                </div>
                            </label>
                        </div>
                        <button class="btn btn-primary btn-sm" @click="saveVisibility" :disabled="savingVisibility">Save Visibility</button>
                        
                        <hr style="border: 0; border-top: 1px solid rgba(0,0,0,0.1); margin: 30px 0;" />
                        
                        <h3 style="margin-top: 0;">Multi-Admin Management</h3>
                        <p style="font-size: 0.9em; opacity: 0.8; margin-bottom: 15px;">Grant other users admin access to this game.</p>
                        
                        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                            <input type="text" v-model="newAdminUsername" class="filter-input" placeholder="Username to grant..." style="flex: 1;" />
                            <button class="btn btn-primary" @click="grantAdmin" :disabled="grantingAdmin">Grant Admin</button>
                        </div>
                        
                        <div>
                            <strong style="display: block; margin-bottom: 10px;">Current Admins:</strong>
                            <div v-if="loadingAdmins" style="opacity: 0.6; font-size: 0.9em;">Loading admins...</div>
                            <ul v-else style="margin: 0; padding-left: 20px;">
                                <li v-for="admin in currentAdmins" :key="admin" style="margin-bottom: 8px;">
                                    {{ admin }}
                                    <button v-if="admin !== store.user?.username" class="btn btn-outline btn-sm" style="margin-left: 10px; padding: 2px 8px; font-size: 0.75em;" @click="revokeAdmin(admin)">Revoke</button>
                                </li>
                            </ul>
                        </div>
                    </div>
HTML;

$content = str_replace(
    "                    <!-- ART MODERATION -->",
    $tabContent . "\n                    <!-- ART MODERATION -->",
    $content
);
file_put_contents($file, $content);
