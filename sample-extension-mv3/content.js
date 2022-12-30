/*
 * This is an example of how you would add ExtPay to a content script.
 * ExtPay is made available in this script through the manifest.json
 * "content_scripts" -> "js" array.
 */
var extpay = ExtPay('sample-extension'); 

// Add a "subscribe to Sample Extension!" button on every webpage.
var button = document.createElement('button');
button.innerText = 'Pay for ExtensionPay Sample Extension!'
button.addEventListener('click', function(evt) {
	extpay.openPaymentPage();
}, true)

document.body.prepend(button);
