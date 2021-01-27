<script>

  //A little toaster popup for quick on screen messages
  //From https://svelte.dev/repl/fef5371fea0f4f43812bd6e1db2e5b8b?version=3.16.7
  //Author unknown, pity. Some small modifications made


	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';

	let toasts = []; // 알람이 연속적으로 발생할 수 있으니 배열로 생성
  
  export let retainMs = 1000; // 생성되고 사라질 시간

	// 알람을 추가한다, 변수로 단순하게 메시지 한 줄 받음
	let toastId = 0;
	const pushToast = (msg = '') => {
		toasts = [...toasts, {
			_id : ++toastId,
			msg
		}]; // 새로운 할당
		setTimeout(() => {
			unshiftToast();
		}, retainMs);
	};

	// 오래된 알람 하나 삭제
	const unshiftToast = () => {
		toasts = toasts.filter((a, i) => i > 0); // 새로운 할당
	};

	onMount(() => {
		window.pushToast = pushToast;
	});
</script>

<style>
	.toast-wrapper {
		position: fixed;
		right: 10px;
		bottom: 0;
		text-align: center;
		z-index: 9999;
	}
	.toast-item {
		border-radius: 2px;
		padding: 12px 10px;
		margin: 10px auto;
		max-width: 400px;
		background: #93b7e9;
		color: #fff;
	}
</style>

<div class="toast-wrapper">
	{#each toasts as toast (toast._id)}
	<div class="toast-item" in:fly="{{delay: 0, duration: 300, x: 0, y: 50, opacity: 0.1, easing: backOut}}" out:fade={{duration:500, opacity: 0}}>
		{toast.msg}
	</div>
	{/each}
</div>
