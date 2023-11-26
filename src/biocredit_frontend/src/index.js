import { biocredit_backend } from "../../declarations/biocredit_backend";
import { AuthClient } from "@dfinity/auth-client";
import { canisterId, createActor } from "../../declarations/biocredit_backend";
import { html, render } from "lit-html";


let biocredit_actor;
let authClient;
let latitude;
let longitude;
let accuracy;
let watch;

const ic_interface = document.getElementsByClassName('ic_interface');

function setConnected() {
  for (var i = 0; i < ic_interface.length; i++) {
    var interfac = ic_interface[i];
    interfac.setAttribute('status', 'connected');
    interfac.textContent = "Disconnect";
  }
}

function setDisonnected() {
  for (var i = 0; i < ic_interface.length; i++) {
    var interfac = ic_interface[i];
    interfac.setAttribute('status', 'disconnected');
    interfac.textContent = "Connect";
  }
}


async function ic_interface_click(e) {
  console.log(e);
  if (e.target.getAttribute('status') === 'connected') {
    biocredit_actor = biocredit_backend;
    authClient.logout();
    redirect("/");
  } else {
    authClient.login({
      maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
      identityProvider: process.env.DFX_NETWORK === "ic"
      ? "https://identity.ic0.app/#authorize"
      : `http://localhost:4943?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID}`,
      onSuccess: async () => {
        handleAuthenticated(authClient);
      },
    });
  }
};

async function handleAuthenticated(authClient) {
  setConnected();
  const identity = await authClient.getIdentity();
  biocredit_actor = createActor(canisterId, {
    agentOptions: {
      identity,
    },
  });
  isAccountExists();
  var path = window.location.pathname;
  if (path === '/') {
    var resp = await biocredit_actor.isAccountExists();
    console.log(resp);
    if (resp.statusCode === BigInt(200)) {
      if (resp.msg === "exist") {
        if (JSON.stringify(resp.role[0]) == JSON.stringify({ NormalUser: null })) {
          redirect('/dashboard.html', { "msg": "Logged in as Normal User" });
        } else {
          redirect('/super_dashboard.html');
        }
      } else if (resp.msg === "doesntexist") {
        redirect("/register.html");
      }
    }
  }
}

async function isAccountExists() {
  if (await authClient.isAuthenticated()) {
    var resp = await biocredit_actor.isAccountExists();
    console.log(resp);
    console.log(resp.statusCode === BigInt(200))
  }
}

function redirect(path, params) {
  console.log(window.location.origin);
  console.log(path)
  const myUrlWithParams = new URL(window.location.origin + path);
  myUrlWithParams.searchParams.append('canisterId', process.env.CANISTER_ID_BIOCREDIT_FRONTEND);
  if (params) {
    for (let key in params) {
      myUrlWithParams.searchParams.append(key, encodeURIComponent(params[key]));
    }
  }

  window.location.href = myUrlWithParams.href;
}


async function getLocationAsync() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (position.coords.accuracy <= 200) {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            accuracy = position.coords.accuracy;
            resolve();
          } else {
            reject(
              "Your Location Accuracy is " + position.coords.accuracy + " meters\n Please Make your Location accurate less than 200 meters.!!"
            );
          }
        },
        (error) => {
          let reason;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reason = "Please Allow the Location Permission to Continue.!!";
              break;
            case error.POSITION_UNAVAILABLE:
              reason = "Location information is unavailable to Continue.!!";
              break;
            case error.TIMEOUT:
              reason = "The request to get user location timed out,\nPlease Try Again.!!";
              break;
            case error.UNKNOWN_ERROR:
              reason = "An unknown error occurred.";
              break;
          }
          reject(reason); // Reject the promise on error
        },
        { maximumAge: 0, timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      reject("Geolocation is not supported by the browser to Continue.!!");
    }
  });
}

