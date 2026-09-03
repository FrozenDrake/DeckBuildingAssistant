const { ref, onMounted } = Vue;

const presets = {
    light: { bg: '#f4f4f9', surface: '#ffffff', primary: '#3b82f6', text: '#333333', isDark: false },
    dark: { bg: '#121212', surface: '#1e1e1e', primary: '#bb86fc', text: '#e0e0e0', isDark: true },
    pink: { bg: '#fdf2f8', surface: '#fbcfe8', primary: '#db2777', text: '#831843', isDark: false },
    red: { bg: '#fef2f2', surface: '#fecaca', primary: '#dc2626', text: '#7f1d1d', isDark: false }
};

export default {
    template: `
        <div class="theme-selector">
            <button class="btn" @click.stop="isThemeDropdownOpen = !isThemeDropdownOpen">Theme</button>
            <div class="theme-dropdown" v-if="isThemeDropdownOpen" @click.stop>
                <label><strong>Preset:</strong></label>
                
                <custom-dropdown 
                    v-model="selectedTheme" 
                    :options="themeOptions" 
                    @change="applyTheme">
                </custom-dropdown>

                <div v-if="selectedTheme === 'custom'" class="color-pickers">
                    <label style="margin-bottom: 5px;">
                        <input type="checkbox" v-model="customTheme.isDark" @change="handleDarkModeToggle"> 
                        <strong>Is Dark Mode</strong>
                    </label>
                    <div class="picker-row"><span>Background:</span> <input type="color" v-model="customTheme.bg" @input="applyTheme"></div>
                    <div class="picker-row"><span>Surface:</span> <input type="color" v-model="customTheme.surface" @input="applyTheme"></div>
                    <div class="picker-row"><span>Primary:</span> <input type="color" v-model="customTheme.primary" @input="applyTheme"></div>
                    <div class="picker-row"><span>Text:</span> <input type="color" v-model="customTheme.text" @input="applyTheme"></div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const isThemeDropdownOpen = ref(false);
        const selectedTheme = ref('light');
        
        const themeOptions = [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'pink', label: 'Pink' },
            { value: 'red', label: 'Red' },
            { value: 'custom', label: 'Custom' }
        ];

        const customTheme = ref({ 
            bg: '#2d3748', 
            surface: '#4a5568', 
            primary: '#48bb78', 
            text: '#f7fafc', 
            isDark: true 
        });

        const handleDarkModeToggle = () => {
            customTheme.value.text = customTheme.value.isDark ? '#ffffff' : '#1a202c';
            applyTheme();
        };

        const applyTheme = () => {
            const root = document.documentElement;
            let theme = selectedTheme.value === 'custom' ? customTheme.value : presets[selectedTheme.value];
            
            root.style.setProperty('--bg-color', theme.bg);
            root.style.setProperty('--surface-color', theme.surface);
            root.style.setProperty('--primary-color', theme.primary);
            root.style.setProperty('--text-color', theme.text);
        };

        // Close the entire theme dropdown when clicking outside
        const closeThemeDropdown = () => {
            isThemeDropdownOpen.value = false;
        };

        onMounted(() => {
            applyTheme();
            document.addEventListener('click', closeThemeDropdown);
        });
        
        const onUnmounted = Vue.onUnmounted;
        onUnmounted(() => {
            document.removeEventListener('click', closeThemeDropdown);
        });

        return {
            isThemeDropdownOpen,
            selectedTheme,
            themeOptions,
            customTheme,
            handleDarkModeToggle,
            applyTheme
        }
    }
}

