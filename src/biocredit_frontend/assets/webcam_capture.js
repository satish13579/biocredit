const cameraPreview = document.getElementById('cameraPreview');
const captureBtn = document.getElementById('captureBtn');
const imageCanvas = document.getElementById('imageCanvas');
const imageCanvas2 = document.getElementById('imageCanvas2');
const captured_image=document.getElementById("captured_image");
const modalopen = document.getElementById('modalopen');
const close_bottom = document.getElementById('close-bottom');
const close_up = document.getElementById('close-up');

const camstat = 0;

let stream;

async function startCamera() {
    stream = await navigator.mediaDevices.getUserMedia({ video: {
    facingMode: "environment"
  } });
    cameraPreview.srcObject = stream;
}

async function stopCamera() {
    stream.getTracks().forEach(function(track) {
        track.stop();
      });
    cameraPreview.srcObject = null;
}



close_bottom.addEventListener('click',()=>{
    stopCamera().catch(console.error);
})
close_up.addEventListener('click',()=>{
    stopCamera().catch(console.error);
})


const retakeBtn = document.getElementById('retakeBtn');
// const saveBtn = document.getElementById('saveBtn');
let capturedImageDataURL = null;

// const viewImageBtn = document.getElementById('viewImageBtn');

modalopen.addEventListener('click',()=>{
    console.log(cameraPreview.style.display);
    if(cameraPreview.style.display=='block'){
        startCamera().catch(console.error);
    }else{
        stopCamera().catch(console.error);
    }
});

captureBtn.addEventListener('click', () => {
    const context = imageCanvas.getContext('2d');
    imageCanvas.width = cameraPreview.videoWidth;
    imageCanvas.height = cameraPreview.videoHeight;
    context.drawImage(cameraPreview, 0, 0, imageCanvas.width, imageCanvas.height);
    const context2 = imageCanvas2.getContext('2d');
    imageCanvas2.width = cameraPreview.videoWidth;
    imageCanvas2.height = cameraPreview.videoHeight;
    context2.drawImage(cameraPreview, 0, 0, imageCanvas2.width, imageCanvas2.height);
    cameraPreview.style.display = 'none';
    imageCanvas.style.display = 'block';
    imageCanvas2.style.display = 'block';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'block';  // Show the "Retake" button
    // saveBtn.style.display = 'block';    // Show the "Save" button
    capturedImageDataURL = imageCanvas.toDataURL('image/jpeg'); 
    captured_image.value=capturedImageDataURL;
    stopCamera().catch(console.error);
    modalopen.textContent='Retake';
});

retakeBtn.addEventListener('click', () => {
    startCamera().catch(console.error);
    modalopen.textContent='Capture Image'
    captured_image.value = '';
    cameraPreview.style.display = 'block';
    imageCanvas.style.display = 'none';
    imageCanvas2.style.display = 'none';
    captureBtn.style.display = 'block';
    retakeBtn.style.display = 'none';  // Hide the "Retake" button
});


// saveBtn.addEventListener('click', () => {
//     if (capturedImageDataURL) {
//         // Send the capturedImageDataURL to the server to save in the database
//         fetch('/save', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ image_data: capturedImageDataURL })
//         })
//         .then(response => response.json())
//         .then(data => {
//             if (data.status === 'success') {
//                 console.log('Image saved:', data.image_id);
//             } else {
//                 console.error('Error saving image');
//             }
//         });
//         retakeBtn.style.display = 'none';  // Hide the "Retake" button
//         saveBtn.style.display = 'none';    // Hide the "Save" button
//         viewImageBtn.style.display = 'block';  // Show the "View Image" button
//         imageCanvas.style.display = 'none'; // Hide the canvas
//     }
// });
// startCamera().catch(console.error);
