<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deck Building Assistant</title>
    <!-- Vue 3 CDN -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <style>
        body { font-family: sans-serif; padding: 2rem; background: #f4f4f9; color: #333; }
        .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div id="app" class="card">
        <h1>{{ message }}</h1>
        
        <p><strong>PHP Status:</strong> <?php echo "<span style='color:green;'>Apache & PHP are working!</span>"; ?></p>
        
        <p><strong>MongoDB Status:</strong> <?php 
            try {
                $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
                $command = new MongoDB\Driver\Command(['ping' => 1]);
                $m->executeCommand('admin', $command);
                echo "<span style='color:green;'>Connected successfully!</span>";
            } catch (Exception $e) {
                echo "<span style='color:red;'>Not Connected (" . $e->getMessage() . ")</span>";
            }
        ?></p>
    </div>

    <script>
        const { createApp, ref } = Vue;

        createApp({
            setup() {
                const message = ref('Welcome to the Deck Building Assistant (Vue.js is active!)')
                return {
                    message
                }
            }
        }).mount('#app')
    </script>
</body>
</html>

