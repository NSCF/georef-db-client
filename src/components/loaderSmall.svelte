<!-- HTML -->
<span class="icn-spinner"></span>
<!-- ############################################## -->
<style>

.icn-spinner {
  animation: spin-animation 0.5s infinite;
  display: inline-block;
  box-sizing: border-box;
}

@keyframes spin-animation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(359deg);
  }
}
</style>