const { ref, computed } = Vue;

/**
 * MultiSort - A generic multi-level sort builder component.
 *
 * Accepts a `schema` prop with a `fields` array (same shape as ComplexFilter schema).
 * Emits `sort-updated` with an ordered array of { field, direction } objects.
 * The caller applies them in order: first entry is primary sort, second is tiebreaker, etc.
 *
 * Example emitted value:
 *   [ { field: 'rarity', direction: 'desc' }, { field: 'name', direction: 'asc' } ]
 */
export default {
    name: 'multi-sort',
    props: {
        schema: {
            type: Object,
            required: true
        }
    },
    emits: ['sort-updated'],
    template: `
        <div class="multi-sort">
            <div class="multi-sort-rows">
                <div class="multi-sort-row" v-for="(rule, index) in sortRules" :key="index">
                    <!-- Priority label -->
                    <span class="sort-priority-label">{{ index === 0 ? 'Sort by' : 'then by' }}</span>

                    <!-- Field selector -->
                    <custom-dropdown
                        v-model="rule.field"
                        :options="fieldOptions"
                        placeholder="Select field..."
                    ></custom-dropdown>

                    <!-- Dropdown for extracted JSON paths -->
                    <custom-dropdown
                        v-if="rule.field === '__raw_path__'"
                        v-model="rule.rawPath"
                        :options="rawPathOptions"
                        placeholder="Select Property"
                        class="sort-raw-path"
                    ></custom-dropdown>

                    <!-- Direction toggle button -->
                    <button
                        class="btn btn-outline sort-dir-btn"
                        @click="toggleDirection(index)"
                        :disabled="!rule.field"
                        :title="rule.direction === 'asc' ? 'Ascending (click to flip)' : 'Descending (click to flip)'"
                    >
                        <span v-if="rule.direction === 'asc'">
                            A → Z
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </span>
                        <span v-else>
                            Z → A
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        </span>
                    </button>

                    <!-- Move up / down -->
                    <button class="btn btn-outline btn-icon" @click="moveUp(index)" :disabled="index === 0" title="Move up">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    </button>
                    <button class="btn btn-outline btn-icon" @click="moveDown(index)" :disabled="index === sortRules.length - 1" title="Move down">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>

                    <!-- Remove -->
                    <button class="btn btn-danger btn-icon" @click="removeRule(index)" title="Remove sort level">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div v-if="sortRules.length === 0" class="multi-sort-empty">
                    No sort applied. Cards appear in database order.
                </div>
            </div>

            <div class="multi-sort-footer">
                <button class="btn btn-sm btn-outline" @click="addRule">+ Add Sort Level</button>
                <button class="btn btn-sm btn-outline" @click="clearAll" v-if="sortRules.length > 0">Clear All</button>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        // Each rule: { field: string|null, direction: 'asc'|'desc' }
        const sortRules = ref([]);

        const fieldOptions = computed(() =>
            props.schema.fields.map(f => ({ value: f.key, label: f.label }))
        );

        const rawPathOptions = computed(() => {
            const rawPathField = props.schema.fields.find(f => f.key === '__raw_path__');
            return rawPathField && rawPathField.options ? rawPathField.options : [];
        });

        const addRule = () => {
            sortRules.value.push({ field: null, direction: 'asc' });
            emitUpdate();
        };

        const removeRule = (index) => {
            sortRules.value.splice(index, 1);
            emitUpdate();
        };

        const toggleDirection = (index) => {
            sortRules.value[index].direction =
                sortRules.value[index].direction === 'asc' ? 'desc' : 'asc';
            emitUpdate();
        };

        const moveUp = (index) => {
            if (index === 0) return;
            const rules = sortRules.value;
            [rules[index - 1], rules[index]] = [rules[index], rules[index - 1]];
            emitUpdate();
        };

        const moveDown = (index) => {
            const rules = sortRules.value;
            if (index >= rules.length - 1) return;
            [rules[index], rules[index + 1]] = [rules[index + 1], rules[index]];
            emitUpdate();
        };

        const clearAll = () => {
            sortRules.value = [];
            emitUpdate();
        };

        // Emit only rules that have a field selected
        const emitUpdate = () => {
            const active = sortRules.value.filter(r => r.field);
            emit('sort-updated', active);
        };

        // Watch for changes on individual rule fields so we emit automatically on field change
        // We use a deep watch via Vue's reactivity on the array
        const { watch } = Vue;
        watch(sortRules, emitUpdate, { deep: true });

        return { sortRules, fieldOptions, rawPathOptions, addRule, removeRule, toggleDirection, moveUp, moveDown, clearAll };
    }
}

