<script>
  //This is a registration form. See the separate sign in form

  import {createEventDispatcher} from 'svelte'
  import Loader from './loader.svelte'

  const dispatch = createEventDispatcher()
  
  export let Auth
  export let Firestore

  let busy = false

  let first, middle, last, inst, orcid, email, pwd, confPwd
  let instAbbrev = ''
  let userInstAbbrev
  let noInstAbbrev = false
  let formattedName = ''
  let submitClicked = false

  let orcidRE = /^https:\/\/orcid.org\/\d{4}-\d{4}-\d{4}-\d{3}[0-9X]{1}$/
  let pwdRE =  /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]{8,}$/

  let warnings = ['firstWarning', 'lastWarning', 'orcidWarning', 'emailWarning', 'pwdWarning', 'confPwdWarning']
  $: firstWarning = submitClicked && (!first || !first.trim())
  $: lastWarning = submitClicked && (!last || !last.trim())
  $: orcidWarning = (orcid && orcid.trim() && !orcidRE.test(orcid)) || (submitClicked && (!orcid || !orcid.trim()))
  $: emailWarning = submitClicked && (!email || !email.trim() || !/\S+@\S+\.\S+/.test(email)) //see regex at https://stackoverflow.com/a/9204568/3210158
  $: pwdWarning = Boolean((submitClicked && !pwd) || (pwd && pwd.trim() && !pwdRE.test(pwd))) //see regex at https://stackoverflow.com/a/9204568/3210158, at least one num, one char, one special, min 8chars
  $: confPwdWarning = Boolean(pwd && pwd.trim() && pwd != confPwd)

  $: inst, getInstitutionAbbrev()
  $: if(first || middle || last || instAbbrev || userInstAbbrev || noInstAbbrev) updateFormattedName()
  
  
  const updateFormattedName = _ => {
    
    if(last && last.trim()) {
      console.log('updating formatted name')
      let initials = []
      if(first && first.trim()) {
        initials.push(first[0].toUpperCase())
      }
      if(first && first.trim() && middle && middle.trim()){
        let middleParts = middle.split(' ')
        middleParts = middleParts.filter(x => x && x.trim())
        for (let part of middleParts) {
          initials.push(part[0].toUpperCase())
        }
      }
      
      if (initials.length){
        formattedName = `${last.trim()}, ${initials.join('.')}.`
      }
      else {
        formattedName = last.trim()
      }

      if(!noInstAbbrev) {
        if (userInstAbbrev && userInstAbbrev.trim()){
          formattedName += ` (${userInstAbbrev})`
        }
        else if (instAbbrev && instAbbrev.trim()) {
          formattedName += ` (${instAbbrev})`
        }
      }
    }
  }

  const getInstitutionAbbrev = _ => {
    if(inst && inst.trim()) {
      if(/^[A-Z]+$/.test(inst)){
        instAbbrev = inst
      }
      else {
        let parts = inst.split(' ')
        parts = parts.filter(x => x && x.trim() && x.trim().toLowerCase() != 'of')
        instAbbrev = parts.reduce((a, b) => a + b[0].toUpperCase(), '')
      }
    }
    else {
      instAbbrev = ''
    }
  }

  const handleRegisterClick = _ => {
    submitClicked = true
    busy = true
    //we have to pause briefly to let all the watched values above update!!! A Svelte quirk I guess!!
    setTimeout(_ => {
      for (let warning of warnings){
        if(eval(warning)){
          busy = false
          alert('required form fields incomplete')
          return
        }
      }

      Auth.createUserWithEmailAndPassword(email, pwd)
      .then( async userCredential => {
        // Signed in 
        //create the profile
        let user = userCredential.user
        
        //we need the standardized search email
        let searchEmail = email.replace(/[@\.\s]+/g, '').toLowerCase() //we don't need the @ again because we only use this for search
        let profile = {
          uid: user.uid,
          firstName: first,
          middleName: middle || null,
          lastName: last,
          formattedName, 
          institution: inst || null,
          orcid, 
          email,
          searchEmail, 
          dateCreated: Date.now()
        }

        const res = await fetch('https://us-central1-georef-745b9.cloudfunctions.net/addprofile', {
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          mode: 'cors', // no-cors, *cors, same-origin
          headers: {
            'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: JSON.stringify(data) // body data type must match "Content-Type" header
        });

        if(res.ok) {
          busy = false
          dispatch('user-sign-in', {userCredential, profile})
        }
        else {
          alert('error creating profile: ' + err.message)
          return
        }
      })
      .catch((error) => {
        switch (error.code) {
          case 'auth/email-already-in-use':
            alert(`Email address ${email} already in use. Please go to sign or register with another email address.`);
            busy = false
            break;
          case 'auth/invalid-email':
            alert(`Email address ${email} is invalid.`);
            busy = false
            break;
          case 'auth/operation-not-allowed':
            alert(`Error during sign up.`);
            busy = false
            break;
          case 'auth/weak-password':
            alert('Password is not strong enough. Add additional characters including special characters and numbers.');
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
  <h3>Registration</h3>
  {#if busy}
    <Loader/>
  {:else}
    <form>
      <div class="formsection">
        <h4>Your name</h4>
        <div class="labelinputinline">
          <input type="text" id="first" class:warning={firstWarning} bind:value={first} />
          <label for="first">First name</label>
        </div>
        <div class="labelinputinline">
          <input type="text" id="middle" bind:value={middle} />
          <label for="middle">Middle name/s (optional)</label>
        </div>
        <div class="labelinputinline">
          <input type="text" id="last" class:warning={lastWarning} bind:value={last} />
          <label for="last">Last name</label>
        </div>
      </div>
      <div class="formsection flex">
        <div>
          <h4>Your institution</h4>
          <div class="labelinputinline">
            <input style="width:400px" type="text" id="institution" bind:value={inst} />
            <label for="institution">e.g. 'Bolus Herbarium' or 'SANBI'</label>
          </div>
        </div>
        <div>
          <h4>Accronym</h4>
          <div class="labelinputinline">
            <input type="text" id="instAbbrev" placeholder={instAbbrev} bind:value={userInstAbbrev} />
            <label for="instAbbrev">e.g. 'BOL' or 'SANBI'</label>
          </div>
        </div>
      </div>
      <p>Formatted name (for dwc:georefBy): <span style="text-decoration:underline">{formattedName}</span></p>
      <input type=checkbox bind:checked={noInstAbbrev}><span>Do NOT include my institution acronym</span>
      <div class="formsection">
        <h4>Your ORCID ID<span class="material-icons md-18 iconbutton" title="Go to ORCID" on:click='{_ => window.open('https://orcid.org/')}'>open_in_new</span></h4>
        <div class="labelinputinline">
          <input style="width:400px" type="text" id="orcid" class:warning={orcidWarning} bind:value={orcid} />
          <label for="orcid">e.g. https://orcid.org/0000-0001-2345-6789</label>
        </div>
      </div>
      <div class="formsection">
        <h4>Email</h4>
        <div class="labelinputinline">
          <input style="width:400px" type="email" id="email" placeholder="ex: [yourname]@[yourinstitution].org" class:warning={emailWarning} bind:value={email}/>
          <label for="email">Example: [yourname]@[yourinstitution].org</label>
        </div>
      </div>
      <div class="formsection">
        <h4>Password</h4>
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
      <button style="width:200px;text-align:center;" on:click|preventDefault={handleRegisterClick}>Register</button>
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

.flex {
  display:flex;
  align-items: flex-start;
}

.warning {
  border: 1px solid rgb(133, 49, 34);
  background-color: rgb(255, 155, 155)
}

.iconbutton{
  color:grey;
  font-size: 0.8em;
  padding-left: 10px;
}

.iconbutton:hover{
  cursor: pointer;
}

button:hover {
  cursor:pointer;
  background-color:gray;
  color:white;
}

</style>