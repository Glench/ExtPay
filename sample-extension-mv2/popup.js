const extpay = ExtPay('sample-extension') 

document.querySelector('button').addEventListener('click', extpay.openPaymentPage)

extpay.getUser().then(user => {
    if (user.paid) {
        document.querySelector('p').innerHTML = 'User has paid! 🎉'
        document.querySelector('button').remove()
    }
}).catch(err => {
    document.querySelector('p').innerHTML = "Error fetching data :( Check that your ExtensionPay id is correct and you're connected to the internet"
})
    
// extpay.onPaid(function() { console.log('popup paid')});
