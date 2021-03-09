<script>
  import {createEventDispatcher} from 'svelte'
  import Loader from './loader.svelte'

  const dispatch = createEventDispatcher()

  export let Auth

  let submitClicked = false
  let busy = false

  let email, pwd
  let pwdRE =  /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]{8,}$/

  $: emailWarning = submitClicked && (!email || !email.trim() || !/\S+@\S+\.\S+/.test(email)) //see regex at https://stackoverflow.com/a/9204568/3210158
  $: pwdWarning = Boolean((submitClicked && !pwd) || (pwd && pwd.trim() && !pwdRE.test(pwd))) //see regex at https://stackoverflow.com/a/9204568/3210158, at least one num, one char, one special, min 8chars

  const handleSignInClick = _ => {
    if(emailWarning || pwdWarning) {
      alert('Please complete the necessary sign in details before attempting to sign in')
      return
    }
    //else 

    busy = true
    Auth.signInWithEmailAndPassword(email, pwd)
    .catch((error) => {
      switch (error.code) {
        case 'auth/invalid-email':
          alert(`Email address ${email} is invalid, please check the address entered`);
          busy = false
          break;
        case 'auth/user-disabled':
          alert(`The profile for ${email} have been disabled. Please contact the NSCF for details.`);
          busy = false
          break;
        case 'auth/user-not-found':
          alert(`We could not find a profile for ${email}. Please check your email or register if you don't have an account.`);
          busy = false
          break;
        case 'auth/wrong-password':
          alert(`The password provided does not match the account for ${email}. Please check the password entered.`);
          busy = false
          break;
        default:
          alert(error.message);
          busy = false
          break;
      }
      return
    });
  }
</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="container">
  <h3>Sign in</h3>
  {#if busy}
    <Loader />
  {:else}
    <form>
      <div class="formsection">
        <h4>Email</h4>
        <div class="labelinputinline">
          <input style="width:400px" type="email" id="email" class:warning={emailWarning} bind:value={email}/>
          <label for="email">Example: [yourname]@[yourinstitution].org</label>
        </div>
      </div>
      <div class="formsection">
        <h4>Password</h4>
        <div class="labelinputinline" style="width:200px">
          <input style="width:400px" type="password" name="pass" id="pass" class:warning={pwdWarning} bind:value={pwd}/>
          <label for="pass">Password (min. 8 chars with numbers and special chars)</label>
        </div>
      </div>
      <div class="flex">
        <span class="pwdlink" on:click='{_ => dispatch('to-forgot-pwd')}'>Forgot password?</span>
      </div>
      <div style="text-align:center">
        <button style="margin:auto;width:200px;text-align:center;" on:click|preventDefault={handleSignInClick}>Sign in</button>
      </div>
    </form>
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

.flex {
  display:flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}


span.pwdlink:hover {
  text-decoration: underline;
  cursor: pointer;
}
</style>