import { store } from '../store.js';
const { ref, computed, watch, onMounted } = Vue;

export default {
    name: 'admin-dashboard',
    template: `
        <div class="deck-builder-page" style="height: 100%; display: flex; flex-direction: column;">
            <div class="deck-subheader" style="padding: 20px; border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.1));">
                <div style="display: flex; justify-content: space-between; align-items: center; max-width: 800px; margin: 0 auto; width: 100%;">
                    <h2>Admin Dashboard: {{ selectedGame?.name || 'Unknown' }}</h2>
                </div>
            </div>

            <div style="flex: 1; overflow-y: auto; padding: 20px;" v-if="selectedGameId">
                <div style="max-width: 800px; margin: 0 auto; width: 100%;">
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <button class="btn" :class="activeTab === 'rules' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'rules'">Edit Game Rules</button>
                        <button class="btn" :class="activeTab === 'schema' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'schema'">Edit Card Schema</button>
                        <button class="btn" :class="activeTab === 'cards' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'cards'">Manage Cards</button>
                        <button class="btn" :class="activeTab === 'sync' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'sync'">Sync Database</button>
                        <button class="btn" :class="activeTab === 'art' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'art'">Art Moderation</button>
                        <button class="btn" :class="activeTab === 'settings' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'settings'">Game Settings</button>
                    </div>

                    <!-- RULES EDITOR -->
                    <div v-if="activeTab === 'rules'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0;">Deck Rules Configuration</h3>
                        
                        <div style="background: rgba(0,0,0,0.02); padding: 15px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9em; border: 1px dashed var(--primary-color);">
                            <strong>Available Rule Types:</strong>
                            <ul style="margin-left: 20px; margin-top: 10px;">
                                <li><code>unique_property</code>: Prevents a deck from containing multiple cards with the same value in a specific field.
                                    <br/><em>Example:</em> <code>{ "type": "unique_property", "property": "characters", "is_array": true, "error_message": "..." }</code>
                                </li>
                                <li style="margin-top: 10px;"><code>aggregate_attribute</code>: Validates the sum or average of a numeric card attribute across the whole deck.
                                    <br/><em>Example:</em> <code>{ "type": "aggregate_attribute", "property": "cost", "operator": "sum", "condition": "<=", "value": 50, "error_message": "..." }</code>
                                </li>
                            </ul>
                        </div>

                        <textarea 
                            v-model="rulesJson" 
                            class="filter-input" 
                            style="width: 100%; height: 350px; font-family: monospace; padding: 10px;"
                        ></textarea>
                        
                        <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                            <button class="btn btn-primary" :disabled="saving" @click="saveRules">
                                {{ saving ? 'Saving...' : 'Save Rules' }}
                            </button>
                        </div>
                    </div>
                    
                    <!-- SCHEMA EDITOR -->
                    <div v-if="activeTab === 'schema'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0;">Card Schema Configuration</h3>
                        
                        <div style="background: rgba(0,0,0,0.02); padding: 15px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9em; border: 1px dashed var(--primary-color);">
                            <strong>Schema Field Definition:</strong>
                            <p>Defines how the "Insert New Card" form renders fields. Available types: <code>string</code>, <code>number</code>, <code>select</code>.</p>
                            <pre style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.05); overflow-x: auto;">[
  { "key": "rarity", "label": "Rarity", "type": "select", "options": ["SSR", "SR"] },
  { "key": "name", "label": "Card Name", "type": "string", "required": true }
]</pre>
                        </div>

                        <textarea 
                            v-model="schemaJson" 
                            class="filter-input" 
                            style="width: 100%; height: 350px; font-family: monospace; padding: 10px;"
                        ></textarea>
                        
                        <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                            <button class="btn btn-primary" :disabled="saving" @click="saveSchema">
                                {{ saving ? 'Saving...' : 'Save Schema' }}
                            </button>
                        </div>
                    </div>

                    <!-- CARD INGESTER / MANAGER -->
                    <div v-if="activeTab === 'cards'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0; margin-bottom: 15px;">Manage Cards</h3>

                        <!-- Sub-tabs for Card Mode -->
                        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 15px;">
                            <button class="btn btn-sm" :class="cardMode === 'create' ? 'btn-primary' : 'btn-outline'" @click="setCardMode('create')">Create New Card</button>
                            <button class="btn btn-sm" :class="cardMode === 'update' ? 'btn-primary' : 'btn-outline'" @click="setCardMode('update')">Update Existing</button>
                            <button class="btn btn-sm" :class="cardMode === 'delete' ? 'btn-primary' : 'btn-outline'" @click="setCardMode('delete')">Delete Card</button>
                        </div>

                        <div v-if="cardMode !== 'create'" style="margin-bottom: 20px; padding: 10px; background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.1); border-radius: 4px;">
                            <label style="display:block; margin-bottom: 5px; font-weight: bold;">Find Existing Card to {{ cardMode === 'update' ? 'Edit' : 'Delete' }}</label>
                            <input type="text" v-model="cardSearchQuery" placeholder="Search by name to narrow dropdown..." class="filter-input" style="margin-bottom: 10px;" />
                            <custom-dropdown 
                                v-model="selectedCardId" 
                                :options="cardOptions"
                                placeholder="-- Select Card --"
                            ></custom-dropdown>
                            <p class="help-text" style="margin-top: 5px; font-size: 0.8em; opacity: 0.7;">Showing top 50 matches from the database.</p>
                        </div>
                        
                        <!-- Delete Mode UI -->
                        <div v-if="cardMode === 'delete'">
                            <div v-if="selectedCardId" style="text-align: center; padding: 30px; border: 1px solid rgba(255,0,0,0.2); border-radius: 8px; background: rgba(255,0,0,0.05);">
                                <h3 style="color: #ef4444; margin-top: 0;">Confirm Deletion</h3>
                                <p>Are you sure you want to permanently delete this card from the database?</p>
                                <button type="button" class="btn btn-danger" :disabled="saving" @click="deleteCard" style="margin-top: 15px;">
                                    {{ saving ? 'Working...' : 'Permanently Delete Card' }}
                                </button>
                            </div>
                            <div v-else style="text-align: center; padding: 20px; opacity: 0.5;">
                                Please select a card above to delete.
                            </div>
                        </div>

                        <!-- Create/Update Mode Form -->
                        <div v-if="cardMode === 'create' || (cardMode === 'update' && selectedCardId)">
                            <form @submit.prevent="saveCard" v-if="hasSchema">
                                <div v-for="field in currentSchema.filter(f => f.key !== 'image_url')" :key="field.key" style="margin-bottom: 15px;">
                                    <label style="display:block; margin-bottom: 5px; font-weight: bold;">
                                        {{ field.label }} <span v-if="field.required" style="color: red;">*</span>
                                    </label>
                                    
                                    <!-- Select Input -->
                                    <template v-if="field.type === 'select'">
                                        <custom-dropdown 
                                            v-model="cardForm[field.key]" 
                                            :options="field.options.map(o => ({ value: o, label: o }))"
                                            :placeholder="'Select ' + field.label"
                                        ></custom-dropdown>
                                    </template>
                                    
                                    <!-- Text/Number Input -->
                                    <template v-else>
                                        <input 
                                            :type="field.type === 'number' ? 'number' : 'text'" 
                                            v-model="cardForm[field.key]" 
                                            class="filter-input" 
                                            :required="field.required"
                                        />
                                    </template>
                                </div>
                                
                                <div style="margin-bottom: 15px; padding: 15px; background: rgba(0,0,0,0.02); border: 1px dashed var(--primary-color); border-radius: 4px;">
                                    <label style="display:block; margin-bottom: 5px; font-weight: bold;">Upload Card Image</label>
                                    <input type="file" accept="image/*" class="filter-input" disabled title="Image upload will be available in Phase 4" />
                                    <p class="help-text" style="margin-top: 5px; margin-bottom: 0;">* Image moderation and upload pipeline is slated for Phase 4. Field disabled temporarily.</p>
                                </div>
                                
                                <hr style="margin: 20px 0; border: 1px solid rgba(0,0,0,0.1);" />
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display:block; margin-bottom: 5px; font-weight: bold;">Additional Raw Data (JSON)</label>
                                    <p class="help-text" style="margin-bottom: 5px;">Arbitrary nested properties used for complex filtering (e.g. skills, stats).</p>
                                    <textarea 
                                        v-model="cardFormRawJson" 
                                        class="filter-input" 
                                        style="width: 100%; height: 150px; font-family: monospace; padding: 10px;"
                                    ></textarea>
                                </div>

                                <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                                    <button type="submit" class="btn btn-primary" :disabled="saving">
                                        {{ saving ? 'Working...' : (cardMode === 'update' ? 'Update Card' : 'Insert Card') }}
                                    </button>
                                </div>
                            </form>

                            <!-- Fallback if no schema -->
                        <div v-else>
                            <p class="help-text">Provide the full raw JSON payload for the card (No schema defined for this game).</p>
                            <textarea 
                                v-model="cardJsonFallback" 
                                class="filter-input" 
                                style="width: 100%; height: 300px; font-family: monospace; padding: 10px;"
                            ></textarea>
                            
                            <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                                <button type="button" class="btn btn-danger" v-if="selectedCardId" :disabled="saving" @click="deleteCardFallback">
                                    {{ saving ? 'Working...' : 'Delete Card' }}
                                </button>
                                <button class="btn btn-primary" :disabled="saving" @click="saveCardFallback">
                                    {{ saving ? 'Working...' : (selectedCardId ? 'Update Card' : 'Insert Card') }}
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>

                    <!-- SYNC DATABASE TAB -->
                    <div v-if="activeTab === 'sync'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0; margin-bottom: 6px;">Sync Card Database</h3>
                        <p class="help-text" style="margin-bottom: 12px;">
                            Upload a JSON array dump from your data source. All fields from each record are stored verbatim on the card document — no mapping or transformation is applied.
                        </p>
                        <p class="help-text" style="margin-bottom: 20px;">
                            Upload a JSON dump from your data source (e.g. umamusu-utils). This will perform a <strong>full replace</strong> — all existing cards for this game will be wiped and replaced with the uploaded data.
                            Use the <strong>Edit Card Schema</strong> tab to define which field keys from your dump should be surfaced in the UI (as filters, sort options, and card form fields). The field keys in your schema must match the field keys in your dump exactly.
                            This is a <strong>full replace</strong> — all existing cards for this game will be wiped and replaced with the uploaded data.
                        </p>

                        <!-- Import Adapter Selector -->
                        <div style="margin-bottom: 20px; padding: 14px 16px; border-radius: 6px; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.08);">
                            <label style="display:block; font-weight: bold; margin-bottom: 8px;">Import Adapter</label>
                            <p class="help-text" style="margin-bottom: 10px;">Controls how raw records in the JSON dump are transformed into card documents. Changes are saved to the game when you click Save.</p>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <custom-dropdown
                                    v-model="syncAdapter"
                                    :options="[
                                        { value: 'generic',    label: 'Generic (store all fields as-is)' },
                                        { value: 'umamusume',  label: 'Umamusume / GameTora (rarity map, title + char_name)' },
                                    ]"
                                    placeholder="Select adapter..."
                                    style="min-width: 320px;"
                                ></custom-dropdown>
                                <button class="btn btn-outline btn-sm" :disabled="saving || syncAdapter === (selectedGame?.import_adapter || 'generic')" @click="saveAdapter">
                                    {{ saving ? 'Saving...' : 'Save' }}
                                </button>
                                <span v-if="selectedGame?.import_adapter" style="font-size: 0.82em; opacity: 0.55;">
                                    Currently saved: <strong>{{ selectedGame.import_adapter }}</strong>
                                </span>
                            </div>
                        </div>

                        <!-- Drop Zone -->
                        <div
                            class="sync-drop-zone"
                            :class="{ 'sync-drop-zone--over': syncDragOver, 'sync-drop-zone--loaded': syncFile }"
                            @dragover.prevent="syncDragOver = true"
                            @dragleave.prevent="syncDragOver = false"
                            @drop.prevent="onSyncDrop"
                            @click="$refs.syncFileInput.click()"
                        >
                            <input ref="syncFileInput" type="file" accept=".json,application/json" style="display:none;" @change="onSyncFileSelect" />
                            <div v-if="!syncFile">
                                <p style="margin: 0 0 6px; font-size: 1.05em; font-weight: 600;">Drag and drop your JSON dump here</p>
                                <p style="margin: 0; opacity: 0.55; font-size: 0.88em;">or click to browse — accepts .json files only</p>
                            </div>
                            <div v-else>
                                <p style="margin: 0 0 4px; font-size: 1em; font-weight: 600;">{{ syncFile.name }}</p>
                                <p style="margin: 0; opacity: 0.55; font-size: 0.85em;">{{ (syncFile.size / 1024).toFixed(1) }} KB — click to change file</p>
                            </div>
                        </div>

                        <!-- Result / Progress -->
                        <div v-if="syncResult" style="margin-top: 15px; padding: 12px 16px; border-radius: 6px;" :style="syncResult.error ? 'background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3);' : 'background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3);'">
                            <p v-if="syncResult.error" style="margin: 0; color: #ef4444;">{{ syncResult.error }}</p>
                            <p v-else style="margin: 0;">
                                Sync complete — <strong>{{ syncResult.inserted }}</strong> cards inserted,
                                <strong>{{ syncResult.skipped }}</strong> skipped.
                            </p>
                        </div>

                        <div style="margin-top: 16px; display: flex; gap: 10px; align-items: center;">
                            <button class="btn btn-primary" :disabled="!syncFile || syncing" @click="runSync">
                                {{ syncing ? 'Uploading...' : 'Run Sync' }}
                            </button>
                            <button class="btn btn-outline" v-if="syncFile" :disabled="syncing" @click="syncFile = null; syncResult = null;">Clear</button>
                        </div>
                    </div>

                    <!-- GAME SETTINGS -->
                    <div v-if="activeTab === 'settings'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0;">General Settings</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Game Name</label>
                                <input type="text" v-model="generalSettings.name" class="filter-input" style="width: 100%;" />
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Cover Color</label>
                                <div style="display: flex; gap: 10px;">
                                    <input type="color" v-model="generalSettings.cover_color" style="width: 50px; height: 38px; padding: 0; border: none; cursor: pointer;" />
                                    <input type="text" v-model="generalSettings.cover_color" class="filter-input" style="flex: 1;" placeholder="#HEX" />
                                </div>
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description</label>
                                <textarea v-model="generalSettings.description" class="filter-input" style="width: 100%; height: 80px;"></textarea>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Max Deck Size</label>
                                <input type="number" v-model.number="generalSettings.max_deck_size" class="filter-input" style="width: 100%;" />
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Max Copies Per Card</label>
                                <input type="number" v-model.number="generalSettings.max_copies_per_card" class="filter-input" style="width: 100%; margin-bottom: 5px;" />
                                <div style="font-size: 0.8em; opacity: 0.7; line-height: 1.3;">Default limit. Add a <code>max_copies</code> number field to your Card Schema to override this per-card (e.g. for Basic Lands).</div>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" @click="saveGeneralSettings" :disabled="savingGeneralSettings">Save General Settings</button>
                        
                        <hr style="border: 0; border-top: 1px solid rgba(0,0,0,0.1); margin: 30px 0;" />
                        
                        <h3 style="margin-top: 0;">Visibility</h3>
                        
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
                        
                        <div v-if="isCreator">
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
                            
                            <hr style="border: 0; border-top: 1px solid rgba(0,0,0,0.1); margin: 30px 0;" />
                            
                            <div style="background: rgba(255, 0, 0, 0.05); padding: 15px; border-radius: 8px; border: 1px dashed red;">
                                <h3 style="margin-top: 0; color: red;">Danger Zone</h3>
                                <p style="font-size: 0.9em; opacity: 0.8; margin-bottom: 15px;">Permanently delete this game and all associated data.</p>
                                <button class="btn btn-primary" style="background: red; border-color: red;" @click="deleteGame">Delete Game</button>
                            </div>
                        </div>
                    </div>

                    <!-- ART MODERATION -->
                    <div v-if="activeTab === 'art'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0;">Art Moderation Queue</h3>
                        <p style="opacity: 0.8; font-size: 0.95em;">Review card art submitted by users. Approved images will be assigned to the card immediately.</p>
                        
                        <div v-if="loadingArt" style="text-align: center; padding: 20px;">Loading submissions...</div>
                        <div v-else-if="artSubmissions.length === 0" style="text-align: center; padding: 20px; opacity: 0.7;">No pending submissions in the queue.</div>
                        <div v-else class="mod-queue-grid">
                            <div v-for="sub in artSubmissions" :key="sub.id" class="mod-item">
                                <img :src="'images/submissions/' + sub.file_name" alt="Submission" />
                                <div class="mod-item-details">
                                    <div><strong>Card:</strong> {{ sub.card_name }}</div>
                                    <div><strong>Submitted By:</strong> {{ sub.name }}</div>
                                </div>
                                <div class="mod-item-actions">
                                    <button class="btn btn-primary" @click="moderateArt(sub.id, 'approve')" :disabled="moderatingId === sub.id">Approve</button>
                                    <button class="btn btn-danger" @click="moderateArt(sub.id, 'reject')" :disabled="moderatingId === sub.id">Reject</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Custom Modals -->
            <!-- Delete Card Modal -->
            <div v-if="cardToDelete" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: var(--bg-color); padding: 25px; border-radius: 8px; border: 1px solid var(--border-color); width: 400px; max-width: 90vw;">
                    <h3 style="margin-top: 0;">Confirm Deletion</h3>
                    <p>Are you sure you want to delete this card?</p>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-outline" style="flex: 1;" @click="cardToDelete = null">Cancel</button>
                        <button class="btn btn-primary" style="flex: 1; background: red; border-color: red;" @click="executeDeleteConfirmed">Delete</button>
                    </div>
                </div>
            </div>

            <!-- Revoke Admin Modal -->
            <div v-if="adminToRevoke" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: var(--bg-color); padding: 25px; border-radius: 8px; border: 1px solid var(--border-color); width: 400px; max-width: 90vw;">
                    <h3 style="margin-top: 0;">Revoke Admin Rights</h3>
                    <p>Are you sure you want to revoke admin rights for <strong>{{ adminToRevoke }}</strong>?</p>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-outline" style="flex: 1;" @click="adminToRevoke = null">Cancel</button>
                        <button class="btn btn-primary" style="flex: 1; background: red; border-color: red;" @click="executeRevokeConfirmed">Revoke</button>
                    </div>
                </div>
            </div>

            <!-- Delete Game Modal -->
            <div v-if="showDeleteGameModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: var(--bg-color); padding: 25px; border-radius: 8px; border: 1px solid red; width: 450px; max-width: 90vw; box-shadow: 0 10px 30px rgba(255,0,0,0.2);">
                    <h3 style="margin-top: 0; color: red;">Delete Game</h3>
                    <p><strong>WARNING:</strong> This will permanently delete the entire game, including ALL cards, user decks, and collections for this game. This action cannot be undone.</p>
                    <p style="margin-bottom: 5px;">To confirm deletion, type the name of the game exactly:<br><strong>"{{ selectedGame.name }}"</strong></p>
                    <input type="text" v-model="deleteGameConfirmText" class="filter-input" style="width: 100%; box-sizing: border-box; margin-bottom: 20px;" placeholder="Type game name here..." />
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline" style="flex: 1;" @click="showDeleteGameModal = false; deleteGameConfirmText = ''">Cancel</button>
                        <button class="btn btn-primary" style="flex: 1; background: red; border-color: red;" @click="executeDeleteGameConfirmed" :disabled="deleteGameConfirmText !== selectedGame.name">Delete Game</button>
                    </div>
                </div>
            </div>

            <div v-else style="text-align: center; margin-top: 50px;">
                <h3>Please open a game you administer from the sidebar to view the Admin Dashboard.</h3>
            </div>
        </div>
    `,
    setup() {
        const selectedGameId = computed(() => store.selectedGameId);
        const activeTab = ref('rules');
        const cardMode  = ref('create');

        // ---- Sync Database tab ----
        const syncFile     = ref(null);
        const syncDragOver = ref(false);
        const syncing      = ref(false);
        const syncResult   = ref(null);
        const syncAdapter  = ref('generic');


        const saveAdapter = async () => {
            if (!selectedGameId.value) return;
            saving.value = true;
            try {
                const res  = await fetch('api/admin_update_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value, import_adapter: syncAdapter.value }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                if (selectedGame.value) selectedGame.value.import_adapter = syncAdapter.value;
                store.addToast('Import adapter saved.', 'success');
            } catch (err) {
                store.addToast(err.message, 'error');
            } finally {
                saving.value = false;
            }
        };

        const onSyncFileSelect = (e) => {
            const file = e.target.files[0];
            if (file) { syncFile.value = file; syncResult.value = null; }
        };
        const onSyncDrop = (e) => {
            syncDragOver.value = false;
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/json' || (file && file.name.endsWith('.json'))) {
                syncFile.value = file;
                syncResult.value = null;
            }
        };
        const runSync = async () => {
            if (!syncFile.value || syncing.value) return;
            syncing.value = true;
            syncResult.value = null;
            try {
                const form = new FormData();
                form.append('game_id', selectedGameId.value);
                form.append('dump', syncFile.value);
                const res  = await fetch('api/sync_database.php', { method: 'POST', body: form });
                const data = await res.json();
                syncResult.value = data;
                if (res.ok) {
                    store.addToast(`Sync complete — ${data.inserted} cards imported.`, 'success');
                } else {
                    store.addToast(data.error || 'Sync failed.', 'error');
                }
            } catch (err) {
                syncResult.value = { error: err.message };
                store.addToast(err.message, 'error');
            } finally {
                syncing.value = false;
            }
        };

        const rulesJson = ref('[]');
        const schemaJson = ref('[]');
        const cardJsonFallback = ref('{}');
        
        // Dynamic Form state
        const cards = ref([]);
        const cardSearchQuery = ref('');
        const selectedCardId = ref(null);
        const cardForm = ref({});
        const cardFormRawJson = ref('{}');
        
        const saving = ref(false);

        const selectedGame = computed(() => {
            if (!selectedGameId.value) return null;
            return store.games.find(g => g.id === selectedGameId.value) || null;
        });

        // Keep syncAdapter in sync with the loaded game document
        watch(selectedGame, (game) => {
            if (game) syncAdapter.value = game.import_adapter || 'generic';
        }, { immediate: true });

        const currentSchema = computed(() => selectedGame.value?.card_schema || []);
        const hasSchema = computed(() => currentSchema.value.length > 0);

        const cardOptions = computed(() => {
            return [{ value: null, label: '-- Select Card --' }].concat(
                cards.value.map(c => ({ value: c.id, label: c.name || c.id }))
            );
        });

        const fetchCards = async () => {
            if (!selectedGameId.value) return;
            try {
                const res = await fetch('api/search_cards.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        search: cardSearchQuery.value,
                        limit: 50,
                        include_raw: true
                    })
                });
                const data = await res.json();
                cards.value = data.cards || [];
            } catch (err) {
                console.error(err);
            }
        };

        watch(cardSearchQuery, () => {
            fetchCards();
        });

        const setCardMode = (mode) => {
            cardMode.value = mode;
            resetCardForm();
        };

        const resetCardForm = () => {
            selectedCardId.value = null;
            cardForm.value = {};
            cardFormRawJson.value = '{}';
            cardJsonFallback.value = '{}';
        };

        watch(selectedGameId, (newId) => {
            if (newId) {
                const game = selectedGame.value;
                if (game) {
                    rulesJson.value = JSON.stringify(game.deck_rules || [], null, 2);
                    schemaJson.value = JSON.stringify(game.card_schema || [], null, 2);
                    cardSearchQuery.value = '';
                    fetchCards();
                    resetCardForm();
                }
            }
        }, { immediate: true });

        watch(selectedCardId, (newId) => {
            if (!newId) {
                resetCardForm();
                return;
            }
            const card = cards.value.find(c => c.id === newId);
            if (card) {
                const formCopy = { ...card };
                delete formCopy.id;
                delete formCopy.game_id;
                delete formCopy.raw_data;
                
                // Unmap arrays to comma-separated strings for schema form
                currentSchema.value.forEach(field => {
                    if (field.key === 'characters' && Array.isArray(formCopy[field.key])) {
                        formCopy[field.key] = formCopy[field.key].join(', ');
                    }
                });

                cardForm.value = formCopy;
                cardFormRawJson.value = JSON.stringify(card.raw_data || {}, null, 2);
                cardJsonFallback.value = JSON.stringify(card, null, 2);
            }
        });

        const saveRules = async () => {
            let parsedRules;
            try {
                parsedRules = JSON.parse(rulesJson.value);
            } catch (e) {
                store.addToast("Invalid JSON in rules editor", "error");
                return;
            }

            saving.value = true;
            try {
                const res = await fetch('api/admin_update_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        deck_rules: parsedRules
                    })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                if (selectedGame.value) selectedGame.value.deck_rules = parsedRules;
                
                store.addToast("Game rules updated successfully", "success");
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                saving.value = false;
            }
        };
        
        const saveSchema = async () => {
            let parsedSchema;
            try {
                parsedSchema = JSON.parse(schemaJson.value);
            } catch (e) {
                store.addToast("Invalid JSON in schema editor", "error");
                return;
            }

            saving.value = true;
            try {
                const res = await fetch('api/admin_update_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        card_schema: parsedSchema
                    })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                if (selectedGame.value) selectedGame.value.card_schema = parsedSchema;
                
                store.addToast("Card schema updated successfully", "success");
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                saving.value = false;
            }
        };

        const executeSave = async (parsedCard) => {
            saving.value = true;
            const endpoint = selectedCardId.value ? 'api/admin_update_card.php' : 'api/admin_insert_card.php';
            const payload = {
                game_id: selectedGameId.value,
                card_data: parsedCard
            };
            if (selectedCardId.value) payload.card_id = selectedCardId.value;

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                store.addToast(selectedCardId.value ? "Card updated successfully" : "Card inserted successfully", "success");
                await fetchCards();
                if (!selectedCardId.value) resetCardForm();
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                saving.value = false;
            }
        };

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

        const saveCard = () => {
            let parsedRaw = {};
            if (cardFormRawJson.value.trim() !== '') {
                try {
                    parsedRaw = JSON.parse(cardFormRawJson.value);
                } catch (e) {
                    store.addToast("Invalid JSON in Additional Raw Data", "error");
                    return;
                }
            }
            
            const payload = { ...cardForm.value };
            currentSchema.value.forEach(field => {
                if (field.key === 'characters' && typeof payload[field.key] === 'string') {
                    payload[field.key] = payload[field.key].split(',').map(s => s.trim()).filter(s => s.length > 0);
                }
            });
            
            payload.raw_data = parsedRaw;
            executeSave(payload);
        };

        const saveCardFallback = () => {
            let parsedCard;
            try {
                parsedCard = JSON.parse(cardJsonFallback.value);
            } catch (e) {
                store.addToast("Invalid JSON in card editor", "error");
                return;
            }
            executeSave(parsedCard);
        };

        // --- ART MODERATION LOGIC ---
        const artSubmissions = ref([]);
        const loadingArt = ref(false);
        const moderatingId = ref(null);

        const fetchArtSubmissions = async () => {
            if (!selectedGameId.value) return;
            loadingArt.value = true;
            try {
                const res = await fetch(`api/get_art_submissions.php?game_id=${selectedGameId.value}`);
                const data = await res.json();
                artSubmissions.value = Array.isArray(data) ? data : [];
            } catch (err) {
                console.error(err);
            } finally {
                loadingArt.value = false;
            }
        };

        const moderateArt = async (submissionId, action) => {
            moderatingId.value = submissionId;
            try {
                const res = await fetch('api/moderate_art.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ submission_id: submissionId, action })
                });
                const data = await res.json();
                if (data.success) {
                    store.addToast(`Art ${action}d successfully.`, 'success');
                    artSubmissions.value = artSubmissions.value.filter(s => s.id !== submissionId);
                } else {
                    store.addToast(data.error || `Failed to ${action} art.`, 'error');
                }
            } catch (err) {
                store.addToast('Error communicating with server.', 'error');
            } finally {
                moderatingId.value = null;
            }
        };

        // ---- SETTINGS & MULTI-ADMIN ----
        const isPublic = ref(false);
        const savingVisibility = ref(false);
        const generalSettings = ref({
            name: '',
            description: '',
            cover_color: '#000000',
            max_deck_size: 60,
            max_copies_per_card: 4
        });
        const savingGeneralSettings = ref(false);
        const newAdminUsername = ref('');
        const grantingAdmin = ref(false);
        const currentAdmins = ref([]);
        const loadingAdmins = ref(false);
        const cardToDelete = ref(null);
        const adminToRevoke = ref(null);
        const showDeleteGameModal = ref(false);
        const deleteGameConfirmText = ref('');
        
        const isCreator = computed(() => {
            return selectedGame.value && store.user && selectedGame.value.created_by === store.user.id;
        });

        watch(selectedGame, (game) => {
            if (game) {
                syncAdapter.value = game.import_adapter || 'generic';
                isPublic.value = !!game.is_public;
                generalSettings.value = {
                    name: game.name || '',
                    description: game.description || '',
                    cover_color: game.cover_color || '#000000',
                    max_deck_size: game.max_deck_size || 60,
                    max_copies_per_card: game.max_copies_per_card || 4
                };
                if (activeTab.value === 'settings') fetchAdmins();
            }
        }, { immediate: true });

        watch(() => activeTab.value, (newTab) => {
            if (newTab === 'art') fetchArtSubmissions();
            if (newTab === 'settings' && selectedGameId.value) fetchAdmins();
        });

        const saveGeneralSettings = async () => {
            savingGeneralSettings.value = true;
            try {
                const res = await fetch('api/admin_update_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        ...generalSettings.value
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                store.addToast("General settings saved successfully", "success");
                await store.fetchGames();
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                savingGeneralSettings.value = false;
            }
        };

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
                store.addToast(`Granted admin to ${newAdminUsername.value}`, "success");
                newAdminUsername.value = '';
                fetchAdmins();
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                grantingAdmin.value = false;
            }
        };

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
                store.addToast(`Revoked admin from ${adminToRevoke.value}`, "success");
                adminToRevoke.value = null;
                fetchAdmins();
            } catch (err) {
                store.addToast(err.message, "error");
            }
        };
        
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
        // ----------------------------

        return {
            store, selectedGameId, selectedGame,
            activeTab, cardMode, rulesJson, schemaJson, saving,
            hasSchema, currentSchema, cards, cardSearchQuery, selectedCardId, cardOptions, cardForm, cardFormRawJson, cardJsonFallback,
            saveRules, saveSchema, saveCard, saveCardFallback, deleteCard: executeDelete, deleteCardFallback: executeDelete, resetCardForm, setCardMode,
            syncFile, syncDragOver, syncing, syncResult, onSyncFileSelect, onSyncDrop, runSync,
            syncAdapter, saveAdapter,
            artSubmissions, loadingArt, moderatingId, moderateArt,
            isPublic, savingVisibility, saveVisibility, generalSettings, savingGeneralSettings, saveGeneralSettings, newAdminUsername, grantingAdmin, grantAdmin, currentAdmins, loadingAdmins, revokeAdmin, isCreator, deleteGame, cardToDelete, executeDeleteConfirmed, adminToRevoke, executeRevokeConfirmed, showDeleteGameModal, deleteGameConfirmText, executeDeleteGameConfirmed
        }
    }
}
