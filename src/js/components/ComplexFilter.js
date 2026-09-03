import ComplexFilterNode from './ComplexFilterNode.js';
const { ref, watch } = Vue;

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
            <complex-filter-node 
                :node="rootNode" 
                :schema="schema" 
                @remove="resetRoot"
            ></complex-filter-node>
        </div>
    `,
    setup(props, { emit }) {
        const rootNode = ref({
            type: 'group',
            logic: 'AND',
            children: []
        });

        const resetRoot = () => {
            rootNode.value = {
                type: 'group',
                logic: 'AND',
                children: []
            };
        };

        watch(rootNode, (newVal) => {
            emit('query-updated', newVal);
        }, { deep: true });

        return {
            rootNode,
            resetRoot
        }
    }
}

