// this line is required in background.js to use ExtPay!
var extpay = ExtPay('sample-extension');

extpay.getUser().then(user => {
	console.log(user)
})
