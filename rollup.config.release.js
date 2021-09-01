import replace from '@rollup/plugin-replace';
const rollup_commonjs = require('@rollup/plugin-commonjs');
const rollup_resolve = require('@rollup/plugin-node-resolve').nodeResolve
const rollup_terser = require('rollup-plugin-terser').terser;

const input = 'ExtPay.dev.js'
export default [
    {
        input,
        output: [{
            file: 'dist/ExtPay.js',
            format: 'iife',
            name: 'ExtPay'
        },
        {
            file: 'sample-extension-mv2/ExtPay.js',
            format: 'iife',
            name: 'ExtPay'
        },
        {
            file: 'sample-extension-mv3/ExtPay.js',
            format: 'iife',
            name: 'ExtPay'
        }],
        plugins: [
            replace({
                'http://localhost:3000': 'https://extensionpay.com'
            }),
            rollup_resolve({
                browser: true,
            }),
            rollup_commonjs(),
            // rollup_terser(),
        ]
    },

    {
        input,
        output: {
            file: 'dist/ExtPay.common.js',
            format: 'cjs',
            exports: 'default',
        },
        plugins: [
            replace({
                'http://localhost:3000': 'https://extensionpay.com'
            }),
        ],
        external: ['webextension-polyfill']
    },
    {
        input,
        output: {
            file: 'dist/ExtPay.module.js',
            format: 'es',
        },
        plugins: [
            replace({
                'http://localhost:3000': 'https://extensionpay.com'
            }),
        ],
        external: ['webextension-polyfill']
    }
]

