const { ref, computed, onMounted, onUnmounted } = Vue;

export default {
    props: {
        modelValue: {
            type: [String, Number, Object],
            default: null
        },
        options: {
            type: Array,
            required: true
        },
        placeholder: {
            type: String,
            default: 'Select an option...'
        },
        searchThreshold: {
            type: Number,
            default: 10
        }
    },
    emits: ['update:modelValue', 'change'],
    template: `
        <div class="custom-dropdown" @click.stop="toggleDropdown">
            <div class="dropdown-selected" :class="{ 'open': isOpen }">
                <span>{{ selectedLabel }}</span>
                <span class="dropdown-arrow" :class="{ 'open': isOpen }">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
            </div>
            <div class="dropdown-menu" v-if="isOpen" @click.stop>
                <div class="dropdown-search" v-if="options.length > searchThreshold">
                    <input 
                        type="text" 
                        v-model="searchQuery" 
                        placeholder="Search..." 
                    />
                </div>
                <div class="dropdown-options-container">
                    <div 
                        class="dropdown-option" 
                        v-for="option in filteredOptions" 
                        :key="option.value" 
                        :class="{ 'active': option.value === modelValue }"
                        @click.stop="selectOption(option)"
                    >
                        {{ option.label }}
                    </div>
                    <div class="dropdown-empty" v-if="filteredOptions.length === 0">
                        No results found.
                    </div>
                </div>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const isOpen = ref(false);
        const searchQuery = ref('');

        const toggleDropdown = () => {
            isOpen.value = !isOpen.value;
            if (isOpen.value) {
                searchQuery.value = ''; // Reset search on open
            }
        };

        const selectOption = (option) => {
            emit('update:modelValue', option.value);
            emit('change', option.value);
            isOpen.value = false;
        };

        const closeDropdown = () => {
            isOpen.value = false;
        };

        const selectedLabel = computed(() => {
            const selected = props.options.find(opt => opt.value === props.modelValue);
            return selected ? selected.label : props.placeholder;
        });

        const filteredOptions = computed(() => {
            if (!searchQuery.value) return props.options;
            const query = searchQuery.value.toLowerCase();
            return props.options.filter(opt => opt.label.toLowerCase().includes(query));
        });

        onMounted(() => {
            document.addEventListener('click', closeDropdown);
        });

        onUnmounted(() => {
            document.removeEventListener('click', closeDropdown);
        });

        return {
            isOpen,
            searchQuery,
            toggleDropdown,
            selectOption,
            selectedLabel,
            filteredOptions
        }
    }
}

