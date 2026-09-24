const HARDWARE_FEATURES = ['camera', 'microphone', 'payment', 'usb'];

export function buildPermissionsPolicyValue(allowedFeatures: string[]): string {
  const allowedSet = new Set(allowedFeatures);

  return HARDWARE_FEATURES
    .map((feature) => `${feature}=(${allowedSet.has(feature) ? 'self' : ''})`)
    .join(', ');
}
