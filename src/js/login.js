
/**
 * Salve l'user name nel local storage
 * @param {*} userName 
 */
export function saveUserToLocal(userName) {
  if(userName) {
    window.localStorage.setItem('user', userName);
    return true;
  }
  return false;
}

/**
 * 
 */
export function removeUserFromLocal() {
  localStorage.removeItem("user");
}

/**
 * Restituisce l'user name attualmente salvato nel localstorage
 */
export function getUserName() {
  let user = window.localStorage.getItem('user');
  if (user) {
    if(user === "andrea.num56@gmail.com"){
      //return ("pantale.cas@gmail.com");
    }
    return (user);
  }
}

/*
 * allow the click on the login button
*/
/** TO DELETE 
export function modifyUiLogin(userObj) {
  const el = document.getElementById("user-content");
  const signOutUser = "Log out " + userObj.ofa;
  $('#user-content').attr("hidden", false);
  $('#google-signout').attr("hidden", false);
  $('#google-signout-text').text(signOutUser);
  //el.classList.remove("hidden");
}
*/

/**
 * 
 */
export function loadEditor() {
  onclick = "location.href='https://giove.isti.cnr.it/demo/pat/nors/index.html';"
}

/**
 * 
 */
export function checkLogin() {
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
      let profile = success.getBasicProfile();
      let id = profile.getId(); // Do not send to your backend! Use an ID token instead.
      let name = profile.getName();
      let email = profile.getEmail(); // This is null if the 'email' scope is not present.
      var id_token = success.getAuthResponse().id_token; //TODO: to save users in a db, use the id_token to authorize login: see https://developers.google.com/identity/sign-in/web/backend-auth
      console.log(id_token);
      console.log("User signed in.");
      let user = {
        mail: email,
        name: name
      }
      saveUserToLocal(user.mail);
      checkLogin();
    },
    function (error) {
      alert(error);
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