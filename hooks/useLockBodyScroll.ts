// hooks/use-lock-body-scroll.ts
import { useEffect } from 'react';

export function useLockBodyScroll(lock: boolean) {
	useEffect(() => {
		if (lock) {
			// 紀錄原本的 overflow 狀態
			const originalStyle = window.getComputedStyle(document.body).overflow;
			// 禁止滾動
			document.body.style.overflow = 'hidden';

			// 清除函式：當 Modal 關閉或元件卸載時恢復
			return () => {
				document.body.style.overflow = originalStyle;
			};
		}
	}, [lock]);
}