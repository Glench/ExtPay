// Replace 'sample-extension' with the id of the extension you
// registered on ExtensionPay.com to test payments. You may need to
// uninstall and reinstall the extension to make it work.
// Don't forget to change the ID in background.js too!
const extpay = ExtPay('sample-extension')

// Store a referral code before checkout. The first code is kept.
// Attribution on extensionpay.com starts once the server reads `ref`.
// extpay.setReferral('youtuber123')
// extpay.getReferral().then(referral => console.log(referral))

document.querySelector('button').addEventListener('click', function(evt) {
    evt.preventDefault();
    extpay.openPaymentPage();
})

extpay.getUser().then(user => {
    if (user.paid) {
        document.querySelector('p').innerHTML = 'User has paid! 🎉'
        document.querySelector('button').remove()
    }
}).catch(err => {
    document.querySelector('p').innerHTML = "Error fetching data :( Check that your ExtensionPay id is correct and you're connected to the internet"
})
    
// extpay.onPaid(function() { console.log('popup paid')});
