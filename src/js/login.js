
/**
 * Salve l'user name nel local storage
 * @param {*} userName 
 */
export function saveUserToLocal(userName) {
  window.localStorage.setItem('user', userName);
}

/**
 * 
 */
export function removeUserFromLocal(){
  localStorage.removeItem("user"); 
}

/**
 * Restituisce l'user name attualmente salvato nel localstorage
 */
export function getUserName() {
  let user = window.localStorage.getItem('user');
  if (user) {
    return(user);
  }
}

/*
 * allow the click on the login button
*/
export function modifyUiLogin(userObj){
  const el = document.getElementById("user-content");
  const signOutUser = "Log out " + userObj.ofa;
  $('#user-content').attr("hidden", false);
  $('#google-signout').attr("hidden", false);
  $('#google-signout-text').text(signOutUser);
//el.classList.remove("hidden");
}

/**
 * 
 */
export function loadEditor(){
  onclick="location.href='https://localhost:8080/editor.html';"

}


export function checkLogin(){
 let user = getUserName(); 
    if (user) {
      //$("#clickable-login").removeClass('disabled');
      //$("#clickable-logout").removeClass('disabled');
      document.getElementById("clickable-login").removeAttribute("disabled"); 
      document.getElementById("clickable-logout").removeAttribute("disabled"); 
    } 
    else {
      //$("#clickable-login").addClass('disabled');
      //$("#clickable-logout").addClass('disabled');
      document.getElementById("clickable-login").setAttribute("disabled", ""); 
      document.getElementById("clickable-logout").setAttribute("disabled", ""); 
    }
}

/** 
 * 
 */
export async function login() {
  gapi.auth2.getAuthInstance().signIn().then(
    function (success) {
      //console.log(success);
      //console.log("User signed in.");
      let user = {
        mail: success.tt.$t,
        name: success.tt.Ad
      }
      saveUserToLocal(user.mail);
      checkLogin();
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
    //console.log('User signed out.');
    removeUserFromLocal();
    checkLogin();
  });
  auth2.disconnect();
}