type WindowMaximizeController = {
  isMaximized(): boolean;
  maximize(): void;
  unmaximize(): void;
};

export function toggleWindowMaximize(window: WindowMaximizeController): void {
  if (window.isMaximized()) {
    window.unmaximize();
    return;
  }

  window.maximize();
}
