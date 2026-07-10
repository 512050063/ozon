import { createApp, h, ref } from 'vue';
import AppDeleteConfirmDialog from '@/components/ui/AppDeleteConfirmDialog.vue';

type ConfirmVariant = 'danger' | 'success' | 'warning';
type ConfirmIcon = 'delete' | 'disable' | 'success' | 'warning';

type AppConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIcon;
  showCancel?: boolean;
  closeOnOverlay?: boolean;
};

const removeContainer = (container: HTMLElement) => {
  if (container.parentNode) {
    container.parentNode.removeChild(container);
  }
};

export function appConfirm(options: AppConfirmOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    const visible = ref(true);
    let settled = false;
    document.body.appendChild(container);

    const close = () => {
      visible.value = false;
      app.unmount();
      removeContainer(container);
    };

    const settle = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      close();
      if (confirmed) {
        resolve();
      } else {
        reject(new Error('cancel'));
      }
    };

    const app = createApp({
      render() {
        return h(AppDeleteConfirmDialog, {
          modelValue: visible.value,
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          variant: options.variant || 'warning',
          icon: options.icon || 'warning',
          showCancel: options.showCancel ?? true,
          closeOnOverlay: options.closeOnOverlay ?? true,
          'onUpdate:modelValue': (value: boolean) => {
            if (!value) settle(false);
          },
          onConfirm: () => settle(true),
          onCancel: () => settle(false),
        });
      },
    });

    app.mount(container);
  });
}

export function appAlert(options: Omit<AppConfirmOptions, 'showCancel' | 'cancelText'>): Promise<void> {
  return appConfirm({
    ...options,
    showCancel: false,
    closeOnOverlay: false,
  });
}
