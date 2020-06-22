let loggedUser = "";

export function getLoggedUser(){
  return loggedUser;
}

export function modifyUiLogin(userObj){
  const el = document.getElementById("user-content");
  const signOutUser = "Log out " + userObj.ofa;
  $('#user-content').attr("hidden", false);
  $('#google-signout').attr("hidden", false);
  $('#google-signout-text').text(signOutUser);
//el.classList.remove("hidden");
}

export function modifyUiLogout(){
  const el = document.getElementById("user-content");
  $('#user-content').attr("hidden", true);
  $('#google-signout').attr("hidden", true);
  //el.classList.add("hidden");

}

export function login() {
  console.log("chiamo login");
  gapi.auth2.getAuthInstance().signIn().then(
    function (success) {
      console.log(success);
      let email = success.w3.U3;
      console.log(email);
      loggedUser = email;
      modifyUiLogin(success.w3);
    },
    function (error) {
      // Error occurred
      console.log(error);
    }
  );
}


/**
 * 
 */
export function logout() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
    console.log('User signed out.');
    modifyUiLogout();
    document.getElementById("google-signin").style.display = "block";
   
    /*
    document.getElementsByClassName("userContent")[0].innerHTML = '';
    document.getElementsByClassName("userContent")[0].style.display = "none";
    
    */
  });
  auth2.disconnect();
}