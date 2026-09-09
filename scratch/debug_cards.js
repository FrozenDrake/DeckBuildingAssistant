// Run this in Chrome DevTools Console:
(function() {
    // Grab all rendered card titles from the DOM
    const cardNames = Array.from(document.querySelectorAll('.db-card-name')).map(el => el.textContent.trim());
    
    const count = {};
    const duplicates = [];
    
    cardNames.forEach(name => {
        count[name] = (count[name] || 0) + 1;
        if (count[name] === 2) {
            duplicates.push(name);
        }
    });
    
    console.log(`Total cards rendered on page: ${cardNames.length}`);
    if (duplicates.length > 0) {
        console.warn('Duplicates found!', duplicates.map(name => ({ name, count: count[name] })));
    } else {
        console.log('No duplicates found in the DOM.');
    }
})();
