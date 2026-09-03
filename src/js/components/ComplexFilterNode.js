const { computed } = Vue;

export default {
    name: 'complex-filter-node',
    props: {
        node: Object,
        schema: Object
    },
    emits: ['update:node', 'remove'],
    template: `
        <div class="complex-filter-node">
            <!-- GROUP NODE -->
            <div class="filter-group" v-if="node.type === 'group'">
                <div class="group-header">
                    <custom-dropdown 
                        v-model="node.logic" 
                        :options="[{value: 'AND', label: 'AND'}, {value: 'OR', label: 'OR'}]"
                        class="logic-dropdown"
                    ></custom-dropdown>
                    
                    <button class="btn btn-sm btn-outline" @click="addRule">+ Rule</button>
                    <button class="btn btn-sm btn-outline" @click="addGroup">+ Group</button>
                    <button class="btn btn-sm btn-danger" @click="$emit('remove')" title="Remove Group">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div class="group-children">
                    <complex-filter-node 
                        v-for="(child, index) in node.children" 
                        :key="index"
                        :node="child"
                        :schema="schema"
                        @remove="removeChild(index)"
                    ></complex-filter-node>
                    <div v-if="node.children.length === 0" class="empty-group">No rules in this group.</div>
                </div>
            </div>

            <!-- RULE NODE -->
            <div class="filter-rule" v-else-if="node.type === 'rule'">
                <custom-dropdown 
                    v-model="node.field" 
                    :options="fieldOptions" 
                    placeholder="Select Field"
                    class="rule-field"
                    @change="onFieldChange"
                ></custom-dropdown>

                <!-- Dropdown for the extracted JSON paths -->
                <custom-dropdown
                    v-if="currentFieldType === 'raw_path'"
                    v-model="node.rawPath"
                    :options="currentFieldSelectOptions"
                    placeholder="Select Property"
                    class="rule-raw-path"
                ></custom-dropdown>

                <custom-dropdown 
                    v-model="node.operator" 
                    :options="operatorOptions" 
                    placeholder="Operator"
                    class="rule-operator"
                    :disabled="!node.field"
                ></custom-dropdown>

                <div class="rule-value">
                    <template v-if="currentFieldType === 'select'">
                        <custom-dropdown 
                            v-model="node.value" 
                            :options="currentFieldSelectOptions" 
                            placeholder="Select Value"
                        ></custom-dropdown>
                    </template>
                    <template v-else-if="currentFieldType === 'number'">
                        <input type="number" v-model="node.value" class="filter-input" placeholder="Value..." />
                    </template>
                    <template v-else>
                        <input type="text" v-model="node.value" class="filter-input" placeholder="Value..." :disabled="!node.operator" />
                    </template>
                </div>

                <button class="btn btn-sm btn-danger" @click="$emit('remove')" title="Remove Rule">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
    `,
    setup(props) {
        const addRule = () => {
            props.node.children.push({ type: 'rule', field: null, operator: null, value: '' });
        };

        const addGroup = () => {
            props.node.children.push({ type: 'group', logic: 'AND', children: [] });
        };

        const removeChild = (index) => {
            props.node.children.splice(index, 1);
        };

        // Schema fields use `key`, not `id` — map them to {value, label} for CustomDropdown
        const fieldOptions = computed(() => props.schema.fields.map(f => ({ value: f.key, label: f.label })));
        
        // Look up the current field definition by key
        const currentField = computed(() => props.schema.fields.find(f => f.key === props.node.field) || null);
        
        const currentFieldType = computed(() => currentField.value ? currentField.value.type : 'text');
        
        // Schema options may be bare strings — normalize them to {value, label} objects for CustomDropdown
        const currentFieldSelectOptions = computed(() => {
            const opts = currentField.value?.options || [];
            return opts.map(o => typeof o === 'string' ? { value: o, label: o } : o);
        });

        const operatorOptions = computed(() => {
            const type = currentFieldType.value;
            if (!type || !props.schema.operators || !props.schema.operators[type]) return [];
            
            // Map the schema string operators to proper dropdown options
            return props.schema.operators[type].map(op => {
                // Capitalize for display, or use the raw string
                const label = op.charAt(0).toUpperCase() + op.slice(1);
                return { value: op, label: label };
            });
        });

        const onFieldChange = () => {
            props.node.operator = null;
            props.node.value = '';
        };

        return { addRule, addGroup, removeChild, fieldOptions, currentFieldType, currentFieldSelectOptions, operatorOptions, onFieldChange }
    }
}

