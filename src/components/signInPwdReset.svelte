<script>
  import {createEventDispatcher} from 'svelte'
  import Loader from './loader.svelte'

  const dispatch = createEventDispatcher()

  export let Auth
  export let email
  export let code

  let pwd, confPwd
  let submitClicked = false

  let busy = false
  let codeSent = false

  let pwdRE =  /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]{8,}$/
  $: pwdWarning = Boolean((submitClicked && !pwd) || (pwd && pwd.trim() && !pwdRE.test(pwd))) //see regex at https://stackoverflow.com/a/9204568/3210158, at least one num, one char, one special, min 8chars
  $: confPwdWarning = Boolean(pwd && pwd.trim() && pwd != confPwd)

  const handlePwdResetClick = _ => {
    submitClicked = true

    busy = true

    //we have to pause briefly to let all the watched values above update!!! A Svelte quirk I guess!!
    setTimeout(_ => {
      if(pwdWarning || confPwdWarning) {
        busy = false
        alert('required form fields incomplete')
        return
      }

      Auth.confirmPasswordReset(code, pwd)
      .then(_ => {
        //we dont need to do anything because the auth observer on App does the work
        busy = false
        return
      })
      .catch((error) => {
        switch (error.code) {
          case 'auth/expired-action-code':
            alert(`The code provided has expired. Please return to the sign in form and select Forgot Password again.`);
            dispatch('to-sign-in')
            break;
          case 'auth/invalid-action-code':
            alert(`The reset code provided is not valid. Please check the code and try again.`);
            busy = false
            break;
          case 'auth/user-disabled':
            alert(`The account for user ${email} has been disabled. Please contact the NSCF for further assistance.`);
            busy = false
            break;
          case 'auth/user-not-found':
            alert(`No account could be found for ${email}. Please contact the NSCF for further assistance`); //this should never happen
            busy = false
            break;
          case 'auth/weak-password':
            alert('Password is weak. Add additional characters including special characters and numbers and try again.');
            busy = false
            break;
          default:
            alert(error.message);
            busy = false
            break;
        }
        return
      });

    }, 100)
  }
</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="container">
  <h3>Reset password</h3>
  {#if busy}
    <Loader />
  {:else}
    {#if codeSent}
    <p style="width:400px">A password reset link has been sent to your email. Please follow that link to reset your password.</p>
    {:else}
      <form>
        <div class="formsection">
          <h4>Code</h4>
          <div class="labelinputinline">
            <p style="width:400; overflow-wrap:break-word;margin:0" >{code}</p>
            <label for="code">Password reset code sent by email</label>
          </div>
        </div>
        <div class="formsection">
          <h4>New password</h4>
          <div class="flex">
            <div class="labelinputinline" style="width:200px">
              <input style="width:100%" type="password" name="pass" id="pass" class:warning={pwdWarning} bind:value={pwd}/>
              <label for="pass">Password (min. 8 chars with numbers and special chars)</label>
            </div>
            <div class="labelinputinline" style="width:200px;margin-left:4px;">
              <input style="width:100%" type="password" name="confirmpass" id="confirmpass" class:warning={confPwdWarning} bind:value={confPwd}/>
              <label for="confirmpass">Confirm password</label>
            </div>
          </div>
        </div>
        <button style="width:200px;text-align:center;" on:click|preventDefault={handlePwdResetClick}>Reset Password</button>    
      </form>
    {/if}
  {/if}
</div>

<!-- ############################################## -->
<style>

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

form {
  padding: 5px;
  border-radius:2px;
  border: 1px solid rgb(78, 150, 231);
}

.formsection {
  margin-bottom:10px;
}

.labelinputinline {
  display:inline-block;
}

.flex {
  display:flex;
  align-items: flex-start;
}

label {
  font-weight: bolder;
  font-size: smaller;
  color:lightslategray;
}

h4 {
  margin-bottom: 0;
}

.warning {
  border: 1px solid rgb(133, 49, 34);
  background-color: rgb(255, 155, 155)
}

button:hover {
  cursor:pointer;
  background-color:gray;
  color:white;
}
</style>