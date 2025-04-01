// Este script se ejecutará después de que se cargue la aplicación
(function() {
    // Esperar a que la aplicación se inicialice
    window.addEventListener('DOMContentLoaded', function() {
        // Interceptar todas las llamadas de axios
        if (window.axios) {
            console.log('Corrigiendo configuración de axios');
            window.axios.defaults.baseURL = '';
            
            // Buscar todas las instancias de axios creadas
            for (const key in window) {
                if (window[key] && window[key].defaults && window[key].defaults.baseURL) {
                    if (window[key].defaults.baseURL.includes('172.16.10.222:8000')) {
                        console.log('Corrigiendo URL base en:', key);
                        if (window[key].defaults.baseURL.includes('/api')) {
                            window[key].defaults.baseURL = '/api';
                        } else {
                            window[key].defaults.baseURL = '';
                        }
                    }
                }
            }
            
            // Sobrescribir el método create de axios
            const originalCreate = window.axios.create;
            window.axios.create = function(config) {
                if (config && config.baseURL && config.baseURL.includes('172.16.10.222:8000')) {
                    console.log('Corrigiendo URL en axios.create:', config.baseURL);
                    if (config.baseURL.includes('/api')) {
                        config.baseURL = '/api';
                    } else {
                        config.baseURL = '';
                    }
                }
                return originalCreate.call(this, config);
            };
        }
    });
})();
