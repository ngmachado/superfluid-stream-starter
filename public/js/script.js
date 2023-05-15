var html5QrcodeScanner;

const sendBtn = document.getElementById('send');
const addressInput = document.getElementById('address');

const modal = document.getElementById('modal');
const closeModal = document.getElementById('modal-close');
const modalMessage = document.getElementById('modal-message');
const modalLink = document.getElementById('modal-link');

closeModal.onclick = function () {
    modal.style.display = 'none';
};

window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

function showMessage(message, isError = false, linkURL = '') {
    modalMessage.textContent = message;
    modalMessage.style.color = isError ? 'red' : 'green';
    if(!isError) {
        modalLink.href = linkURL;
        modalLink.style.display = 'inline-block';
    } else {
        modalLink.href = '';
        modalLink.style.display = 'none';
    }
    modal.style.display = 'block';
}

addressInput.addEventListener('input', () => {
    if (addressInput.value.trim()) {
        sendBtn.style.display = 'inline-block';
    } else {
        sendBtn.style.display = 'none';
    }
});

function onScanSuccess(decodedText, decodedResult) {
    decodedText = decodedText.replace('ethereum:', '');
    decodedText = decodedText.split('@')[0];
    document.getElementById('address').value = decodedText
    document.getElementById('send').style.display = 'inline-block';
}

document.getElementById('scanqr').addEventListener('click', () => {
    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } });
    html5QrcodeScanner.render(onScanSuccess);
    document.getElementById('scanqr').style.display = 'none';
});

document.getElementById('network').addEventListener('change', function (e) {
    // Add logic to handle network change
    console.log('Selected network:', e.target.value);
});

document.getElementById('send').addEventListener('click', async () => {
    // Get the address and network values
    const address = document.getElementById('address').value;
    const network = document.getElementById('network').value;
    document.getElementById('spinner').style.display = 'flex';
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/startstream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ address: address, network: network })
        });
        const data = await response.json();

        if (response.ok) {
            showMessage(`Transaction successful!`, false, `${data.message}`);
        } else {
            console.error('Error:', data.error);
            showMessage(`Error: ${data.error}`, true);
        }

    } catch (error) {
        console.error('Error:', error);
        showMessage(`Error: ${error}`, true);
    } finally {
        document.getElementById('spinner').style.display = 'none';
    }
});
