importScripts('ExtPay.js')
// this line is required in background.js to use ExtPay!
var extpay = ExtPay('sample-extension');
extpay.startBackground();

extpay.getUser().then(user => {
	console.log(user)
})
