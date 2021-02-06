const rollup_commonjs = require('@rollup/plugin-commonjs');
const rollup_resolve = require('@rollup/plugin-node-resolve').nodeResolve

export default {
    input: 'ExtPay.dev.js',
    output: [{
        file: 'sample-extension/ExtPay.js',
        format: 'iife',
        name: 'ExtPay'
    },
    {
        file: 'test-extension/ExtPay.js',
        format: 'iife',
        name: 'ExtPay'
    }],
    plugins: [
        rollup_resolve({
            browser: true,
        }),
        rollup_commonjs(),
    ],
}
