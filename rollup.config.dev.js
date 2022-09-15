const rollup_commonjs = require('@rollup/plugin-commonjs');
const rollup_resolve = require('@rollup/plugin-node-resolve').nodeResolve

export default {
    input: 'ExtPay.dev.js',
    output: [{
        file: 'sample-extension-mv2/ExtPay.js',
        format: 'iife',
        name: 'ExtPay'
    },
    {
        file: 'sample-extension-mv3/ExtPay.js',
        format: 'iife',
        name: 'ExtPay'
    },
    {
        file: 'dev-extension-mv3/ExtPay.js',
        format: 'iife',
        name: 'ExtPay'
    },
    {
        file: 'dev-extension-mv2/ExtPay.js',
        format: 'iife',
        name: 'ExtPay'
    },
    {
        file: 'Safari/ExtensionPay Dev extension/Shared (Extension)/Resources/ExtPay.js',
        format: 'iife',
        name: 'ExtPay'
    },
    ],
    plugins: [
        rollup_resolve({
            browser: true,
        }),
        rollup_commonjs(),
    ],
}
