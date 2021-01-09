import replace from '@rollup/plugin-replace';

export default {
    input: 'ExtPay.dev.js',
    output: [{
        file: 'dist/ExtPay.js',
        format: 'iife',
        name: 'ExtPay'
    },
    {
        file: 'sample-extension/ExtPay.js',
        format: 'iife',
        name: 'ExtPay'
    },
    {
        file: 'dist/ExtPay.common.js',
        format: 'cjs',
        exports: 'default',
    },
    {
        file: 'dist/ExtPay.module.js',
        format: 'es'
    }],
    plugins: [
        replace({
            'http://localhost:3000': 'https://extensionpay.com'
        })
    ]
}
