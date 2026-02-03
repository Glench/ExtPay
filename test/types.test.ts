
async function testUserStatus() {
  const extpay = ExtPay("test-ext-1");
  const user = await extpay.getUser();

  if (user.paid) {
    console.log("Paid at:", user.paidAt);
    await extpay.openPaymentPage();
  }
}

function testBackgroundEvents() {
  const extpay = ExtPay("test-ext-2");

  extpay.onPaid.addListener((user) => {
    console.log("Payment:", user.installedAt);
  });

  extpay.onTrialStarted.addListener((user) => {
    console.log("Trial:", user.trialStartedAt);
  });

  extpay.startBackground();
}

async function testPaymentFlows() {
  const extpay = ExtPay("test-ext-3");

  await extpay.openLoginPage();
  await extpay.openTrialPage("Try now");
  const plans = await extpay.getPlans();
  console.log("Plans length:", plans.length);
}

async function testAllMethods() {
  const extpay = ExtPay("test-ext-4");

  await extpay.getUser();
  await extpay.openPaymentPage();
  extpay.startBackground();
}

// Run all tests
(async function runTests() {
  await testUserStatus();
  testBackgroundEvents();
  await testPaymentFlows();
  await testAllMethods();
})();