function createtoast(msg) {
  var count = parseInt($("#contoast").attr("data-count"));
  var toast = `<div id="liveToast` + count + `" data-bs-autohide='false' data-bs-animation='true' data-bs-delay='2000' class="toast" role="alert" aria-live="assertive" aria-atomic="true"><div style="background-color: #FFFFFF;color:#000000;" class="toast-header">  <img src="data:image/png;base64,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
  " style="height:20px;width:auto;" class="rounded me-2" alt="...">  <strong class="me-auto" style="color:black;">>></strong>  <small style="color:black;margin-right:8px;">Just Now</small>  <button style="margin:0px!important;" type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button></div><div id='bo` + count + `' style="background-color: BLACK;COLOR: #01FE43;BORDER: 1PX SOLID;" class="toast-body">              </div>        </div>`;
  // var mtoast =`<div id="mliveToast` +count +`" data-bs-autohide='false' data-bs-animation='true' data-bs-delay='2000' class="toast" role="alert" aria-live="assertive" aria-atomic="true">          <div style="background-color: #000000;color:#ffffff;" class="toast-header">            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAAEgBckRAAAABGdBTUEAALGPC/xhBQAAB/ZJREFUaAXNWQmoTk8UP+/Z9y2Rfd+K7HtCkjWyRSRkLyI7ZSskhGSPCBGRkKwhZCcksiTZQnZClv//+w3nvDNz597vvue9cur75mxzzszcO2fOnJtSpUqV/8gDqZp34sQJunfvnmFZgjJlyhgmhCIAUbVqVSNAKwJwatWqRd27d/9tDs4BbpsSa1Q8IpgVH+ychSKAlgYjcLWhkB1/L1++pL1798o8wAsdFYTsjycOXqhvKP/48QM61K5dO9PiL9AhNTXVWF61ahXVrFnTKK5evVo6EBaKf4sWLTKrmVhiWVHDSPxt377d8KTD169fjYw7syLohw8fisxM2p2cS2M84D1//jx6ldIGnoYFJs2iuXPnGqsVKlRglmlDnwMPC1pJn8Pdu3ctq5rwDiklJYXu3LlD/fr1M7ram3lntAUWdu3aVdjfv38X3PLAY+3Zs6dlOUeOHP4OBw8eNIIbN25Q9uwB50YmHnbu3GkY7OX27duGrlatmmn5TzrUq1ePeTRmzBiD4+VLvBMG37Jly2853hUG33vkysUDdhbg1q1bpuWhgTh+/Ljh4S/0SYtGCKJXTi+7q+5fOlfLofnZMvvYsWM0atQoJq1WpmxxQ4gSJUpIHNEqOkRoPvDYDnr06EFnzpyR/g0aNKCrV68KjVnxb86cOcKP9QwQk/Qo9QN1l2vIkCF0+vRpcZD0GVy6dIkKFy4sHbTxvn37Ch9IIqxZxsGLdKBH9/nzZ6pbty76GNiwYQO1atWKSdPmzp2bChUqRO/fvxd+6DPQxs+ePWsZx9pr44sXLxaDly9fFhxIwEGePHmsN2X27Nk0aNAg6QTHBQoUMPTHjx9NNFy7dq3IgdSuXVtoy0Hjxo0JkYWhbdu2tG3bNiYtx6dOnaL69euLTO+DPXv2CF8czJgxwzKGh/n48WOjmD9/fsv49OnTaejQoWIECDabBg6wsV5T3TG9eJY7iHxNw0abLVs2QpIA+PXrF/38+TNMNXofhPXCiadBbz7NBy4P2RWE0Vu3bg0TefnpcpAzZ05q0qRJwJB+XV1huhwgLvlgypQpPrbhxXaAOJQ3b14xpMND1Axiv6Y6Nr19+5aw6zVPPCcQ/dBjzWDixIm6PzVt2tSiNTFv3jxNxnuLRowYIZ0OHTpk3n0wcFNxYdOmTRYr6Qw4veJenASB3rVrF7NN2759e4sGEekAh4dezwkTJlgGkOprePr0qSYNHungwoUL0gEp2759+4RGRHVBz45loQ5wyCPmMLRo0YJR0w4ePNiiQQwfPjzAC3WgbzePHj2iV69eSecjR44IrhEOgBZPE4wvXLiQUdPqlKVo0aJUsWJFkY8fP15wIGXLlrVo7wyQZDFImvyHce7cORaZ1/XAgQOEjccwadIkRk0bcKCTJmjgfsTQqVMnOQfAa9asmREl7oSsQh07dhQciOWgdOnSVLJkSVEYOHCg4ECWL18udOJ+SG/evDG0ux9EKYFYDk6ePCmyb9++kV6OpUuXigyIb1OxQsuWLRlNc8B3MpYgmDHg3talSxcmaePGjYIzcu3aNUZp8uTJgks01ZHx+vXr1KtXL1E6f/48FStWTGi9u5mJbHvHjh1MSgQwS+SOSBsvX768ZdxNeNnilStXGLVamYHFzUQiyx1k4li9pjKUd3ktJWEWKVLEpK8FCxYMaCLKt27dOsCPw7C2WZwOGdGpXr262bK+wcMe4kf//v0zYjptG2eod4xOHTp0IIRbfXL5uuEsTqbj65elT2D06NG0YsUKn98AD3c+6KcXsmwTI23t1q2bdzy4r/iOblRGGzVqRJ8+ffL28zGzZAK7d++mOnXq+PwRkkqcibgE+EpwN2/eJBwULuCChkVBoUJDpk4AFwdclIsXL659CD5z5kxKVIQNPXbsWKnyiUII8uHDB1Pm0WkLq2baBMqVK0fIwHPlysW2rXbAgAGkc1ysPgom+fLls/Rc4sGDB9S5c+fQK3KmbOLmzZubCqZv8Mh62rRpYw0eg8T7vmzZMne8Fo3sCVEs6n7/1xPAym7evNlyzMSLFy/Mpnzy5AmzpEWGpTNfEfxBsEeGDRvmsgP0X01g1qxZhJ8PkN4hb/zy5UtAjJCJDI4/rwQUEgxEo6grLPfJ8ASw6lh9HyAK9enTxyeiSpUq0cWLFwmXl2Sg89ow3XRPAEUWVOzx3vsA94+pU6f6RCbfOXz4sDd8+jqgYIk9EAXpmgDCI1YPEccHI0eOpHXr1vlEhCr2+vXrvTJ8BtM3Cq3k3vK0DHjsCWA1UFP2hT1ECdz29LcU7Qgll2nTpmmW4LhIoC6tvwGIMIFgscIuIdCLNQGkBCgPI3K48O7dO1O3u3//visyNA6usP2Ab108OHxccis5bBCJns835EkngMqALsexUbT4qoiio/48wHKcCaiXN2zYkFlWu2DBAkJ5XINbsWAZvof46iqQR04AmWRYhnj06FFzQiIxcwG1AZyypUqVckWGRp3evcdC8OzZMwor86LyhO8pLngngExx//79oRFgzZo1oRPD7RvVE58zfB5EvQFPJgyWLFniPXnxRMeNGxfoFpgADhkUPGrUqBFQBgNRAU580Lt3b6t0oHVev35tCreoyEQBUmm3sMj6iGTu+WFNoHLlyqGHDAqMKFfwF102yi1q4fPnz2fSarFBUaeKm+evXLnSq4uN7IZVKxvVX4OtESQIJF+YxL8GVlUi6hP2vzZwHs//sNhDYAVYeYcAAAAASUVORK5CYII=
  // " style="height:20px;width:auto;" class="rounded me-2" alt="...">            <strong class="me-auto">>></strong>            <small>Just Now</small>            <button style="color:while!important;" type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>          </div>          <div id='mbo` +count +`' class="toast-body">              </div>        </div>`;
  $("#contoast").html($("#contoast").html() + toast);
  // $("#mcontoast").html($("#mcontoast").html() + mtoast);
  var bo = document.getElementById("bo" + count);
  bo.innerHTML = msg;
  // mbo = document.getElementById("mbo" + count);
  // mbo.innerHTML = msg;
  $("#liveToast" + count).addClass("fade show");
  // $("#mliveToast" + count).addClass("fade show");
  count++;
  $("#contoast").attr("data-count", count);
  count--;
  setTimeout(function (e) {
    $("#liveToast" + count).toast("hide");
  }, 8000);
  // setTimeout(function (e) {
  //   $("#mliveToast" + count).toast("hide");
  // }, 8000);
}

