import ComplexFilterNode from './ComplexFilterNode.js';
import { store } from '../store.js';
const { ref, watch, inject } = Vue;

export default {
    components: {
        'complex-filter-node': ComplexFilterNode
    },
    props: {
        schema: {
            type: Object,
            required: true
        }
    },
    emits: ['query-updated'],
    template: `
        <div class="complex-filter">
            <div style="display: flex; gap: 10px; margin-bottom: 15px; align-items: center; background: rgba(0,0,0,0.1); padding: 10px; border-radius: 6px;">
                <span style="font-size: 1.2em;">✨</span>
                <input 
                    type="text" 
                    v-model="aiPrompt" 
                    placeholder="Auto-generate filter rules (e.g. 'Speed cards with corner skills')" 
                    class="filter-input" 
                    style="flex: 1; border: 1px solid var(--primary-color);"
                    @keyup.enter="generateFilter"
                    :disabled="isGenerating"
                />
                <button class="btn btn-primary btn-sm" @click="generateFilter" :disabled="isGenerating || !aiPrompt.trim()">
                    {{ isGenerating ? 'Generating...' : 'Generate' }}
                </button>
            </div>
            <complex-filter-node 
                :node="rootNode" 
                :schema="schema" 
                @remove="resetRoot"
            ></complex-filter-node>
        </div>
    `,
    setup(props, { emit }) {
        // Assume game_id is passed down or grabbed from store
        const gameId = store.selectedGameId;
        
        const rootNode = ref({
            type: 'group',
            logic: 'AND',
            children: []
        });
        
        const aiPrompt = ref('');
        const isGenerating = ref(false);

        const resetRoot = () => {
            rootNode.value = {
                type: 'group',
                logic: 'AND',
                children: []
            };
        };

        const generateFilter = async () => {
            if (!aiPrompt.value.trim() || !gameId) return;
            isGenerating.value = true;
            try {
                const response = await fetch('api/llm_generate_filter.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: gameId,
                        prompt: aiPrompt.value.trim()
                    })
                });
                
                const resData = await response.json();
                if (!response.ok || !resData.success) {
                    throw new Error(resData.error || 'Failed to generate filter.');
                }
                
                // Directly overwrite the root node with the AI generated tree!
                rootNode.value = resData.filter;
                aiPrompt.value = '';
                store.addToast('Filter rules generated successfully!', 'success');
            } catch (err) {
                console.error(err);
                store.addToast(err.message, 'error');
            } finally {
                isGenerating.value = false;
            }
        };

        watch(rootNode, (newVal) => {
            emit('query-updated', newVal);
        }, { deep: true });

        return {
            rootNode,
            resetRoot,
            aiPrompt,
            isGenerating,
            generateFilter
        }
    }
}

