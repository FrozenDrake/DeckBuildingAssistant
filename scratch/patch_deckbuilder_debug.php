<?php
$file = 'src/js/pages/DeckBuilder.js';
$content = file_get_contents($file);

$html = <<<HTML
                    <div class="deck-header">
                        <h3>Current Deck ({{ deck.length }} / {{ maxDeckSize }})</h3>
                        <button class="btn btn-sm btn-outline" @click="debugDeck">Debug Deck</button>
                        <button class="btn btn-sm btn-outline" @click="clearDeck">Clear</button>
                    </div>
HTML;
$content = preg_replace('/                    <div class="deck-header">[\s\S]*?<\/div>/', $html, $content, 1);

$js = <<<JS
        const debugDeck = () => {
            const out = deck.value.map(c => {
                // simple clone
                return JSON.stringify(c, null, 2);
            });
            console.log("DECK COMPOSITION:", deck.value);
            alert("Check browser console for full deck composition objects.");
        };

        const onDeckGenerated = (result) => {
JS;
$content = str_replace("        const onDeckGenerated = (result) => {", $js, $content);

$content = str_replace("clearDeck,", "clearDeck, debugDeck,", $content);

file_put_contents($file, $content);