async function checkLocationPermission() {
  try {
    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });

    if (permissionStatus.state === 'granted') {
      console.log('Location permission granted');
    } else if (permissionStatus.state === 'prompt') {
      createtoast('Allow above Location permission prompt to Continue.!!');
    } else if (permissionStatus.state === 'denied') {
      createtoast('Allow Location Permission to Continue.!!');
    }
  } catch (error) {
    console.error('Error checking location permission:', error);
  }
}


function watchLocation() {
  watch = navigator.geolocation.watchPosition(HandlePosition, HandleError, { maximumAge: 0, timeout: 5000, enableHighAccuracy: true });
}

function closeWatchLocation() {
  navigator.geolocation.clearWatch(watch);
}

function HandlePosition(position) {
  console.log(position.coords);
  if (position.coords.accuracy <= 200) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    accuracy = position.coords.accuracy;
    $('#status').val('success');
    closeWatchLocation();
    createtoast("Location Captured Successfully.!!");
  }
  else {
    $('#status').val('Finding Accurate Location, Please Wait.!!');
  }
}

function HandleError(error) {
  let reason = '';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      reason = "Please Allow the Location Permission to Continue.!!";
      createtoast(reason)
      break;
    case error.POSITION_UNAVAILABLE:
      reason = "Location information is unavailable to Continue.!!";
      break;
    case error.TIMEOUT:
      reason = "The request to get user location timed out,\nPlease Try Again.!!";
      break;
    case error.UNKNOWN_ERROR:
      reason = "An unknown error occurred.";
      break;
  }
  $('#status').val(reason);
}

