<script>
  import {createEventDispatcher} from 'svelte'
  import Loader from './loader.svelte'

  const dispatch = createEventDispatcher()

  export let Auth

  let submitClicked = false
  let busy = false

  let email
  let codeSent = false
  
  $: emailWarning = submitClicked && (!email || !email.trim() || !/\S+@\S+\.\S+/.test(email)) //see regex at https://stackoverflow.com/a/9204568/3210158
  
  const handleSendPwdCodeClick = _ => {
    submitClicked = true
    busy = true
    setTimeout(_ => {
      if(emailWarning){
        alert('Please enter your email to send password change link')
        return
      }
      //else 
    
      Auth.sendPasswordResetEmail(email).then(_ => {
        console.log('password reset mail sent')
        codeSent = true
      }) // no need reset busy because we go to another page
      .catch((error) => {
        switch (error.code) {
          case 'auth/invalid-email':
            alert(`The email provided is not valid, please try again.`); //this should not happen
            busy = false
            break;
          case 'auth/user-not-found':
            alert(`No user account could be found for ${email}. Please check the email provided or register a new account`);
            busy = false
            break;
          default:
            alert(error.message);
            busy = false
            break;
        }
        return
      });
    } , 100)
    
  }

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="container">
  <h3>Forgot password</h3>
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
      <div style="text-align:center">
        <button style="margin:auto;width:200px;text-align:center;" on:click|preventDefault={handleSendPwdCodeClick}>Send password reset code</button>
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
</style>