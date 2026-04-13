import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Clawppy Terminal Bot active. Type your messages (or /map, /review, /upgrade, /reset).");
console.log("Type 'exit' to quit.\n");

async function ask() {
  rl.question('You: ', async (body) => {
    if (body.toLowerCase() === 'exit') {
      process.exit(0);
    }

    // Mock request to the Worker endpoint
    const response = await fetch('http://localhost:8787', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: 'whatsapp:+1234567890', Body: body })
    });

    // Since our worker sends via Twilio, and we mocked Twilio to console.log,
    // we need a way to capture that output or just rely on the terminal logs.
    // For a cleaner CLI bot, we'd need to modify the worker to return the message.
    
    console.log('Clawppy: Processing...');
    ask();
  });
}

ask();