function persistCannisterId(cannisterIdd) {
  var anchors = document.querySelectorAll('a');
  anchors.forEach(anchor => {
    var href = anchor?.getAttribute("href");
    if (href !== null && href != "") {
      anchor?.setAttribute("href", href + "?canisterId=" + cannisterIdd);
    }
  });
}

function DateFromTimestamp(timestam) {
  const timestamp = timestam; // Replace this with your bigint timestamp

  // Convert bigint timestamp to milliseconds
  const milliseconds = Number(timestamp);
  var myDate = new Date(milliseconds / 1000000);
  // document.write(myDate.toGMTString()+"<br>"+myDate.toLocaleString());

  return myDate.toLocaleString();

}

function initMap(latitude, longitude, name) {

  // The location coordinates
  const coordinates = {
    lat: latitude,
    lng: longitude
  };

  // Create the map, centered at location coordinates
  const map = new google.maps.Map(
    document.getElementById("mapdiv"), {

    // Set the zoom of the map
    zoom: 15,
    center: coordinates,
  });

  const marker = new google.maps.Marker({
    position: coordinates,
    map,
    title: name + "'s Meter Location",
  });

  let infowindow = new google.maps.InfoWindow({
    content: `<b>${name}'s Meter Location</b>`
  });

  google.maps.event.addListener(marker, "click", function () {
    console.log(infowindow);
    //infowindow.open(map,marker);
    if (infowindow.anchor === undefined) {
      infowindow.open(map, marker);

    } else {
      infowindow.close();
      infowindow = new google.maps.InfoWindow({
        content: `<b>${name}'s Meter Location</b>`
      });
    }
    console.log(infowindow);

  });
}


const convertDataURIToBinary = dataURI =>
  Uint8Array.from(window.atob(dataURI.replace(/^data[^,]+,/, '')), v => v.charCodeAt(0));


