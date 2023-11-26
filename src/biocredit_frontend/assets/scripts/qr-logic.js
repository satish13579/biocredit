let html5QrcodeScanner;
      function onScanSuccess(decodedText, decodedResult) {
        console.log(`Scan result: ${decodedText}`, decodedResult);

        if (isValidURL(decodedText)) {
          window.open(decodedText, "_blank");
        } else {
          console.log("Not a valid URL:", decodedText);
        }

        $("#qrmodal").modal("hide");

        html5QrcodeScanner.clear();
      }

      function isValidURL(url) {
        // Regular expression to match most types of URLs, including localhost
        const pattern =
          /^(https?|ftp|file):\/\/(localhost|127\.0\.0\.1|[a-z0-9-]+(\.[a-z0-9-]+)*)(:\d{1,5})?(\/\S*)?$/i;
        return pattern.test(url);
      }

      $("#qropen").on("click", function (e) {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", {
          fps: 10,
          qrbox: 250,
        });

        html5QrcodeScanner.render(onScanSuccess);
      });

      $("#qropen2").on("click", function (e) {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", {
          fps: 10,
          qrbox: 250,
        });

        html5QrcodeScanner.render(onScanSuccess);
      });

      let modal=document.getElementById('qrmodal');
      modal.addEventListener('hide.bs.modal', event =>{
        if (html5QrcodeScanner) {
          html5QrcodeScanner.clear();
        }
      });