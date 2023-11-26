$(window).on("load", function () {
    document.getElementById("prel").classList.add("off");
    document
      .getElementById("prel")
      .addEventListener("animationend", function (e) {
        document.getElementById("prel").style.width = "0%";
        document.getElementById("prel").style.height = "0%";
      });
    document.querySelector("body").style.overflow = "visible";
  });