async function bufferToBase64(buffer) {
  // use a FileReader to generate a base64 data URI:
  const base64url = await new Promise(r => {
    const reader = new FileReader()
    reader.onload = () => r(reader.result)
    reader.readAsDataURL(new Blob([buffer]))
  });
  // remove the `data:...;base64,` part from the start
  return base64url.slice(base64url.indexOf(',') + 1);
}

async function registerinit() {
  var submitbtn = document.getElementById("submit-btn");

  var check = document.getElementById("check");
  check.addEventListener("change", function (event) {
    if (event.target.checked === true) {
      $("#submit-btn").prop("disabled", false);
    } else {
      $("#submit-btn").prop("disabled", true);
    }
  });
  watchLocation();
  checkLocationPermission();

  submitbtn.addEventListener("click", async function (event) {
    var form = document.getElementById("reg_form");
    if (!form.checkValidity()) {
      var resetsbtn = document.getElementById("org-submit");
      resetsbtn.click();
    } else {
      if (!latitude || !longitude || !accuracy) {
        createtoast($("#status").val());
        return;
      } else {
        if (await authClient.isAuthenticated()) {
          let role;
          if ($("#role").val() == "NormalUser") {
            role = { NormalUser: null };
          } else {
            role = { SuperUser: null };
          }
          var resp = await biocredit_actor.createAccount($("#name").val(), role, $("#address").val(), latitude, longitude, accuracy)
          if (resp.statusCode == BigInt(200)) {
            if (JSON.stringify(resp.role[0]) == JSON.stringify({ NormalUser: null })) {
              redirect("/dashboard.html");
            } else {
              redirect("/super_dashboard.html");
            }
          } else if (resp.statusCode == BigInt(400)) {
            createtoast("You already have a Account with this identity.");
          } else {
            redirect("/");
          }
          console.log(resp);
          console.log(resp.statusCode === BigInt(200))
        } else {
          redirect('/');
        }
      }
    }
  });
}

async function dashboardinit() {

  var re = await biocredit_actor.get()
  console.log(re)
  if (re.statusCode == BigInt(200) && re.principal.length > 0) {
    $("#dash_name").html(re.user[0].name);
    $("#dash_role").html(Object.keys(re.user[0].role)[0]);
    $("#dash_address").html(re.user[0].address);
    $("#dash_joineddate").html(DateFromTimestamp(re.user[0].joinedAt));
    $("#dash_latitude").html(re.user[0].location[0]);
    $("#dash_longitude").html(re.user[0].location[1]);
    var qrcode = new QRCode(document.getElementById("dash_qr"), {
      text: window.location.origin + "/qr_redirect?principal=" + encodeURIComponent(re.principal[0].toString()) + "&cannisterId=" + process.env.CANISTER_ID_BIOCREDIT_FRONTEND,
      width: 228,
      height: 228,
      colorDark: "#01fe34",
      colorLight: "#000000",
      correctLevel: QRCode.CorrectLevel.H
    });
    initMap(re.user[0].location[0], re.user[0].location[1], re.user[0].name);



  } else if (re.statusCode == BigInt(200)) {
    redirect("/register.html");
  } else {
    redirect("/");
  }
  console.log(re);

}

