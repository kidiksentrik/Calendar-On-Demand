const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.browser,
                ...globals.es2021
            }
        },
        rules: {
            // Prevent undefined variables - this directly prevents ReferenceError bugs like missing offsets
            'no-undef': 'error',
            // Warn on unused variables, but allow leading underscore
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
            // Allow empty catch blocks if intentional
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-constant-condition': 'warn',
            // Prevent accidental reassignment of const or misuse of variables
            'no-redeclare': 'error',
            'no-unreachable': 'error',
            'use-isnan': 'error',
            'valid-typeof': 'error'
        }
    },
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            'landing/**',
            'docs/**',
            '.agents/**'
        ]
    }
];
