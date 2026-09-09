const fs = require('fs');

const raw = fs.readFileSync('public/data/cards.json', 'utf8');
const cards = JSON.parse(raw);

cards.forEach(card => {
    // We already patched characters in DB, let's also patch it in JSON so they are in sync
    if (card.name && card.name.includes(']')) {
        const parts = card.name.split(']');
        const charName = parts[1].trim();
        if (charName) {
            card.characters = [charName];
        }
    }

    if (card.skills) {
        card.skills.forEach(skill => {
            if (skill.trigger_conditions && Array.isArray(skill.trigger_conditions)) {
                const newConds = {};
                skill.trigger_conditions.forEach(tc => {
                    if (tc.variable) {
                        if (!newConds[tc.variable]) {
                            newConds[tc.variable] = [];
                        }
                        if (!newConds[tc.variable].includes(tc.value)) {
                            newConds[tc.variable].push(tc.value);
                        }
                    }
                });
                
                // Simplify array of 1 to just the value for cleaner UI? 
                // Wait, MongoDB handles arrays transparently for equality checks.
                // e.g. `{ "running_style": [2, 3] }` matches `running_style == 2`.
                // Actually, if we leave it as an array, the UI's dropdown for values might show "[2,3]" instead of "2".
                // Our UI extracts primitive values. If it's an array, it recurses.
                // Wait! If it recurses, the path will just be `skills.trigger_conditions.running_style`.
                // BUT it will extract `2` and `3` as separate options! This is perfect!
                
                // Let's replace it
                skill.trigger_conditions = newConds;
            }
        });
    }
});

fs.writeFileSync('public/data/cards.json', JSON.stringify(cards, null, 2));
console.log('Rewrote cards.json');