async function capture_readingsinit() {
  var availability = await biocredit_actor.checkReadingAvailability();
  if (availability.statusCode == BigInt(200)) {
    if (availability.availability[0]) {

      watchLocation();
      checkLocationPermission();

      const dup_btn = document.getElementById('dup-sub');

      dup_btn.addEventListener('click', async function (e) {

        var captured_image = document.getElementById('captured_image');
        if (!captured_image.value) {
          captured_image.focus();
          createtoast('Capture Meter Image To Submit The Form.!!');
          return;
        }

        var reading = document.getElementById('reading');
        if (!reading.value) {
          reading.focus()
          createtoast('Enter Meter Reading To Submit The Form.!!');
          return;
        }

        if (!latitude || !longitude || !accuracy) {
          createtoast($("#status").val());
          return;
        }

        var resp = await biocredit_actor.addReading(parseFloat(reading.value), convertDataURIToBinary(captured_image.value), [latitude, longitude, accuracy], []);
        console.log(resp);
        if (resp.statusCode == BigInt(200)) {
          redirect("/capture_readings.html", { "msg": resp.msg });
        } else if (resp.statusCode == BigInt(400)) {
          createtoast(resp.msg);
        } else if (resp.statusCode == BigInt(403)) {
          redirect("/register.html", { "msg": resp.msg });
        } else if (resp.statusCode == BigInt(404)) {
          redirect("/", { "msg": resp.msg });
        }

      });
    } else {
      $("#uf").html(`<h3>Today's Meter Reading is Submitted, Come Back Tomorrow.!!</h3>`);
    }
  } else if (availability.statusCode == BigInt(403)) {
    redirect("/register.html", { "msg": "Create a Account to Access this Method." });
  } else {
    redirect("/", { "msg": "Connect Wallet to access this method." });
  }
}

async function view_readingsinit() {
  var res = await biocredit_actor.readReadings([]);
  console.log(res);
  if (res.statusCode == BigInt(200)) {
    var readings = res.readings[0];
    var userns = res.usernames[0];
    var usernames = {};
    for(var i=0;i<userns.length;i++){
      usernames[userns[i].principal.toString()] = userns[i].username;
    }
    console.log(readings);
    let finalReadings = [];
    var i = 1;
    for(var i=0;i<readings.length;i++){
      var element = readings[i];
      var username = usernames[element.submittedBy.toString()];
      var reading = {"sno":i+1,"date":DateFromTimestamp(element.timeStamp), "username":element.meterReading, "reading":username, "image":await bufferToBase64(element.meterImage)};
      finalReadings.push(reading);
    }

    console.log(finalReadings);

    $("#example").dataTable({
      processing: true,
      data : finalReadings,
      columns: [
        { data: "sno" },
        { data: "date" },
        { data: "username" },
        { data: "reading" },
        {
          data: "image",
          render: function (data, type, row) {
            return `<a class="pointer" style="cursor:pointer;" onclick='let data="data:image/jpeg;base64,` + decodeURIComponent(data) + `";let w = window.open("about:blank");
            let image = new Image();
            image.src = data;
            setTimeout(function(){
              w.document.write(image.outerHTML);
            }, 0);'>View Image</a>`;
          }
        },
      ],
      columnDefs: [{ orderable: false, targets: 4 }],
      order: [[1, "desc"]]
    });


  } else if (res.statusCode == BigInt(403)) {
    redirect("/register.html", { "msg": res.msg });
  }


};


const init = async () => {
  const urlParams = new URLSearchParams(window.location.href);
  if (urlParams.has('msg')) {
    createtoast(decodeURIComponent(urlParams.get('msg')));
  }

  persistCannisterId("bw4dl-smaaa-aaaaa-qaacq-cai");
  //adding event listeners for ic_interfaces
  for (var i = 0; i < ic_interface.length; i++) {
    var interfac = ic_interface[i];
    interfac.addEventListener('click', ic_interface_click)
  }

  //creating authclient
  authClient = await AuthClient.create();

  //vadilating wallect connection
  if (await authClient.isAuthenticated()) {
    await handleAuthenticated(authClient);
  } else {
    if (window.location.pathname != "/") {
      redirect("/");
    }
    setDisonnected();
    biocredit_actor = biocredit_backend;
  }

  if (window.location.pathname == "/register.html") {
    await registerinit();
  } else if (window.location.pathname == "/dashboard.html") {
    await dashboardinit();
  } else if (window.location.pathname == "/capture_readings.html") {
    await capture_readingsinit();
  } else if (window.location.pathname == "/view_readings.html") {
    await view_readingsinit();
  }
};



document.addEventListener('DOMContentLoaded', init);


